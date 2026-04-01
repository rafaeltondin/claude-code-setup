"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLeads = listLeads;
exports.getLeadById = getLeadById;
exports.createLead = createLead;
exports.updateLead = updateLead;
exports.deleteLead = deleteLead;
exports.importLeadsCSV = importLeadsCSV;
exports.checkWhatsappNumbers = checkWhatsappNumbers;
exports.bulkWhatsappCleanup = bulkWhatsappCleanup;
exports.addNote = addNote;
exports.getLeadMessages = getLeadMessages;
exports.getLeadActivities = getLeadActivities;
const csv_parse_1 = require("csv-parse");
const stream_1 = require("stream");
const database_1 = require("../../config/database");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const events_controller_1 = require("../events/events.controller");
const whatsapp_service_1 = require("../../services/whatsapp/whatsapp.service");
// ---------------------------------------------------------------------------
// listLeads
// ---------------------------------------------------------------------------
async function listLeads(params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[leads.service.listLeads] INÍCIO', {
        page,
        limit,
        status: params.status,
        temperature: params.temperature,
        source: params.source,
        search: params.search,
        tags: params.tags,
    });
    // Montar filtros dinamicamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {};
    if (params.status) {
        where.status = params.status;
        logger_1.logger.debug('[leads.service.listLeads] Filtro status aplicado', { status: params.status });
    }
    if (params.temperature) {
        where.temperature = params.temperature;
        logger_1.logger.debug('[leads.service.listLeads] Filtro temperature aplicado', { temperature: params.temperature });
    }
    if (params.source) {
        where.source = params.source;
        logger_1.logger.debug('[leads.service.listLeads] Filtro source aplicado', { source: params.source });
    }
    if (params.search) {
        where.OR = [
            { name: { contains: params.search } },
            { email: { contains: params.search } },
            { phone: { contains: params.search } },
            { company: { contains: params.search } },
        ];
        logger_1.logger.debug('[leads.service.listLeads] Filtro search aplicado', { search: params.search });
    }
    if (params.tags) {
        // tags ficam armazenadas como JSON string no SQLite — busca por substring
        where.tags = { contains: params.tags };
        logger_1.logger.debug('[leads.service.listLeads] Filtro tags aplicado', { tags: params.tags });
    }
    logger_1.logger.debug('[leads.service.listLeads] Executando query COUNT...', { where });
    const total = await database_1.prisma.lead.count({ where });
    logger_1.logger.debug('[leads.service.listLeads] Executando query SELECT...', { skip, limit });
    const data = await database_1.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[leads.service.listLeads] FIM', {
        total,
        retornados: data.length,
        page,
        totalPages,
    });
    return {
        data,
        pagination: { page, limit, total, totalPages },
    };
}
// ---------------------------------------------------------------------------
// getLeadById
// ---------------------------------------------------------------------------
async function getLeadById(id) {
    logger_1.logger.info('[leads.service.getLeadById] INÍCIO', { id });
    const lead = await database_1.prisma.lead.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
            activities: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });
    if (!lead) {
        logger_1.logger.warn('[leads.service.getLeadById] Lead não encontrado', { id });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    logger_1.logger.info('[leads.service.getLeadById] FIM', {
        id,
        messagesCount: lead.messages.length,
        activitiesCount: lead.activities.length,
    });
    return lead;
}
async function createLead(data) {
    // BUG 22 FIX: Mascarar PII (email e phone) nos logs
    const phoneMasked = data.phone ? data.phone.slice(0, 6) + '***' : undefined;
    const emailMasked = data.email ? data.email.replace(/(?<=.{3}).(?=.*@)/g, '*') : undefined;
    logger_1.logger.info('[leads.service.createLead] INÍCIO', {
        name: data.name,
        email: emailMasked,
        phone: phoneMasked,
        company: data.company,
        source: data.source,
    });
    // ---------------------------------------------------------------------------
    // Validação de WhatsApp — somente criar lead se número tiver WhatsApp ativo
    // ---------------------------------------------------------------------------
    if (data.phone) {
        logger_1.logger.info('[leads.service.createLead] Verificando WhatsApp do numero...', {
            phone: phoneMasked,
        });
        try {
            const whatsapp = (0, whatsapp_service_1.getWhatsAppService)();
            const digits = data.phone.replace(/\D/g, '');
            const normalized = digits.startsWith('55') ? digits : `55${digits}`;
            const checkResults = await whatsapp.checkNumbers([normalized]);
            const verified = checkResults.find((r) => {
                const num = r.jid ? r.jid.split('@')[0] : r.number;
                return num === normalized;
            });
            if (!verified?.exists) {
                logger_1.logger.warn('[leads.service.createLead] Numero sem WhatsApp — lead rejeitado', {
                    phone: phoneMasked,
                });
                throw new errors_1.AppError(400, 'O número de telefone informado não possui WhatsApp ativo. Apenas leads com WhatsApp verificado podem ser salvos.', 'WHATSAPP_NOT_VERIFIED');
            }
            logger_1.logger.info('[leads.service.createLead] WhatsApp verificado com sucesso', {
                phone: phoneMasked,
            });
        }
        catch (err) {
            // Re-lançar erros de negócio (WHATSAPP_NOT_VERIFIED) sem modificar
            if (err instanceof errors_1.AppError)
                throw err;
            // Se WhatsApp service não estiver disponível, logar warning mas prosseguir
            logger_1.logger.warn('[leads.service.createLead] WhatsApp service indisponivel — criando lead sem verificacao', {
                phone: phoneMasked,
                error: err.message,
            });
        }
    }
    // ---------------------------------------------------------------------------
    // BUG 21 FIX: Duplicate detection + criação envolvidos em prisma.$transaction
    // para garantir atomicidade e evitar race condition no SQLite
    // ---------------------------------------------------------------------------
    let duplicateWarning;
    const lead = await database_1.prisma.$transaction(async (tx) => {
        // Verificar duplicata por phone
        if (data.phone) {
            logger_1.logger.debug('[leads.service.createLead] Verificando duplicata por phone...', {
                phone: phoneMasked,
            });
            const leadComMesmoPhone = await tx.lead.findFirst({
                where: { phone: data.phone },
                select: { id: true, name: true, status: true },
            });
            if (leadComMesmoPhone) {
                logger_1.logger.warn('[leads.service.createLead] Duplicata detectada por phone', {
                    phone: phoneMasked,
                    existingLeadId: leadComMesmoPhone.id,
                });
                // BUG 23 FIX: Retornar apenas { id, name, status } para não expor PII completo
                duplicateWarning = {
                    message: 'Lead com mesmo telefone já existe',
                    field: 'phone',
                    existingLead: { id: leadComMesmoPhone.id, name: leadComMesmoPhone.name, status: leadComMesmoPhone.status },
                };
            }
        }
        if (!duplicateWarning && data.email) {
            logger_1.logger.debug('[leads.service.createLead] Verificando duplicata por email...', {
                email: emailMasked,
            });
            const leadComMesmoEmail = await tx.lead.findFirst({
                where: { email: data.email },
                select: { id: true, name: true, status: true },
            });
            if (leadComMesmoEmail) {
                logger_1.logger.warn('[leads.service.createLead] Duplicata detectada por email', {
                    email: emailMasked,
                    existingLeadId: leadComMesmoEmail.id,
                });
                // BUG 23 FIX: Retornar apenas { id, name, status } para não expor PII completo
                duplicateWarning = {
                    message: 'Lead com mesmo email já existe',
                    field: 'email',
                    existingLead: { id: leadComMesmoEmail.id, name: leadComMesmoEmail.name, status: leadComMesmoEmail.status },
                };
            }
        }
        // ---------------------------------------------------------------------------
        // Criação do lead — mesmo com duplicata, prosseguir e retornar warning
        // ---------------------------------------------------------------------------
        logger_1.logger.debug('[leads.service.createLead] Criando lead no banco...', {
            duplicataEncontrada: !!duplicateWarning,
        });
        return tx.lead.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                company: data.company,
                position: data.position,
                source: data.source ?? 'manual',
                status: data.status ?? 'new',
                temperature: data.temperature ?? 'cold',
                notes: data.notes,
                tags: JSON.stringify(data.tags ?? []),
                customFields: JSON.stringify(data.customFields ?? {}),
            },
        });
    });
    logger_1.logger.info('[leads.service.createLead] Lead criado', { leadId: lead.id });
    // Criar atividade de criacao do lead
    logger_1.logger.debug('[leads.service.createLead] Criando activity lead_created...', { leadId: lead.id });
    await database_1.prisma.activity.create({
        data: {
            leadId: lead.id,
            type: 'lead_created',
            details: JSON.stringify({
                source: lead.source,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
            }),
        },
    });
    // Bug 3 Fix: Invalidar cache do dashboard apos criacao de lead
    try {
        await (0, dashboard_service_1.invalidateDashboardCache)();
        logger_1.logger.debug('[leads.service.createLead] Cache do dashboard invalidado', {
            leadId: lead.id,
        });
    }
    catch (cacheErr) {
        logger_1.logger.warn('[leads.service.createLead] Falha ao invalidar cache do dashboard', {
            leadId: lead.id,
            error: cacheErr.message,
        });
    }
    // Notificar clientes SSE sobre novo lead criado
    (0, events_controller_1.emitSSE)('lead_created', {
        leadId: lead.id,
        name: lead.name,
        status: lead.status,
        temperature: lead.temperature,
        source: lead.source,
        timestamp: new Date().toISOString(),
    });
    logger_1.logger.debug('[leads.service.createLead] Evento SSE lead_created emitido', {
        leadId: lead.id,
    });
    logger_1.logger.info('[leads.service.createLead] FIM - Sucesso', {
        leadId: lead.id,
        duplicataEncontrada: !!duplicateWarning,
    });
    return { lead, duplicateWarning };
}
async function updateLead(id, data) {
    logger_1.logger.info('[leads.service.updateLead] INÍCIO', { id, campos: Object.keys(data) });
    // Preparar dados para update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData = {};
    if (data.name !== undefined)
        updateData.name = data.name;
    if (data.email !== undefined)
        updateData.email = data.email;
    if (data.phone !== undefined)
        updateData.phone = data.phone;
    if (data.company !== undefined)
        updateData.company = data.company;
    if (data.position !== undefined)
        updateData.position = data.position;
    if (data.source !== undefined)
        updateData.source = data.source;
    if (data.status !== undefined)
        updateData.status = data.status;
    if (data.temperature !== undefined)
        updateData.temperature = data.temperature;
    if (data.notes !== undefined)
        updateData.notes = data.notes;
    if (data.tags !== undefined)
        updateData.tags = JSON.stringify(data.tags);
    if (data.customFields !== undefined)
        updateData.customFields = JSON.stringify(data.customFields);
    logger_1.logger.debug('[leads.service.updateLead] Iniciando transação atômica...', { id });
    let lead;
    try {
        lead = await database_1.prisma.$transaction(async (tx) => {
            // Buscar lead atual dentro da transação para comparar status/temperature
            logger_1.logger.debug('[leads.service.updateLead] Buscando lead atual (dentro da tx)...', { id });
            const leadAtual = await tx.lead.findUnique({ where: { id } });
            if (!leadAtual) {
                logger_1.logger.warn('[leads.service.updateLead] Lead não encontrado', { id });
                throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
            }
            logger_1.logger.debug('[leads.service.updateLead] Lead atual encontrado', {
                id,
                statusAtual: leadAtual.status,
                temperatureAtual: leadAtual.temperature,
                statusNovo: data.status,
                temperatureNovo: data.temperature,
            });
            // Detectar mudancas de status e temperature
            const statusMudou = data.status !== undefined && data.status !== leadAtual.status;
            const temperatureMudou = data.temperature !== undefined && data.temperature !== leadAtual.temperature;
            logger_1.logger.debug('[leads.service.updateLead] Atualizando lead no banco...', { id });
            const leadAtualizado = await tx.lead.update({
                where: { id },
                data: updateData,
            });
            logger_1.logger.info('[leads.service.updateLead] Lead atualizado', { id });
            // Criar atividades para mudancas relevantes — dentro da mesma transação
            if (statusMudou) {
                logger_1.logger.info('[leads.service.updateLead] Status mudou — criando activity (dentro da tx)...', {
                    id,
                    de: leadAtual.status,
                    para: data.status,
                });
                await tx.activity.create({
                    data: {
                        leadId: id,
                        type: 'status_changed',
                        details: JSON.stringify({
                            de: leadAtual.status,
                            para: data.status,
                        }),
                    },
                });
            }
            if (temperatureMudou) {
                logger_1.logger.info('[leads.service.updateLead] Temperature mudou — criando activity (dentro da tx)...', {
                    id,
                    de: leadAtual.temperature,
                    para: data.temperature,
                });
                await tx.activity.create({
                    data: {
                        leadId: id,
                        type: 'temperature_changed',
                        details: JSON.stringify({
                            de: leadAtual.temperature,
                            para: data.temperature,
                        }),
                    },
                });
            }
            return leadAtualizado;
        });
    }
    catch (error) {
        // Re-lançar AppError sem modificar (erro de negócio, ex: LEAD_NOT_FOUND)
        if (error instanceof errors_1.AppError)
            throw error;
        // Erro Prisma P2025 = registro não encontrado no update (race condition)
        const prismaError = error;
        if (prismaError.code === 'P2025') {
            logger_1.logger.warn('[leads.service.updateLead] Lead não encontrado durante update (P2025)', { id });
            throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
        }
        logger_1.logger.error('[leads.service.updateLead] Erro na transação', {
            id,
            errorMessage: error.message,
            errorStack: error.stack,
        });
        throw error;
    }
    // Bug 3 Fix: Invalidar cache do dashboard apos atualizacao de lead
    try {
        await (0, dashboard_service_1.invalidateDashboardCache)();
        logger_1.logger.debug('[leads.service.updateLead] Cache do dashboard invalidado', { id });
    }
    catch (cacheErr) {
        logger_1.logger.warn('[leads.service.updateLead] Falha ao invalidar cache do dashboard', {
            id,
            error: cacheErr.message,
        });
    }
    // Notificar clientes SSE sobre lead atualizado
    const leadAtualizado = lead;
    (0, events_controller_1.emitSSE)('lead_updated', {
        leadId: leadAtualizado?.id ?? id,
        status: leadAtualizado?.status,
        temperature: leadAtualizado?.temperature,
        camposAlterados: Object.keys(data),
        timestamp: new Date().toISOString(),
    });
    logger_1.logger.debug('[leads.service.updateLead] Evento SSE lead_updated emitido', { id });
    logger_1.logger.info('[leads.service.updateLead] FIM - Sucesso', { id });
    return lead;
}
// ---------------------------------------------------------------------------
// deleteLead
// ---------------------------------------------------------------------------
async function deleteLead(id) {
    logger_1.logger.info('[leads.service.deleteLead] INÍCIO', { id });
    const lead = await database_1.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
        logger_1.logger.warn('[leads.service.deleteLead] Lead não encontrado', { id });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    logger_1.logger.debug('[leads.service.deleteLead] Deletando lead (cascade)...', { id });
    await database_1.prisma.lead.delete({ where: { id } });
    // Bug 3 Fix: Invalidar cache do dashboard apos delecao de lead
    try {
        await (0, dashboard_service_1.invalidateDashboardCache)();
        logger_1.logger.debug('[leads.service.deleteLead] Cache do dashboard invalidado', { id });
    }
    catch (cacheErr) {
        logger_1.logger.warn('[leads.service.deleteLead] Falha ao invalidar cache do dashboard', {
            id,
            error: cacheErr.message,
        });
    }
    logger_1.logger.info('[leads.service.deleteLead] FIM - Lead deletado', { id, name: lead.name });
}
// ---------------------------------------------------------------------------
// importLeadsCSV
// ---------------------------------------------------------------------------
const MAX_ROWS = 5000;
const BATCH_SIZE = 500;
async function importLeadsCSV(fileBuffer) {
    logger_1.logger.info('[leads.service.importLeadsCSV] INÍCIO', {
        bufferSize: fileBuffer.length,
    });
    // Converter buffer em stream legivel
    const stream = stream_1.Readable.from(fileBuffer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await new Promise((resolve, reject) => {
        const rows = [];
        const parser = (0, csv_parse_1.parse)({
            columns: true, // primeira linha como cabecalho
            skip_empty_lines: true,
            trim: true,
            bom: true, // remover BOM UTF-8
        });
        parser.on('readable', () => {
            let record;
            while ((record = parser.read()) !== null) {
                rows.push(record);
            }
        });
        parser.on('error', reject);
        parser.on('end', () => resolve(rows));
        stream.pipe(parser);
    });
    logger_1.logger.info('[leads.service.importLeadsCSV] CSV parseado', { totalLinhas: records.length });
    // Verificar limite de linhas
    if (records.length > MAX_ROWS) {
        logger_1.logger.warn('[leads.service.importLeadsCSV] CSV excede limite de linhas', {
            total: records.length,
            limite: MAX_ROWS,
        });
        throw new errors_1.AppError(400, `CSV excede limite de ${MAX_ROWS} linhas`, 'CSV_TOO_LARGE');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validRows = [];
    const errors = [];
    // Fase 1: validar todas as linhas e montar objetos para insercao
    logger_1.logger.debug('[leads.service.importLeadsCSV] Fase 1 — validando todas as linhas...', {
        total: records.length,
    });
    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 porque linha 1 é o cabeçalho
        logger_1.logger.debug('[leads.service.importLeadsCSV] Validando linha', { rowNum, row });
        // Validacao minima: name é obrigatorio
        const name = row.name ?? row.nome ?? row.Name ?? row.Nome;
        if (!name || String(name).trim() === '') {
            logger_1.logger.warn('[leads.service.importLeadsCSV] Linha sem nome — ignorada', { rowNum, row });
            errors.push({ row: rowNum, error: 'Campo "name" (ou "nome") é obrigatório' });
            continue;
        }
        try {
            const tags = row.tags
                ? String(row.tags).split(';').map((t) => t.trim()).filter(Boolean)
                : [];
            validRows.push({
                name: String(name).trim(),
                email: row.email ?? row.Email ?? undefined,
                phone: row.phone ?? row.telefone ?? row.Phone ?? undefined,
                company: row.company ?? row.empresa ?? row.Company ?? undefined,
                position: row.position ?? row.cargo ?? row.Position ?? undefined,
                source: row.source ?? 'csv_import',
                status: row.status ?? 'new',
                temperature: row.temperature ?? row.temperatura ?? 'cold',
                notes: row.notes ?? row.observacoes ?? undefined,
                tags: JSON.stringify(tags),
                customFields: '{}',
            });
        }
        catch (err) {
            const error = err;
            logger_1.logger.error('[leads.service.importLeadsCSV] Erro ao preparar linha', {
                rowNum,
                errorMessage: error.message,
                row,
            });
            errors.push({ row: rowNum, error: error.message });
        }
    }
    logger_1.logger.info('[leads.service.importLeadsCSV] Fase 1 concluída', {
        validas: validRows.length,
        invalidas: errors.length,
    });
    // Fase 2: inserir em batches de BATCH_SIZE usando createMany
    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);
    logger_1.logger.debug('[leads.service.importLeadsCSV] Fase 2 — inserindo em batches...', {
        batchSize: BATCH_SIZE,
        totalBatches,
    });
    let imported = 0;
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        logger_1.logger.debug('[leads.service.importLeadsCSV] Inserindo batch', {
            batchNum,
            totalBatches,
            batchSize: batch.length,
            offset: i,
        });
        try {
            // SQLite nao suporta skipDuplicates — erros de constraint sao capturados no catch
            const resultado = await database_1.prisma.lead.createMany({
                data: batch,
            });
            imported += resultado.count;
            logger_1.logger.debug('[leads.service.importLeadsCSV] Batch inserido com sucesso', {
                batchNum,
                inseridos: resultado.count,
                totalAcumulado: imported,
            });
        }
        catch (err) {
            const error = err;
            logger_1.logger.error('[leads.service.importLeadsCSV] Erro ao inserir batch', {
                batchNum,
                batchSize: batch.length,
                errorMessage: error.message,
            });
            // Registrar todas as linhas do batch falho como erro
            for (let j = 0; j < batch.length; j++) {
                errors.push({
                    row: i + j + 2,
                    error: `Erro no batch ${batchNum}: ${error.message}`,
                });
            }
        }
    }
    logger_1.logger.info('[leads.service.importLeadsCSV] Fase 2 concluída', {
        imported,
        batchesProcessados: totalBatches,
    });
    // Invalidar cache do dashboard apos importacao bem-sucedida
    logger_1.logger.debug('[leads.service.importLeadsCSV] Invalidando cache do dashboard...');
    await (0, dashboard_service_1.invalidateDashboardCache)();
    logger_1.logger.info('[leads.service.importLeadsCSV] FIM', {
        imported,
        errors: errors.length,
    });
    return { imported, errors };
}
/**
 * Verifica uma lista de números via Evolution API.
 * Retorna para cada número se tem WhatsApp ativo.
 */
async function checkWhatsappNumbers(numbers) {
    logger_1.logger.info('[leads.service.checkWhatsappNumbers] INÍCIO', { quantidade: numbers.length });
    const whatsapp = (0, whatsapp_service_1.getWhatsAppService)();
    // Normalizar todos para E.164
    const normalized = numbers.map((n) => {
        const digits = n.replace(/\D/g, '');
        return digits.startsWith('55') ? digits : `55${digits}`;
    });
    const results = await whatsapp.checkNumbers(normalized);
    // Mapear resultado por número normalizado
    const existsMap = new Map();
    for (const r of results) {
        const num = r.jid ? r.jid.split('@')[0] : r.number;
        existsMap.set(num, r.exists ?? false);
    }
    const output = numbers.map((original, i) => ({
        number: original,
        normalized: normalized[i],
        exists: existsMap.get(normalized[i]) ?? false,
    }));
    logger_1.logger.info('[leads.service.checkWhatsappNumbers] FIM', {
        verificados: output.length,
        comWhatsApp: output.filter((r) => r.exists).length,
    });
    return output;
}
/**
 * Verifica todos os leads via Evolution API e deleta (ou lista) os que não possuem WhatsApp ativo.
 * @param dryRun - Se true, apenas lista sem deletar.
 */
async function bulkWhatsappCleanup(dryRun = false) {
    logger_1.logger.info('[leads.service.bulkWhatsappCleanup] INÍCIO', { dryRun });
    const whatsapp = (0, whatsapp_service_1.getWhatsAppService)();
    // 1. Buscar todos os leads com telefone, em páginas de 500
    const PAGE_SIZE = 500;
    let page = 0;
    const leadsComPhone = [];
    const leadsWithoutPhone = [];
    let total = 0;
    while (true) {
        const batch = await database_1.prisma.lead.findMany({
            select: { id: true, phone: true },
            skip: page * PAGE_SIZE,
            take: PAGE_SIZE,
            orderBy: { createdAt: 'asc' },
        });
        if (batch.length === 0)
            break;
        if (page === 0) {
            total = await database_1.prisma.lead.count();
        }
        for (const lead of batch) {
            if (lead.phone && lead.phone.trim() !== '') {
                // Normalizar para E.164 — remover tudo que não for dígito, adicionar 55 se não tiver
                const digits = lead.phone.replace(/\D/g, '');
                const normalized = digits.startsWith('55') ? digits : `55${digits}`;
                leadsComPhone.push({ id: lead.id, phone: normalized });
            }
            else {
                leadsWithoutPhone.push({ id: lead.id });
            }
        }
        page++;
        if (batch.length < PAGE_SIZE)
            break;
    }
    logger_1.logger.info('[leads.service.bulkWhatsappCleanup] Leads carregados', {
        total,
        comPhone: leadsComPhone.length,
        semPhone: leadsWithoutPhone.length,
    });
    // 2. Verificar números na Evolution API em batches de 50
    const BATCH_SIZE = 50;
    const semWhatsApp = [];
    for (let i = 0; i < leadsComPhone.length; i += BATCH_SIZE) {
        const batchLeads = leadsComPhone.slice(i, i + BATCH_SIZE);
        const numbers = batchLeads.map((l) => l.phone);
        logger_1.logger.debug('[leads.service.bulkWhatsappCleanup] Verificando batch', {
            batch: Math.floor(i / BATCH_SIZE) + 1,
            total: Math.ceil(leadsComPhone.length / BATCH_SIZE),
            size: numbers.length,
        });
        try {
            const results = await whatsapp.checkNumbers(numbers);
            // Mapear resultado por número normalizado
            const resultMap = new Map();
            for (const r of results) {
                // Evolution API retorna jid como "5511999999999@s.whatsapp.net"
                const num = r.jid ? r.jid.split('@')[0] : r.number;
                resultMap.set(num, r.exists ?? false);
            }
            for (const lead of batchLeads) {
                const exists = resultMap.get(lead.phone) ?? false;
                if (!exists) {
                    semWhatsApp.push(lead.id);
                }
            }
        }
        catch (err) {
            logger_1.logger.error('[leads.service.bulkWhatsappCleanup] Erro ao verificar batch', {
                batchIndex: i,
                error: err.message,
            });
            // Em caso de erro da Evolution API, manter o batch (não deletar)
        }
    }
    const toDelete = [...semWhatsApp, ...leadsWithoutPhone.map((l) => l.id)];
    logger_1.logger.info('[leads.service.bulkWhatsappCleanup] Verificação concluída', {
        verificados: leadsComPhone.length,
        semWhatsApp: semWhatsApp.length,
        semTelefone: leadsWithoutPhone.length,
        totalParaDeletar: toDelete.length,
        dryRun,
    });
    // 3. Deletar (ou apenas reportar se dryRun)
    let deleted = 0;
    if (!dryRun && toDelete.length > 0) {
        const BATCH_DELETE = 200;
        for (let i = 0; i < toDelete.length; i += BATCH_DELETE) {
            const ids = toDelete.slice(i, i + BATCH_DELETE);
            const result = await database_1.prisma.lead.deleteMany({ where: { id: { in: ids } } });
            deleted += result.count;
            logger_1.logger.debug('[leads.service.bulkWhatsappCleanup] Batch deletado', {
                deletados: result.count,
                acumulado: deleted,
            });
        }
        await (0, dashboard_service_1.invalidateDashboardCache)();
        (0, events_controller_1.emitSSE)('leads_bulk_deleted', {
            count: deleted,
            timestamp: new Date().toISOString(),
        });
    }
    logger_1.logger.info('[leads.service.bulkWhatsappCleanup] FIM', {
        total,
        checked: leadsComPhone.length,
        verified: leadsComPhone.length - semWhatsApp.length,
        deleted,
        dryRun,
    });
    return {
        total,
        withoutPhone: leadsWithoutPhone.length,
        checked: leadsComPhone.length,
        verified: leadsComPhone.length - semWhatsApp.length,
        deleted: dryRun ? toDelete.length : deleted,
        dryRun,
    };
}
// ---------------------------------------------------------------------------
// addNote
// ---------------------------------------------------------------------------
async function addNote(leadId, content) {
    logger_1.logger.info('[leads.service.addNote] INÍCIO', {
        leadId,
        contentPreview: content.substring(0, 80),
    });
    // Verificar se o lead existe
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        logger_1.logger.warn('[leads.service.addNote] Lead não encontrado', { leadId });
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    logger_1.logger.debug('[leads.service.addNote] Criando activity note_added...', { leadId });
    const activity = await database_1.prisma.activity.create({
        data: {
            leadId,
            type: 'note_added',
            details: JSON.stringify({ content }),
        },
    });
    logger_1.logger.info('[leads.service.addNote] FIM - Nota adicionada', {
        leadId,
        activityId: activity.id,
    });
    return activity;
}
// ---------------------------------------------------------------------------
// getLeadMessages (para rota GET /:id/messages)
// ---------------------------------------------------------------------------
async function getLeadMessages(leadId, params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[leads.service.getLeadMessages] INÍCIO', { leadId, page, limit });
    // Verificar se o lead existe
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    const total = await database_1.prisma.message.count({ where: { leadId } });
    const data = await database_1.prisma.message.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[leads.service.getLeadMessages] FIM', {
        leadId,
        total,
        retornados: data.length,
    });
    return { data, pagination: { page, limit, total, totalPages } };
}
// ---------------------------------------------------------------------------
// getLeadActivities (para rota GET /:id/activities)
// ---------------------------------------------------------------------------
async function getLeadActivities(leadId, params) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    logger_1.logger.info('[leads.service.getLeadActivities] INÍCIO', { leadId, page, limit });
    const lead = await database_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        throw new errors_1.AppError(404, 'Lead não encontrado', 'LEAD_NOT_FOUND');
    }
    const total = await database_1.prisma.activity.count({ where: { leadId } });
    const data = await database_1.prisma.activity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });
    const totalPages = Math.ceil(total / limit);
    logger_1.logger.info('[leads.service.getLeadActivities] FIM', {
        leadId,
        total,
        retornados: data.length,
    });
    return { data, pagination: { page, limit, total, totalPages } };
}
//# sourceMappingURL=leads.service.js.map