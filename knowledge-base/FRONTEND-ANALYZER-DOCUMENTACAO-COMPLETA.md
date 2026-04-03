---
title: "Frontend Analyzer - Ferramenta de Análise Completa HTML/CSS"
category: "Desenvolvimento"
tags:
  - frontend
  - css
  - html
  - análise
  - diagnóstico
  - acessibilidade
  - performance
  - wcag
  - seo
  - inline-css
  - urls
  - auto-fix
  - api
topic: "Análise Frontend"
priority: high
version: "2.0.0"
last_updated: "2025-12-22"
---

# Frontend Analyzer - Ferramenta de Análise Completa HTML/CSS

## ⚡ NOVIDADES v2.0.0 (2025-12-22)

### 🚀 GRANDE ATUALIZAÇÃO - Sistema Robusto de Relatórios

**Problema resolvido:** Análises de URLs falhavam ao tentar salvar relatórios em paths inválidos.

**Soluções implementadas:**

1. **📂 Pasta Fixa e Organizada**
   - Todos os relatórios salvos em `frontend-analyzer/reports/`
   - Estrutura hierárquica: `reports/YYYYMMDD/project_HHMMSS/`
   - Nunca mais erro de "path inválido"!

2. **✅ Validação de Salvamento com Retry**
   - Verifica que arquivo foi criado corretamente
   - Até 3 tentativas automáticas em caso de falha
   - Feedback detalhado de sucesso/erro

3. **📊 Feedback Aprimorado**
   - Exibe tamanho de cada relatório salvo
   - Mostra localização completa dos arquivos
   - Resumo final com totais

4. **📝 Metadados Automaticamente Salvos**
   - `metadata.json` com timestamp, URL original, relatórios gerados
   - Preserva HTML original quando análise é de URL remota
   - Rastreabilidade completa de cada análise

5. **🔒 100% Compatível com URLs e Paths Locais**
   - Funciona perfeitamente com `https://site.com`
   - Funciona perfeitamente com `C:\projetos\site`
   - Zero configuração adicional necessária

**Exemplo de uso:**
```bash
# Análise de URL remota (agora funciona perfeitamente!)
cd C:\Users\sabola\.claude\frontend-analyzer
node src/index.js --path "https://orbity.riwerlabs.com" --format json,txt --name "Orbity"

# Relatórios salvos em:
# C:\Users\sabola\.claude\frontend-analyzer\reports\20251222\orbity_220054\
#   ├── report.txt         (34 KB)
#   ├── report.json        (165 KB)
#   ├── original.html      (100 KB)
#   └── metadata.json      (700 bytes)
```

### 🎯 Outras Melhorias v2.0

1. **✅ CSS Inline Completo**: Analisa CSS de tags `<style>` e atributos `style=""`
2. **🌐 Análise de URLs**: Analise sites remotos diretamente sem download manual
3. **🔴 Detecção CRITICAL Melhorada**: CLS, links quebrados, !important excessivo
4. **🧠 Scoring Inteligente**: Reconhece CSS inline e frameworks CDN
5. **🔧 API Programática**: Use via import em agentes e scripts
6. **🤖 Auto-Fix**: Correção automática para problemas simples

---

## O que é?

O **Frontend Analyzer** é uma ferramenta automatizada que analisa projetos HTML/CSS e gera relatórios detalhados identificando **100+ tipos de problemas** em 6 categorias principais.

## Localização

```
C:\Users\sabola\.claude\frontend-analyzer\
```

## Instalação

```bash
cd C:\Users\sabola\.claude\frontend-analyzer
npm install
```

## Como Usar

### Método 1: CLI Modo Interativo

```bash
cd C:\Users\sabola\.claude\frontend-analyzer
node src/index.js
```

### Método 2: CLI Modo Não-Interativo (Projeto Local)

**✅ SUPORTA PASTAS E ARQUIVOS LOCAIS**

O Frontend Analyzer detecta automaticamente TODOS os arquivos HTML/CSS em pastas locais:

```bash
# Analisar projeto local (Windows)
node src/index.js --path "C:\projetos\meu-site" --format txt

# Analisar projeto local (Linux/Mac)
node src/index.js --path "/home/usuario/projetos/site" --format json,txt

# Caminho relativo
node src/index.js --path "./meu-projeto" --format txt,html
```

**O que é analisado automaticamente:**
- ✅ **Todos os arquivos `.css`** (externos)
- ✅ **Todos os arquivos `.html`**
- ✅ **CSS inline em tags `<style>`**
- ✅ **CSS inline em atributos `style=""`**
- ✅ **Estrutura de subpastas** (recursivamente)
- ❌ **Ignora:** node_modules, dist, build, .git

**Exemplo prático:**

```bash
# Projeto: C:\Users\sabola\.claude\frontend-analyzer\test-project\
#   ├── index.html
#   ├── style.css
#   └── assets/
#       └── custom.css

cd C:\Users\sabola\.claude\frontend-analyzer
node src/index.js --path "C:\Users\sabola\.claude\frontend-analyzer\test-project" --format txt --name "MeuProjeto"

# Resultado:
# ✅ Encontrados 3 arquivos (2 CSS externos, 1 HTML)
# ✅ 1 tag <style> com CSS inline detectada
# ✅ 28 problemas encontrados
# ✅ Relatórios salvos em: reports/20251222/meuprojeto_222900/
#   ├── report.txt           (relatório humano)
#   ├── agent-action-plan.json  (para agentes AI)
#   └── metadata.json        (metadados)
```

**Detecção automática de arquivos:**

O analyzer usa glob patterns para encontrar arquivos:
- `**/*.css` → Busca todos os .css recursivamente
- `**/*.html` → Busca todos os .html recursivamente

**CSS Inline:**
- Tags `<style>` → Criado arquivo virtual `index.html:<style>#1`
- Atributos `style=""` → Criado arquivo virtual `index.html:<inline-styles>`

### Método 3: CLI Modo URL (NOVO! 🌐)

```bash
# Analise qualquer site remotamente
node src/index.js --path "https://orbity.riwerlabs.com" --format json

# Outro exemplo
node src/index.js --path "https://exemplo.com.br" --format txt,html --name "Exemplo"
```

### Método 4: API Programática (NOVO! 🔧)

```javascript
import { analyzeProject, analyzeURL, getCriticalIssues, validateCriteria } from './src/api.js';

// Analisar projeto local
const result = await analyzeProject('/caminho/projeto', { silent: false });

// Analisar URL remota
const result = await analyzeURL('https://exemplo.com', { silent: false });

// Filtrar apenas issues críticas
const critical = getCriticalIssues(result.issues);

// Validar critérios mínimos
const validation = validateCriteria(result, {
  minScore: 70,
  maxCritical: 0,
  maxHigh: 5
});

console.log('Passou nos critérios?', validation.passed);
```

### Método 5: Via Comando /auto (Integração Automática)

O Frontend Analyzer é executado **automaticamente** quando você usa `/auto` para criar/modificar código frontend:

```
/auto crie uma landing page responsiva
```

O `/auto` irá:
1. **ANTES**: Analisar projeto existente (se houver)
2. **CRIAR**: Código seguindo padrões identificados
3. **DEPOIS**: Executar Frontend Analyzer automaticamente
4. **CORRIGIR**: Problemas 🔴 CRITICAL e 🟠 HIGH automaticamente
5. **VALIDAR**: Score > 70/100, zero problemas críticos

## 🆕 Funcionalidades v2.0 Detalhadas

### 1. CSS Inline - Análise Completa

**Antes (v1.0)**: Apenas CSS de arquivos `.css` externos
**Agora (v2.0)**: CSS de tags `<style>`, atributos `style=""` e arquivos `.css`

```html
<!-- AGORA ANALISA TUDO ISSO: -->

<!-- 1. CSS em tags <style> -->
<style>
  .btn-primary {
    background: #007bff !important; /* ⚠️ DETECTA: !important excessivo */
  }
</style>

<!-- 2. CSS em atributos style="" -->
<div style="z-index: 999;">  <!-- ⚠️ DETECTA: z-index sem position -->

<!-- 3. CSS em arquivos .css (como antes) -->
<link rel="stylesheet" href="styles.css">
```

**Benefício**: Sites com CSS 100% inline agora são analisados corretamente.

### 2. Análise de URLs Remotas

**Antes (v1.0)**: Precisava baixar HTML manualmente
**Agora (v2.0)**: Analise qualquer URL diretamente

```bash
# Comando simples
node src/index.js --path "https://orbity.riwerlabs.com" --format json

# Via API
import { analyzeURL } from './src/api.js';
const result = await analyzeURL('https://exemplo.com');
```

**Benefício**: Análise de sites de produção sem setup manual.

### 3. Detecção CRITICAL Aprimorada

**Problemas agora CRITICAL (antes eram MEDIUM/LOW)**:

1. **🔴 Imagens sem width/height (CLS)**
   - Antes: MEDIUM
   - Agora: **CRITICAL**
   - Motivo: Afeta Core Web Vitals diretamente (SEO + UX)

2. **🔴 !important excessivo (3+ vezes)**
   - Antes: MEDIUM
   - Agora: **CRITICAL** (3+), HIGH (2x), MEDIUM (1x)
   - Motivo: Indica guerra de especificidade

3. **🟠 Links href="#" (placeholders não implementados)**
   - Antes: MEDIUM
   - Agora: **HIGH**
   - Motivo: Link quebrado confunde navegação

### 4. Scoring Inteligente

**Antes (v1.0)**: Classes HTML sem CSS = problemas LOW
**Agora (v2.0)**: Reconhece CSS inline e frameworks CDN

```javascript
// SITUAÇÃO: HTML com Bootstrap via CDN
<div class="btn btn-primary container">  // Classes do Bootstrap

// v1.0: ❌ Reportava 3 problemas LOW "Classe HTML sem CSS"
// v2.0: ✅ Detecta prefixos de framework (btn, container, col-, etc.)
//           Não reporta como problema
```

**Benefício**: Score justo para projetos com frameworks CDN.

### 5. API Programática Completa

```javascript
import {
  analyzeProject,
  analyzeURL,
  filterBySeverity,
  filterByCategory,
  getCriticalIssues,
  validateCriteria,
  SEVERITY,
  CATEGORY
} from './src/api.js';

// Análise
const result = await analyzeProject('/projeto', { silent: true });

// Filtros
const critical = getCriticalIssues(result.issues);
const accessibilityIssues = filterByCategory(result.issues, CATEGORY.ACCESSIBILITY);

// Validação
const validation = validateCriteria(result, {
  minScore: 70,
  maxCritical: 0,
  maxHigh: 5
});

if (!validation.passed) {
  console.error('❌ Projeto não passou nos critérios mínimos');
  process.exit(1);
}
```

**Benefício**: Integração em CI/CD, scripts, agentes.

### 6. Auto-Fix (NOVO!)

```javascript
import { generateFix, applyFixes, generateFixReport } from './src/utils/auto-fix.js';

// Gerar relatório de fixes disponíveis
const fixReport = generateFixReport(result.issues, filesMap);

console.log(`Auto-fixable: ${fixReport.autoFixable}`);
console.log(`Requer ajuste manual: ${fixReport.manualFixes}`);

// Aplicar fixes automáticos
const fixed = applyFixes(fileContent, fixReport.fixes);
console.log(`Aplicados: ${fixed.appliedCount} fixes`);
```

**Fixes Suportados:**

| Problema | Auto-Fix | Manual? |
|----------|----------|---------|
| Imagens sem lazy loading | `loading="lazy"` | ❌ Automático |
| Imagens sem alt | `alt="[nome-arquivo]"` | ⚠️ Ajustar texto |
| Imagens sem width/height | `width/height="auto"` | ⚠️ Ajustar dimensões reais |
| Links href="#" | `href="javascript:void(0)"` | ⚠️ Implementar ação |
| !important excessivo | Sugestões de refatoração | ⚠️ Manual |

## Categorias de Problemas Detectados

### 1. CSS (8 subcategorias)

#### 1.1 Especificidade e Cascata
- ✅ Conflitos de especificidade (regras sobrescritas)
- ✅ Guerra de `!important`
- ✅ Ordem de declaração incorreta
- ✅ Imports de CSS na ordem errada

**Exemplo de problema detectado:**
```
┌──────────────────────────────────────────────────────────────────┐
│ PROBLEMA #1                                                      │
│ Tipo: CSS - Especificidade/Conflito                              │
│ Severidade: 🔴 Crítico                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ LOCALIZAÇÃO:                                                     │
│   Sua regra: components/button.css:23                            │
│   Regra que vence: global.css:456                                │
│                                                                  │
│ SUA REGRA (não aplicada):                                        │
│   .btn-primary {                    /* Especificidade: 0,1,0 */  │
│     background: #007bff;                                         │
│   }                                                              │
│                                                                  │
│ REGRA QUE VENCE:                                                 │
│   .header .nav-area .btn-primary {  /* Especificidade: 0,3,0 */  │
│     background: transparent;                                     │
│   }                                                              │
│                                                                  │
│ SOLUÇÃO:                                                         │
│   Corrigir seletor em global.css ou usar cascade layers         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 1.2 Seletores Problemáticos
- ✅ Seletores muito específicos (>3 níveis)
- ✅ Seletores frágeis (dependência de estrutura HTML)
- ✅ Seletores ineficientes (universal `*`)
- ✅ Seletores órfãos (CSS sem HTML correspondente)

#### 1.3 Propriedades CSS
- ✅ Propriedades sem efeito:
  - `z-index` sem `position`
  - `width` em elemento `inline`
  - `vertical-align` em elemento `block`
  - `gap` em container que não é flex/grid
- ✅ Propriedades redundantes
- ✅ Propriedades conflitantes
- ✅ Propriedades deprecated

#### 1.4 Valores CSS
- ✅ Unidades inconsistentes
- ✅ Cores (formatos misturados, contraste WCAG)
- ✅ Variáveis CSS (não usadas, circulares)
- ✅ Valores mágicos (números específicos sem explicação)

#### 1.5 Layout
- ✅ Flexbox (problemas de entendimento)
- ✅ Grid (complexidade desnecessária)
- ✅ Posicionamento (`absolute` sem `relative` no pai)
- ✅ Box Model (`box-sizing`, margin collapse)

#### 1.6 Responsividade
- ✅ Media queries (breakpoints inconsistentes)
- ✅ Viewport (larguras fixas causando scroll horizontal)
- ✅ Imagens sem `max-width`

#### 1.7 Performance CSS
- ✅ Seletores caros
- ✅ Propriedades que causam repaint/reflow
- ✅ Animações problemáticas
- ✅ Dead code (CSS não utilizado)

#### 1.8 Manutenibilidade
- ✅ Código duplicado
- ✅ Naming inconsistente (BEM vs camelCase vs kebab-case)
- ✅ Organização ruim

### 2. HTML (6 subcategorias)

#### 2.1 Estrutura e Sintaxe
- ✅ Tags não fechadas
- ✅ Aninhamento incorreto
- ✅ IDs duplicados
- ✅ Tags deprecated

#### 2.2 Semântica
- ✅ Estrutura de headings (níveis pulados: h1 → h3)
- ✅ Tags semânticas (`div` onde deveria ser `<article>`)
- ✅ Listas incorretas

#### 2.3 Acessibilidade (WCAG)
- ✅ Imagens sem `alt`
- ✅ Inputs sem `<label>` associado
- ✅ ARIA incorreto
- ✅ Contraste insuficiente (WCAG AA/AAA)
- ✅ Navegação por teclado

**Exemplo de problema de acessibilidade:**
```
┌──────────────────────────────────────────────────────────────────┐
│ PROBLEMA #2                                                      │
│ Tipo: HTML - Acessibilidade                                      │
│ Severidade: 🔴 Crítico                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ LOCALIZAÇÃO:                                                     │
│   Arquivo: pages/checkout.html                                   │
│   Linha: 234                                                     │
│                                                                  │
│ PROBLEMA:                                                        │
│   Campo de cartão sem label - leitores de tela não identificam  │
│                                                                  │
│ CÓDIGO ATUAL:                                                    │
│   <input type="text" id="card-number" class="form-input">        │
│                                                                  │
│ SOLUÇÃO:                                                         │
│   <label for="card-number">Número do cartão</label>             │
│   <input type="text" id="card-number" class="form-input">        │
│                                                                  │
│ WCAG:                                                            │
│   Viola: 1.3.1 Info and Relationships (Level A)                  │
│   Viola: 4.1.2 Name, Role, Value (Level A)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 2.4 Links e Navegação
- ✅ Links vazios ou "clique aqui"
- ✅ Links sem indicação de nova aba

#### 2.5 Formulários
- ✅ Form sem `action`/`method`
- ✅ Validação incorreta
- ✅ Campos sem labels

#### 2.6 Meta e Head
- ✅ Viewport, charset, title faltando
- ✅ Meta description, Open Graph
- ✅ SEO tags incompletas

#### 2.7 Mídia
- ✅ Imagens sem dimensões (causa CLS - Layout Shift)
- ✅ Lazy loading não aplicado
- ✅ Formatos não otimizados

### 3. Integração HTML + CSS

#### 3.1 Referências Cruzadas
- ✅ Classes no HTML sem CSS correspondente
- ✅ Classes no CSS sem HTML correspondente (dead code)
- ✅ IDs referenciados inexistentes

#### 3.2 Herança e Contexto
- ✅ Propriedades herdadas problemáticas
- ✅ BFC não criado quando necessário
- ✅ Margin collapse inesperado

#### 3.3 Estados Dinâmicos
- ✅ `:hover` sem `:focus` (acessibilidade)
- ✅ Estados de validação não estilizados (`:valid`, `:invalid`)

### 4. Performance

#### 4.1 Carregamento
- ✅ Recursos bloqueantes (CSS no body, scripts síncronos)
- ✅ Arquivos muito grandes
- ✅ Imagens não otimizadas

#### 4.2 Renderização
- ✅ Layout shifts (CLS) - imagens sem dimensões
- ✅ Reflows desnecessários
- ✅ Animações em propriedades caras

### 5. Compatibilidade

#### 5.1 Browser Support
- ✅ Propriedades não suportadas
- ✅ Prefixos de vendor (faltando ou desnecessários)
- ✅ Features experimentais em produção

## Formato do Relatório

### Estrutura ASCII

```
╔══════════════════════════════════════════════════════════════════╗
║              RELATÓRIO DE ANÁLISE FRONTEND                       ║
║              Projeto: [nome]                                     ║
║              Data: [data]                                        ║
║              Arquivos analisados: [número]                       ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────┐
│ SUMÁRIO EXECUTIVO                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Total de problemas encontrados: XXX                              │
│                                                                  │
│ Por severidade:                                                  │
│   🔴 Críticos (quebram funcionalidade):     XX                   │
│   🟠 Altos (afetam UX significativamente):  XX                   │
│   🟡 Médios (melhorias recomendadas):       XX                   │
│   🔵 Baixos (boas práticas):                XX                   │
│   ⚪ Info (sugestões):                      XX                   │
│                                                                  │
│ Por categoria:                                                   │
│   CSS:            XX problemas                                   │
│   HTML:           XX problemas                                   │
│   Acessibilidade: XX problemas                                   │
│   Performance:    XX problemas                                   │
│   Compatibilidade:XX problemas                                   │
│                                                                  │
│ Score geral: XX/100                                              │
│   - CSS:            XX/100                                       │
│   - HTML:           XX/100                                       │
│   - Acessibilidade: XX/100                                       │
│   - Performance:    XX/100                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Severidades

| Emoji | Severidade | Descrição | Exemplo |
|-------|-----------|-----------|---------|
| 🔴 | CRITICAL | Quebra funcionalidade | Modal não aparece (z-index sem position) |
| 🟠 | HIGH | Afeta UX significativamente | Scroll horizontal em mobile |
| 🟡 | MEDIUM | Melhorias recomendadas | Dead code CSS (34% do arquivo) |
| 🔵 | LOW | Boas práticas | Naming inconsistente (BEM vs camelCase) |
| ⚪ | INFO | Informações e estatísticas | Breakpoints detectados no projeto |

### Scoring (0-100)

| Score | Classificação | Descrição |
|-------|--------------|-----------|
| 90-100 | EXCELENTE | Pouquíssimos problemas, projeto de alta qualidade |
| 70-89 | BOM | Alguns problemas menores, mas bem estruturado |
| 50-69 | REGULAR | Problemas significativos que devem ser corrigidos |
| 30-49 | RUIM | Muitos problemas, necessita refatoração |
| 0-29 | CRÍTICO | Problemas graves, projeto precisa de atenção urgente |

## Formatos de Saída

### 1. TXT (Terminal)

Relatório formatado com bordas ASCII para leitura no terminal.

**Geração:**
```bash
npm start
# ou
npm run analyze -- --format txt
```

**Arquivo gerado:** `frontend-analysis-report.txt`

### 2. JSON (Programático)

Relatório estruturado para integração com outras ferramentas.

**Geração:**
```bash
npm run analyze -- --format json
```

**Arquivo gerado:** `frontend-analysis-report.json`

**Estrutura:**
```json
{
  "meta": {
    "projectName": "Meu Projeto",
    "date": "2025-12-22",
    "filesAnalyzed": 45
  },
  "summary": {
    "totalIssues": 127,
    "bySeverity": {
      "critical": 4,
      "high": 8,
      "medium": 35,
      "low": 60,
      "info": 20
    },
    "byCategory": {
      "css": 67,
      "html": 32,
      "accessibility": 15,
      "performance": 8,
      "compatibility": 5
    },
    "scores": {
      "overall": 62,
      "css": 58,
      "html": 71,
      "accessibility": 45,
      "performance": 72
    }
  },
  "issues": [
    {
      "id": "CSS-001",
      "severity": "critical",
      "category": "css",
      "subcategory": "properties",
      "file": "styles/modal.css",
      "line": 45,
      "code": "z-index: 1000;",
      "problem": "z-index sem position definido",
      "solution": "Adicionar position: fixed",
      "impact": "Modal não aparece acima do conteúdo"
    }
  ]
}
```

### 3. HTML (Interativo)

Relatório HTML navegável com links e filtros.

**Geração:**
```bash
npm run analyze -- --format html
```

**Arquivo gerado:** `frontend-analysis-report.html`

## Uso em Agentes Claude Code

### Agente HTML5 Guru

Quando criar/modificar HTML, **SEMPRE** execute análise antes e depois:

```
ANTES de criar HTML:
1. Analisar HTML existente (se houver)
2. Identificar padrões e problemas
3. Criar novo HTML seguindo boas práticas

DEPOIS de criar HTML:
1. Executar /frontend-analyze
2. Corrigir TODOS os problemas críticos e altos
3. Validar acessibilidade (WCAG AA mínimo)
```

### Agente CSS Master

Quando criar/modificar CSS, **SEMPRE** execute análise:

```
ANTES de criar CSS:
1. Analisar CSS existente
2. Identificar padrões de naming (BEM, camelCase, kebab-case)
3. Identificar breakpoints usados
4. Criar novo CSS seguindo padrão existente

DEPOIS de criar CSS:
1. Executar /frontend-analyze
2. Corrigir especificidade (eliminar !important)
3. Corrigir dead code
4. Validar responsividade
```

### Agente Frontend Testing Expert

**OBRIGATÓRIO** executar antes de testar:

```
SEMPRE:
1. Executar /frontend-analyze
2. Gerar lista de TODOS os elementos interativos detectados
3. Criar subtarefas para testar CADA elemento
4. Executar testes com Playwright MCP
5. Gerar relatório de cobertura
```

## Integração com Workflow

### 1. Antes de Criar Código

```bash
# Analisar projeto existente
/frontend-analyze

# Identificar:
# - Padrões de código
# - Convenções de naming
# - Breakpoints usados
# - Estrutura de arquivos
```

### 2. Durante Desenvolvimento

```bash
# Análise contínua
npm run watch  # (se disponível)
```

### 3. Antes de Commit

```bash
# Análise final
/frontend-analyze

# Corrigir TODOS os problemas 🔴 CRITICAL e 🟠 HIGH
# Considerar corrigir 🟡 MEDIUM
```

### 4. Code Review

```bash
# Revisor executa análise
/frontend-analyze

# Valida:
# - Score geral > 70
# - Zero problemas críticos
# - Acessibilidade WCAG AA
```

## Configuração Avançada

### Arquivo de Configuração

Crie `.frontend-analyzer.json` na raiz do projeto:

```json
{
  "ignore": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "vendor/**"
  ],
  "rules": {
    "css": {
      "maxSpecificity": [0, 3, 0],
      "maxSelectorDepth": 3,
      "allowImportant": false
    },
    "html": {
      "requireAlt": true,
      "requireLabels": true,
      "wcagLevel": "AA"
    },
    "accessibility": {
      "minContrastRatio": 4.5,
      "requireAriaLabels": true
    }
  },
  "thresholds": {
    "overall": 70,
    "css": 60,
    "html": 70,
    "accessibility": 80,
    "performance": 70
  }
}
```

### Ignorar Problemas Específicos

Use comentários especiais no código:

```css
/* frontend-analyzer-disable-next-line */
.legacy-code {
  color: red !important;
}

/* frontend-analyzer-disable */
.old-section {
  /* Código legado que será removido */
}
/* frontend-analyzer-enable */
```

```html
<!-- frontend-analyzer-disable-next-line -->
<div class="old-layout">...</div>
```

## Troubleshooting

### Problema: "Cannot find module 'postcss'"

**Solução:**
```bash
cd C:\Users\sabola\.claude\frontend-analyzer
npm install
```

### Problema: Análise muito lenta

**Solução:**
Adicione pastas ao ignore em `.frontend-analyzer.json`:
```json
{
  "ignore": [
    "node_modules/**",
    "vendor/**",
    ".git/**"
  ]
}
```

### Problema: Falsos positivos

**Solução:**
Use comentários de desabilitação ou ajuste regras em `.frontend-analyzer.json`.

### Problema: Relatório muito grande

**Solução:**
Filtre por severidade:
```bash
npm run analyze -- --severity critical,high
```

## Exemplos Práticos

### Exemplo 1: Analisar Landing Page

```bash
/frontend-analyze
# Caminho: C:\projetos\landing-page
```

**Resultado esperado:**
- ✅ Detecta imagens sem dimensões (CLS)
- ✅ Detecta contraste insuficiente
- ✅ Detecta meta tags faltando
- ✅ Gera relatório com soluções

### Exemplo 2: Analisar E-commerce

```bash
/frontend-analyze
# Caminho: C:\projetos\loja-online
```

**Resultado esperado:**
- ✅ Detecta inputs sem labels (checkout)
- ✅ Detecta problemas de responsividade
- ✅ Detecta CSS duplicado
- ✅ Detecta breakpoints inconsistentes

### Exemplo 3: Analisar Dashboard Admin

```bash
/frontend-analyze
# Caminho: C:\projetos\admin-panel
```

**Resultado esperado:**
- ✅ Detecta navegação sem ARIA
- ✅ Detecta tabelas sem headers
- ✅ Detecta modais sem foco trap
- ✅ Detecta z-index inconsistentes

## Checklist de Uso

### ✅ Antes de Criar Código

- [ ] Executar `/frontend-analyze` no projeto existente
- [ ] Identificar padrões de código
- [ ] Identificar convenções de naming
- [ ] Identificar breakpoints usados

### ✅ Durante Desenvolvimento

- [ ] Seguir padrões identificados
- [ ] Criar código acessível (WCAG AA)
- [ ] Usar naming consistente
- [ ] Evitar !important

### ✅ Após Criar Código

- [ ] Executar `/frontend-analyze`
- [ ] Corrigir TODOS os 🔴 CRITICAL
- [ ] Corrigir TODOS os 🟠 HIGH
- [ ] Validar score > 70

### ✅ Antes de Commit

- [ ] Score geral > 70
- [ ] Zero problemas críticos
- [ ] Acessibilidade WCAG AA
- [ ] Performance aceitável

## Links Úteis

- **Repositório**: `C:\Users\sabola\.claude\frontend-analyzer`
- **Documentação WCAG**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Web Docs**: https://developer.mozilla.org/
- **Can I Use**: https://caniuse.com/

## Atualizações

### v1.0.0 (2025-12-22)

✅ Implementação inicial completa:
- 28 módulos de análise
- 100+ tipos de problemas detectados
- 3 formatos de relatório (TXT, JSON, HTML)
- CLI interativo
- Sistema de scoring
- Testes automatizados (100% passando)
- Documentação completa

---

**Fonte**: Criado pelo Claude Code
**Última Atualização**: 2025-12-22
**Versão**: 1.0.0

---

**FIM DO DOCUMENTO**
