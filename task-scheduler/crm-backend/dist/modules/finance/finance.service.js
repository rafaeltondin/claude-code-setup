"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransactions = listTransactions;
exports.getTransactionById = getTransactionById;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
exports.listBudgets = listBudgets;
exports.createBudget = createBudget;
exports.deleteBudget = deleteBudget;
exports.listGoals = listGoals;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
exports.listInvestments = listInvestments;
exports.createInvestment = createInvestment;
exports.updateInvestment = updateInvestment;
exports.deleteInvestment = deleteInvestment;
exports.getMonthlySummary = getMonthlySummary;
exports.getMonthlyBalance = getMonthlyBalance;
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------
async function listTransactions(params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[finance.service.listTransactions] INÍCIO', { page, limit, params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (params.categoryId)
        where.categoryId = params.categoryId;
    if (params.paid !== undefined)
        where.paid = params.paid;
    if (params.isRecurring !== undefined)
        where.isRecurring = params.isRecurring;
    if (params.month && params.year) {
        const start = new Date(params.year, params.month - 1, 1);
        const end = new Date(params.year, params.month, 1);
        where.date = { gte: start, lt: end };
    }
    else if (params.dateFrom || params.dateTo) {
        where.date = {};
        if (params.dateFrom)
            where.date.gte = new Date(params.dateFrom);
        if (params.dateTo)
            where.date.lte = new Date(params.dateTo);
    }
    if (params.search) {
        where.description = { contains: params.search };
    }
    const total = await database_1.prisma.transaction.count({ where });
    const data = await database_1.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { category: true },
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[finance.service.listTransactions] FIM', { total, retornados: data.length });
    return { data, pagination: { page, limit, total, totalPages } };
}
async function getTransactionById(id) {
    logger_1.logger.info('[finance.service.getTransactionById] INÍCIO', { id });
    const transaction = await database_1.prisma.transaction.findUnique({
        where: { id },
        include: { category: true },
    });
    if (!transaction) {
        logger_1.logger.warn('[finance.service.getTransactionById] Transação não encontrada', { id });
        throw new errors_1.AppError(404, 'Transação não encontrada', 'TRANSACTION_NOT_FOUND');
    }
    logger_1.logger.info('[finance.service.getTransactionById] FIM', { id });
    return transaction;
}
async function createTransaction(data) {
    logger_1.logger.info('[finance.service.createTransaction] INÍCIO', {
        amount: data.amount,
        date: data.date,
        categoryId: data.categoryId,
    });
    const transaction = await database_1.prisma.transaction.create({
        data: {
            description: data.description,
            amount: data.amount,
            date: new Date(data.date),
            categoryId: data.categoryId ?? null,
            isRecurring: data.isRecurring ?? false,
            paid: data.paid ?? true,
        },
        include: { category: true },
    });
    logger_1.logger.info('[finance.service.createTransaction] FIM - Criada', { id: transaction.id });
    // Se for recorrente, gera cópias para os próximos 11 meses (sem duplicar)
    if (data.isRecurring) {
        const baseDate = new Date(data.date);
        let created = 0;
        for (let i = 1; i <= 11; i++) {
            const futureDate = new Date(baseDate);
            futureDate.setMonth(futureDate.getMonth() + i);
            // Verificar se já existe nesse mês com mesma descrição
            const monthStart = new Date(futureDate.getFullYear(), futureDate.getMonth(), 1);
            const monthEnd = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 1);
            const existing = await database_1.prisma.transaction.findFirst({
                where: {
                    description: data.description,
                    date: { gte: monthStart, lt: monthEnd },
                },
            });
            if (!existing) {
                await database_1.prisma.transaction.create({
                    data: {
                        description: data.description,
                        amount: data.amount,
                        date: futureDate,
                        categoryId: data.categoryId ?? null,
                        isRecurring: true,
                        paid: false,
                    },
                });
                created++;
            }
        }
        if (created > 0) {
            logger_1.logger.info('[finance.service.createTransaction] Recorrente: ' + created + ' cópias futuras criadas');
        }
    }
    return transaction;
}
async function updateTransaction(id, data) {
    logger_1.logger.info('[finance.service.updateTransaction] INÍCIO', { id, campos: Object.keys(data) });
    const existente = await database_1.prisma.transaction.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.updateTransaction] Transação não encontrada', { id });
        throw new errors_1.AppError(404, 'Transação não encontrada', 'TRANSACTION_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.amount !== undefined)
        updateData.amount = data.amount;
    if (data.date !== undefined)
        updateData.date = new Date(data.date);
    if (data.categoryId !== undefined)
        updateData.categoryId = data.categoryId;
    if (data.isRecurring !== undefined)
        updateData.isRecurring = data.isRecurring;
    if (data.paid !== undefined)
        updateData.paid = data.paid;
    const transaction = await database_1.prisma.transaction.update({
        where: { id },
        data: updateData,
        include: { category: true },
    });
    logger_1.logger.info('[finance.service.updateTransaction] FIM - Atualizada', { id });
    return transaction;
}
async function deleteTransaction(id) {
    logger_1.logger.info('[finance.service.deleteTransaction] INÍCIO', { id });
    const existente = await database_1.prisma.transaction.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.deleteTransaction] Transação não encontrada', { id });
        throw new errors_1.AppError(404, 'Transação não encontrada', 'TRANSACTION_NOT_FOUND');
    }
    await database_1.prisma.transaction.delete({ where: { id } });
    logger_1.logger.info('[finance.service.deleteTransaction] FIM - Deletada', { id });
}
// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
async function listCategories() {
    logger_1.logger.info('[finance.service.listCategories] INÍCIO');
    const data = await database_1.prisma.financeCategory.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { transactions: true } },
        },
    });
    logger_1.logger.info('[finance.service.listCategories] FIM', { total: data.length });
    return data;
}
async function createCategory(data) {
    logger_1.logger.info('[finance.service.createCategory] INÍCIO', { name: data.name, type: data.type });
    const category = await database_1.prisma.financeCategory.create({ data });
    logger_1.logger.info('[finance.service.createCategory] FIM - Criada', { id: category.id });
    return category;
}
async function updateCategory(id, data) {
    logger_1.logger.info('[finance.service.updateCategory] INÍCIO', { id });
    const existente = await database_1.prisma.financeCategory.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.updateCategory] Categoria não encontrada', { id });
        throw new errors_1.AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
    }
    const category = await database_1.prisma.financeCategory.update({ where: { id }, data });
    logger_1.logger.info('[finance.service.updateCategory] FIM - Atualizada', { id });
    return category;
}
async function deleteCategory(id) {
    logger_1.logger.info('[finance.service.deleteCategory] INÍCIO', { id });
    const existente = await database_1.prisma.financeCategory.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.deleteCategory] Categoria não encontrada', { id });
        throw new errors_1.AppError(404, 'Categoria não encontrada', 'CATEGORY_NOT_FOUND');
    }
    await database_1.prisma.financeCategory.delete({ where: { id } });
    logger_1.logger.info('[finance.service.deleteCategory] FIM - Deletada', { id });
}
// ---------------------------------------------------------------------------
// BUDGETS
// ---------------------------------------------------------------------------
async function listBudgets(month, year) {
    logger_1.logger.info('[finance.service.listBudgets] INÍCIO', { month, year });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (month)
        where.month = month;
    if (year)
        where.year = year;
    const data = await database_1.prisma.budget.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: { category: true },
    });
    logger_1.logger.info('[finance.service.listBudgets] FIM', { total: data.length });
    return data;
}
async function createBudget(data) {
    logger_1.logger.info('[finance.service.createBudget] INÍCIO', { data });
    const budget = await database_1.prisma.budget.create({
        data: {
            categoryId: data.categoryId ?? null,
            amount: data.amount,
            month: data.month,
            year: data.year,
        },
        include: { category: true },
    });
    logger_1.logger.info('[finance.service.createBudget] FIM - Criado', { id: budget.id });
    return budget;
}
async function deleteBudget(id) {
    logger_1.logger.info('[finance.service.deleteBudget] INÍCIO', { id });
    const existente = await database_1.prisma.budget.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.deleteBudget] Budget não encontrado', { id });
        throw new errors_1.AppError(404, 'Budget não encontrado', 'BUDGET_NOT_FOUND');
    }
    await database_1.prisma.budget.delete({ where: { id } });
    logger_1.logger.info('[finance.service.deleteBudget] FIM - Deletado', { id });
}
// ---------------------------------------------------------------------------
// GOALS
// ---------------------------------------------------------------------------
async function listGoals() {
    logger_1.logger.info('[finance.service.listGoals] INÍCIO');
    const data = await database_1.prisma.goal.findMany({ orderBy: { createdAt: 'desc' } });
    logger_1.logger.info('[finance.service.listGoals] FIM', { total: data.length });
    return data;
}
async function createGoal(data) {
    logger_1.logger.info('[finance.service.createGoal] INÍCIO', { name: data.name, targetAmount: data.targetAmount });
    const goal = await database_1.prisma.goal.create({
        data: {
            name: data.name,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount ?? 0,
            deadline: data.deadline ? new Date(data.deadline) : null,
        },
    });
    logger_1.logger.info('[finance.service.createGoal] FIM - Criada', { id: goal.id });
    return goal;
}
async function updateGoal(id, data) {
    logger_1.logger.info('[finance.service.updateGoal] INÍCIO', { id, campos: Object.keys(data) });
    const existente = await database_1.prisma.goal.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.updateGoal] Goal não encontrada', { id });
        throw new errors_1.AppError(404, 'Meta não encontrada', 'GOAL_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.targetAmount !== undefined)
        updateData.targetAmount = data.targetAmount;
    if (data.currentAmount !== undefined)
        updateData.currentAmount = data.currentAmount;
    if (data.deadline !== undefined)
        updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    const goal = await database_1.prisma.goal.update({ where: { id }, data: updateData });
    logger_1.logger.info('[finance.service.updateGoal] FIM - Atualizada', { id });
    return goal;
}
async function deleteGoal(id) {
    logger_1.logger.info('[finance.service.deleteGoal] INÍCIO', { id });
    const existente = await database_1.prisma.goal.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.deleteGoal] Goal não encontrada', { id });
        throw new errors_1.AppError(404, 'Meta não encontrada', 'GOAL_NOT_FOUND');
    }
    await database_1.prisma.goal.delete({ where: { id } });
    logger_1.logger.info('[finance.service.deleteGoal] FIM - Deletada', { id });
}
// ---------------------------------------------------------------------------
// INVESTMENTS
// ---------------------------------------------------------------------------
async function listInvestments() {
    logger_1.logger.info('[finance.service.listInvestments] INÍCIO');
    const data = await database_1.prisma.investment.findMany({ orderBy: { createdAt: 'desc' } });
    logger_1.logger.info('[finance.service.listInvestments] FIM', { total: data.length });
    return data;
}
async function createInvestment(data) {
    logger_1.logger.info('[finance.service.createInvestment] INÍCIO', { name: data.name, amount: data.amount });
    const investment = await database_1.prisma.investment.create({
        data: {
            name: data.name,
            amount: data.amount,
            type: data.type,
            date: data.date ? new Date(data.date) : null,
        },
    });
    logger_1.logger.info('[finance.service.createInvestment] FIM - Criado', { id: investment.id });
    return investment;
}
async function updateInvestment(id, data) {
    logger_1.logger.info('[finance.service.updateInvestment] INÍCIO', { id, campos: Object.keys(data) });
    const existente = await database_1.prisma.investment.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.updateInvestment] Investimento não encontrado', { id });
        throw new errors_1.AppError(404, 'Investimento não encontrado', 'INVESTMENT_NOT_FOUND');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.amount !== undefined)
        updateData.amount = data.amount;
    if (data.type !== undefined)
        updateData.type = data.type;
    if (data.date !== undefined)
        updateData.date = data.date ? new Date(data.date) : null;
    const investment = await database_1.prisma.investment.update({ where: { id }, data: updateData });
    logger_1.logger.info('[finance.service.updateInvestment] FIM - Atualizado', { id });
    return investment;
}
async function deleteInvestment(id) {
    logger_1.logger.info('[finance.service.deleteInvestment] INÍCIO', { id });
    const existente = await database_1.prisma.investment.findUnique({ where: { id } });
    if (!existente) {
        logger_1.logger.warn('[finance.service.deleteInvestment] Investimento não encontrado', { id });
        throw new errors_1.AppError(404, 'Investimento não encontrado', 'INVESTMENT_NOT_FOUND');
    }
    await database_1.prisma.investment.delete({ where: { id } });
    logger_1.logger.info('[finance.service.deleteInvestment] FIM - Deletado', { id });
}
// ---------------------------------------------------------------------------
// SUMMARY (receitas, despesas, saldo do mês)
// ---------------------------------------------------------------------------
async function getMonthlySummary(month, year) {
    logger_1.logger.info('[finance.service.getMonthlySummary] INÍCIO', { month, year });
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    logger_1.logger.debug('[finance.service.getMonthlySummary] Período', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
    });
    const [transactions, budgets] = await Promise.all([
        database_1.prisma.transaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: true },
        }),
        database_1.prisma.budget.findMany({
            where: { month, year },
            include: { category: true },
        }),
    ]);
    // Separar receitas e despesas por tipo de categoria
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
        const cat = t.category;
        if (cat?.type === 'income') {
            totalIncome += t.amount;
        }
        else {
            totalExpense += t.amount;
        }
    }
    const balance = totalIncome - totalExpense;
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    // Métricas detalhadas: pago vs pendente por tipo
    let totalRecebido = 0; // income + paid
    let totalPago = 0; // expense + paid
    let faltaReceber = 0; // income + !paid
    let faltaPagar = 0; // expense + !paid
    let pendingCount = 0;
    for (const t of transactions) {
        const cat = t.category;
        const isIncome = cat?.type === 'income';
        if (t.paid) {
            if (isIncome)
                totalRecebido += t.amount;
            else
                totalPago += t.amount;
        }
        else {
            pendingCount++;
            if (isIncome)
                faltaReceber += t.amount;
            else
                faltaPagar += t.amount;
        }
    }
    const summary = {
        month,
        year,
        totalIncome,
        totalExpense,
        balance,
        totalBudget,
        budgetUsagePercent: totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : null,
        transactionsCount: transactions.length,
        pendingCount,
        totalRecebido,
        totalPago,
        faltaReceber,
        faltaPagar,
    };
    logger_1.logger.info('[finance.service.getMonthlySummary] FIM', { summary });
    return summary;
}
// ---------------------------------------------------------------------------
// MONTHLY BALANCE (saldo acumulado por mês, últimos N meses)
// ---------------------------------------------------------------------------
async function getMonthlyBalance(months = 12) {
    logger_1.logger.info('[finance.service.getMonthlyBalance] INÍCIO', { months });
    const now = new Date();
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const transactions = await database_1.prisma.transaction.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            include: { category: true },
        });
        let income = 0;
        let expense = 0;
        for (const t of transactions) {
            const cat = t.category;
            if (cat?.type === 'income') {
                income += t.amount;
            }
            else {
                expense += t.amount;
            }
        }
        result.push({ month, year, income, expense, balance: income - expense });
    }
    logger_1.logger.info('[finance.service.getMonthlyBalance] FIM', { meses: result.length });
    return result;
}
//# sourceMappingURL=finance.service.js.map