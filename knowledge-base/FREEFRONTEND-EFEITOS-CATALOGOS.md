---
title: "FreeFrontend - Catálogo de Efeitos e Componentes"
category: "Desenvolvimento"
tags: [css, javascript, html, animacoes, efeitos, frontend, componentes, ui, riwerlabs, demos]
topic: "Efeitos e Componentes Frontend"
priority: "high"
version: "2.0.0"
last_updated: "2026-02-18"
source: "https://freefrontend.com/"
demos: "D:\\riwerlabs-freefrontend-demos"
---

# FreeFrontend - Catálogo de Efeitos e Componentes

Documentação completa com **exemplos de código reais** extraídos dos demos em `D:\riwerlabs-freefrontend-demos`.
Todos os snippets funcionam isoladamente em arquivos `.html` únicos (CSS em `<style>`, JS em `<script>`).

---

## ÍNDICE DOS DEMOS REAIS

| # | Arquivo | Técnicas |
|---|---------|----------|
| 01 | `01-hero-particles.html` | Canvas partículas, botão gooey SVG, stats counter |
| 02 | `02-cards-3d-hover.html` | Cards 3D tilt, brilho dinâmico, stagger reveal |
| 03 | `03-text-effects.html` | Shimmer, Neon glow, Split text, Texto circular, Flip counter |
| 04 | `04-buttons-loaders.html` | 8 botões (sparkle, glass, 3D, rainbow, sequencial, neon, pills, futurista) + 4 loaders |
| 05 | `05-navigation-glassmorphism.html` | Navbar glassmorphism, scroll indicator, mega menu, sidebar, Mac dock |
| 06 | `06-dashboard-animations.html` | Stagger reveal, gráfico canvas, dark mode toggle, toast notifications, skeleton |

---

## PADRÃO GLOBAL DOS DEMOS

Todos os demos usam a paleta e variáveis CSS abaixo — copie sempre no início:

```css
:root {
    --cor-fundo:        #0A0F1E;
    --cor-azul:         #2563EB;
    --cor-ciano:        #00D4FF;
    --cor-branco:       #FFFFFF;
    --cor-cinza:        #94A3B8;
    --cor-cinza-escuro: #1E293B;
    --cor-card:         #111827;
    --gradiente-texto:  linear-gradient(135deg, #00D4FF 0%, #2563EB 100%);
    --fonte:            'Inter', sans-serif;
    --raio-card:        16px;
}

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
    min-height: 100vh;
    background: var(--cor-fundo);
    color: var(--cor-branco);
    font-family: var(--fonte);
}
```

**Google Font padrão:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

---

## 1. DEMO 01 — HERO COM PARTÍCULAS

**Arquivo:** `D:\riwerlabs-freefrontend-demos\01-hero-particles.html`

### 1.1 Sistema de Partículas no Canvas

**Técnica:** Canvas 2D com `requestAnimationFrame`. Pontos movem-se aleatoriamente e se conectam por linhas quando próximos.

```html
<!-- Canvas no fundo -->
<canvas id="canvas-particulas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;" aria-hidden="true"></canvas>
```

```javascript
const canvas = document.getElementById('canvas-particulas');
const ctx = canvas.getContext('2d');

const CONFIG = {
    quantidade: 80,
    velocidadeMax: 0.5,
    raioMax: 2.5,
    distanciaConexao: 150,
};

let particulas = [];

function redimensionarCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function criarParticula() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * CONFIG.velocidadeMax * 2,
        vy: (Math.random() - 0.5) * CONFIG.velocidadeMax * 2,
        raio: Math.random() * CONFIG.raioMax + 0.5,
        opacidade: Math.random() * 0.5 + 0.3,
    };
}

function inicializarParticulas() {
    particulas = Array.from({ length: CONFIG.quantidade }, criarParticula);
}

function atualizarParticulas() {
    particulas.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
}

function desenharParticulas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Linhas de conexão
    for (let i = 0; i < particulas.length; i++) {
        for (let j = i + 1; j < particulas.length; j++) {
            const dx = particulas[i].x - particulas[j].x;
            const dy = particulas[i].y - particulas[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONFIG.distanciaConexao) {
                const opacidade = (1 - dist / CONFIG.distanciaConexao) * 0.15;
                ctx.beginPath();
                ctx.moveTo(particulas[i].x, particulas[i].y);
                ctx.lineTo(particulas[j].x, particulas[j].y);
                ctx.strokeStyle = `rgba(0, 212, 255, ${opacidade})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // Pontos
    particulas.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.raio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37, 99, 235, ${p.opacidade})`;
        ctx.fill();
    });
}

function animar() {
    atualizarParticulas();
    desenharParticulas();
    requestAnimationFrame(animar);
}

redimensionarCanvas();
inicializarParticulas();
animar();
window.addEventListener('resize', () => { redimensionarCanvas(); inicializarParticulas(); });
```

---

### 1.2 Texto com Gradiente (Background-Clip)

**Técnica:** `background: linear-gradient` + `-webkit-background-clip: text` + `-webkit-text-fill-color: transparent`

```html
<h1 class="titulo-gradiente">
    <span class="destaque">Ganhe Tempo,</span><br>
    Corte Custos
</h1>
```

```css
.destaque {
    background: linear-gradient(135deg, #00D4FF 0%, #2563EB 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

---

### 1.3 Botão Gooey (Efeito Líquido SVG)

**Técnica:** SVG `feTurbulence` + `feColorMatrix` + pseudo-elemento blob animado. O filtro SVG é invisível e aplicado ao wrapper.

```html
<!-- Filtro SVG invisível -->
<svg style="position:absolute;width:0;height:0;pointer-events:none;">
    <defs>
        <filter id="filtro-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 18 -7"
                result="gooey" />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop"/>
        </filter>
    </defs>
</svg>

<button class="btn-gooey" type="button">
    <div class="gooey-blob" aria-hidden="true"></div>
    <span>Diagnóstico Gratuito</span>
    <span class="icone-seta" aria-hidden="true">→</span>
</button>
```

```css
.btn-gooey {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, #2563EB, #1d4ed8);
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 1rem 2.5rem;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.3s ease;
    box-shadow: 0 0 30px rgba(37, 99, 235, 0.4);
    overflow: hidden;
}

/* Blob animado que cria o efeito gooey */
.gooey-blob {
    position: absolute;
    width: 60px;
    height: 60px;
    background: #00D4FF;
    border-radius: 50%;
    left: -20px;
    top: 50%;
    transform: translateY(-50%) scale(0);
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    filter: blur(8px);
    opacity: 0.7;
    pointer-events: none;
}

.btn-gooey:hover .gooey-blob {
    transform: translateY(-50%) scale(4);
}

.btn-gooey:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 0 60px rgba(0, 212, 255, 0.5);
}

.icone-seta {
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease;
}

.btn-gooey:hover .icone-seta {
    transform: translateX(4px);
}
```

---

### 1.4 Stats com Contador Animado

**Técnica:** `IntersectionObserver` + `requestAnimationFrame` com easing quadrático.

```html
<div class="stats">
    <div class="stat">
        <div class="stat__numero" data-alvo="10" data-sufixo="x">0x</div>
        <div class="stat__label">Mais Rápido</div>
    </div>
    <div class="stat">
        <div class="stat__numero" data-alvo="99" data-sufixo="%">0%</div>
        <div class="stat__label">de Precisão</div>
    </div>
</div>
```

```javascript
function easingQuadratico(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function animarContador(elemento, valorAlvo, duracao = 2000) {
    const prefixo = elemento.dataset.prefixo || '';
    const sufixo = elemento.dataset.sufixo || '';
    const inicio = performance.now();

    function passo(agora) {
        const progresso = Math.min((agora - inicio) / duracao, 1);
        const valorAtual = Math.round(easingQuadratico(progresso) * valorAlvo);
        elemento.textContent = prefixo + valorAtual + sufixo;
        if (progresso < 1) requestAnimationFrame(passo);
        else elemento.textContent = prefixo + valorAlvo + sufixo;
    }

    requestAnimationFrame(passo);
}

// Dispara ao entrar no viewport
const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
            document.querySelectorAll('.stat__numero').forEach(el => {
                animarContador(el, parseInt(el.dataset.alvo, 10));
            });
            observador.disconnect();
        }
    });
}, { threshold: 0.3 });

observador.observe(document.querySelector('.stats'));
```

---

### 1.5 Badge com Ponto Pulsante

```css
.hero__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(37, 99, 235, 0.15);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: 100px;
    padding: 0.4rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #00D4FF;
}

/* Ponto pulsante antes do texto */
.hero__badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #00D4FF;
    animation: pulso 2s ease-in-out infinite;
}

@keyframes pulso {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.7; }
}
```

---

## 2. DEMO 02 — CARDS 3D HOVER

**Arquivo:** `D:\riwerlabs-freefrontend-demos\02-cards-3d-hover.html`

### 2.1 Card com Tilt 3D

**Técnica:** `mousemove` calcula posição relativa → aplica `rotateX/Y` via `transform`. `perspective: 1000px` no wrapper cria profundidade.

```html
<div class="card-wrapper">
    <article class="card">
        <div class="card__brilho" aria-hidden="true"></div>
        <div class="card__conteudo">
            <h3>Título do Card</h3>
            <p>Descrição...</p>
        </div>
    </article>
</div>
```

```css
/* Wrapper define a perspectiva 3D */
.card-wrapper {
    perspective: 1000px;
    perspective-origin: center;
}

.card {
    position: relative;
    background: #111827;
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.15s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

/* Camada de brilho que segue o mouse */
.card__brilho {
    position: absolute;
    inset: 0;
    border-radius: 16px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
        circle at 50% 50%,
        rgba(0, 212, 255, 0.12) 0%,
        rgba(37, 99, 235, 0.06) 40%,
        transparent 70%
    );
}

.card:hover .card__brilho { opacity: 1; }

.card:hover {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.08);
    border-color: rgba(0, 212, 255, 0.2);
}

.card__conteudo {
    position: relative;
    z-index: 2;
}
```

```javascript
const INTENSIDADE_TILT = 12; // graus máximos

document.querySelectorAll('.card').forEach(card => {
    const brilho = card.querySelector('.card__brilho');

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const xRel = (e.clientX - rect.left) / rect.width;
        const yRel = (e.clientY - rect.top) / rect.height;

        const rotY = (xRel - 0.5) * INTENSIDADE_TILT;
        const rotX = -(yRel - 0.5) * INTENSIDADE_TILT;

        card.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) translateZ(8px)`;

        if (brilho) {
            brilho.style.background = `radial-gradient(
                circle at ${xRel * 100}% ${yRel * 100}%,
                rgba(0, 212, 255, 0.15) 0%,
                rgba(37, 99, 235, 0.08) 40%,
                transparent 70%
            )`;
        }

        // Sombra dinâmica oposta ao cursor
        const sx = (xRel - 0.5) * -20;
        const sy = (yRel - 0.5) * -20;
        card.style.boxShadow = `${sx}px ${sy}px 40px rgba(0,0,0,0.4)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease';
        card.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0)';
        card.style.boxShadow = '';
        setTimeout(() => {
            card.style.transition = 'transform 0.1s ease, box-shadow 0.3s ease, border-color 0.3s ease';
        }, 500);
    });

    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.1s ease, border-color 0.3s ease';
    });
});
```

---

### 2.2 Stagger Reveal (Animação em Cascata)

**Técnica:** `IntersectionObserver` + `setTimeout` com delay incremental por índice.

```javascript
const cards = document.querySelectorAll('.card');
const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
            const card = entrada.target;
            const indice = Array.from(cards).indexOf(card);
            const delay = indice * 80; // 80ms entre cada card

            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0)';
            }, delay);

            observador.unobserve(card);
        }
    });
}, { threshold: 0.1 });

// Inicializa cards ocultos
cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    observador.observe(card);
});
```

---

### 2.3 Grid Responsivo de Cards

```css
.grid-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
}

@media (max-width: 900px) { .grid-cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .grid-cards { grid-template-columns: 1fr; } }
```

---

## 3. DEMO 03 — EFEITOS DE TEXTO

**Arquivo:** `D:\riwerlabs-freefrontend-demos\03-text-effects.html`

### 3.1 Shimmer — Brilho Deslizante

**Técnica:** `background: linear-gradient` com faixa brilhante + `background-size: 200%` + animação de `background-position`.

```css
.texto-shimmer {
    font-size: clamp(2.5rem, 7vw, 5rem);
    font-weight: 800;
    background: linear-gradient(
        110deg,
        #1E3A6E 20%,
        #00D4FF 35%,
        #2563EB 45%,
        #00D4FF 55%,
        #1E3A6E 70%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
}
```

---

### 3.2 Neon Glow Pulsante

**Técnica:** `text-shadow` em múltiplas camadas com `@keyframes` alternando intensidade.

```css
.texto-neon {
    font-size: clamp(2rem, 6vw, 4rem);
    font-weight: 700;
    color: #00D4FF;
    animation: neon-piscar 2.5s ease-in-out infinite alternate;
}

@keyframes neon-piscar {
    0% {
        text-shadow:
            0 0 5px rgba(0, 212, 255, 0.5),
            0 0 10px rgba(0, 212, 255, 0.3),
            0 0 20px rgba(0, 212, 255, 0.2),
            0 0 40px rgba(37, 99, 235, 0.15);
        color: rgba(0, 212, 255, 0.9);
    }
    100% {
        text-shadow:
            0 0 10px rgba(0, 212, 255, 1),
            0 0 20px rgba(0, 212, 255, 0.8),
            0 0 40px rgba(0, 212, 255, 0.6),
            0 0 80px rgba(37, 99, 235, 0.4),
            0 0 120px rgba(0, 212, 255, 0.2);
        color: #fff;
    }
}
```

---

### 3.3 Split Text Hover — Texto que "Rasga"

**Técnica:** JS divide cada caractere em `.char-top` e `.char-bot`. No hover, top sobe e bot entra de baixo.

```html
<nav class="nav-split">
    <a href="#" class="link-split" data-texto="Serviços">Serviços</a>
    <a href="#" class="link-split" data-texto="Soluções">Soluções</a>
</nav>
```

```css
.link-split {
    position: relative;
    display: inline-block;
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    overflow: hidden;
    padding: 0.2em 0;
}

.link-split::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 1px;
    background: #00D4FF;
    transition: width 0.4s ease;
}

.link-split:hover::after { width: 100%; }

.char-wrapper {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
}

.char-top, .char-bot {
    display: block;
    transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.char-top { transform: translateY(0); }
.char-bot {
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(100%);
    color: #00D4FF;
}

.link-split:hover .char-top { transform: translateY(-100%); }
.link-split:hover .char-bot  { transform: translateY(0); }
```

```javascript
document.querySelectorAll('.link-split').forEach(link => {
    const texto = link.textContent.trim();
    let html = '';
    for (const char of texto) {
        const c = char === ' ' ? '&nbsp;' : char;
        html += `<span class="char-wrapper">
            <span class="char-top" aria-hidden="true">${c}</span>
            <span class="char-bot" aria-hidden="true">${c}</span>
        </span>`;
    }
    link.innerHTML = html;
});
```

---

### 3.4 Texto Circular Animado

**Técnica:** SVG `<textPath>` referenciando um `<path>` circular. CSS `animation` rotaciona o SVG inteiro.

```html
<div style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:260px; height:260px;">

    <!-- SVG com texto circular -->
    <svg viewBox="0 0 260 260" style="width:260px; height:260px; animation: girar-circular 15s linear infinite;" aria-hidden="true">
        <defs>
            <path id="circulo-texto"
                d="M 130,130 m -100,0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0"
            />
        </defs>
        <text style="font-size:11.5px; font-family:'Inter',sans-serif; font-weight:600; letter-spacing:0.18em; fill:#00D4FF; text-transform:uppercase;">
            <textPath href="#circulo-texto" startOffset="0%">
                INTELIGÊNCIA ARTIFICIAL • RIWER LABS • TRANSFORMAÇÃO DIGITAL •
            </textPath>
        </text>
    </svg>

    <!-- Logo centralizado (posicionado absolutamente) -->
    <div style="position:absolute; text-align:center;">
        <div style="font-size:1.4rem; font-weight:800; background:linear-gradient(135deg,#00D4FF,#2563EB); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">RL<br>AI</div>
    </div>
</div>
```

```css
@keyframes girar-circular {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
```

---

### 3.5 Flip Counter (Placar Esportivo)

**Técnica:** CSS `rotateX` anima as faces de cada dígito. JS atualiza a cada segundo.

```html
<div class="flip-digit" data-grupo="segundos" data-posicao="0">
    <div class="flip-face topo">0</div>
    <div class="flip-face baixo">0</div>
</div>
```

```css
.flip-digit {
    position: relative;
    width: 52px;
    height: 70px;
    background: #111827;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
}

.flip-face {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.8rem;
    font-weight: 800;
    color: white;
    backface-visibility: hidden;
}

.flip-face.topo { background: linear-gradient(180deg, #1a2438 0%, #111827 100%); }
.flip-face.baixo { background: linear-gradient(180deg, #111827 0%, #0d1420 100%); }

/* Linha divisória no meio */
.flip-digit::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: rgba(0,0,0,0.5);
    z-index: 10;
}

.flip-digit.virando .flip-face.topo {
    animation: virar-topo 0.3s ease-in forwards;
}

.flip-digit.virando .flip-face.baixo {
    animation: virar-baixo 0.3s ease-out 0.3s both;
}

@keyframes virar-topo {
    0%   { transform: rotateX(0deg); }
    100% { transform: rotateX(-90deg); }
}

@keyframes virar-baixo {
    0%   { transform: rotateX(90deg); }
    100% { transform: rotateX(0deg); }
}
```

```javascript
function animarDigito(elemento, novoValor) {
    const faceTopo = elemento.querySelector('.flip-face.topo');
    const faceBaixo = elemento.querySelector('.flip-face.baixo');
    if (faceTopo.textContent === String(novoValor)) return;

    faceBaixo.textContent = novoValor;
    elemento.classList.add('virando');

    setTimeout(() => {
        faceTopo.textContent = novoValor;
        elemento.classList.remove('virando');
    }, 600);
}

function paraDigitos(numero, casas) {
    return String(numero).padStart(casas, '0').split('').map(Number);
}

// Exemplo: relógio de uptime
const dataInicio = new Date();
dataInicio.setFullYear(dataInicio.getFullYear() - 1);
let estadoAnterior = { dias: -1, horas: -1, minutos: -1, segundos: -1 };

function atualizarFlip() {
    const diff = Math.floor((new Date() - dataInicio) / 1000);
    const segundos = diff % 60;
    const minutos = Math.floor((diff % 3600) / 60);
    const horas = Math.floor((diff % 86400) / 3600);
    const dias = Math.floor(diff / 86400);

    if (segundos !== estadoAnterior.segundos) {
        paraDigitos(segundos, 2).forEach((d, i) => {
            const el = document.querySelector(`[data-grupo="segundos"][data-posicao="${i}"]`);
            if (el) animarDigito(el, d);
        });
        estadoAnterior.segundos = segundos;
    }
    // Repetir para minutos, horas, dias...
}

setInterval(atualizarFlip, 1000);
atualizarFlip();
```

---

## 4. DEMO 04 — BOTÕES E LOADERS

**Arquivo:** `D:\riwerlabs-freefrontend-demos\04-buttons-loaders.html`

### 4.1 Botão Sparkle (Partículas no Hover)

```css
.btn-sparkle {
    background: linear-gradient(135deg, #2563EB, #1d4ed8);
    color: white;
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    /* + classes base do .btn */
}

.sparkle-particula {
    position: absolute;
    pointer-events: none;
    border-radius: 50%;
    animation: sparkle-voar 0.6s ease forwards;
}

@keyframes sparkle-voar {
    0%   { transform: scale(1) translate(0, 0); opacity: 1; }
    100% { transform: scale(0) translate(var(--dx), var(--dy)); opacity: 0; }
}
```

```javascript
const btn = document.getElementById('btn-sparkle');
btn.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.3) return; // Limita frequência

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const particula = document.createElement('div');
    particula.classList.add('sparkle-particula');

    const tamanho = Math.random() * 6 + 3;
    const cores = ['#00D4FF', '#2563EB', '#ffffff', '#60a5fa'];
    const cor = cores[Math.floor(Math.random() * cores.length)];
    const angulo = Math.random() * Math.PI * 2;
    const dist = Math.random() * 50 + 20;

    particula.style.cssText = `
        left: ${x}px; top: ${y}px;
        width: ${tamanho}px; height: ${tamanho}px;
        background: ${cor};
        --dx: ${Math.cos(angulo) * dist}px;
        --dy: ${Math.sin(angulo) * dist}px;
        box-shadow: 0 0 ${tamanho}px ${cor};
    `;

    btn.appendChild(particula);
    setTimeout(() => particula.remove(), 600);
});
```

---

### 4.2 Botão Glassmorphism com Borda Cônica Animada

**Técnica:** `@property` para animar `--angulo` + `conic-gradient` rotacionando.

```css
@property --angulo {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
}

.btn-glass-wrapper {
    position: relative;
    border-radius: 10px;
    padding: 2px;
    background: conic-gradient(
        from var(--angulo, 0deg),
        transparent 0%, #00D4FF 10%, #2563EB 20%, transparent 30%
    );
    animation: rotacionar-borda 3s linear infinite;
}

@keyframes rotacionar-borda {
    from { --angulo: 0deg; }
    to   { --angulo: 360deg; }
}

.btn-glass {
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.5rem;
}
```

---

### 4.3 Botão 3D Push (Skeuomórfico)

**Técnica:** `box-shadow` em camadas simula profundidade. `:active` move para baixo e reduz sombra.

```css
.btn-3d {
    background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 10px;
    box-shadow:
        0 6px 0 0 #1e3a8a,      /* Sombra inferior cria o "bloco" */
        0 8px 15px rgba(0,0,0,0.3);
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    padding: 0.7rem 1.5rem;
    border: none;
    cursor: pointer;
}

.btn-3d:active {
    transform: translateY(4px);
    box-shadow:
        0 2px 0 0 #1e3a8a,
        0 4px 8px rgba(0,0,0,0.2);
}
```

---

### 4.4 Botão Rainbow Shadow

```css
.btn-rainbow {
    background: #111827;
    color: white;
    border: 1px solid rgba(255,255,255,0.1);
    animation: rainbow-sombra 4s linear infinite;
}

@keyframes rainbow-sombra {
    0%   { box-shadow: 0 0 20px 2px rgba(255, 0, 128, 0.6), 0 0 40px 4px rgba(255, 0, 128, 0.2); }
    16%  { box-shadow: 0 0 20px 2px rgba(255, 165, 0, 0.6), 0 0 40px 4px rgba(255, 165, 0, 0.2); }
    33%  { box-shadow: 0 0 20px 2px rgba(0, 212, 255, 0.6), 0 0 40px 4px rgba(0, 212, 255, 0.2); }
    50%  { box-shadow: 0 0 20px 2px rgba(37, 99, 235, 0.6), 0 0 40px 4px rgba(37, 99, 235, 0.2); }
    66%  { box-shadow: 0 0 20px 2px rgba(168, 85, 247, 0.6), 0 0 40px 4px rgba(168, 85, 247, 0.2); }
    83%  { box-shadow: 0 0 20px 2px rgba(16, 185, 129, 0.6), 0 0 40px 4px rgba(16, 185, 129, 0.2); }
    100% { box-shadow: 0 0 20px 2px rgba(255, 0, 128, 0.6), 0 0 40px 4px rgba(255, 0, 128, 0.2); }
}
```

---

### 4.5 Botão com Loader Sequencial (normal → loading → success)

```css
.btn-sequencial { background: linear-gradient(135deg, #2563EB, #1d4ed8); color: white; min-width: 160px; }
.btn-sequencial.carregando { background: rgba(37, 99, 235, 0.3); pointer-events: none; }
.btn-sequencial.sucesso { background: linear-gradient(135deg, #10B981, #059669); pointer-events: none; }

.spinner-inline {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: girar 0.8s linear infinite;
    display: none;
}

.btn-sequencial.carregando .spinner-inline { display: block; }

@keyframes girar { to { transform: rotate(360deg); } }
```

```javascript
const btn = document.getElementById('btn-sequencial');
const texto = btn.querySelector('.btn-texto');
let estado = 'normal';

btn.addEventListener('click', () => {
    if (estado !== 'normal') return;

    estado = 'carregando';
    btn.classList.add('carregando');
    texto.textContent = 'Processando...';
    btn.setAttribute('aria-busy', 'true');

    setTimeout(() => {
        btn.classList.remove('carregando');
        btn.classList.add('sucesso');
        texto.textContent = '✓ Concluído!';
        estado = 'sucesso';

        setTimeout(() => {
            btn.classList.remove('sucesso');
            texto.textContent = 'Processar Dados';
            estado = 'normal';
            btn.setAttribute('aria-busy', 'false');
        }, 1800);
    }, 2200);
});
```

---

### 4.6 Botão Neon Pulsante

```css
.btn-neon {
    background: transparent;
    color: #00D4FF;
    border: 1.5px solid #00D4FF;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.8rem;
    animation: neon-pulsar 2s ease-in-out infinite;
}

@keyframes neon-pulsar {
    0%, 100% {
        box-shadow: 0 0 5px rgba(0,212,255,0.5), 0 0 10px rgba(0,212,255,0.3), inset 0 0 5px rgba(0,212,255,0.1);
    }
    50% {
        box-shadow: 0 0 15px rgba(0,212,255,0.8), 0 0 30px rgba(0,212,255,0.5), 0 0 50px rgba(0,212,255,0.2);
    }
}
```

---

### 4.7 Botão Merging Pills

```css
.btn-pills { background: none; border: none; padding: 0; gap: 4px; cursor: pointer; }

.pill {
    display: inline-flex;
    align-items: center;
    padding: 0.7rem 1.2rem;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pill-a { background: #2563EB; color: white; transform-origin: right center; }
.pill-b { background: rgba(0,212,255,0.15); border: 1.5px solid #00D4FF; color: #00D4FF; transform-origin: left center; }

.btn-pills:hover .pill-a { border-radius: 50px 4px 4px 50px; padding-right: 0.8rem; }
.btn-pills:hover .pill-b { border-radius: 4px 50px 50px 4px; padding-left: 0.8rem; background: rgba(0,212,255,0.25); }
```

---

### 4.8 Botão Futurista com Barra de Progresso

```css
.btn-futurista {
    background: linear-gradient(135deg, #0A0F1E, #1E293B);
    color: #00D4FF;
    border: 1px solid rgba(0, 212, 255, 0.4);
    position: relative;
    overflow: hidden;
    min-width: 170px;
}

.btn-futurista::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent);
    transition: left 0.5s ease;
}

.btn-futurista:hover::before { left: 100%; }
.btn-futurista:hover { border-color: #00D4FF; box-shadow: 0 0 20px rgba(0,212,255,0.25); }

.progresso-barra {
    position: absolute;
    bottom: 0; left: 0;
    height: 2px; width: 0%;
    background: linear-gradient(90deg, #00D4FF, #2563EB);
    transition: width 0.05s linear;
}
```

```javascript
const btn = document.getElementById('btn-futurista');
const barra = document.getElementById('barra-progresso');
const texto = document.getElementById('texto-futurista');
let ativo = false;

btn.addEventListener('click', () => {
    if (ativo) return;
    ativo = true;
    let progresso = 0;
    texto.textContent = 'Analisando... 0%';

    const intervalo = setInterval(() => {
        const inc = progresso < 70 ? Math.random() * 3 + 2 : Math.random() * 1 + 0.5;
        progresso = Math.min(100, progresso + inc);
        barra.style.width = progresso + '%';
        texto.textContent = `Analisando... ${Math.floor(progresso)}%`;

        if (progresso >= 100) {
            clearInterval(intervalo);
            texto.textContent = '✓ Análise Completa';
            setTimeout(() => {
                barra.style.width = '0%';
                texto.textContent = 'Analisar IA';
                ativo = false;
            }, 2000);
        }
    }, 60);
});
```

---

### 4.9 Loaders CSS

```css
/* Spinner circular */
.loader-spinner {
    width: 48px; height: 48px;
    border-radius: 50%;
    border: 4px solid rgba(37, 99, 235, 0.2);
    border-top-color: #2563EB;
    border-right-color: #00D4FF;
    animation: girar 0.9s linear infinite;
}

/* Dots pulsantes */
.loader-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #00D4FF;
    animation: dots-pular 1.4s ease-in-out infinite both;
}
.loader-dot:nth-child(1) { animation-delay: -0.32s; }
.loader-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes dots-pular {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1.1); opacity: 1; }
}

/* Barras verticais (equalizador) */
.loader-bar {
    width: 6px;
    border-radius: 3px;
    background: linear-gradient(180deg, #00D4FF, #2563EB);
    animation: bars-crescer 1.2s ease-in-out infinite;
}
.loader-bar:nth-child(1) { animation-delay: 0s; }
.loader-bar:nth-child(2) { animation-delay: 0.1s; }
.loader-bar:nth-child(3) { animation-delay: 0.2s; }

@keyframes bars-crescer {
    0%, 100% { height: 8px; opacity: 0.4; }
    50%       { height: 36px; opacity: 1; }
}
```

---

## 5. DEMO 05 — NAVEGAÇÃO GLASSMORPHISM

**Arquivo:** `D:\riwerlabs-freefrontend-demos\05-navigation-glassmorphism.html`

### 5.1 Navbar Glassmorphism

**Técnica:** `backdrop-filter: blur(20px) saturate(180%)` + fundo semi-transparente.

```css
.navbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 68px;
    z-index: 1000;
    padding: 0 2rem;

    /* Glassmorphism */
    background: rgba(10, 15, 30, 0.7);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.3s ease, box-shadow 0.3s ease;
}

/* Muda ao scrollar */
.navbar.scrollado {
    background: rgba(10, 15, 30, 0.9);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}
```

```javascript
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 20) navbar.classList.add('scrollado');
    else navbar.classList.remove('scrollado');
});
```

---

### 5.2 Scroll Indicator

**Técnica:** `width` proporcional ao percentual de scroll.

```html
<div class="scroll-indicator" id="scroll-indicator"
    role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
```

```css
.scroll-indicator {
    position: fixed;
    top: 0; left: 0;
    height: 3px;
    width: 0%;
    background: linear-gradient(90deg, #00D4FF, #2563EB);
    z-index: 1001;
    transition: width 0.05s linear;
    border-radius: 0 2px 2px 0;
}
```

```javascript
window.addEventListener('scroll', () => {
    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    const percentual = scrollTotal > 0 ? (window.scrollY / scrollTotal) * 100 : 0;
    const indicador = document.getElementById('scroll-indicator');
    indicador.style.width = percentual + '%';
    indicador.setAttribute('aria-valuenow', Math.round(percentual));
});
```

---

### 5.3 Destaque Deslizante no Menu

**Técnica:** Elemento `.menu-destaque` muda `left` e `width` para cobrir o item em hover.

```css
.menu-destaque {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 36px;
    border-radius: 8px;
    background: rgba(37, 99, 235, 0.15);
    border: 1px solid rgba(37, 99, 235, 0.25);
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    pointer-events: none;
    opacity: 0;
    z-index: 0;
}
```

```javascript
const destaque = document.getElementById('menu-destaque');
const menuContainer = document.getElementById('navbar-menu');

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        const rectItem = item.getBoundingClientRect();
        const rectMenu = menuContainer.getBoundingClientRect();
        destaque.style.left = (rectItem.left - rectMenu.left) + 'px';
        destaque.style.width = rectItem.width + 'px';
        destaque.style.opacity = '1';
    });
});

menuContainer.addEventListener('mouseleave', () => {
    destaque.style.opacity = '0';
});
```

---

### 5.4 Mega Menu Dropdown

```css
.mega-menu {
    position: absolute;
    top: calc(68px - 4px);
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    width: 580px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 1.5rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
}

.mega-menu.visivel {
    opacity: 1;
    pointer-events: all;
    transform: translateX(-50%) translateY(0);
}

.mega-menu__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
```

---

### 5.5 Sidebar Slide-In

```css
.sidebar {
    position: fixed;
    top: 0; left: -300px;
    width: 280px; height: 100vh;
    background: rgba(10, 15, 30, 0.97);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255,255,255,0.08);
    z-index: 1100;
    transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar.aberta { left: 0; }

.sidebar-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1050;
    opacity: 0; pointer-events: none;
    transition: opacity 0.35s ease;
}

.sidebar-overlay.visivel { opacity: 1; pointer-events: all; }
```

```javascript
function abrirSidebar() {
    document.getElementById('sidebar').classList.add('aberta');
    document.getElementById('sidebar-overlay').classList.add('visivel');
    document.body.style.overflow = 'hidden';
}

function fecharSidebar() {
    document.getElementById('sidebar').classList.remove('aberta');
    document.getElementById('sidebar-overlay').classList.remove('visivel');
    document.body.style.overflow = '';
}

document.getElementById('hamburger').addEventListener('click', abrirSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', fecharSidebar);
```

---

### 5.6 Mac Dock Magnify

**Técnica:** `mousemove` calcula distância de cada ícone ao cursor → interpola escala.

```javascript
const dock = document.getElementById('dock');
const ESCALA_MAX = 1.8;
const ESCALA_MIN = 1.0;
const RAIO = 120; // pixels

dock.addEventListener('mousemove', (e) => {
    dock.querySelectorAll('.dock-icone').forEach(icone => {
        const rect = icone.getBoundingClientRect();
        const centroX = rect.left + rect.width / 2;
        const distancia = Math.abs(e.clientX - centroX);

        let escala = ESCALA_MIN;
        if (distancia < RAIO) {
            const t = 1 - (distancia / RAIO);
            escala = ESCALA_MIN + (ESCALA_MAX - ESCALA_MIN) * Math.pow(t, 1.5);
        }

        icone.style.transform = `scale(${escala.toFixed(3)}) translateY(${-(escala - 1) * 10}px)`;
    });
});

dock.addEventListener('mouseleave', () => {
    dock.querySelectorAll('.dock-icone').forEach(icone => {
        icone.style.transform = 'scale(1) translateY(0)';
    });
});
```

---

## 6. DEMO 06 — DASHBOARD ANIMADO

**Arquivo:** `D:\riwerlabs-freefrontend-demos\06-dashboard-animations.html`

### 6.1 Dark Mode Toggle via CSS Variables

**Técnica:** Classe `.light-mode` no `<body>` redefine as variáveis CSS.

```css
:root {
    --cor-fundo: #0A0F1E;
    --cor-card: #111827;
    --cor-borda: rgba(255,255,255,0.06);
    --cor-texto: #F1F5F9;
    --cor-texto2: #94A3B8;
}

.light-mode {
    --cor-fundo: #F1F5F9;
    --cor-card: #FFFFFF;
    --cor-borda: rgba(0,0,0,0.06);
    --cor-texto: #0F172A;
    --cor-texto2: #64748B;
}

body { transition: background 0.3s ease, color 0.3s ease; }
```

```javascript
const toggle = document.getElementById('toggle-dark-input');
toggle.addEventListener('change', () => {
    if (toggle.checked) document.body.classList.remove('light-mode');
    else document.body.classList.add('light-mode');
});
```

### CSS do Switch Toggle

```css
.switch { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
.switch input { opacity: 0; width: 0; height: 0; }

.switch__slider {
    position: absolute; inset: 0;
    background: rgba(255,255,255,0.15);
    border-radius: 100px;
    transition: background 0.3s ease;
}

.switch__slider::before {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: white;
    top: 3px; left: 3px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.switch input:checked + .switch__slider { background: #2563EB; }
.switch input:checked + .switch__slider::before { transform: translateX(18px); }
```

---

### 6.2 Gráfico de Linhas no Canvas

```javascript
const canvas = document.getElementById('canvas-grafico');
const ctx = canvas.getContext('2d');
const dados = [1200, 1850, 1450, 2100, 1900, 2500, 2847];
const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function desenharGrafico(dados, modoClaro = false) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 15, right: 20, bottom: 30, left: 40 };
    const aW = w - pad.left - pad.right;
    const aH = h - pad.top - pad.bottom;
    const maxV = Math.max(...dados);
    const minV = Math.min(...dados) * 0.8;

    ctx.clearRect(0, 0, w, h);

    // Pontos do gráfico
    const pontos = dados.map((v, i) => ({
        x: pad.left + (aW / (dados.length - 1)) * i,
        y: pad.top + aH - ((v - minV) / (maxV - minV)) * aH,
    }));

    // Área preenchida
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    grad.addColorStop(1, 'rgba(37, 99, 235, 0)');

    ctx.beginPath();
    ctx.moveTo(pontos[0].x, h - pad.bottom);
    ctx.lineTo(pontos[0].x, pontos[0].y);
    for (let i = 0; i < pontos.length - 1; i++) {
        const cpX = (pontos[i].x + pontos[i+1].x) / 2;
        ctx.bezierCurveTo(cpX, pontos[i].y, cpX, pontos[i+1].y, pontos[i+1].x, pontos[i+1].y);
    }
    ctx.lineTo(pontos[pontos.length-1].x, h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Linha
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 0; i < pontos.length - 1; i++) {
        const cpX = (pontos[i].x + pontos[i+1].x) / 2;
        ctx.bezierCurveTo(cpX, pontos[i].y, cpX, pontos[i+1].y, pontos[i+1].x, pontos[i+1].y);
    }
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pontos com glow
    pontos.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00D4FF';
        ctx.fill();
    });
}

window.addEventListener('load', () => desenharGrafico(dados));
window.addEventListener('resize', () => desenharGrafico(dados));
```

---

### 6.3 Toast Notifications

```css
.notificacoes-container {
    position: fixed;
    bottom: 1.5rem; right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
}

.notif {
    background: #111827;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    min-width: 280px;
    display: flex; gap: 0.75rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: notif-entrar 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.notif.saindo { animation: notif-sair 0.3s ease forwards; }

@keyframes notif-entrar {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
}

@keyframes notif-sair {
    from { transform: translateX(0); opacity: 1; max-height: 100px; }
    to   { transform: translateX(110%); opacity: 0; max-height: 0; padding: 0; margin: 0; }
}

/* Borda colorida por tipo */
.notif--sucesso { border-left: 3px solid #10B981; }
.notif--info    { border-left: 3px solid #00D4FF; }
.notif--aviso   { border-left: 3px solid #F59E0B; }
.notif--erro    { border-left: 3px solid #EF4444; }
```

```javascript
const container = document.getElementById('notificacoes');

function criarNotificacao(tipo, icone, titulo, msg) {
    const notif = document.createElement('div');
    notif.classList.add('notif', `notif--${tipo}`);
    notif.setAttribute('role', 'alert');
    notif.innerHTML = `
        <span class="notif__icone" aria-hidden="true">${icone}</span>
        <div class="notif__corpo">
            <div class="notif__titulo">${titulo}</div>
            <div class="notif__msg">${msg}</div>
        </div>
        <button class="notif__fechar" type="button" aria-label="Fechar">✕</button>
    `;

    notif.querySelector('.notif__fechar').addEventListener('click', () => fecharNotif(notif));
    container.appendChild(notif);
    setTimeout(() => { if (notif.parentNode) fecharNotif(notif); }, 5000);
}

function fecharNotif(notif) {
    notif.classList.add('saindo');
    setTimeout(() => notif.remove(), 350);
}

// Exemplo de uso
criarNotificacao('sucesso', '✅', 'Operação concluída', 'Dados processados com sucesso.');
criarNotificacao('erro', '❌', 'Falha na conexão', 'API retornou erro 503.');
```

---

### 6.4 Skeleton Loader

```css
.skeleton {
    background: linear-gradient(90deg,
        rgba(255,255,255,0.03) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0.03) 100%
    );
    background-size: 200% auto;
    animation: skeleton-sweep 1.5s ease-in-out infinite;
    border-radius: 6px;
    height: 14px;
    margin-bottom: 0.5rem;
}

@keyframes skeleton-sweep {
    0%   { background-position: 0% 0; }
    100% { background-position: -200% 0; }
}
```

```html
<div role="status" aria-label="Carregando...">
    <div class="skeleton" style="width:90%"></div>
    <div class="skeleton" style="width:80%"></div>
    <div class="skeleton" style="width:70%"></div>
    <div class="skeleton" style="width:55%"></div>
</div>
```

---

## 7. CATEGORIAS POR NÍVEL DE DIFICULDADE

### Iniciante (CSS básico)
- Badge com ponto pulsante → seção 1.5
- Texto gradiente com background-clip → seção 1.2
- Botão 3D Push → seção 4.3
- Botão Neon Pulsante → seção 4.6
- Skeleton Loader → seção 6.4

### Intermediário (CSS moderno)
- Stats com contador animado → seção 1.4
- Cards 3D Hover + Tilt → seção 2.1
- Stagger Reveal → seção 2.2
- Shimmer text → seção 3.1
- Neon glow → seção 3.2
- Scroll Indicator → seção 5.2
- Dark Mode Toggle → seção 6.1
- Toast Notifications → seção 6.3

### Avançado (CSS + JS + Canvas)
- Sistema de Partículas Canvas → seção 1.1
- Botão Gooey SVG → seção 1.3
- Split Text Hover → seção 3.3
- Texto Circular SVG → seção 3.4
- Flip Counter → seção 3.5
- Sparkle Button → seção 4.1
- Glass Button Borda Cônica → seção 4.2
- Destaque Deslizante Menu → seção 5.3
- Mega Menu → seção 5.4
- Mac Dock Magnify → seção 5.6
- Gráfico Canvas → seção 6.2

---

## 8. GUIA DE USO RÁPIDO

### Como reutilizar um efeito em qualquer projeto:

1. **Copie o padrão global** (seção inicial) para as variáveis CSS
2. **Localize o efeito desejado** pelo número da seção
3. **Copie o HTML** para a estrutura da página
4. **Copie o CSS** para a tag `<style>`
5. **Copie o JS** para a tag `<script>` no final do body
6. **Abra o arquivo demo** correspondente para ver funcionando: `D:\riwerlabs-freefrontend-demos\0X-nome.html`

### Combinações recomendadas para landing pages:

| Tipo de Seção | Efeitos Recomendados |
|---------------|----------------------|
| Hero | Partículas Canvas (1.1) + Texto Gradiente (1.2) + Botão Gooey (1.3) + Stats Counter (1.4) |
| Cards/Serviços | Cards 3D Tilt (2.1) + Stagger Reveal (2.2) |
| Navegação | Navbar Glassmorphism (5.1) + Scroll Indicator (5.2) + Destaque Deslizante (5.3) |
| CTA | Botão Sparkle (4.1) ou Botão Sequencial (4.5) |
| Dashboard | Gráfico Canvas (6.2) + Toast (6.3) + Skeleton (6.4) |

---

## 9. REFERÊNCIAS ONLINE

| Categoria | URL |
|-----------|-----|
| Animações CSS | https://freefrontend.com/css-animations/ |
| Efeitos de Texto | https://freefrontend.com/css-text-effects/ |
| Efeitos Hover | https://freefrontend.com/css-hover-effects/ |
| Botões | https://freefrontend.com/css-buttons/ |
| Loaders | https://freefrontend.com/css-loaders/ |
| Cards | https://freefrontend.com/css-cards/ |
| Menu/Navegação | https://freefrontend.com/css-menu/ |
| Backgrounds | https://freefrontend.com/css-background-effects/ |

---

**Versão:** 2.0.0
**Atualizado:** 2026-02-18
**Demos em:** `D:\riwerlabs-freefrontend-demos`
**6 arquivos HTML** com código completo e funcional.
