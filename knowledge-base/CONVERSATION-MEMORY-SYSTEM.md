---
title: "Sistema de Memória de Conversa - Documentação Completa"
category: "Documentacao"
tags:
  - memória
  - contexto
  - conversa
  - persistência
  - sessão
  - tarefas
topic: "Claude Code Memory System"
priority: critical
version: "1.0.0"
last_updated: "2025-12-29"
---

# Sistema de Memória de Conversa - Documentação Completa

## Visão Geral

O Sistema de Memória de Conversa resolve o problema crítico de perda de contexto ao longo de conversas longas com o Claude Code. Ele persiste:

- **Objetivo da sessão**: O que o usuário quer alcançar
- **Fase atual**: Em que etapa do trabalho estamos
- **Tarefas**: Lista completa com status (pendente/em progresso/concluída)
- **Histórico de ações**: O que foi feito em cada interação
- **Artefatos**: Arquivos criados ou modificados
- **Decisões técnicas**: Escolhas feitas e suas justificativas
- **Erros e soluções**: Problemas encontrados e como foram resolvidos
- **Checkpoints**: Pontos de salvamento para recuperação

## Arquitetura

```
C:\Users\sabola\.claude\conversation-memory\
├── ConversationMemory.js   # Core: ConversationSession + ConversationMemoryManager
├── MemoryHooks.js          # Hooks para integração automática
├── memory-cli.js           # Interface de linha de comando
├── index.js                # Entry point do módulo
└── sessions/               # Diretório com sessões salvas em JSON
    ├── active-session.json
    └── session_*.json
```

## Componentes Principais

### 1. ConversationSession

Representa uma sessão de conversa com todos os dados:

```javascript
{
  id: "session_1735469000000_abc123",
  createdAt: "2025-12-29T08:30:00.000Z",
  updatedAt: "2025-12-29T09:45:00.000Z",
  status: "active", // ou "completed"

  context: {
    objective: "Implementar sistema de autenticação",
    currentPhase: "Fase 2: Implementação",
    workingDirectory: "C:/Projects/MyApp",
    projectType: "API Node.js",
    technologies: ["Node.js", "Express", "JWT"]
  },

  tasks: [
    { id: "T001", content: "Criar rota /login", status: "completed", ... },
    { id: "T002", content: "Implementar middleware JWT", status: "in_progress", ... },
    { id: "T003", content: "Criar testes", status: "pending", ... }
  ],

  actionHistory: [...],
  artifacts: [...],
  decisions: [...],
  errorsAndSolutions: [...],
  checkpoints: [...]
}
```

### 2. ConversationMemoryManager

Gerencia o ciclo de vida das sessões:

- `initSession(forceNew)` - Inicia ou recupera sessão
- `getActiveSession()` - Obtém sessão ativa
- `saveSession(session)` - Salva no disco
- `loadSession(sessionId)` - Carrega do disco
- `listSessions()` - Lista todas as sessões
- `deleteSession(sessionId)` - Remove sessão
- `finalizeSession()` - Marca como concluída

### 3. MemoryHooks

Hooks para integração automática:

- `onInteractionStart()` - Início de cada interação
- `onTodoUpdate(todos)` - Quando TodoWrite é chamado
- `onFileChange(path, op)` - Quando arquivos são modificados
- `onDecision(decision, rationale)` - Quando decisões são tomadas
- `onErrorResolved(error, solution)` - Quando erros são resolvidos
- `onInteractionEnd()` - Final de cada interação

### 4. API Simplificada (memory)

```javascript
const { memory } = require('./conversation-memory');

// Inicializar
await memory.init();

// Definir objetivo
await memory.setObjective("Criar landing page");

// Definir fase
await memory.setPhase("Fase 1: Estrutura HTML");

// Adicionar tarefa
await memory.addTask("Criar header responsivo");

// Registrar decisão
await memory.logDecision(
  "Usar CSS Grid para layout",
  "Melhor suporte para layouts complexos"
);

// Registrar artefato
await memory.logArtifact("/src/index.html", "created");

// Criar checkpoint
await memory.checkpoint("Antes de refatoração");

// Obter resumo
const summary = await memory.getSummary();
```

## Comandos CLI

### Via memory-cli.js

```bash
# Status da sessão
node memory-cli.js status

# Resumo completo
node memory-cli.js summary

# Definir objetivo
node memory-cli.js objective "Implementar feature X"

# Definir fase
node memory-cli.js phase "Fase 2: Testes"

# Criar checkpoint
node memory-cli.js checkpoint "Antes de deploy"

# Listar sessões
node memory-cli.js list

# Carregar sessão (por índice ou ID)
node memory-cli.js load 1
node memory-cli.js load session_1735469000000_abc123

# Nova sessão
node memory-cli.js new

# Finalizar
node memory-cli.js finalize

# Ver tarefas
node memory-cli.js tasks

# Ver histórico
node memory-cli.js history

# Ver artefatos
node memory-cli.js artifacts

# Ver decisões
node memory-cli.js decisions

# Ver erros/soluções
node memory-cli.js errors
```

## Protocolo de Uso

### Início de Nova Conversa

```bash
# 1. Verificar sessão existente
node "C:\Users\sabola\.claude\conversation-memory\memory-cli.js" status

# 2. Se não houver, criar nova
node "C:\Users\sabola\.claude\conversation-memory\memory-cli.js" new

# 3. Definir objetivo
node "C:\Users\sabola\.claude\conversation-memory\memory-cli.js" objective "Descrição do trabalho"
```

### Durante o Trabalho

```bash
# Quando mudar de fase
node memory-cli.js phase "Nova fase"

# Antes de mudanças arriscadas
node memory-cli.js checkpoint "Antes de X"

# Para ver progresso
node memory-cli.js summary
```

### Retomar Trabalho Anterior

```bash
# 1. Listar sessões
node memory-cli.js list

# 2. Carregar a desejada
node memory-cli.js load 1

# 3. Ver o que estava sendo feito
node memory-cli.js summary
```

### Finalizar Trabalho

```bash
node memory-cli.js finalize "Trabalho concluído com sucesso"
```

## Integração com TodoWrite

O sistema sincroniza automaticamente com o TodoWrite do Claude Code:

1. Quando `TodoWrite` é chamado, os hooks capturam as tarefas
2. As tarefas são mapeadas para o formato interno
3. Status são sincronizados (pending, in_progress, completed)
4. Histórico de conclusão é mantido

## Persistência

- Sessões são salvas em arquivos JSON em `sessions/`
- Auto-save após cada operação significativa
- Máximo de 50 sessões mantidas (limpeza automática)
- Cada sessão mantém até 200 ações no histórico

## Checkpoints

Checkpoints permitem criar "pontos de salvamento":

```javascript
await memory.checkpoint("Antes de refatoração grande");
```

Útil para:
- Antes de mudanças arriscadas
- Marcos importantes do projeto
- Pontos de rollback potenciais

## Formato do Resumo

O método `getSummary()` gera um resumo formatado:

```
=== MEMÓRIA DA SESSÃO ATUAL ===
ID: session_1735469000000_abc123
Iniciada: 2025-12-29T08:30:00.000Z
Última atualização: 2025-12-29T09:45:00.000Z

📎 OBJETIVO: Implementar sistema de autenticação

📍 FASE ATUAL: Fase 2: Implementação

📋 TAREFAS:
  ✅ Concluídas: 5
  🔄 Em progresso: 1
  ⏳ Pendentes: 3

🔄 EM ANDAMENTO:
  - [T006] Implementar middleware JWT

⏳ PRÓXIMAS TAREFAS:
  - [T007] Criar testes unitários
  - [T008] Documentar API
  - [T009] Deploy para staging

📝 ÚLTIMAS AÇÕES:
  - [09:45:00] file_created
  - [09:42:15] task_completed
  - [09:40:00] decision_made

📦 ARTEFATOS RECENTES:
  - [created] /src/middleware/auth.js
  - [modified] /src/routes/index.js

💡 DECISÕES TOMADAS:
  - Usar JWT para autenticação
  - Implementar refresh tokens

=== FIM DA MEMÓRIA ===
```

## Benefícios

1. **Continuidade**: Retoma trabalho exatamente de onde parou
2. **Rastreabilidade**: Histórico completo de todas as ações
3. **Organização**: Tarefas e fases bem definidas
4. **Recuperação**: Checkpoints para voltar a estados anteriores
5. **Documentação**: Decisões e artefatos registrados automaticamente
6. **Debug**: Erros e soluções documentados para referência

## Troubleshooting

### Sessão não encontrada

```bash
# Criar nova sessão
node memory-cli.js new
```

### Sessão corrompida

```bash
# Listar e carregar outra
node memory-cli.js list
node memory-cli.js load <id>
```

### Limpar sessões antigas

```bash
# O sistema limpa automaticamente, mas pode forçar:
node -e "require('./ConversationMemory').memoryManager.cleanupOldSessions()"
```

## Melhores Práticas

1. **Sempre definir objetivo** no início de trabalhos significativos
2. **Criar checkpoints** antes de mudanças arriscadas
3. **Atualizar fase** quando mudar de etapa
4. **Verificar summary** regularmente para não perder o fio
5. **Finalizar sessões** quando o trabalho for concluído
6. **Usar load** para retomar trabalhos anteriores

---

**Fonte**: CONVERSATION-MEMORY-SYSTEM.md
**Versão**: 1.0.0
**Última atualização**: 29 de Dezembro de 2025
