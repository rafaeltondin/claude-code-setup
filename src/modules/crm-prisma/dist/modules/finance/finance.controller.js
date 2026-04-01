"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransactionsHandler = listTransactionsHandler;
exports.getTransactionHandler = getTransactionHandler;
exports.createTransactionHandler = createTransactionHandler;
exports.updateTransactionHandler = updateTransactionHandler;
exports.deleteTransactionHandler = deleteTransactionHandler;
exports.listCategoriesHandler = listCategoriesHandler;
exports.createCategoryHandler = createCategoryHandler;
exports.updateCategoryHandler = updateCategoryHandler;
exports.deleteCategoryHandler = deleteCategoryHandler;
exports.listBudgetsHandler = listBudgetsHandler;
exports.createBudgetHandler = createBudgetHandler;
exports.deleteBudgetHandler = deleteBudgetHandler;
exports.listGoalsHandler = listGoalsHandler;
exports.createGoalHandler = createGoalHandler;
exports.updateGoalHandler = updateGoalHandler;
exports.deleteGoalHandler = deleteGoalHandler;
exports.listInvestmentsHandler = listInvestmentsHandler;
exports.createInvestmentHandler = createInvestmentHandler;
exports.updateInvestmentHandler = updateInvestmentHandler;
exports.deleteInvestmentHandler = deleteInvestmentHandler;
exports.summaryHandler = summaryHandler;
exports.monthlyBalanceHandler = monthlyBalanceHandler;
const zod_1 = require("zod");
const logger_1 = require("../../utils/logger");
const finance_service_1 = require("./finance.service");
// ---------------------------------------------------------------------------
// Schemas Zod
// ---------------------------------------------------------------------------
const transactionQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    categoryId: zod_1.z.string().optional(),
    paid: zod_1.z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    isRecurring: zod_1.z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2000).optional(),
    search: zod_1.z.string().optional(),
});
const createTransactionSchema = zod_1.z.object({
    description: zod_1.z.string().optional(),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    date: zod_1.z.string().min(1, 'Data é obrigatória'),
    categoryId: zod_1.z.string().optional(),
    isRecurring: zod_1.z.boolean().optional(),
    paid: zod_1.z.boolean().optional(),
});
const updateTransactionSchema = createTransactionSchema.partial().extend({
    categoryId: zod_1.z.string().nullable().optional(),
});
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    type: zod_1.z.enum(['income', 'expense']),
});
const budgetQuerySchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2000).optional(),
});
const createBudgetSchema = zod_1.z.object({
    categoryId: zod_1.z.string().optional(),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2000),
});
const goalSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    targetAmount: zod_1.z.number().positive('Valor alvo deve ser positivo'),
    currentAmount: zod_1.z.number().min(0).optional(),
    deadline: zod_1.z.string().optional(),
});
const updateGoalSchema = goalSchema.partial().extend({
    deadline: zod_1.z.string().nullable().optional(),
});
const investmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    type: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
});
const updateInvestmentSchema = investmentSchema.partial().extend({
    date: zod_1.z.string().nullable().optional(),
});
const summaryQuerySchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12),
    year: zod_1.z.coerce.number().int().min(2000),
});
const balanceQuerySchema = zod_1.z.object({
    months: zod_1.z.coerce.number().int().min(1).max(24).optional(),
});
// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------
async function listTransactionsHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.listTransactions] INÍCIO', { query: req.query });
    try {
        const params = transactionQuerySchema.parse(req.query);
        const result = await (0, finance_service_1.listTransactions)(params);
        logger_1.logger.info('[finance.controller.listTransactions] FIM - Sucesso');
        res.json({ success: true, ...result });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.listTransactions] ERRO', { error: err.message });
        next(err);
    }
}
async function getTransactionHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.getTransaction] INÍCIO', { id });
    try {
        const data = await (0, finance_service_1.getTransactionById)(id);
        logger_1.logger.info('[finance.controller.getTransaction] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.getTransaction] ERRO', { id, error: err.message });
        next(err);
    }
}
async function createTransactionHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.createTransaction] INÍCIO', { body: req.body });
    try {
        const body = createTransactionSchema.parse(req.body);
        const data = await (0, finance_service_1.createTransaction)(body);
        logger_1.logger.info('[finance.controller.createTransaction] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.createTransaction] ERRO', { error: err.message });
        next(err);
    }
}
async function updateTransactionHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.updateTransaction] INÍCIO', { id, body: req.body });
    try {
        const body = updateTransactionSchema.parse(req.body);
        const data = await (0, finance_service_1.updateTransaction)(id, body);
        logger_1.logger.info('[finance.controller.updateTransaction] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.updateTransaction] ERRO', { id, error: err.message });
        next(err);
    }
}
async function deleteTransactionHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.deleteTransaction] INÍCIO', { id });
    try {
        await (0, finance_service_1.deleteTransaction)(id);
        logger_1.logger.info('[finance.controller.deleteTransaction] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Transação removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.deleteTransaction] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
async function listCategoriesHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.listCategories] INÍCIO');
    try {
        const data = await (0, finance_service_1.listCategories)();
        logger_1.logger.info('[finance.controller.listCategories] FIM - Sucesso', { total: data.length });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.listCategories] ERRO', { error: err.message });
        next(err);
    }
}
async function createCategoryHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.createCategory] INÍCIO', { body: req.body });
    try {
        const body = categorySchema.parse(req.body);
        const data = await (0, finance_service_1.createCategory)(body);
        logger_1.logger.info('[finance.controller.createCategory] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.createCategory] ERRO', { error: err.message });
        next(err);
    }
}
async function updateCategoryHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.updateCategory] INÍCIO', { id, body: req.body });
    try {
        const body = categorySchema.partial().parse(req.body);
        const data = await (0, finance_service_1.updateCategory)(id, body);
        logger_1.logger.info('[finance.controller.updateCategory] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.updateCategory] ERRO', { id, error: err.message });
        next(err);
    }
}
async function deleteCategoryHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.deleteCategory] INÍCIO', { id });
    try {
        await (0, finance_service_1.deleteCategory)(id);
        logger_1.logger.info('[finance.controller.deleteCategory] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Categoria removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.deleteCategory] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// BUDGETS
// ---------------------------------------------------------------------------
async function listBudgetsHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.listBudgets] INÍCIO', { query: req.query });
    try {
        const { month, year } = budgetQuerySchema.parse(req.query);
        const data = await (0, finance_service_1.listBudgets)(month, year);
        logger_1.logger.info('[finance.controller.listBudgets] FIM - Sucesso', { total: data.length });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.listBudgets] ERRO', { error: err.message });
        next(err);
    }
}
async function createBudgetHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.createBudget] INÍCIO', { body: req.body });
    try {
        const body = createBudgetSchema.parse(req.body);
        const data = await (0, finance_service_1.createBudget)(body);
        logger_1.logger.info('[finance.controller.createBudget] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.createBudget] ERRO', { error: err.message });
        next(err);
    }
}
async function deleteBudgetHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.deleteBudget] INÍCIO', { id });
    try {
        await (0, finance_service_1.deleteBudget)(id);
        logger_1.logger.info('[finance.controller.deleteBudget] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Budget removido com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.deleteBudget] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// GOALS
// ---------------------------------------------------------------------------
async function listGoalsHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.listGoals] INÍCIO');
    try {
        const data = await (0, finance_service_1.listGoals)();
        logger_1.logger.info('[finance.controller.listGoals] FIM - Sucesso', { total: data.length });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.listGoals] ERRO', { error: err.message });
        next(err);
    }
}
async function createGoalHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.createGoal] INÍCIO', { body: req.body });
    try {
        const body = goalSchema.parse(req.body);
        const data = await (0, finance_service_1.createGoal)(body);
        logger_1.logger.info('[finance.controller.createGoal] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.createGoal] ERRO', { error: err.message });
        next(err);
    }
}
async function updateGoalHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.updateGoal] INÍCIO', { id, body: req.body });
    try {
        const body = updateGoalSchema.parse(req.body);
        const data = await (0, finance_service_1.updateGoal)(id, body);
        logger_1.logger.info('[finance.controller.updateGoal] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.updateGoal] ERRO', { id, error: err.message });
        next(err);
    }
}
async function deleteGoalHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.deleteGoal] INÍCIO', { id });
    try {
        await (0, finance_service_1.deleteGoal)(id);
        logger_1.logger.info('[finance.controller.deleteGoal] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Meta removida com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.deleteGoal] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// INVESTMENTS
// ---------------------------------------------------------------------------
async function listInvestmentsHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.listInvestments] INÍCIO');
    try {
        const data = await (0, finance_service_1.listInvestments)();
        logger_1.logger.info('[finance.controller.listInvestments] FIM - Sucesso', { total: data.length });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.listInvestments] ERRO', { error: err.message });
        next(err);
    }
}
async function createInvestmentHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.createInvestment] INÍCIO', { body: req.body });
    try {
        const body = investmentSchema.parse(req.body);
        const data = await (0, finance_service_1.createInvestment)(body);
        logger_1.logger.info('[finance.controller.createInvestment] FIM - Sucesso');
        res.status(201).json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.createInvestment] ERRO', { error: err.message });
        next(err);
    }
}
async function updateInvestmentHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.updateInvestment] INÍCIO', { id, body: req.body });
    try {
        const body = updateInvestmentSchema.parse(req.body);
        const data = await (0, finance_service_1.updateInvestment)(id, body);
        logger_1.logger.info('[finance.controller.updateInvestment] FIM - Sucesso', { id });
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.updateInvestment] ERRO', { id, error: err.message });
        next(err);
    }
}
async function deleteInvestmentHandler(req, res, next) {
    const id = String(req.params.id);
    logger_1.logger.info('[finance.controller.deleteInvestment] INÍCIO', { id });
    try {
        await (0, finance_service_1.deleteInvestment)(id);
        logger_1.logger.info('[finance.controller.deleteInvestment] FIM - Sucesso', { id });
        res.json({ success: true, message: 'Investimento removido com sucesso' });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.deleteInvestment] ERRO', { id, error: err.message });
        next(err);
    }
}
// ---------------------------------------------------------------------------
// SUMMARY e BALANCE
// ---------------------------------------------------------------------------
async function summaryHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.summary] INÍCIO', { query: req.query });
    try {
        const now = new Date();
        const { month, year } = summaryQuerySchema.parse({
            month: req.query.month ?? now.getMonth() + 1,
            year: req.query.year ?? now.getFullYear(),
        });
        const data = await (0, finance_service_1.getMonthlySummary)(month, year);
        logger_1.logger.info('[finance.controller.summary] FIM - Sucesso');
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.summary] ERRO', { error: err.message });
        next(err);
    }
}
async function monthlyBalanceHandler(req, res, next) {
    logger_1.logger.info('[finance.controller.monthlyBalance] INÍCIO', { query: req.query });
    try {
        const { months } = balanceQuerySchema.parse(req.query);
        const data = await (0, finance_service_1.getMonthlyBalance)(months);
        logger_1.logger.info('[finance.controller.monthlyBalance] FIM - Sucesso');
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('[finance.controller.monthlyBalance] ERRO', { error: err.message });
        next(err);
    }
}
//# sourceMappingURL=finance.controller.js.map