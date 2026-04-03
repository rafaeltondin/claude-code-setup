---
title: "Guia Completo: Como Criar Documentação para a Knowledge Base"
category: "Documentacao"
tags:
  - documentacao
  - markdown
  - frontmatter
  - knowledge base
  - guia criacao
  - template
  - boas praticas
  - padronizacao
  - yaml
  - estrutura documento
  - credential vault
  - credenciais
  - secret
  - seguranca
topic: "Criação de Documentação"
priority: high
version: "2.0.0"
last_updated: "2026-02-13"
---

# Guia Completo: Como Criar Documentação para a Knowledge Base

Este documento explica **passo a passo** como criar documentação de alta qualidade para a Knowledge Base do projeto, garantindo máxima eficiência na busca e recuperação de informações.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura Obrigatória](#estrutura-obrigatória)
3. [Frontmatter YAML](#frontmatter-yaml)
4. [Categorias Padronizadas](#categorias-padronizadas)
5. [Tags Efetivas](#tags-efetivas)
6. [Estrutura do Conteúdo](#estrutura-do-conteúdo)
7. [Boas Práticas](#boas-práticas)
8. [Templates Prontos](#templates-prontos)
9. [Exemplos Práticos](#exemplos-práticos)
10. [Credenciais e o Credential Vault](#credenciais-e-o-credential-vault)
11. [Validação](#validação)
12. [Troubleshooting](#troubleshooting)

---

## 📖 Visão Geral

### O Que é a Knowledge Base?

A Knowledge Base é a **fonte primária de conhecimento** do projeto. Todo documento adicionado aqui:

- ✅ É indexado automaticamente
- ✅ Pode ser encontrado via busca inteligente
- ✅ Suporta sinônimos e termos compostos
- ✅ Serve como referência para agentes Claude Code

### Por Que Documentar Corretamente?

| Documentação Ruim | Documentação Boa |
|-------------------|------------------|
| ❌ Não é encontrada na busca | ✅ Aparece nos primeiros resultados |
| ❌ Informação incompleta | ✅ Informação detalhada e precisa |
| ❌ Difícil de manter | ✅ Fácil de atualizar |
| ❌ Sem contexto | ✅ Contexto completo |

---

## 🏗️ Estrutura Obrigatória

Todo documento na Knowledge Base **DEVE** seguir esta estrutura:

```markdown
---
[FRONTMATTER YAML]
---

# Título do Documento

[CONTEÚDO]
```

### Componentes Obrigatórios:

1. **Frontmatter YAML** - Metadados do documento
2. **Título H1** - Título principal (deve corresponder ao frontmatter)
3. **Conteúdo** - Corpo do documento com estrutura lógica

---

## 🎯 Frontmatter YAML

O frontmatter é o **coração da indexação**. Sem ele, seu documento não será encontrado eficientemente.

### Template Básico

```yaml
---
title: "Título Descritivo Completo"
category: "Categoria Padronizada"
tags:
  - tag principal
  - termo composto relevante
  - keyword importante
  - minimo 5 tags
  - maximo 20 tags
topic: "Tópico Específico"
priority: high|medium|low
last_updated: "AAAA-MM-DD"
---
```

### Campos Obrigatórios

#### 1. `title` (OBRIGATÓRIO)

**O que é:** Título completo e descritivo do documento

**Formato:** String entre aspas duplas

**Regras:**
- ✅ Seja específico e descritivo
- ✅ Use 5-15 palavras
- ✅ Inclua contexto relevante
- ❌ Não use títulos genéricos

**Exemplos:**

✅ **BOM:**
```yaml
title: "GUIA COMPLETO: Como Montar um Plano de Marketing Digital"
title: "Meu Servidor CyberPanel - Documentação de Acesso e Configuração"
title: "Shopify Liquid Sections - Guia Completo de Desenvolvimento"
```

❌ **RUIM:**
```yaml
title: "Guia"
title: "Documentação"
title: "Tutorial"
```

#### 2. `category` (OBRIGATÓRIO)

**O que é:** Categoria padronizada do documento

**Formato:** String entre aspas duplas

**Valores Permitidos:** (APENAS ESTAS 6 categorias)
- `"Infraestrutura"` - Servidores, hospedagem, deploy, DevOps
- `"Marketing"` - Estratégia, campanhas, tráfego pago, anúncios
- `"Desenvolvimento"` - Frontend, backend, frameworks, ferramentas
- `"Shopify"` - Temas, apps, Liquid, APIs Shopify
- `"AI"` - IA, ML, prompts, LLMs, automação
- `"Documentação"` - Guias, manuais, tutoriais internos

**Exemplo:**

```yaml
category: "Infraestrutura"  # Para docs de servidor/hospedagem
category: "Marketing"       # Para docs de marketing/ads
category: "Desenvolvimento" # Para docs de código/frameworks
```

#### 3. `tags` (OBRIGATÓRIO)

**O que é:** Lista de palavras-chave para busca

**Formato:** Array YAML (lista com `-`)

**Regras:**
- ✅ **Mínimo 5 tags**, máximo 20 tags
- ✅ Use **termos compostos** relevantes (ex: "plano de marketing", "landing page")
- ✅ Inclua **sinônimos** (ex: "hospedagem" + "hosting")
- ✅ Adicione **variações** (ex: "ssl" + "ssl certificate" + "https")
- ✅ Pense em **como usuários buscariam**
- ❌ Não repita palavras do título
- ❌ Não use tags genéricas demais

**Formato:**

```yaml
tags:
  - tag1
  - tag2
  - termo composto relevante
  - sinonimo
  - variacao
```

**Exemplos:**

✅ **BOM - Landing Page:**
```yaml
tags:
  - landing page
  - html
  - html5
  - css
  - css3
  - javascript
  - frontend
  - design responsivo
  - mobile first
  - seo
  - otimizacao web
  - taxa conversao
  - pagina vendas
  - desenvolvimento web
  - ui ux
```

✅ **BOM - Marketing:**
```yaml
tags:
  - marketing
  - marketing digital
  - plano de marketing
  - trafego pago
  - meta ads
  - google ads
  - estrategia marketing
  - campanha digital
  - funil de vendas
  - anuncios online
  - publicidade digital
```

✅ **BOM - Servidor:**
```yaml
tags:
  - cyberpanel
  - servidor
  - ssh
  - hospedagem
  - hosting
  - deploy
  - openlitespeed
  - ssl certificate
  - web server
  - painel controle
  - vps
  - credenciais
```

❌ **RUIM:**
```yaml
tags:
  - guia           # Muito genérico
  - tutorial       # Muito genérico
  - documento      # Redundante
```

#### 4. `topic` (OBRIGATÓRIO)

**O que é:** Tópico específico do documento

**Formato:** String entre aspas duplas

**Regras:**
- ✅ Seja mais específico que a categoria
- ✅ Use 2-5 palavras
- ✅ Identifique o assunto principal

**Exemplos:**

```yaml
category: "Infraestrutura"
topic: "Servidor e Hospedagem"

category: "Marketing"
topic: "Tráfego Pago"

category: "Desenvolvimento"
topic: "Landing Page"
```

#### 5. `priority` (OBRIGATÓRIO)

**O que é:** Nível de prioridade/importância do documento

**Formato:** String (sem aspas)

**Valores Permitidos:**
- `high` - Documentos críticos, usados frequentemente
- `medium` - Documentos importantes, uso regular
- `low` - Documentos secundários, consulta eventual

**Quando usar cada nível:**

```yaml
priority: high     # Credenciais, guias críticos, docs principais
priority: medium   # Tutoriais importantes, APIs, configurações
priority: low      # Documentação complementar, referências
```

#### 6. `last_updated` (OBRIGATÓRIO)

**O que é:** Data da última atualização

**Formato:** `"AAAA-MM-DD"`

**Regras:**
- ✅ Use formato ISO 8601
- ✅ Atualize sempre que modificar o documento
- ✅ Use aspas duplas

**Exemplo:**

```yaml
last_updated: "2025-12-23"
```

### Campos Opcionais (Recomendados)

#### `version`

Versão do documento (útil para documentações técnicas):

```yaml
version: "1.0.0"
version: "2.1.3"
```

#### `author`

Autor do documento:

```yaml
author: "Claude Sonnet 4.5"
author: "Equipe DevOps"
```

#### `created_at`

Data de criação original:

```yaml
created_at: "2025-12-22"
```

#### `status`

Status do documento:

```yaml
status: "stable"      # Documento finalizado
status: "draft"       # Rascunho
status: "deprecated"  # Obsoleto
```

---

## 📂 Categorias Padronizadas

Use **APENAS** estas 6 categorias. Não crie novas categorias sem aprovação.

### 1. Infraestrutura

**Quando usar:**
- Servidores (CyberPanel, Easypanel, VPS)
- Hospedagem e deploy
- DevOps, CI/CD
- Containers, Docker, Kubernetes
- Redes, SSL, DNS
- Bancos de dados (configuração de servidor)

**Exemplos:**
- Meu Servidor CyberPanel
- Easypanel - Documentação Completa
- Guia Correção SSL

### 2. Marketing

**Quando usar:**
- Estratégias de marketing
- Tráfego pago (Meta Ads, Google Ads)
- Campanhas publicitárias
- Funil de vendas
- Copy e criativos
- Analytics e métricas

**Exemplos:**
- Plano de Marketing Digital
- Meta Ads API
- Google Ads - Guia Completo

### 3. Desenvolvimento

**Quando usar:**
- Código frontend/backend
- Frameworks (React, Vue, Laravel, etc)
- Linguagens de programação
- Ferramentas de desenvolvimento
- Landing pages, websites
- APIs (desenvolvimento de)

**Exemplos:**
- Landing Page - Guia Completo
- Frontend Analyzer
- Sistema Multi-Projeto

### 4. Shopify

**Quando usar:**
- Temas Shopify
- Apps Shopify
- Liquid (linguagem de template)
- APIs Shopify (Admin, Storefront)
- E-commerce Shopify

**Exemplos:**
- Shopify - Documentação Completa
- Shopify Liquid Sections
- Shopify Apps - Guia

### 5. AI

**Quando usar:**
- Inteligência Artificial
- Machine Learning
- Prompts e prompt engineering
- LLMs (GPT, Claude, Gemini)
- Automação com IA
- APIs de IA

**Exemplos:**
- Engenharia de Prompts
- OpenRouter - Documentação
- Claude API - Guia

### 6. Documentação

**Quando usar:**
- Guias internos
- Manuais de processo
- Tutoriais de uso
- Documentação sobre documentação (meta)

**Exemplos:**
- Guia de Uso da Knowledge Base
- Guia de Criação de Documentação
- Manual de Processos Internos

---

## 🏷️ Tags Efetivas

### Regras de Ouro para Tags

#### 1. Use Termos Compostos

Termos compostos são **mais específicos** e aparecem em buscas naturais:

✅ **BOM:**
```yaml
tags:
  - plano de marketing      # Termo composto
  - landing page            # Termo composto
  - trafego pago            # Termo composto
  - prompt engineering      # Termo composto
  - ssl certificate         # Termo composto
```

❌ **RUIM:**
```yaml
tags:
  - plano        # Muito genérico
  - marketing    # Falta contexto
  - page         # Incompleto
```

#### 2. Inclua Sinônimos

Ajuda na busca com diferentes termos:

```yaml
tags:
  - hospedagem
  - hosting        # Sinônimo em inglês
  - servidor
  - vps
  - deploy
```

```yaml
tags:
  - marketing
  - publicidade    # Sinônimo
  - anuncios       # Sinônimo
  - ads            # Sinônimo em inglês
```

#### 3. Adicione Variações

Diferentes formas de buscar o mesmo conceito:

```yaml
tags:
  - landing page
  - pagina vendas          # Variação
  - pagina conversao       # Variação
  - pagina captura         # Variação
```

```yaml
tags:
  - ssl
  - ssl certificate        # Variação com contexto
  - https                  # Variação técnica
  - certificado digital    # Variação em português
```

#### 4. Pense no Usuário

Como alguém buscaria este documento?

**Cenário: Documento sobre Meta Ads**

Perguntas do usuário:
- "Como fazer anúncios no Facebook?"
- "API do Instagram para ads"
- "Criar campanha Meta Ads"
- "Pixel de conversão"

Tags devem cobrir todas essas buscas:

```yaml
tags:
  - meta ads
  - facebook ads
  - instagram ads
  - api meta
  - pixel conversao
  - campanha digital
  - anuncios facebook
  - trafego pago
```

### Quantidade Ideal de Tags

| Tipo de Documento | Mínimo | Ideal | Máximo |
|-------------------|--------|-------|--------|
| Guia Completo | 10 | 15 | 20 |
| Tutorial | 7 | 10 | 15 |
| Referência Rápida | 5 | 8 | 12 |
| Credenciais/Config | 5 | 7 | 10 |

---

## 📝 Estrutura do Conteúdo

### Hierarquia de Títulos

Use hierarquia clara e lógica:

```markdown
# Título Principal (H1) - Apenas 1 por documento

## Seção Principal (H2)

### Subseção (H3)

#### Tópico Específico (H4)

##### Detalhe (H5) - Raramente usado
```

**Regras:**
- ✅ Apenas **1 título H1** (o principal)
- ✅ Use H2 para seções principais
- ✅ Use H3 para subseções
- ✅ Mantenha hierarquia lógica (não pule níveis)
- ❌ Não use H5 ou H6 (desnecessário)

### Estrutura Recomendada

```markdown
# Título do Documento

Breve introdução (1-2 parágrafos)

---

## 📋 Índice (Opcional para docs longos)

1. [Seção 1](#seção-1)
2. [Seção 2](#seção-2)
...

---

## Visão Geral

Explicação geral do que o documento cobre.

---

## Seção 1: [Nome da Seção]

### Subseção 1.1

Conteúdo...

### Subseção 1.2

Conteúdo...

---

## Seção 2: [Nome da Seção]

### Subseção 2.1

Conteúdo...

---

## Exemplos Práticos

Exemplos de uso...

---

## Troubleshooting (Se aplicável)

Problemas comuns e soluções...

---

## Referências (Se aplicável)

Links e recursos externos...
```

### Elementos Visuais

#### Tabelas

Use tabelas para comparações e dados estruturados:

```markdown
| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Dado 1   | Dado 2   | Dado 3   |
| Dado 4   | Dado 5   | Dado 6   |
```

#### Listas

**Listas não ordenadas:**
```markdown
- Item 1
- Item 2
  - Subitem 2.1
  - Subitem 2.2
- Item 3
```

**Listas ordenadas:**
```markdown
1. Passo 1
2. Passo 2
3. Passo 3
```

**Listas de checklist:**
```markdown
- [x] Tarefa completa
- [ ] Tarefa pendente
- [ ] Outra tarefa
```

#### Blocos de Código

**Código inline:**
```markdown
Use o comando `npm install` para instalar.
```

**Blocos de código:**
````markdown
```bash
# Comando bash
npm install axios
```

```javascript
// Código JavaScript
const result = await api.get('/users');
```

```yaml
# Configuração YAML
title: "Exemplo"
tags:
  - tag1
  - tag2
```
````

#### Citações

```markdown
> **Nota:** Informação importante aqui.

> ⚠️ **Atenção:** Cuidado com este ponto.

> ✅ **Dica:** Melhor prática recomendada.
```

#### Emojis (Use com moderação)

```markdown
✅ Sucesso
❌ Erro
⚠️ Atenção
💡 Dica
📝 Nota
🔧 Configuração
🚀 Ação
📊 Dados
```

---

## ✨ Boas Práticas

### 1. Seja Específico e Detalhado

❌ **Ruim:**
```markdown
## Configuração

Configure o servidor.
```

✅ **Bom:**
```markdown
## Configuração do Servidor CyberPanel

### Pré-requisitos

- Servidor Ubuntu 22.04 LTS
- Acesso SSH root
- Mínimo 2GB RAM

### Passo 1: Acessar o Servidor

```bash
ssh root@46.202.149.24
```

### Passo 2: Instalar CyberPanel

```bash
sh <(curl https://cyberpanel.net/install.sh || wget -O - https://cyberpanel.net/install.sh)
```

### Passo 3: Configurar Firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
```

### 2. Use Exemplos Práticos

Sempre que possível, inclua exemplos reais:

```markdown
## Exemplo: Criar Landing Page

**Cenário:** Você precisa criar uma landing page para captura de leads.

**Código HTML:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Landing Page - Captura de Leads</title>
</head>
<body>
    <h1>Baixe Nosso E-book Grátis</h1>
    <form>
        <input type="email" placeholder="Seu e-mail">
        <button type="submit">Baixar Agora</button>
    </form>
</body>
</html>
```

**Resultado:** [screenshot ou link]
```

### 3. Mantenha Atualizado

```yaml
# Sempre atualize a data ao modificar
last_updated: "2025-12-23"
```

Adicione notas de atualização no final do documento:

```markdown
---

## Histórico de Atualizações

**2025-12-23:**
- Adicionado seção de exemplos práticos
- Corrigido erro no comando de instalação

**2025-12-20:**
- Versão inicial do documento
```

### 4. Links Internos

Use links para outros documentos da KB:

```markdown
Para mais informações sobre hospedagem, veja [Meu Servidor CyberPanel](./MEU_SERVIDOR_CYBERPANEL.md).

Consulte também:
- [Landing Page - Guia Completo](./LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md)
- [Marketing Digital](./MARKETING-DIGITAL-PLANO-GUIA-COMPLETO.md)
```

### 5. Estruture para Escaneabilidade

As pessoas **escaneiam** documentos, não leem palavra por palavra.

**Ajude o leitor:**
- ✅ Use títulos descritivos
- ✅ Divida em seções curtas
- ✅ Use listas com bullets
- ✅ Destaque pontos importantes em **negrito**
- ✅ Use tabelas para comparações

---

## 📋 Templates Prontos

### Template 1: Guia Técnico

```markdown
---
title: "[Nome da Tecnologia] - Guia Completo de [Funcionalidade]"
category: "Desenvolvimento"
tags:
  - nome tecnologia
  - funcionalidade
  - termo composto
  - sinonimo1
  - sinonimo2
  - minimo 5 tags
topic: "[Tecnologia]"
priority: high
last_updated: "AAAA-MM-DD"
---

# [Nome da Tecnologia] - Guia Completo de [Funcionalidade]

Breve descrição do que este guia cobre.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação](#instalação)
4. [Configuração](#configuração)
5. [Uso Básico](#uso-básico)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Troubleshooting](#troubleshooting)
8. [Referências](#referências)

---

## Visão Geral

O que é [tecnologia] e para que serve.

---

## Pré-requisitos

- Requisito 1
- Requisito 2
- Requisito 3

---

## Instalação

### Passo 1: [Nome do Passo]

```bash
comando aqui
```

### Passo 2: [Nome do Passo]

```bash
outro comando
```

---

## Configuração

### Configuração Básica

```yaml
# Arquivo de configuração
key: value
```

### Configuração Avançada

Opções avançadas...

---

## Uso Básico

### Exemplo 1: [Caso de Uso]

```javascript
// Código de exemplo
const exemplo = 'valor';
```

---

## Exemplos Práticos

### Exemplo Completo

Cenário real de uso...

---

## Troubleshooting

### Problema: [Descrição do Problema]

**Sintoma:**
```
Mensagem de erro
```

**Causa:**
Explicação da causa.

**Solução:**
```bash
comando de correção
```

---

## Referências

- [Link oficial](https://exemplo.com)
- [Documentação](https://docs.exemplo.com)
```

### Template 2: Documentação de API

```markdown
---
title: "[Nome da API] - Documentação Completa"
category: "Desenvolvimento"
tags:
  - api
  - nome api
  - rest api
  - graphql
  - endpoints
  - autenticacao
  - termo composto relevante
topic: "API"
priority: high
last_updated: "AAAA-MM-DD"
---

# [Nome da API] - Documentação Completa

Documentação completa da [Nome da API].

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints](#endpoints)
4. [Exemplos](#exemplos)
5. [Rate Limits](#rate-limits)
6. [Erros](#erros)

---

## Visão Geral

**Base URL:** `https://api.exemplo.com/v1`

**Formato:** JSON

**Autenticação:** Bearer Token

---

## Autenticação

### Obter Token

**Endpoint:** `POST /auth/token`

**Request:**
```json
{
  "email": "user@exemplo.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

## Endpoints

### GET /users

Listar usuários.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| page | integer | Não | Número da página (padrão: 1) |
| limit | integer | Não | Itens por página (padrão: 10) |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "João Silva",
      "email": "joao@exemplo.com"
    }
  ],
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

---

## Exemplos

### Exemplo: Listar Usuários

**JavaScript (Fetch):**
```javascript
const response = await fetch('https://api.exemplo.com/v1/users', {
  headers: {
    'Authorization': 'Bearer SEU_TOKEN'
  }
});

const data = await response.json();
console.log(data);
```

**Python (Requests):**
```python
import requests

headers = {
    'Authorization': 'Bearer SEU_TOKEN'
}

response = requests.get('https://api.exemplo.com/v1/users', headers=headers)
data = response.json()
print(data)
```

---

## Rate Limits

| Plano | Limite |
|-------|--------|
| Free | 100 req/hora |
| Pro | 1000 req/hora |
| Enterprise | Ilimitado |

---

## Erros

### Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Requisição inválida |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

### Formato de Erro

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token de autenticação inválido",
    "details": "O token expirou ou está malformado"
  }
}
```
```

### Template 3: Credenciais/Configuração

> **IMPORTANTE:** Documentos de credenciais devem usar `{{secret:NOME}}` para referenciar valores sensiveis. Nunca coloque senhas, tokens ou chaves de API em texto puro.

```markdown
---
title: "[Sistema] - Credenciais e Configuração de Acesso"
category: "Infraestrutura"
tags:
  - nome sistema
  - credenciais
  - acesso
  - configuracao
  - ssh
  - credential vault
  - termo composto
topic: "[Sistema]"
priority: high
last_updated: "AAAA-MM-DD"
---

# [Sistema] - Credenciais e Configuração de Acesso

Documentação de acesso e credenciais do [Sistema].

> Os valores sensiveis estao protegidos pelo Credential Vault.
> Use as referencias `{{secret:NOME}}` nos comandos e exemplos.

---

## 🔐 Informações de Acesso Rápido

| Item | Valor |
|------|-------|
| **IP do Servidor** | `{{secret:SISTEMA_SERVER_IP}}` |
| **Hostname** | `servidor-producao` |
| **Acesso SSH** | `ssh user@{{secret:SISTEMA_SERVER_IP}}` |
| **Painel** | `https://{{secret:SISTEMA_SERVER_IP}}:3000` |
| **Provedor** | [Nome do Provedor] |

---

## ⚙️ Especificações

### Hardware

| Recurso | Especificação |
|---------|---------------|
| **CPU** | [Especificações] |
| **RAM** | [Quantidade] |
| **Disco** | [Espaço] |

### Software

| Software | Versão |
|----------|--------|
| **Sistema Operacional** | [SO e versão] |
| **[Software 1]** | [Versão] |
| **[Software 2]** | [Versão] |

---

## 🔑 Credenciais

> Todos os valores sensiveis estao armazenados no Credential Vault (AES-256-GCM).
> Gerencie pelo dashboard: http://localhost:3847 → aba Credenciais.

### Acesso SSH

```bash
ssh -i "~/.ssh/chave" root@{{secret:SISTEMA_SERVER_IP}}
# Autenticação: Chave SSH
```

### Painel de Controle

- **URL:** `https://{{secret:SISTEMA_SERVER_IP}}:3000`
- **Usuário:** `admin`
- **Senha:** `{{secret:SISTEMA_PANEL_PASSWORD}}`

### Banco de Dados

- **Host:** `localhost`
- **Porta:** `3306`
- **Usuário:** `dbuser`
- **Senha:** `{{secret:SISTEMA_DB_PASSWORD}}`
- **Database:** `production_db`

### Variaveis de Ambiente

```env
SERVER_IP={{secret:SISTEMA_SERVER_IP}}
PANEL_PASSWORD={{secret:SISTEMA_PANEL_PASSWORD}}
DB_PASSWORD={{secret:SISTEMA_DB_PASSWORD}}
```

---

## 📂 Estrutura de Diretórios

```
/
├── /home/
│   └── /usuario/
│       ├── /public_html/     # Arquivos públicos
│       ├── /logs/            # Logs
│       └── /backups/         # Backups
│
├── /etc/
│   └── /config/              # Configurações
│
└── /var/
    └── /data/                # Dados da aplicação
```

---

## 🛠️ Comandos Úteis

### Verificar Status

```bash
ssh root@{{secret:SISTEMA_SERVER_IP}} "systemctl status servico"
ssh root@{{secret:SISTEMA_SERVER_IP}} "free -h"
ssh root@{{secret:SISTEMA_SERVER_IP}} "df -h"
```

### Reiniciar Serviços

```bash
ssh root@{{secret:SISTEMA_SERVER_IP}} "systemctl restart servico"
ssh root@{{secret:SISTEMA_SERVER_IP}} "systemctl restart mysql"
```

---

## 🔒 Notas de Segurança

1. ✅ SSH configurado com autenticação por chave
2. ✅ Firewall ativo
3. ✅ Backups automáticos diários
4. ✅ Credenciais protegidas pelo Credential Vault (AES-256-GCM)
5. ⚠️ Revisar logs semanalmente
```

### Template 4: Tutorial Passo a Passo

```markdown
---
title: "Tutorial: Como [Fazer Algo Específico]"
category: "[Categoria Apropriada]"
tags:
  - tutorial
  - passo a passo
  - termo relevante
  - funcionalidade
  - minimo 5 tags
topic: "[Tópico]"
priority: medium
last_updated: "AAAA-MM-DD"
---

# Tutorial: Como [Fazer Algo Específico]

Tutorial completo passo a passo para [objetivo do tutorial].

---

## 📋 O Que Você Vai Aprender

Ao final deste tutorial, você será capaz de:
- ✅ [Resultado 1]
- ✅ [Resultado 2]
- ✅ [Resultado 3]

---

## 🎯 Pré-requisitos

Antes de começar, certifique-se de ter:
- [ ] [Requisito 1]
- [ ] [Requisito 2]
- [ ] [Requisito 3]

---

## 🚀 Passo 1: [Nome do Passo]

### O Que Vamos Fazer

Breve descrição do objetivo deste passo.

### Como Fazer

1. [Ação 1]
   ```bash
   comando se necessário
   ```

2. [Ação 2]
   ```bash
   outro comando
   ```

3. [Ação 3]

### Resultado Esperado

Ao final deste passo, você deve ver:
```
Output esperado
```

---

## 🚀 Passo 2: [Nome do Passo]

[Repetir estrutura do Passo 1]

---

## ✅ Verificação Final

Teste se tudo funcionou:

```bash
# Comando de teste
comando --version
```

**Output esperado:**
```
versão x.y.z
```

---

## 🐛 Problemas Comuns

### Problema 1: [Descrição]

**Sintoma:**
```
Mensagem de erro
```

**Solução:**
```bash
comando de correção
```

---

## 🎉 Próximos Passos

Agora que você completou este tutorial, pode:
- 📚 Ler [Tutorial Relacionado]
- 🚀 Implementar [Funcionalidade Avançada]
- 💡 Explorar [Outra Opção]
```

---

## 💼 Exemplos Práticos

### Exemplo 1: Documentar Nova API

**Cenário:** Você integrou a API do OpenRouter e precisa documentar.

```markdown
---
title: "OpenRouter API - Guia de Integração Completo"
category: "AI"
tags:
  - openrouter
  - api
  - llm
  - gpt
  - claude
  - ai
  - integracao api
  - prompt caching
  - multimodal
  - pdf
  - imagens
topic: "APIs de IA"
priority: high
last_updated: "2025-12-23"
---

# OpenRouter API - Guia de Integração Completo

Guia completo para integração da OpenRouter API no projeto...

[Continuar com estrutura detalhada]
```

### Exemplo 2: Documentar Servidor

**Cenário:** Novo servidor foi configurado.

```markdown
---
title: "Servidor Produção AWS - Documentação de Acesso e Configuração"
category: "Infraestrutura"
tags:
  - aws
  - servidor
  - producao
  - ec2
  - ssh
  - credenciais
  - deploy
  - hosting
  - cloud server
  - web server
topic: "Servidor AWS"
priority: high
last_updated: "2025-12-23"
---

# Servidor Produção AWS - Documentação de Acesso e Configuração

Documentação completa do servidor de produção hospedado na AWS...

[Continuar com credenciais e configurações]
```

### Exemplo 3: Documentar Processo

**Cenário:** Processo de deploy precisa ser documentado.

```markdown
---
title: "Processo de Deploy - Guia Completo do Ambiente de Produção"
category: "Desenvolvimento"
tags:
  - deploy
  - producao
  - ci cd
  - git
  - github actions
  - automacao deploy
  - pipeline
  - continuous deployment
topic: "Deploy e CI/CD"
priority: high
last_updated: "2025-12-23"
---

# Processo de Deploy - Guia Completo do Ambiente de Produção

Guia passo a passo do processo de deploy para produção...

[Continuar com processo detalhado]
```

---

## 🔐 Credenciais e o Credential Vault

### Regra Fundamental

**NUNCA** coloque credenciais em texto puro em documentos da Knowledge Base. Use sempre a sintaxe de referencia segura:

```
{{secret:NOME_DA_CREDENCIAL}}
```

### O Que e o Credential Vault?

O Credential Vault e um sistema de armazenamento seguro integrado ao dashboard que:

- Encripta credenciais com **AES-256-GCM**
- Vincula a encriptacao a maquina (hostname + username via PBKDF2)
- Permite referenciar credenciais por nome sem expor valores
- Resolve referencias automaticamente na hora da execucao

### Sintaxe de Referencia

| Formato | Exemplo | Uso |
|---------|---------|-----|
| `{{secret:NOME}}` | `{{secret:FB_ACCESS_TOKEN}}` | Em qualquer lugar do documento |
| Texto puro | ~~`EAAYidQ4pvn0...`~~ | **PROIBIDO** |

### Nomenclatura de Credenciais

| Regra | Exemplo |
|-------|---------|
| MAIUSCULAS | `FB_ACCESS_TOKEN` (nao `fb_access_token`) |
| Separar com underscore | `SHOPIFY_ACCESS_TOKEN` (nao `SHOPIFYACCESSTOKEN`) |
| Prefixo do servico | `FB_`, `SHOPIFY_`, `EVOLUTION_`, `VNC_` |
| Sem caracteres especiais | `SERVER_IP` (nao `SERVER-IP`) |

### Onde Usar `{{secret:NAME}}`

Use em **TODOS** os locais onde um valor sensivel apareceria:

**1. Tabelas de credenciais:**
```markdown
| **API Key** | `{{secret:MINHA_API_KEY}}` |
```

**2. Blocos .env:**
```markdown
API_KEY={{secret:MINHA_API_KEY}}
DB_PASSWORD={{secret:MINHA_DB_PASSWORD}}
```

**3. Exemplos de codigo:**
```markdown
const token = '{{secret:MINHA_API_KEY}}';
headers = {'Authorization': f'Bearer {{secret:MINHA_API_KEY}}'}
```

**4. Comandos curl:**
```markdown
curl -H "apikey: {{secret:MINHA_API_KEY}}" https://api.exemplo.com/endpoint
```

**5. Comandos SSH:**
```markdown
ssh root@{{secret:SERVER_IP}} "comando aqui"
```

### Como Cadastrar Novas Credenciais

**Via Dashboard (recomendado):**
1. Acesse `http://localhost:3847`
2. Clique na aba **Credenciais** (icone de cadeado)
3. Clique em **Nova Credencial**
4. Preencha: Nome, Categoria, Valor, Descricao
5. Salve

**Via Importacao da KB:**
1. Na aba Credenciais, clique em **Importar da KB**
2. O sistema extrai automaticamente credenciais dos documentos
3. Funciona apenas se os documentos ainda contem valores em texto puro

### Credenciais Atuais no Vault

| Nome | Categoria | Fonte |
|------|-----------|-------|
| `FB_ACCESS_TOKEN` | meta-ads | FIBER-META-ADS-CREDENCIAIS.md |
| `FB_APP_ID` | meta-ads | FIBER-META-ADS-CREDENCIAIS.md |
| `FB_APP_SECRET` | meta-ads | FIBER-META-ADS-CREDENCIAIS.md |
| `FB_AD_ACCOUNT_ID` | meta-ads | FIBER-META-ADS-CREDENCIAIS.md |
| `SHOPIFY_ACCESS_TOKEN` | shopify | FIBER-SHOPIFY-API-CREDENCIAIS.md |
| `EVOLUTION_API_KEY` | evolution-api | MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md |
| `EVOLUTION_INSTANCE_TOKEN` | evolution-api | MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md |
| `VNC_PASSWORD` | server | MEU-SERVIDOR-EASYPANEL.md |
| `SERVER_IP` | server | MEU-SERVIDOR-EASYPANEL.md |

### Checklist para Documentos com Credenciais

- [ ] Nenhum valor sensivel em texto puro no documento
- [ ] Todas as credenciais usam sintaxe `{{secret:NOME}}`
- [ ] Credenciais cadastradas no Vault antes de publicar o documento
- [ ] Nomes seguem convencao MAIUSCULAS_COM_UNDERSCORE
- [ ] Categoria definida (meta-ads, shopify, server, etc.)

---

## ✅ Validação

### Como Validar Seu Documento

Antes de considerar o documento pronto, execute:

```bash
# Validar frontmatter
node validate-frontmatter.js
```

**Resultado esperado:**
```
✅ Documentos válidos: X/X (100.0%)
❌ Issues críticos: 0
⚠️  Avisos: 0
```

### Checklist de Validação Manual

- [ ] Frontmatter completo com todos os campos obrigatórios
- [ ] Categoria está entre as 6 padronizadas
- [ ] Mínimo de 5 tags
- [ ] Tags incluem termos compostos
- [ ] Título H1 corresponde ao `title` do frontmatter
- [ ] Estrutura de títulos é hierárquica (H1 → H2 → H3)
- [ ] Exemplos práticos incluídos (se aplicável)
- [ ] Blocos de código têm sintaxe correta
- [ ] Links internos funcionam
- [ ] Data `last_updated` está correta

### Testar Busca

Teste se seu documento é encontrado:

```bash
# Buscar por termo principal
node knowledge-search.js "termo principal"

# Buscar por categoria
node knowledge-search.js "termo" --category=SuaCategoria

# Buscar por sinônimo
node knowledge-search.js "sinonimo"
```

**Seu documento deve aparecer nos resultados!**

---

## 🐛 Troubleshooting

### Problema: Documento não aparece na busca

**Causas possíveis:**

1. **Frontmatter ausente ou inválido**
   - ✅ Solução: Execute `validate-frontmatter.js` e corrija

2. **Tags muito genéricas**
   - ✅ Solução: Adicione termos compostos específicos

3. **Categoria inválida**
   - ✅ Solução: Use apenas as 6 categorias padronizadas

### Problema: Validação falha

**Erro: "Frontmatter ausente"**

```markdown
# Seu documento começou assim (ERRADO):

# Título do Documento

Conteúdo...
```

**Correção:**

```markdown
---
title: "Título do Documento"
category: "Categoria"
tags:
  - tag1
  - tag2
---

# Título do Documento

Conteúdo...
```

**Erro: "Campo tags ausente"**

```yaml
# ERRADO:
tags:

# CORRETO:
tags:
  - tag1
  - tag2
  - tag3
```

### Problema: Busca retorna documento errado

**Causa:** Tags muito amplas

**Exemplo:**

Você criou um documento sobre "Deploy de Node.js" mas ele aparece quando busca "servidor":

```yaml
# Problema: Tags genéricas
tags:
  - servidor
  - deploy
  - node

# Solução: Tags específicas
tags:
  - deploy nodejs
  - nodejs producao
  - pm2 nodejs
  - servidor nodejs
  - node application deploy
```

---

## 📚 Recursos Adicionais

### Markdown Syntax

- [Guia Markdown](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)

### YAML Syntax

- [YAML.org](https://yaml.org/)
- [YAML Validator](https://www.yamllint.com/)

### Ferramentas

```bash
# Validar frontmatter
node validate-frontmatter.js

# Buscar documentos
node knowledge-search.js "query"

# Buscar por categoria
node knowledge-search.js "query" --category=Categoria

# Listar todos documentos
node knowledge-search.js
```

---

## 🎯 Resumo

### Checklist Final

Antes de finalizar qualquer documentação:

- [ ] ✅ Frontmatter completo (7 campos obrigatórios)
- [ ] ✅ Categoria válida (uma das 6 padronizadas)
- [ ] ✅ Mínimo 5 tags com termos compostos
- [ ] ✅ Título H1 único e descritivo
- [ ] ✅ Estrutura hierárquica clara
- [ ] ✅ Exemplos práticos incluídos
- [ ] ✅ Validação executada com sucesso
- [ ] ✅ Documento encontrado na busca

### Próximos Passos

Após criar a documentação:

1. **Validar**: `node validate-frontmatter.js`
2. **Testar busca**: `node knowledge-search.js "termo principal"`
3. **Compartilhar**: Avise a equipe sobre o novo documento
4. **Manter**: Atualize o `last_updated` sempre que modificar

---

**Documento criado:** 2025-12-23
**Ultima atualizacao:** 2026-02-13
**Versao:** 2.0.0

---

## 📞 Precisa de Ajuda?

- 📖 Consulte os **exemplos neste documento**
- 🔍 Use `node knowledge-search.js "termo"` para encontrar documentos similares
- ✅ Execute `validate-frontmatter.js` para verificar erros
- 💡 Siga os **templates prontos** fornecidos

**Lembre-se:** Uma boa documentação é a chave para um projeto bem-sucedido! 🚀
