---
name: liquid-lint
description: Valida templates Shopify Liquid — detecta erros de sintaxe, filtros deprecados, problemas de performance, acessibilidade e boas praticas Online Store 2.0. Use quando trabalhar com arquivos .liquid ou temas Shopify.
argument-hint: "[arquivo ou diretorio .liquid]"
---

# Liquid Lint — Validador de Templates Shopify

Analisa arquivos Liquid para detectar erros, anti-patterns e oportunidades de melhoria.

## Quando Usar

- Antes de fazer push de um tema Shopify
- Ao revisar seções, snippets ou layouts Liquid
- Ao criar novas seções dinâmicas
- Para garantir compatibilidade com Online Store 2.0

## Execucao

Ao invocar `/liquid-lint`, execute TODOS os passos abaixo no(s) arquivo(s) indicado(s) em `$ARGUMENTS` (ou no diretorio atual se nenhum argumento for passado):

### PASSO 1 — Identificar arquivos Liquid

- Se `$ARGUMENTS` aponta para um arquivo `.liquid`, analisar esse arquivo
- Se aponta para um diretorio, buscar todos os `*.liquid` recursivamente
- Se vazio, buscar no diretorio de trabalho atual

### PASSO 2 — Analise de Sintaxe

Verificar em cada arquivo:

**Erros criticos (MUST FIX):**
- Tags nao fechadas: `{% if %}` sem `{% endif %}`, `{% for %}` sem `{% endfor %}`
- Filtros inexistentes ou deprecados (ex: `| img_url` deve ser `| image_url` no OS 2.0)
- Objetos usados fora do escopo (ex: `product` fora de template de produto)
- `{% schema %}` com JSON invalido
- `{{ content_for_layout }}` ausente em layouts
- `{% render %}` com variaveis nao passadas explicitamente

**Avisos (SHOULD FIX):**
- `{% include %}` em vez de `{% render %}` (deprecado no OS 2.0)
- Filtros faltando: `| escape` em atributos HTML, `| money` em precos
- `forloop` sem `limit` em colecoes potencialmente grandes
- Strings hardcoded em vez de `| t` (i18n)
- `asset_url` sem `| stylesheet_tag` ou `| script_tag`

**Sugestoes (NICE TO HAVE):**
- Uso de `{% liquid %}` para blocos logicos (melhor legibilidade)
- `loading: 'lazy'` ausente em imagens abaixo do fold
- `preload` ausente para fontes e CSS critico
- Sections sem `{% schema %}` (nao serao editaveis no editor)

### PASSO 3 — Analise de Performance

- Loops aninhados (`for` dentro de `for`) — complexidade O(n^2)
- Chamadas repetidas ao mesmo objeto sem `{% assign %}`
- Imagens sem `widths` ou `sizes` (responsive images)
- `{{ content_for_header }}` fora do `<head>`
- CSS/JS inline excessivo que deveria estar em assets

### PASSO 4 — Analise de Schema (se presente)

- JSON valido dentro de `{% schema %}`
- Settings com `type`, `id`, `label` obrigatorios
- Blocks com `type` e `name`
- `presets` presentes para secoes reutilizaveis
- `max_blocks` definido quando faz sentido
- `class` e `tag` definidos na raiz

### PASSO 5 — Analise de Acessibilidade

- `alt` em todas as imagens: `{{ image | image_url | image_tag: alt: image.alt }}`
- Labels em formularios
- `aria-label` em botoes de icone
- Skip links no layout
- Roles semanticos (`role="main"`, `role="navigation"`)
- Contraste: verificar se cores sao configuradas via settings (nao hardcoded)

### PASSO 6 — Relatorio

Gerar relatorio resumido:

```
LIQUID LINT — [nome do arquivo/diretorio]
================================================
Arquivos analisados: X
Erros criticos: X | Avisos: X | Sugestoes: X

CRITICOS:
  [arquivo:linha] Descricao do erro
  [arquivo:linha] Descricao do erro

AVISOS:
  [arquivo:linha] Descricao do aviso

SUGESTOES:
  [arquivo:linha] Descricao da sugestao

SCORE: XX/100
================================================
```

**Score:**
- Comeca em 100
- Critico: -15 pontos cada
- Aviso: -5 pontos cada
- Sugestao: -2 pontos cada
- Minimo: 0

**Regra:** Score < 60 = NAO fazer push sem corrigir criticos.
