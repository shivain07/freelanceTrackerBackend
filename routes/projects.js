import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import projectController from '../controllers/projectController.js';
import taskController from '../controllers/taskController.js';

const router = express.Router();

// Apply auth middleware to all project routes
router.use(requireAuth);

// GET /api/projects - Dashboard summary with calculated hours, earnings, tasks
router.get('/', projectController.getProjects);

// POST /api/projects - Create a new project
router.post('/', projectController.createProject);

// DELETE /api/projects/:projectId - Delete a project and dependent records
router.delete('/:projectId', projectController.deleteProject);

// GET /api/projects/:projectId/tasks - Retrieve hierarchical task tree for project
router.get('/:projectId/tasks', taskController.getTasks);

export default router;
