export interface ListNotesParams {
    page?: number;
    limit?: number;
    categoryId?: string;
    pinned?: boolean;
    archived?: boolean;
    search?: string;
}
export interface CreateNoteData {
    title: string;
    content?: string;
    color?: string;
    pinned?: boolean;
    archived?: boolean;
    categoryId?: string;
}
export interface UpdateNoteData {
    title?: string;
    content?: string;
    color?: string;
    pinned?: boolean;
    archived?: boolean;
    categoryId?: string | null;
}
export interface CreateNoteCategoryData {
    name: string;
    color?: string;
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
export declare function listNotes(params: ListNotesParams): Promise<PaginatedResult<unknown>>;
export declare function getNoteById(id: string): Promise<unknown>;
export declare function createNote(data: CreateNoteData): Promise<unknown>;
export declare function updateNote(id: string, data: UpdateNoteData): Promise<unknown>;
export declare function deleteNote(id: string): Promise<void>;
export declare function togglePin(id: string): Promise<unknown>;
export declare function toggleArchive(id: string): Promise<unknown>;
export declare function listNoteCategories(): Promise<unknown[]>;
export declare function createNoteCategory(data: CreateNoteCategoryData): Promise<unknown>;
export declare function updateNoteCategory(id: string, data: Partial<CreateNoteCategoryData>): Promise<unknown>;
export declare function deleteNoteCategory(id: string): Promise<void>;
//# sourceMappingURL=notes.service.d.ts.map