---
title: "Carrosseis de Imagem para Feed - Guia Completo de Criacao"
category: "Dev"
tags:
  - carrossel
  - carrossel instagram
  - carrossel feed
  - imagem feed
  - 1080x1350
  - 1080x1080
  - 1080x1920
  - 1920x1080
  - 1200x628
  - multi-proporcao
  - responsive
  - html para imagem
  - puppeteer screenshot
  - chrome cdp
  - slides instagram
  - conteudo organico
  - riwer labs
  - poppins
  - dark theme
  - design system
  - cards
  - grid layout
  - social media
  - png
topic: "Carrosseis de Imagem"
priority: high
version: "4.0.0"
last_updated: "2026-03-12"
---

# Carrosseis de Imagem para Feed - Guia Completo de Criacao

Guia completo para criar carrosseis de imagens em MULTIPLAS PROPORCOES para feed do Instagram, Stories, Reels, Facebook e Meta Ads usando 3 abordagens: A) Python + Puppeteer, B) Node.js + CDP, C) Python + Playwright. O processo gera slides HTML individuais e os converte em PNG de alta qualidade, sem depender de Canva/Photoshop. Suporta 5 proporcoes: 1:1 (1080x1080), 4:5 (1080x1350), 9:16 (1080x1920), 16:9 (1920x1080) e 1.91:1 (1200x628).

### REGRAS GLOBAIS — LER ANTES DE CRIAR QUALQUER CARROSSEL

1. **PROIBIDO BOTOES** — NUNCA usar elementos visuais que simulem botoes (divs com background colorido + border-radius + padding simulando botao, cursor:pointer, box-shadow, gradientes de botao). Todo conteudo deve ser SOMENTE TEXTO.
2. **SLIDE 1 (CAPA)** — Somente 3 camadas de texto: tag uppercase + titulo com span colorido + subtitulo. Sem badges, sem divisores.
3. **SLIDE 10 (CTA)** — Somente texto: titulo + chamada em cor de destaque + dados de contato. Sem botoes.
4. **MINIMO 70% DE OCUPACAO** — Os elementos da imagem (textos, titulos, icones, cards, listas, numerais) DEVEM usar no minimo 70% do espaco da imagem. Fontes grandes, distribuicao ampla, NUNCA conteudo "perdido" no centro. Se parecer vazio, AUMENTAR tamanho dos elementos.
5. **IMAGENS NOS SLIDES** — Nas Abordagens A e B (organico), NUNCA usar imagens externas (AI-generated, fotos, backgrounds). Conteudo 100% tipografico/visual com CSS. Na **Abordagem C (Ads)**, imagens externas SAO PERMITIDAS (logos de marcas, badges de ligas, fotos de produto) — aplicar `background:#fff;border-radius:6px;padding:3px` em logos com fundo transparente sobre tema escuro.
6. **TODOS OS CONTAINERS COM `align-items:center`** — Todo container de conteudo DEVE ter `display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;`. Em slides com listas, o `text-align` interno dos itens pode ser `left`, mas o bloco como um todo deve estar centralizado.
7. **SEMPRE PERGUNTAR A PROPORCAO** — Antes de gerar qualquer criativo ou carrossel, PERGUNTAR ao usuario qual proporcao deseja. Opcoes: `1:1` (1080x1080), `4:5` (1080x1350), `9:16` (1080x1920), `16:9` (1920x1080), `1.91:1` (1200x628). Se nao especificado, usar 4:5 como padrao.
8. **TECNICAS DE DESIGN AVANCADAS** — Aplicar: Z-Pattern para guiar o olho (logo→titulo→conteudo→CTA), hierarquia visual por tamanho/peso/cor, regra 60-30-10 para distribuicao de cores (60% neutro, 30% secundaria, 10% destaque), espacamento consistente com escala base-8.

---

## Indice

1. [Visao Geral do Processo](#1-visao-geral-do-processo)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Design Tokens](#3-design-tokens)
4. [Estrutura HTML Base (Template)](#4-estrutura-html-base-template)
5. [Area de Conteudo](#5-area-de-conteudo)
6. [Catalogo de Layouts por Tipo de Slide](#6-catalogo-de-layouts-por-tipo-de-slide)
7. [Tamanhos de Fonte por Elemento](#7-tamanhos-de-fonte-por-elemento)
8. [Espacamentos e Margens](#8-espacamentos-e-margens)
9. [Componentes Reutilizaveis](#9-componentes-reutilizaveis)
10. [Script Python: Estrutura do Build](#10-script-python-estrutura-do-build)
11. [Screenshot com Puppeteer](#11-screenshot-com-puppeteer)
12. [Boas Praticas](#12-boas-praticas)
13. [Troubleshooting](#13-troubleshooting)
14. [Caso Real: Riwer Labs Organico](#14-caso-real-riwer-labs-organico)
15. [Abordagem C: Python + Playwright (Ads)](#15-abordagem-c-python--playwright-ads)
16. [Caso Real: BetPredict Carousel Ads](#16-caso-real-betpredict-carousel-ads)

---

## 1. Visao Geral do Processo

### 1.1 Abordagem A: Python + Puppeteer (Headless — Original)

```
FLUXO:
  Python Build Script (.py) → HTMLs Individuais → Puppeteer Screenshot → PNGs
```

**Stack:**
- **Geracao:** Python 3.x
- **Captura:** Node.js + Puppeteer (Chrome headless)
- **Quando usar:** Ambiente de servidor/CI sem Chrome do usuario

### 1.2 Abordagem B: Node.js + CDP (Chrome Aberto — Recomendada em 2026)

```
FLUXO:
  Script Node.js unico (gerar-cards-vX.js)
      |
      v
  Chrome ja aberto pelo chrome-manager.js (porta 9333+)
      |
      v
  CDP (chrome-remote-interface): nova aba → navega HTML → screenshot → fecha aba
      |
      v
  PNGs 1080x1350 salvos direto no diretorio do projeto
```

**Stack:**
- **Geracao + Captura:** Node.js + `chrome-remote-interface` (CDP)
- **Chrome:** Instancia ja aberta pelo usuario via `~/.claude/chrome-manager.js`
- **Dependencia:** `chrome-remote-interface` em `~/.claude/task-scheduler/node_modules/`
- **Quando usar:** Desenvolvimento local no Windows, iteracoes rapidas

**Vantagens sobre Puppeteer:**
- Reutiliza Chrome existente (sem spawn/kill de processo)
- 0 instalacao adicional (CDP nativo no Chrome)
- Mais rapido (sem overhead de boot do Chrome)
- Funciona com Chrome do usuario (fontes, perfil, etc)

**Como abrir o Chrome antes de rodar:**
```bash
node "~/.claude/chrome-manager.js" open --profile "Profile 0" --port 9333
```

**Por que qualquer metodo?**
- Controle pixel-perfect sobre cada elemento
- Automacao completa (10 slides em ~30 segundos com CDP)
- Consistencia visual garantida por design tokens
- Sem dependencia de ferramentas pagas

---

## 2. Estrutura do Projeto

### Abordagem A (Python + Puppeteer)

```
projeto-carrosseis/
  |-- build-01.py          # Gera carrossel 01 (10 slides)
  |-- build-02.py          # Gera carrossel 02 (10 slides)
  |-- ...
  |-- build-10.py          # Gera carrossel 10 (10 slides)
  |-- logo-b64.txt         # Logo em base64 (sem data:image prefix)
  |-- screenshot-all.js    # Puppeteer: captura todos os PNGs
  |-- carrossel-01/
  |     |-- slide-01.html
  |     |-- slide-01.png
  |     |-- slide-02.html
  |     |-- slide-02.png
  |     |-- ...
  |     |-- slide-10.html
  |     |-- slide-10.png
  |-- carrossel-02/
  |-- ...
```

**Convencoes de nomes:**
- Diretorio: `carrossel-XX` (XX = 01..10)
- Slides: `slide-XX.html` e `slide-XX.png` (XX = 01..10)
- Build scripts: `build-XX.py`

### Abordagem B (Node.js + CDP)

```
~/.claude/temp/carrossel-1/
  |-- gerar-cards-v1.js    # v1 do script gerador
  |-- gerar-cards-v2.js    # v2 com correcoes
  |-- gerar-cards-v3.js    # v3 + novas features
  |-- gerar-cards-v4.js    # versao final aprovada
  |-- slide-01.png
  |-- slide-02.png
  |-- ...
  |-- slide-10.png
```

**Convencoes de nomes (CDP):**
- Script: `gerar-cards-vN.js` (incrementar versao a cada iteracao)
- PNGs: `slide-XX.png` (XX = 01..10), salvos no mesmo diretorio do script
- Nao gerar HTMLs intermediarios (o script faz tudo em memoria)

---

## 3. Design Tokens

### 3.1 Paleta de Cores (Riwer Labs Dark Theme)

```python
# Cores primarias
PRIMARY      = "#D0FF59"   # Verde-limao vibrante (destaque principal)
PRIMARY_DARK = "#B8E64C"   # Verde-limao escuro (variacao)
SECONDARY    = "#2D54FF"   # Azul eletrico (destaque secundario)
ACCENT       = "#ff69b4"   # Rosa/pink (acentuacao)

# Fundos (do mais escuro ao mais claro)
DARK_1       = "#0D0D0D"   # Fundo principal do slide
DARK_2       = "#121212"   # Fundo alternativo (raramente usado)
DARK_3       = "#1A1A1A"   # Fundo de cards/caixas
DARK_4       = "#242424"   # Bordas de cards

# Texto
TEXT_WHITE   = "#ffffff"   # Texto principal
TEXT_MUTED   = "#A0A0A0"   # Texto secundario/subtitulos
```

### 3.2 Gradientes

```css
/* Barra gradiente topo */
background: linear-gradient(90deg, #D0FF59, #2D54FF, #ff69b4);

/* Barra gradiente rodape (ordem invertida) */
background: linear-gradient(90deg, #2D54FF, #ff69b4, #D0FF59);

/* Background para tip boxes */
background: rgba(208, 255, 89, 0.12);  /* PRIMARY com 12% opacidade */
background: rgba(255, 105, 180, 0.12); /* ACCENT com 12% opacidade */
background: rgba(45, 84, 255, 0.12);   /* SECONDARY com 12% opacidade */
```

### 3.3 Tipografia

```css
/* Fonte principal (unica para todo o carrossel) */
font-family: 'Poppins', sans-serif;

/* Import via Google Fonts (incluir no <head>) */
/* Pesos usados: 300, 400, 500, 600, 700, 800, 900 */
```

**URL do Google Fonts:**
```
https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap
```

### 3.4 Icones — Font Awesome (OBRIGATORIO)

Usar Font Awesome 6.5 via CDN para todos os icones. **PROIBIDO usar emojis** (renderizam de forma inconsistente no Chrome CDP).

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">
```

**Icones mais usados em carrosseis:**
| Contexto | Icone | Classe |
|----------|-------|--------|
| Tag trafego | bullhorn | `fas fa-bullhorn` |
| Alerta/problema | eye-slash | `fas fa-eye-slash` |
| Rota/jornada | route | `fas fa-route` |
| Velocidade/forca | bolt | `fas fa-bolt` |
| Grafico linha | chart-line | `fas fa-chart-line` |
| Grafico pizza | chart-pie | `fas fa-chart-pie` |
| Check ok | check-circle | `fas fa-check-circle` |
| X erro | times-circle | `fas fa-times-circle` |
| Seta direita | arrow-right | `fas fa-arrow-right` |
| Alerta triangulo | triangle-exclamation | `fas fa-triangle-exclamation` |
| Busca/analise | magnifying-glass-chart | `fas fa-magnifying-glass-chart` |
| Presente/oferta | gift | `fas fa-gift` |
| Segmentacao | crosshairs | `fas fa-crosshairs` |
| Camadas | layer-group | `fas fa-layer-group` |
| Controles | sliders | `fas fa-sliders` |
| Usuario check | user-check | `fas fa-user-check` |

### 3.4 Border Radius

| Elemento | Valor |
|----------|-------|
| Cards grandes | `16px` |
| Cards menores | `14px` |
| Badges/tags | `24px` (NOTA: badges somente em slides internos, NUNCA no slide 1) |
| Tip boxes | `12px` |
| Step numbers | `14px` |

---

## 3.5 Sistema Multi-Proporcao (Responsive Design Tokens)

### 3.5.1 Proporcoes Suportadas

| ID | Nome | Dimensoes | Ratio | Uso Principal | Plataforma |
|----|------|-----------|-------|---------------|------------|
| `square` | Quadrado | 1080x1080 | 1:1 | Feed, Carrossel | Instagram, Facebook |
| `portrait` | Retrato | 1080x1350 | 4:5 | Feed (melhor CTR) | Instagram, Facebook |
| `story` | Story/Reels | 1080x1920 | 9:16 | Stories, Reels, TikTok | Instagram, TikTok, Facebook |
| `landscape` | Paisagem | 1920x1080 | 16:9 | YouTube, Desktop | YouTube, LinkedIn |
| `fb-wide` | Facebook Wide | 1200x628 | 1.91:1 | Facebook Feed, Audience Network | Facebook, Google Ads |

**REGRA:** Sempre perguntar ao usuario: _"Qual proporcao voce quer? (1:1, 4:5, 9:16, 16:9, 1.91:1)"_
Se nao especificado, usar **4:5 (1080x1350)** como padrao.

### 3.5.2 Formula de Escala Responsiva

Todos os valores de design tokens (fonts, margins, paddings, gaps) sao calculados a partir da proporcao base **4:5 (1080x1350)** usando fatores de escala:

```javascript
// Proporcao base (referencia para todos os calculos)
const BASE = { w: 1080, h: 1350 };

// Calcular fatores de escala para qualquer proporcao
function getScale(target) {
  const wScale = target.w / BASE.w;   // escala horizontal
  const hScale = target.h / BASE.h;   // escala vertical
  return {
    wScale,
    hScale,
    // Escala de fonte: media geometrica (equilibra ambas dimensoes)
    fontScale: Math.sqrt(wScale * hScale),
    // Escala de margem: baseada na menor dimensao (evita overflow)
    marginScale: Math.min(wScale, hScale),
    // Escala de gap: baseada na menor dimensao
    gapScale: Math.min(wScale, hScale),
    // Area util
    contentW: target.w - Math.round(100 * wScale),  // menos margens laterais
    contentH: target.h - Math.round(140 * hScale),  // menos header + footer
  };
}
```

### 3.5.3 Tabela de Fatores de Escala Pre-Calculados

| Proporcao | wScale | hScale | fontScale | marginScale | Area Util (WxH) |
|-----------|--------|--------|-----------|-------------|-----------------|
| **1:1** (1080x1080) | 1.00 | 0.80 | 0.89 | 0.80 | 980 x 968 |
| **4:5** (1080x1350) | 1.00 | 1.00 | 1.00 | 1.00 | 980 x 1210 |
| **9:16** (1080x1920) | 1.00 | 1.42 | 1.19 | 1.00 | 980 x 1722 |
| **16:9** (1920x1080) | 1.78 | 0.80 | 1.19 | 0.80 | 1742 x 968 |
| **1.91:1** (1200x628) | 1.11 | 0.47 | 0.72 | 0.47 | 1090 x 562 |

### 3.5.4 Tamanhos de Fonte por Proporcao

Aplicar `fontScale` ao valor base (4:5). Arredondar para inteiro.

| Elemento | 4:5 (base) | 1:1 | 9:16 | 16:9 | 1.91:1 |
|----------|-----------|-----|------|------|--------|
| Titulo capa | 72px | 64px | 86px | 86px | 52px |
| Titulo secao | 62px | 55px | 74px | 74px | 45px |
| Titulo transicao | 58px | 52px | 69px | 69px | 42px |
| Numero gigante | 180px | 160px | 214px | 214px | 130px |
| Numero stat | 66-72px | 59-64px | 79-86px | 79-86px | 48-52px |
| Subtitulo | 26px | 23px | 31px | 31px | 19px |
| Label card | 26px | 23px | 31px | 31px | 19px |
| Item lista | 24px | 21px | 29px | 29px | 17px |
| Tag/categoria | 20px | 18px | 24px | 24px | 14px |
| Descricao card | 20px | 18px | 24px | 24px | 14px |
| Footer/meta | 13px | 13px | 15px | 15px | 13px |

**REGRA:** Fonte minima ABSOLUTA = 13px (mesmo escalando para baixo).

### 3.5.5 Margens e Espacamentos por Proporcao

| Elemento | 4:5 (base) | 1:1 | 9:16 | 16:9 | 1.91:1 |
|----------|-----------|-----|------|------|--------|
| Margem lateral | 50px | 50px | 50px | 70px | 44px |
| Topo conteudo | 80px | 64px | 80px | 64px | 38px |
| Base conteudo | 60px | 48px | 60px | 48px | 28px |
| Barra gradiente | 6px | 5px | 6px | 5px | 4px |
| Logo height | 32px | 28px | 32px | 28px | 22px |
| Grid gap | 24px | 19px | 28px | 19px | 14px |
| Card padding | 34px 28px | 27px 22px | 40px 33px | 27px 22px | 20px 16px |
| Tag→Titulo gap | 28px | 22px | 33px | 22px | 16px |
| Titulo→Grid gap | 32px | 26px | 38px | 26px | 18px |

### 3.5.6 Adaptacoes de Layout por Proporcao

#### 1:1 (Quadrado) — Mais Compacto
- Grid 2x2: manter, reduzir padding dos cards
- Grid 3col: manter, fontes menores
- Steps: reduzir sub-itens para 2 (em vez de 4)
- Tip box: opcional, remover se nao couber
- CTA: titulo + chamada apenas (sem contato extenso)

#### 9:16 (Story/Vertical) — Mais Espaco
- Grid 2x2: aumentar gap e padding
- Grid 3col: converter para 1 coluna com 3 cards empilhados
- Steps: espaco generoso, tip box sempre visivel
- Adicionar mais breathing room entre secoes
- CTA: pode incluir mais informacoes de contato

#### 16:9 (Paisagem) — Layout Horizontal
- **MUDANCA FUNDAMENTAL:** usar layout side-by-side em vez de empilhado
- Grid 2x2: converter para 4 em linha (1x4) ou manter 2x2 com mais gap horizontal
- Titulo: centralizado no topo, conteudo expandido horizontalmente
- CTA: titulo a esquerda, informacoes a direita

#### 1.91:1 (Facebook Wide) — Ultra Compacto
- **MINIMALISTA:** maximo 1 titulo + 2-3 elementos
- Grid: 2 ou 3 em linha horizontal
- Sem sub-itens complexos
- CTA: inline (titulo + chamada na mesma linha)
- Logo menor (22px)

### 3.5.7 Mapa de Areas por Proporcao

```
=== 1:1 (1080x1080) ===
+------------------------------------------+ 0px
| ===== BARRA GRADIENTE (5px) ============ | 5px
| [LOGO 28px]            [01|10]           | 24-56px
+------------------------------------------+ 64px
|                                          |
|           AREA DE CONTEUDO               |
|      (980px x 968px)                     |
|                                          |
+------------------------------------------+ 1032px
| url                          Arraste ->  |
| ===== BARRA GRADIENTE (5px) ============ | 1075-1080px
+------------------------------------------+

=== 9:16 (1080x1920) ===
+------------------------------------------+ 0px
| ===== BARRA GRADIENTE (6px) ============ | 6px
| [LOGO 32px]            [01|10]           | 30-66px
+------------------------------------------+ 80px
|                                          |
|                                          |
|           AREA DE CONTEUDO               |
|      (980px x 1780px)                    |
|                                          |
|                                          |
+------------------------------------------+ 1860px
| url                          Arraste ->  |
| ===== BARRA GRADIENTE (6px) ============ | 1914-1920px
+------------------------------------------+

=== 16:9 (1920x1080) ===
+------------------------------------------------------------+ 0px
| ===== BARRA GRADIENTE (5px) ============================== | 5px
| [LOGO 28px]                                  [01|10]       | 24-56px
+------------------------------------------------------------+ 64px
|                                                            |
|                  AREA DE CONTEUDO                          |
|             (1780px x 968px)                               |
|                                                            |
+------------------------------------------------------------+ 1032px
| url                                          Arraste ->    |
| ===== BARRA GRADIENTE (5px) ============================== | 1075-1080px
+------------------------------------------------------------+

=== 1.91:1 (1200x628) ===
+--------------------------------------------------------------+ 0px
| ===== BARRA GRADIENTE (4px) ================================ | 4px
| [LOGO 22px]                                    [01|10]       | 18-42px
+--------------------------------------------------------------+ 38px
|                                                              |
|               AREA DE CONTEUDO (1112px x 562px)              |
|                                                              |
+--------------------------------------------------------------+ 600px
| url                                            Arraste ->    |
| ===== BARRA GRADIENTE (4px) ================================ | 624-628px
+--------------------------------------------------------------+
```

### 3.5.8 Regra de Ocupacao 70% por Proporcao

**A regra de 70% de ocupacao se aplica a TODAS as proporcoes.** O calculo de area minima varia:

| Proporcao | Area Total | Area Util | 70% Minimo | Estrategia |
|-----------|-----------|-----------|------------|------------|
| 1:1 | 1.166.400px² | 948.640px² | 664.048px² | Fontes grandes, poucos elementos, sem desperdicio |
| 4:5 | 1.458.000px² | 1.185.800px² | 830.060px² | Referencia base |
| 9:16 | 2.073.600px² | 1.744.400px² | 1.221.080px² | Mais elementos ou mais espaco entre eles |
| 16:9 | 2.073.600px² | 1.726.960px² | 1.208.872px² | Layout horizontal, usar largura total |
| 1.91:1 | 753.600px² | 622.960px² | 436.072px² | Ultra compacto, cada pixel conta |

**COMO VALIDAR:**
- Visualmente: o conteudo deve "preencher" o slide sem parecer vazio
- O background escuro entre elementos nao deve ser o foco
- Se mais de 30% da area visivel for background puro, AUMENTAR elementos

### 3.5.9 Tecnicas Avancadas de Design

#### Z-Pattern (Padrao de Leitura)
Aplicar em TODOS os slides para guiar o olho naturalmente:
```
LOGO (canto sup-esq) ────────→ CONTADOR (canto sup-dir)
         ↘                              ↙
              CONTEUDO CENTRAL
         ↙                              ↘
FOOTER/URL (inf-esq) ────────→ CTA/ARRASTE (inf-dir)
```

#### Hierarquia Visual (5 Niveis)
```
Nivel 1: TITULO      → Maior (62-86px), mais pesado (800-900), cor branca
Nivel 2: NUMEROS     → Grande (66-214px), mais pesado (900), cor de destaque
Nivel 3: LABELS      → Medio (19-31px), semi-bold (600-700), cor de destaque
Nivel 4: CORPO       → Medio (17-24px), normal (400-500), cor muted
Nivel 5: META        → Pequeno (13-15px), leve (400), cor cinza
```

#### Regra 60-30-10 para Cores
```
60% — Cor neutra (fundo #0D0D0D + texto #ffffff)
30% — Cor secundaria (TEXT_MUTED #A0A0A0, cards #1A1A1A)
10% — Cor de destaque (PRIMARY #D0FF59, SECONDARY #2D54FF, ACCENT #ff69b4)
```

#### Escala Modular de Tipografia (Ratio 1.333 — Perfect Fourth)
```
Base: 18px
Nivel 1: 18px (corpo)
Nivel 2: 24px (labels) = 18 * 1.333
Nivel 3: 32px (subtitulos) = 24 * 1.333
Nivel 4: 43px (titulos menores) = 32 * 1.333
Nivel 5: 57px (titulos) = 43 * 1.333
Nivel 6: 76px (hero) = 57 * 1.333
```

#### Espacamento Base-8
Todos os espacamentos devem ser multiplos de 8px:
```
8px, 16px, 24px, 32px, 40px, 48px, 56px, 64px, 72px, 80px
```
Excecao: valores muito pequenos (4px, 6px) para bordas e detalhes.

#### Contraste WCAG
- Texto branco (#fff) sobre fundo escuro (#0D0D0D): ratio 19.3:1 (AAA)
- Texto muted (#A0A0A0) sobre fundo escuro (#0D0D0D): ratio 8.5:1 (AAA)
- Texto escuro sobre PRIMARY (#D0FF59): ratio 13.8:1 (AAA)
- **REGRA:** Manter ratio minimo 4.5:1 para texto normal, 3:1 para texto grande

---

## 4. Estrutura HTML Base (Template)

Todo slide usa a mesma estrutura base. Na abordagem CDP (Node.js), implementada como funcao `base(num, total, content, showArraste)` que recebe as dimensoes da proporcao escolhida.

**IMPORTANTE:** A funcao `base()` DEVE receber as dimensoes do viewport e calcular margens/tamanhos proporcionalmente. Ver secao 3.5 para os fatores de escala.

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<!-- Font Awesome OBRIGATORIO -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  width:1080px;height:1350px;overflow:hidden;
  font-family:'Poppins',sans-serif;
  background:#0D0D0D;color:#ffffff;
  position:relative;
}
</style></head><body>

<!-- BARRA GRADIENTE TOPO (6px) -->
<div style="position:absolute;top:0;left:0;width:100%;height:6px;
    background:linear-gradient(90deg,#D0FF59,#2D54FF,#ff69b4);"></div>

<!-- LOGO (canto superior esquerdo) -->
<div style="position:absolute;top:30px;left:50px;">
  <img src="data:image/png;base64,{LOGO_B64}" style="height:32px;" alt="Marca">
</div>

<!-- CONTADOR DE SLIDES (canto superior direito) -->
<div style="position:absolute;top:34px;right:50px;
    font-size:15px;font-weight:600;color:#A0A0A0;">
    01<span style="color:#333;">|</span>10
</div>

<!-- ===== AREA DE CONTEUDO (ver secao 5) ===== -->
{BODY}

<!-- SWIPE HINT (todos os slides EXCETO o ultimo) -->
<div style="position:absolute;bottom:30px;right:60px;
    color:#A0A0A0;font-size:16px;font-weight:500;
    display:flex;align-items:center;gap:8px;">
    Arraste <i class="fas fa-arrow-right" style="font-size:14px;"></i>
</div>

<!-- BARRA GRADIENTE RODAPE (6px, cores invertidas) -->
<div style="position:absolute;bottom:0;left:0;width:100%;height:6px;
    background:linear-gradient(90deg,#2D54FF,#ff69b4,#D0FF59);"></div>

<!-- TEXTO DO RODAPE -->
<div style="position:absolute;bottom:14px;left:50px;
    font-size:13px;color:#A0A0A0;font-weight:400;">
    riwerlabs.com
</div>

</body></html>
```

> **Diferenca v2:** Contador usa `|` (pipe) em vez de `/`, swipe hint usa `<i class="fas fa-arrow-right">` em vez de `&rarr;`.

### Mapa de Areas do Slide (1080x1350)

```
+----------------------------------------------------------+  0px
| ============ BARRA GRADIENTE (6px) ===================== |  6px
|                                                          |
|  [LOGO 32px]                          [01/10 CONTADOR]   | 30-66px
|                                                          |
+----------------------------------------------------------+ 80px
|                                                          |
|                                                          |
|                                                          |
|                                                          |
|               AREA DE CONTEUDO                           |
|          (top:80px  left:50px  right:50px  bottom:60px)  |
|          = 980px largura x 1210px altura util            |
|                                                          |
|                                                          |
|                                                          |
|                                                          |
+----------------------------------------------------------+ 1290px
|  riwerlabs.com                     Arraste ->            |
| ============ BARRA GRADIENTE (6px) ===================== | 1344-1350px
+----------------------------------------------------------+
```

**Dimensoes uteis:**
- Area total: 1080x1350px
- Area de conteudo: **980px largura** x **1210px altura** (maximo)
- Margins laterais: 50px cada lado
- Topo da area de conteudo: 80px (abaixo do header)
- Base da area de conteudo: 60px acima do rodape

---

## 5. Area de Conteudo

O container de conteudo usa posicionamento absoluto com flexbox vertical:

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;">
    <!-- Conteudo do slide aqui -->
</div>
```

**Propriedades criticas:**
- `position:absolute` — posicionamento preciso dentro do body
- `top:80px` — espaco para header (logo + contador)
- `left:50px; right:50px` — margens laterais de 50px
- `bottom:60px` — espaco para footer (barra + texto + swipe)
- `display:flex; flex-direction:column` — empilhamento vertical
- `justify-content:center` — centraliza verticalmente o conteudo
- `align-items:center` — centraliza horizontalmente o conteudo (**OBRIGATORIO desde v4**)
- `text-align:center` — alinha texto ao centro (**OBRIGATORIO em todos os slides**)

**REGRA DE CENTRALIZACAO (v4+):** TODOS os containers de conteudo devem ter:
```html
display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;
```
Em slides com listas/steps/checklist: o container externo centraliza, mas cada item interno pode ter `text-align:left` para legibilidade — e o bloco de lista deve ter `width:100%` para expandir corretamente.

---

## 6. Catalogo de Layouts por Tipo de Slide

### 6.1 CAPA (Slide 01 — Abertura)

Slide de abertura do carrossel. Atrai atencao e define o tema.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;text-align:center;">

    <!-- Tag/Categoria -->
    <div style="font-size:20px;font-weight:600;color:#D0FF59;
        text-transform:uppercase;letter-spacing:2px;margin-bottom:28px;">
        Guia Completo
    </div>

    <!-- Titulo Principal -->
    <div style="font-size:72px;font-weight:800;line-height:1.1;
        margin-bottom:24px;letter-spacing:-2px;">
        Voce sabe o que e<br>
        <span style="color:#D0FF59;">Inteligencia Artificial?</span>
    </div>

    <!-- Subtitulo -->
    <div style="font-size:26px;color:#A0A0A0;font-weight:400;
        line-height:1.5;">
        Descubra como a IA esta revolucionando negocios<br>
        e preparando empresas para o futuro
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor | Extras |
|----------|-----------|--------|-----|--------|
| Tag | 20px | 600 | PRIMARY ou SECONDARY ou ACCENT | uppercase, letter-spacing:2px |
| Titulo | 72px | 800 | WHITE (frase-chave em cor diferente via `<span>`) | line-height:1.1, letter-spacing:-2px |
| Subtitulo | 26px | 400 | TEXT_MUTED | line-height:1.5 |

**REGRAS OBRIGATORIAS DO SLIDE 1 (CAPA):**

1. **SOMENTE TEXTO** — Proibido usar badges (divs com background colorido + border-radius),
   botoes, divisores (linhas horizontais), ou qualquer elemento visual alem de texto puro.
2. **3 CAMADAS DE TEXTO:**
   - Tag/Categoria: texto simples uppercase em cor de destaque (PRIMARY, SECONDARY ou ACCENT)
   - Titulo Principal: texto grande (72px) com uma frase-chave envolta em `<span style="color:COR">`
   - Subtitulo: texto descritivo em TEXT_MUTED
3. **CORES DIFERENTES NO TEXTO** — A tag usa uma cor, o titulo usa branco com destaque em cor,
   o subtitulo usa TEXT_MUTED. Variar as cores entre carrosseis para diferenciar.
4. **SEM `align-items:center`** no container (causa problemas de centralizacao).
   Usar apenas `text-align:center` e `justify-content:center`.
5. **Quebras de linha com `<br>`** — Manter no maximo 2-3 linhas no titulo,
   quebrando naturalmente para ocupar bem o espaco.

**Exemplo de variacao de cores entre carrosseis:**
- Carrossel 01: tag=PRIMARY, destaque=PRIMARY
- Carrossel 02: tag=PRIMARY, destaque=#ff4444 (urgencia)
- Carrossel 03: tag=SECONDARY, destaque=SECONDARY
- Carrossel 04: tag=ACCENT, destaque=ACCENT
- Carrossel 05: tag=PRIMARY, destaque=PRIMARY
- etc. (alternar para diferenciar visualmente)

---

### 6.1-B NUMERO GIGANTE HERO (Stat de Impacto)

Layout com numero enorme centralizado + card de contexto + fonte. Muito eficaz para dados estatisticos.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">

  <!-- Tag com icone Font Awesome -->
  <div style="font-size:16px;font-weight:600;color:#D0FF59;
      text-transform:uppercase;letter-spacing:3px;margin-bottom:36px;
      display:flex;align-items:center;justify-content:center;gap:10px;">
    <i class="fas fa-eye-slash" style="font-size:14px;"></i>
    O problema invisivel
  </div>

  <!-- Card com numero gigante -->
  <div style="background:#1a1a1a;border-radius:24px;padding:56px 80px;
      width:100%;margin-bottom:28px;border:1px solid rgba(208,255,89,0.08);">

    <!-- Numero gigante (180px) -->
    <div style="font-size:180px;font-weight:900;line-height:1;
        color:#D0FF59;letter-spacing:-6px;margin-bottom:16px;">
      96%
    </div>

    <!-- Descricao do numero -->
    <div style="font-size:30px;font-weight:700;color:#ffffff;line-height:1.35;margin-bottom:20px;">
      dos visitantes do seu site <span style="color:#D0FF59;">nao estao prontos</span><br>
      para comprar na primeira visita
    </div>

    <!-- Implicacao -->
    <div style="font-size:20px;color:#A0A0A0;line-height:1.5;">
      Mas voce continua pagando por novos cliques.<br>
      O dinheiro sai. O cliente nao fica.
    </div>
  </div>

  <!-- Componente fonte/citacao -->
  <div style="font-size:13px;color:#888;background:#111;border:1px solid #1e1e1e;
      border-radius:8px;padding:8px 20px;display:inline-flex;align-items:center;gap:8px;">
    <i class="fas fa-chart-bar" style="color:#555;font-size:11px;"></i>
    Invesp, 2023
  </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor |
|----------|-----------|--------|-----|
| Tag (com icone FA) | 16px | 600 | PRIMARY/SECONDARY/ACCENT |
| Numero gigante | 180px | 900 | PRIMARY/SECONDARY/ACCENT |
| Descricao do numero | 30px | 700 | WHITE (destaque em span) |
| Implicacao | 20px | 400 | TEXT_MUTED |
| Fonte/citacao | 13px | 400 | #888 |

**Alternancia de cor por slide:**
- Slides impares: `#D0FF59` (LIME)
- Slides pares: `#2D54FF` (BLUE)
- Slides especiais: `#ff69b4` (PINK)

---

### 6.2 GRID 2x2 (Cards com Emoji)

Layout com 4 cards em grid, ideal para listar categorias/beneficios.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;text-align:center;">

    <!-- Titulo da secao -->
    <div style="font-size:62px;font-weight:800;margin-bottom:28px;
        letter-spacing:-1px;">
        IA nos Negocios
    </div>

    <!-- Grid 2x2 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">

        <!-- Card -->
        <div style="background:#1A1A1A;border-radius:16px;padding:34px 28px;
            border:1px solid #242424;text-align:center;">
            <div style="font-size:52px;margin-bottom:14px;">emoji</div>
            <div style="font-size:26px;font-weight:700;margin-bottom:12px;
                color:#D0FF59;">
                Label do Card
            </div>
            <div style="font-size:20px;color:#A0A0A0;font-weight:400;
                line-height:1.4;">
                Descricao curta do card
            </div>
        </div>
        <!-- ... mais 3 cards identicos -->
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor | Extras |
|----------|-----------|--------|-----|--------|
| Titulo secao | 62px | 800 | WHITE | letter-spacing:-1px |
| Emoji | 52px | — | — | margin-bottom:14px |
| Label card | 26px | 700 | PRIMARY/SECONDARY/ACCENT | margin-bottom:12px |
| Descricao card | 20px | 400 | TEXT_MUTED | line-height:1.4 |

**Card specs:** background:#1A1A1A, border-radius:16px, padding:34px 28px, border:1px solid #242424

---

### 6.3 GRID 3 COLUNAS (Stats/Numeros)

Layout com 3 cards em linha, ideal para exibir estatisticas.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;text-align:center;">

    <div style="font-size:62px;font-weight:800;margin-bottom:32px;">
        Titulo da Secao
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;">
        <div style="background:#1A1A1A;border-radius:16px;padding:40px 25px;
            border:1px solid #242424;text-align:center;">
            <div style="font-size:72px;font-weight:900;color:#D0FF59;
                margin-bottom:14px;line-height:1;">
                85%
            </div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;
                margin-bottom:10px;">
                Label
            </div>
            <div style="font-size:18px;color:#A0A0A0;font-weight:400;">
                Descricao
            </div>
        </div>
        <!-- ... mais 2 cards -->
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor |
|----------|-----------|--------|-----|
| Titulo | 62px | 800 | WHITE |
| Numero grande | 72px | 900 | PRIMARY/SECONDARY/ACCENT |
| Label | 20px | 700 | WHITE |
| Descricao | 18px | 400 | TEXT_MUTED |

**Card specs:** padding:40px 25px, border-radius:16px

---

### 6.4 GRID 2x2 (Metricas com Numeros Grandes)

Variacao do grid 2x2 focada em dados numericos impactantes.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;">

    <!-- Tag -->
    <div style="font-size:20px;font-weight:600;color:#2D54FF;
        text-transform:uppercase;letter-spacing:2px;margin-bottom:18px;
        text-align:center;">METRICAS REAIS</div>

    <!-- Titulo -->
    <h2 style="font-size:50px;font-weight:800;margin-bottom:28px;
        line-height:1.2;text-align:center;">
        Titulo com Contexto
    </h2>

    <!-- Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
        <div style="background:#1A1A1A;padding:30px 26px;border-radius:16px;
            text-align:center;border:1px solid #242424;">
            <p style="font-size:66px;font-weight:900;color:#D0FF59;
                letter-spacing:-2px;margin-bottom:10px;">40%</p>
            <p style="font-size:19px;color:#ffffff;font-weight:600;">Label</p>
            <p style="font-size:16px;color:#A0A0A0;">Sub-label</p>
        </div>
        <!-- ... mais 3 cards -->
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight |
|----------|-----------|--------|
| Tag | 20px | 600 |
| Titulo | 50px | 800 |
| Numero grande | 66px | 900 |
| Label | 19px | 600 |
| Sub-label | 16px | 400 |

---

### 6.5 DUAS COLUNAS (Comparacao/Listas)

Layout side-by-side para comparacoes (antes/depois, com/sem IA, etc).

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;">

    <div style="text-align:center;margin-bottom:32px;">
        <!-- Badge -->
        <div style="display:inline-block;background:#D0FF59;color:#0D0D0D;
            padding:12px 28px;border-radius:24px;font-size:20px;
            font-weight:600;margin-bottom:22px;letter-spacing:1px;
            text-transform:uppercase;">
            BADGE
        </div>
        <!-- Titulo -->
        <h2 style="font-size:50px;font-weight:800;color:#ffffff;
            margin:0;line-height:1.2;letter-spacing:-1px;">
            Titulo da Comparacao
        </h2>
    </div>

    <!-- Colunas lado a lado -->
    <div style="display:flex;gap:28px;">
        <!-- Coluna 1 -->
        <div style="flex:1;background:#1A1A1A;padding:36px 32px;
            border-radius:16px;border:1px solid #242424;">
            <h3 style="color:#A0A0A0;font-size:18px;font-weight:700;
                margin:0 0 22px 0;text-transform:uppercase;
                letter-spacing:1px;">
                Sem IA
            </h3>
            <ul style="font-size:24px;color:#ffffff;margin:0;
                padding-left:22px;line-height:1.9;font-weight:500;">
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>

        <!-- Coluna 2 (destaque) -->
        <div style="flex:1;background:#1A1A1A;padding:36px 32px;
            border-radius:16px;border:2px solid #D0FF59;">
            <h3 style="color:#D0FF59;font-size:18px;font-weight:700;
                margin:0 0 22px 0;text-transform:uppercase;
                letter-spacing:1px;">
                Com IA
            </h3>
            <ul style="font-size:24px;color:#ffffff;margin:0;
                padding-left:22px;line-height:1.9;font-weight:500;">
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor |
|----------|-----------|--------|-----|
| Badge | 20px | 600 | DARK_1 sobre PRIMARY |
| Titulo | 50px | 800 | WHITE |
| Heading coluna | 18px | 700 | TEXT_MUTED ou PRIMARY |
| Itens lista | 24px | 500 | WHITE |

**Destaque na coluna preferida:** `border:2px solid #D0FF59` (vs 1px solid #242424)

---

### 6.6 STEP CARD (Passo-a-Passo)

Layout para slides que fazem parte de uma sequencia numerada.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;">

    <!-- Header do Step -->
    <div style="display:flex;align-items:center;gap:18px;margin-bottom:26px;">
        <!-- Numero do passo -->
        <div style="width:64px;height:64px;background:#D0FF59;
            border-radius:14px;display:flex;align-items:center;
            justify-content:center;font-size:34px;font-weight:900;
            color:#0D0D0D;">4</div>
        <div>
            <div style="font-size:44px;font-weight:800;color:#ffffff;
                line-height:1.1;">
                Titulo do Passo
            </div>
            <div style="font-size:20px;color:#A0A0A0;font-weight:500;">
                Subtitulo explicativo
            </div>
        </div>
    </div>

    <!-- Grid de sub-itens -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="padding:24px;background:#1A1A1A;border-radius:14px;
            border-left:4px solid #D0FF59;">
            <div style="font-size:18px;font-weight:700;color:#D0FF59;
                margin-bottom:8px;">
                Sub-item Label
            </div>
            <div style="font-size:17px;color:#A0A0A0;font-weight:500;">
                Descricao do sub-item
            </div>
        </div>
        <!-- ... mais cards -->
    </div>

    <!-- Tip box (opcional) -->
    <div style="margin-top:20px;padding:18px;
        background:rgba(255,105,180,0.12);border-radius:12px;
        border-left:3px solid #ff69b4;">
        <div style="font-size:18px;color:#A0A0A0;font-weight:500;">
            Dica importante sobre este passo
        </div>
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Extras |
|----------|-----------|--------|--------|
| Numero step | 34px | 900 | 64x64px, bg:PRIMARY, border-radius:14px |
| Titulo step | 44px | 800 | line-height:1.1 |
| Subtitulo | 20px | 500 | TEXT_MUTED |
| Label sub-item | 18px | 700 | cor da borda esquerda |
| Desc sub-item | 17px | 500 | TEXT_MUTED |
| Tip box | 18px | 500 | bg com 12% opacidade da cor |

**Border-left nos cards:** 4px solid (cor rotativa: PRIMARY, SECONDARY, ACCENT)

---

### 6.7 CTA (Slide Final — Call to Action)

Ultimo slide do carrossel. Convida a acao com SOMENTE TEXTO.

**REGRA ABSOLUTA: PROIBIDO USAR BOTOES EM QUALQUER SLIDE.**
Nenhum elemento visual simulando botao (div com background colorido, border-radius,
cursor:pointer, box-shadow, gradient). Todo CTA deve ser feito com texto puro.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;text-align:center;">

    <!-- Titulo CTA -->
    <div style="font-size:62px;font-weight:800;line-height:1.1;
        margin-bottom:32px;letter-spacing:-1px;">
        Pronto para<br>
        <span style="color:#D0FF59;">Transformar</span> seu Negocio?
    </div>

    <!-- Chamada para acao (TEXTO, nao botao) -->
    <div style="font-size:28px;font-weight:700;color:#D0FF59;
        margin-bottom:24px;">
        Fale com um especialista
    </div>

    <!-- Contato -->
    <div style="font-size:24px;color:#A0A0A0;font-weight:500;
        line-height:1.8;">
        (54) 99000-0753<br>
        @riwerlabs
    </div>
</div>
```

**Especificacoes:**
| Elemento | Font-size | Weight | Cor |
|----------|-----------|--------|-----|
| Titulo | 62px | 800 | WHITE (destaque PRIMARY) |
| Chamada | 28px | 700 | PRIMARY |
| Contato | 24px | 500 | TEXT_MUTED |

**IMPORTANTE:** O slide CTA NAO tem "Arraste ->" (swipe hint).

---

### 6.8 TRANSICAO (Frase de Impacto)

Slide intermediario com frase forte para manter engajamento.

```html
<div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
    display:flex;flex-direction:column;justify-content:center;text-align:center;">

    <div style="font-size:58px;font-weight:800;line-height:1.2;
        letter-spacing:-1px;">
        A pergunta nao e<br>
        <span style="color:#D0FF59;">SE voce vai usar IA</span><br>
        mas <span style="color:#2D54FF;">QUANDO</span>
    </div>
</div>
```

**Especificacoes:** Titulo unico: 58px, weight 800, line-height 1.2.
Usar cores PRIMARY e SECONDARY para destacar palavras-chave.

---

## 7. Tamanhos de Fonte por Elemento

### Tabela Resumo Geral

| Elemento | Font-size | Weight | Line-height |
|----------|-----------|--------|-------------|
| **Titulo capa** | 72px | 800 | 1.1 |
| **Titulo secao** | 62px | 800 | — |
| **Titulo transicao** | 58px | 800 | 1.2 |
| **Titulo step** | 44-50px | 800 | 1.1-1.2 |
| **Numero grande (stat)** | 66-72px | 900 | 1.0 |
| **Emoji em card** | 52px | — | — |
| **Numero step** | 34px | 900 | — |
| **Subtitulo** | 26px | 400 | 1.5 |
| **Label card** | 26px | 700 | — |
| **Item de lista** | 24px | 500 | 1.9 |
| **Tag/categoria** | 20px | 600 | — |
| **Descricao card** | 18-20px | 400 | 1.4 |
| **Sub-item step** | 17-18px | 500-700 | — |
| **Sub-label metrica** | 16px | 400 | — |
| **Contador (XX/10)** | 15px | 600 | — |
| **Swipe hint** | 16px | 500 | — |
| **Seta swipe** | 22px | — | — |
| **Footer (url)** | 13px | 400 | — |

### Regra de Ouro para Tamanhos

```
REGRA UNIVERSAL (TODAS AS PROPORCOES):

  NUNCA usar font-size < 13px (ilegivel no celular)

  Para calcular tamanhos em qualquer proporcao:
    tamanho_final = Math.max(13, Math.round(tamanho_base_4x5 * fontScale))

  Valores base (4:5 = 1080x1350):
    Titulos: MINIMO 44px (ideal 58-72px)
    Corpo/descricao: MINIMO 17px (ideal 20-26px)
    Labels: MINIMO 16px (ideal 18-20px)

  Fatores de escala (fontScale):
    1:1  → 0.89  |  4:5 → 1.00  |  9:16 → 1.19
    16:9 → 1.19  |  1.91:1 → 0.72

  letter-spacing NEGATIVO em titulos grandes: -1px a -2px
  letter-spacing POSITIVO em tags/uppercase: 1px a 2px

  TABELA COMPLETA: ver secao 3.5.4
```

---

## 8. Espacamentos e Margens

### 8.1 Margens do Container

| Propriedade | Valor | Descricao |
|-------------|-------|-----------|
| `top` | 80px | Espaco para header (logo + contador) |
| `left` | 50px | Margem lateral esquerda |
| `right` | 50px | Margem lateral direita |
| `bottom` | 60px | Espaco para footer (barra + texto + swipe) |

**Area util de conteudo:** 980px x 940px

### 8.2 Espacamentos Internos (Margens entre Elementos)

| Contexto | margin-bottom | Uso |
|----------|---------------|-----|
| Tag → Titulo | 18-28px | Separacao tag/titulo |
| Titulo → Grid/Conteudo | 24-32px | Separacao titulo/corpo |
| Emoji → Label | 14px | Dentro de card |
| Label → Descricao | 10-12px | Dentro de card |
| Card → Card (gap) | 16-28px | Entre cards no grid |
| Step header → Grid | 26px | Step → sub-itens |
| Grid → Tip box | 20px (margin-top) | Conteudo → dica |

### 8.3 Padding de Cards

| Tipo de card | Padding |
|-------------|---------|
| Card emoji (grid 2x2) | 34px 28px |
| Card stat (grid 3 col) | 40px 25px |
| Card metrica (grid 2x2) | 30px 26px |
| Card comparacao | 36px 32px |
| Card step (border-left) | 24px |
| Tip box | 18px |
| Badge | 12px 28px |

### 8.4 Grid Gaps

| Layout | Gap |
|--------|-----|
| Grid 2x2 (emoji) | 24px |
| Grid 2x2 (metrica) | 16-18px |
| Grid 3 colunas | 28px |
| Flex duas colunas | 28px |
| Grid step cards | 16px |

---

## 9. Componentes Reutilizaveis

### 9.0 Componente Fonte/Citacao

Usado no final de slides com dados estatisticos. Sempre `display:inline-flex` para nao ocupar toda a largura.

```html
<div style="font-size:13px;color:#888888;background:#111;border:1px solid #1e1e1e;
    border-radius:8px;padding:8px 20px;display:inline-flex;align-items:center;gap:8px;">
  <i class="fas fa-chart-bar" style="color:#555;font-size:11px;"></i>
  Criteo Industry Report, 2023
</div>
```

**Regra:** usar `margin-top:auto` se o componente deve "grudar" no fundo do container flex.

---

### 9.1 Badge/Tag

```html
<div style="display:inline-block;background:#D0FF59;color:#0D0D0D;
    padding:12px 28px;border-radius:24px;font-size:20px;
    font-weight:600;letter-spacing:1px;text-transform:uppercase;">
    TEXTO DA TAG
</div>
```

### 9.2 Card com Borda Esquerda

```html
<div style="padding:24px;background:#1A1A1A;border-radius:14px;
    border-left:4px solid #D0FF59;">
    <div style="font-size:18px;font-weight:700;color:#D0FF59;
        margin-bottom:8px;">Label</div>
    <div style="font-size:17px;color:#A0A0A0;font-weight:500;">
        Descricao</div>
</div>
```

### 9.3 Tip Box / Destaque

```html
<div style="padding:18px;background:rgba(208,255,89,0.12);
    border-radius:12px;border-left:3px solid #D0FF59;">
    <div style="font-size:18px;color:#A0A0A0;font-weight:500;">
        Texto da dica</div>
</div>
```

Variacoes de cor:
- Verde: `rgba(208,255,89,0.12)` + `#D0FF59`
- Rosa: `rgba(255,105,180,0.12)` + `#ff69b4`
- Azul: `rgba(45,84,255,0.12)` + `#2D54FF`

### 9.4 Numero de Step

```html
<div style="width:64px;height:64px;background:#D0FF59;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    font-size:34px;font-weight:900;color:#0D0D0D;">1</div>
```

### 9.5 Card com Emoji

```html
<div style="background:#1A1A1A;border-radius:16px;padding:34px 28px;
    border:1px solid #242424;text-align:center;">
    <div style="font-size:52px;margin-bottom:14px;">emoji</div>
    <div style="font-size:26px;font-weight:700;color:#D0FF59;
        margin-bottom:12px;">Label</div>
    <div style="font-size:20px;color:#A0A0A0;font-weight:400;
        line-height:1.4;">Descricao</div>
</div>
```

### 9.6 Card de Metrica/Stat

```html
<div style="background:#1A1A1A;padding:30px 26px;border-radius:16px;
    text-align:center;border:1px solid #242424;">
    <p style="font-size:66px;font-weight:900;color:#D0FF59;
        letter-spacing:-2px;margin-bottom:10px;">40%</p>
    <p style="font-size:19px;color:#ffffff;font-weight:600;">Label</p>
    <p style="font-size:16px;color:#A0A0A0;">Sub-label</p>
</div>
```

---

## 10. Scripts de Geracao

### 10.0 Abordagem B: Node.js + CDP (Recomendada — Tudo em Um Arquivo)

Script `gerar-cards-vN.js` que gera todos os slides em um unico arquivo Node.js, reutilizando o Chrome aberto.

**OBRIGATORIO:** O script DEVE perguntar a proporcao ou recebe-la como argumento CLI.

**Estrutura do script (multi-proporcao):**

```javascript
/**
 * CARROSSEL N vX — Riwer Labs (Multi-Proporcao)
 *
 * USO: node gerar-cards-v1.js [proporcao]
 *   proporcoes: 1:1, 4:5, 9:16, 16:9, 1.91:1
 *   padrao: 4:5
 *
 * EXEMPLO: node gerar-cards-v1.js 9:16
 */

const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const CDP      = require('C:/Users/sabola/.claude/task-scheduler/node_modules/chrome-remote-interface');

const OUT   = path.join(__dirname);
const PORTS = [9222, 9333, 9334, 9335, 9336];

// ─── Sistema Multi-Proporcao ────────────────────────────────────
const RATIOS = {
  '1:1':    { w: 1080, h: 1080, name: 'square' },
  '4:5':    { w: 1080, h: 1350, name: 'portrait' },
  '9:16':   { w: 1080, h: 1920, name: 'story' },
  '16:9':   { w: 1920, h: 1080, name: 'landscape' },
  '1.91:1': { w: 1200, h: 628,  name: 'fb-wide' },
};

const BASE = { w: 1080, h: 1350 }; // proporcao de referencia

function getScale(ratio) {
  const { w, h } = ratio;
  const wS = w / BASE.w;
  const hS = h / BASE.h;
  const fontScale   = Math.sqrt(wS * hS);
  const marginScale = Math.min(wS, hS);
  return {
    w, h, wS, hS, fontScale, marginScale,
    marginLat:  Math.round(50 * wS),
    marginTop:  Math.round(80 * hS),
    marginBot:  Math.round(60 * hS),
    barH:       Math.max(4, Math.round(6 * marginScale)),
    logoH:      Math.max(22, Math.round(32 * marginScale)),
    counterFs:  Math.max(13, Math.round(15 * fontScale)),
    footerFs:   Math.max(13, Math.round(13 * fontScale)),
    swipeFs:    Math.max(13, Math.round(16 * fontScale)),
    gap:        Math.max(12, Math.round(24 * marginScale)),
    // Fontes pre-calculadas
    titleCover: Math.max(42, Math.round(72 * fontScale)),
    titleSec:   Math.max(38, Math.round(62 * fontScale)),
    titleTrans: Math.max(36, Math.round(58 * fontScale)),
    numGiant:   Math.max(80, Math.round(180 * fontScale)),
    numStat:    Math.max(40, Math.round(66 * fontScale)),
    subtitle:   Math.max(16, Math.round(26 * fontScale)),
    labelCard:  Math.max(16, Math.round(26 * fontScale)),
    itemList:   Math.max(15, Math.round(24 * fontScale)),
    tag:        Math.max(14, Math.round(20 * fontScale)),
    descCard:   Math.max(14, Math.round(20 * fontScale)),
    cardPadV:   Math.max(16, Math.round(34 * marginScale)),
    cardPadH:   Math.max(14, Math.round(28 * marginScale)),
  };
}

async function askRatio() {
  const arg = process.argv[2];
  if (arg && RATIOS[arg]) return RATIOS[arg];
  if (arg) console.log(`Proporcao "${arg}" invalida.`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    console.log('\nProporcoes disponiveis:');
    Object.entries(RATIOS).forEach(([k, v]) =>
      console.log(`  ${k.padEnd(7)} → ${v.w}x${v.h} (${v.name})`)
    );
    rl.question('\nEscolha a proporcao [4:5]: ', ans => {
      rl.close();
      resolve(RATIOS[ans.trim()] || RATIOS['4:5']);
    });
  });
}

// ─── Design tokens ──────────────────────────────────────────────
const LIME  = '#D0FF59';
const BLUE  = '#2D54FF';
const PINK  = '#ff69b4';
const RED   = '#F87171';
const WHITE = '#ffffff';
const GRAY  = '#A0A0A0';
const GRAY2 = '#888888';
const BG    = '#0D0D0D';
const CARD  = '#1a1a1a';

const GRAD_TOP = `linear-gradient(90deg, ${LIME}, ${BLUE}, ${PINK})`;
const GRAD_BOT = `linear-gradient(90deg, ${BLUE}, ${PINK}, ${LIME})`;
const FA_LINK  = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">`;

// ─── Logo (lido de HTML de referencia existente) ─────────────────
let LOGO_SRC = '';
try {
  const ref = fs.readFileSync(path.join(__dirname, '..', 'riwerlabs-organico', 'carrossel-01', 'slide-01.html'), 'utf8');
  const m = ref.match(/src="(data:image\/png;base64,[^"]+)"/);
  if (m) LOGO_SRC = m[1];
} catch (_) {}

// ─── Componente fonte/citacao ────────────────────────────────────
function fonte(texto) {
  return `<div style="font-size:13px;color:${GRAY2};background:#111;border:1px solid #1e1e1e;
      border-radius:8px;padding:8px 20px;display:inline-flex;align-items:center;gap:8px;">
    <i class="fas fa-chart-bar" style="color:#555;font-size:11px;"></i>
    ${texto}
  </div>`;
}

// ─── Chrome helpers ──────────────────────────────────────────────
function checkPort(port) {
  return new Promise(resolve => {
    http.get({ hostname: 'localhost', port, path: '/json/version', timeout: 1500 }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
  });
}

async function detectPort() {
  for (const p of PORTS) { if (await checkPort(p)) return p; }
  return null;
}

async function newTab(port) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, path: '/json/new', method: 'PUT', timeout: 3000 },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } }); }
    );
    req.on('error', reject); req.end();
  });
}

async function closeTab(port, tabId) {
  return new Promise(resolve => {
    http.get({ hostname: 'localhost', port, path: `/json/close/${tabId}`, timeout: 2000 }, () => resolve())
      .on('error', () => resolve());
  });
}

// RATIO e S sao definidos no main() apos askRatio()
let RATIO, S; // { w, h, name } e scale tokens

async function screenshot(html, port, filename) {
  const tab = await newTab(port);
  let client;
  try {
    client = await CDP({ host: 'localhost', port, target: tab.id });
    const { Page, Emulation } = client;
    await Page.enable();
    await Emulation.setDeviceMetricsOverride({
      width: RATIO.w, height: RATIO.h,
      deviceScaleFactor: 1, mobile: false
    });
    const tmpHtml = path.join(OUT, `_tmp_${filename}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf8');
    const fileUrl = 'file:///' + tmpHtml.replace(/\\/g, '/');
    await Page.navigate({ url: fileUrl });
    await Page.loadEventFired();
    await new Promise(r => setTimeout(r, 1200)); // aguardar fontes/FA
    const { data } = await Page.captureScreenshot({
      format: 'png',
      clip: { x: 0, y: 0, width: RATIO.w, height: RATIO.h, scale: 1 },
      fromSurface: true
    });
    const outPath = path.join(OUT, filename + '.png');
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    console.log(`✓ ${filename}.png (${RATIO.w}x${RATIO.h})`);
    return outPath;
  } finally {
    try { await client.close(); } catch (_) {}
    await closeTab(port, tab.id);
  }
}

// ─── Template base (multi-proporcao) ─────────────────────────────
function base(num, total, content, showArraste = true) {
  // S = scale tokens calculados por getScale() no main()
  const logoTop = Math.round(S.marginTop * 0.375);
  const counterTop = logoTop + 4;
  const swipeBot = Math.round(S.marginBot * 0.5);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
${FA_LINK}
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{ width:${RATIO.w}px;height:${RATIO.h}px;overflow:hidden;font-family:'Poppins',sans-serif;background:${BG};color:${WHITE};position:relative; }
</style></head><body>
<div style="position:absolute;top:0;left:0;width:100%;height:${S.barH}px;background:${GRAD_TOP};z-index:10;"></div>
<div style="position:absolute;top:${logoTop}px;left:${S.marginLat}px;z-index:10;">
  ${LOGO_SRC ? `<img src="${LOGO_SRC}" style="height:${S.logoH}px;" alt="Riwer Labs">` : `<span style="font-size:${Math.round(S.logoH * 0.7)}px;font-weight:800;color:${LIME};">⟫ RIWER LABS</span>`}
</div>
<div style="position:absolute;top:${counterTop}px;right:${S.marginLat}px;font-size:${S.counterFs}px;font-weight:600;color:${GRAY};z-index:10;">
    ${String(num).padStart(2,'0')}<span style="color:#333;">|</span>${String(total).padStart(2,'0')}
</div>
${content}
${showArraste ? `<div style="position:absolute;bottom:${swipeBot}px;right:${S.marginLat + 10}px;color:${GRAY};font-size:${S.swipeFs}px;font-weight:500;display:flex;align-items:center;gap:8px;z-index:10;">Arraste <i class="fas fa-arrow-right" style="font-size:${Math.round(S.swipeFs * 0.875)}px;"></i></div>` : ''}
<div style="position:absolute;bottom:0;left:0;width:100%;height:${S.barH}px;background:${GRAD_BOT};z-index:10;"></div>
<div style="position:absolute;bottom:${Math.round(S.barH + 8)}px;left:${S.marginLat}px;font-size:${S.footerFs}px;color:${GRAY};font-weight:400;z-index:10;">riwerlabs.com</div>
</body></html>`;
}

// ─── Container de conteudo (helper) ──────────────────────────────
function contentArea() {
  return `position:absolute;top:${S.marginTop}px;left:${S.marginLat}px;right:${S.marginLat}px;bottom:${S.marginBot}px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;`;
}

// ─── Cards (array com name + html) ──────────────────────────────
const cards = [
  { name: 'slide-01', html: base(1, 10, `
    <div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
        display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <!-- conteudo aqui -->
    </div>
  `) },
  // ... slides 02-09 ...
  { name: 'slide-10', html: base(10, 10, `
    <div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
        display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <!-- CTA aqui -->
    </div>
  `, false) }, // false = sem swipe hint
];

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  // 1. Perguntar proporcao ao usuario
  RATIO = await askRatio();
  S = getScale(RATIO);

  console.log(`\nProporcao: ${RATIO.w}x${RATIO.h} (${RATIO.name})`);
  console.log(`Escala fonte: ${S.fontScale.toFixed(2)} | Escala margem: ${S.marginScale.toFixed(2)}`);
  console.log(`Area conteudo: ${RATIO.w - S.marginLat * 2}x${RATIO.h - S.marginTop - S.marginBot}px`);
  console.log(`Titulo capa: ${S.titleCover}px | Titulo secao: ${S.titleSec}px\n`);

  // 2. Detectar Chrome
  const port = await detectPort();
  if (!port) {
    console.error('Chrome nao encontrado! Execute: node ~/.claude/chrome-manager.js open --profile "Profile 0" --port 9333');
    process.exit(1);
  }

  console.log(`Chrome detectado na porta ${port}\nGerando ${cards.length} cards em ${RATIO.w}x${RATIO.h}...\n`);

  // 3. Gerar slides
  for (const card of cards) {
    try {
      await screenshot(card.html, port, card.name);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`✗ Erro em ${card.name}: ${e.message}`);
    }
  }
  console.log(`\n✅ Carrossel gerado em ${RATIO.w}x${RATIO.h} (${RATIO.name}): ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

**Execucao:**
```bash
# 1. Abrir Chrome debug (apenas uma vez por sessao)
node "~/.claude/chrome-manager.js" open --profile "Profile 0" --port 9333

# 2. Gerar slides
cd ~/.claude/temp/carrossel-1
node gerar-cards-v4.js

# Saida esperada:
# Chrome detectado na porta 9333
# Gerando 10 cards...
# ✓ slide-01.png
# ...
# ✓ slide-10.png
# ✅ Carrossel v4 gerado
```

**Configs criticas do CDP:**
| Config | Valor | Motivo |
|--------|-------|--------|
| `deviceScaleFactor` | `1` | Sem DPI scaling |
| `fromSurface` | `true` | Captura exata da superficie renderizada |
| delay | `1200ms` | Aguardar Google Fonts + Font Awesome CDN |
| `clip` | `{x:0,y:0,width:1080,height:1080,scale:1}` | Recorte exato |
| temp HTML | `_tmp_NOME.html` | Criado + deletado automaticamente apos screenshot |

**Troubleshooting CDP:**

| Problema | Causa | Solucao |
|----------|-------|---------|
| `Chrome nao encontrado` | Chrome nao aberto na porta | Executar chrome-manager.js antes |
| Fonte nao carrega | CDN lento | Aumentar delay para 2000ms |
| Font Awesome nao aparece | CDN bloqueado | Usar versao local ou SVG inline |
| Icone sem estilo | Classe FA errada | Verificar `fas fa-NOME` em fontawesome.com |
| PNG em branco | HTML nao carregou | Verificar path `file:///` com barras corretas |

---

### 10.1 Abordagem A: Script Python: Estrutura do Build

### 10.1 Anatomia de um Build Script

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CARROSSEL XX: "Titulo do Carrossel"
10 slides 1080x1350 para [Marca]
"""

import pathlib

# ===== CONFIGURACAO =====
OUTPUT_DIR = pathlib.Path(__file__).parent / "carrossel-XX"
OUTPUT_DIR.mkdir(exist_ok=True)

# ===== DESIGN TOKENS =====
PRIMARY      = "#D0FF59"
PRIMARY_DARK = "#B8E64C"
SECONDARY    = "#2D54FF"
ACCENT       = "#ff69b4"
DARK_1       = "#0D0D0D"
DARK_2       = "#121212"
DARK_3       = "#1A1A1A"
DARK_4       = "#242424"
TEXT_WHITE   = "#ffffff"
TEXT_MUTED   = "#A0A0A0"

W = 1080
H = 1350

# ===== LOGO =====
LOGO_B64 = pathlib.Path(__file__).parent.joinpath("logo-b64.txt") \
    .read_text(encoding="utf-8").strip()


# ===== FUNCAO BASE (TEMPLATE) =====
def base(body: str, slide_num: int, total: int = 10) -> str:
    show_swipe = slide_num < total
    swipe_html = f"""
    <div style="position:absolute;bottom:30px;right:60px;
        color:{TEXT_MUTED};font-size:16px;font-weight:500;
        display:flex;align-items:center;gap:8px;">
        Arraste <span style="font-size:22px;">&rarr;</span>
    </div>""" if show_swipe else ""

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{
  width:{W}px;height:{H}px;overflow:hidden;
  font-family:'Poppins',sans-serif;
  background:{DARK_1};color:{TEXT_WHITE};
  position:relative;
}}
</style></head><body>

<!-- Barra gradiente topo -->
<div style="position:absolute;top:0;left:0;width:100%;height:6px;
    background:linear-gradient(90deg,{PRIMARY},{SECONDARY},{ACCENT});"></div>

<!-- Logo -->
<div style="position:absolute;top:30px;left:50px;">
  <img src="data:image/png;base64,{LOGO_B64}" style="height:32px;" alt="Marca">
</div>

<!-- Contador -->
<div style="position:absolute;top:34px;right:50px;
    font-size:15px;font-weight:600;color:{TEXT_MUTED};">
    {slide_num:02d}<span style="color:{DARK_4};">/</ span>{total:02d}
</div>

<!-- Conteudo -->
{{body}}

<!-- Swipe hint -->
{{swipe_html}}

<!-- Footer -->
<div style="position:absolute;bottom:0;left:0;width:100%;height:6px;
    background:linear-gradient(90deg,{SECONDARY},{ACCENT},{PRIMARY});"></div>
<div style="position:absolute;bottom:14px;left:50px;
    font-size:13px;color:{TEXT_MUTED};font-weight:400;">
    riwerlabs.com
</div>

</body></html>"""


# ===== SLIDES =====
slides = {{}}

# Slide 01 — CAPA
slides[1] = base(f"""
    <div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
        display:flex;flex-direction:column;justify-content:center;text-align:center;">
        <div style="font-size:20px;font-weight:600;color:{PRIMARY};
            text-transform:uppercase;letter-spacing:2px;margin-bottom:28px;">
            Guia Completo
        </div>
        <div style="font-size:72px;font-weight:800;line-height:1.1;
            margin-bottom:24px;letter-spacing:-2px;">
            Titulo Principal<br>
            <span style="color:{PRIMARY};">Palavra Destaque</span>
        </div>
        <div style="font-size:26px;color:{TEXT_MUTED};font-weight:400;
            line-height:1.5;">
            Subtitulo com contexto e proposta de valor
        </div>
    </div>
""", 1)

# ... slides 2 a 9 ...

# Slide 10 — CTA
slides[10] = base(f"""
    <div style="position:absolute;top:80px;left:50px;right:50px;bottom:60px;
        display:flex;flex-direction:column;justify-content:center;text-align:center;">
        <div style="font-size:62px;font-weight:800;line-height:1.1;
            margin-bottom:32px;letter-spacing:-1px;">
            Titulo CTA<br>
            <span style="color:{PRIMARY};">Destaque</span>
        </div>
        <div style="font-size:28px;font-weight:700;color:{PRIMARY};
            margin-bottom:24px;">
            Fale com um especialista
        </div>
        <div style="font-size:24px;color:{TEXT_MUTED};font-weight:500;
            line-height:1.8;">
            (54) 99000-0753<br>
            @riwerlabs
        </div>
    </div>
""", 10)


# ===== GERAR ARQUIVOS =====
for num, html in slides.items():
    fpath = OUTPUT_DIR / f"slide-{{num:02d}}.html"
    fpath.write_text(html, encoding="utf-8")
    print(f"  slide-{{num:02d}}.html OK")

print(f"Carrossel gerado em {{OUTPUT_DIR}}")
```

### 10.2 Execucao

```bash
# Gerar HTMLs de um carrossel especifico
python build-01.py

# Gerar todos os carrosseis
for i in $(seq -w 1 10); do python "build-$i.py"; done
```

---

## 11. Screenshot com Puppeteer

### 11.1 Script Completo (screenshot-all.js)

```javascript
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const W = 1080, H = 1350;
const slideNames = [
  '01','02','03','04','05','06','07','08','09','10',
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--window-size=${W},${H}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      '--disable-dev-shm-usage'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  for (let c = 1; c <= 10; c++) {
    const carNum = String(c).padStart(2, '0');
    const dir = path.join(__dirname, `carrossel-${carNum}`);
    if (!fs.existsSync(dir)) {
      console.error(`SKIP carousel ${carNum}: dir not found`);
      continue;
    }
    console.log(`\n=== Carrossel ${carNum} ===`);

    for (const s of slideNames) {
      const htmlPath = path.join(dir, `slide-${s}.html`);
      if (!fs.existsSync(htmlPath)) {
        console.error(`  SKIP: slide-${s}`);
        continue;
      }

      // Navegar para o arquivo HTML
      await page.goto(
        'file:///' + htmlPath.replace(/\\/g, '/'),
        { waitUntil: 'networkidle0', timeout: 30000 }
      );

      // Esperar fontes carregarem
      await page.evaluate(() => document.fonts.ready);

      // Delay extra para renderizacao completa
      await new Promise(r => setTimeout(r, 1500));

      // Capturar screenshot
      const out = path.join(dir, `slide-${s}.png`);
      await page.screenshot({
        path: out,
        type: 'png',
        clip: { x: 0, y: 0, width: W, height: H }
      });

      console.log(`  slide-${s}.png - ${(fs.statSync(out).size/1024).toFixed(0)}KB`);
    }
  }

  await browser.close();
  console.log(`\nDone! All carousels captured.`);
})();
```

### 11.2 Configuracoes Criticas do Puppeteer

| Config | Valor | Motivo |
|--------|-------|--------|
| `headless` | `'new'` | Modo headless mais recente (Chrome) |
| `--no-sandbox` | — | Evita problemas de permissao |
| `--force-device-scale-factor=1` | — | Garante 1:1 pixel (sem DPI scaling) |
| `--disable-gpu` | — | Evita problemas de renderizacao GPU |
| `deviceScaleFactor` | `1` | Viewport 1:1 com pixels reais |
| `waitUntil` | `'networkidle0'` | Espera todas as conexoes fecharem (fontes) |
| `timeout` | `30000` | 30s maximo por navegacao |
| `document.fonts.ready` | — | Espera TODAS as fontes carregarem |
| delay 1500ms | — | Tempo extra para renderizacao final |
| `clip` | `{x:0, y:0, width:1080, height:1350}` | Recorte exato 1080x1350 |
| `type` | `'png'` | Formato sem perda de qualidade |

### 11.3 Execucao

```bash
# Instalar puppeteer (se necessario)
npm install puppeteer

# Capturar TODOS os carrosseis
node screenshot-all.js

# Saida esperada:
# === Carrossel 01 ===
#   slide-01.png - 61KB
#   slide-02.png - 67KB
#   ...
```

### 11.4 Tamanho Esperado dos PNGs

| Tipo de slide | Tamanho medio |
|---------------|---------------|
| Capa (texto) | 50-65KB |
| Cards/Grid | 60-75KB |
| Metricas/Stats | 55-70KB |
| CTA | 45-60KB |
| Transicao (texto) | 40-55KB |

**Se o PNG ficar muito leve (<30KB):** conteudo pode estar cortado ou nao renderizado.
**Se ficar muito pesado (>120KB):** pode ter imagem embutida ou muitos elementos.

---

## 12. Boas Praticas

### 12.1 Ocupacao da Area (TODAS AS PROPORCOES)

```
REGRA CRITICA — MINIMO 70% DE OCUPACAO EM QUALQUER PROPORCAO:

  Todos os elementos visuais da imagem (textos, titulos, subtitulos,
  icones, cards, listas, numerais, badges de texto) DEVEM ocupar
  NO MINIMO 70% do espaco total da area de conteudo.

  CALCULO POR PROPORCAO (area de conteudo descontando header/footer):
    1:1  (1080x1080): 980x968px = 948.640px²  → min 664.048px²
    4:5  (1080x1350): 980x1210px = 1.185.800px² → min 830.060px²
    9:16 (1080x1920): 980x1780px = 1.744.400px² → min 1.221.080px²
    16:9 (1920x1080): 1780x968px = 1.722.640px² → min 1.205.848px²
    1.91:1 (1200x628): 1112x562px = 624.944px² → min 437.461px²

  COMO GARANTIR (UNIVERSAL):
  1. Usar fontes proporcionais (S.titleCover, S.titleSec, etc.)
  2. Cards com width:100% ou grid que preencha toda a largura
  3. Container SEMPRE com position:absolute + top/left/right/bottom
  4. NUNCA usar width fixa no container principal
  5. Se o slide parecer "vazio" → AUMENTAR tamanho dos elementos
  6. Validar visualmente: background escuro < 30% da area visivel

  ESTRATEGIA POR PROPORCAO:
  - 1:1:    compactar, poucos elementos, fontes grandes
  - 4:5:    equilibrio padrao (referencia)
  - 9:16:   mais espaco, adicionar breathing room ou mais conteudo
  - 16:9:   layout horizontal, usar largura total
  - 1.91:1: ultra compacto, maximo 3-4 elementos

  CORRETO (adaptativo):
    position:absolute;
    top:${S.marginTop}px;
    left:${S.marginLat}px;
    right:${S.marginLat}px;
    bottom:${S.marginBot}px;
    display:flex;flex-direction:column;justify-content:center;

  ERRADO:
    position:absolute;
    top:50%;left:50%;transform:translate(-50%,-50%);
    width:900px;  /* NUNCA width fixa! */
```

### 12.2 Hierarquia Visual

```
1. TITULO: Maior, mais pesado (62-72px, weight 800-900)
2. NUMEROS/STATS: Grandes e coloridos (66-72px, weight 900)
3. LABELS: Medio, semi-bold (20-26px, weight 600-700)
4. CORPO: Medio, normal (18-24px, weight 400-500)
5. META: Pequeno, sutil (13-16px, weight 400)
```

### 12.3 Uso de Cores

- **PRIMARY (#D0FF59):** Destaque principal — titulos em span, labels de cards
- **SECONDARY (#2D54FF):** Segundo destaque — variar com PRIMARY nos cards
- **ACCENT (#ff69b4):** Terceiro destaque — usar moderadamente
- **Rotacao de cores nos cards:** Card1=PRIMARY, Card2=SECONDARY, Card3=ACCENT, Card4=PRIMARY_DARK

### 12.4 Quantidade de Texto

```
POR SLIDE:
  - Maximo 1 titulo + 4-6 blocos de informacao
  - Cards: maximo 4 por grid (2x2) ou 3 em linha
  - Listas: maximo 5-6 itens por coluna
  - CTA: minimo de texto possivel

CARROSSEL COMPLETO:
  - 10 slides e o padrao (Instagram permite ate 20)
  - Slide 1: Capa | Slides 2-9: Conteudo | Slide 10: CTA
  - Variar layouts para evitar monotonia
```

### 12.5 Logo em Base64

Para evitar dependencia de arquivos externos (problemas com file://):

```python
# Converter logo para base64
import base64
with open("logo.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
with open("logo-b64.txt", "w") as f:
    f.write(b64)

# Usar no HTML
LOGO_B64 = pathlib.Path("logo-b64.txt").read_text().strip()
# <img src="data:image/png;base64,{LOGO_B64}" style="height:32px;">
```

---

## 13. Troubleshooting

| Problema | Causa | Solucao |
|----------|-------|---------|
| Fonte nao carrega no PNG | Google Fonts nao teve tempo | Aumentar delay (1500ms → 2500ms) |
| PNG em branco | Path do HTML incorreto | Verificar `file:///` com barras corretas |
| Conteudo cortado | Container menor que conteudo | Reduzir font-sizes ou quantidade de cards |
| Texto muito pequeno | font-size < 16px | Consultar tabela da secao 7 |
| PNG muito leve (<20KB) | Pagina nao renderizou | Verificar console do Puppeteer por erros |
| Slide sem "Arraste" | Bug no swipe_html | Verificar logica `show_swipe = slide_num < total` |
| Grid desalinhado | Conteudo desigual nos cards | Igualar quantidade de texto entre cards |
| Fundo transparente | Faltou background no body | Verificar `background:#0D0D0D` |
| Caractere especial bugado | Encoding errado | Confirmar `meta charset="UTF-8"` e `encoding="utf-8"` no write_text |
| Logo nao aparece | Base64 corrompido | Regenerar com `base64.b64encode()` |
| Icones FA nao aparecem | CDN nao carregou a tempo | Aumentar delay ou verificar conexao de internet |
| Elementos nao centralizados | Falta `align-items:center` | Adicionar ao container flex (obrigatorio em todos) |
| Imagem gerada por AI estranha/lenta | Arquivo PNG pesado no base64 | REMOVER — proibido usar imagens nos slides |
| Chrome nao encontrado (CDP) | Chrome nao estava aberto | `node ~/.claude/chrome-manager.js open --profile "Profile 0" --port 9333` |

---

## 14. Caso Real: Riwer Labs Organico

### Projeto: 10 carrosseis x 10 slides = 100 imagens

**Tema geral:** IA e Automacao para Negocios

**Carrosseis produzidos:**

| # | Tema | Layouts usados |
|---|------|----------------|
| 01 | O Que E IA e Por Que Importa | Capa, Grid 2x2, Grid 3col, Comparacao, CTA |
| 02 | 5 Sinais Que Sua Empresa Precisa de Automacao | Capa, Lista numerada, Cards, CTA |
| 03 | Como Chatbots Revolucionam o Atendimento | Capa, Comparacao, Grid 2x2, CTA |
| 04 | IA Generativa nos Negocios: Guia Completo | Capa, Steps, Grid, Transicao, CTA |
| 05 | Automacao de Processos: Guia Definitivo | Capa, Steps, Cards, Metricas, CTA |
| 06 | 7 Mitos Sobre IA Que Travam Seu Negocio | Capa, Cards com mito/verdade, CTA |
| 07 | ROI de Inteligencia Artificial: Numeros Reais | Capa, Metricas 2x2, Grid 3col, CTA |
| 08 | Tendencias de IA Para 2026 | Capa, Timeline, Cards, Transicao, CTA |
| 09 | IA no E-commerce: Transformacao na Pratica | Capa, Grid, Comparacao, Metricas, CTA |
| 10 | Do Zero a Automacao: Guia em 5 Passos | Capa, Step 1-5, Resumo, CTA |

**Metricas de producao:**
- 10 build scripts escritos: ~20min cada
- 100 HTMLs gerados: ~2 segundos (todos os builds)
- 100 PNGs capturados: ~4 minutos (Puppeteer)
- Tamanho medio PNG: ~55-65KB
- Tempo total: ~3.5h para 100 slides completos

### Evolucao do Layout

**Problema inicial:** Conteudo ocupava apenas ~40% da area do slide.

**Causa:** Container usava `width:900px; top:50%; transform:translate(-50%,-50%)` que desperdicava espaco vertical.

**Solucao aplicada em TODOS os 10 builds:**
```css
/* ANTES (ruim) */
position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:900px;

/* DEPOIS (correto) */
position:absolute;top:80px;left:50px;right:50px;bottom:60px;
display:flex;flex-direction:column;justify-content:center;
```

**Ajustes adicionais:**
- Titulos: 52px → 72px (+38%)
- Corpo: 20px → 26px (+30%)
- Cards: 14px → 20px (+43%)
- Margens reduzidas ~30-40%
- Resultado: conteudo ocupando ~85% da area util

---

## Checklist para Novo Carrossel

### Abordagem B (Node.js + CDP — Recomendada)

```
[ ] 1. PERGUNTAR AO USUARIO a proporcao desejada (1:1, 4:5, 9:16, 16:9, 1.91:1)
[ ] 2. Definir tema e 10 topicos (1 por slide)
[ ] 3. Escolher layouts para cada slide (variar! Adaptar ao ratio escolhido)
        - 1:1 / 1.91:1: layouts mais compactos, menos sub-itens
        - 9:16: mais espaco, layouts com breathing room
        - 16:9: layouts horizontais (side-by-side)
[ ] 4. Criar ~/.claude/temp/carrossel-N/ e script gerar-cards-v1.js
[ ] 5. Usar getScale(RATIO) para calcular TODOS os tamanhos proporcionalmente
[ ] 6. Usar contentArea() helper para container de conteudo responsivo
[ ] 7. JAMAIS usar imagens — conteudo puramente tipografico
[ ] 8. Todos containers: justify-content:center + align-items:center + text-align:center
[ ] 9. Font Awesome CDN — usar icones FA em vez de emojis
[ ] 10. Carregar logo base64 de referencia existente
[ ] 11. Abrir Chrome: node ~/.claude/chrome-manager.js open --profile "Profile 0" --port 9333
[ ] 12. Executar: node gerar-cards-v1.js [proporcao]
[ ] 13. Revisar PNGs — elementos centralizados, conteudo ocupa 70%+ da area em QUALQUER proporcao
[ ] 14. Validar: background escuro < 30% da area visivel
[ ] 15. Corrigir e incrementar versao: v2, v3... ate aprovado
[ ] 16. Upload na plataforma adequada ao ratio escolhido
```

### Abordagem A (Python + Puppeteer)

```
[ ] 1. Definir tema e 10 topicos (1 por slide)
[ ] 2. Escolher layouts para cada slide (variar!)
[ ] 3. Copiar build-template.py e personalizar
[ ] 4. Ajustar design tokens se marca diferente
[ ] 5. Converter logo para base64
[ ] 6. Executar build: python build-XX.py
[ ] 7. Verificar HTML no browser (1080x1350)
[ ] 8. Validar que elementos (textos, titulos, icones) ocupam minimo 70% da imagem
[ ] 9. Capturar PNGs: node screenshot-all.js
[ ] 10. Revisar PNGs: tamanho ~50-80KB, conteudo legivel, 70%+ ocupacao
[ ] 11. Upload no Instagram ou agendar via API
```

---

## 15. Abordagem C: Python + Playwright (Ads)

### 15.1 Quando Usar

- Carrosseis para **Meta Ads** (Facebook/Instagram) com design mais complexo
- Quando cada card e um **HTML independente** (nao gerado por script Python)
- Quando precisar de **imagens externas** (logos de ligas, fotos de produto) nos cards
- Quando o Chrome do usuario nao esta disponivel (headless puro)
- **Vantagem sobre CDP:** nao precisa do Chrome aberto, instala Chromium proprio
- **Vantagem sobre Puppeteer:** API mais moderna, async nativo, melhor em Windows

### 15.2 Stack

- **HTMLs:** Criados manualmente ou por IA (1 arquivo por card)
- **Captura:** Python 3.x + `playwright` (Chromium headless)
- **Instalacao:** `pip install playwright && python -m playwright install chromium`

### 15.3 Estrutura do Projeto

```
~/.claude/temp/nome-projeto/
  |-- carousel-ads-01.html    # Card 1 (HTML independente)
  |-- carousel-ads-02.html    # Card 2
  |-- ...
  |-- carousel-ads-10.html    # Card 10
  |-- carousel-ads-01.png     # PNG gerado
  |-- ...
  |-- carousel-ads-10.png
  |-- generate_pngs.py        # Script de captura
  |-- logo-betpredict.png     # Logo do projeto (referenciado nos HTMLs)
  |-- leagues/                 # Imagens externas (opcional)
  |     |-- 71.png
  |     |-- 39.png
  |     |-- ...
```

### 15.4 Script de Captura (generate_pngs.py)

```python
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

CARDS_DIR = Path(__file__).parent
WIDTH = 1080
HEIGHT = 1080  # 1:1 para ads, ajustar conforme necessidade
TOTAL = 10
PREFIX = "carousel-ads"  # prefixo dos arquivos HTML/PNG

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1
        )

        for i in range(1, TOTAL + 1):
            html_file = CARDS_DIR / f"{PREFIX}-{i:02d}.html"
            png_file = CARDS_DIR / f"{PREFIX}-{i:02d}.png"

            if not html_file.exists():
                print(f"  [SKIP] {html_file.name} nao encontrado")
                continue

            await page.goto(
                f"file:///{html_file.resolve()}",
                wait_until="networkidle"
            )
            await page.wait_for_timeout(2000)  # fontes + imagens
            await page.screenshot(path=str(png_file), full_page=False)
            print(f"  [OK] {png_file.name} ({WIDTH}x{HEIGHT})")

        await browser.close()
        print(f"\n  {TOTAL} cards exportados como PNG em: {CARDS_DIR}")

asyncio.run(main())
```

### 15.5 Diferencas da Abordagem C vs A e B

| Aspecto | A (Python+Puppeteer) | B (Node+CDP) | C (Python+Playwright) |
|---------|---------------------|--------------|----------------------|
| Chrome necessario | Nao (headless) | Sim (aberto) | Nao (Chromium proprio) |
| Imagens externas | Proibido | Proibido | Permitido (logos, badges) |
| HTMLs | Gerados por script | Gerados em memoria | Criados individualmente |
| Melhor para | Organico/conteudo | Iteracao rapida | Ads com assets visuais |
| Setup | npm install puppeteer | chrome-manager.js | pip install playwright |
| Plataforma | Linux/macOS | Windows local | Qualquer |

### 15.6 Regras Especificas para Carrosseis de Ads

1. **IMAGENS PERMITIDAS** — Diferente do organico, carrosseis de ads PODEM usar imagens externas (logos de marcas, badges de ligas, fotos de produto) para maior credibilidade
2. **COMPLIANCE META ADS** — NUNCA usar palavras proibidas: apostar, apostas, apostadores, bet, betting, gamble, gambling. Usar: previsoes, analise, decisoes, metodo, dados
3. **LOGOS EXTERNOS COM FUNDO** — Quando usar logos de terceiros em tema escuro, adicionar `background:#fff;border-radius:6px;padding:3px` no `<img>` para logos com fundo transparente
4. **PROPORÇÃO 1:1 PARA ADS** — Meta Ads carrossel usa 1080x1080 (1:1). Stories usa 1080x1920 (9:16). Feed organico pode usar 1080x1350 (4:5)
5. **FONTE POPPINS PARA ADS** — Para ads tech/SaaS, Poppins (Google Fonts) com weights 400-900 funciona melhor que Inter. Import via `@import url()` no CSS
6. **WAIT TIMEOUT 2000ms** — Playwright precisa de 2s de wait apos networkidle para garantir que Google Fonts carregou via @import
7. **LEGENDAS A/B** — Sempre criar 3 variacoes de legenda: foco na dor (PAS), foco na solucao (AIDA), foco na credibilidade (prova social)

---

## 16. Caso Real: BetPredict Carousel Ads

### 16.1 Briefing

- **Produto:** betpredict.com.br (previsoes esportivas com IA)
- **Formato:** Carrossel 10 cards, 1080x1080 (1:1), Meta Ads
- **Abordagem:** C (Python + Playwright)
- **Data:** 2026-03-12

### 16.2 Design System

```css
/* Paleta BetPredict */
background: #0A0E1A;           /* Fundo principal */
color-green: #10B981;          /* Destaque principal */
color-blue: #3B82F6;           /* Destaque secundario */
color-amber: #F59E0B;          /* Alerta/urgencia */
color-text: #f3f4f6;           /* Texto principal */
color-muted: #64748B;          /* Texto secundario */
color-subtle: #94A3B8;         /* Texto terciario */
card-bg: rgba(15,22,41,0.85);  /* Fundo de cards */
font-family: 'Poppins', sans-serif;
```

### 16.3 Efeitos Visuais CSS

```css
/* Noise texture overlay */
.noise{position:absolute;inset:0;opacity:0.03;
  background-image:url("data:image/svg+xml,...feTurbulence...")}

/* Grid sutil */
.grid{position:absolute;inset:0;
  background-image:linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),
  linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px);
  background-size:54px 54px}

/* Glow radial posicionado */
.glow1{position:absolute;top:30%;left:50%;transform:translateX(-50%);
  width:600px;height:500px;
  background:radial-gradient(ellipse,rgba(16,185,129,0.12) 0%,transparent 55%)}

/* Text shadow colorido nos spans */
.headline .green{color:#10B981;text-shadow:0 0 30px rgba(16,185,129,0.4)}
.headline .amber{color:#F59E0B;text-shadow:0 0 30px rgba(245,158,11,0.4)}
```

### 16.4 Estrutura dos 10 Cards

| Card | Tipo | Headline | Elementos Visuais |
|------|------|----------|-------------------|
| 01 | Hook | 90% PERDEM DINHEIRO COM PALPITES | stat-pills (90% vs 10%), divider, swipe hint |
| 02 | Dor | PALPITES SAO BASEADOS EM ACHISMO | icon-circles (emocao vs dados), info-cards |
| 03 | Dor | SEM METODO VOCE REPETE OS MESMOS ERROS | cycle-steps (palpite→perde→repete), bottom-card alerta |
| 04 | Transicao | E SE UMA IA ANALISASSE TUDO POR VOCE? | ai-brain circle, feature-row (102/4/41+/24-7) |
| 05 | Etapa 1 | DADOS DE 39 LIGAS EM TEMPO REAL | league pills com logos oficiais (API-Sports) |
| 06 | Etapa 2 | 102 VARIAVEIS CALCULADAS POR JOGO | big-num 102, category tags |
| 07 | Etapa 3 | 4 ALGORITMOS COMBINADOS DECIDEM | grid 2x2 algoritmos com weights, fusion card |
| 08 | Etapa 4 | PREVISOES NOVAS TODO DIA AS 6H | clock 06:00, timeline, delivery cards |
| 09 | Etapa 5 | RESULTADOS AUDITADOS E PUBLICOS | SVG ring chart 78%, stat boxes, verify card |
| 10 | CTA | TESTE GRATIS — SUA PRIMEIRA ANALISE AGORA | benefit pills, CTA button verde, URL |

### 16.5 Imagens Externas Usadas

- **Logo:** `betpredict.com.br/img/logo.png` → salvo como `logo-betpredict.png`
- **Ligas (API-Sports):** `https://media.api-sports.io/football/leagues/[ID].png`
  - Série A (71), Série B (72), Champions (2), Premier League (39)
  - La Liga (140), Serie A IT (135), Bundesliga (78), Ligue 1 (61)
  - Liga Portugal (94), Argentina (128), MLS (253)

### 16.6 Licoes Aprendidas

1. **Playwright install chromium** — Necessario na primeira vez: `python -m playwright install chromium` (~277MB)
2. **Tamanho dos elementos** — Primeira iteracao sempre fica pequena demais. Planejar fontes de conteudo 20-30% maiores que o instinto inicial
3. **justify-content: space-between** — Melhor que center para distribuir logo (topo), conteudo (meio) e dots (fundo)
4. **text-transform: uppercase** — Headlines SEMPRE uppercase em ads, com width: 85% para evitar quebras desnecessarias
5. **Imagens com fundo branco** — Logos de ligas precisam de `background:#fff;border-radius:6px;padding:3px` no tema escuro
6. **Google Fonts via @import** — Funciona no Playwright headless, mas precisa de wait_for_timeout(2000) apos networkidle
7. **Palavras proibidas Meta Ads** — Remover TODAS as referencias a "apostar/apostas/bet" antes de publicar. Usar "previsoes/analise/metodo"
8. **3 legendas A/B** — Sempre criar variacoes: dor (PAS), solucao (AIDA), credibilidade. Recomendar por temperatura do publico

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-12 - Aumento seletivo de elementos em carrosséis
**Contexto:** Usuário pediu "aumente um pouco as coisas" (+20%) e depois "aumente em 30% as informações" (+30%)
**Erro:** Na primeira iteração, todos os elementos de conteúdo ficaram pequenos demais para 1080x1080
**Solução:** Multiplicar valor × fator (1.2 para +20%, 1.3 para +30%). Fontes, padding, width/height de ícones — tudo pelo mesmo fator. MANTER inalterados: headline, logo (.logo height), dots (.dot width/height). Para eficiência, editar blocos CSS inteiros (múltiplas propriedades relacionadas por Edit call) em vez de propriedade por propriedade (~20 calls vs ~50+).
**Regra:** Ao escalar carrosséis, usar fator multiplicador consistente (×1.2 a ×1.3) em TODOS os elementos de conteúdo de uma vez. +30% é o máximo seguro sem quebrar layout 1080x1080. Agrupar propriedades CSS relacionadas em cada Edit call para eficiência.

### 2026-03-12 - Imagens de ligas via API-Sports para carrosséis
**Contexto:** Usuário pediu para usar imagens oficiais das ligas do site betpredict.com.br no card 05
**Erro:** Inicialmente usamos emojis de bandeira (🇧🇷, 🏴󠁧󠁢󠁥󠁮󠁧󠁿) como ícones de liga — pouco profissional para ads
**Solução:** Baixar logos de `https://media.api-sports.io/football/leagues/[ID].png` (IDs: Série A=71, Série B=72, Champions=2, Premier=39, La Liga=140, Serie A IT=135, Bundesliga=78, Ligue 1=61, Liga Portugal=94, Argentina=128, MLS=253). Salvar em subpasta `leagues/` e referenciar nos HTMLs com `<img src="leagues/71.png">`. Aplicar `background:#fff;border-radius:6px;padding:3px` no CSS da img.
**Regra:** Para carrosséis de ads esportivos, SEMPRE usar logos oficiais das ligas (API-Sports) em vez de emojis. Verificar no servidor/site do cliente quais imagens já estão em uso antes de buscar externamente.

### 2026-03-12 - Descoberta de assets via scrape do site do cliente
**Contexto:** Precisava encontrar as imagens de ligas usadas no betpredict.com.br
**Erro:** Nenhum — mas o processo de descoberta foi importante: scrape do site + SSH no servidor CyberPanel para listar diretórios
**Solução:** Fluxo: 1) `tools-cli.js scrape_website url=site` para encontrar URLs de imagens no HTML, 2) SSH no servidor para listar `/home/dominio/public_html/` e encontrar assets locais, 3) Identificar que imagens dinâmicas vêm de APIs externas (API-Sports)
**Regra:** Quando usuário diz "use as imagens do meu site", primeiro fazer scrape para mapear TODOS os assets, depois verificar quais são locais vs externos (CDN/API). Baixar localmente para uso offline no Playwright.
