---
name: css-overlap
description: Detecta CSS sobreposto em temas Shopify — regras que sobrescrevem propriedades do mesmo elemento entre arquivos (cross-file), !important wars, shorthand vs longhand, redundancias. Gera relatorio com score e sugestoes de refatoracao.
argument-hint: "[diretorio do tema ou arquivo CSS]"
---

# CSS Overlap — Detector de CSS Sobreposto em Temas Shopify

Analisa arquivos CSS de um tema Shopify e identifica regras que sobrescrevem umas as outras na cascata, causando comportamento inesperado ou CSS morto.

## Quando Usar

- Ao receber um tema para customizacao (diagnostico inicial)
- Apos adicionar CSS novo a um tema existente
- Quando estilos nao se comportam como esperado
- Para limpar CSS legado antes de refatorar
- Ao mesclar CSS de apps de terceiros com o tema

## O Que Detecta

1. **Mesmo seletor, arquivos diferentes** — propriedades sobrescritas na cascata
2. **!important wars** — multiplos !important no mesmo seletor
3. **Shorthand vs longhand** — `margin` sobrescrevendo `margin-top` silenciosamente
4. **Redundancias** — mesma propriedade, mesmo valor, em dois lugares (CSS morto)
5. **Conflitos de especificidade** — `.product h1` vs `h1` no mesmo elemento
6. **Media queries** — regras que se aplicam no mesmo breakpoint com conflito

## Execucao

### Modo Automatico (Script)

Usar o script integrado:

```bash
node ~/.claude/skills/css-overlap/scripts/css-overlap.js <diretorio-assets> [--json] [--verbose]
```

- `--json` — saida em JSON (para integracao com outros scripts)
- `--verbose` — mostra TODOS os overlaps (padrao: resume)

### Modo Manual (AI-assisted)

Quando `/css-overlap` e invocado sem o script ou para analise mais profunda:

#### PASSO 1 — Coletar CSS

- Identificar todos os arquivos `.css` no tema (geralmente em `assets/`)
- Ordenar pela ordem de carregamento Shopify:
  1. `base.css` / `reset.css` / `normalize.css`
  2. `global.css`
  3. `component-*.css`
  4. `section-*.css`
  5. `template-*.css`
  6. `custom.css` / `custom-*.css`
- Verificar tambem CSS inline em `{% style %}` dentro de `.liquid`

#### PASSO 2 — Executar Script

```bash
node ~/.claude/skills/css-overlap/scripts/css-overlap.js /caminho/para/assets/
```

#### PASSO 3 — Analisar Resultados

Interpretar o relatorio e classificar:

**CRITICAL (corrigir agora):**
- !important wars — dois !important no mesmo seletor/propriedade
- Mesmo seletor, mesmo arquivo, valores diferentes (bug provavel)

**HIGH (corrigir antes de publicar):**
- Mesmo seletor, arquivos diferentes, valores diferentes
- Shorthand sobrescrevendo longhand silenciosamente

**MEDIUM (refatorar quando possivel):**
- Seletores diferentes que atingem o mesmo elemento com propriedades conflitantes

**LOW (cleanup):**
- Mesma propriedade, mesmo valor em dois lugares (redundante)

#### PASSO 4 — Sugestoes de Correcao

Para cada overlap detectado, sugerir:

1. **Consolidar** — Mover para um unico local (priorizar o arquivo correto na hierarquia)
2. **Remover** — Deletar a regra perdedora se for redundante
3. **Refatorar** — Se !important war, reorganizar especificidade
4. **Documentar** — Se intencional (ex: override de app), adicionar comentario `/* Override: [motivo] */`

#### PASSO 5 — Relatorio

```
CSS OVERLAP REPORT
============================================================
Arquivos analisados: X
Regras CSS parseadas: X
Sobreposicoes encontradas: X

  CRITICAL: X
  HIGH:     X
  MEDIUM:   X
  LOW:      X

--- CRITICAL ---
  [propriedade] (tipo do conflito)
    VENCE:  arquivo:linha  seletor  valor  specificity
    PERDE:  arquivo:linha  seletor  valor  specificity

--- SUGESTOES ---
  [P0] Descricao da acao
  [P1] Descricao da acao

SCORE: XX/100
============================================================
```

## Integracao com Outros Skills

- Usar ANTES de `/theme-check` — limpar CSS sobreposto melhora o score de performance
- Usar APOS `/liquid-lint` — se liquid usa classes que tem CSS sobreposto, ha problema
- Combinacao ideal: `/liquid-lint` → `/css-overlap` → `/theme-check`
