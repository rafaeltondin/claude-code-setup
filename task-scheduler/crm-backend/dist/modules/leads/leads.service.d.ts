export interface ListLeadsParams {
    page?: number;
    limit?: number;
    status?: string;
    temperature?: string;
    source?: string;
    search?: string;
    tags?: string;
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
export interface ImportResult {
    imported: number;
    errors: Array<{
        row: number;
        error: string;
    }>;
}
export declare function listLeads(params: ListLeadsParams): Promise<PaginatedResult<unknown>>;
export declare function getLeadById(id: string): Promise<unknown>;
export interface CreateLeadData {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    source?: string;
    status?: string;
    temperature?: string;
    notes?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
}
export interface CreateLeadResult {
    lead: unknown;
    duplicateWarning?: {
        message: string;
        field: 'phone' | 'email';
        existingLead: unknown;
    };
}
export declare function createLead(data: CreateLeadData): Promise<CreateLeadResult>;
export interface UpdateLeadData {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    source?: string;
    status?: string;
    temperature?: string;
    notes?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
}
export declare function updateLead(id: string, data: UpdateLeadData): Promise<unknown>;
export declare function deleteLead(id: string): Promise<void>;
export declare function importLeadsCSV(fileBuffer: Buffer): Promise<ImportResult>;
export interface WhatsappCheckItem {
    number: string;
    normalized: string;
    exists: boolean;
}
/**
 * Verifica uma lista de números via Evolution API.
 * Retorna para cada número se tem WhatsApp ativo.
 */
export declare function checkWhatsappNumbers(numbers: string[]): Promise<WhatsappCheckItem[]>;
export interface BulkWhatsappCleanupResult {
    total: number;
    withoutPhone: number;
    checked: number;
    verified: number;
    deleted: number;
    dryRun: boolean;
}
/**
 * Verifica todos os leads via Evolution API e deleta (ou lista) os que não possuem WhatsApp ativo.
 * @param dryRun - Se true, apenas lista sem deletar.
 */
export declare function bulkWhatsappCleanup(dryRun?: boolean): Promise<BulkWhatsappCleanupResult>;
export declare function addNote(leadId: string, content: string): Promise<unknown>;
export declare function getLeadMessages(leadId: string, params: {
    page?: number;
    limit?: number;
}): Promise<PaginatedResult<unknown>>;
export declare function getLeadActivities(leadId: string, params: {
    page?: number;
    limit?: number;
}): Promise<PaginatedResult<unknown>>;
//# sourceMappingURL=leads.service.d.ts.map