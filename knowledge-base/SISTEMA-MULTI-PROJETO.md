---
title: "Sistema Multi-Projeto - Gerenciamento Robusto de Projetos Simultâneos"
category: "Desenvolvimento"
tags:
  - multi-projeto
  - workspace
  - gerenciamento
  - isolamento
  - contexto
topic: "Arquitetura de Sistema"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# Sistema Multi-Projeto - Gerenciamento Robusto de Projetos Simultâneos

## 📋 Visão Geral

Sistema completo e robusto para gerenciar múltiplos projetos simultaneamente em uma única instância da aplicação.

### Características Principais

✅ **Isolamento Completo**: Cada projeto tem seu próprio workspace isolado
✅ **Gerenciamento de Contexto**: Switch rápido entre projetos
✅ **Configuração Hierárquica**: Global + Projeto + Ambiente
✅ **Dependências Isoladas**: node_modules separado por projeto
✅ **CLI Poderosa**: Interface de comandos para todas as operações
✅ **Persistência Automática**: Estado salvo automaticamente
✅ **Sistema de Eventos**: Hooks para integração

---

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
projeto-raiz/
├── .workspaces/                      # Workspaces de projetos
│   ├── manifest.json                 # Registro de todos os projetos
│   ├── shared-deps/                  # Dependências compartilhadas
│   │   ├── package.json
│   │   └── node_modules/
│   │
│   ├── project_1/                    # Workspace do projeto 1
│   │   ├── project.json              # Configuração do projeto
│   │   ├── .env                      # Variáveis de ambiente
│   │   ├── package.json              # Dependências
│   │   ├── node_modules/             # Dependências instaladas
│   │   ├── session/                  # Sessões (ex: WhatsApp)
│   │   ├── data/                     # Dados do projeto
│   │   └── logs/                     # Logs isolados
│   │
│   └── project_2/                    # Workspace do projeto 2
│       └── ...
│
├── src/
│   └── multi-project/                # Sistema multi-projeto
│       ├── index.js                  # API principal
│       ├── ProjectManager.js         # Gerenciador de projetos
│       ├── ContextManager.js         # Gerenciador de contexto
│       ├── ProjectCLI.js             # Interface CLI
│       ├── ConfigLoader.js           # Carregador de config
│       └── DependencyIsolator.js     # Isolador de deps
│
└── .env                              # Configuração global
```

---

## 🚀 Uso Básico

### 1. Importar o Sistema

```javascript
import { MultiProject, mp } from './src/multi-project/index.js';

// Usando API singleton
const result = await mp.create({
  id: 'whatsapp-cliente1',
  name: 'WhatsApp Cliente 1',
  description: 'Bot WhatsApp para o cliente X',
  type: 'whatsapp-bot',
  autoActivate: true
});

console.log(result.message); // "Projeto 'WhatsApp Cliente 1' criado e configurado"
```

### 2. Criar Projeto

```javascript
const project = await mp.create({
  id: 'projeto-exemplo',              // ID único (obrigatório)
  name: 'Meu Projeto',                // Nome amigável
  description: 'Descrição do projeto',
  type: 'general',                    // Tipo: general, whatsapp-bot, api, etc
  autoActivate: true,                 // Ativar automaticamente

  // Configurações do projeto
  config: {
    LOG_LEVEL: 'debug',
    TIMEOUT: '60000'
  },

  // Dependências npm
  dependencies: {
    'baileys': '^6.7.16',
    'dotenv': '^16.4.7'
  },

  devDependencies: {
    'nodemon': '^3.0.0'
  }
});
```

### 3. Listar Projetos

```javascript
const projects = await mp.list();

console.log(projects);
// [
//   {
//     id: 'whatsapp-cliente1',
//     name: 'WhatsApp Cliente 1',
//     type: 'whatsapp-bot',
//     status: 'active',
//     active: true,
//     createdAt: '2025-12-22T...',
//     updatedAt: '2025-12-22T...'
//   },
//   ...
// ]
```

### 4. Trocar Projeto Ativo (Switch)

```javascript
const result = await mp.activate('whatsapp-cliente2');

console.log(result.message); // "Projeto 'WhatsApp Cliente 2' ativado"
```

### 5. Obter Projeto Ativo

```javascript
const active = await mp.active();

console.log(active.project);
// {
//   id: 'whatsapp-cliente2',
//   name: 'WhatsApp Cliente 2',
//   status: 'active',
//   config: { sessionDir: '...', dataDir: '...', logsDir: '...' },
//   ...
// }
```

### 6. Instalar Dependências

```javascript
// Instalar todas as dependências do package.json
await mp.install();

// Adicionar nova dependência
await mp.add('axios', { version: '^1.6.0' });

// Adicionar dev dependency
await mp.add('jest', { version: 'latest', dev: true });
```

### 7. Estatísticas

```javascript
const stats = await mp.stats();

console.log(stats.stats);
// {
//   projects: {
//     total: 5,
//     active: 1,
//     inactive: 4,
//     byType: { 'whatsapp-bot': 3, 'api': 2 }
//   },
//   contexts: {
//     total: 5,
//     totalSessions: 12,
//     totalVariables: 45,
//     ...
//   }
// }
```

---

## 🎯 API Completa

### MultiProject (Classe Principal)

```javascript
import { MultiProject } from './src/multi-project/index.js';

const multiProject = new MultiProject(baseDir);
await multiProject.initialize();
```

#### Métodos Principais

```javascript
// Criar projeto
await multiProject.createProject(options);

// Ativar projeto
await multiProject.activateProject(projectId);

// Obter projeto ativo
await multiProject.getActiveProject();

// Obter configuração ativa
multiProject.getActiveConfig();

// Instalar dependências
await multiProject.installDependencies(['axios', 'express']);

// Adicionar dependência
await multiProject.addDependency('lodash', { version: '^4.17.21' });

// Executar comando CLI
await multiProject.executeCommand('list', { filter: { type: 'api' } });

// Estatísticas
await multiProject.getSystemStats();

// Exportar projeto
await multiProject.exportProject('projeto-id');

// Importar projeto
await multiProject.importProject('./backup/projeto.json');

// Listar projetos
await multiProject.listProjects();

// Deletar projeto
await multiProject.deleteProject('projeto-id', force: false);
```

---

### mp (API Simplificada)

Atalhos para operações comuns:

```javascript
import { mp } from './src/multi-project/index.js';

// Todas as operações retornam Promises
await mp.create(options);      // Criar projeto
await mp.activate(id);          // Ativar projeto
await mp.list();                // Listar projetos
await mp.active();              // Projeto ativo
await mp.install(packages);     // Instalar deps
await mp.add(pkg, options);     // Adicionar dep
await mp.stats();               // Estatísticas
await mp.exec(cmd, args);       // Executar comando
```

---

### ProjectManager

Gerencia ciclo de vida dos projetos:

```javascript
import { ProjectManager } from './src/multi-project/ProjectManager.js';

const pm = new ProjectManager(baseDir);
await pm.initialize();

// Criar projeto
await pm.createProject({ id, name, description, type, config });

// Listar projetos
pm.listProjects();

// Obter projeto
pm.getProject(projectId);

// Ativar projeto
await pm.activateProject(projectId);

// Obter projeto ativo
pm.getActiveProject();

// Atualizar projeto
await pm.updateProject(projectId, updates);

// Deletar projeto
await pm.deleteProject(projectId, { force: false });

// Estatísticas
pm.getStats();

// Exportar projeto
await pm.exportProject(projectId);

// Importar projeto
await pm.importProject(importPath);
```

---

### ContextManager

Gerencia contexto de execução:

```javascript
import { ContextManager } from './src/multi-project/ContextManager.js';

const cm = new ContextManager();

// Criar contexto
cm.createContext(projectId, initialState);

// Obter contexto
cm.getContext(projectId);

// Trocar contexto
cm.switchContext(projectId);

// Obter contexto ativo
cm.getActiveContext();

// Variáveis
cm.setVariable(projectId, key, value);
cm.getVariable(projectId, key, defaultValue);

// Sessões
cm.registerSession(projectId, sessionId, sessionData);
cm.unregisterSession(projectId, sessionId);

// Recursos
cm.addResource(projectId, resourceId, resource);
cm.removeResource(projectId, resourceId);

// Cache
cm.setCacheItem(projectId, key, value, ttl);
cm.getCacheItem(projectId, key);
cm.clearCache(projectId);

// Locks
cm.addLock(projectId, lockId);
cm.removeLock(projectId, lockId);
cm.isLocked(projectId, lockId);

// Limpar/destruir contexto
cm.clearContext(projectId, { keepVariables: false });
cm.destroyContext(projectId);

// Listar contextos
cm.listContexts();

// Estatísticas
cm.getStats();

// Histórico
cm.getHistory(limit);
```

**Eventos do ContextManager:**

```javascript
cm.on('context:created', ({ projectId, context }) => { ... });
cm.on('context:switched', ({ previous, current }) => { ... });
cm.on('context:updated', ({ projectId, context }) => { ... });
cm.on('context:variable:set', ({ projectId, key, value }) => { ... });
cm.on('context:session:registered', ({ projectId, sessionId }) => { ... });
cm.on('context:session:unregistered', ({ projectId, sessionId }) => { ... });
cm.on('context:resource:added', ({ projectId, resourceId }) => { ... });
cm.on('context:resource:removed', ({ projectId, resourceId }) => { ... });
cm.on('context:cache:set', ({ projectId, key }) => { ... });
cm.on('context:cache:cleared', ({ projectId, clearedItems }) => { ... });
cm.on('context:lock:added', ({ projectId, lockId }) => { ... });
cm.on('context:lock:removed', ({ projectId, lockId }) => { ... });
cm.on('context:cleared', ({ projectId, keepVariables }) => { ... });
cm.on('context:destroyed', ({ projectId }) => { ... });
```

---

### ConfigLoader

Sistema de configuração hierárquica:

```javascript
import { ConfigLoader } from './src/multi-project/ConfigLoader.js';

const cl = new ConfigLoader(baseDir);

// Carregar config global
await cl.loadGlobalConfig();

// Carregar config do projeto
await cl.loadProjectConfig(projectId, workspaceDir);

// Obter config mesclada (global + projeto + env)
const config = cl.getMergedConfig(projectId);

// Obter valor específico
const value = cl.get('LOG_LEVEL', 'info', projectId);

// Definir valor no projeto
await cl.set(projectId, 'API_KEY', 'abc123', workspaceDir);

// Remover valor
await cl.unset(projectId, 'API_KEY', workspaceDir);

// Listar configuração
cl.listProjectConfig(projectId);

// Validar configuração obrigatória
cl.validate(projectId, ['API_KEY', 'DATABASE_URL']);

// Criar template
await cl.createProjectConfigTemplate(projectId, workspaceDir, template);

// Clonar configuração
await cl.cloneConfig(sourceProjectId, targetProjectId, workspaceDir);
```

**Hierarquia de Configuração:**

1. **Defaults hardcoded** (menor prioridade)
2. **Configuração global** (`.env` na raiz)
3. **Configuração do projeto** (`.env` no workspace)
4. **Variáveis de ambiente do sistema** (maior prioridade)

---

### DependencyIsolator

Isolamento de dependências npm:

```javascript
import { DependencyIsolator } from './src/multi-project/DependencyIsolator.js';

const di = new DependencyIsolator(baseDir, workspaceDir);

// Inicializar
await di.initialize();

// Criar package.json
await di.createProjectPackageJson(projectId, options);

// Instalar dependências
await di.installProjectDependencies(projectId, { packages: ['axios'] });

// Adicionar dependência
await di.addDependency(projectId, 'lodash', { version: '^4.17.21' });

// Remover dependência
await di.removeDependency(projectId, 'lodash');

// Listar dependências
await di.listProjectDependencies(projectId);

// Verificar conflitos de versão
await di.checkVersionConflicts([projectId1, projectId2]);

// Link de deps compartilhadas
await di.linkSharedDependencies(projectId, ['baileys', 'dotenv']);

// Limpar node_modules
await di.cleanProjectDependencies(projectId);

// Tamanho de dependências
await di.getDependencySize(projectId);

// Atualizar dependências
await di.updateProjectDependencies(projectId, { latest: false });

// Verificar desatualizadas
await di.checkOutdatedDependencies(projectId);
```

---

### ProjectCLI

Interface de linha de comando:

```javascript
import { ProjectCLI } from './src/multi-project/ProjectCLI.js';

const cli = new ProjectCLI();
await cli.init();

// Executar comando
const result = await cli.execute('create', {
  id: 'novo-projeto',
  name: 'Meu Projeto',
  autoActivate: true
});

// Formatar resposta
console.log(cli.formatResponse(result));
```

**Comandos Disponíveis:**

```javascript
// Criar projeto
await cli.execute('create', { id, name, description, type, autoActivate });

// Listar projetos
await cli.execute('list', { filter: { type, status }, sort: 'name' });

// Trocar projeto
await cli.execute('switch', { id });

// Info do projeto
await cli.execute('info', { id });

// Atualizar projeto
await cli.execute('update', { id, name, description, config, metadata });

// Deletar projeto
await cli.execute('delete', { id, force: false });

// Estatísticas
await cli.execute('stats');

// Exportar projeto
await cli.execute('export', { id });

// Importar projeto
await cli.execute('import', { path });

// Info do contexto
await cli.execute('context', { id, includeDetails: false });
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Bot WhatsApp Multi-Cliente

```javascript
import { mp } from './src/multi-project/index.js';

// Criar projeto para cliente 1
await mp.create({
  id: 'whatsapp-cliente1',
  name: 'WhatsApp - Cliente ABC',
  type: 'whatsapp-bot',
  config: {
    ALLOWED_NUMBERS: '5511999999999',
    SESSION_NAME: 'cliente1-session'
  },
  dependencies: {
    'baileys': '^6.7.16',
    'qrcode-terminal': '^0.12.0'
  },
  autoActivate: true
});

// Usar projeto ativo
const config = await mp.active();
console.log(config.project.config.sessionDir); // .workspaces/whatsapp-cliente1/session

// Criar projeto para cliente 2
await mp.create({
  id: 'whatsapp-cliente2',
  name: 'WhatsApp - Cliente XYZ',
  type: 'whatsapp-bot',
  config: {
    ALLOWED_NUMBERS: '5511888888888',
    SESSION_NAME: 'cliente2-session'
  },
  dependencies: {
    'baileys': '^6.7.16',
    'qrcode-terminal': '^0.12.0'
  }
});

// Trocar entre clientes
await mp.activate('whatsapp-cliente1'); // Bot do cliente 1
// ... fazer operações do cliente 1

await mp.activate('whatsapp-cliente2'); // Bot do cliente 2
// ... fazer operações do cliente 2

// Listar todos os projetos
const projects = await mp.list();
console.log(`Total de clientes: ${projects.length}`);
```

### Exemplo 2: APIs com Diferentes Versões de Dependências

```javascript
// API v1 com Express 4
await mp.create({
  id: 'api-v1',
  name: 'API v1 (Legacy)',
  type: 'api',
  dependencies: {
    'express': '^4.18.0',
    'mongoose': '^6.0.0'
  }
});

// API v2 com Express 5
await mp.create({
  id: 'api-v2',
  name: 'API v2 (Nova)',
  type: 'api',
  dependencies: {
    'express': '^5.0.0',
    'mongoose': '^8.0.0'
  }
});

// Verificar conflitos
import { DependencyIsolator } from './src/multi-project/DependencyIsolator.js';
const di = new DependencyIsolator();
const conflicts = await di.checkVersionConflicts(['api-v1', 'api-v2']);

console.log(conflicts);
// {
//   hasConflicts: true,
//   conflicts: [
//     {
//       package: 'express',
//       versions: [
//         { projectId: 'api-v1', version: '^4.18.0' },
//         { projectId: 'api-v2', version: '^5.0.0' }
//       ]
//     }
//   ]
// }
```

### Exemplo 3: Ambientes de Desenvolvimento/Produção

```javascript
// Projeto em desenvolvimento
await mp.create({
  id: 'app-dev',
  name: 'App - Desenvolvimento',
  type: 'fullstack',
  config: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    DATABASE_URL: 'localhost:5432/app_dev'
  },
  devDependencies: {
    'nodemon': '^3.0.0',
    'jest': '^29.0.0'
  }
});

// Projeto em produção
await mp.create({
  id: 'app-prod',
  name: 'App - Produção',
  type: 'fullstack',
  config: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'error',
    DATABASE_URL: 'production-server:5432/app_prod'
  }
});

// Clonar configuração e modificar
import { ConfigLoader } from './src/multi-project/ConfigLoader.js';
const cl = new ConfigLoader();
await cl.cloneConfig('app-dev', 'app-staging', '.workspaces');
await cl.set('app-staging', 'NODE_ENV', 'staging', '.workspaces');
```

### Exemplo 4: Gerenciamento de Contexto

```javascript
import { ContextManager } from './src/multi-project/ContextManager.js';

const cm = new ContextManager();

// Criar contextos
cm.createContext('projeto-a');
cm.createContext('projeto-b');

// Salvar variáveis específicas do projeto
cm.setVariable('projeto-a', 'ULTIMO_DEPLOY', new Date().toISOString());
cm.setVariable('projeto-a', 'VERSAO', '1.2.3');

// Registrar sessão ativa
cm.registerSession('projeto-a', 'session-123', {
  userId: 'user-456',
  startedAt: Date.now()
});

// Adicionar recurso (ex: conexão de banco)
cm.addResource('projeto-a', 'db-connection', {
  host: 'localhost',
  port: 5432
});

// Cache de dados
cm.setCacheItem('projeto-a', 'user-data', { name: 'John' }, 60000); // TTL 60s

// Trocar contexto
cm.switchContext('projeto-b');

// Obter dados do contexto ativo
const activeCtx = cm.getActiveContext();
console.log(activeCtx.context.state.sessions.size); // 0 (projeto-b não tem sessões)

cm.switchContext('projeto-a');
const projectACtx = cm.getActiveContext();
console.log(projectACtx.context.state.sessions.size); // 1
```

### Exemplo 5: Exportar/Importar Projetos

```javascript
// Exportar projeto
const exportResult = await mp.exec('export', { id: 'whatsapp-cliente1' });
console.log(exportResult.exportPath);
// .workspaces/whatsapp-cliente1_export.json

// Importar projeto em outro servidor
await mp.exec('import', {
  path: './backup/whatsapp-cliente1_export.json'
});

// O projeto importado terá novo ID: whatsapp-cliente1_imported_1734912345678
```

---

## 🔧 Integração com Aplicação Existente

### Migrar para Multi-Projeto

#### ANTES (Projeto único):

```javascript
// src/index.js
import { config } from './config.js';
import { initWhatsApp } from './whatsapp.js';

const sock = await initWhatsApp(config.sessionName);
```

#### DEPOIS (Multi-projeto):

```javascript
// src/index.js
import { mp } from './multi-project/index.js';
import { initWhatsApp } from './whatsapp.js';

// Obter configuração do projeto ativo
const activeProject = await mp.active();
const config = activeProject.project.config;

// Usar sessionDir do projeto ativo
const sock = await initWhatsApp(config.sessionDir);
```

### Exemplo Completo: Bot WhatsApp Multi-Cliente

```javascript
// src/whatsapp-multi.js
import { mp } from './multi-project/index.js';
import { ContextManager } from './multi-project/ContextManager.js';
import makeWASocket from 'baileys';

const contextManager = new ContextManager();

// Função para iniciar bot de um projeto
async function startBotForProject(projectId) {
  // Ativar projeto
  await mp.activate(projectId);

  // Obter configuração
  const activeProject = await mp.active();
  const { sessionDir, allowedNumbers } = activeProject.project.config;

  // Criar socket WhatsApp
  const sock = makeWASocket({
    auth: { /* usar sessionDir */ },
    printQRInTerminal: true
  });

  // Registrar sessão no contexto
  contextManager.registerSession(projectId, sock.user.id, {
    socket: sock,
    allowedNumbers
  });

  // Eventos
  sock.ev.on('messages.upsert', async ({ messages }) => {
    // Processar mensagens apenas do projeto ativo
    const currentProject = await mp.active();
    if (currentProject.project.id !== projectId) return;

    // ... lógica de mensagens
  });

  return sock;
}

// Iniciar múltiplos bots
const clients = await mp.list();
for (const client of clients) {
  if (client.type === 'whatsapp-bot') {
    await startBotForProject(client.id);
    console.log(`✅ Bot iniciado para: ${client.name}`);
  }
}
```

---

## 📊 Monitoramento e Logs

### Logs Isolados por Projeto

Cada projeto tem seu próprio diretório de logs:

```
.workspaces/project_1/logs/
  ├── app.log
  ├── error.log
  └── access.log
```

### Implementar Logger por Projeto

```javascript
import fs from 'fs';
import path from 'path';
import { mp } from './multi-project/index.js';

async function getProjectLogger() {
  const active = await mp.active();
  const logsDir = active.project.config.logsDir;

  const logFile = path.join(logsDir, 'app.log');
  const errorFile = path.join(logsDir, 'error.log');

  return {
    info: (msg) => fs.appendFileSync(logFile, `[INFO] ${new Date().toISOString()} ${msg}\n`),
    error: (msg) => fs.appendFileSync(errorFile, `[ERROR] ${new Date().toISOString()} ${msg}\n`)
  };
}

// Uso
const logger = await getProjectLogger();
logger.info('Aplicação iniciada');
logger.error('Erro ao processar mensagem');
```

---

## 🛡️ Boas Práticas

### 1. Sempre Ativar Projeto Antes de Usar

```javascript
// ❌ ERRADO
const config = someProject.config;

// ✅ CORRETO
await mp.activate('projeto-id');
const active = await mp.active();
const config = active.project.config;
```

### 2. Validar Projeto Ativo

```javascript
const active = await mp.active();
if (!active.success) {
  console.error('Nenhum projeto ativo!');
  return;
}
```

### 3. Usar Contexto para Estado de Runtime

```javascript
import { ContextManager } from './multi-project/ContextManager.js';

const cm = new ContextManager();

// Salvar estado temporário no contexto
cm.setVariable('projeto-id', 'TEMP_DATA', { foo: 'bar' });

// Recuperar depois
const result = cm.getVariable('projeto-id', 'TEMP_DATA');
```

### 4. Limpar Recursos ao Desativar Projeto

```javascript
cm.on('context:switched', async ({ previous, current }) => {
  if (previous) {
    // Limpar recursos do projeto anterior
    const ctx = cm.getContext(previous);
    if (ctx.success) {
      // Fechar conexões, salvar estado, etc
      ctx.context.state.resources.forEach((resource) => {
        if (resource.data.close) resource.data.close();
      });
    }
  }
});
```

### 5. Exportar Projetos Regularmente

```javascript
// Backup automático
setInterval(async () => {
  const projects = await mp.list();
  for (const project of projects) {
    await mp.exec('export', { id: project.id });
  }
}, 24 * 60 * 60 * 1000); // Diário
```

---

## 🐛 Troubleshooting

### Problema: "Nenhum projeto ativo"

**Solução:**
```javascript
const projects = await mp.list();
if (projects.length > 0) {
  await mp.activate(projects[0].id);
}
```

### Problema: Conflitos de Dependências

**Solução:**
```javascript
import { DependencyIsolator } from './multi-project/DependencyIsolator.js';

const di = new DependencyIsolator();
const conflicts = await di.checkVersionConflicts(['proj1', 'proj2']);

if (conflicts.hasConflicts) {
  console.error('Conflitos encontrados:', conflicts.conflicts);
  // Resolver manualmente ou isolar completamente
}
```

### Problema: Contexto Não Muda

**Solução:**
```javascript
// Forçar recriação do contexto
import { ContextManager } from './multi-project/ContextManager.js';

const cm = new ContextManager();
cm.destroyContext('projeto-id');
cm.createContext('projeto-id');
cm.switchContext('projeto-id');
```

---

## 📚 Referências

- **Localização**: `src/multi-project/`
- **Docs**: Este arquivo (Knowledge Base)
- **Exemplos**: Ver seção "Exemplos de Uso"

---

## 🚀 Próximos Passos

1. **Criar primeiro projeto**: `await mp.create({ ... })`
2. **Ativar projeto**: `await mp.activate('projeto-id')`
3. **Integrar com aplicação**: Usar `mp.active()` para obter config
4. **Adicionar monitoramento**: Logs por projeto
5. **Configurar backups**: Exportar projetos regularmente

---

**IMPORTANTE**: SEMPRE consulte este documento na Knowledge Base antes de trabalhar com multi-projeto!

**Fonte**: SISTEMA_MULTI_PROJETO.md
