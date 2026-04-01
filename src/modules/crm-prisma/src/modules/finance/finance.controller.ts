import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listBudgets,
  createBudget,
  deleteBudget,
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getMonthlySummary,
  getMonthlyBalance,
} from './finance.service';

// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------

const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  categoryId: z.string().optional(),
  paid: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isRecurring: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  search: z.string().optional(),
});

const createTransactionSchema = z.object({
  description: z.string().optional(),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  paid: z.boolean().optional(),
});

const updateTransactionSchema = createTransactionSchema.partial().extend({
  categoryId: z.string().nullable().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['income', 'expense']),
});

const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
});

const createBudgetSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive('Valor deve ser positivo'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  targetAmount: z.number().positive('Valor alvo deve ser positivo'),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional(),
});

const updateGoalSchema = goalSchema.partial().extend({
  deadline: z.string().nullable().optional(),
});

const investmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.string().optional(),
  date: z.string().optional(),
});

const updateInvestmentSchema = investmentSchema.partial().extend({
  date: z.string().nullable().optional(),
});

const summaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

const balanceQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
});

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

export async function listTransactionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.listTransactions] INÍCIO', { query: req.query });
  try {
    const params = transactionQuerySchema.parse(req.query);
    const result = await listTransactions(params);
    logger.info('[finance.controller.listTransactions] FIM - Sucesso');
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[finance.controller.listTransactions] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function getTransactionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.getTransaction] INÍCIO', { id });
  try {
    const data = await getTransactionById(id);
    logger.info('[finance.controller.getTransaction] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.getTransaction] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function createTransactionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.createTransaction] INÍCIO', { body: req.body });
  try {
    const body = createTransactionSchema.parse(req.body);
    const data = await createTransaction(body);
    logger.info('[finance.controller.createTransaction] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.createTransaction] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function updateTransactionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.updateTransaction] INÍCIO', { id, body: req.body });
  try {
    const body = updateTransactionSchema.parse(req.body);
    const data = await updateTransaction(id, body);
    logger.info('[finance.controller.updateTransaction] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.updateTransaction] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function deleteTransactionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.deleteTransaction] INÍCIO', { id });
  try {
    await deleteTransaction(id);
    logger.info('[finance.controller.deleteTransaction] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Transação removida com sucesso' });
  } catch (err) {
    logger.error('[finance.controller.deleteTransaction] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategoriesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.listCategories] INÍCIO');
  try {
    const data = await listCategories();
    logger.info('[finance.controller.listCategories] FIM - Sucesso', { total: data.length });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.listCategories] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function createCategoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.createCategory] INÍCIO', { body: req.body });
  try {
    const body = categorySchema.parse(req.body);
    const data = await createCategory(body);
    logger.info('[finance.controller.createCategory] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.createCategory] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function updateCategoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.updateCategory] INÍCIO', { id, body: req.body });
  try {
    const body = categorySchema.partial().parse(req.body);
    const data = await updateCategory(id, body);
    logger.info('[finance.controller.updateCategory] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.updateCategory] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.deleteCategory] INÍCIO', { id });
  try {
    await deleteCategory(id);
    logger.info('[finance.controller.deleteCategory] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Categoria removida com sucesso' });
  } catch (err) {
    logger.error('[finance.controller.deleteCategory] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// BUDGETS
// ---------------------------------------------------------------------------

export async function listBudgetsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.listBudgets] INÍCIO', { query: req.query });
  try {
    const { month, year } = budgetQuerySchema.parse(req.query);
    const data = await listBudgets(month, year);
    logger.info('[finance.controller.listBudgets] FIM - Sucesso', { total: data.length });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.listBudgets] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function createBudgetHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.createBudget] INÍCIO', { body: req.body });
  try {
    const body = createBudgetSchema.parse(req.body);
    const data = await createBudget(body);
    logger.info('[finance.controller.createBudget] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.createBudget] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function deleteBudgetHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.deleteBudget] INÍCIO', { id });
  try {
    await deleteBudget(id);
    logger.info('[finance.controller.deleteBudget] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Budget removido com sucesso' });
  } catch (err) {
    logger.error('[finance.controller.deleteBudget] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GOALS
// ---------------------------------------------------------------------------

export async function listGoalsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.listGoals] INÍCIO');
  try {
    const data = await listGoals();
    logger.info('[finance.controller.listGoals] FIM - Sucesso', { total: data.length });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.listGoals] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function createGoalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.createGoal] INÍCIO', { body: req.body });
  try {
    const body = goalSchema.parse(req.body);
    const data = await createGoal(body);
    logger.info('[finance.controller.createGoal] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.createGoal] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function updateGoalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.updateGoal] INÍCIO', { id, body: req.body });
  try {
    const body = updateGoalSchema.parse(req.body);
    const data = await updateGoal(id, body);
    logger.info('[finance.controller.updateGoal] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.updateGoal] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function deleteGoalHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.deleteGoal] INÍCIO', { id });
  try {
    await deleteGoal(id);
    logger.info('[finance.controller.deleteGoal] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Meta removida com sucesso' });
  } catch (err) {
    logger.error('[finance.controller.deleteGoal] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// INVESTMENTS
// ---------------------------------------------------------------------------

export async function listInvestmentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.listInvestments] INÍCIO');
  try {
    const data = await listInvestments();
    logger.info('[finance.controller.listInvestments] FIM - Sucesso', { total: data.length });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.listInvestments] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function createInvestmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.createInvestment] INÍCIO', { body: req.body });
  try {
    const body = investmentSchema.parse(req.body);
    const data = await createInvestment(body);
    logger.info('[finance.controller.createInvestment] FIM - Sucesso');
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.createInvestment] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function updateInvestmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.updateInvestment] INÍCIO', { id, body: req.body });
  try {
    const body = updateInvestmentSchema.parse(req.body);
    const data = await updateInvestment(id, body);
    logger.info('[finance.controller.updateInvestment] FIM - Sucesso', { id });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.updateInvestment] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

export async function deleteInvestmentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  logger.info('[finance.controller.deleteInvestment] INÍCIO', { id });
  try {
    await deleteInvestment(id);
    logger.info('[finance.controller.deleteInvestment] FIM - Sucesso', { id });
    res.json({ success: true, message: 'Investimento removido com sucesso' });
  } catch (err) {
    logger.error('[finance.controller.deleteInvestment] ERRO', { id, error: (err as Error).message });
    next(err);
  }
}

// ---------------------------------------------------------------------------
// SUMMARY e BALANCE
// ---------------------------------------------------------------------------

export async function summaryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.summary] INÍCIO', { query: req.query });
  try {
    const now = new Date();
    const { month, year } = summaryQuerySchema.parse({
      month: req.query.month ?? now.getMonth() + 1,
      year: req.query.year ?? now.getFullYear(),
    });
    const data = await getMonthlySummary(month, year);
    logger.info('[finance.controller.summary] FIM - Sucesso');
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.summary] ERRO', { error: (err as Error).message });
    next(err);
  }
}

export async function monthlyBalanceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  logger.info('[finance.controller.monthlyBalance] INÍCIO', { query: req.query });
  try {
    const { months } = balanceQuerySchema.parse(req.query);
    const data = await getMonthlyBalance(months);
    logger.info('[finance.controller.monthlyBalance] FIM - Sucesso');
    res.json({ success: true, data });
  } catch (err) {
    logger.error('[finance.controller.monthlyBalance] ERRO', { error: (err as Error).message });
    next(err);
  }
}
