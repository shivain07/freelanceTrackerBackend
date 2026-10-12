import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import timeLogController from '../controllers/timeLogController.js';

const router = express.Router();

// Apply auth middleware to all time log routes
router.use(requireAuth);

// POST /api/time-logs - Create a new time log
router.post('/', timeLogController.createTimeLog);

// GET /api/time-logs/task/:taskId - Retrieve logs for a specific task
router.get('/task/:taskId', timeLogController.getTimeLogsByTask);

export default router;
