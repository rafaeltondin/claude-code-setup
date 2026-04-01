export interface DashboardStats {
    financeSummary: {
        totalIncome: number;
        totalExpense: number;
        balance: number;
    };
    totalTasks: number;
    pendingTasks: number;
    totalNotes: number;
}
export declare function getStats(): Promise<DashboardStats>;
export declare function invalidateDashboardCache(): Promise<void>;
//# sourceMappingURL=dashboard.service.d.ts.map