const taskService = require('../services/taskService');
const { sendError, sendSuccess } = require('../utils/response');

const getTasks = async (req, res, next) => {
  try {
    console.log('📥 [Backend] Fetching tasks for user:', req.user._id, 'query:', req.query);
    const result = await taskService.getTasks(req.user._id, req.query);
    console.log('📤 [Backend] Fetched tasks count:', result.tasks.length);
    return sendSuccess(res, 'Tasks retrieved successfully', result);
  } catch (error) {
    console.error('❌ [Backend] Error fetching tasks:', error);
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.user._id, req.params.id);
    return sendSuccess(res, 'Task retrieved successfully', { task });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    console.log('📥 [Backend] Creating task for user:', req.user._id);
    console.log('📥 [Backend] Request body:', req.body);
    const task = await taskService.createTask(req.user._id, req.body);
    console.log('📤 [Backend] Task created successfully:', task);
    return sendSuccess(res, 'Task created successfully', { task }, 201);
  } catch (error) {
    console.error('❌ [Backend] Error creating task:', error);
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.user._id, req.params.id, req.body);
    return sendSuccess(res, 'Task updated successfully', { task });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await taskService.deleteTask(req.user._id, req.params.id);
    return sendSuccess(res, 'Task deleted successfully', { taskId: task._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
