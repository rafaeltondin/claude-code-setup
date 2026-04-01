export interface ListTasksParams {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
    tag?: string;
}
export interface CreateTaskData {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    tags?: string[];
}
export interface UpdateTaskData {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    tags?: string[];
}
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare function listTasks(params: ListTasksParams): Promise<PaginatedResult<unknown>>;
export declare function getTaskById(id: string): Promise<unknown>;
export declare function createTask(data: CreateTaskData): Promise<unknown>;
export declare function updateTask(id: string, data: UpdateTaskData): Promise<unknown>;
export declare function updateTaskStatus(id: string, status: string): Promise<unknown>;
export declare function deleteTask(id: string): Promise<void>;
export declare function getStats(): Promise<unknown>;
//# sourceMappingURL=personal-tasks.service.d.ts.map