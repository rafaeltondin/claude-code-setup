---
title: "Dev — Licoes Aprendidas: React, Fastify, Prisma, Node.js, Service Worker"
category: "Dev"
tags: ["react", "fastify", "prisma", "nodejs", "service-worker", "typescript", "vite", "pwa", "erros-recorrentes"]
topic: "licoes-debug-fullstack"
priority: high
version: "1.0.0"
last_updated: "2026-03-28"
---

# Dev — Licoes Aprendidas: React, Fastify, Prisma, Node.js, Service Worker

> Documento gerado por `/aprender` em 2026-03-28.
> Sessao: Projeto dos Guri (fitness-api + fitness-web) + CRM task-scheduler.
> Consultar OBRIGATORIAMENTE antes de trabalhar com qualquer desses stacks.

---

## REGRAS DE OURO

1. **React Hooks NUNCA podem aparecer apos early returns** — violar isso causa React Error #310 em producao.
2. **Prisma campos array exigem sintaxe especial** — nunca passar string direta para campo `Type[]`.
3. **Fastify schema `oneOf` quebra com coercao ajv** — usar `anyOf`.
4. **Service Worker cacheia versoes antigas** — sempre bumpar `CACHE_NAME` apos mudancas criticas.
5. **CRM server.js nao se recupera sozinho** — se sumir, copiar de `~/.claude-clean/task-scheduler/`.

---

## React — Rules of Hooks

### ERRO: React Error #310 — Hook apos early return

**Contexto:** `useMemo`, `useState`, `useEffect` colocados APOS um `if (loading) return <Loading />`.

**Erro em producao:**
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```
Em producao React Error #310 aparece como tela branca sem mensagem clara.

**Causa:** React exige que todos os Hooks sejam chamados na mesma ordem a cada render. Early returns mudam a ordem de execucao.

**Solucao — mover TODOS os hooks para antes dos early returns:**
```tsx
// ERRADO
function Componente() {
  const [data, setData] = useState([]);

  if (loading) return <Loading />;   // early return aqui

  // BUG: este useMemo esta apos o early return
  const computed = useMemo(() => data.map(x => x.id), [data]);
  return <div>{computed}</div>;
}

// CORRETO
function Componente() {
  const [data, setData] = useState([]);

  // Todos os hooks ANTES de qualquer early return
  const computed = useMemo(() => data.map(x => x.id), [data]);

  if (loading) return <Loading />;
  return <div>{computed}</div>;
}
```

**Regra:** Ao revisar componente React, verificar se existe algum hook declarado apos qualquer `if/return`. Se sim, mover para o topo.

---

### ERRO: useMemo com nome de campo errado (typo silencioso)

**Contexto:** `ex.muscleGroup` (undefined) ao inves de `ex.muscleGroups` (array).

**Causa:** Campos de API retornam nomes plurais/singulares inconsistentes. Typos nao geram erro, apenas retornam `undefined` silenciosamente.

**Solucao:** Ao construir `useMemo` que processa dados de API, conferir o schema do backend antes de escrever o accessor.

```tsx
// ERRADO — muscleGroup e undefined, nao e o campo correto
const chartData = useMemo(() => exercises.flatMap(ex => ex.muscleGroup), [exercises]);

// CORRETO — muscleGroups e o campo array correto
const chartData = useMemo(() => exercises.flatMap(ex => ex.muscleGroups ?? []), [exercises]);
```

---

## Fastify — Schema Validation

### ERRO: `oneOf` quebra com coercao ajv no Fastify

**Contexto:** Schema de rota Fastify com `oneOf` para campo que aceita string ou array:

```js
// ERRADO — oneOf falha durante coercao de tipos ajv
schema: {
  body: {
    properties: {
      equipment: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ]
      }
    }
  }
}
```

**Erro:** `400 Bad Request` mesmo com payload valido, ou falha silenciosa de coercao.

**Solucao — usar `anyOf`:**
```js
// CORRETO
schema: {
  body: {
    properties: {
      equipment: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } }
        ]
      }
    }
  }
}
```

**Regra:** No Fastify (ajv), SEMPRE usar `anyOf` para campos polimorficos. `oneOf` tem semantica mais restrita e falha com coercao.

---

## Prisma — Array Fields

### ERRO: Passar string para campo `Type[]` no Prisma

**Contexto:** Campo declarado no schema como `equipment EquipmentType[]` no modelo Prisma.

**Erro:**
```
PrismaClientValidationError: Invalid value for argument `equipment`:
  Provided String, expected EquipmentType[].
```

**Causa:** O body da requisicao chegava como string (ex: `"BARBELL"`) em vez de array (`["BARBELL"]`).

**Solucao — converter string para array antes de passar ao Prisma:**
```js
// Utilitario de conversao
function toArray(val) {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  return [val]; // string → array de um elemento
}

// Uso no handler
await prisma.exercise.create({
  data: {
    ...body,
    equipment: toArray(body.equipment),
    muscleGroups: toArray(body.muscleGroups),
  }
});
```

**Regra:** SEMPRE converter campos array antes de passar ao Prisma. Criar utilitario `toArray()` e usar em CREATE e UPDATE.

---

### ERRO: Filtro incorreto para campo array no Prisma

**Contexto:** Filtrar registros onde campo array contem um valor especifico.

**Erro — filtro que nao funciona:**
```js
// ERRADO — busca por igualdade exata, nao "contém"
const exercises = await prisma.exercise.findMany({
  where: { equipment: body.equipment }
});
```

**Solucao — usar `has` para campos array:**
```js
// CORRETO — "equipment array contém o valor"
const exercises = await prisma.exercise.findMany({
  where: {
    equipment: { has: body.equipment }
  }
});

// Para multiplos valores (OR):
where: { equipment: { hasSome: ['BARBELL', 'DUMBBELL'] } }

// Para todos os valores (AND):
where: { equipment: { hasEvery: ['BARBELL', 'DUMBBELL'] } }
```

**Regra:** Campos `Type[]` no Prisma exigem operadores especiais: `has`, `hasSome`, `hasEvery`, `isEmpty`. Nunca usar igualdade direta.

---

## Service Worker / PWA

### ERRO: Service Worker cacheia URLs `chrome-extension://`

**Contexto:** Service Worker com estrategia cache-first tentava cachear URLs de extensoes Chrome.

**Erro:**
```
Failed to construct 'Request': Request cannot be constructed from a URL that includes credentials
```

**Solucao — filtrar URLs nao-HTTP:**
```js
// sw.js
self.addEventListener('fetch', event => {
  // Ignorar URLs que nao sao HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

---

### ERRO: Browser serve versao antiga apos deploy (cache staleness)

**Contexto:** Apos corrigir bug critico e fazer rsync para o servidor, usuarios (e o proprio Claude) continuam vendo a versao antiga.

**Causa:** Service Worker com `CACHE_NAME = 'app-cache-v1'` nao invalida o cache antigo quando o nome nao muda.

**Solucao — bumpar CACHE_NAME apos cada deploy critico:**
```js
// sw.js
const CACHE_NAME = 'app-cache-v2'; // incrementar a cada deploy importante

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
```

**Regra:** Apos corrigir bugs criticos no frontend: 1) bumpar CACHE_NAME no sw.js, 2) build, 3) rsync/deploy.

---

### ERRO: `public_html` dessincronizado do `dist` apos build

**Contexto:** Vite gera arquivos em `dist/`, mas o servidor serve de `public_html/`. Sem rsync, o servidor fica com versao antiga.

**Solucao — rsync obrigatorio apos cada build:**
```bash
npm run build && rsync -av --delete dist/ /caminho/para/public_html/
```

Ou via SSH:
```bash
npm run build && scp -r dist/* usuario@servidor:/var/www/dominio/public_html/
```

---

## Node.js / CRM task-scheduler

### ERRO: server.js deletado/ausente em `~/.claude/task-scheduler/`

**Contexto:** `node server.js` falha com `Cannot find module`.

**Causa:** Arquivo foi deletado acidentalmente ou nao foi copiado durante atualizacao.

**Solucao:**
```bash
# Copiar de backup limpo
cp ~/.claude-clean/task-scheduler/server.js ~/.claude/task-scheduler/server.js

# Se ~/.claude-clean nao existir, verificar git ou backup
ls ~/.claude-clean/task-scheduler/
```

**Regra:** `server.js` e o ponto de entrada do CRM local (porta 3847). Nunca editar sem backup. Manter `~/.claude-clean/` como fonte de verdade para recuperacao.

---

### ERRO: Frontend do CRM sem pasta `assets/` em `public/`

**Contexto:** CRM frontend (Vite/React em `crm-backend/frontend/`) nao buildado — `public/` tem apenas `index.html` sem `assets/`.

**Solucao:**
```bash
cd ~/.claude/task-scheduler/crm-backend/frontend
npm run build
# Gera: dist/ com index.html + assets/
# Copiar para public/:
cp -r dist/* ../public/
```

---

### ERRO: TypeScript nao compilado (sem pasta `dist/`)

**Contexto:** Backend TypeScript rodando diretamente com `ts-node` ou sem compilar — `dist/` ausente.

**Solucao:**
```bash
cd projeto-typescript/
npx tsc --skipLibCheck --noImplicitAny false
# Gera dist/ com .js compilados
```

---

### ERRO: Prisma client nao gerado

**Contexto:** `Cannot find module '.prisma/client'` ao importar `@prisma/client`.

**Solucao:**
```bash
npx prisma generate
# Se schema mudou:
npx prisma db push
npx prisma generate
```

**Regra:** Apos qualquer mudanca em `schema.prisma`, SEMPRE rodar `npx prisma generate` antes de testar.

---

### ERRO: `__dirname` resolvendo path relativo com `cd`

**Contexto:** Script Node.js usa `path.join(__dirname, '../config')` mas e executado com `cd outro/dir && node script.js`, causando path errado.

**Solucao — usar `path.resolve` com `__dirname`:**
```js
// ERRADO — depende do cwd
const configPath = path.join(process.cwd(), 'config');

// CORRETO — absoluto a partir do arquivo
const configPath = path.resolve(__dirname, '../config');
```

---

### ERRO: `APP_SECRET` ausente no `.env` causando falha silenciosa

**Contexto:** Servidor Node.js inicia mas falha em autenticacao porque `APP_SECRET` nao esta no `.env`.

**Solucao:** Ao configurar novo servidor Node.js, verificar variaveis obrigatorias:
```bash
# Checar quais variaveis o server.js usa
grep -E 'process\.env\.' server.js | sort | uniq
# Comparar com .env existente
```

---

### ERRO: try/catch silencioso esconde erros de require/import

**Contexto:**
```js
try {
  const tool = require('./tools/media.js');
} catch(e) {
  // silencio — nao loga nada
}
```
Modulo falhava ao carregar mas o erro era engolido.

**Solucao — sempre logar ao menos `e.message`:**
```js
try {
  const tool = require('./tools/media.js');
} catch(e) {
  console.error('[server] Falha ao carregar modulo:', e.message);
  // Decidir se e fatal (process.exit) ou apenas aviso
}
```

---

### ERRO: Portas ocupadas por instancias Node antigas

**Contexto:** `EADDRINUSE: address already in use :::3847`

**Solucao (Windows):**
```powershell
# Encontrar PID na porta
Get-NetTCPConnection -LocalPort 3847 | Select LocalPort, OwningProcess

# Matar o processo
Stop-Process -Id <PID> -Force
```

**Regra:** Antes de iniciar servidor, verificar se porta esta livre. Nao usar `killall node` (mata processos Docker/outros).

---

## SSH e Scripts

### ERRO: Heredoc SSH falha com aspas especiais no conteudo

**Contexto:** Tentativa de passar bloco de codigo com aspas simples/duplas via heredoc SSH inline.

**Erro:** Bash interpreta aspas dentro do heredoc e quebra o comando.

**Solucao — criar script local e enviar via SCP:**
```bash
# 1. Criar script localmente
cat > /tmp/fix-script.py << 'EOF'
# codigo python aqui sem escapar
config["key"] = "value with 'quotes'"
EOF

# 2. Enviar via SCP (1 conexao)
scp /tmp/fix-script.py root@servidor:/tmp/fix-script.py

# 3. Executar via SSH (1 conexao)
ssh root@servidor "python3 /tmp/fix-script.py && rm /tmp/fix-script.py"
```

**Regra:** Heredocs SSH sao frageis com caracteres especiais. Para scripts > 5 linhas: criar local → SCP → SSH. Max 2 conexoes SSH por operacao.

---

### ERRO: PowerShell nao aceita `!` como prefixo de comando

**Contexto:** Tentar usar `!comando` em PowerShell (sintaxe bash history expansion).

**Erro:** `The term '!Get-Process' is not recognized`

**Solucao — usar `&` operator ou chamar diretamente:**
```powershell
# ERRADO
!Get-Process node

# CORRETO — chamar diretamente ou usar & para blocos
Get-Process node
& { Get-Process node | Where-Object { $_.CPU -gt 10 } }
```

---

## Resumo de Checklist

Antes de deployar projeto fullstack (React + Node/Fastify + Prisma):

- [ ] Todos os React Hooks declarados antes de qualquer `if/return` no componente
- [ ] Campos array no Prisma com `toArray()` em CREATE e UPDATE
- [ ] Filtros de array no Prisma usando `has`/`hasSome`/`hasEvery`
- [ ] Schema Fastify usando `anyOf` (nao `oneOf`) para campos polimorficos
- [ ] `CACHE_NAME` do Service Worker bumpado se mudanca critica
- [ ] Service Worker filtra URLs nao-HTTP (`!request.url.startsWith('http')`)
- [ ] `npx prisma generate` rodado apos qualquer mudanca no schema
- [ ] `.env` tem todas as variaveis obrigatorias (grep `process.env.` no server.js)
- [ ] `rsync dist/ public_html/` apos cada build
- [ ] try/catch logando ao menos `e.message`
