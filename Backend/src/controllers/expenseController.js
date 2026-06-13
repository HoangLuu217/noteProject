const expenseService = require('../services/expenseService');
const { sendError, sendSuccess } = require('../utils/response');

const getExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.getExpenses(req.user._id, req.query);
    return sendSuccess(res, 'Expenses retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.user._id, req.params.id);
    return sendSuccess(res, 'Expense retrieved successfully', { expense });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.user._id, req.body);
    return sendSuccess(res, 'Expense created successfully', { expense }, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.user._id, req.params.id, req.body);
    return sendSuccess(res, 'Expense updated successfully', { expense });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.deleteExpense(req.user._id, req.params.id);
    return sendSuccess(res, 'Expense deleted successfully', { expenseId: expense._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
