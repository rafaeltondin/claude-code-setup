---
title: "Frontend Analyzer - Guia Completo para Agentes Claude Code"
category: "Desenvolvimento"
tags:
  - frontend
  - agentes
  - automação
  - correção
  - action-plan
topic: "Integração com Agentes"
priority: high
version: "2.0.0"
last_updated: "2025-12-22"
---

# Frontend Analyzer - Guia Completo para Agentes Claude Code

## 🎯 Objetivo

Este guia ensina **agentes Claude Code** a consumir relatórios do Frontend Analyzer e **corrigir problemas automaticamente** em projetos HTML/CSS.

---

## 📋 Fluxo Completo

```
1. Executar Frontend Analyzer → Gera agent-action-plan.json
2. Agente lê o action plan → Entende problemas e correções
3. Agente executa ações → Aplica correções nos arquivos
4. Agente valida → Re-executa análise para confirmar
```

---

## 🚀 PASSO 1: Executar Frontend Analyzer

### Comando Bash:

```bash
cd C:\Users\sabola\.claude\frontend-analyzer
node src/index.js --path "https://site.com" --format txt --name "Projeto"
```

### O que é gerado:

```
reports/YYYYMMDD/projeto_HHMMSS/
├── report.txt               ← Relatório humano
├── report.json              ← Dados estruturados
├── agent-action-plan.json   ← 🤖 PARA AGENTES
├── original.html            ← HTML original
└── metadata.json            ← Metadados
```

---

## 📖 PASSO 2: Ler e Entender o Action Plan

### Estrutura do agent-action-plan.json:

```json
{
  "meta": {
    "projectName": "Orbity",
    "analysisDate": "2025-12-22T...",
    "totalIssues": 246,
    "actionableIssues": 58
  },

  "summary": {
    "bySeverity": {
      "critical": 2,
      "high": 6,
      "medium": 50
    }
  },

  "actionPlan": {
    "summary": {
      "totalActions": 58,
      "readyToAutoFix": 45,
      "requiresManualFix": 13,
      "estimatedTime": "25 min"
    },
    "phases": [
      {
        "phase": 1,
        "name": "CRÍTICO - Corrigir Imediatamente",
        "priority": "CRITICAL",
        "actions": [
          {
            "id": "action-1",
            "file": "index.html",
            "line": 1858,
            "title": "Imagem sem dimensões (CLS)",
            "severity": "critical",

            "fix": {
              "original": "<img src=\"logo.png\" />",
              "fixed": "<img src=\"logo.png\" width=\"auto\" height=\"auto\" />",
              "instruction": "Adicione width e height. Substitua 'auto' pelas dimensões reais.",
              "manualSteps": [
                "1. Inspecione a imagem no navegador",
                "2. Veja dimensões reais",
                "3. Substitua width=\"auto\" height=\"auto\" pelos valores"
              ],
              "requiresManualFix": true
            },

            "context": {
              "lineNumber": 1858,
              "file": "index.html",
              "codeSnippet": "<img src=\"logo.png\" />"
            },

            "estimatedTime": "5 min",
            "autoFixable": false
          }
        ]
      }
    ]
  },

  "agentInstructions": {
    "workflow": [
      "1. Leia actionPlan.summary",
      "2. Execute ações por fase (1 → 2 → 3 → 4)",
      "3. Para cada ação: leia file, line, fix.original, fix.fixed",
      "4. Valide cada mudança"
    ],
    "tips": [
      "Corrija um arquivo de cada vez",
      "Faça backup antes",
      "Priorize CRITICAL > HIGH > MEDIUM"
    ]
  }
}
```

---

## 🔧 PASSO 3: Executar Correções

### Template de Prompt para Agentes:

```
Você é um agente especializado em correção de frontend.

TAREFA:
1. Leia o arquivo: {actionPlan.path}
2. Analise o action plan
3. Execute as correções por fase

INSTRUÇÕES:
- Execute APENAS ações com autoFixable=true automaticamente
- Para requiresManualFix=true, peça confirmação ao usuário
- Use a tool Edit para aplicar correções
- Valide sintaxe após cada mudança

EXEMPLO DE AÇÃO:

action = {
  "id": "action-1",
  "file": "index.html",
  "line": 1858,
  "fix": {
    "original": "<img src=\"logo.png\" />",
    "fixed": "<img src=\"logo.png\" width=\"200\" height=\"200\" />"
  }
}

EXECUÇÃO:
1. Read index.html
2. Localizar linha 1858
3. Edit: Substituir fix.original por fix.fixed
4. Confirmar mudança
```

---

## 💻 PASSO 4: Código de Implementação

### Para Agentes Especializados:

```javascript
// Exemplo de código que um agente pode seguir

import { readFileSync } from 'fs';

// 1. Ler action plan
const actionPlan = JSON.parse(
  readFileSync('agent-action-plan.json', 'utf-8')
);

// 2. Iterar por fases
for (const phase of actionPlan.actionPlan.phases) {
  console.log(`\nFASE ${phase.phase}: ${phase.name}`);

  for (const action of phase.actions) {
    console.log(`\nAção ${action.id}: ${action.title}`);
    console.log(`Arquivo: ${action.file}:${action.line}`);

    if (action.autoFixable) {
      // CORREÇÃO AUTOMÁTICA
      console.log(`✅ Auto-fixable`);
      console.log(`Original: ${action.fix.original}`);
      console.log(`Corrigido: ${action.fix.fixed}`);

      // Usar Edit tool aqui
      // Edit(action.file, action.fix.original, action.fix.fixed)

    } else {
      // CORREÇÃO MANUAL
      console.log(`⚠️ Requer correção manual`);
      console.log(`Passos:`);
      action.fix.manualSteps.forEach(step => {
        console.log(`  ${step}`);
      });
    }
  }
}
```

---

## 🎯 PASSO 5: Casos de Uso Específicos

### Caso 1: Corrigir Imagens sem Dimensões

**Action:**
```json
{
  "title": "Imagem sem dimensões (CLS)",
  "file": "index.html",
  "line": 1858,
  "fix": {
    "original": "<img src=\"logo.png\" />",
    "fixed": "<img src=\"logo.png\" width=\"auto\" height=\"auto\" />",
    "manualSteps": [
      "1. Abra logo.png no navegador",
      "2. Inspecione: veja dimensões (ex: 200x200)",
      "3. Substitua: width=\"200\" height=\"200\""
    ]
  }
}
```

**Prompt para Agente:**
```
TAREFA: Corrigir imagem sem dimensões na linha 1858

PASSOS:
1. Read index.html
2. Bash: curl -I https://site.com/logo.png (ver Content-Length)
3. Bash: file logo.png (se local, ver dimensões)
4. Edit index.html:
   - Localizar: <img src="logo.png" />
   - Substituir: <img src="logo.png" width="200" height="200" />

VALIDAÇÃO:
- Verificar se width e height foram adicionados
- Confirmar que valores não são "auto"
```

---

### Caso 2: Corrigir Links Quebrados

**Action:**
```json
{
  "title": "Link quebrado (href=\"#\")",
  "file": "index.html",
  "line": 2200,
  "fix": {
    "original": "<a href=\"#\" aria-label=\"Instagram\">",
    "alternatives": [
      {
        "type": "link",
        "code": "<a href=\"https://instagram.com/orbity\" aria-label=\"Instagram\">",
        "when": "Use quando tiver URL real"
      },
      {
        "type": "button",
        "code": "<button type=\"button\" aria-label=\"Instagram\">",
        "when": "Use quando for ação JavaScript"
      }
    ]
  }
}
```

**Prompt para Agente:**
```
TAREFA: Corrigir link quebrado na linha 2200

DECISÃO:
1. AskUserQuestion: "Este link do Instagram deve apontar para:
   a) URL real (https://instagram.com/perfil)
   b) Ação JavaScript (abrir modal)
   c) Deixar temporário (javascript:void(0))"

2. Baseado na resposta:
   a) Edit: href="https://instagram.com/orbity"
   b) Edit: Trocar <a> por <button> + onclick
   c) Edit: href="javascript:void(0)"

VALIDAÇÃO:
- Link não deve ser href="#"
- Acessibilidade: manter aria-label
```

---

### Caso 3: Adicionar position para z-index

**Action:**
```json
{
  "title": "z-index sem efeito",
  "file": "style.css",
  "line": 336,
  "fix": {
    "original": ".menu-toggle { z-index: 1002; }",
    "fixed": ".menu-toggle { position: relative; z-index: 1002; }",
    "instruction": "Adicione position: relative; antes do z-index"
  }
}
```

**Prompt para Agente:**
```
TAREFA: Adicionar position para z-index funcionar (linha 336)

PASSOS:
1. Read style.css (linhas 330-340 para contexto)
2. Edit style.css:
   OLD: .menu-toggle { z-index: 1002; }
   NEW: .menu-toggle { position: relative; z-index: 1002; }

VALIDAÇÃO:
- position foi adicionado ANTES de z-index
- Sintaxe CSS válida
```

---

## ✅ PASSO 6: Validação

### Após Correções, o Agente DEVE:

```
1. Re-executar Frontend Analyzer:
   node src/index.js --path "projeto" --format agent

2. Comparar resultados:
   - ANTES: 58 problemas acionáveis
   - DEPOIS: X problemas restantes

3. Verificar se problemas CRITICAL e HIGH foram resolvidos

4. Reportar ao usuário:
   ✅ Corrigidos: Y problemas
   ⚠️ Pendentes: Z problemas (manuais)
   ❌ Falharam: W problemas
```

---

## 📊 PASSO 7: Relatório de Execução

### Template de Relatório para Agente:

```markdown
# Relatório de Correções - Frontend Analyzer

## Sumário
- **Projeto:** Orbity
- **Data:** 2025-12-22
- **Análise inicial:** 58 problemas acionáveis

## Execução

### FASE 1: CRÍTICO (2 ações)
✅ action-1: Imagem sem dimensões (index.html:1858)
   - Original: <img src="logo.png" />
   - Corrigido: <img src="logo.png" width="200" height="200" />
   - Status: APLICADO

⚠️ action-2: Imagem sem dimensões (index.html:2194)
   - Status: PENDENTE (aguardando dimensões reais)

### FASE 2: ALTO (6 ações)
✅ action-3: Link quebrado (index.html:1857)
   - Corrigido: href="https://orbity.com/sobre"
   - Status: APLICADO

...

## Resultado Final
- ✅ Corrigidos automaticamente: 45
- ⚠️ Pendentes (requerem input): 13
- ❌ Falhas: 0

## Próximos Passos
1. Revisar 13 correções pendentes
2. Re-executar análise para validar
3. Confirmar que score melhorou
```

---

## 🔗 Integração com Agentes Existentes

### Auto-Fix Specialist

```
O auto-fix-specialist DEVE:
1. Após code-reviewer identificar issues
2. Executar Frontend Analyzer para diagnóstico detalhado
3. Ler agent-action-plan.json
4. Aplicar correções autoFixable=true
5. Reportar pendentes para usuário
```

### CSS Master

```
O css-master DEVE:
1. Focar em actions com category="css"
2. Priorizar medium/high relacionados a CSS
3. Usar fix.alternatives quando disponível
4. Validar com autoprefixer/stylelint após correções
```

### HTML5 Guru

```
O html5-guru DEVE:
1. Focar em actions com category="html" ou "accessibility"
2. Trocar <div> por tags semânticas
3. Corrigir links quebrados
4. Adicionar alt em imagens
```

---

## 🎓 Exemplos Práticos

### Exemplo 1: Agente Completo de Correção

```
VOCÊ é um agente especializado em correção automática de frontend.

TAREFA:
1. Execute Frontend Analyzer no projeto atual
2. Leia agent-action-plan.json
3. Corrija TODOS os problemas com autoFixable=true
4. Liste os que requerem correção manual

WORKFLOW:
1. Bash: node src/index.js --path "." --format txt
2. Read: reports/YYYYMMDD/*/agent-action-plan.json
3. Parse JSON e iterar por actionPlan.phases
4. Para cada action onde autoFixable=true:
   a. Read action.file
   b. Edit: action.fix.original → action.fix.fixed
   c. Log: "✅ Corrigido {action.title}"
5. Para requiresManualFix=true:
   - Log: "⚠️ Manual: {action.title} - {action.fix.manualSteps}"

VALIDAÇÃO:
- Re-executar Frontend Analyzer
- Confirmar redução de problemas
- Reportar resultado
```

---

## 📚 Referências

**Arquivos importantes:**
- `frontend-analyzer/src/reporters/agent-reporter.js` - Gerador de action plan
- `frontend-analyzer/reports/` - Pasta de relatórios
- `knowledge-base/FRONTEND-ANALYZER-DOCUMENTACAO-COMPLETA.md` - Docs gerais

**Para consultar:**
```bash
/kb frontend analyzer guia agentes
```

---

**Última atualização:** 2025-12-22
**Versão:** 2.0.0
**Autor:** Claude AI
