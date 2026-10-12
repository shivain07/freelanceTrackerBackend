import projectService from '../services/projectService.js';

export const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getProjectsDashboard(req.user.id);
    return res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    return next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { client_id, title, status } = req.body;

    if (!client_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'client_id and title are required fields'
      });
    }

    const project = await projectService.createProject(req.user.id, {
      client_id,
      title,
      status
    });

    return res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    await projectService.deleteProject(projectId, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getProjects,
  createProject,
  deleteProject
};
