import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './config/db.js';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import timeLogRoutes from './routes/timeLogs.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const configuredShutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS);
const SHUTDOWN_TIMEOUT_MS = Number.isSafeInteger(configuredShutdownTimeout) && configuredShutdownTimeout > 0
  ? configuredShutdownTimeout
  : 10_000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const startedAt = Date.now();

  res.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      message: 'HTTP request completed',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });

  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time-logs', timeLogRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.path}`,
    requestId: req.id
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const requestedStatus = err.statusCode ?? err.status;
  const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599
    ? requestedStatus
    : 500;

  console.error(JSON.stringify({
    level: statusCode >= 500 ? 'error' : 'warn',
    message: 'Request failed',
    requestId: req.id,
    statusCode,
    error: {
      name: err.name,
      message: err.message,
      ...(err.code && { code: err.code }),
      ...(!isProduction && err.stack && { stack: err.stack })
    }
  }));

  const message = statusCode >= 500
    ? 'Internal Server Error'
    : err.message || 'Request failed';

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.id,
    ...(!isProduction && err.stack && { stack: err.stack })
  });
});

const server = createServer(app);
let shutdownPromise;
let poolShutdownPromise;
let fatalFailure = false;

const logFatal = (message, error) => {
  console.error(JSON.stringify({
    level: 'fatal',
    message,
    error: error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) }
  }));
};

const closePool = () => {
  if (!poolShutdownPromise) {
    poolShutdownPromise = pool.end().catch((error) => {
      process.exitCode = 1;
      logFatal('Failed to close PostgreSQL pool cleanly', error);
    });
  }

  return poolShutdownPromise;
};

const shutdown = (reason, exitCode = 0) => {
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }

  if (shutdownPromise) {
    return shutdownPromise;
  }

  console.info(JSON.stringify({ level: 'info', message: 'Shutting down server', reason }));

  shutdownPromise = new Promise((resolve) => {
    const forceTimer = setTimeout(async () => {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Graceful shutdown timed out; closing active connections'
      }));

      server.closeAllConnections?.();
      void closePool();
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    const finishShutdown = async () => {
      clearTimeout(forceTimer);
      await closePool();
      console.info(JSON.stringify({ level: 'info', message: 'Server shutdown complete' }));
      resolve();
    };

    if (server.listening) {
      server.close((error) => {
        if (error) {
          process.exitCode = 1;
          logFatal('HTTP server failed to close cleanly', error);
        }
        finishShutdown();
      });
      server.closeIdleConnections?.();
    } else {
      finishShutdown();
    }
  });

  return shutdownPromise;
};

process.on('unhandledRejection', (reason) => {
  fatalFailure = true;
  logFatal('Unhandled promise rejection; process will restart', reason);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  fatalFailure = true;
  logFatal('Uncaught exception; process will restart', error);
  void shutdown('uncaughtException', 1);
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM', fatalFailure ? 1 : 0);
});

process.on('SIGINT', () => {
  void shutdown('SIGINT', fatalFailure ? 1 : 0);
});

server.on('clientError', (error, socket) => {
  console.warn(JSON.stringify({
    level: 'warn',
    message: 'Invalid or interrupted HTTP client connection',
    error: error.message
  }));

  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  } else {
    socket.destroy();
  }
});

server.on('error', (error) => {
  fatalFailure = true;
  logFatal('HTTP server error; process will restart', error);
  void shutdown('httpServerError', 1);
});

server.listen(PORT, () => {
  console.info(JSON.stringify({
    level: 'info',
    message: 'Freelancer Tracker backend listening',
    port: PORT,
    clientOrigin: CLIENT_URL,
    environment: process.env.NODE_ENV || 'development'
  }));
});
