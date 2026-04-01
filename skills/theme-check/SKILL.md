---
name: theme-check
description: Auditoria completa de temas Shopify Online Store 2.0 — estrutura de arquivos, compatibilidade, performance, SEO, acessibilidade e boas praticas. Use para validar temas antes de publicar ou ao iniciar trabalho num tema existente.
argument-hint: "[diretorio do tema]"
---

# Theme Check — Auditoria de Tema Shopify Online Store 2.0

Auditoria abrangente que verifica se um tema Shopify segue as boas praticas do Online Store 2.0.

## Quando Usar

- Antes de publicar um tema
- Ao receber um tema de terceiros para customizacao
- Para diagnosticar problemas de performance ou SEO
- Para garantir compatibilidade com o editor de temas

## Execucao

Ao invocar `/theme-check`, executar TODOS os passos no diretorio indicado em `$ARGUMENTS` (ou diretorio atual):

### PASSO 1 — Estrutura de Arquivos

Verificar presenca e organizacao:

**Obrigatorios (FAIL se ausente):**
```
layout/theme.liquid
config/settings_schema.json
config/settings_data.json
templates/*.json          (OS 2.0 usa JSON, nao .liquid)
sections/
snippets/
assets/
locales/en.default.json
```

**Recomendados:**
```
layout/password.liquid
templates/404.json
templates/customers/*.json
sections/header.liquid
sections/footer.liquid
snippets/icon-*.liquid
```

**Anti-patterns:**
- Templates `.liquid` em vez de `.json` (OS 1.0 legado)
- Arquivos em `templates/` que deveriam ser `sections/`
- Assets com nomes sem prefixo (ex: `style.css` em vez de `base.css` ou `component-*.css`)

### PASSO 2 — Compatibilidade Online Store 2.0

- **JSON Templates:** Todos os templates devem ser `.json` com referencia a sections
- **Section Groups:** Verificar se `header-group` e `footer-group` estao implementados
- **Dynamic Sections:** Cada section deve ter `{% schema %}` com `presets` para ser adicionavel
- **App Blocks:** Verificar suporte a `{% render block %}` com `"type": "@app"` nos schemas
- **Metafields:** Verificar uso de `{{ product.metafields.* }}` com acesso correto
- **Content For Header:** `{{ content_for_header }}` presente em layouts

### PASSO 3 — Settings Schema

Analisar `config/settings_schema.json`:

- JSON valido
- `theme_info` como primeiro item com `theme_name`, `theme_version`, `theme_author`
- Categorias organizadas logicamente (Logo, Cores, Tipografia, Social, etc.)
- Settings de cores para customizacao (nao hardcoded em CSS)
- Font pickers para tipografia
- Sem settings duplicados ou orfaos

### PASSO 4 — Performance

**Verificar:**
- Imagens com responsive sizes (`widths`, `sizes`, `loading: 'lazy'`)
- Preload de fontes e CSS critico
- `defer` em scripts nao criticos
- CSS modular (`component-*.css`, `section-*.css`) em vez de monolitico
- Uso de `{% render %}` (isolado) em vez de `{% include %}` (compartilha escopo)
- Quantidade de requests (muitos assets pequenos = ruim)
- Minificacao de CSS/JS em assets

**Executar Shopify CLI se disponivel:**
```bash
shopify theme check --path [diretorio]
```
Se nao disponivel, prosseguir com analise manual.

### PASSO 5 — SEO

- `<title>` com `{{ page_title }}` e `{{ shop.name }}`
- `<meta name="description">` com `{{ page_description | escape }}`
- `<link rel="canonical" href="{{ canonical_url }}">`
- Open Graph tags (`og:title`, `og:description`, `og:image`)
- Schema.org/JSON-LD para produtos (`Product`, `BreadcrumbList`)
- `alt` em todas as imagens
- Heading hierarchy (`h1` > `h2` > `h3`, sem pulos)
- URLs amigaveis (handles limpos)
- Sitemap via `{{ 'sitemap.xml' | url }}`

### PASSO 6 — Acessibilidade (WCAG 2.1 AA)

- Skip-to-content link no layout
- `lang` attribute no `<html>`
- Labels em todos os inputs de formulario
- `aria-label` em botoes de icone e links de icone
- Focus styles visiveis (`:focus-visible`)
- Contraste de cores via settings (nao hardcoded)
- `role="main"` no conteudo principal
- Alt text em imagens
- Navegacao por teclado funcional

### PASSO 7 — Internacionalizacao (i18n)

- `locales/en.default.json` presente e completo
- Strings de UI usando `{{ 'chave' | t }}` (nao hardcoded)
- Precos com filtro `| money` ou `| money_with_currency`
- Datas com filtro `| date`
- Pluralizacao com `| pluralize` quando aplicavel

### PASSO 8 — Seguranca

- Outputs escapados: `{{ value | escape }}` em atributos HTML
- Sem `{{ form }}` sem CSRF (Shopify cuida, mas verificar forms custom)
- Sem scripts inline com dados sensiveis
- `Content-Security-Policy` headers quando possivel
- Sem tokens/keys expostos em JS

### PASSO 9 — Relatorio Final

```
THEME CHECK — [nome do tema]
================================================================
Diretorio: [path]
Versao: [theme_version do settings_schema]
OS 2.0 Compativel: SIM/NAO

  ESTRUTURA      [OK/WARN/FAIL]  X/Y arquivos obrigatorios
  OS 2.0         [OK/WARN/FAIL]  JSON templates, section groups
  SETTINGS       [OK/WARN/FAIL]  Schema valido, categorias
  PERFORMANCE    [OK/WARN/FAIL]  Lazy loading, defer, modular CSS
  SEO            [OK/WARN/FAIL]  Meta tags, OG, structured data
  ACESSIBILIDADE [OK/WARN/FAIL]  WCAG 2.1 AA compliance
  i18n           [OK/WARN/FAIL]  Traducoes, filtros de locale
  SEGURANCA      [OK/WARN/FAIL]  Escape, CSRF, secrets

SCORE GERAL: XX/100
================================================================

ACOES PRIORITARIAS:
1. [FAIL] Descricao da acao critica
2. [WARN] Descricao da melhoria recomendada
...
```

**Score por categoria (peso):**
- Estrutura: 15 pontos
- OS 2.0: 20 pontos
- Settings: 10 pontos
- Performance: 15 pontos
- SEO: 15 pontos
- Acessibilidade: 10 pontos
- i18n: 10 pontos
- Seguranca: 5 pontos

**Veredicto:**
- 90-100: Pronto para publicar
- 70-89: Ajustes recomendados
- 50-69: Precisa de trabalho significativo
- <50: NAO publicar
