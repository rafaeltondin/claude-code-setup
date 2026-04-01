interface ListCampaignsParams {
    page?: number;
    limit?: number;
    status?: string;
}
interface CreateCampaignData {
    name: string;
    description?: string;
    channel: string;
}
interface UpdateCampaignData {
    name?: string;
    description?: string;
    channel?: string;
}
interface CampaignStepInput {
    order: number;
    delayDays: number;
    channel: string;
    template: string;
    subject?: string;
}
interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
/**
 * Lista campanhas com paginação e filtro opcional por status.
 */
export declare function listCampaigns(params: ListCampaignsParams): Promise<{
    data: unknown[];
    pagination: PaginationMeta;
}>;
/**
 * Retorna uma campanha com seus steps e contagens de leads/mensagens.
 */
export declare function getCampaign(id: string): Promise<unknown>;
/**
 * Cria uma nova campanha.
 */
export declare function createCampaign(data: CreateCampaignData): Promise<unknown>;
/**
 * Atualiza uma campanha existente.
 */
export declare function updateCampaign(id: string, data: UpdateCampaignData): Promise<unknown>;
/**
 * Adiciona ou substitui os steps de uma campanha.
 */
export declare function addSteps(campaignId: string, steps: CampaignStepInput[]): Promise<unknown>;
/**
 * Adiciona leads a uma campanha usando createMany para evitar N queries individuais.
 */
export declare function addLeads(campaignId: string, leadIds: string[]): Promise<unknown>;
/**
 * Inicia uma campanha: muda status de forma atomica (evita race condition),
 * registra startedAt e agenda o primeiro step para todos os leads ativos
 * usando addBulk para enfileirar todos os jobs de uma vez.
 */
export declare function startCampaign(id: string): Promise<unknown>;
/**
 * Pausa uma campanha ativa.
 */
export declare function pauseCampaign(id: string): Promise<unknown>;
/**
 * Retorna estatísticas de uma campanha com breakdown por step e contagem de leads por status.
 */
export declare function getCampaignStats(id: string): Promise<unknown>;
/**
 * Deleta uma campanha. Permitido apenas nos status: draft, paused, completed.
 * Se status for 'active', retorna erro 400 solicitando que pause primeiro.
 * A exclusão em cascata (steps, leads, messages) é garantida pelo schema Prisma.
 */
export declare function deleteCampaign(id: string): Promise<void>;
interface ListCampaignLeadsParams {
    page?: number;
    limit?: number;
    status?: string;
}
/**
 * Lista os leads de uma campanha com dados do lead (name, email, phone, company)
 * e informações de progresso (currentStep, status, nextActionAt, completedAt).
 * Suporta paginação e filtro por status.
 */
export declare function listCampaignLeads(campaignId: string, params: ListCampaignLeadsParams): Promise<{
    data: unknown[];
    pagination: PaginationMeta;
}>;
/**
 * Remove um lead de uma campanha.
 * Se a campanha estiver ativa, o lead simplesmente para de receber mensagens
 * (os jobs agendados verificam o status do CampaignLead antes de disparar).
 */
export declare function removeCampaignLead(campaignId: string, leadId: string): Promise<void>;
/**
 * Clona uma campanha: cria nova com nome + " (cópia)", copia todos os steps.
 * Não copia leads — começa do zero. Status da cópia é 'draft'.
 */
export declare function duplicateCampaign(id: string): Promise<unknown>;
export {};
//# sourceMappingURL=campaigns.service.d.ts.map