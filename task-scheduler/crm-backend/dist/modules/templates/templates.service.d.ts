export interface CreateTemplateData {
    name: string;
    channel: string;
    subject?: string;
    content: string;
    category?: string;
}
export interface UpdateTemplateData {
    name?: string;
    channel?: string;
    subject?: string;
    content?: string;
    category?: string;
}
export interface ListTemplatesParams {
    channel?: string;
    category?: string;
}
export interface RenderedTemplate {
    subject?: string;
    content: string;
}
export declare function listTemplates(params: ListTemplatesParams): Promise<unknown[]>;
export declare function getTemplate(id: string): Promise<unknown>;
export declare function createTemplate(data: CreateTemplateData): Promise<unknown>;
export declare function updateTemplate(id: string, data: UpdateTemplateData): Promise<unknown>;
export declare function deleteTemplate(id: string): Promise<void>;
/**
 * Substitui as variáveis do template com os dados reais do lead.
 * Variáveis suportadas: {{name}}, {{company}}, {{position}}, {{email}}, {{phone}}
 */
export declare function renderTemplate(templateId: string, leadId: string): Promise<RenderedTemplate>;
//# sourceMappingURL=templates.service.d.ts.map