# Motion Ads — Guia de Arquitetura e Produção

## Filosofia

Um motion ad é um arquivo HTML único que funciona como storyboard animado. Cada "take" corresponde a uma frase narrada. O GSAP orquestra a timeline visual; o áudio (ElevenLabs) é gerado separadamente e sincronizado via T constants. O resultado é um MP4 vertical 1080×1920 a 30fps.

---

## Arquitetura do HTML (Padrão Obrigatório)

O HTML segue uma estrutura rígida de 5 blocos, nesta ordem:

```
┌─────────────────────────────────────────────────┐
│  1. HEAD — fonts, GSAP, motion-config, SVG defs │
│  2. STYLE — reset, paleta, layers, takes, FX    │
│  3. BODY — .wrap > .stage > layers + takes      │
│  4. SCRIPT — engines (Orbs, Particles, Glitch)  │
│  5. SCRIPT — GSAP timeline (M) + sync loop      │
└─────────────────────────────────────────────────┘
```

---

## 1. HEAD — Configuração e motion-config

### 1.1 Dependências externas (CDN)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
```

**Regras:**
- Fonte: Poppins (pesos 300–900). Usar `-apple-system,sans-serif` como fallback.
- Ícones: Font Awesome 6.5 — para ícones nos takes de serviço/produto.
- GSAP: 3.12.5 — `gsap.ticker.lagSmoothing(0)` obrigatório no início do script.

### 1.2 motion-config (JSON declarativo)

```html
<script id="motion-config" type="application/json">
{
  "voice": "vr6MVhO51WHYH7ev2Qn9",
  "model": "eleven_v3",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "crf": 18,
  "workers": 2,
  "voice_settings": {
    "stability": 0.75,
    "similarity_boost": 0.85,
    "style": 0.10,
    "use_speaker_boost": true
  },
  "takes": [
    { "id": "n01", "text": "Texto da narração", "gap": 0.55, "preRoll": 0.0, "postRoll": 0.45 },
    { "id": "n02", "text": "Segundo take",      "gap": 0.40, "preRoll": 0.10, "postRoll": 0.30 }
  ]
}
</script>
```

**Campos do motion-config:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `voice` | string | `vr6MVhO51WHYH7ev2Qn9` | ID da voz ElevenLabs |
| `model` | string | `eleven_v3` | Modelo TTS ElevenLabs |
| `fps` | number | 30 | Frames por segundo |
| `width` | number | 1080 | Largura do canvas |
| `height` | number | 1920 | Altura do canvas |
| `crf` | number | 18 | Qualidade H.264 (menor = melhor) |
| `workers` | number | 2 | Workers paralelos Puppeteer |
| `voice_settings` | object | — | Configuração da voz ElevenLabs |

**Campos de cada take:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `id` | string | — | Identificador único (n01, n02, ...) — usado como nome do MP3 |
| `text` | string | — | Texto que será narrado pelo TTS |
| `gap` | number | 0.35 | Silêncio em segundos APÓS esta narração (antes da próxima) |
| `preRoll` | number | 0.15 | Visual aparece N segundos ANTES do áudio começar |
| `postRoll` | number | 0.25 | Visual permanece N segundos APÓS o áudio acabar |

**Regras de timing:**
- **Primeiro take**: `preRoll: 0.0` — o vídeo começa imediatamente.
- **Último take**: `postRoll: 2.0` — CTA precisa de tempo para respirar. `gap: 0`.
- **Takes intermediários**: `preRoll: 0.10–0.15`, `postRoll: 0.25–0.30`, `gap: 0.30–0.55`.
- **Takes curtos** (1–2 palavras): `gap` menor (0.30–0.35).
- **Takes com pergunta**: `gap` maior (0.40–0.55) para dar tempo de processar.

### 1.3 Filtro SVG (Aberração Cromática)

```html
<svg style="position:absolute;width:0;height:0;">
  <defs>
    <filter id="chromatic" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
      <feOffset in="r" dx="-8" dy="0" result="ro"/>
      <feOffset in="b" dx="8" dy="0" result="bo"/>
      <feBlend in="ro" in2="g" mode="screen" result="rg"/>
      <feBlend in="rg" in2="bo" mode="screen"/>
    </filter>
  </defs>
</svg>
```

Usado pelo efeito `F.chroma()` — aplica e remove via GSAP `filter: url(#chromatic)`.

---

## 2. STYLE — CSS Completo

### 2.1 Reset e Paleta

```css
*,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
:root {
  /* Fundo */
  --void: #050508;
  --surface: #0e0e16;

  /* Neons */
  --purple: #7B3FD4;    --purple-g: rgba(123,63,212,.5);
  --lime: #D0FF59;      --lime-g: rgba(208,255,89,.5);
  --red: #FF3344;       --red-g: rgba(255,51,68,.5);

  /* Brancos */
  --w: #fff;
  --w80: rgba(255,255,255,.8);
  --w60: rgba(255,255,255,.6);
  --w40: rgba(255,255,255,.4);
  --w20: rgba(255,255,255,.2);
  --w10: rgba(255,255,255,.1);

  /* Fonte */
  --f: 'Poppins', -apple-system, sans-serif;
}
```

**Regra:** A paleta é a identidade visual da marca. Para outros clientes, trocar APENAS as variáveis `:root`. A estrutura do CSS não muda.

### 2.2 Body e Containers

```css
body {
  background: var(--void);
  font-family: var(--f);
  color: var(--w);
  -webkit-font-smoothing: antialiased;
  display: flex; align-items: center; justify-content: center;
  height: 100vh;
  overflow: hidden;
}

/* Container externo — mantém aspect ratio */
.wrap {
  position: relative; width: 100%; height: 100%;
  max-width: 1080px; max-height: 1920px;
  aspect-ratio: 9/16;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(0,0,0,.9);
}

/* Stage — sempre 1080×1920, escala via JS */
.stage {
  position: absolute; top: 0; left: 0;
  width: 1080px; height: 1920px;
  transform-origin: top left;
  isolation: isolate;
}
```

O `.stage` SEMPRE tem dimensões fixas 1080×1920px. A função `resize()` no JS aplica `scale()` para caber na viewport. Isso garante pixel-perfect na captura.

### 2.3 Layers (camadas visuais)

```css
.L { position: absolute; inset: 0; pointer-events: none; }

/* z-index map (de baixo para cima): */
/* 0  - bg-grad: gradiente radial de fundo */
/* 1  - grid-L: grid 3D perspectiva (opacity .04) */
/* 2  - orb-c: canvas com orbs flutuantes */
/* 5  - takes (.tk): conteúdo textual */
/* 88 - part-c: canvas com partículas */
/* 92 - vig-L: vinheta escura nas bordas */
/* 94 - scan-L: linhas de scan CRT */
/* 95 - noise-L: ruído de filme */
/* 96 - flash-L: flash branco para impacto */
/* 97 - glitch-c: canvas com efeito glitch */
/* 98 - lbox: letterbox cinematográfico (barras pretas) */
/* 100 - prog: barra de progresso */
```

**Cada layer e seu propósito:**

| Layer | z-index | Tipo | Função |
|-------|---------|------|--------|
| `.bg-grad` | 0 | div | Gradiente radial `surface → void` |
| `.grid-L` | 1 | div | Grid perspectiva 3D, opacity 4% |
| `#orb-c` | 2 | canvas | Orbs de cor flutuantes (16 esferas) |
| `.tk` | 5 | divs | Takes — conteúdo de cada frase |
| `#part-c` | 88 | canvas | 150 partículas com trail |
| `.vig-L` | 92 | div | Vinheta radial escura |
| `.scan-L` | 94 | div | Linhas de scan CRT animadas |
| `.noise-L` | 95 | div | Noise SVG jittering |
| `#flash` | 96 | div | Flash branco (controlado via GSAP) |
| `#glitch-c` | 97 | canvas | Slices de glitch (screen blend) |
| `.lbox` | 98 | divs | Barras de letterbox (top/bottom) |
| `.prog` | 100 | div | Barra de progresso gradiente |

### 2.4 Takes (`.tk`)

```css
.tk {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 60px;
  opacity: 0;                   /* SEMPRE começa invisível */
  z-index: 5;
  will-change: opacity, transform, clip-path;
  overflow: hidden;
}

.tk-bg {
  position: absolute; inset: 0;
  pointer-events: none; z-index: -2;
  mix-blend-mode: screen;       /* Glow atrás do texto */
}

.kt {                           /* Key Text — texto principal */
  text-align: center;
  position: relative; z-index: 2;
  text-shadow: 0 4px 30px rgba(0,0,0,.6);
  text-transform: uppercase;
  width: 100%; max-width: 960px;
  font-weight: 900;
  line-height: .88;
  letter-spacing: -4px;
}

.sub {                          /* Subtítulo */
  font-size: 32px; font-weight: 300;
  color: var(--w60);
  text-align: center;
  margin-top: 35px;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.sub-lg {                       /* Subtítulo grande */
  font-size: 40px; font-weight: 500;
  letter-spacing: 2px;
  color: var(--w80);
}
```

**Cada take tem font-size individual** definido por ID:

```css
#t1-t  { font-size: 88px;  letter-spacing: -3px; line-height: .90; }
#t2-t  { font-size: 150px; letter-spacing: -6px; }
#t3-t  { font-size: 220px; letter-spacing: -8px; }
/* ... etc */
#t7-t  { font-size: 350px; letter-spacing: -15px; }  /* Número grande dominante */
```

**Regra de font-size (limite: 88.9% da largura = 960px):**

O font-size define a INTENÇÃO de impacto visual, mas a função `autoFit()` (seção 4.1.1) garante que nenhuma palavra ultrapasse 960px de largura. Portanto, use font-sizes generosos — o autoFit reduz automaticamente se necessário.

| Tipo de texto | Font-size CSS | Limite real (autoFit) |
|---------------|--------------|----------------------|
| Números/percentuais curtos (3–5 chars) | 220–350px | Cabe sem redução |
| Palavras curtas (≤6 chars) | 150–250px | Cabe sem redução |
| Palavras médias (7–10 chars) | 130–180px | autoFit pode reduzir 5–15% |
| Palavras longas (11+ chars) | 100–150px | autoFit reduz proporcionalmente |
| Multi-palavras (cada palavra cabe) | 100–150px | Wrap entre palavras, cada uma cabe |

**Fórmula de referência:** `max_font ≈ 960 / (num_chars × 0.62)` (Poppins 900).
Exemplos: "RIWER" (5) → 309px max | "PLANILHAS" (9) → 172px max | "AUTOMÁTICO" (10) → 154px max

- `letter-spacing` escala proporcionalmente (maior font → mais negativo)
- **SEMPRE** incluir `autoFit()` após `splitW()` como safety net (ver seção 4.1.1)

### 2.5 Efeitos de texto

```css
/* Neons — glow colorido */
.neon-li { color: var(--lime); text-shadow: 0 0 10px var(--lime-g), 0 0 40px var(--lime-g), 0 0 80px rgba(208,255,89,.2); }
.neon-pu { color: var(--purple); text-shadow: 0 0 10px var(--purple-g), 0 0 40px var(--purple-g), 0 0 80px rgba(123,63,212,.2); }
.neon-rd { color: var(--red); text-shadow: 0 0 10px var(--red-g), 0 0 40px var(--red-g), 0 0 80px rgba(255,51,68,.2); }

/* Ghost — texto oco (stroke only) */
.ghost    { -webkit-text-stroke: 2px var(--w40); -webkit-text-fill-color: transparent; text-shadow: none; }
.ghost-rd { -webkit-text-stroke: 3px var(--red); -webkit-text-fill-color: transparent; text-shadow: 0 0 60px var(--red-g); }

/* Cores simples */
.c-pu { color: var(--purple); }
.c-li { color: var(--lime); }
.c-rd { color: var(--red); }
```

**Quando usar cada estilo:**
- **neon-XX**: Afirmações positivas, dados de destaque, CTAs
- **ghost / ghost-rd**: Provocações, negações, conceitos abstratos ("O PROBLEMA", "TECNOLOGIA")
- **Alternar cores entre takes** — nunca repetir a mesma cor em takes consecutivos

### 2.6 Ícones

```css
.ico-w {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 50px;
}
.ico-m {
  font-size: 140px;
  filter: drop-shadow(0 0 30px var(--ig, var(--purple-g)));
}
```

Ícones aparecem ACIMA do texto em takes de serviço/produto. A variável `--ig` no `.ico-w` define a cor do glow.

### 2.7 Divider e CTA Arrow

```css
.divider {
  width: 0; height: 3px;
  background: linear-gradient(90deg, transparent, var(--purple), transparent);
  border-radius: 2px; margin: 30px 0;
  position: relative; z-index: 2;
}

.arrow-w {
  position: absolute; bottom: 160px; left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column;
  align-items: center; gap: 0;
  opacity: 0; z-index: 10;
}
```

O divider começa com `width: 0` e anima via GSAP para criar sweep effect. A arrow aparece apenas no CTA final.

---

## 3. BODY — Estrutura HTML

### 3.1 Layout de camadas

```html
<body>
<audio id="aud" src=""></audio>
<div class="wrap" id="wrap">
<div class="stage" id="stage">
  <!-- Layers de fundo -->
  <div class="L bg-grad" id="bg"></div>
  <canvas id="orb-c" width="1080" height="1920"></canvas>
  <div class="L grid-L"></div>
  <canvas id="part-c" width="1080" height="1920"></canvas>

  <!-- Layers de efeito -->
  <div class="L vig-L"></div>
  <div class="L scan-L"></div>
  <div class="L noise-L"></div>
  <div class="L flash-L" id="flash"></div>
  <canvas id="glitch-c" width="1080" height="1920"></canvas>
  <div class="lbox lbox-t" id="lbt"></div>
  <div class="lbox lbox-b" id="lbb"></div>

  <!-- Takes (t1, t2, ..., tN) -->
  <!-- ...takes aqui... -->

  <!-- Barra de progresso -->
  <div class="prog" id="prog"></div>
</div>
</div>
```

**Ordem obrigatória:** bg → orbs → grid → particles → (takes) → vignette → scan → noise → flash → glitch → letterbox → progress

### 3.2 Anatomia de um take

Existem 4 variantes de take:

**A) Take simples (texto + subtítulo):**
```html
<div class="tk" id="t1">
  <div class="tk-bg" style="background:radial-gradient(circle at 50% 50%,rgba(255,51,68,.16),transparent 45%)"></div>
  <div class="kt neon-rd" id="t1-t">MARKETING DIGITAL</div>
  <div class="sub">investe mas não funciona?</div>
</div>
```

**B) Take com ícone:**
```html
<div class="tk" id="t8">
  <div class="tk-bg" style="background:radial-gradient(circle at 50% 40%,rgba(123,63,212,.10),transparent 55%)"></div>
  <div class="ico-w" id="t8-ico" style="--ig:var(--purple-g);">
    <i class="fa-solid fa-cart-shopping ico-m" style="color:var(--purple);"></i>
  </div>
  <div class="kt neon-pu" id="t8-t">E-COMMERCE</div>
  <div class="sub">alta conversão</div>
</div>
```

**C) Take com divider:**
```html
<div class="tk" id="t4">
  <div class="tk-bg" style="background:radial-gradient(circle at 50% 40%,rgba(123,63,212,.10),transparent 55%)"></div>
  <div class="kt neon-pu" id="t4-t">RIWER LABS</div>
  <div class="divider" id="t4-div"></div>
  <div class="sub sub-lg">tecnologia e performance digital</div>
</div>
```

**D) Take CTA com arrow:**
```html
<div class="tk" id="t14">
  <div class="tk-bg" style="background:radial-gradient(circle at 50% 45%,rgba(208,255,89,.09),transparent 55%)"></div>
  <div class="kt neon-li" id="t14-t">CHAMA NO WHATSAPP</div>
  <div class="sub sub-lg">diagnóstico gratuito</div>
  <div class="arrow-w" id="t14-arrow">
    <span class="arrow-label" id="t14-arrow-label">Fale Agora</span>
    <svg class="arrow-svg" width="56" height="96" viewBox="0 0 56 96" fill="none">
      <polyline points="8,4 28,28 48,4" stroke="#D0FF59" stroke-width="3.5" opacity="0.45"/>
      <polyline points="8,30 28,54 48,30" stroke="#D0FF59" stroke-width="3.5" opacity="0.72"/>
      <polyline points="8,56 28,80 48,56" stroke="#D0FF59" stroke-width="3.5" opacity="1"/>
    </svg>
  </div>
</div>
```

**Regras dos takes:**
- `.tk-bg` SEMPRE presente — o `radial-gradient` usa a cor do neon do take com opacity 7–16%.
- `.kt` recebe classe de estilo (neon-XX, ghost, ghost-rd) + ID para font-size individual.
- `.sub` é o subtítulo contextual — complementa sem repetir a narração.
- `splitW()` no JS transforma cada caractere em `<span class="char">` para animação por caractere.

---

## 4. SCRIPT — Engines Visuais

### 4.1 Inicialização

```javascript
gsap.ticker.lagSmoothing(0);   // OBRIGATÓRIO — evita saltos de frame

// Escala o stage para caber na viewport
function resize() {
  const w = document.getElementById('wrap');
  const s = document.getElementById('stage');
  s.style.transform = `scale(${Math.min(w.clientWidth/1080, w.clientHeight/1920)})`;
}
window.addEventListener('resize', resize);
resize();

// Split de caracteres para animação individual
function splitW(sel) {
  document.querySelectorAll(sel).forEach(el => {
    const p = el.innerHTML.split(/(<[^>]*>)/g);
    let h = '';
    p.forEach(s => {
      if (s.startsWith('<')) { h += s; return; }
      s.split(/(\s+)/).forEach(w => {
        if (/^\s+$/.test(w) || w === '') { h += w; return; }
        h += `<span class="word">${w.split('').map(c => `<span class="char">${c}</span>`).join('')}</span>`;
      });
    });
    el.innerHTML = h;
  });
}

// Aplicar split em TODOS os takes
['#t1-t','#t2-t',...,'#tN-t'].forEach(s => splitW(s));
```

### 4.1.1 autoFit() — Proteção contra overflow (OBRIGATÓRIO)

A função `autoFit()` mede cada `.word` renderizado dentro de cada `.kt` e reduz o `font-size` proporcionalmente se qualquer palavra ultrapassar 960px (88.9% do stage de 1080px).

**DEVE ser chamada APÓS `splitW()` e ANTES das engines/timeline.**

```javascript
// autoFit — garante que NENHUMA palavra ultrapasse 960px no stage (1080px)
// Usa elemento offscreen para medição precisa, imune a transforms do stage.
// DEVE rodar DENTRO do load event (após fontes carregarem), ANTES da timeline GSAP.
function autoFit() {
  const MAX = 960;
  // Elemento offscreen para medição precisa (imune a transforms do stage)
  const m = document.createElement('div');
  m.style.cssText = 'position:absolute;left:-9999px;top:-9999px;' +
    'white-space:nowrap;visibility:hidden;pointer-events:none;';
  document.body.appendChild(m);

  document.querySelectorAll('.kt').forEach(el => {
    let fs = parseFloat(getComputedStyle(el).fontSize);
    const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    // Copiar estilos de fonte para o medidor
    m.style.fontFamily = getComputedStyle(el).fontFamily;
    m.style.fontWeight = getComputedStyle(el).fontWeight;
    m.style.textTransform = 'uppercase';

    const words = el.querySelectorAll('.word');
    let worst = 0;
    words.forEach(w => {
      m.style.fontSize = fs + 'px';
      m.style.letterSpacing = ls + 'px';
      m.textContent = w.textContent;
      if (m.offsetWidth > worst) worst = m.offsetWidth;
    });

    if (worst > MAX) {
      const nfs = Math.floor(fs * (MAX / worst) * 0.92); // 8% margem de segurança
      el.style.fontSize = nfs + 'px';
      if (ls !== 0) el.style.letterSpacing = Math.round(ls * (nfs / fs)) + 'px';
      // Verificação de segurança: re-medir após ajuste
      words.forEach(w => {
        m.style.fontSize = nfs + 'px';
        m.style.letterSpacing = el.style.letterSpacing || ls + 'px';
        m.textContent = w.textContent;
        if (m.offsetWidth > MAX) {
          const nfs2 = Math.floor(nfs * (MAX / m.offsetWidth) * 0.92);
          el.style.fontSize = nfs2 + 'px';
        }
      });
    }
  });

  document.body.removeChild(m);
}
```

**POSIÇÃO NO CÓDIGO — dentro do `load` event, antes da timeline:**
```javascript
window.addEventListener('load', () => {
  autoFit();  // ← AQUI: após fontes carregarem, antes da timeline
  const M = gsap.timeline({ paused: true });
  // ... timeline ...
});
```

**Como funciona:**
1. Cria um `<div>` offscreen fora do stage (imune a `transform: scale()`)
2. Copia `fontFamily`, `fontWeight`, `textTransform` do `.kt` original
3. Para cada `.word`, escreve o texto no medidor e lê `offsetWidth`
4. Se `worst > 960px`: reduz font-size por `ratio = 960 / worst * 0.92`
5. Re-mede após ajuste (loop de segurança) para garantir que cabe
6. Ajusta `letter-spacing` proporcionalmente

**Por que offscreen (não `getBoundingClientRect`)?**
- `getBoundingClientRect()` é afetado por `transform: scale()` do stage
- `getBoundingClientRect()` é afetado por transforms GSAP nos `.char` spans
- `offsetWidth` no medidor offscreen mede o tamanho REAL do texto
- Funciona independente do viewport, escala ou estado da timeline

**Por que dentro do `load` event (não no parse-time)?**
- Fontes Google Fonts (Poppins) carregam via CDN
- Se autoFit rodar antes das fontes carregarem, mede com a fonte fallback (mais estreita)
- Quando Poppins carrega, o texto expande e estoura a tela
- O `load` event só dispara após CSS e fontes estarem prontos

**Ordem de execução obrigatória:**
```
Parse-time: splitW() → engines (Orbs, Particles, Glitch)
Load event: autoFit() → timeline GSAP (M) → sync loop
```

**Regra:** `autoFit()` DEVE estar presente em todo motion HTML como safety net. Usar font-sizes generosos no CSS — o autoFit corrige automaticamente o que não cabe.

### 4.2 Engine de Orbs

16 esferas com gradiente radial flutuando suavemente. Cores da paleta, opacity 1.3–3.8%, raio 70–350px.

```javascript
class Orbs {
  constructor() {
    this.c = document.getElementById('orb-c');
    this.x = this.c.getContext('2d', { alpha: true });
    // 16 orbs com cores da paleta, velocidade lenta, pulsação senoidal
    // Looping: quando sai de um lado, entra pelo outro
  }
  run() {
    // clearRect → forEach orb → radialGradient → arc → fill
    requestAnimationFrame(this.run);
  }
}
```

### 4.3 Engine de Partículas

150 partículas com trail (rastro). Sobem lentamente, reciclam ao sair do topo.

```javascript
class Particles {
  constructor() {
    this.c = document.getElementById('part-c');
    // 150 partículas: branco, lime, purple, red
    // Tamanho: 0.6–3.4px, velocidade Y: -0.12 a -0.77
    // Trail: 3–7 posições anteriores desenhadas como linhas finas
  }
  run() {
    // clearRect → forEach particle → desenhar trail → desenhar ponto
    // Reciclar: se l > maxLife ou y < -20 → reiniciar no fundo
    requestAnimationFrame(this.run);
  }
}
```

### 4.4 Engine de Glitch

Slices horizontais coloridos com jitter. Ativado/desativado sob demanda.

```javascript
class Glitch {
  fire(intensity = 0.8, frames = 9) {
    // Gera N slices (5–17 dependendo da intensidade)
    // Cada slice: posição Y aleatória, altura 2–35px, offset X ±90px
  }
  stop() {
    // Limpa canvas e desliga
  }
  run() {
    // Se on: desenha slices com jitter a cada frame
    // Cores: purple 30% + lime 20% + white 8–20%
    // Slices podem se reposicionar aleatoriamente (>60% chance)
    requestAnimationFrame(this.run);
  }
}
```

### 4.5 Flicker System

Faz caracteres piscarem irregularmente — cria efeito de "texto instável / energia".

```javascript
const flickSets = new Set();

function flickOn(sel, opts = {}) {
  // Adiciona seletor ao set de flicker
  // Cada .char recebe: mo (min opacity, default .12), ch (chance de flicker, default .4)
}

function flickOff(sel) {
  // Remove seletor e restaura opacity 1 em todos os .char
}

function flickTick() {
  // Para cada seletor ativo, para cada .char:
  // Se Math.random() < chance → opacity = mo + random * .25
  // Senão → opacity = 1
}
```

**Quando usar flicker:**
- Textos `ghost` ou `ghost-rd` — reforça o aspecto etéreo
- Momentos de tensão/provocação
- SEMPRE chamar `flickOff()` 0.35s antes do take sair, para não deixar chars invisíveis

---

## 5. SCRIPT — Timeline GSAP e Efeitos

### 5.1 Funções de efeito (objeto F)

```javascript
const F = {
  // Flash branco de impacto
  flash(tl, t, intensity = 0.5) {
    tl.to('#flash', { opacity: intensity, duration: .07 }, t);
    tl.to('#flash', { opacity: 0, duration: .25, ease: 'power2.out' }, t + .07);
  },

  // Shake da câmera
  shake(tl, t, intensity = 1) {
    tl.to('#stage', { keyframes: [
      { x: -5*i, y: 3*i,  duration: .04 },
      { x: 4*i,  y: -4*i, duration: .04 },
      { x: -3*i, y: 2*i,  duration: .04 },
      { x: 0,    y: 0,    duration: .06 },
    ]}, t);
  },

  // Aberração cromática
  chroma(tl, t, duration = 0.3) {
    tl.to('#stage', { filter: 'url(#chromatic)', duration: .04 }, t);
    tl.to('#stage', { filter: 'none', duration: d, ease: 'power2.out' }, t + .04);
  },

  // Glitch visual
  glitch(tl, t, intensity = 0.8, frames = 9) {
    tl.call(() => glitch.fire(intensity, frames), null, t);
    tl.call(() => glitch.stop(), null, t + .35);
  },

  // Letterbox cinematográfico (barras pretas)
  lboxIn(tl, t, height = 110, duration = 0.6) { ... },
  lboxOut(tl, t, duration = 0.5) { ... },
};
```

**Combinações de impacto (ordenadas por força):**

| Nível | Combo | Quando usar |
|-------|-------|-------------|
| Leve | `flash(.4)` | Transição suave |
| Médio | `flash(.5) + shake(1.0)` | Revelação de dado |
| Forte | `flash(.6) + shake(1.4) + glitch(.7)` | Gancho/provocação |
| Máximo | `flash(.8) + shake(2.0) + chroma(.35)` | Número impactante (85%, R$50M) |
| Cinematic | `lboxIn() + flash(.7) + shake(1.8)` | Abertura do vídeo |

### 5.2 Função `ac()` — Animação de Caracteres

```javascript
function ac(tl, sel, t, opts = {}) {
  const {
    dur = 0.5,       // Duração total da animação
    stag = 0.02,     // Delay entre cada caractere (stagger)
    ease = 'back.out(1.2)',
    from = { opacity: 0, y: 45, rotationZ: 8, scale: 0.85 }
  } = opts;
  tl.fromTo(`${sel} .char`, from, {
    opacity: 1, y: 0, rotationZ: 0, scale: 1,
    duration: dur, stagger: stag, ease: ease
  }, t);
}
```

**Variações de `from` usadas no padrão:**

| Estilo | `from` | Quando |
|--------|--------|--------|
| Default (sobe + rotaciona) | `{opacity:0, y:45, rotationZ:8, scale:.85}` | Texto informativo |
| Scale bomb | `{opacity:0, scale:2.4, y:0, rotationZ:0}` | Números/dados impactantes |
| Scale máximo | `{opacity:0, scale:4, y:0, rotationZ:0}` | Número dominante (85%) |
| Scale médio | `{opacity:0, scale:1.8, y:0, rotationZ:0}` | Ícone + texto |
| Fade suave | `{opacity:0, y:0, rotationZ:0, scale:1.3}` | Texto ghost/etéreo |

### 5.3 T Constants e Timeline

```javascript
window.addEventListener('load', () => {
  const M = gsap.timeline({ paused: true });
  window.MASTER = M;
  window.M = M;

  // T constants — injetados pelo motion-gen ou fallback hardcoded
  const T = window.__MOTION_T || {
    t1s: 0,      t1e: 4.69,
    t2s: 4.69,   t2e: 7.89,
    // ...
    total: 58.23
  };

  const DUR = T.total;

  // Helpers de conveniência
  function d(n) { return T['t'+n+'e'] - T['t'+n+'s']; }  // Duração do take N
  function s(n) { return T['t'+n+'s']; }                  // Start do take N
  function e(n) { return T['t'+n+'e']; }                  // End do take N
```

**CRÍTICO — Fallback T:**
- O HTML DEVE conter valores hardcoded no fallback `||` calculados por sílabas (~5 sil/s).
- Fórmula: `duração_estimada = num_sílabas / 5 + preRoll + postRoll + gap`
- O `motion-gen.js` injeta `window.__MOTION_T` com durações REAIS dos MP3s, sobrescrevendo o fallback.
- O `capture-final.js` NÃO injeta `__MOTION_T` — usa os valores hardcoded (que devem ser os reais após primeira geração).

### 5.4 Padrões de Animação por Take

Cada take segue este ciclo: **ENTRADA → CONTEÚDO → SAÍDA**

#### Padrão de Entrada

```javascript
// A) Fade + slide de baixo (padrão)
M.fromTo('#tN', {opacity:0, y:60}, {opacity:1, y:0, duration:.30, ease:'power4.out'}, s(N)+.05);

// B) Fade + scale bomb (impacto)
M.fromTo('#tN', {scale:2.8, opacity:0}, {scale:1, opacity:1, duration:.28, ease:'power4.out'}, s(N));

// C) Slide lateral (da esquerda)
M.fromTo('#tN', {x:-600, opacity:0}, {x:0, opacity:1, duration:.28, ease:'power4.out'}, s(N));

// D) Slide lateral (da direita)
M.fromTo('#tN', {x:600, opacity:0}, {x:0, opacity:1, duration:.30, ease:'power4.out'}, s(N));

// E) ClipPath reveal (círculo expandindo)
M.fromTo('#tN', {clipPath:'circle(0% at 50% 50%)', opacity:0}, {clipPath:'circle(80% at 50% 50%)', opacity:1, duration:.38, ease:'power3.out'}, s(N));

// F) Scale horizontal (squeeze → expand)
M.fromTo('#tN', {scaleX:0, opacity:0}, {scaleX:1, opacity:1, duration:.26, ease:'back.out(1.4)'}, s(N)+.04);

// G) Fade simples (para textos ghost/etéreos)
M.fromTo('#tN', {opacity:0}, {opacity:1, duration:.40, ease:'power2.out'}, s(N));
```

#### Padrão de Conteúdo (durante o take)

```javascript
// Subtítulo aparece a 30–38% da duração do take
M.fromTo('#tN .sub', {opacity:0, y:20}, {opacity:1, y:0, duration:.30, ease:'power3.out'}, s(N)+d(N)*.35);

// Divider sweep (se houver)
M.to('#tN-div', {width:500, duration:.55, ease:'power3.out'}, s(N)+d(N)*.30);

// Ícone com bounce (se houver)
M.fromTo('#tN-ico', {y:-240, opacity:0}, {y:0, opacity:1, duration:.45, ease:'bounce.out'}, s(N)+.06);

// Ícone com elastic rotation (variante)
M.fromTo('#tN-ico', {scale:0, rotation:180}, {scale:1, rotation:0, duration:.50, ease:'elastic.out(1,.6)'}, s(N)+.05);

// Flicker (para ghost/provocações)
M.call(() => flickOn('#tN-t', {mo:.08, ch:.55}), null, s(N)+d(N)*.50);
M.call(() => flickOff('#tN-t'), null, e(N)-.35);
```

#### Padrão de Saída

```javascript
// A) Slide para cima (padrão)
M.to('#tN', {y:-350, opacity:0, duration:.30, ease:'power3.in'}, e(N)-.30);

// B) Blur + fade (suave)
M.to('#tN', {opacity:0, filter:'blur(12px)', duration:.30, ease:'power2.in'}, e(N)-.30);

// C) Slide lateral (para esquerda)
M.to('#tN', {x:-500, opacity:0, duration:.35, ease:'power3.in'}, e(N)-.35);

// D) Slide lateral (para direita)
M.to('#tN', {x:600, opacity:0, duration:.30, ease:'power3.in'}, e(N)-.30);

// E) Scale + blur (explosão)
M.to('#tN', {scale:1.45, opacity:0, filter:'blur(18px)', duration:d(N)*.50, ease:'power2.in'}, e(N)-d(N)*.50);

// F) ScaleX collapse
M.to('#tN', {scaleX:0, opacity:0, duration:.25, ease:'power3.in'}, e(N)-.25);

// G) Fade simples
M.to('#tN', {opacity:0, duration:.28, ease:'power2.in'}, e(N)-.28);
```

**Regra de variação:** NUNCA repetir o mesmo tipo de entrada ou saída em takes consecutivos. Alternar entre pelo menos 3 tipos diferentes.

### 5.5 Barra de Progresso

```javascript
M.to('#prog', {width:'100%', duration:DUR, ease:'none'}, 0);
```

Linear do início ao fim. Gradiente `red → purple → lime`.

### 5.6 Sync Loop (áudio ou fallback)

```javascript
const aud = document.getElementById('aud');
let mode = 'none', t0 = 0;

function start() {
  if (aud.src && aud.src !== location.href) {
    aud.play().then(() => { mode = 'audio'; requestAnimationFrame(syncA); })
              .catch(() => fallback());
  } else fallback();
}

function syncA() {
  if (mode !== 'audio') return;
  M.time(aud.currentTime);         // GSAP segue o áudio
  if (!aud.ended) requestAnimationFrame(syncA);
}

function fallback() {
  mode = 'fb';
  t0 = performance.now() / 1000;
  requestAnimationFrame(syncF);
}

function syncF() {
  if (mode !== 'fb') return;
  let t = (performance.now() / 1000) - t0;
  if (t > DUR) { t0 = performance.now() / 1000; t = 0; /* reset flickers */ }
  M.time(t);
  flickTick();                     // Atualizar flickers a cada frame
  requestAnimationFrame(syncF);
}

start();
```

**Dois modos:**
- **Audio mode**: `M.time(aud.currentTime)` — GSAP segue o tempo do áudio.
- **Fallback mode**: `performance.now()` — loop contínuo com `flickTick()`.

O capturer (`capture-final.js`) sobrescreve `performance.now()` com tempo virtual, então o fallback mode funciona deterministicamente frame-by-frame.

---

## 6. Pipeline de Geração

### 6.1 Fluxo completo

```
┌──────────────────────────────────────────────────────────┐
│ 1. HTML com motion-config                                │
│    ↓                                                     │
│ 2. motion-gen.js lê config, extrai takes                 │
│    ↓                                                     │
│ 3. ElevenLabs API → n01.mp3, n02.mp3, ... (narrações)   │
│    ↓                                                     │
│ 4. FFmpeg normaliza → n01_norm.mp3, n02_norm.mp3, ...    │
│    ↓                                                     │
│ 5. calcTiming() → T constants (tNs, tNe, aNs)           │
│    ↓                                                     │
│ 6. Puppeteer: injeta __MOTION_T → captura frames         │
│    ↓                                                     │
│ 7. FFmpeg: frames → raw.mp4                              │
│    ↓                                                     │
│ 8. build.js: merge raw.mp4 + narrações posicionadas → final.mp4 │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Duas ferramentas de captura

| Ferramenta | Arquivo | Injeta `__MOTION_T`? | Quando usar |
|------------|---------|---------------------|-------------|
| `motion-gen.js` | `~/.claude/tools/motion-gen/` | SIM | Pipeline completo (gera áudio + captura + merge) |
| `capture-final.js` | `~/.claude/knowledge-base/templates/` | NÃO | Recaptura com T values hardcoded (pós primeira geração) |

**IMPORTANTE:** Após a primeira geração com `motion-gen.js`, os T values reais devem ser **copiados para o fallback hardcoded** no HTML. Assim, `capture-final.js` pode recapturar sem depender de injeção.

### 6.3 Comandos

```bash
# Pipeline completo (gera áudio + captura + merge)
node ~/.claude/tools/motion-gen/motion-gen.js riwer-motion.html \
  --quality turbo --output riwer-motion-final.mp4

# Recaptura apenas (HTML já tem T values reais hardcoded)
node ~/.claude/knowledge-base/templates/capture-final.js riwer-motion.html \
  --output riwer-motion-final.mp4

# Opções do motion-gen
--skip-audio       # Reutilizar MP3s existentes
--skip-capture     # Reutilizar vídeo raw (só refaz merge)
--workers 2        # Parallelização Puppeteer
--quality turbo    # Preset (low/medium/high/turbo)
--crf 18           # Qualidade (menor = melhor)
--memory-limit 4096
```

### 6.4 Timing — Como áudio e visual se sincronizam

```
Áudio:  |==NAR1==|..gap..|==NAR2==|..gap..|==NAR3==|
Visual: |====TAKE1==========|
                  |====TAKE2==========|
                            |====TAKE3==========|
        ↑ preRoll            ↑ preRoll
                   postRoll ↑           postRoll ↑
```

- **Áudio**: sequencial, NUNCA sobrepõe. Gap entre narrações.
- **Visual**: pode sobrepor adjacentes via preRoll/postRoll.
- O take visual COMEÇA `preRoll` antes do áudio e TERMINA `postRoll` após o áudio.

### 6.5 Virtual Time Engine (captura determinística)

O capturer sobrescreve `performance.now()` e `requestAnimationFrame()`:

```javascript
// Injetado via evaluateOnNewDocument ANTES do HTML carregar
let virtualTime = 0;
performance.now = () => virtualTime;
Date.now = () => virtualTime;

const rafQueue = [];
window.requestAnimationFrame = cb => { rafQueue.push(cb); return rafQueue.length; };

window.__advanceFrame = () => {
  virtualTime += frameMs;  // 33.33ms para 30fps
  const cbs = rafQueue.splice(0);
  for (const cb of cbs) cb(virtualTime);
};
```

**Multi-segmento:** O `capture-final.js` reinicia o browser a cada ~300 frames (10s) para evitar degradação de memória. Em cada segmento, faz seek rápido até o frame inicial e depois captura normalmente.

---

## 7. Regras de Ouro

### 7.1 Design de takes

1. **Texto principal (`kt`)**: 1–4 palavras. NUNCA frases inteiras no texto grande. A frase fica na narração.
2. **Subtítulo (`.sub`)**: Complementa o texto principal, NÃO repete a narração.
3. **Alternar cores**: Nunca a mesma cor em takes consecutivos. Sequência sugerida: rd → ghost → li → pu → li → pu → li → pu → rd → li → pu → ghost → rd → li.
4. **Font-size escala com importância**: Números/dados dominantes (220–350px), conceitos médios (130–195px), introduções (80–105px).

### 7.2 Animação

1. **Duração de entrada**: 0.22–0.40s. Nunca mais que 0.40s (perde ritmo).
2. **Duração de saída**: 0.25–0.35s. Sempre 0.30s antes do `e(N)`.
3. **Stagger dos chars**: 0.02–0.04s. Textos curtos: 0.025. Textos longos: 0.02. Sem stagger (0.0) para impacto máximo.
4. **Efeitos de impacto**: Na ENTRADA do take, não na saída.
5. **Letterbox**: Usar no primeiro e penúltimo take. Máximo 2× por vídeo.
6. **Glitch**: Máximo 2× por vídeo. Sempre em momentos de tensão/virada.

### 7.3 Estrutura narrativa

| Bloco | Takes | Função |
|-------|-------|--------|
| Gancho | 1–3 | Provocação/problema — cores quentes (red, ghost) |
| Apresentação | 4 | Nome da marca — cor principal (purple) |
| Prova social | 5–7 | Números e dados — alternando lime/purple |
| Serviços | 8–10 | O que faz — com ícones, alternando cores |
| Integração | 11–12 | Consolidação — purple + ghost |
| CTA | 13–14 | Chamada para ação — red → lime |

### 7.4 Regras técnicas

1. **`gsap.ticker.lagSmoothing(0)`** — obrigatório na primeira linha do script.
2. **`window.M = M`** — timeline deve ser acessível globalmente para o capturer.
3. **Canvas 1080×1920** — atributos `width` e `height` no HTML, NUNCA via CSS.
4. **Todos os takes começam com `opacity: 0`** — GSAP controla visibilidade.
5. **`splitW()` em TODOS os seletores de texto** — necessário para animação por caractere.
6. **Fallback T values obrigatórios** — o HTML DEVE funcionar standalone no browser.

---

## 8. Logos (quando necessário)

### Regras críticas

1. **RGBA obrigatório** — NUNCA usar modo LA/grayscale. Converter: `Image.open().convert('RGBA')`.
2. **Base64 inline** — mais confiável que file:// ou URLs externas.
3. **NUNCA** `crossorigin="anonymous"` em data URIs — bloqueia carregamento.
4. **CSS de segurança**: `min-height: 50px` (evita collapse), `brightness(1.1)` (visibilidade).

### Conversão

```python
from PIL import Image
img = Image.open('logo.png').convert('RGBA')
r, g, b, a = img.split()
white = Image.new('L', img.size, 255)
img_white = Image.merge('RGBA', (white, white, white, a))
img_white.save('logo-white.png')
```

```bash
# Gerar base64
python -c "import base64; print(base64.b64encode(open('logo-white.png','rb').read()).decode())"
```

---

## 9. Checklist de Produção

Antes de declarar um motion concluído:

- [ ] `motion-config` com todos os takes, gaps, preRoll, postRoll
- [ ] Fallback T values hardcoded (calculados por sílabas OU copiados dos reais)
- [ ] `gsap.ticker.lagSmoothing(0)` presente
- [ ] `window.M = M` presente
- [ ] `splitW()` aplicado em todos os `#tN-t`
- [ ] `autoFit()` presente e chamado dentro do `load` event, ANTES da timeline
- [ ] Nenhuma palavra ultrapassa 960px (verificar via screenshot Puppeteer)
- [ ] Cores nunca repetem em takes consecutivos
- [ ] Entradas/saídas nunca repetem em takes consecutivos
- [ ] Subtítulos complementam (não repetem) a narração
- [ ] Flash/shake/glitch usados com moderação (flash ≤5×, glitch ≤2×, lbox ≤2×)
- [ ] CTA final com `postRoll: 2.0` e elementos sequenciais (texto → sub → arrow)
- [ ] HTML abre corretamente no browser (fallback mode funciona)
- [ ] Screenshot via Chrome antes de gerar vídeo completo
- [ ] MP3s na pasta são do TEXTO CORRETO (apagar se reutilizando pasta com motion anterior)
- [ ] Após geração, copiar T constants reais para o fallback hardcoded no HTML

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-18 - autoFit deve rodar DENTRO do load event, não no parse-time
**Contexto:** Função autoFit() criada para impedir texto de sair da tela em motion ads
**Erro:** autoFit() no parse-time media com fonte fallback (sans-serif) porque Poppins ainda não carregou do Google Fonts. Quando Poppins carregava, texto expandia e estourava.
**Solução:** Mover autoFit() para dentro do `window.addEventListener('load', ...)`, que só dispara após fontes carregarem.
**Regra:** autoFit() SEMPRE dentro do load event. NUNCA no parse-time. Ordem: `splitW() [parse] → autoFit() [load] → timeline [load]`.

### 2026-03-18 - getBoundingClientRect é afetado por transform:scale do stage
**Contexto:** autoFit() media palavras com getBoundingClientRect().width para verificar overflow
**Erro:** O stage tem `transform: scale(X)` aplicado por resize(). getBoundingClientRect retorna a largura VISUAL (após transform), não a real. Em viewports menores que 1080px, a medição era menor que o real → autoFit não detectava overflow.
**Solução:** Usar elemento offscreen (`<div>` fora do stage) com offsetWidth para medir. Copiar fontFamily/fontWeight/textTransform do .kt original. offsetWidth é imune a transforms de parents.
**Regra:** NUNCA usar getBoundingClientRect para medir texto dentro do stage. SEMPRE usar offscreen div com offsetWidth.

### 2026-03-18 - MP3s reutilizados de outro motion causam dessincronização total
**Contexto:** Gerar motion de automação na mesma pasta onde existiam MP3s do motion institucional
**Erro:** motion-gen detectou n01.mp3–n14.mp3 existentes e fez `[SKIP]`. Os MP3s eram de OUTRO texto (institucional), resultando em narrações completamente erradas com timings absurdos (n01=6.96s em vez de ~3.76s). Vídeo ficou dessincronizado.
**Solução:** Apagar TODOS os MP3s antigos (`rm n*.mp3`) antes de gerar um motion novo na mesma pasta.
**Regra:** ANTES de rodar motion-gen, SEMPRE verificar se existem MP3s na pasta de destino. Se o motion-config tem textos diferentes dos MP3s existentes → APAGAR os MP3s. Verificar com: `ls [pasta]/n*.mp3`.

### 2026-03-18 - Após gerar com motion-gen, atualizar fallback T no HTML
**Contexto:** motion-gen calcula T constants reais e injeta via __MOTION_T. O HTML tem fallback hardcoded estimado por sílabas.
**Erro:** Se usar capture-final.js (que NÃO injeta __MOTION_T), os valores de fallback estimados ficam imprecisos — dessincronização sutil.
**Solução:** Após a primeira geração com motion-gen, copiar os T constants reais do output para o fallback hardcoded no HTML.
**Regra:** SEMPRE atualizar o fallback T no HTML após geração com motion-gen. Os valores estimados por sílabas são apenas para preview no browser.

### 2026-03-18 - Screenshots Puppeteer: parar syncF antes de capturar takes individuais
**Contexto:** Tentativa de capturar screenshots de cada take com M.time(t) para validação visual
**Erro:** O sync loop (syncF) continuava rodando via requestAnimationFrame e sobrescrevia M.time() a cada frame. Todos os screenshots mostravam o mesmo take (onde syncF estava no momento).
**Solução:** Sobrescrever `window.requestAnimationFrame = () => 0` para parar TODOS os loops RAF, depois usar `M.time(t)` livremente.
**Regra:** Para capturar screenshots de takes específicos em Puppeteer: (1) parar RAF com `window.requestAnimationFrame=()=>0`, (2) esperar 200ms, (3) então setar `M.time(t)` e capturar.

### 2026-03-18 - Prompt de motion deve incluir regra de apagar MP3s
**Contexto:** Prompt template "Roteiro de Motion Ad" criado no CRM
**Erro:** O prompt não mencionava a necessidade de verificar/apagar MP3s antigos antes de gerar
**Solução:** Incluir na seção "Observações de Produção" do briefing gerado: "Verificar e apagar MP3s antigos na pasta de destino antes de rodar motion-gen"
**Regra:** Todo briefing de motion gerado deve incluir aviso sobre MP3s na pasta de destino.

### 2026-03-18 - Takes sem ícone ficam "sem vida" — sempre adicionar elementos visuais
**Contexto:** Primeira versão do motion BetPredict tinha vários takes com apenas texto e subtítulo, sem ícones
**Erro:** Usuário reportou que ficou "meio sem vida" e "estranho" nos takes sem ícones. Faltava riqueza visual.
**Solução:** TODOS os takes devem ter pelo menos um elemento visual além do texto: ícone FA, logo base64, badges de ligas, anéis animados, etc. Take da marca deve usar logo PNG (base64) em vez de texto.
**Regra:** NUNCA deixar um take apenas com texto + subtítulo. Cada take DEVE ter: ícone FA, logo/imagem base64, ou elemento visual animado. Logos/imagens de marca → converter para base64 inline (redimensionar para ≤400px).

### 2026-03-18 - Para assets externos (logos, badges): baixar, redimensionar, base64 inline
**Contexto:** Motion precisava de logo BetPredict e escudos das ligas de futebol
**Erro:** Usar URLs externas no src de imagens falha no Puppeteer headless (CORS, rede)
**Solução:** Pipeline: (1) baixar PNGs via curl, (2) redimensionar via Pillow para ≤120px (badges) ou ≤400px (logos), (3) converter para base64, (4) embutir como data URI no HTML. Script build-v2.js para automatizar substituições.
**Regra:** Assets externos SEMPRE como base64 inline. Pipeline: curl → Pillow resize → base64 → data URI no src. Nunca URL externa no motion HTML.

### 2026-03-18 - Script de build complexo: salvar como .js separado, não inline no bash
**Contexto:** Tentativa de gerar HTML v2 com assets via node -e inline no bash
**Erro:** Template literals com backticks, aspas escapadas e substituições complexas causam erro de parsing no bash (EOF, quotes mismatch)
**Solução:** Salvar o script como arquivo .js separado (build-v2.js) e executar com `node build-v2.js`
**Regra:** Para manipulação complexa de HTML com substituições múltiplas, NUNCA usar `node -e` inline. SEMPRE salvar como arquivo .js temporário e executar.
