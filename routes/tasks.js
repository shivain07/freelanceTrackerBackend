import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import taskController from '../controllers/taskController.js';

const router = express.Router();

// Apply auth middleware to all task routes
router.use(requireAuth);

// GET /api/tasks/project/:projectId or /api/projects/:projectId/tasks helper
router.get('/project/:projectId', taskController.getTasks);
router.get('/projects/:projectId/tasks', taskController.getTasks);

// POST /api/tasks - Create a new task (can be subtask if parent_task_id provided)
router.post('/', taskController.createTask);

// PATCH /api/tasks/:taskId - Update task completion status
router.patch('/:taskId', taskController.updateTaskCompletion);

// DELETE /api/tasks/:taskId - Delete a task and its dependent records
router.delete('/:taskId', taskController.deleteTask);

export default router;
