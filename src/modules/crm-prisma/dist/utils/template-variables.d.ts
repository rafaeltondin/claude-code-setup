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
/**
 * Substitui todas as variáveis {{chave}} no template pelos valores do lead
 * e, opcionalmente, pelas configurações do agente.
 *
 * @param template  - String de template com placeholders {{variavel}}
 * @param lead      - Objeto do lead com campos name, email, phone, company, position
 * @param settings  - Mapa chave→valor das configurações do agente (opcional)
 * @returns String com todos os placeholders substituídos
 */
export declare function substituirVariaveis(template: string, lead: any, settings?: Record<string, string>): Promise<string>;
//# sourceMappingURL=template-variables.d.ts.map