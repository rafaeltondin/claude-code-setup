---
title: "Criativos Estaticos para Meta Ads - Guia Completo de Criacao"
category: "Marketing"
tags:
  - criativos estaticos
  - meta ads
  - facebook ads
  - instagram ads
  - imagem anuncio
  - design grafico
  - html para imagem
  - puppeteer screenshot
  - identidade visual
  - banner
  - stories
  - reels
  - formato vertical
  - 1080x1920
  - png
  - anuncio contratacao
  - anuncio promocao
  - criativo
  - layout ads
  - design ads
  - multi-proporcao
  - responsive
  - 1080x1080
  - 1080x1350
  - 1920x1080
  - 1200x628
topic: "Criativos Estaticos"
priority: high
version: "2.0.0"
last_updated: "2026-03-07"
---

# Criativos Estaticos para Meta Ads - Guia Completo de Criacao

Guia completo para criar imagens estaticas profissionais para anuncios no Meta Ads (Facebook/Instagram), usando HTML+CSS convertido para PNG via Chrome CDP ou Puppeteer. Suporta MULTIPLAS PROPORCOES: 1:1 (1080x1080), 4:5 (1080x1350), 9:16 (1080x1920), 16:9 (1920x1080) e 1.91:1 (1200x628). REGRA: sempre perguntar ao usuario qual proporcao deseja antes de gerar.

---

## Indice

1. [Visao Geral do Processo](#visao-geral-do-processo)
2. [Fase 1: Analise da Identidade Visual](#fase-1-analise-da-identidade-visual)
3. [Fase 2: Estrutura do Projeto](#fase-2-estrutura-do-projeto)
4. [Fase 3: Criacao do Layout HTML](#fase-3-criacao-do-layout-html)
5. [Fase 4: Conversao para PNG](#fase-4-conversao-para-png)
6. [Formatos e Dimensoes](#formatos-e-dimensoes)
7. **[Imagem do Produto — Regras e Tecnicas](#imagem-do-produto--regras-e-tecnicas)** ← NOVO
8. [Templates por Tipo de Anuncio](#templates-por-tipo-de-anuncio)
9. [Componentes Reutilizaveis](#componentes-reutilizaveis)
10. [Paleta de Icones SVG](#paleta-de-icones-svg)
11. [Boas Praticas de Design para Ads](#boas-praticas-de-design-para-ads)
12. [Troubleshooting](#troubleshooting)
13. [Caso Real: Performa Academia](#caso-real-performa-academia)

---

## Visao Geral do Processo

### Fluxo Completo

```
1. ANALISE DO CLIENTE
   Site do cliente → extrair cores, fontes, logo
   |
2. IMAGEM DO PRODUTO
   Baixar/receber foto do produto (alta resolucao)
   Se nao houver foto → usar Template B (sem imagem)
   |
3. SETUP DO PROJETO
   D:\nome-cliente-ads\ → logo + product.webp + index.html + screenshot.js
   |
4. CRIACAO DO HTML
   Template A (com imagem 40%+) ou Template B (sem imagem)
   Zona de imagem: 40% topo (vertical) ou 40% esquerda (horizontal)
   Gradiente fade na transicao imagem → conteudo
   |
5. CONVERSAO PARA PNG
   Puppeteer → screenshot → node screenshot-all.js
   Opcional: --validate para checar zona de imagem
   |
6. ENTREGA
   PNG de alta qualidade pronto para upload no Meta Ads
```

### Por Que HTML em Vez de Imagem Direto?

| Vantagem | Descricao |
|----------|-----------|
| Editavel | Texto, cores e layout sao facilmente alteraveis |
| Responsivo | Pode gerar multiplos formatos do mesmo layout |
| Versionavel | Codigo pode ser salvo e reutilizado |
| Pixel-perfect | Controle total sobre cada pixel |
| Sem dependencias | Nao precisa de Canva, Photoshop, Figma |
| Rapido | Gerar variantes leva segundos |

---

## Fase 1: Analise da Identidade Visual

### Passo 1: Encontrar o Site do Cliente

```bash
# Pesquisa web
WebSearch: "[Nome da Empresa] [Cidade] site oficial"
```

### Passo 2: Extrair Cores do CSS

Acessar o site e buscar os arquivos CSS:

```bash
# 1. Listar CSS do site
curl -sL "https://www.site-do-cliente.com.br/" | grep -oiE 'href="[^"]*\.css[^"]*"'

# 2. Extrair cores hexadecimais (ordenadas por frequencia)
curl -sL "URL_DO_CSS" | grep -oiE '#[0-9a-fA-F]{3,8}' | sort | uniq -c | sort -rn | head -30

# 3. Extrair fontes
curl -sL "URL_DO_CSS" | grep -oiE 'font-family:[^;]+' | sort -u
```

**O que procurar:**

| Elemento | O Que Extrair | Onde Encontrar |
|----------|---------------|----------------|
| Cor principal | HEX da cor de destaque | Botoes, links, CTA |
| Cor de fundo | HEX do background | Body, header |
| Cor de texto | HEX do texto principal | Body, paragrafos |
| Fonte titulos | font-family dos headings | h1, h2, h3 |
| Fonte corpo | font-family do body | body, p |
| Logo | URL da imagem | Header, footer |

### Passo 3: Baixar o Logo

```bash
# 1. Encontrar URL do logo
curl -sL "https://www.site-do-cliente.com.br/" | grep -oiE 'src="[^"]*(logo|brand|marca)[^"]*\.(png|svg|jpg)"'

# 2. Baixar
curl -sL "URL_DO_LOGO" -o "D:/nome-projeto/logo.png"

# 3. Verificar tamanho (deve ser > 5KB para ser valido)
powershell -Command '(Get-Item "D:\nome-projeto\logo.png").Length'
```

> **DICA:** Sites geralmente tem 2 versoes do logo: clara (para fundo escuro) e escura (para fundo claro). Baixe ambas.

### Passo 4: Documentar a Identidade

Antes de criar o layout, registrar:

```
IDENTIDADE VISUAL DO CLIENTE:
- Cor principal: #XXXXXX
- Cor secundaria: #XXXXXX
- Fundo: #XXXXXX
- Texto: #XXXXXX
- Fonte titulos: [Nome]
- Fonte corpo: [Nome]
- Logo (fundo claro): logo-escuro.png
- Logo (fundo escuro): logo-claro.png
- Slogan: "[texto]"
- Instagram: @handle
```

---

## Fase 2: Estrutura do Projeto

### Criar Pasta do Projeto

```bash
powershell -Command 'New-Item -ItemType Directory -Path "D:\nome-cliente-ads" -Force'
```

### Estrutura de Arquivos

```
D:\nome-cliente-ads\
  product.webp          # Foto do produto (OBRIGATORIO para Template A)
  logo.png              # Logo do cliente
  logo-escuro.png       # Logo versao escura (opcional)
  cr01-hero-4x5.html    # Criativo 1 (cada HTML = 1 criativo)
  cr02-benefits-9x16.html
  ...
  screenshot.js         # Gera PNG de 1 criativo (auto-detecta formato)
  screenshot-all.js     # Gera PNGs de TODOS os HTMLs (com --validate)
  package.json          # Dependencias (puppeteer)
```

> **Convencao de nomes:** `crXX-descricao-FORMATO.html`
> Formatos: `4x5`, `9x16`, `1x1`, `16x9`, `191` (wide)

### Instalar Puppeteer

```bash
cd D:/nome-cliente-ads && npm install puppeteer
```

---

## Fase 3: Criacao do Layout HTML

### Template A: Com Imagem do Produto (RECOMENDADO)

> **USAR QUANDO:** O cliente fornece foto do produto ou existe imagem de qualidade.
> Este e o template padrao. A imagem do produto ocupa 40% do topo (verticais) ou 40% da esquerda (horizontais).

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, initial-scale=1">
<title>Nome do Anuncio</title>
<link href="https://fonts.googleapis.com/css2?family=FONTE:wght@300;400;600;700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1080px;
    height: 1350px;   /* AJUSTAR: 1350(4:5) | 1920(9:16) | 1080(1:1) */
    overflow: hidden;
    font-family: 'FONTE_DO_CLIENTE', sans-serif;
    background: #COR_FUNDO;
    margin: 0;
  }

  .creative {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;  /* AJUSTAR: column(vertical) | row(horizontal) */
    overflow: hidden;
    position: relative;
  }

  /* ============================================
     ZONA DE IMAGEM — MINIMO 40% DO CRIATIVO
     ============================================ */
  .image-zone {
    flex: 0 0 540px;         /* AJUSTAR: 540(4:5) | 768(9:16) | 432(1:1) */
    position: relative;
    overflow: hidden;
    width: 100%;
  }

  .image-zone img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 30%;  /* Foco no terco superior do produto */
    display: block;
  }

  /* Gradiente fade: transicao suave imagem → fundo */
  .image-zone::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 80px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(COR_FUNDO_R, COR_FUNDO_G, COR_FUNDO_B, 0.5) 40%,
      #COR_FUNDO 100%
    );
    pointer-events: none;
    z-index: 2;
  }

  /* Badges flutuantes sobre a imagem (maximo 2-3) */
  .image-badge {
    position: absolute;
    z-index: 5;
    background: rgba(0, 0, 0, 0.75);
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 15px;
    backdrop-filter: blur(6px);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  }
  .image-badge.top-right { top: 16px; right: 16px; }
  .image-badge.top-left { top: 16px; left: 16px; }
  .image-badge.bottom-left { bottom: 24px; left: 16px; }

  /* ============================================
     ZONA DE CONTEUDO — 60% RESTANTE
     ============================================ */
  .content-zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px 48px;
    gap: 16px;
    position: relative;
    z-index: 3;
  }

  /* Gradiente sutil de fundo na zona de conteudo */
  .content-zone::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background:
      radial-gradient(ellipse at 20% 0%, rgba(COR_R, COR_G, COR_B, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(COR_R, COR_G, COR_B, 0.05) 0%, transparent 50%);
    z-index: -1;
  }

  /* === ELEMENTOS DE CONTEUDO === */
  .headline {
    font-size: 56px; font-weight: 900;
    color: #ffffff; line-height: 1.1;
    text-transform: uppercase;
  }
  .headline .accent { color: #COR_PRINCIPAL; }

  .subtitle {
    font-size: 24px; font-weight: 500;
    color: rgba(255,255,255,0.7);
    letter-spacing: 1px;
  }

  .features {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-top: 8px;
  }
  .feature-pill {
    background: rgba(COR_R,COR_G,COR_B, 0.15);
    border: 1px solid rgba(COR_R,COR_G,COR_B, 0.3);
    border-radius: 50px;
    padding: 10px 20px;
    font-size: 16px; font-weight: 600; color: #ffffff;
  }

  .price-row {
    display: flex; align-items: baseline; gap: 16px;
    margin-top: auto;
  }
  .price-old {
    font-size: 28px; font-weight: 500;
    color: rgba(255,255,255,0.4);
    text-decoration: line-through;
  }
  .price-new {
    font-size: 64px; font-weight: 900;
    color: #COR_DESTAQUE;  /* Ouro ou cor de destaque */
  }

  .cta-button {
    background: linear-gradient(135deg, #COR_PRINCIPAL 0%, #COR_VARIANTE 100%);
    color: white; font-size: 28px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 3px;
    padding: 22px 60px; border: none; border-radius: 8px;
    box-shadow: 0 6px 24px rgba(COR_R,COR_G,COR_B, 0.4);
    text-align: center;
  }

  .trust-row {
    display: flex; gap: 24px; justify-content: center;
    font-size: 14px; font-weight: 500;
    color: rgba(255,255,255,0.5);
  }
</style>
</head>
<body>
<div class="creative">

  <!-- ZONA DE IMAGEM (40%+) -->
  <div class="image-zone">
    <img src="product.webp" alt="Produto">
    <!-- Badges sobre a imagem (opcional, max 2-3) -->
    <div class="image-badge top-left">Logo / Marca</div>
    <div class="image-badge top-right">25% OFF</div>
  </div>

  <!-- ZONA DE CONTEUDO (60%) -->
  <div class="content-zone">
    <div class="subtitle">SUBTITULO / CATEGORIA</div>
    <h1 class="headline">
      Titulo <span class="accent">Destaque</span>
    </h1>

    <div class="features">
      <span class="feature-pill">Feature 1</span>
      <span class="feature-pill">Feature 2</span>
      <span class="feature-pill">Feature 3</span>
    </div>

    <div class="price-row">
      <span class="price-old">£59.95</span>
      <span class="price-new">£44.95</span>
    </div>

    <div class="cta-button">Shop Now →</div>

    <div class="trust-row">
      <span>12-Month Warranty</span>
      <span>30-Day Returns</span>
      <span>Free Shipping</span>
    </div>
  </div>

</div>
</body>
</html>
```

### Valores de Ajuste por Formato (Template A)

| Propriedade | 4:5 | 9:16 | 1:1 | 16:9 | 1.91:1 |
|-------------|-----|------|-----|------|--------|
| `body height` | 1350px | 1920px | 1080px | 1080px | 628px |
| `body width` | 1080px | 1080px | 1080px | 1920px | 1200px |
| `.creative flex-direction` | column | column | column | **row** | **row** |
| `.image-zone flex` | 0 0 540px | 0 0 768px | 0 0 432px | 0 0 768px | 0 0 480px |
| `.headline font-size` | 56px | 72px | 48px | 56px | 40px |
| `.price-new font-size` | 64px | 80px | 52px | 56px | 44px |
| `.cta font-size` | 28px | 32px | 24px | 28px | 22px |
| Fade direction | vertical | vertical | vertical | **horizontal** | **horizontal** |

> **NOTA PARA 16:9 e 1.91:1:** Mudar `.creative` para `flex-direction: row`, `.image-zone` define largura (nao altura), e o fade e horizontal (`.image-zone::after` usa `right: 0; width: 100px` ao inves de `bottom: 0; height: 80px`).

---

### Template B: Sem Imagem (Apenas Texto/Icones)

> **USAR QUANDO:** Nao ha foto do produto disponivel (vagas, eventos, servicos).
> Layout classico com logo, titulo, cards com icones e CTA.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, initial-scale=1">
<title>Nome do Anuncio</title>
<link href="https://fonts.googleapis.com/css2?family=FONTE:wght@300;400;600;700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    font-family: 'FONTE_DO_CLIENTE', sans-serif;
    background: #COR_FUNDO;
    position: relative;
  }

  .container {
    width: 1080px;
    height: 1920px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* === CAMADAS DE FUNDO === */
  .bg-pattern {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background:
      radial-gradient(ellipse at 20% 0%, rgba(COR_R, COR_G, COR_B, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(COR_R, COR_G, COR_B, 0.1) 0%, transparent 50%);
    z-index: 0;
  }

  .diagonal-lines {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 1;
    opacity: 0.04;
    background: repeating-linear-gradient(
      -45deg,
      transparent, transparent 40px,
      #COR_PRINCIPAL 40px, #COR_PRINCIPAL 41px
    );
  }

  .accent-bar {
    position: absolute;
    left: 0; width: 100%; height: 8px;
    background: linear-gradient(90deg, #COR_PRINCIPAL 0%, #COR_VARIANTE 50%, #COR_PRINCIPAL 100%);
    z-index: 10;
  }
  .accent-bar.top { top: 0; }
  .accent-bar.bottom { bottom: 0; }

  .corner-deco {
    position: absolute;
    width: 80px; height: 80px;
    z-index: 5;
  }
  .corner-deco.tl { top: 30px; left: 30px; border-top: 3px solid rgba(COR_R,COR_G,COR_B,0.3); border-left: 3px solid rgba(COR_R,COR_G,COR_B,0.3); }
  .corner-deco.tr { top: 30px; right: 30px; border-top: 3px solid rgba(COR_R,COR_G,COR_B,0.3); border-right: 3px solid rgba(COR_R,COR_G,COR_B,0.3); }
  .corner-deco.bl { bottom: 30px; left: 30px; border-bottom: 3px solid rgba(COR_R,COR_G,COR_B,0.3); border-left: 3px solid rgba(COR_R,COR_G,COR_B,0.3); }
  .corner-deco.br { bottom: 30px; right: 30px; border-bottom: 3px solid rgba(COR_R,COR_G,COR_B,0.3); border-right: 3px solid rgba(COR_R,COR_G,COR_B,0.3); }

  .logo-section {
    position: relative; z-index: 5;
    margin-top: 80px;
    display: flex; flex-direction: column; align-items: center;
    gap: 16px;
  }
  .logo-img { height: 60px; width: auto; filter: brightness(1.1); }
  .logo-divider { width: 60px; height: 3px; background: #COR_PRINCIPAL; border-radius: 2px; margin-top: 8px; }

  .main-section {
    position: relative; z-index: 5;
    margin-top: 60px;
    display: flex; flex-direction: column; align-items: center;
    gap: 20px;
  }
  .badge-label {
    font-size: 28px; font-weight: 700;
    letter-spacing: 8px; text-transform: uppercase;
    color: #COR_PRINCIPAL;
    padding: 12px 40px;
    border: 2px solid rgba(COR_R,COR_G,COR_B, 0.4);
    border-radius: 4px;
  }
  .main-title {
    font-size: 96px; font-weight: 900;
    text-transform: uppercase; color: #ffffff;
    letter-spacing: 4px; line-height: 1;
    text-align: center;
  }
  .orange-bar { width: 120px; height: 6px; background: #COR_PRINCIPAL; border-radius: 3px; }

  .cards-section {
    position: relative; z-index: 5;
    margin-top: 70px; width: 860px;
    display: flex; flex-direction: column; gap: 24px;
  }
  .card {
    background: linear-gradient(135deg, rgba(COR_R,COR_G,COR_B, 0.12) 0%, rgba(COR_R,COR_G,COR_B, 0.04) 100%);
    border: 1px solid rgba(COR_R,COR_G,COR_B, 0.25);
    border-left: 5px solid #COR_PRINCIPAL;
    border-radius: 8px;
    padding: 36px 44px;
    display: flex; align-items: center; gap: 28px;
  }
  .card-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #COR_PRINCIPAL 0%, #COR_VARIANTE 100%);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .card-icon svg { width: 32px; height: 32px; fill: white; }
  .card-title {
    font-size: 36px; font-weight: 800; color: #ffffff;
    text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;
  }

  .info-section {
    position: relative; z-index: 5;
    margin-top: 60px;
    display: flex; gap: 24px; justify-content: center; flex-wrap: wrap;
  }
  .info-tag {
    display: flex; align-items: center; gap: 14px;
    background: rgba(255,255,255, 0.06);
    border: 1px solid rgba(255,255,255, 0.1);
    border-radius: 50px;
    padding: 18px 36px;
  }
  .info-tag svg { width: 28px; height: 28px; fill: #COR_PRINCIPAL; flex-shrink: 0; }
  .info-tag-text { font-size: 26px; font-weight: 600; color: #ffffff; letter-spacing: 1px; }

  .cta-section {
    position: relative; z-index: 5;
    margin-top: auto; margin-bottom: 100px;
    display: flex; flex-direction: column; align-items: center;
    gap: 20px;
  }
  .cta-button {
    background: linear-gradient(135deg, #COR_PRINCIPAL 0%, #COR_VARIANTE 100%);
    color: white; font-size: 32px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 4px;
    padding: 28px 80px; border: none; border-radius: 8px;
    box-shadow: 0 8px 32px rgba(COR_R,COR_G,COR_B, 0.4);
  }
  .cta-info { font-size: 22px; font-weight: 400; color: rgba(255,255,255,0.5); letter-spacing: 2px; }
</style>
</head>
<body>
<div class="container">
  <div class="bg-pattern"></div>
  <div class="diagonal-lines"></div>
  <div class="accent-bar top"></div>
  <div class="accent-bar bottom"></div>
  <div class="corner-deco tl"></div>
  <div class="corner-deco tr"></div>
  <div class="corner-deco bl"></div>
  <div class="corner-deco br"></div>

  <!-- LOGO -->
  <div class="logo-section">
    <img src="logo.png" alt="Logo" class="logo-img">
    <div class="logo-divider"></div>
  </div>

  <!-- TITULO -->
  <div class="main-section">
    <div class="badge-label">Subtitulo</div>
    <h1 class="main-title">
      <span>Linha 1</span>
      <span style="color: #COR_PRINCIPAL;">Linha 2 Destaque</span>
    </h1>
    <div class="orange-bar"></div>
  </div>

  <!-- CARDS -->
  <div class="cards-section">
    <div class="card">
      <div class="card-icon"><svg>...</svg></div>
      <div class="card-title">Item 1</div>
    </div>
    <div class="card">
      <div class="card-icon"><svg>...</svg></div>
      <div class="card-title">Item 2</div>
    </div>
  </div>

  <!-- INFO TAGS -->
  <div class="info-section">
    <div class="info-tag">
      <svg>...</svg>
      <span class="info-tag-text">Info 1</span>
    </div>
    <div class="info-tag">
      <svg>...</svg>
      <span class="info-tag-text">Info 2</span>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-section">
    <div class="cta-button">Texto do Botao</div>
    <div class="cta-info">@instagram_handle</div>
  </div>
</div>
</body>
</html>
```

### Variaveis a Substituir

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `#COR_PRINCIPAL` | Cor de destaque do cliente | `#ff4e00` |
| `#COR_VARIANTE` | Variante mais clara da cor principal (+20% brilho) | `#ff6a2a` |
| `#COR_FUNDO` | Cor de fundo (geralmente escura) | `#0E0E0E` |
| `COR_R, COR_G, COR_B` | Valores RGB da cor principal (para opacidades) | `255, 78, 0` |
| `FONTE_DO_CLIENTE` | Font-family do cliente | `Source Sans Pro` |

### Como Calcular COR_VARIANTE

Pegar a cor principal e clarear ~20%:

| Cor Principal | COR_VARIANTE |
|---------------|--------------|
| `#ff4e00` (laranja) | `#ff6a2a` |
| `#d71f3f` (vermelho) | `#e53558` |
| `#2563EB` (azul) | `#4a7ff0` |
| `#10B981` (verde) | `#34d399` |
| `#8B5CF6` (roxo) | `#a78bfa` |

---

## Fase 4: Conversao para PNG

### Script Multi-Proporcao (screenshot.js)

O script pergunta ao usuario qual proporcao gerar e ajusta automaticamente viewport, clip e nome do arquivo.

```javascript
const puppeteer = require('puppeteer');
const path = require('path');
const readline = require('readline');

// ─── Sistema Multi-Proporcao ────────────────────────────────────
const RATIOS = {
  '1:1':    { w: 1080, h: 1080, name: 'square' },
  '4:5':    { w: 1080, h: 1350, name: 'portrait' },
  '9:16':   { w: 1080, h: 1920, name: 'story' },
  '16:9':   { w: 1920, h: 1080, name: 'landscape' },
  '1.91:1': { w: 1200, h: 628,  name: 'fb-wide' },
};

async function askRatio() {
  const arg = process.argv[2];
  if (arg && RATIOS[arg]) return RATIOS[arg];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    console.log('\nProporcoes disponiveis:');
    Object.entries(RATIOS).forEach(([k, v]) =>
      console.log(`  ${k.padEnd(7)} → ${v.w}x${v.h} (${v.name})`)
    );
    rl.question('\nEscolha a proporcao [9:16]: ', ans => {
      rl.close();
      resolve(RATIOS[ans.trim()] || RATIOS['9:16']);
    });
  });
}

(async () => {
  const ratio = await askRatio();
  console.log(`\nGerando em ${ratio.w}x${ratio.h} (${ratio.name})...\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: ratio.w, height: ratio.h,
    deviceScaleFactor: 1
  });

  const htmlPath = path.resolve(__dirname, 'index.html');
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle0', timeout: 30000
  });

  await page.evaluate(() => document.fonts.ready);
  await new Promise(resolve => setTimeout(resolve, 2000));

  const outputPath = path.resolve(__dirname, `anuncio-${ratio.name}-${ratio.w}x${ratio.h}.png`);
  await page.screenshot({
    path: outputPath, type: 'png',
    clip: { x: 0, y: 0, width: ratio.w, height: ratio.h }
  });

  console.log(`Screenshot salvo: ${outputPath}`);
  await browser.close();
})();
```

### Executar

```bash
# Auto-detecta proporcao pelo nome do arquivo
cd D:/nome-cliente-ads && node screenshot.js cr01-hero-4x5.html

# Forcar proporcao especifica
node screenshot.js meu-criativo.html 4:5
node screenshot.js meu-criativo.html 1:1
node screenshot.js meu-criativo.html 9:16

# Ver ajuda com zonas minimas de imagem
node screenshot.js
```

### Gerar TODOS os Formatos de Uma Vez

```javascript
// screenshot-all.js — gera o criativo em todas as 5 proporcoes
const puppeteer = require('puppeteer');
const path = require('path');

const RATIOS = [
  { w: 1080, h: 1080, name: 'square' },
  { w: 1080, h: 1350, name: 'portrait' },
  { w: 1080, h: 1920, name: 'story' },
  { w: 1920, h: 1080, name: 'landscape' },
  { w: 1200, h: 628,  name: 'fb-wide' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  for (const r of RATIOS) {
    await page.setViewport({ width: r.w, height: r.h, deviceScaleFactor: 1 });
    const htmlPath = path.resolve(__dirname, 'index.html');
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
      waitUntil: 'networkidle0', timeout: 30000
    });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(res => setTimeout(res, 2000));
    const out = path.resolve(__dirname, `anuncio-${r.name}-${r.w}x${r.h}.png`);
    await page.screenshot({ path: out, type: 'png',
      clip: { x: 0, y: 0, width: r.w, height: r.h }
    });
    console.log(`OK: ${r.name} (${r.w}x${r.h})`);
  }

  await browser.close();
  console.log('\nTodos os formatos gerados!');
})();
```

> **IMPORTANTE:** O HTML DEVE usar `body { width: Xpx; height: Ypx; }` dinamico. Use CSS variables ou gere HTMLs separados por proporcao. O ideal e usar o sistema de escala `getScale()` descrito na secao "Sistema Multi-Proporcao Responsivo" acima para calcular todos os tamanhos proporcionalmente.

---

## Formatos e Dimensoes

### Formatos para Meta Ads

| Formato | Dimensoes | Proporcao | Onde Aparece |
|---------|-----------|-----------|--------------|
| **Stories/Reels** | 1080x1920 | 9:16 | Instagram Stories, Facebook Stories, Reels |
| **Feed Quadrado** | 1080x1080 | 1:1 | Feed Instagram, Feed Facebook |
| **Feed Vertical** | 1080x1350 | 4:5 | Feed (melhor performance) |
| **Landscape** | 1200x628 | 1.91:1 | Facebook Feed, Audience Network |
| **Carrossel** | 1080x1080 | 1:1 | Carrossel Instagram/Facebook |

### Formato Recomendado por Objetivo

| Objetivo | Formato Ideal | Motivo |
|----------|---------------|--------|
| Alcance maximo | Stories 1080x1920 | Tela cheia, imersivo |
| Engajamento | Feed 1080x1350 | Ocupa mais espaco no feed |
| Cliques | Feed 1080x1080 | Equilibrado, funciona em todos os posicionamentos |
| Contratacao/Vagas | Stories 1080x1920 | Impacto visual, compartilhavel |
| Promocoes | Feed 1080x1350 | Espaco para mostrar produtos + precos |
| Facebook Feed | Landscape 1200x628 | Formato nativo do Facebook |
| YouTube/Desktop | Landscape 1920x1080 | Apresentacoes, thumbnails |

### REGRA OBRIGATORIA: Perguntar Proporcao

**ANTES de gerar qualquer criativo**, perguntar ao usuario:
_"Qual proporcao voce quer? (1:1, 4:5, 9:16, 16:9, 1.91:1)"_

Se nao especificado, gerar em **9:16 (1080x1920)** para ads (Stories) ou **4:5 (1080x1350)** para feed.

### Sistema Multi-Proporcao Responsivo

Usar o mesmo sistema de escala do guia de carrosseis (ver CARROSSEIS-IMAGEM-FEED-GUIA-COMPLETO.md secao 3.5).

**Fatores de escala (base = 9:16 para ads estaticos):**

```javascript
const BASE_ADS = { w: 1080, h: 1920 };

const RATIOS = {
  '1:1':    { w: 1080, h: 1080, name: 'square' },
  '4:5':    { w: 1080, h: 1350, name: 'portrait' },
  '9:16':   { w: 1080, h: 1920, name: 'story' },
  '16:9':   { w: 1920, h: 1080, name: 'landscape' },
  '1.91:1': { w: 1200, h: 628,  name: 'fb-wide' },
};

function getScale(ratio) {
  const wS = ratio.w / BASE_ADS.w;
  const hS = ratio.h / BASE_ADS.h;
  const fontScale = Math.sqrt(wS * hS);
  const marginScale = Math.min(wS, hS);
  return { wS, hS, fontScale, marginScale };
}
```

**Tamanhos de fonte por proporcao (ads estaticos):**

| Elemento | 9:16 (base) | 4:5 | 1:1 | 16:9 | 1.91:1 |
|----------|------------|-----|-----|------|--------|
| Badge | 28px | 24px | 21px | 21px | 16px |
| Titulo | 96px | 80px | 72px | 72px | 56px |
| Card Title | 36px | 30px | 27px | 27px | 21px |
| Info Tag | 26px | 22px | 19px | 19px | 15px |
| CTA Button | 32px | 27px | 24px | 24px | 19px |
| Handle | 22px | 18px | 16px | 16px | 14px |

**REGRA CRITICA: MINIMO 70% DE OCUPACAO**
Em TODAS as proporcoes, os elementos visuais devem ocupar no minimo 70% da area do criativo.
Se parecer vazio, AUMENTAR tamanho dos elementos.

### Adaptacoes de Layout por Proporcao (Ads)

#### 9:16 (Story — Base)
- Layout vertical completo: Logo → Badge → Titulo → Cards → Tags → CTA → Handle
- Espaco generoso entre secoes
- Todos os elementos cabem naturalmente

#### 4:5 (Feed Vertical)
- Compactar espacamentos (margin-top reduzido ~25%)
- Cards: manter, reduzir padding
- Tags: reduzir para 2-3 (em vez de 4)
- CTA: mais compacto

#### 1:1 (Quadrado)
- Remover 1-2 secoes (ex: tags OU secao motivacional)
- Badge e titulo ocupam ~40% do espaco
- Cards: maximo 2-3
- CTA: inline e compacto

#### 16:9 (Paisagem)
- **Layout horizontal:** lado esquerdo (titulo + badge) | lado direito (cards + CTA)
- Ou: titulo em cima, cards em grid 3-4 colunas
- Logo no canto, handle no oposto

#### 1.91:1 (Facebook Wide)
- **Ultra compacto:** titulo + CTA na mesma area
- Maximo 2 elementos alem do titulo
- Logo pequeno (22px), sem secoes extras
- Background pode ter mais impacto visual

### Tecnicas de Design Avancadas para Ads

**Z-Pattern:** Guiar o olho: Logo (sup-esq) → Badge (sup-dir) → Titulo (centro) → CTA (inf-dir)

**Regra 60-30-10:**
- 60% cor neutra (fundo escuro/claro)
- 30% cor secundaria (cards, textos muted)
- 10% cor de destaque (CTA, precos, destaques)

**Hierarquia por Peso Visual:**
1. Titulo: maior + mais pesado (96px/900)
2. CTA: cor de destaque + tamanho medio (32px/800)
3. Cards: informacao media (36px/800)
4. Tags: informacao pequena (26px/600)
5. Logo/Handle: branding discreto

**Contraste WCAG:** Manter ratio minimo 4.5:1 para texto normal, 3:1 para texto grande.

---

## Imagem do Produto — Regras e Tecnicas

> **REGRA OBRIGATORIA:** A imagem do produto deve ocupar **no minimo 40%** da area total do criativo. O restante (60%) e reservado para headline, beneficios, preco, CTA e branding.

### Por que 40% Minimo?

| Fundamento | Explicacao |
|-----------|-----------|
| **Eye-tracking** | Viewers gastam ~5s antes de rolar; imagem grande captura fixacao primaria |
| **Golden Ratio** | Proporcao aurea (61.8/38.2) valida ocupacao de 40-60% para hero image |
| **CTR comprovado** | Ads com imagem 40-60% tem CTR e conversao superiores a imagens <30% |
| **Reconhecimento** | Produto deve ser identificavel no thumbnail 50x50px do feed |
| **Algoritmo Meta** | Imagens otimizadas ganham ~$5.13 de vantagem no CPM |

### Ocupacao Ideal por Objetivo

| Objetivo | Ocupacao | Motivo |
|----------|---------|--------|
| Awareness | 50-70% | Maximo impacto visual |
| Consideration | 40-55% | Equilibrio produto + beneficios |
| Conversion | 40-50% | Espaco para preco, CTA, urgencia |
| Retargeting | 45-60% | Produto reconhecivel + oferta |

### Calculo de Pixels por Formato

| Formato | Dimensao | 40% da Imagem | Pixels |
|---------|----------|---------------|--------|
| **4:5** | 1080x1350 | 40% da altura | `540px` (topo) |
| **9:16** | 1080x1920 | 40% da altura | `768px` (topo) |
| **1:1** | 1080x1080 | 40% da altura | `432px` (topo) |
| **16:9** | 1920x1080 | 40% da largura | `768px` (esquerda) |
| **1.91:1** | 1200x628 | 40% da largura | `480px` (esquerda) |

### Posicionamento por Formato

```
FORMATOS VERTICAIS (4:5, 9:16, 1:1):
┌─────────────────────┐
│                     │
│   IMAGEM PRODUTO    │ ← 40-50% superior
│   (object-fit:cover)│
│                     │
├─ ─ ─ fade ─ ─ ─ ─ ─┤
│                     │
│   HEADLINE          │
│   Beneficios        │ ← 50-60% inferior
│   PRECO    [CTA]    │
│                     │
└─────────────────────┘

FORMATOS HORIZONTAIS (16:9, 1.91:1):
┌───────────┬─────────────────┐
│           │                 │
│  IMAGEM   │  HEADLINE       │
│  PRODUTO  │  Beneficios     │
│  40-50%   │  PRECO  [CTA]   │
│           │                 │
└───────────┴─────────────────┘
     fade→
```

### CSS Obrigatorio — Zona de Imagem

```css
/* ============================================
   ZONA DE IMAGEM — OBRIGATORIO EM TODO CRIATIVO
   ============================================ */

/* --- VERTICAIS (4:5, 9:16, 1:1) --- */
.image-zone {
  flex: 0 0 VAR_ALTURA_PX;   /* 40% da altura total */
  position: relative;
  overflow: hidden;
  width: 100%;
}

.image-zone img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;  /* foco no terco superior */
  display: block;
}

/* Gradiente fade vertical (transicao imagem → fundo) */
.image-zone::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 80px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(15, 26, 20, 0.5) 40%,
    COR_FUNDO 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* --- HORIZONTAIS (16:9, 1.91:1) --- */
.image-zone-h {
  flex: 0 0 VAR_LARGURA_PX;  /* 40% da largura total */
  position: relative;
  overflow: hidden;
  height: 100%;
}

.image-zone-h img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

/* Gradiente fade horizontal (transicao imagem → fundo) */
.image-zone-h::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 100px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(15, 26, 20, 0.5) 40%,
    COR_FUNDO 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* --- ZONA DE CONTEUDO --- */
.content-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 48px;
  gap: 16px;
}
```

### Variaveis de Altura/Largura por Formato

| Formato | VAR_ALTURA_PX | VAR_LARGURA_PX | Orientacao |
|---------|--------------|----------------|-----------|
| 4:5 (1080x1350) | `540px` | — | Vertical |
| 9:16 (1080x1920) | `768px` | — | Vertical |
| 1:1 (1080x1080) | `432px` | — | Vertical |
| 16:9 (1920x1080) | — | `768px` | Horizontal |
| 1.91:1 (1200x628) | — | `480px` | Horizontal |

### Object-Fit e Object-Position

| Propriedade | Uso | Quando |
|-------------|-----|--------|
| `object-fit: cover` | Preenche zona, corta excesso | **Padrao** — lifestyle, ambientacao |
| `object-fit: contain` | Mostra imagem inteira | Pack shots, produto recortado |
| `object-position: center 30%` | Foco no terco superior | **Padrao** — produto na parte de cima |
| `object-position: center center` | Centralizado | Produto no centro da foto |

### Badges Sobre a Imagem

Elementos permitidos sobre a zona de imagem (maximo 2-3):

```css
/* Badge flutuante com glassmorphism */
.image-badge {
  position: absolute;
  z-index: 5;
  background: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 15px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

/* Posicoes recomendadas */
.badge-top-right { top: 16px; right: 16px; }    /* Desconto, "NOVO" */
.badge-top-left { top: 16px; left: 16px; }      /* Logo, selo */
.badge-bottom-left { bottom: 24px; left: 16px; } /* Preco */
.badge-bottom-right { bottom: 24px; right: 16px; } /* Rating */
```

### Gradiente de Transicao (Fade) — OBRIGATORIO

**NUNCA** fazer transicao brusca entre imagem e conteudo. Sempre usar gradiente:

| Direcao | Quando | Altura/Largura |
|---------|--------|---------------|
| Vertical (top→down) | Formatos verticais | 60-100px |
| Horizontal (left→right) | Formatos horizontais | 80-120px |

### Erros Comuns com Imagem

| Erro | Impacto | Solucao |
|------|---------|---------|
| Imagem < 30% do criativo | Produto nao identificavel no feed | Minimo 40% |
| Corte errado (object-fit) | Produto irreconhecivel | Usar object-position correto |
| Sem gradiente fade | Transicao brusca, amador | Fade de 60-100px obrigatorio |
| Badges ilegiveis | Info de preco perdida | backdrop-filter + fundo semi-transparente |
| Texto demais sobre imagem | Penalizacao algoritmo Meta | Max 1-2 badges, texto na content-zone |
| Foto baixa resolucao | Percepcao de baixa qualidade | Minimo 2x da resolucao de exibicao |
| Fundo competindo com produto | "Efeito vampiro" | Fundos escuros/neutros |

### Checklist Rapido — Imagem do Produto

```
PRE-PRODUCAO:
[ ] Foto em alta resolucao (minimo 2x)
[ ] Produto centralizado com safe margin 15-20%
[ ] Fundo limpo ou removido

COMPOSICAO:
[ ] Imagem ocupa 40-60% do criativo
[ ] Posicao segue Z-pattern (topo ou esquerda)
[ ] Hierarquia: Produto > Headline > Badge > CTA

TECNICO:
[ ] object-fit: cover com object-position correto
[ ] Gradiente fade na borda (60-100px)
[ ] Badges com backdrop-filter ou fundo semi-transparente
[ ] Texto overlay < 15% da area total

VALIDACAO:
[ ] Produto reconhecivel em thumbnail 50x50px
[ ] Testado em todos os formatos necessarios
[ ] Mobile-first verificado
```

---

## Templates por Tipo de Anuncio

### 1. Contratacao / Vagas

**Estrutura:**
```
[LOGO]
[BADGE: "Vem fazer parte" / "Junte-se ao time"]
[TITULO: "ESTAMOS CONTRATANDO"]
[CARDS: lista de vagas com icones]
[TAGS: turno, requisitos, beneficios]
[SECAO: texto motivacional]
[CTA: "Candidate-se Agora"]
[@instagram]
```

**Cores sugeridas:** Fundo escuro + cor principal para destaque

### 2. Promocao / Desconto

**Estrutura (Template A — com imagem):**
```
[IMAGEM DO PRODUTO — 40% topo]
  [BADGE: "XX% OFF" sobre imagem]
  [BADGE: "Limited Time" sobre imagem]
── fade ──
[TITULO: "Oferta Especial"]
[PRECO: antigo riscado → novo grande]
[PILLS: features do produto]
[CTA: "Compre Agora" / "Garanta o Seu"]
[TRUST: garantia, entrega, devolucao]
```

### 3. Lancamento de Produto/Servico

**Estrutura (Template A — com imagem):**
```
[IMAGEM DO PRODUTO — 40% topo]
  [BADGE: "Novidade" / "Lancamento" sobre imagem]
── fade ──
[TITULO: "Conheca o [PRODUTO]"]
[CARDS/PILLS: beneficios/features]
[PRECO: a partir de X]
[CTA: "Saiba Mais"]
[@site]
```

### 4. Depoimento / Social Proof

**Estrutura (Template A — com imagem):**
```
[IMAGEM DO PRODUTO — 40% topo]
  [BADGE: estrelas + num reviews sobre imagem]
── fade ──
[CITACAO: depoimento em aspas grandes]
[NOME + CIDADE: do cliente]
[ESTRELAS: avaliacao]
[CTA: "Experimente"]
[@instagram]
```

### 5. Evento / Workshop

**Estrutura (Template B — sem imagem):**
```
[LOGO]
[BADGE: data do evento]
[TITULO: nome do evento]
[CARDS: palestrantes/atividades]
[TAGS: local, horario, preco]
[CTA: "Inscreva-se"]
[@instagram]
```

### 6. Dor / Problema / Solucao

**Estrutura (Template A — com imagem):**
```
[IMAGEM DO PRODUTO — 40% topo]
  [BADGE: publico-alvo sobre imagem]
── fade ──
[HEADLINE DOR: "Cansado de X?" (vermelho)]
[TRANSICAO: seta ou divisor]
[HEADLINE SOLUCAO: "Produto resolve Y" (verde)]
[PRECO + CTA]
[TRUST: garantia, reviews]
```

### 7. Comparacao de Preco

**Estrutura (Template A — com imagem):**
```
[IMAGEM DO PRODUTO — 40% topo]
  [BADGES: "Others: £80+" vs "Ours: £44.95" sobre imagem]
── fade ──
[TITULO: "Same Quality. Better Price."]
[TABELA: features vs concorrentes]
[CTA: "Shop Now"]
```

---

## Componentes Reutilizaveis

### Background Pattern (Gradiente Sutil)

Cria profundidade sem ser intrusivo:

```css
.bg-pattern {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(COR, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(COR, 0.1) 0%, transparent 50%);
  z-index: 0;
}
```

### Linhas Diagonais

Adiciona textura sutil ao fundo:

```css
.diagonal-lines {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0.04;
  background: repeating-linear-gradient(
    -45deg,
    transparent, transparent 40px,
    #COR 40px, #COR 41px
  );
}
```

### Cantos Decorativos

Moldura elegante sem parecer excessivo:

```css
.corner {
  position: absolute;
  width: 80px; height: 80px;
  border-color: rgba(COR, 0.3);
  border-style: solid;
}
.corner.tl { top: 30px; left: 30px; border-width: 3px 0 0 3px; }
.corner.tr { top: 30px; right: 30px; border-width: 3px 3px 0 0; }
.corner.bl { bottom: 30px; left: 30px; border-width: 0 0 3px 3px; }
.corner.br { bottom: 30px; right: 30px; border-width: 0 3px 3px 0; }
```

### Card com Borda Lateral

Destaca itens de lista:

```css
.card {
  background: linear-gradient(135deg, rgba(COR, 0.12), rgba(COR, 0.04));
  border: 1px solid rgba(COR, 0.25);
  border-left: 5px solid #COR;
  border-radius: 8px;
  padding: 36px 44px;
  display: flex; align-items: center; gap: 28px;
}
```

### Badge com Cantos Enfatizados

```css
.badge {
  font-size: 28px; font-weight: 700;
  letter-spacing: 8px; text-transform: uppercase;
  color: #COR;
  padding: 12px 40px;
  border: 2px solid rgba(COR, 0.4);
  border-radius: 4px;
  position: relative;
}
.badge::before {
  content: '';
  position: absolute; top: -2px; left: -2px;
  width: 12px; height: 12px;
  border-top: 3px solid #COR; border-left: 3px solid #COR;
}
.badge::after {
  content: '';
  position: absolute; bottom: -2px; right: -2px;
  width: 12px; height: 12px;
  border-bottom: 3px solid #COR; border-right: 3px solid #COR;
}
```

### Tag Pill (Informacoes Secundarias)

```css
.tag-pill {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255,255,255, 0.06);
  border: 1px solid rgba(255,255,255, 0.1);
  border-radius: 50px;
  padding: 18px 36px;
}
```

### Botao CTA com Sombra

```css
.cta {
  background: linear-gradient(135deg, #COR 0%, #COR_VARIANTE 100%);
  color: white; font-size: 32px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 4px;
  padding: 28px 80px; border-radius: 8px;
  box-shadow: 0 8px 32px rgba(COR, 0.4);
}
```

---

## Paleta de Icones SVG

Icones inline SVG prontos para usar (Material Design, 24x24 viewBox):

### Pessoa (vagas, equipe)
```html
<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
```

### Relogio (horarios, turno)
```html
<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
```

### Chapeu de Formatura (educacao, formacao)
```html
<svg viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
```

### Fitness / Halter (musculacao, exercicio)
```html
<svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>
```

### Estrela (destaque, avaliacao)
```html
<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
```

### Local (endereco, mapa)
```html
<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
```

### Telefone (contato)
```html
<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
```

### WhatsApp (contato)
```html
<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
```

### Dinheiro (salario, preco)
```html
<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
```

---

## Boas Praticas de Design para Ads

### Hierarquia Visual

1. **Titulo principal** (maior, mais bold) — o que voce quer que a pessoa leia primeiro
2. **Cards/itens** — informacao principal
3. **Tags** — informacao secundaria
4. **CTA** — acao desejada
5. **Logo + handle** — branding

### Regras de Ouro

| Regra | Descricao |
|-------|-----------|
| Menos e mais | Maximo 5-7 elementos de informacao |
| Contraste | Texto claro em fundo escuro (ou vice-versa) |
| Cor de destaque | Usar a cor principal do cliente para destaques, nao para tudo |
| Respiro | Espaco entre elementos (margin/gap generosos) |
| Legibilidade | Font-size minimo 22px para textos secundarios |
| Logo discreto | Logo no topo, tamanho medio (60-80px altura) |
| CTA forte | Botao grande, cor de destaque, texto imperativo |
| Handle | Sempre incluir @instagram do cliente |

### Erros Comuns

| Erro | Solucao |
|------|---------|
| Muito texto | Reduzir para frases curtas e impactantes |
| Cores demais | Maximo 3 cores (principal, fundo, texto) |
| Logo gigante | Logo e suporte, nao protagonista |
| Sem hierarquia | Usar tamanhos e pesos diferentes |
| Fundo distrai | Gradientes/patterns com opacidade baixa (0.03-0.15) |
| CTA fraco | Usar verbos imperativos + urgencia |

### Fontes Seguras para Google Fonts

Se o cliente nao tem fonte web ou a fonte nao esta no Google Fonts, usar uma similar:

| Tipo de Fonte | Opcoes Google Fonts |
|---------------|---------------------|
| Sans-serif moderna | `Inter`, `Source Sans Pro`, `Poppins`, `Montserrat` |
| Condensada bold | `Oswald`, `Barlow Condensed`, `Roboto Condensed` |
| Display impactante | `Anton`, `Bebas Neue`, `Passion One` |
| Elegante | `Playfair Display`, `Cormorant Garamond` |
| Esportiva | `Teko`, `Saira Condensed`, `Chakra Petch` |

---

## Troubleshooting

### Problema: Fonte nao carrega no screenshot

**Causa:** Google Fonts precisa de tempo para baixar.

**Solucao:** O script ja inclui espera de 2s + `document.fonts.ready`, mas se persistir:

```javascript
// Aumentar tempo de espera
await new Promise(resolve => setTimeout(resolve, 5000));
```

### Problema: Logo nao aparece no PNG

**Causa:** Caminho relativo do logo nao resolve com `file:///`.

**Solucao:** Garantir que o logo esta na MESMA pasta do `index.html` e usar caminho relativo simples:

```html
<img src="logo.png" alt="Logo">
```

### Problema: Cores parecem diferentes no PNG

**Causa:** Monitor vs PNG podem ter perfis de cor diferentes.

**Solucao:** Abrir o PNG no navegador para comparar com o HTML.

### Problema: Imagem cortada ou com scroll

**Causa:** Conteudo ultrapassou `height: 1920px`.

**Solucao:**
- Reduzir `margin-top` dos elementos
- Reduzir `font-size`
- Remover elementos nao essenciais
- Usar `margin-top: auto` no CTA para empurrar ao final

### Problema: Puppeteer nao instala

**Solucao:**

```bash
# Instalar com download do Chromium
npx puppeteer browsers install chrome

# Ou usar path do Chrome local
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new'
});
```

---

## Caso Real: Performa Academia

### Dados do Cliente

| Item | Valor |
|------|-------|
| Cliente | Performa Academia |
| Cidade | Caxias do Sul - RS |
| Site | www.performaacademia.com.br |
| Instagram | @performa_academia |
| Slogan | "Nao Para." |

### Identidade Visual Extraida

| Elemento | Valor |
|----------|-------|
| Cor principal | `#ff4e00` (laranja) |
| Cor variante | `#ff6a2a` (laranja claro) |
| Fundo | `#0E0E0E` (quase preto) |
| Texto | `#ffffff` (branco) |
| Texto secundario | `rgba(255,255,255,0.5)` |
| Fonte titulos | `FuturaStd-CondensedExtraBd` |
| Fonte corpo | `Source Sans Pro` |
| Logo claro | P laranja + PERFORMA branco |
| Logo escuro | P laranja + PERFORMA cinza + "NAO PARA." |

### Tipo de Anuncio

Contratacao - "Estamos Contratando":
- Professor de Aulas Coletivas
- Professor de Musculacao
- Formados ou Estagio
- Turno Tarde e Noite

### Formato

Stories/Reels vertical: 1080x1920px

### Resultado

Arquivo gerado: `D:\performa-ads\anuncio-contratacao.png` (622KB)

### Comandos Utilizados

```bash
# Analise do site
curl -sL "URL_CSS" | grep -oiE '#[0-9a-fA-F]{3,8}' | sort | uniq -c | sort -rn
curl -sL "URL_CSS" | grep -oiE 'font-family:[^;]+' | sort -u

# Baixar logo
curl -sL "URL_LOGO" -o "D:/performa-ads/logo-performa.png"

# Instalar puppeteer + gerar PNG
cd D:/performa-ads && npm install puppeteer && node screenshot.js
```

---

## Checklist de Entrega

Antes de entregar o criativo ao cliente/upload no Meta Ads:

### Estrutura e Layout
- [ ] **PROPORCAO CONFIRMADA** com o usuario (1:1, 4:5, 9:16, 16:9, 1.91:1)
- [ ] **IMAGEM DO PRODUTO OCUPA 40%+** da area total do criativo
- [ ] Imagem usa `object-fit: cover` com `object-position` correto
- [ ] **Gradiente fade** na transicao imagem → conteudo (60-100px)
- [ ] Badges sobre imagem com `backdrop-filter` (max 2-3 badges)
- [ ] Layout adaptado a proporcao (vertical: img topo | horizontal: img esquerda)
- [ ] **OCUPACAO 70%+** dos elementos na area total do criativo

### Identidade Visual
- [ ] Cores do cliente respeitadas (principal, secundaria, fundo)
- [ ] Fonte do cliente aplicada (Google Fonts ou similar)
- [ ] Logo visivel e em boa resolucao
- [ ] Regra 60-30-10 de cores respeitada

### Copy e Conteudo
- [ ] Texto legivel (font-size adequado para a proporcao)
- [ ] Hierarquia visual clara (Produto > Headline > Badge > CTA)
- [ ] CTA com verbo imperativo (Shop Now, Buy Now, Get Yours)
- [ ] Handle do Instagram incluido
- [ ] Menos de 15% de texto overlay na zona de imagem

### Tecnico
- [ ] PNG gerado sem artefatos ou cortes
- [ ] Tamanho do arquivo < 30MB (limite Meta Ads)
- [ ] Produto reconhecivel em thumbnail 50x50px
- [ ] Testado em visualizacao mobile (375px de largura)

### Quando Template A (Com Imagem) vs Template B (Sem Imagem)
| Situacao | Template | Motivo |
|----------|---------|--------|
| Produto fisico com foto | **Template A** | Imagem hero 40%+ |
| Servico com foto lifestyle | **Template A** | Imagem cria conexao |
| Vaga de emprego | **Template B** | Sem produto fisico |
| Evento sem foto | **Template B** | Icones + texto |
| Promocao com foto | **Template A** | Produto + preco |

---

---

## Instagram Stories de Conteúdo — Padrão de Produção

> Padrão validado em 2026-03-15 para criação de stories estáticos (1080x1920) com imagens de fundo de bancos gratuitos.

### Especificações Técnicas

| Propriedade | Valor |
|-------------|-------|
| **Dimensão** | 1080x1920px (9:16) |
| **Formato de saída** | PNG via Puppeteer screenshot |
| **Fonte títulos** | Playfair Display (serif), 84-96px, font-weight 700 |
| **Fonte corpo** | Inter, 34-40px, font-weight 300-400 |
| **Fonte cards/módulos** | Inter, 27-34px, font-weight 500-600 |
| **Fonte labels/tags** | Inter, 22-26px, letter-spacing 5-7px, uppercase |
| **Background** | Imagem Pexels (free) + overlay escuro |
| **Captura** | Puppeteer com `document.fonts.ready` + 2s delay |

### Overlay Escuro (OBRIGATÓRIO)

**REGRA:** Sempre usar overlay com gradiente de opacidade alta (0.80-0.96) para garantir legibilidade do texto sobre fotos.

```css
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(5,2,15,0.93) 0%,      /* topo: quase opaco */
    rgba(15,5,30,0.85) 25%,
    rgba(15,5,30,0.80) 50%,     /* centro: levemente mais claro */
    rgba(15,5,30,0.85) 75%,
    rgba(5,2,15,0.96) 100%      /* base: quase opaco */
  );
  z-index: 1;
}
```

**Opacidade mínima no ponto mais claro:** 0.75 (NUNCA abaixo disso, senão o texto fica ilegível).

### Tamanho de Elementos (Escala Stories)

**REGRA:** Em 1080x1920, os elementos devem ser SIGNIFICATIVAMENTE maiores que em telas web normais. O conteúdo deve ocupar 85-95% da área útil.

| Elemento | Tamanho Mínimo | Recomendado |
|----------|---------------|-------------|
| Título principal (h1) | 80px | **96px** |
| Título de seção (h2) | 64px | **76-84px** |
| Corpo de texto | 32px | **36-40px** |
| Texto em cards | 28px | **30-34px** |
| Subtexto/descrição em cards | 22px | **26px** |
| Labels/tags | 20px | **22-24px** |
| Ícones emoji | 48px | **56-60px** |
| Números de badge | 20px | **24px** (dentro de círculos 52px) |
| Botão CTA texto | 30px | **36px** |
| Botão CTA padding | 28px 80px | **36px 110px** |

### Padding do Conteúdo

```css
.content {
  padding: 80px 44px 50px;  /* top right/left bottom */
  /* NUNCA usar padding lateral > 56px — desperdiça espaço */
  /* NUNCA usar padding lateral < 40px — cola nas bordas */
}
```

### Cards Glassmorphism (Padrão Stories)

```css
.card {
  padding: 34px 36px;
  background: rgba(255,255,255,0.08);
  border: 1.5px solid rgba(168,85,247,0.3);
  border-radius: 22px;
  backdrop-filter: blur(12px);
}
```

### Barra de Progresso (Simular Stories Reais)

```css
.progress {
  position: absolute;
  top: 44px;
  left: 32px; right: 32px;
  display: flex;
  gap: 8px;
  z-index: 10;
}
.progress span {
  flex: 1; height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 4px;
}
.progress span.active {
  background: rgba(255,255,255,0.9);
}
```

### Text Shadow (Legibilidade)

```css
/* Títulos sobre foto */
text-shadow: 0 4px 30px rgba(0,0,0,0.5);
/* Corpo sobre foto */
text-shadow: 0 2px 20px rgba(0,0,0,0.4);
/* Texto em cards (menor) */
text-shadow: 0 2px 15px rgba(0,0,0,0.3);
```

### Busca de Imagens no Pexels

**URL padrão para download direto:**
```
https://images.pexels.com/photos/{ID}/pexels-photo-{ID}.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop
```

**Workflow:**
1. WebSearch no Pexels por tema relacionado ao story
2. Extrair IDs das URLs das fotos
3. Download com curl usando URL padrão acima
4. Verificar visualmente se a imagem é adequada
5. Usar como `<img class="bg">` com `object-fit: cover`

### Captura com Puppeteer

```javascript
const puppeteer = require('puppeteer');
// Usar puppeteer de ~/.claude/tools/motion-gen/node_modules/puppeteer
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(`file:///${filePath}`, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
await new Promise(r => setTimeout(r, 2000)); // aguardar fontes Google
const stories = await page.$$('.story');
for (let i = 0; i < stories.length; i++) {
  await stories[i].screenshot({ path: `story-${i+1}.png`, type: 'png' });
}
```

### Sequência Típica de 5 Stories

| # | Tipo | Conteúdo | Objetivo |
|---|------|----------|----------|
| 1 | **Hook** | Pergunta provocativa + subtexto | Capturar atenção |
| 2 | **O que é** | Apresentação + 3 diferenciais em cards | Informar |
| 3 | **Detalhes** | Lista/grid de features/módulos | Mostrar valor |
| 4 | **Incluso** | Kit/bônus/benefícios em cards | Criar desejo |
| 5 | **CTA** | Depoimento + botão + @perfil | Converter |

### Paleta Roxa Mística (Temas Holísticos/Espirituais)

```css
:root {
  --bg-dark: #050210;
  --purple-main: #a855f7;
  --purple-dark: #7c3aed;
  --purple-light: #c084fc;
  --purple-text: #d8b4fe;
  --purple-glow: #e9d5ff;
}
```

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-15 - Conteúdo muito pequeno em Stories 1080x1920
**Contexto:** Criação de 5 stories para Instagram a partir de conteúdo de site
**Erro:** Na primeira versão, fontes de 56-72px e padding de 56-60px resultaram em conteúdo que ocupava apenas ~50% da área do story, parecendo "perdido" no frame
**Solução:** Aumentar fontes para 84-96px (títulos) e 34-40px (corpo), reduzir padding lateral para 44-48px, aumentar emojis para 56-60px
**Regra:** Em stories 1080x1920, SEMPRE usar escala de fonte 20-30% maior que o instinto inicial. O conteúdo deve preencher 85-95% da área útil.

### 2026-03-15 - Overlay muito transparente sobre fotos
**Contexto:** Stories com imagens de fundo de banco de fotos gratuito (Pexels)
**Erro:** Overlays com opacidade 0.45-0.65 no ponto mais claro resultaram em texto pouco legível sobre a foto, especialmente em áreas claras da imagem
**Solução:** Usar opacidade mínima de 0.75 no ponto mais claro, e 0.92-0.96 nas extremidades (topo/base)
**Regra:** NUNCA usar overlay com opacidade < 0.75 no ponto mais transparente quando há texto sobre foto. Preferir 0.80+ para garantir legibilidade.

### 2026-03-15 - Puppeteer não encontrado no PATH global
**Contexto:** Script de captura de stories tentou `require('puppeteer')`
**Erro:** `MODULE_NOT_FOUND` porque puppeteer não está instalado globalmente
**Solução:** Usar o puppeteer já instalado em `~/.claude/tools/motion-gen/node_modules/puppeteer`
**Regra:** Puppeteer do sistema está em `~/.claude/tools/motion-gen/node_modules/puppeteer`. Sempre referenciar esse caminho em scripts avulsos.

### 2026-03-15 - WebFetch não extrai imagens do Unsplash
**Contexto:** Tentativa de buscar URLs de imagens via WebFetch no Unsplash
**Erro:** Unsplash carrega imagens via JavaScript dinâmico, WebFetch retorna apenas CSS/JS sem URLs de imagem
**Solução:** Usar WebSearch para encontrar IDs de fotos no Pexels, depois baixar via URL direta `images.pexels.com/photos/{ID}/pexels-photo-{ID}.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1920&fit=crop`
**Regra:** Para imagens de stock, SEMPRE usar Pexels (não Unsplash). Buscar via WebSearch → extrair IDs → download direto via curl.

---

**Documento criado:** 2026-02-23
**Atualizado:** 2026-03-15 (adicionado: padrão Instagram Stories, overlay escuro, escala de fontes, lições aprendidas)
**Versao:** 3.0.0
