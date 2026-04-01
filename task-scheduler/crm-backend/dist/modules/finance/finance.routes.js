"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRoutes = void 0;
const express_1 = require("express");
const finance_controller_1 = require("./finance.controller");
exports.financeRoutes = (0, express_1.Router)();
// Transactions
exports.financeRoutes.get('/transactions', finance_controller_1.listTransactionsHandler);
exports.financeRoutes.get('/transactions/:id', finance_controller_1.getTransactionHandler);
exports.financeRoutes.post('/transactions', finance_controller_1.createTransactionHandler);
exports.financeRoutes.put('/transactions/:id', finance_controller_1.updateTransactionHandler);
exports.financeRoutes.delete('/transactions/:id', finance_controller_1.deleteTransactionHandler);
// Categories
exports.financeRoutes.get('/categories', finance_controller_1.listCategoriesHandler);
exports.financeRoutes.post('/categories', finance_controller_1.createCategoryHandler);
exports.financeRoutes.put('/categories/:id', finance_controller_1.updateCategoryHandler);
exports.financeRoutes.delete('/categories/:id', finance_controller_1.deleteCategoryHandler);
// Budgets
exports.financeRoutes.get('/budgets', finance_controller_1.listBudgetsHandler);
exports.financeRoutes.post('/budgets', finance_controller_1.createBudgetHandler);
exports.financeRoutes.delete('/budgets/:id', finance_controller_1.deleteBudgetHandler);
// Goals
exports.financeRoutes.get('/goals', finance_controller_1.listGoalsHandler);
exports.financeRoutes.post('/goals', finance_controller_1.createGoalHandler);
exports.financeRoutes.put('/goals/:id', finance_controller_1.updateGoalHandler);
exports.financeRoutes.delete('/goals/:id', finance_controller_1.deleteGoalHandler);
// Investments
exports.financeRoutes.get('/investments', finance_controller_1.listInvestmentsHandler);
exports.financeRoutes.post('/investments', finance_controller_1.createInvestmentHandler);
exports.financeRoutes.put('/investments/:id', finance_controller_1.updateInvestmentHandler);
exports.financeRoutes.delete('/investments/:id', finance_controller_1.deleteInvestmentHandler);
// Summary e Balance (agregados)
exports.financeRoutes.get('/summary', finance_controller_1.summaryHandler);
exports.financeRoutes.get('/balance/monthly', finance_controller_1.monthlyBalanceHandler);
//# sourceMappingURL=finance.routes.js.map