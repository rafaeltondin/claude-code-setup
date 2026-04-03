---
title: "Guia de Uso da Knowledge Base"
category: "Documentacao"
tags:
  - knowledge-base
  - documentação
  - markdown
  - claude-code
  - credential vault
  - credenciais
  - secret
  - seguranca
topic: "Knowledge Base"
priority: high
version: "3.0.0"
last_updated: "2026-02-14"
---

# Guia de Uso da Knowledge Base

## O que é a Knowledge Base?

A Knowledge Base (KB) é uma pasta especial onde você pode armazenar documentos Markdown que servem como **fonte primária de conhecimento** para o Claude Code.

Quando você faz uma pergunta ao Claude Code, ele **PRIMEIRO** consulta esta base de conhecimento antes de usar seu conhecimento geral. Isso garante que as respostas sejam baseadas nas informações específicas do seu projeto.

## Localizacao

A Knowledge Base esta localizada em:

```
C:\Users\sabola\.claude\knowledge-base\
```

## Como Criar Documentos

### Estrutura Básica

Cada documento deve ser um arquivo `.md` (Markdown) com a seguinte estrutura:

```markdown
---
title: "Título do Documento"
category: "Categoria"
tags: [tag1, tag2, tag3]
topic: "Tópico Principal"
---

# Título do Documento

Conteúdo aqui...
```

### Frontmatter (Opcional mas Recomendado)

O frontmatter YAML no início do arquivo ajuda na busca e organização:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `title` | Título do documento | "Guia de Deploy" |
| `category` | Categoria do documento | "DevOps" |
| `tags` | Lista de tags para busca | [docker, kubernetes, deploy] |
| `topic` | Tópico principal | "Infraestrutura" |
| `priority` | Prioridade (high, medium, low) | high |
| `last_updated` | Data da última atualização | "2025-01-01" |

## Organização Recomendada

Organize seus documentos em subpastas por categoria:

```
knowledge-base/
├── apis/
│   ├── api-rest-padrao.md
│   └── graphql-guia.md
├── arquitetura/
│   ├── decisoes-arquiteturais.md
│   └── padrao-microservices.md
├── configuracao/
│   ├── ambiente-desenvolvimento.md
│   └── variaveis-ambiente.md
├── processos/
│   ├── code-review.md
│   └── deploy-producao.md
└── tecnologias/
    ├── react-patterns.md
    └── nodejs-best-practices.md
```

## Como Acessar a KB (3 Metodos)

### Metodo 1: Acesso Direto por Arquivo (MAIS RAPIDO!)

Quando voce ja sabe qual documento precisa, **leia diretamente** sem executar busca:

```bash
Read "C:\Users\sabola\.claude\knowledge-base\NOME-DO-DOCUMENTO.md"
```

**Use acesso direto quando:**
- O tema esta claramente coberto por um documento especifico (ver catalogo abaixo)
- Voce precisa de credenciais de uma plataforma especifica
- Voce ja consultou o documento antes na mesma sessao

**Vantagem:** Sem overhead de indexacao, busca e scoring. Vai direto ao conteudo.

### Metodo 2: Busca por Palavras-chave

```bash
node "C:\Users\sabola\.claude\knowledge-base\knowledge-search.js" "palavras-chave"
```

**Use busca quando:**
- Nao sabe exatamente qual documento contem a informacao
- O tema pode estar espalhado em varios documentos
- Precisa descobrir se existe documentacao sobre algo

**Dicas para buscas eficientes:**

| Estrategia | Exemplo BOM | Exemplo RUIM |
|------------|-------------|--------------|
| Termos especificos | `"shopify credenciais fiber"` | `"como acessar loja"` |
| Nomes de plataformas | `"evolution api cenora"` | `"whatsapp mensagem"` |
| Tema + contexto | `"ssl litespeed cyberpanel"` | `"erro ssl"` |
| Nomes de marcas/lojas | `"pinha shopify token"` | `"credenciais loja"` |

**Filtro por categoria** (reduz ruido nos resultados):
```bash
node "C:\Users\sabola\.claude\knowledge-base\knowledge-search.js" "query" --category=Shopify
```

Categorias: `Infraestrutura`, `Marketing`, `Desenvolvimento`, `Shopify`, `AI`, `Documentacao`, `Automacao`, `credenciais`

### Metodo 3: Busca Multi-pass (temas complexos)

Quando a primeira busca nao retorna tudo que precisa, faca buscas complementares:

```
PASS 1: Busca especifica  → "fiber meta ads credenciais"
PASS 2: Busca tecnica     → "facebook api endpoints campanhas"
PASS 3: Busca por tema    → "marketing digital estrategia"
```

---

## Catalogo Completo de Documentos (24 docs)

### Credenciais e APIs (5 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Shopify da Fiber | `FIBER-SHOPIFY-API-CREDENCIAIS.md` |
| Shopify da Pinha Originals | `PINHA-SHOPIFY-API-CREDENCIAIS.md` |
| Shopify da FACT | `FACT-SHOPIFY-API-CREDENCIAIS.md` |
| Meta Ads / Facebook Ads da Fiber | `FIBER-META-ADS-CREDENCIAIS.md` |
| WhatsApp, Evolution API, cenora | `MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md` |

### Documentacao Tecnica (5 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Shopify Admin/Storefront API | `SHOPIFY-DOCUMENTACAO-COMPLETA.md` |
| Liquid, sections, temas Shopify | `SHOPIFY-LIQUID-SECTIONS-GUIA-COMPLETO.md` |
| Meta Ads API, campanhas, metricas | `META-ADS-DOCUMENTACAO-COMPLETA.md` |
| Evolution API endpoints, webhooks | `EVOLUTION-API-DOCUMENTACAO-COMPLETA.md` |
| OpenRouter, modelos de IA | `OPENROUTER-DOCUMENTACAO-COMPLETA.md` |

### Infraestrutura e Servidor (3 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Servidor CyberPanel, VPS, SSH | `MEU-SERVIDOR-CYBERPANEL.md` |
| SSL, HTTPS, erro 404 LiteSpeed | `GUIA-CORRECAO-SSL-E-404-LITESPEED.md` |
| Email, Modoboa, SMTP | `SERVIDOR-EMAIL-MODOBOA-DOCUMENTACAO.md` |

### Marketing e Marca (3 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Criativos, anuncios Fiber | `GUIA-PLANEJAMENTO-CRIATIVOS-FIBER.md` |
| Plano de marketing digital | `MARKETING-DIGITAL-PLANO-GUIA-COMPLETO.md` |
| Identidade visual, cores, fontes Fiber | `FIBER-IDENTIDADE-VISUAL-DOCUMENTACAO.md` |

### Desenvolvimento e Ferramentas (4 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Frontend Analyzer (documentacao) | `FRONTEND-ANALYZER-DOCUMENTACAO-COMPLETA.md` |
| Frontend Analyzer (guia agentes) | `FRONTEND-ANALYZER-GUIA-PARA-AGENTES.md` |
| Landing pages | `LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md` |
| Multi-projeto | `SISTEMA-MULTI-PROJETO.md` |

### IA e Prompts (2 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Engenharia de prompts | `ENGENHARIA-DE-PROMPTS-GUIA-COMPLETO.md` |
| OpenRouter, LLMs | `OPENROUTER-DOCUMENTACAO-COMPLETA.md` |

### Sistema/Meta (2 docs)
| Quando precisa de... | Documento |
|---------------------|-----------|
| Este guia (como usar a KB) | `GUIA-KNOWLEDGE-BASE.md` |
| Criar novos documentos | `GUIA-CRIACAO-DOCUMENTACAO.md` |

## Exemplos de Documentos

### Documento de API

```markdown
---
title: "API de Autenticação"
category: "APIs"
tags: [auth, jwt, login, api]
---

# API de Autenticação

## Endpoints

### POST /auth/login
Autentica um usuário.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "senha123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGc...",
  "expiresIn": 3600
}
\`\`\`
```

### Documento de Configuração

```markdown
---
title: "Variáveis de Ambiente"
category: "Configuração"
tags: [env, configuração, ambiente]
---

# Variáveis de Ambiente

## Desenvolvimento

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `NODE_ENV` | Ambiente | development |
| `PORT` | Porta do servidor | 3000 |
| `DATABASE_URL` | URL do banco | localhost:5432 |
```

## Credenciais e o Credential Vault

### O Problema

Documentos da KB frequentemente contem credenciais (tokens de API, senhas, IPs de servidores). Quando o Claude Code le esses arquivos, os valores entram no context window, criando risco de vazamento acidental.

### A Solucao: `{{secret:NAME}}`

Em vez de colocar credenciais em texto puro nos documentos, use **referencias seguras**:

```
{{secret:NOME_DA_CREDENCIAL}}
```

O Credential Vault armazena os valores reais de forma encriptada (AES-256-GCM). Quando o executor processa um prompt, ele substitui as referencias pelos valores reais sem que o LLM veja o conteudo.

### Como Funciona

1. **No documento KB**, voce escreve: `{{secret:FB_ACCESS_TOKEN}}`
2. **O LLM le** apenas o alias, nunca o valor real
3. **O executor** resolve a referencia antes de executar comandos
4. **O valor real** e injetado como variavel de ambiente no processo filho

### Exemplos de Uso em Documentos

**Tabela de credenciais:**
```markdown
| Campo | Valor |
|-------|-------|
| **Access Token** | `{{secret:SHOPIFY_ACCESS_TOKEN}}` |
| **API Key** | `{{secret:EVOLUTION_API_KEY}}` |
```

**Bloco .env:**
```markdown
SHOPIFY_ACCESS_TOKEN={{secret:SHOPIFY_ACCESS_TOKEN}}
FB_APP_ID={{secret:FB_APP_ID}}
```

**Exemplos de curl:**
```markdown
curl -H "X-Shopify-Access-Token: {{secret:SHOPIFY_ACCESS_TOKEN}}" \
  https://loja.myshopify.com/admin/api/2024-10/products.json
```

**Exemplos de codigo:**
```markdown
const ACCESS_TOKEN = '{{secret:SHOPIFY_ACCESS_TOKEN}}';
```

### Credenciais Disponiveis

As credenciais sao gerenciadas pelo dashboard em `http://localhost:3847` na aba **Credenciais**. La voce pode:

- Ver todas as credenciais cadastradas (valores mascarados)
- Criar novas credenciais manualmente
- Importar credenciais da KB automaticamente
- Revelar um valor temporariamente (5 segundos)
- Editar ou excluir credenciais existentes

### Categorias de Credenciais

| Categoria | Exemplos |
|-----------|----------|
| `meta-ads` | FB_ACCESS_TOKEN, FB_APP_ID, FB_APP_SECRET, FB_AD_ACCOUNT_ID |
| `shopify` | SHOPIFY_ACCESS_TOKEN |
| `evolution-api` | EVOLUTION_API_KEY, EVOLUTION_INSTANCE_TOKEN |
| `server` | SERVER_IP, VNC_PASSWORD |
| `database` | DB_PASSWORD, DB_HOST |
| `api-key` | Chaves de API genericas |

### Regras Importantes

- **NUNCA** coloque credenciais em texto puro em documentos da KB
- **SEMPRE** use a sintaxe `{{secret:NOME}}` para referenciar valores sensiveis
- O nome da credencial deve ser em **MAIUSCULAS com underscores** (ex: `FB_ACCESS_TOKEN`)
- O prefixo `secret:` diferencia de variaveis de template normais `{{VARIAVEL}}`
- Credenciais sao encriptadas em disco e vinculadas a maquina (nao funcionam se copiadas para outro computador)

---

## Como o Claude Code Usa a KB

1. **Identificacao do Tema**: Quando o usuario faz uma solicitacao, o Claude Code identifica o tema principal
2. **Consulta ao Catalogo**: Verifica no catalogo de documentos (acima) se existe documento especifico para o tema
3. **Acesso Direto ou Busca**: Se sabe qual documento → Read direto. Se nao sabe → busca por palavras-chave
4. **Resolucao de Credenciais**: Referencias `{{secret:NAME}}` sao resolvidas pelo Credential Vault via CLI helper
5. **Resposta Baseada na KB**: O Claude Code responde usando PRIMEIRO as informacoes da KB
6. **Complemento**: Apenas se necessario, complementa com conhecimento geral

### Prioridade de Acesso (do mais rapido ao mais lento)

```
1. ACESSO DIRETO (Read)     → Sabe qual documento → Leia diretamente
2. BUSCA COM CATEGORIA      → Sabe a area → Filtre por --category
3. BUSCA GERAL              → Nao sabe onde esta → Busca por palavras-chave
4. BUSCA MULTI-PASS         → Tema complexo → Multiplas buscas complementares
```

## Boas Praticas

### FACA

- Use titulos descritivos e claros
- Adicione tags relevantes para facilitar a busca
- Organize em categorias logicas
- Mantenha os documentos atualizados
- Use exemplos de codigo quando relevante
- Documente decisoes importantes do projeto
- Inclua data de ultima atualizacao no frontmatter

### NAO FACA

- Nao crie documentos muito longos (divida em partes)
- Nao duplique informacoes entre documentos
- Nao use nomes de arquivo confusos
- Nao deixe documentos desatualizados
- **Nao coloque credenciais em texto puro** - use `{{secret:NOME}}`
- Nao repita buscas que ja foram feitas na mesma sessao

## Manutencao

### Atualizacao Regular

- Revise documentos quando o codigo mudar
- Adicione novos documentos para novas funcionalidades
- Remova documentos obsoletos
- Atualize o campo `last_updated` no frontmatter

### Verificacao de Cobertura

```bash
node "C:\Users\sabola\.claude\knowledge-base\knowledge-search.js"
```
(Sem argumentos lista todos os documentos agrupados por categoria)

## Troubleshooting

### Documento nao encontrado na busca

- Verifique se o arquivo esta na pasta `knowledge-base/`
- Confirme que a extensao e `.md`
- Adicione mais tags relevantes no frontmatter
- Tente termos alternativos (sinonimos sao expandidos automaticamente)

### Resultados irrelevantes

- Use termos mais especificos (nomes de plataformas, lojas, tecnologias)
- Use o filtro `--category` para restringir resultados
- Melhore as tags dos documentos
- Adicione mais contexto nos titulos
