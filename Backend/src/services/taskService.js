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
      .populate('parentTaskId', 'title')
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

  const task = await Task.findOne({ _id: id, userId }).populate('parentTaskId', 'title');
  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  return task;
};

const updateParentProgress = async (parentTaskId) => {
  if (!parentTaskId) return null;
  const subtasks = await Task.find({ parentTaskId });
  if (subtasks.length === 0) {
    const parent = await Task.findById(parentTaskId);
    if (parent) {
      parent.progress = 0;
      parent.status = 'todo';
      parent.completedAt = null;
      await parent.save();
    }
    return;
  }
  
  // Calculate average progress from all subtasks
  const totalProgress = subtasks.reduce((sum, t) => sum + (t.progress || 0), 0);
  const progress = Math.round(totalProgress / subtasks.length);

  let parentStatus = 'todo';
  if (progress === 100) {
    parentStatus = 'done';
  } else if (progress > 0) {
    parentStatus = 'in_progress';
  }

  const parent = await Task.findById(parentTaskId);
  if (parent) {
    parent.progress = progress;
    parent.status = parentStatus;
    parent.completedAt = parentStatus === 'done' ? new Date() : null;
    await parent.save();
  }
};

const createTask = async (userId, payload) => {
  const { title, description = '', status, priority, dueDate, category, parentTaskId, isMainTask, progress, planLabel } = payload;

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

  if (priority) taskData.priority = priority;
  if (category) taskData.category = category;
  if (dueDate !== undefined) taskData.dueDate = dueDate ? new Date(dueDate) : null;
  
  // Sync status and progress
  if (progress !== undefined) {
    taskData.progress = progress;
    if (progress === 100) {
      taskData.status = 'done';
      taskData.completedAt = new Date();
    } else if (progress > 0) {
      taskData.status = 'in_progress';
      taskData.completedAt = null;
    } else {
      taskData.status = 'todo';
      taskData.completedAt = null;
    }
  } else if (status) {
    taskData.status = status;
    if (status === 'done') {
      taskData.completedAt = new Date();
      taskData.progress = 100;
    } else if (status === 'in_progress') {
      taskData.progress = 50;
    } else {
      taskData.progress = 0;
    }
  } else {
    taskData.status = 'todo';
    taskData.progress = 0;
  }

  if (isMainTask !== undefined) taskData.isMainTask = isMainTask;

  // Handle planLabel lookup/creation
  if (planLabel && planLabel.trim()) {
    const labelTitle = planLabel.trim();
    let parentTaskObj = await Task.findOne({ userId, title: labelTitle, isMainTask: true });
    if (!parentTaskObj) {
      parentTaskObj = await Task.create({
        userId,
        title: labelTitle,
        isMainTask: true,
        progress: 0,
        status: 'todo',
        category: category || 'Personal',
        dueDate: dueDate ? new Date(dueDate) : null,
      });
    } else {
      const currentTaskDueDate = dueDate ? new Date(dueDate) : null;
      if (currentTaskDueDate) {
        if (!parentTaskObj.dueDate || currentTaskDueDate < parentTaskObj.dueDate) {
          parentTaskObj.dueDate = currentTaskDueDate;
          await parentTaskObj.save();
        }
      }
    }
    taskData.parentTaskId = parentTaskObj._id;
  } else if (parentTaskId) {
    taskData.parentTaskId = parentTaskId;
  }

  const task = await Task.create(taskData);
  if (task.parentTaskId) {
    await updateParentProgress(task.parentTaskId);
  }
  await task.populate('parentTaskId', 'title');
  return task;
};

const updateTask = async (userId, id, payload) => {
  const task = await getTaskById(userId, id);
  const { title, description, status, priority, dueDate, category, parentTaskId, isMainTask, progress, planLabel } = payload;
  const oldParentId = task.parentTaskId;

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

  // Handle progress and status sync
  if (progress !== undefined) {
    task.progress = progress;
    if (progress === 100) {
      task.status = 'done';
      task.completedAt = new Date();
    } else if (progress > 0) {
      task.status = 'in_progress';
      task.completedAt = null;
    } else {
      task.status = 'todo';
      task.completedAt = null;
    }
  } else if (status !== undefined) {
    const oldStatus = task.status;
    task.status = status;
    if (status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date();
      task.progress = 100;
    } else if (status !== 'done') {
      task.completedAt = null;
      if (status === 'todo') {
        task.progress = 0;
      } else if (status === 'in_progress' && task.progress === 100) {
        task.progress = 50;
      }
    }
  }

  if (priority !== undefined) {
    task.priority = priority;
  }

  if (category !== undefined) {
    task.category = category;
  }

  if (dueDate !== undefined) {
    task.dueDate = dueDate ? new Date(dueDate) : null;
  }

  if (isMainTask !== undefined) {
    task.isMainTask = isMainTask;
  }

  // Handle planLabel lookup/creation
  if (planLabel !== undefined) {
    if (planLabel && planLabel.trim()) {
      const labelTitle = planLabel.trim();
      let parentTaskObj = await Task.findOne({ userId, title: labelTitle, isMainTask: true });
      if (!parentTaskObj) {
        parentTaskObj = await Task.create({
          userId,
          title: labelTitle,
          isMainTask: true,
          progress: 0,
          status: 'todo',
          category: category || task.category || 'Personal',
          dueDate: task.dueDate || (dueDate ? new Date(dueDate) : null),
        });
      } else {
        const currentTaskDueDate = task.dueDate || (dueDate ? new Date(dueDate) : null);
        if (currentTaskDueDate) {
          if (!parentTaskObj.dueDate || currentTaskDueDate < parentTaskObj.dueDate) {
            parentTaskObj.dueDate = currentTaskDueDate;
            await parentTaskObj.save();
          }
        }
      }
      task.parentTaskId = parentTaskObj._id;
    } else {
      task.parentTaskId = null;
    }
  } else if (parentTaskId !== undefined) {
    task.parentTaskId = parentTaskId;
  }

  await task.save();

  if (task.parentTaskId) {
    await updateParentProgress(task.parentTaskId);
  }
  if (oldParentId && String(oldParentId) !== String(task.parentTaskId)) {
    await updateParentProgress(oldParentId);
  }

  await task.populate('parentTaskId', 'title');
  return task;
};

const deleteTask = async (userId, id) => {
  const task = await getTaskById(userId, id);
  const parentTaskId = task.parentTaskId;
  const isMainTask = task.isMainTask;

  await task.deleteOne();

  if (isMainTask) {
    // Cascade delete subtasks
    await Task.deleteMany({ parentTaskId: id });
  } else if (parentTaskId) {
    // Recalculate parent progress
    await updateParentProgress(parentTaskId);
  }

  return task;
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
