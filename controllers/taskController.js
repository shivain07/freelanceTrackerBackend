import taskService from '../services/taskService.js';

export const getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const tasks = await taskService.getTasksByProjectId(projectId, req.user.id);

    return res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    return next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { project_id, title, parent_task_id } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'project_id and title are required fields'
      });
    }

    const task = await taskService.createTask(req.user.id, {
      project_id,
      title,
      parent_task_id
    });

    return res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    return next(error);
  }
};

export const updateTaskCompletion = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { is_completed } = req.body;

    if (typeof is_completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_completed must be a boolean value (true or false)'
      });
    }

    const updatedTask = await taskService.updateTaskCompletion(
      req.user.id,
      taskId,
      is_completed
    );

    return res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    await taskService.deleteTask(req.user.id, taskId);

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getTasks,
  createTask,
  updateTaskCompletion,
  deleteTask
};
