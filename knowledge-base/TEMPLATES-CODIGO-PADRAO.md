# Templates de Código Padrão

Guia de referência com templates e padrões de código para logging, error handling, relatórios e convenções de nomenclatura utilizados em todos os projetos.

**Versão:** 1.0.0
**Data:** 15 de Fevereiro de 2026
**Categoria:** Desenvolvimento

---

## Índice

1. [CSS Design System Padrao](#css-design-system-padrao)
2. [Logging Backend Node.js/Express](#logging-backend-nodejsexpress)
3. [Logging Backend Python/FastAPI](#logging-backend-pythonfastapi)
4. [Logging Frontend React/Next.js](#logging-frontend-reactnextjs)
5. [Template de Relatório de Alterações](#template-de-relatorio-de-alteracoes)
6. [Template de Relatório com Validação](#template-de-relatorio-com-validacao)
7. [Padrões de Error Handling](#padroes-de-error-handling)
8. [Convenções de Nomenclatura](#convencoes-de-nomenclatura)

---

## CSS Design System Padrao

**REGRA CRITICA:** Todo codigo CSS produzido DEVE usar design tokens (CSS custom properties) para garantir consistencia visual. NUNCA usar valores hardcoded para cores, espacamentos, fontes, sombras ou border-radius.

### Design Tokens Obrigatorios

Todo projeto DEVE declarar estas variaveis no `:root`. Adaptar valores ao branding do projeto, mas MANTER a estrutura e nomes.

```css
:root {
  /* ══════════ CORES ══════════ */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-light: #DBEAFE;
  --color-secondary: #8B5CF6;
  --color-secondary-hover: #7C3AED;
  --color-accent: #F59E0B;

  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  --color-text: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-text-inverse: #FFFFFF;

  --color-bg: #FFFFFF;
  --color-bg-secondary: #F9FAFB;
  --color-bg-tertiary: #F3F4F6;
  --color-bg-dark: #111827;
  --color-border: #E5E7EB;
  --color-border-focus: #3B82F6;

  /* ══════════ TIPOGRAFIA ══════════ */
  --font-family: 'Inter', 'Poppins', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */
  --font-size-5xl: 3rem;       /* 48px */

  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ══════════ ESPACAMENTO ══════════ */
  /* Escala 4px: usar SOMENTE estes valores para margin/padding */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  --section-padding: 5rem;          /* Padding vertical de secoes */
  --section-padding-mobile: 3rem;
  --container-padding: 1.25rem;     /* Padding horizontal do container */

  /* ══════════ LAYOUT ══════════ */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1200px;
  --container-2xl: 1400px;
  --content-width: 65ch;  /* Largura ideal para leitura de texto */

  /* ══════════ BORDAS ══════════ */
  --radius-sm: 0.25rem;   /* 4px - inputs, badges */
  --radius-md: 0.5rem;    /* 8px - cards, buttons */
  --radius-lg: 0.75rem;   /* 12px - modals, dropdowns */
  --radius-xl: 1rem;      /* 16px - cards grandes */
  --radius-2xl: 1.5rem;   /* 24px - containers hero */
  --radius-full: 9999px;  /* Circulos, pills */

  /* ══════════ SOMBRAS ══════════ */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.3);  /* Ring de foco */

  /* ══════════ TRANSICOES ══════════ */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
  --transition-smooth: 400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ══════════ Z-INDEX ══════════ */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;

  /* ══════════ BREAKPOINTS (referencia, usar em @media) ══════════ */
  /* Mobile: < 640px */
  /* Tablet: 640px - 1023px */
  /* Desktop: 1024px - 1279px */
  /* Wide: >= 1280px */
}
```

### Reset e Base Obrigatorios

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { font-family: var(--font-family); font-size: var(--font-size-base); line-height: var(--line-height-normal); color: var(--color-text); background: var(--color-bg); -webkit-font-smoothing: antialiased; }
img, svg { display: block; max-width: 100%; height: auto; }
a { color: inherit; text-decoration: none; transition: color var(--transition-fast); }
button { cursor: pointer; font: inherit; border: none; background: none; }
ul, ol { list-style: none; }
input, textarea, select { font: inherit; color: inherit; }
```

### Container Padrao

```css
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--container-padding);
}
```

### Componentes Padrao

#### Botoes

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  cursor: pointer; border: none; text-decoration: none;
}
.btn-primary { background: var(--color-primary); color: var(--color-text-inverse); }
.btn-primary:hover { background: var(--color-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn-secondary { background: transparent; color: var(--color-primary); border: 2px solid var(--color-primary); }
.btn-secondary:hover { background: var(--color-primary); color: var(--color-text-inverse); }
.btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--font-size-xs); }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: var(--font-size-base); }
```

#### Cards

```css
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.card-header { padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-4); }
.card-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); }
.card-body { font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); }
```

#### Inputs e Forms

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}
.input:focus { border-color: var(--color-border-focus); box-shadow: var(--shadow-focus); }
.input::placeholder { color: var(--color-text-muted); }
.input-error { border-color: var(--color-error); }
.input-error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3); }

.label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.form-group { margin-bottom: var(--space-5); }
.form-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-1); }
.form-error { font-size: var(--font-size-xs); color: var(--color-error); margin-top: var(--space-1); }
```

#### Badges e Tags

```css
.badge {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full); line-height: 1;
}
.badge-success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); }
.badge-warning { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
.badge-error { background: rgba(239, 68, 68, 0.1); color: var(--color-error); }
.badge-info { background: rgba(59, 130, 246, 0.1); color: var(--color-info); }
```

#### Tipografia

```css
h1 { font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
h2 { font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
h3 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); }
h4 { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
h5 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); }
h6 { font-size: var(--font-size-base); font-weight: var(--font-weight-medium); }
p { margin-bottom: var(--space-4); max-width: var(--content-width); }
small { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
```

#### Grid e Flexbox Utilitarios

```css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }

.grid { display: grid; gap: var(--space-6); }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 1023px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 639px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }
```

#### Secoes

```css
section {
  padding-block: var(--section-padding);
}
@media (max-width: 639px) {
  section { padding-block: var(--section-padding-mobile); }
  h1 { font-size: var(--font-size-3xl); }
  h2 { font-size: var(--font-size-2xl); }
  h3 { font-size: var(--font-size-xl); }
}
```

### Regras de Uso (OBRIGATORIO!)

| # | Regra | Exemplo Correto | Exemplo Errado |
|---|-------|-----------------|----------------|
| 1 | **SEMPRE** usar variaveis para cores | `color: var(--color-primary)` | `color: #3B82F6` |
| 2 | **SEMPRE** usar escala de espacamento | `padding: var(--space-4)` | `padding: 15px` |
| 3 | **SEMPRE** usar escala de fontes | `font-size: var(--font-size-lg)` | `font-size: 17px` |
| 4 | **SEMPRE** usar escala de radius | `border-radius: var(--radius-md)` | `border-radius: 6px` |
| 5 | **SEMPRE** usar escala de sombras | `box-shadow: var(--shadow-md)` | `box-shadow: 0 3px 8px rgba(...)` |
| 6 | **SEMPRE** usar transicoes padrao | `transition: all var(--transition-base)` | `transition: all 0.25s ease` |
| 7 | **SEMPRE** usar z-index da escala | `z-index: var(--z-modal)` | `z-index: 9999` |
| 8 | **NUNCA** misturar px com rem | Escolher rem para layout, px para detalhes (1px borders) | `margin: 1rem 15px 2rem 20px` |
| 9 | **NUNCA** inventar espacamentos fora da escala | `gap: var(--space-6)` (24px) | `gap: 22px` |
| 10 | **SEMPRE** responsivo mobile-first | `@media (min-width: 640px)` para desktop | Media queries max-width |

### Quando Adaptar os Tokens

- **Cores:** Mudar valores hex para match com branding do projeto, manter nomes
- **Fontes:** Trocar font-family por fonte do projeto, manter escala de tamanhos
- **Espacamentos:** Manter escala 4px intacta, ajustar section-padding se necessario
- **Componentes:** Customizar aparencia mantendo a estrutura de tokens

---

## Logging Backend Node.js/Express

Template padrão para funções assíncronas em Node.js com Express, incluindo requestId, timing, try/catch e logs estruturados.

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Logger configurado (Winston, Pino, ou console)
const logger = console; // Substituir por logger real

const app = express();

// Middleware de requestId
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// Template de rota com logging completo
app.post('/api/recurso', async (req, res) => {
  const requestId = req.id;
  const startTime = Date.now();

  logger.info(`[${requestId}] Iniciando processamento de recurso`, {
    requestId,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    // Validação
    const { campo1, campo2 } = req.body;
    if (!campo1 || !campo2) {
      logger.warn(`[${requestId}] Validação falhou`, {
        requestId,
        missingFields: { campo1: !campo1, campo2: !campo2 }
      });
      return res.status(400).json({
        error: 'Campos obrigatórios faltando',
        requestId
      });
    }

    // Processamento
    logger.info(`[${requestId}] Processando dados`, {
      requestId,
      campo1,
      campo2
    });

    const resultado = await processarRecurso(campo1, campo2);

    // Sucesso
    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Recurso processado com sucesso`, {
      requestId,
      duration,
      resultado: resultado.id
    });

    res.json({
      success: true,
      data: resultado,
      requestId,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Erro ao processar recurso`, {
      requestId,
      error: error.message,
      stack: error.stack,
      duration
    });

    res.status(500).json({
      error: 'Erro interno ao processar recurso',
      message: error.message,
      requestId,
      duration
    });
  }
});

async function processarRecurso(campo1, campo2) {
  // Implementação
  return { id: 'recurso-123', campo1, campo2 };
}

app.listen(3000, () => {
  logger.info('Servidor iniciado na porta 3000');
});
```

**Regras:**
- **SEMPRE** incluir `requestId` em todos os logs
- **SEMPRE** incluir `startTime` e calcular `duration` no final
- **SEMPRE** usar try/catch em funções async
- **SEMPRE** logar início, sucesso e erro com contexto relevante
- **NUNCA** logar credenciais, tokens ou dados sensíveis

---

## Logging Backend Python/FastAPI

Template padrão para rotas FastAPI com logging estruturado, requestId e error handling.

```python
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import logging
import time
import uuid
from datetime import datetime

# Configurar logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Modelo de request
class RecursoRequest(BaseModel):
    campo1: str
    campo2: str

# Middleware de requestId
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.id
    return response

# Template de rota com logging completo
@app.post("/api/recurso")
async def criar_recurso(request: Request, dados: RecursoRequest):
    request_id = request.state.id
    start_time = time.time()

    logger.info(
        f"[{request_id}] Iniciando processamento de recurso",
        extra={
            "request_id": request_id,
            "body": dados.dict(),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    try:
        # Validação (já feita pelo Pydantic, mas validações adicionais aqui)
        if not dados.campo1.strip() or not dados.campo2.strip():
            logger.warning(
                f"[{request_id}] Validação falhou - campos vazios",
                extra={"request_id": request_id}
            )
            raise HTTPException(
                status_code=400,
                detail="Campos não podem estar vazios"
            )

        # Processamento
        logger.info(
            f"[{request_id}] Processando dados",
            extra={
                "request_id": request_id,
                "campo1": dados.campo1,
                "campo2": dados.campo2
            }
        )

        resultado = await processar_recurso(dados.campo1, dados.campo2)

        # Sucesso
        duration = (time.time() - start_time) * 1000  # ms
        logger.info(
            f"[{request_id}] Recurso processado com sucesso",
            extra={
                "request_id": request_id,
                "duration_ms": duration,
                "resultado_id": resultado["id"]
            }
        )

        return {
            "success": True,
            "data": resultado,
            "request_id": request_id,
            "duration_ms": duration
        }

    except HTTPException:
        raise
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(
            f"[{request_id}] Erro ao processar recurso",
            extra={
                "request_id": request_id,
                "error": str(e),
                "duration_ms": duration
            },
            exc_info=True
        )

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Erro interno ao processar recurso",
                "message": str(e),
                "request_id": request_id,
                "duration_ms": duration
            }
        )

async def processar_recurso(campo1: str, campo2: str):
    # Implementação
    return {"id": "recurso-123", "campo1": campo1, "campo2": campo2}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Regras:**
- **SEMPRE** incluir `request_id` em todos os logs
- **SEMPRE** usar `extra` dict para contexto estruturado
- **SEMPRE** calcular `duration_ms` no final
- **SEMPRE** usar `exc_info=True` em logs de erro para stack trace
- **NUNCA** logar dados sensíveis

---

## Logging Frontend React/Next.js

Template de logger customizado para frontend com suporte a diferentes níveis de log e tracking de requests API.

```javascript
// utils/logger.js
const isDev = process.env.NODE_ENV === 'development';

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  info(message, data = {}) {
    if (isDev) {
      console.log(`[${this.context}] ${message}`, data);
    }
  }

  warn(message, data = {}) {
    console.warn(`[${this.context}] ${message}`, data);
  }

  error(message, error = null, data = {}) {
    console.error(`[${this.context}] ${message}`, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      ...data
    });

    // Enviar para serviço de monitoring (Sentry, LogRocket, etc)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          custom: { context: this.context, ...data }
        }
      });
    }
  }

  api = {
    request: (method, url, data = {}) => {
      if (isDev) {
        console.log(`[${this.context}] API Request: ${method} ${url}`, data);
      }
    },

    response: (method, url, status, data = {}, duration = 0) => {
      if (isDev) {
        console.log(
          `[${this.context}] API Response: ${method} ${url} - ${status} (${duration}ms)`,
          data
        );
      }
    },

    error: (method, url, error, duration = 0) => {
      console.error(
        `[${this.context}] API Error: ${method} ${url} (${duration}ms)`,
        {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      );
    }
  };
}

export function createLogger(context) {
  return new Logger(context);
}

export default new Logger('App');
```

**Uso em componente:**

```javascript
// components/MeuComponente.jsx
import { createLogger } from '@/utils/logger';

const logger = createLogger('MeuComponente');

export default function MeuComponente() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    logger.info('Componente montado');
    fetchData();

    return () => {
      logger.info('Componente desmontado');
    };
  }, []);

  async function fetchData() {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    logger.api.request('GET', '/api/dados');

    try {
      const response = await fetch('/api/dados');
      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      logger.api.response('GET', '/api/dados', response.status, result, duration);

      setData(result);
      logger.info('Dados carregados com sucesso', { count: result.length });

    } catch (err) {
      const duration = Date.now() - startTime;
      logger.api.error('GET', '/api/dados', err, duration);
      setError(err.message);

    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!data) return null;

  return <div>{/* Renderizar dados */}</div>;
}
```

**Regras:**
- **SEMPRE** criar logger com contexto (nome do componente/hook)
- **SEMPRE** logar início e fim de operações assíncronas
- **SEMPRE** logar requests API com método, URL e duração
- **SEMPRE** usar try/catch em async operations
- **NUNCA** logar tokens, passwords ou PII em produção

---

## Template de Relatório de Alterações

Template padrão para relatórios de modificações em projetos, usado após completar uma tarefa.

```
╔════════════════════════════════════════════════════════════════╗
║            RELATÓRIO DE ALTERAÇÕES - [NOME DA TAREFA]          ║
╚════════════════════════════════════════════════════════════════╝

📋 RESUMO
─────────────────────────────────────────────────────────────────
Descrição concisa do que foi implementado/modificado e por quê.
Objetivo principal da tarefa e como foi alcançado.

📁 ARQUIVOS
─────────────────────────────────────────────────────────────────
✅ Criados:
  • /caminho/absoluto/arquivo1.js - Descrição breve
  • /caminho/absoluto/arquivo2.py - Descrição breve

✏️  Modificados:
  • /caminho/absoluto/arquivo3.jsx - O que mudou
  • /caminho/absoluto/arquivo4.ts - O que mudou

🗑️  Removidos:
  • /caminho/absoluto/arquivo5.old - Por que foi removido

📦 DEPENDÊNCIAS
─────────────────────────────────────────────────────────────────
Adicionadas:
  • pacote@versao - Para que serve

Atualizadas:
  • pacote@versao-antiga → versao-nova - Motivo

Comandos para instalar:
  npm install pacote1 pacote2
  pip install pacote3==1.2.3

🔧 VARIÁVEIS DE AMBIENTE
─────────────────────────────────────────────────────────────────
Novas variáveis necessárias em .env:

  NOME_VARIAVEL=valor_exemplo  # Descrição da variável
  API_KEY=xxx                  # Chave de API do serviço X

⚠️  PONTOS DE ATENÇÃO
─────────────────────────────────────────────────────────────────
  • Ponto importante 1 que requer ação manual
  • Configuração adicional necessária
  • Breaking change que afeta funcionalidade X

✅ TESTES REALIZADOS
─────────────────────────────────────────────────────────────────
  ✓ Teste manual: Descrição do que foi testado
  ✓ Teste unitário: npm test passou
  ✓ Lint: ESLint sem erros
  ✓ Build: Compilação bem-sucedida

🔄 PRÓXIMOS PASSOS
─────────────────────────────────────────────────────────────────
  1. Ação sugerida para melhorar/expandir
  2. Tarefa relacionada pendente
  3. Otimização futura recomendada

───────────────────────────────────────────────────────────────────
Gerado em: DD/MM/YYYY HH:MM
Fonte KB: [documento-relevante.md] (se aplicável)
```

**Quando usar:**
- Após completar qualquer tarefa de desenvolvimento
- Antes de finalizar uma sessão de trabalho
- Ao entregar código para revisão

**Regras:**
- **SEMPRE** usar caminhos absolutos para arquivos
- **SEMPRE** incluir comandos de instalação prontos para executar
- **SEMPRE** listar breaking changes em Pontos de Atenção
- **SEMPRE** incluir fonte KB se consultada

---

## Template de Relatório com Validação

Template expandido incluindo seção de validação automatizada com Frontend Analyzer, testes e verificações de qualidade.

```
╔════════════════════════════════════════════════════════════════╗
║      RELATÓRIO DE ALTERAÇÕES COM VALIDAÇÃO - [TAREFA]         ║
╚════════════════════════════════════════════════════════════════╝

📋 RESUMO
─────────────────────────────────────────────────────────────────
[Descrição da implementação]

📁 ARQUIVOS
─────────────────────────────────────────────────────────────────
✅ Criados:
  • /caminho/absoluto/arquivo1.html - Landing page responsiva

✏️  Modificados:
  • /caminho/absoluto/config.json - Adicionada configuração X

📦 DEPENDÊNCIAS
─────────────────────────────────────────────────────────────────
Nenhuma dependência adicionada (arquivo HTML único)

🔍 VALIDAÇÃO AUTOMATIZADA
─────────────────────────────────────────────────────────────────

Frontend Analyzer:
  ✅ Score Geral: 85/100 (Meta: ≥70) ✓
  ✅ Acessibilidade: 90/100 (Meta: ≥80) ✓
  ✅ Performance: 80/100
  ✅ SEO: 85/100
  ⚠️  Problemas CRITICAL: 0
  ⚠️  Problemas HIGH: 2 (descritos abaixo)

  Comando executado:
  cd C:\Users\sabola\.claude\frontend-analyzer && \
  node src/index.js --path "D:\landing-page\index.html" --format json

Testes Automatizados:
  ✅ Sintaxe HTML: Válida (W3C Validator)
  ✅ Console Errors: 0 erros JavaScript
  ✅ Network Requests: 100% sucesso (0 falhas 4xx/5xx)
  ✅ Responsive: Testado mobile/tablet/desktop

Linting e Build:
  ✅ ESLint: 0 erros, 0 warnings
  ✅ TypeScript: Compilação sem erros
  ⚠️  Lighthouse: LCP 2.8s (meta <2.5s) - otimização recomendada

Segurança:
  ✅ npm audit: 0 vulnerabilidades
  ✅ HTTPS: Forçado via meta tag
  ✅ CSP: Content-Security-Policy configurado

📊 PROBLEMAS ENCONTRADOS
─────────────────────────────────────────────────────────────────
HIGH - Imagem hero sem atributo 'alt'
  Arquivo: index.html:45
  Solução: Adicionar alt="Descrição da imagem"

HIGH - Contraste insuficiente em botão secundário
  Arquivo: index.html (CSS linha 120)
  Solução: Alterar cor de #888 para #666 (contraste 4.5:1)

⚠️  PONTOS DE ATENÇÃO
─────────────────────────────────────────────────────────────────
  • Otimizar imagens para WebP (reduzir LCP)
  • Adicionar atributos alt faltantes
  • Melhorar contraste de cores conforme WCAG AA

✅ TESTES MANUAIS REALIZADOS
─────────────────────────────────────────────────────────────────
  ✓ Navegação: Todos links funcionando
  ✓ Formulário: Validação e envio OK
  ✓ Responsividade: 320px até 2560px
  ✓ Cross-browser: Chrome, Firefox, Safari, Edge

🔄 PRÓXIMOS PASSOS
─────────────────────────────────────────────────────────────────
  1. Corrigir problemas HIGH do Frontend Analyzer
  2. Otimizar imagens para WebP
  3. Implementar lazy loading em imagens abaixo da dobra
  4. Configurar analytics (Google Analytics 4)

───────────────────────────────────────────────────────────────────
Gerado em: 15/02/2026 14:30
Frontend Analyzer: APROVADO (Score ≥70, A11y ≥80)
Fonte KB: LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md
```

**Critérios de Aprovação:**
- ✅ Score Geral Frontend Analyzer: **≥70**
- ✅ Acessibilidade: **≥80** (WCAG AA)
- ✅ Problemas CRITICAL: **0**
- ✅ Console Errors: **0**
- ✅ Network 4xx/5xx: **0**

**Quando usar:**
- Desenvolvimento frontend (HTML/CSS/JS/React/Next.js)
- Landing pages
- Aplicações web completas
- Antes de deploy em produção

---

## Padrões de Error Handling

### Node.js/Express

```javascript
// Error handler middleware (sempre no FINAL de app.js)
app.use((err, req, res, next) => {
  const requestId = req.id || 'unknown';

  logger.error(`[${requestId}] Unhandled error`, {
    requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Não vazar detalhes em produção
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'Internal Server Error' : err.message,
    requestId,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });
  // Não fazer process.exit(1) - deixar PM2/Docker reiniciar
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1); // Fatal - precisa reiniciar
});
```

### Python/FastAPI

```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)
app = FastAPI()

# Handler para erros de validação
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, 'id', 'unknown')
    logger.warning(
        f"[{request_id}] Validation error",
        extra={
            "request_id": request_id,
            "errors": exc.errors(),
            "body": exc.body
        }
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed",
            "details": exc.errors(),
            "request_id": request_id
        }
    )

# Handler global para exceções não tratadas
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, 'id', 'unknown')
    logger.error(
        f"[{request_id}] Unhandled exception",
        extra={
            "request_id": request_id,
            "url": str(request.url),
            "method": request.method
        },
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "request_id": request_id
        }
    )
```

### React/Next.js

```javascript
// components/ErrorBoundary.jsx
import React from 'react';
import logger from '@/utils/logger';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Algo deu errado</h2>
          <p>Por favor, recarregue a página.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre>{this.state.error?.toString()}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// pages/_app.jsx (Next.js)
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

export default MyApp;
```

**Regras Gerais:**
- **SEMPRE** usar try/catch em async functions
- **SEMPRE** logar erros com contexto (requestId, URL, method)
- **NUNCA** vazar stack traces em produção
- **SEMPRE** retornar mensagens de erro amigáveis ao usuário
- **SEMPRE** implementar error boundaries em React

---

## Convenções de Nomenclatura

### Arquivos e Pastas

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componente React | PascalCase | `MeuComponente.jsx` |
| Utilitário/Helper | camelCase | `formatDate.js` |
| Página Next.js | kebab-case | `sobre-nos.jsx` |
| API Route | kebab-case | `user-profile.js` |
| Tipo TypeScript | PascalCase | `UserProfile.ts` |
| Teste | mesmo nome + `.test` | `MeuComponente.test.jsx` |
| Estilo CSS | kebab-case | `main-header.css` |
| Pasta | kebab-case | `user-management/` |

### Variáveis e Funções

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Variável | camelCase | `userName`, `isLoading` |
| Constante global | SCREAMING_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| Função | camelCase | `fetchUserData()`, `handleClick()` |
| Classe | PascalCase | `UserService`, `ApiClient` |
| Interface TypeScript | PascalCase com `I` opcional | `User` ou `IUser` |
| Type TypeScript | PascalCase | `ResponseData` |
| Enum | PascalCase | `UserRole` |
| Private (Python) | `_prefixo` | `_internal_method()` |
| Booleanos | `is`, `has`, `should` prefix | `isActive`, `hasPermission` |

### Git Commits

Seguir Conventional Commits:

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Alteração em documentação
- `style`: Formatação, sem mudança de lógica
- `refactor`: Refatoração sem adicionar feature/fix
- `test`: Adicionar/modificar testes
- `chore`: Alterações em build, configs, etc

**Exemplos:**
```
feat(auth): adicionar login com Google OAuth
fix(api): corrigir timeout em requests longos
docs(readme): atualizar instruções de instalação
refactor(user): extrair lógica de validação para helper
```

### Branches Git

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Feature | `feature/<nome>` | `feature/login-oauth` |
| Bugfix | `fix/<nome>` | `fix/memory-leak-webhook` |
| Hotfix | `hotfix/<nome>` | `hotfix/critical-auth-bug` |
| Release | `release/<versao>` | `release/v1.2.0` |
| Documentação | `docs/<nome>` | `docs/api-reference` |

### Versionamento (Semantic Versioning)

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (incompatível com versão anterior)
MINOR: Nova funcionalidade (compatível)
PATCH: Correção de bug (compatível)
```

**Exemplos:**
- `1.0.0` → `1.0.1`: Correção de bug
- `1.0.1` → `1.1.0`: Nova feature
- `1.1.0` → `2.0.0`: Breaking change

### Docker Images

```
<usuario>/<repositorio>:<tag>

Tags:
- latest: Última versão estável
- v1.2.3: Versão específica (semantic versioning)
- dev: Branch de desenvolvimento
- staging: Branch de staging
```

**Exemplos:**
```
rafaeltondin/meu-app:latest
rafaeltondin/meu-app:v1.2.3
rafaeltondin/meu-app:dev
```

### Variáveis de Ambiente

| Convenção | Exemplo |
|-----------|---------|
| SCREAMING_SNAKE_CASE | `API_BASE_URL`, `DATABASE_URL` |
| Prefixo por serviço | `SHOPIFY_ACCESS_TOKEN`, `FB_APP_ID` |
| Sufixo para tipo | `_URL`, `_KEY`, `_SECRET`, `_TOKEN` |

**Exemplos:**
```bash
# API Keys
OPENROUTER_API_KEY=sk-...
EVOLUTION_API_KEY=...

# URLs
API_BASE_URL=https://api.exemplo.com
DATABASE_URL=postgresql://user:pass@host/db

# Configurações
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

---

## Regras de Aplicação

### Para Agentes:
1. **SEMPRE** consultar este documento antes de criar código
2. **SEMPRE** aplicar o template de logging correspondente à linguagem
3. **SEMPRE** gerar relatório usando o template apropriado
4. **SEMPRE** seguir convenções de nomenclatura
5. **NUNCA** criar código sem error handling adequado

### Para Revisão:
- Código sem try/catch em async → ❌ Rejeitar
- Logs sem requestId → ❌ Rejeitar
- Nomenclatura inconsistente → ❌ Rejeitar
- Relatório incompleto → ❌ Rejeitar
- Frontend sem validação → ❌ Rejeitar

### Para Referência Rápida:

| Preciso de... | Consultar Seção... |
|---------------|-------------------|
| Template de API Node.js | [Logging Backend Node.js/Express](#logging-backend-nodejsexpress) |
| Template de API Python | [Logging Backend Python/FastAPI](#logging-backend-pythonfastapi) |
| Logger para React | [Logging Frontend React/Next.js](#logging-frontend-reactnextjs) |
| Formato de relatório | [Template de Relatório](#template-de-relatorio-de-alteracoes) |
| Relatório com testes | [Template com Validação](#template-de-relatorio-com-validacao) |
| Como tratar erros | [Padrões de Error Handling](#padroes-de-error-handling) |
| Como nomear arquivos | [Convenções de Nomenclatura](#convencoes-de-nomenclatura) |

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-13 - Bloco `/* */` dentro de comentário JSDoc quebra o parser Node.js
**Contexto:** Criação de `motion-gen.js` com JSDoc descrevendo contrato de HTML
**Erro:** Escrever `/** ... usar: const T = window.__MOTION_T || { /* fallback */ }; ... */` — o `*/` dentro do string do comentário fecha o JSDoc prematuramente, causando `SyntaxError: Unexpected token '}'`
**Solução:** Substituir `/* fallback */` por texto plano: `{ t1s:0, t1e:5, ... fallback ... }` ou usar `//` inline
**Regra:** NUNCA colocar `/* */` dentro de comentários JSDoc (`/** ... */`). O parser Node.js encerra o bloco ao encontrar o primeiro `*/`. Usar `//` ou texto plano nesses casos.

### 2026-03-13 - Resolver dependências de projeto em ferramenta CLI externa (createRequire)
**Contexto:** `capture-fast.mjs` em `~/.claude/tools/motion-gen/lib/` importando `puppeteer` que está no `node_modules` do projeto HTML (`~/.claude/temp/betpredict-motion/`)
**Erro:** `Cannot find package 'puppeteer' imported from ~/.claude/tools/motion-gen/lib/capture-fast.mjs`
**Solução:** Usar `createRequire` do Node.js para resolver o módulo a partir do diretório do projeto:
```javascript
import { createRequire } from 'module';
function loadPuppeteer(projectDir) {
  const req = createRequire(path.join(projectDir, 'dummy.js'));
  return req('puppeteer');
}
```
Passar `htmlDir` (diretório do HTML do usuário) para a função de captura.
**Regra:** Ferramentas CLI em `~/.claude/tools/` NUNCA devem assumir que dependências pesadas (puppeteer, playwright, etc.) estão instaladas nelas. Sempre resolver via `createRequire` do diretório do projeto do usuário.

### 2026-03-18 - Express: Rotas estáticas interceptadas por parâmetros dinâmicos
**Contexto:** Adicionei endpoint `POST /api/scheduled-tasks/cleanup` após rotas `/:id/run` e `/:id`.
**Erro:** Express interpretou "cleanup" como valor do parâmetro `:id`, retornando 404.
**Solução:** Mover rotas estáticas (`/cleanup`, `/launch`, `/status`) ANTES das rotas com `/:id`.
**Regra:** Em Express, rotas estáticas SEMPRE devem ser declaradas ANTES de rotas com parâmetros dinâmicos. A ordem de `app.get/post/put/delete` importa.

### 2026-03-22 - ESM JavaScript: variáveis const em switch/case não podem ser reatribuídas
**Contexto:** No adapter `openai-to-cli.js` do claude-max-api-proxy, a variável `content` era declarada com `const` via destructuring no escopo do for loop. Dentro de um `case "system":` tentava-se fazer `content += "bloco injetado"`.
**Erro:** `500 Assignment to constant variable` ao tentar modificar a variável no case do switch.
**Solução:** Criar nova variável com `let` antes de modificar:
```javascript
// ERRADO
const { content } = message;  // const — não pode reatribuir
switch (message.role) {
  case 'system':
    content += '\n\nbloco extra';  // TypeError: Assignment to constant variable
}

// CORRETO
const { content } = message;
let sysContent = content;  // nova variável let
switch (message.role) {
  case 'system':
    sysContent += '\n\nbloco extra';  // funciona
    return { ...message, content: sysContent };
}
```
**Regra:** Em ESM JavaScript (e CommonJS), variáveis declaradas com `const` via destructuring ou diretamente NUNCA podem ser reatribuídas. Em switch/case, SEMPRE criar nova variável com `let` antes de modificar o valor. Nunca tentar usar `+=` ou `=` em um `const`.

---

## Templates de Landing Page Completos

Templates self-contained (arquivo unico HTML) prontos para customizacao.

| Template | Estilo | Arquivo | Tamanho | Secoes |
|----------|--------|---------|---------|--------|
| **Riwer Labs** | Dark tech/agency, neon verde-limao | `knowledge-base/templates/template-riwerlabs-landing-page.html` | ~172KB | 11 secoes (hero, problema, historia, numeros, solucoes, processo, cases, depoimentos, diferenciais, FAQ, CTA) |

**Uso:** Copiar o template, customizar textos/cores/imagens. Detalhes completos em `LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md` (Parte 26).

---

## Shopify Custom Liquid — Banner com Texto Sobreposto

Template aprovado para banners Shopify com imagem desktop + mobile e texto overlay.

**Características:**
- Quebra o container do tema para ocupar 100vw
- Desktop: texto à direita, centralizado na vertical
- Mobile: texto sobreposto na parte inferior da imagem (sem barra extra)
- Fonte: Montserrat (400/600/700/900)
- Texto preto `#1a1a1a` sobre fundo claro
- Hierarquia: eyebrow fino → título black → corpo regular → produto semibold/black

**Como usar:** Shopify Admin → Online Store → Themes → Customize → Add section → Custom Liquid

```liquid
{% comment %} Banner com texto sobreposto — Desktop direita / Mobile baixo na imagem {% endcomment %}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">

<div class="bp-wrap">
  <div class="bp-inner">

    <picture>
      <source
        media="(max-width: 767px)"
        srcset="URL_BANNER_MOBILE"
      >
      <img
        class="bp-img"
        src="URL_BANNER_DESKTOP"
        alt="Descrição do banner"
        loading="lazy"
      >
    </picture>

    <div class="bp-content">
      <p class="bp-eyebrow">EYEBROW</p>
      <h2 class="bp-title">TÍTULO</h2>
      <p class="bp-body">
        Texto descritivo<br>
        <strong>Destaque</strong>, complemento
      </p>
      <p class="bp-product">
        <span class="bp-product-thin">NOME</span>
        <span class="bp-product-bold">PRODUTO</span>
      </p>
    </div>

  </div>
</div>

<style>
  .bp-wrap {
    font-family: 'Montserrat', sans-serif;
    width: 100vw;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
  }

  .bp-inner {
    position: relative;
    width: 100%;
    line-height: 0;
  }

  .bp-img {
    display: block;
    width: 100%;
    height: auto;
  }

  .bp-content {
    position: absolute;
    top: 50%;
    right: 5%;
    transform: translateY(-50%);
    text-align: center;
    color: #1a1a1a;
    text-shadow: 0 1px 4px rgba(255,255,255,0.4);
    width: 28%;
    min-width: 220px;
    max-width: 380px;
    line-height: 1.2;
  }

  .bp-eyebrow {
    font-size: clamp(11px, 1.2vw, 16px);
    font-weight: 400;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    margin: 0 0 4px;
    opacity: 0.9;
  }

  .bp-title {
    font-size: clamp(32px, 4vw, 60px);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 10px;
    line-height: 1;
    white-space: nowrap;
  }

  .bp-body {
    font-size: clamp(12px, 1.2vw, 17px);
    font-weight: 400;
    line-height: 1.6;
    margin: 0 0 8px;
  }

  .bp-body strong {
    font-weight: 700;
  }

  .bp-product {
    margin: 4px 0 0;
    line-height: 1;
  }

  .bp-product-thin {
    display: block;
    font-size: clamp(20px, 2.5vw, 38px);
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .bp-product-bold {
    display: block;
    font-size: clamp(26px, 3.5vw, 52px);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  @media (max-width: 767px) {
    .bp-content {
      top: auto;
      bottom: 6%;
      right: 50%;
      transform: translateX(50%);
      width: 90%;
      min-width: unset;
      max-width: unset;
      text-align: center;
      text-shadow: 0 1px 4px rgba(255,255,255,0.4);
    }

    .bp-eyebrow { font-size: 11px; letter-spacing: 0.28em; }
    .bp-title { font-size: clamp(30px, 9vw, 44px); white-space: normal; }
    .bp-body { font-size: 13px; }
    .bp-product-thin { font-size: clamp(20px, 6vw, 30px); }
    .bp-product-bold { font-size: clamp(28px, 8vw, 40px); }
  }
</style>
```

**Variáveis para substituir:**
- `URL_BANNER_DESKTOP` — URL da imagem desktop (CDN Shopify)
- `URL_BANNER_MOBILE` — URL da imagem mobile (CDN Shopify)
- `EYEBROW` — texto pequeno acima do título (ex: PRESENTE)
- `TÍTULO` — palavra principal em black 900 (ex: EXCLUSIVO)
- Textos do `.bp-body` e `.bp-product`

**Gotchas:**
- `width: 100vw` + `margin-left: -50vw` quebra o container do tema — necessário para 100% de tela
- No mobile o texto fica `position: absolute` sobre a imagem — NÃO usar `position: static` ou gera barra abaixo
- Evitar `overflow: hidden` no `.bp-wrap` — corta o texto em telas grandes
- Evitar `-webkit-background-clip: text` para gradient — corta letras com diagonais (X, V, W)
- Evitar `-webkit-text-stroke` — distorce letras com diagonais no Montserrat Black

**Aprovado em:** 2026-04-01 (Fiber Oficial — banner presente exclusivo Octo MaxGrip)

---

**Última atualização:** 22 de Março de 2026 (lições: 2026-03-22)
**Versão:** 1.2.0
**Mantido por:** Documentation Specialist Agent
