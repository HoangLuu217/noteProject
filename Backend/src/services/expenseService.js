const mongoose = require('mongoose');
const Expense = require('../model/Expense');

const getExpenses = async (userId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { userId };

  if (query.category) {
    filter.category = { $regex: query.category.trim(), $options: 'i' };
  }

  if (query.startDate || query.endDate) {
    filter.expenseDate = {};
    if (query.startDate) {
      filter.expenseDate.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.expenseDate.$lte = new Date(query.endDate);
    }
  }

  if (query.q) {
    const searchRegex = new RegExp(query.q.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { note: searchRegex },
      { category: searchRegex },
      { 'items.itemName': searchRegex }
    ];
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(filter),
  ]);

  return {
    expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getExpenseById = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid expense id');
    error.statusCode = 400;
    throw error;
  }

  const expense = await Expense.findOne({ _id: id, userId });
  if (!expense) {
    const error = new Error('Expense not found');
    error.statusCode = 404;
    throw error;
  }

  return expense;
};

const createExpense = async (userId, payload) => {
  const { title, category, expenseDate, note = '', items = [], totalAmount } = payload;

  if (!title || !title.trim()) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!category || !category.trim()) {
    const error = new Error('Category is required');
    error.statusCode = 400;
    throw error;
  }

  if (!expenseDate) {
    const error = new Error('Expense date is required');
    error.statusCode = 400;
    throw error;
  }

  // Process items and check/compute totalAmount if not provided
  let computedTotal = 0;
  const processedItems = items.map(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const amount = item.amount !== undefined ? Number(item.amount) : (quantity * unitPrice);
    computedTotal += amount;
    
    const mapped = {
      itemName: item.itemName,
      quantity,
      unitPrice,
      amount,
    };
    if (item.createdAt) {
      mapped.createdAt = item.createdAt;
    }
    return mapped;
  });

  const finalTotalAmount = totalAmount !== undefined ? Number(totalAmount) : computedTotal;

  const expense = await Expense.create({
    userId,
    title: title.trim(),
    category: category.trim(),
    expenseDate: new Date(expenseDate),
    note,
    totalAmount: finalTotalAmount,
    items: processedItems,
  });

  return expense;
};

const updateExpense = async (userId, id, payload) => {
  const expense = await getExpenseById(userId, id);
  const { title, category, expenseDate, note, items, totalAmount } = payload;

  if (title !== undefined) {
    if (!title.trim()) {
      const error = new Error('Title cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    expense.title = title.trim();
  }

  if (category !== undefined) {
    if (!category.trim()) {
      const error = new Error('Category cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    expense.category = category.trim();
  }

  if (expenseDate !== undefined) {
    if (!expenseDate) {
      const error = new Error('Expense date cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    expense.expenseDate = new Date(expenseDate);
  }

  if (note !== undefined) {
    expense.note = note;
  }

  if (items !== undefined) {
    let computedTotal = 0;
    const processedItems = items.map(item => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const amount = item.amount !== undefined ? Number(item.amount) : (quantity * unitPrice);
      computedTotal += amount;
      
      const mapped = {
        itemName: item.itemName,
        quantity,
        unitPrice,
        amount,
      };
      if (item.createdAt) {
        mapped.createdAt = item.createdAt;
      }
      return mapped;
    });
    expense.items = processedItems;
    if (totalAmount === undefined) {
      expense.totalAmount = computedTotal;
    }
  }

  if (totalAmount !== undefined) {
    expense.totalAmount = Number(totalAmount);
  }

  await expense.save();
  return expense;
};

const deleteExpense = async (userId, id) => {
  const expense = await getExpenseById(userId, id);
  await expense.deleteOne();
  return expense;
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
