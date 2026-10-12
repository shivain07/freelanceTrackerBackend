import db from '../config/db.js';

export const verifyTaskOwnership = async (taskId, userId) => {
  const result = await db.query(
    `SELECT t.id
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     JOIN clients c ON p.client_id = c.id
     WHERE t.id = $1 AND c.user_id = $2`,
    [taskId, userId]
  );
  return result.rows.length > 0;
};

export const createTimeLog = async (userId, { task_id, hours, log_date, description }) => {
  const isOwner = await verifyTaskOwnership(task_id, userId);
  if (!isOwner) {
    const error = new Error('Task not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const numericHours = parseFloat(hours);
  if (isNaN(numericHours) || numericHours <= 0) {
    const error = new Error('Hours must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO time_logs (task_id, hours, log_date, description)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
     RETURNING *`,
    [task_id, numericHours, log_date || null, description || null]
  );

  return result.rows[0];
};

export const getTimeLogsByTaskId = async (userId, taskId) => {
  const isOwner = await verifyTaskOwnership(taskId, userId);
  if (!isOwner) {
    const error = new Error('Task not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const result = await db.query(
    `SELECT id, task_id, hours, log_date, description, created_at
     FROM time_logs
     WHERE task_id = $1
     ORDER BY log_date DESC, created_at DESC`,
    [taskId]
  );

  return result.rows;
};

export default {
  createTimeLog,
  getTimeLogsByTaskId,
  verifyTaskOwnership
};
