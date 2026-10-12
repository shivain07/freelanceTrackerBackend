import timeLogService from '../services/timeLogService.js';

export const createTimeLog = async (req, res, next) => {
  try {
    const { task_id, hours, log_date, description } = req.body;

    if (!task_id || hours === undefined || hours === null) {
      return res.status(400).json({
        success: false,
        message: 'task_id and hours are required fields'
      });
    }

    const timeLog = await timeLogService.createTimeLog(req.user.id, {
      task_id,
      hours,
      log_date,
      description
    });

    return res.status(201).json({
      success: true,
      data: timeLog
    });
  } catch (error) {
    return next(error);
  }
};

export const getTimeLogsByTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const logs = await timeLogService.getTimeLogsByTaskId(req.user.id, taskId);

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  createTimeLog,
  getTimeLogsByTask
};
