const mongoose = require('mongoose');
const Task = require('../model/Task');

const getTasks = async (userId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { userId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.q) {
    const searchRegex = new RegExp(query.q.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex }
    ];
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getTaskById = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid task id');
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findOne({ _id: id, userId });
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  return task;
};

const createTask = async (userId, payload) => {
  const { title, description = '', status, priority, dueDate } = payload;

  if (!title || !title.trim()) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  const taskData = {
    userId,
    title: title.trim(),
    description,
  };

  if (status) taskData.status = status;
  if (priority) taskData.priority = priority;
  if (dueDate !== undefined) taskData.dueDate = dueDate ? new Date(dueDate) : null;
  if (status === 'done') taskData.completedAt = new Date();

  const task = await Task.create(taskData);
  return task;
};

const updateTask = async (userId, id, payload) => {
  const task = await getTaskById(userId, id);
  const { title, description, status, priority, dueDate } = payload;

  if (typeof title === 'string') {
    if (!title.trim()) {
      const error = new Error('Title cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    task.title = title.trim();
  }

  if (description !== undefined) {
    task.description = description;
  }

  if (status !== undefined) {
    const oldStatus = task.status;
    task.status = status;
    if (status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date();
    } else if (status !== 'done') {
      task.completedAt = null;
    }
  }

  if (priority !== undefined) {
    task.priority = priority;
  }

  if (dueDate !== undefined) {
    task.dueDate = dueDate ? new Date(dueDate) : null;
  }

  await task.save();
  return task;
};

const deleteTask = async (userId, id) => {
  const task = await getTaskById(userId, id);
  await task.deleteOne();
  return task;
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
