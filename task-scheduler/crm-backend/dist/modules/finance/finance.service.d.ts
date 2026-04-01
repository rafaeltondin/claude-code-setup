export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ListTransactionsParams {
    page?: number;
    limit?: number;
    categoryId?: string;
    paid?: boolean;
    isRecurring?: boolean;
    dateFrom?: string;
    dateTo?: string;
    month?: number;
    year?: number;
    search?: string;
}
export interface CreateTransactionData {
    description?: string;
    amount: number;
    date: string;
    categoryId?: string;
    isRecurring?: boolean;
    paid?: boolean;
}
export interface UpdateTransactionData {
    description?: string;
    amount?: number;
    date?: string;
    categoryId?: string | null;
    isRecurring?: boolean;
    paid?: boolean;
}
export interface CreateCategoryData {
    name: string;
    type: 'income' | 'expense';
}
export interface CreateBudgetData {
    categoryId?: string;
    amount: number;
    month: number;
    year: number;
}
export interface CreateGoalData {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
}
export interface UpdateGoalData {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    deadline?: string | null;
}
export interface CreateInvestmentData {
    name: string;
    amount: number;
    type?: string;
    date?: string;
}
export interface UpdateInvestmentData {
    name?: string;
    amount?: number;
    type?: string;
    date?: string | null;
}
export declare function listTransactions(params: ListTransactionsParams): Promise<PaginatedResult<unknown>>;
export declare function getTransactionById(id: string): Promise<unknown>;
export declare function createTransaction(data: CreateTransactionData): Promise<unknown>;
export declare function updateTransaction(id: string, data: UpdateTransactionData): Promise<unknown>;
export declare function deleteTransaction(id: string): Promise<void>;
export declare function listCategories(): Promise<unknown[]>;
export declare function createCategory(data: CreateCategoryData): Promise<unknown>;
export declare function updateCategory(id: string, data: Partial<CreateCategoryData>): Promise<unknown>;
export declare function deleteCategory(id: string): Promise<void>;
export declare function listBudgets(month?: number, year?: number): Promise<unknown[]>;
export declare function createBudget(data: CreateBudgetData): Promise<unknown>;
export declare function deleteBudget(id: string): Promise<void>;
export declare function listGoals(): Promise<unknown[]>;
export declare function createGoal(data: CreateGoalData): Promise<unknown>;
export declare function updateGoal(id: string, data: UpdateGoalData): Promise<unknown>;
export declare function deleteGoal(id: string): Promise<void>;
export declare function listInvestments(): Promise<unknown[]>;
export declare function createInvestment(data: CreateInvestmentData): Promise<unknown>;
export declare function updateInvestment(id: string, data: UpdateInvestmentData): Promise<unknown>;
export declare function deleteInvestment(id: string): Promise<void>;
export declare function getMonthlySummary(month: number, year: number): Promise<unknown>;
export declare function getMonthlyBalance(months?: number): Promise<unknown[]>;
//# sourceMappingURL=finance.service.d.ts.map