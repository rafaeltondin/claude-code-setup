export interface AnaliseTagsResult {
    leadId: string;
    leadName: string;
    score: number;
    matchedLabels: string[];
    tagsAntes: string[];
    tagsDepois: string[];
    temperaturaAntes: string;
    temperaturaDepois: string;
    alterado: boolean;
}
export declare function analisarTagsLead(leadId: string): Promise<AnaliseTagsResult>;
export interface AnaliseTagsTodosResult {
    total: number;
    analisados: number;
    alterados: number;
    erros: number;
    resultados: AnaliseTagsResult[];
}
export declare function analisarTagsTodos(): Promise<AnaliseTagsTodosResult>;
//# sourceMappingURL=tags.service.d.ts.map