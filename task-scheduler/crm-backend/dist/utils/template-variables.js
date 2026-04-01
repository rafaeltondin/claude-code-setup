"use strict";
/**
 * Utilitário unificado de substituição de variáveis em templates.
 *
 * Substitui placeholders no formato {{variavel}} pelos valores reais do lead
 * e, opcionalmente, pelas configurações do agente (settings).
 *
 * Variáveis do lead: {{name}}/{{nome}}, {{company}}/{{empresa}},
 *   {{position}}/{{cargo}}, {{email}}, {{phone}}/{{telefone}}
 *
 * Variáveis do agente (requerem settings): {{agentName}}, {{agentCompany}},
 *   {{agentSignature}}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.substituirVariaveis = substituirVariaveis;
// ---------------------------------------------------------------------------
// substituirVariaveis
// ---------------------------------------------------------------------------
/**
 * Substitui todas as variáveis {{chave}} no template pelos valores do lead
 * e, opcionalmente, pelas configurações do agente.
 *
 * @param template  - String de template com placeholders {{variavel}}
 * @param lead      - Objeto do lead com campos name, email, phone, company, position
 * @param settings  - Mapa chave→valor das configurações do agente (opcional)
 * @returns String com todos os placeholders substituídos
 */
async function substituirVariaveis(template, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lead, settings) {
    let result = template;
    // Variáveis do lead (suporte a variantes em PT-BR e EN)
    const vars = {
        name: lead.name ?? '',
        nome: lead.name ?? '',
        company: lead.company ?? '',
        empresa: lead.company ?? '',
        position: lead.position ?? '',
        cargo: lead.position ?? '',
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        telefone: lead.phone ?? '',
    };
    // Variáveis dinâmicas do customFields (JSON) — suporta qualquer chave extra
    if (lead.customFields) {
        try {
            const cf = typeof lead.customFields === 'string'
                ? JSON.parse(lead.customFields)
                : lead.customFields;
            for (const [k, v] of Object.entries(cf)) {
                if (typeof v === 'string')
                    vars[k] = v;
            }
        }
        catch { /* customFields inválido — ignorar */ }
    }
    // Variáveis do agente (vindas das settings do CRM)
    if (settings) {
        vars.agentName = settings['agent_name'] ?? settings['agentName'] ?? '';
        vars.agentCompany = settings['agent_company'] ?? settings['agentCompany'] ?? '';
        vars.agentSignature = settings['agent_signature'] ?? settings['agentSignature'] ?? '';
    }
    // Substituir cada variável usando regex case-insensitive
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
    }
    // Limpar variáveis não substituídas ({{qualquer_coisa}}) para evitar texto quebrado
    result = result.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');
    // Limpar espaços duplos e linhas vazias resultantes da remoção
    result = result.replace(/  +/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return result;
}
//# sourceMappingURL=template-variables.js.map