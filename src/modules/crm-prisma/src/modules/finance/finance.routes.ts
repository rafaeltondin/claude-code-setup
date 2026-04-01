import { Router } from 'express';
import {
  // Transactions
  listTransactionsHandler,
  getTransactionHandler,
  createTransactionHandler,
  updateTransactionHandler,
  deleteTransactionHandler,
  // Categories
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  // Budgets
  listBudgetsHandler,
  createBudgetHandler,
  deleteBudgetHandler,
  // Goals
  listGoalsHandler,
  createGoalHandler,
  updateGoalHandler,
  deleteGoalHandler,
  // Investments
  listInvestmentsHandler,
  createInvestmentHandler,
  updateInvestmentHandler,
  deleteInvestmentHandler,
  // Summary / Balance
  summaryHandler,
  monthlyBalanceHandler,
} from './finance.controller';

export const financeRoutes = Router();

// Transactions
financeRoutes.get('/transactions', listTransactionsHandler);
financeRoutes.get('/transactions/:id', getTransactionHandler);
financeRoutes.post('/transactions', createTransactionHandler);
financeRoutes.put('/transactions/:id', updateTransactionHandler);
financeRoutes.delete('/transactions/:id', deleteTransactionHandler);

// Categories
financeRoutes.get('/categories', listCategoriesHandler);
financeRoutes.post('/categories', createCategoryHandler);
financeRoutes.put('/categories/:id', updateCategoryHandler);
financeRoutes.delete('/categories/:id', deleteCategoryHandler);

// Budgets
financeRoutes.get('/budgets', listBudgetsHandler);
financeRoutes.post('/budgets', createBudgetHandler);
financeRoutes.delete('/budgets/:id', deleteBudgetHandler);

// Goals
financeRoutes.get('/goals', listGoalsHandler);
financeRoutes.post('/goals', createGoalHandler);
financeRoutes.put('/goals/:id', updateGoalHandler);
financeRoutes.delete('/goals/:id', deleteGoalHandler);

// Investments
financeRoutes.get('/investments', listInvestmentsHandler);
financeRoutes.post('/investments', createInvestmentHandler);
financeRoutes.put('/investments/:id', updateInvestmentHandler);
financeRoutes.delete('/investments/:id', deleteInvestmentHandler);

// Summary e Balance (agregados)
financeRoutes.get('/summary', summaryHandler);
financeRoutes.get('/balance/monthly', monthlyBalanceHandler);
