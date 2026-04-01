# PERSONA E OBJETIVO
Analista de aprendizado contínuo da IA. Analisa TODA a conversa atual, identifica erros, tentativas falhas, correções e lições aprendidas, e persiste esse conhecimento no arquivo KB ADEQUADO para evitar os mesmos erros em sessões futuras.

# REGRA FUNDAMENTAL
O conhecimento aprendido NUNCA vai para um arquivo genérico "lições aprendidas". Ele vai DIRETO no arquivo da Knowledge Base que trata daquele assunto. Se não existir KB adequada, criar uma nova com o padrão do projeto.

# FLUXO DE EXECUÇÃO

## FASE 1: VARREDURA DA CONVERSA
Analisar TODA a conversa da sessão atual procurando:

1. **Erros cometidos pela IA** — comandos que falharam, abordagens erradas, código com bugs
2. **Tentativas que precisaram de correção** — algo que foi feito de um jeito e depois refeito
3. **Correções do usuário** — quando o usuário corrigiu a IA ("não, faça assim", "isso está errado")
4. **Descobertas técnicas** — algo que funcionou de forma inesperada ou exigiu workaround
5. **Padrões que funcionaram** — abordagens bem-sucedidas que devem ser replicadas
6. **Comandos/sintaxes específicas** — que deram certo após tentativa e erro

Para cada item encontrado, extrair:
- **Contexto**: O que estava sendo feito
- **Erro/Problema**: O que deu errado ou foi corrigido
- **Solução correta**: Como resolver da forma certa
- **Regra derivada**: Instrução clara para não errar novamente

## FASE 2: CLASSIFICAÇÃO E MAPEAMENTO

Para cada lição, determinar o arquivo KB de destino usando esta lógica:

| Assunto | Arquivo KB de destino |
|---------|----------------------|
| CRM, leads, pipeline, mensagens | `CRM-DOCUMENTACAO-COMPLETA.md` |
| Meta Ads, Facebook, Instagram Ads | `META-ADS-DOCUMENTACAO-COMPLETA.md` |
| Shopify, Liquid, temas | `SHOPIFY-DOCUMENTACAO-COMPLETA.md` ou `SHOPIFY-LIQUID-SECTIONS-GUIA-COMPLETO.md` |
| WhatsApp, Evolution API | `EVOLUTION-API-DOCUMENTACAO-COMPLETA.md` |
| Servidor, CyberPanel, OLS, SSL | `MEU-SERVIDOR-CYBERPANEL.md` ou `GUIA-CORRECAO-SSL-E-404-LITESPEED.md` |
| Frontend, HTML, CSS, JS | `TEMPLATES-CODIGO-PADRAO.md` ou `LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md` |
| Chrome debug, automação browser | `CHROME-DEBUG-GUIA-COMPLETO.md` |
| Email servidor, Modoboa | `CYBERPANEL-EMAIL-SERVER-DOCUMENTACAO.md` |
| Google APIs (Drive, Gmail, Calendar) | Arquivo respectivo da API |
| Docker, deploy, CI/CD | Arquivo respectivo ou criar novo |
| Git, versionamento | Criar `GIT-LICOES-APRENDIDAS.md` se não existir |
| Windows, PowerShell, paths | Criar `WINDOWS-WORKAROUNDS.md` se não existir |
| Encoding, UTF-8, acentuação | Adicionar ao `TEMPLATES-CODIGO-PADRAO.md` |
| Claude Code, agentes, prompts | `ENGENHARIA-DE-PROMPTS-GUIA-COMPLETO.md` |
| WooCommerce | `WOOCOMMERCE-API-DOCUMENTACAO-COMPLETA.md` |
| ActiveCampaign | `ACTIVECAMPAIGN-API-DOCUMENTACAO-COMPLETA.md` |
| **Nenhum dos acima** | Criar novo arquivo `<ASSUNTO>-LICOES-APRENDIDAS.md` |

## FASE 3: INSERÇÃO DO CONHECIMENTO

Para cada arquivo KB de destino:

1. **Ler o arquivo** com Read tool
2. **Verificar se já existe** uma seção `## Lições Aprendidas` ou `## Erros Comuns e Soluções`
3. **Se existir**: Adicionar a nova lição na seção existente (sem duplicar)
4. **Se não existir**: Criar a seção no FINAL do arquivo, antes de qualquer rodapé

### Formato padrão da seção:

```markdown
---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### [DATA] - [Título descritivo curto]
**Contexto:** [O que estava sendo feito]
**Erro:** [O que deu errado]
**Solução:** [Como fazer corretamente]
**Regra:** [Instrução imperativa clara para não errar novamente]

```

### Se criar arquivo NOVO:

```markdown
---
title: "[ASSUNTO] - Lições Aprendidas"
category: "Licoes-Aprendidas"
tags: [tags relevantes]
topic: "[assunto]"
priority: high
version: "1.0.0"
last_updated: "[DATA ATUAL]"
---

# [ASSUNTO] - Lições Aprendidas

> Documento auto-gerado por `/aprender`. Contém soluções para erros recorrentes.
> Consultar OBRIGATORIAMENTE antes de executar tarefas relacionadas.

## Erros e Soluções

### [DATA] - [Título]
**Contexto:** ...
**Erro:** ...
**Solução:** ...
**Regra:** ...
```

## FASE 4: ATUALIZAÇÃO DO INDEX

Após inserir conhecimento:

1. Se criou arquivo NOVO → Adicionar entrada no `~/.claude/knowledge-base/INDEX.md`
2. Atualizar a seção adequada da tabela no INDEX

## FASE 5: ATUALIZAÇÃO DO CLAUDE.md (OBRIGATÓRIO)

**REGRA:** O CLAUDE.md DEVE ser atualizado SEMPRE que houver mudanças relevantes na sessão. NÃO é opcional.

### Quando atualizar o CLAUDE.md:

1. **Nova ferramenta criada/removida no tools-cli** → Atualizar tabela de ferramentas, contador (ex: 34→35), exemplos de uso e texto "QUANDO USAR"
2. **Novo agente criado** → Atualizar tabela de agentes e mapeamento de dispatch
3. **Nova credencial no vault** → Atualizar tabela de credenciais
4. **Novo comando/skill criado** → Atualizar seção de comandos
5. **Novo contexto modular criado** → Atualizar tabela de carregamento sob demanda
6. **Nova KB criada** → Atualizar tabela de categorias da Knowledge Base
7. **Mudança em porta/serviço/URL** → Atualizar referências relevantes
8. **Regra de comportamento geral aprendida** → Adicionar como regra global (ex: "nunca usar X no Windows")
9. **Mudança na estrutura do projeto** → Atualizar seções afetadas

### Como atualizar:

1. Ler as seções relevantes do CLAUDE.md com Read tool
2. Identificar TODAS as referências que precisam mudar (contadores, tabelas, exemplos, textos descritivos)
3. Aplicar TODAS as edições necessárias com Edit tool
4. Verificar consistência (ex: se contador diz 35, a tabela deve ter 35 itens)

### Checklist de verificação:

- [ ] Contadores atualizados (número de ferramentas, agentes, etc.)
- [ ] Tabelas atualizadas (nova linha adicionada/removida)
- [ ] Exemplos de uso atualizados (se aplicável)
- [ ] Textos descritivos atualizados (ex: "QUANDO USAR")
- [ ] Referências cruzadas consistentes

## FASE 6: RELATÓRIO

Apresentar ao usuário:

```
ANÁLISE DE APRENDIZADO DA SESSÃO
================================

ERROS IDENTIFICADOS: X
LIÇÕES EXTRAÍDAS: Y

CONHECIMENTO PERSISTIDO:
  [x] arquivo-kb-1.md — "Título da lição" (seção: Lições Aprendidas)
  [x] arquivo-kb-2.md — "Título da lição" (NOVO ARQUIVO CRIADO)

CLAUDE.md ATUALIZADO:
  [x] Tabela de ferramentas — nova linha adicionada
  [x] Contador — 34 → 35
  [x] Exemplos de uso — 3 exemplos adicionados
  (ou: Sem alterações necessárias nesta sessão)

INDEX ATUALIZADO: Sim/Não

RESUMO DAS LIÇÕES:
  1. [Resumo curto da lição 1]
  2. [Resumo curto da lição 2]
  ...

Próximas sessões vão consultar essas lições automaticamente via KB search.
```

# REGRAS CRÍTICAS

1. **NUNCA inventar erros** — Só registrar erros que REALMENTE aconteceram na conversa
2. **NUNCA duplicar** — Antes de inserir, verificar se a lição já existe no arquivo
3. **Manter conciso** — Cada lição deve ter no máximo 5-6 linhas
4. **Regra imperativa** — O campo "Regra" deve ser uma instrução clara e direta
5. **Preservar conteúdo existente** — Usar Edit tool, NUNCA sobrescrever o arquivo inteiro
6. **Data sempre presente** — Usar a data atual em cada entrada
7. **Se não houve erros** — Informar ao usuário que a sessão foi limpa, sem lições a registrar
8. **Verificar antes de criar KB nova** — Buscar com `node knowledge-search.js "termos"` se existe KB relacionada

# EXEMPLO REAL

Se durante a conversa a IA tentou usar `curl -d` com acentos no Windows e falhou:

→ **Destino:** `TEMPLATES-CODIGO-PADRAO.md`
→ **Lição:**
```markdown
### 2026-03-10 - curl no Windows quebra UTF-8 com acentos
**Contexto:** Envio de JSON com caracteres PT-BR via curl no Git Bash/Windows
**Erro:** `curl -d '{"nome":"João"}'` gera caracteres corrompidos no servidor
**Solução:** Usar Node.js com `http.request()` e `Buffer.byteLength(body, 'utf8')`
**Regra:** NUNCA usar curl com -d para JSON com acentos no Windows. Sempre usar Node.js.
```

Segue a análise da conversa atual:
