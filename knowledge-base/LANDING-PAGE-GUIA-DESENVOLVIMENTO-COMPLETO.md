---
title: "Landing Page - Guia Completo de Desenvolvimento"
category: "Desenvolvimento"
tags:
  - landing page
  - html
  - html5
  - css
  - css3
  - javascript
  - frontend
  - design responsivo
  - mobile first
  - seo
  - otimizacao web
  - taxa conversao
  - website
  - pagina vendas
  - desenvolvimento web
  - ui ux
  - psicologia das cores
  - color psychology
  - conversao
  - neuromarketing
topic: "Landing Page"
priority: high
version: "2.0.0"
last_updated: "2026-02-15"
---

# Landing Page - Guia Completo de Desenvolvimento

Este documento consolida todas as especificacoes tecnicas, padroes de design e melhores praticas para criacao de landing pages profissionais com HTML5, CSS3 e JavaScript.

---

# PARTE 1: ESTRUTURA E ARQUITETURA

## 1.1 Estrutura do Arquivo

Uma landing page profissional deve ser entregue em um unico arquivo HTML contendo:

| Elemento | Localizacao | Requisito Minimo |
|----------|-------------|------------------|
| HTML5 semantico | Documento inteiro | Completo |
| CSS inline | Tag `<style>` no `<head>` | 1500+ linhas |
| JavaScript inline | Tag `<script>` antes do `</body>` | 1000+ linhas |

**Regra de Codigo**: Codigo compacto SEM comentarios ou explicacoes para producao.

## 1.2 Configuracao do HEAD

### DOCTYPE e Meta Tags Obrigatorias

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[descricao SEO - max 155 caracteres]">
    <title>[titulo da pagina - max 60 caracteres]</title>
    <link rel="icon" type="image/x-icon" href="[favicon.ico]">
</head>
```

### Recursos Externos Recomendados

```html
<!-- Preconnect para performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Google Fonts: Poppins -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Font Awesome 6.5.1 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

---

# PARTE 2: SISTEMA DE DESIGN (CSS VARIABLES)

## 2.1 Cores Primarias

```css
:root {
    /* Cor Principal da Marca */
    --primary: #3B82F6;
    --primary-dark: #2563EB;    /* -15% luminosidade */
    --primary-light: #60A5FA;   /* +15% luminosidade */
}
```

## 2.2 Cores Secundarias

```css
:root {
    /* Cor de Destaque Secundaria */
    --secondary: #8B5CF6;
    --secondary-dark: #7C3AED;
    --secondary-light: #A78BFA;
}
```

## 2.3 Cores de Destaque e Feedback

```css
:root {
    /* Destaque */
    --accent: #F59E0B;          /* Dourado/Laranja */

    /* Feedback */
    --success: #10B981;         /* Verde */
    --error: #EF4444;           /* Vermelho */
    --warning: #F59E0B;         /* Amarelo */
}
```

## 2.4 Escala de Cinzas

```css
:root {
    /* Escuros */
    --dark: #000000;
    --dark-bg: #0A0A0A;
    --gray-darkest: #1A1A1A;
    --gray-darker: #262626;
    --gray-dark: #404040;

    /* Medios */
    --gray: #737373;
    --gray-light: #A3A3A3;
    --gray-lighter: #D4D4D4;

    /* Claros */
    --light: #FFFFFF;
    --light-bg: #F7F7F7;
}
```

## 2.5 Tipografia

```css
:root {
    /* Familia */
    --font-family: 'Poppins', sans-serif;

    /* Tamanhos */
    --font-size-xs: 0.75rem;    /* 12px */
    --font-size-sm: 0.875rem;   /* 14px */
    --font-size-base: 1rem;     /* 16px */
    --font-size-lg: 1.125rem;   /* 18px */
    --font-size-xl: 1.25rem;    /* 20px */
    --font-size-2xl: 1.5rem;    /* 24px */
    --font-size-3xl: 1.875rem;  /* 30px */
    --font-size-4xl: 2.25rem;   /* 36px */
    --font-size-5xl: 3rem;      /* 48px */
}
```

## 2.6 Espacamentos

```css
:root {
    /* Escala de Espacamento */
    --spacing-1: 0.25rem;   /* 4px */
    --spacing-2: 0.5rem;    /* 8px */
    --spacing-3: 0.75rem;   /* 12px */
    --spacing-4: 1rem;      /* 16px */
    --spacing-5: 1.25rem;   /* 20px */
    --spacing-6: 1.5rem;    /* 24px */
    --spacing-8: 2rem;      /* 32px */
    --spacing-10: 2.5rem;   /* 40px */
    --spacing-12: 3rem;     /* 48px */
    --spacing-16: 4rem;     /* 64px */
    --spacing-20: 5rem;     /* 80px */

    /* Secoes */
    --section-padding-desktop: 80px;
    --section-padding-mobile: 40px;
    --mobile-margin-x: 20px;
}
```

## 2.7 Bordas e Sombras

```css
:root {
    /* Border Radius */
    --border-radius-sm: 0.25rem;
    --border-radius-md: 0.5rem;
    --border-radius-lg: 1rem;
    --border-radius-xl: 1.5rem;
    --border-radius-full: 9999px;

    /* Sombras */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
}
```

## 2.8 Transicoes e Header

```css
:root {
    /* Transicoes */
    --transition: all 0.3s ease;
    --transition-smooth: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    /* Header */
    --header-height-desktop: 70px;
    --header-height-mobile: 60px;
}
```

---

# PARTE 3: RESET E ESTILOS BASE

## 3.1 Reset Global

```css
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
    overflow-x: hidden;
}

body {
    font-family: var(--font-family);
    line-height: 1.6;
    overflow-x: hidden;
    background: var(--light);
    color: var(--gray-dark);
}
```

## 3.2 Elementos Base

```css
img {
    max-width: 100%;
    height: auto;
    display: block;
}

a {
    text-decoration: none;
    transition: var(--transition);
    color: inherit;
}

button {
    cursor: pointer;
    font-family: inherit;
    border: none;
    background: none;
}

ul, ol {
    list-style: none;
}
```

## 3.3 Container

```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Variante menor */
.container-sm {
    max-width: 800px;
}

/* Variante maior */
.container-lg {
    max-width: 1400px;
}
```

## 3.4 Secoes

```css
.section {
    padding: var(--section-padding-desktop) 0;
    position: relative;
    overflow: hidden;
}

@media (max-width: 768px) {
    .section {
        padding: var(--section-padding-mobile) 0;
    }
}
```

---

# PARTE 4: ALTERNANCIA DE BACKGROUNDS

## 4.1 Regra Critica

**IMPORTANTE**: Secoes adjacentes NUNCA podem ter o mesmo tipo de fundo.

```
Correto:                    Incorreto:
Hero (escuro)               Hero (escuro)
Features (claro)            Features (escuro)  <- ERRO
Pricing (escuro)            Pricing (claro)
FAQ (claro)                 FAQ (claro)        <- ERRO
Footer (escuro)             Footer (escuro)
```

## 4.2 Classes de Background

```css
/* Fundo Escuro */
.section-dark {
    background: var(--dark-bg);
}

.section-dark .section-title {
    color: var(--light);
}

.section-dark .section-subtitle {
    color: var(--primary-light);
}

.section-dark .section-description,
.section-dark p {
    color: var(--gray-lighter);
}

/* Fundo Claro */
.section-light {
    background: var(--light-bg);
}

.section-light .section-title {
    color: var(--dark);
}

.section-light .section-subtitle {
    color: var(--primary);
}

.section-light .section-description,
.section-light p {
    color: var(--gray-dark);
}
```

## 4.3 Tabela de Cores por Fundo

| Fundo | Cor Titulo | Cor Subtitulo | Cor Texto |
|-------|------------|---------------|-----------|
| Escuro | Branco | Primaria clara | Cinza claro (--gray-lighter) |
| Claro | Preto | Primaria | Cinza escuro (--gray-dark) |

---

# PARTE 5: COMPONENTES - HEADER/NAVEGACAO

## 5.1 Header Fixo

```css
.header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 1rem 0;
    transition: var(--transition);
}

.header.scrolled {
    padding: 0.5rem 0;
    box-shadow: var(--shadow-md);
}
```

## 5.2 Navbar

```css
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-logo {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--primary);
}

.nav-menu {
    display: flex;
    align-items: center;
    gap: var(--spacing-8);
}

.nav-link {
    font-weight: 500;
    color: var(--gray-dark);
    position: relative;
}

.nav-link::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--primary);
    transition: var(--transition);
}

.nav-link:hover::after {
    width: 100%;
}
```

## 5.3 Menu Mobile

```css
.nav-toggle {
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
}

.nav-toggle span {
    width: 25px;
    height: 3px;
    background: var(--gray-dark);
    transition: var(--transition);
}

@media (max-width: 768px) {
    .nav-toggle {
        display: flex;
    }

    .nav-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: var(--dark-bg);
        flex-direction: column;
        justify-content: center;
        transform: translateX(-100%);
        transition: var(--transition);
    }

    .nav-menu.active {
        transform: translateX(0);
    }

    .nav-link {
        font-size: var(--font-size-2xl);
        color: var(--light);
    }

    .nav-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }

    .nav-toggle.active span:nth-child(2) {
        opacity: 0;
    }

    .nav-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
}
```

---

# PARTE 6: COMPONENTES - HERO SECTION

## 6.1 Estrutura Hero

```css
.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    background: linear-gradient(135deg, var(--dark-bg) 0%, var(--gray-darkest) 100%);
}

/* Com imagem de fundo */
.hero-bg {
    background-image: url('imagem.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
}

.hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
}
```

## 6.2 Conteudo Hero

```css
.hero-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
    padding: 0 var(--mobile-margin-x);
}

.hero-title {
    font-size: var(--font-size-5xl);
    font-weight: 800;
    color: var(--light);
    margin-bottom: var(--spacing-6);
    line-height: 1.2;
}

.hero-subtitle {
    font-size: var(--font-size-xl);
    color: var(--gray-lighter);
    margin-bottom: var(--spacing-8);
}

.hero-buttons {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .hero-title {
        font-size: var(--font-size-3xl);
    }

    .hero-subtitle {
        font-size: var(--font-size-base);
    }

    .hero-buttons {
        flex-direction: column;
        align-items: center;
    }

    .hero-buttons .btn {
        width: 100%;
        max-width: 300px;
    }
}
```

## 6.3 Scroll Indicator

```css
.scroll-indicator {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    animation: bounce 2s infinite;
}

.scroll-indicator i {
    font-size: var(--font-size-2xl);
    color: var(--light);
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateX(-50%) translateY(0);
    }
    40% {
        transform: translateX(-50%) translateY(-10px);
    }
    60% {
        transform: translateX(-50%) translateY(-5px);
    }
}
```

---

# PARTE 7: COMPONENTES - SECTION HEADER

## 7.1 Cabecalho de Secao

```css
.section-header {
    text-align: center;
    margin-bottom: var(--spacing-12);
}

.section-subtitle {
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--primary);
    margin-bottom: var(--spacing-4);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-4);
}

.section-subtitle::before,
.section-subtitle::after {
    content: '';
    width: 30px;
    height: 2px;
    background: var(--primary);
}

.section-title {
    font-size: var(--font-size-4xl);
    font-weight: 700;
    margin-bottom: var(--spacing-4);
    line-height: 1.2;
}

.section-description {
    max-width: 600px;
    margin: 0 auto;
    font-size: var(--font-size-lg);
    color: var(--gray);
}

@media (max-width: 768px) {
    .section-title {
        font-size: var(--font-size-2xl);
    }

    .section-description {
        font-size: var(--font-size-base);
    }
}
```

---

# PARTE 8: COMPONENTES - CARDS E FEATURES

## 8.1 Grid de Cards

```css
.cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-6);
}

@media (max-width: 992px) {
    .cards-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .cards-grid {
        grid-template-columns: 1fr;
    }
}
```

## 8.2 Estrutura do Card

```css
.card {
    background: var(--light);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-8);
    box-shadow: var(--shadow-md);
    transition: var(--transition);
    text-align: center;
}

/* Em secao escura */
.section-dark .card {
    background: var(--gray-darkest);
    border: 1px solid var(--gray-darker);
}

.card:hover {
    transform: translateY(-10px);
    box-shadow: var(--shadow-xl);
}

.card-icon {
    width: 70px;
    height: 70px;
    border-radius: var(--border-radius-full);
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-6);
}

.card-icon i {
    font-size: var(--font-size-2xl);
    color: var(--light);
}

.card-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin-bottom: var(--spacing-4);
}

.card-description {
    font-size: var(--font-size-sm);
    line-height: 1.7;
}
```

## 8.3 Regra de Texto em Cards

**IMPORTANTE**: Todos os textos de descricao e subtitulos em cards do mesmo grupo devem ter tamanhos visuais iguais para manter harmonia.

| Elemento | Regra |
|----------|-------|
| Titulo | Usar `<br>` se mais de 2 palavras |
| Descricao | Mesmo numero de caracteres entre cards |
| Icone | Tamanho identico em todos cards |

---

# PARTE 9: COMPONENTES - TABELA DE COMPARACAO

## 9.1 Estrutura da Tabela

```css
.comparison-table {
    width: 100%;
    border-collapse: collapse;
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
}

.comparison-table thead {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.comparison-table th {
    padding: var(--spacing-6);
    color: var(--light);
    font-weight: 600;
    text-align: left;
}

.comparison-table td {
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--gray-lighter);
}

.comparison-table tbody tr:nth-child(even) {
    background: var(--light-bg);
}

.comparison-table tbody tr:hover {
    background: rgba(59, 130, 246, 0.05);
}

/* Icones */
.check {
    color: var(--success);
}

.times {
    color: var(--gray-light);
}
```

## 9.2 Responsivo Mobile

```css
@media (max-width: 768px) {
    .comparison-table,
    .comparison-table thead,
    .comparison-table tbody,
    .comparison-table th,
    .comparison-table td,
    .comparison-table tr {
        display: block;
    }

    .comparison-table thead {
        display: none;
    }

    .comparison-table tr {
        margin-bottom: var(--spacing-4);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
    }

    .comparison-table td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-4);
    }

    .comparison-table td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--gray-dark);
    }
}
```

---

# PARTE 10: COMPONENTES - PRICING CARDS

## 10.1 Grid de Pricing

```css
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-8);
    max-width: 1000px;
    margin: 0 auto;
}

@media (max-width: 992px) {
    .pricing-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .pricing-grid {
        grid-template-columns: 1fr;
        max-width: 400px;
    }
}
```

## 10.2 Card de Pricing

```css
.pricing-card {
    background: var(--light);
    border-radius: var(--border-radius-xl);
    padding: var(--spacing-10);
    text-align: center;
    position: relative;
    border-top: 5px solid var(--gray-lighter);
    transition: var(--transition);
}

.pricing-card:hover {
    transform: translateY(-10px);
    box-shadow: var(--shadow-xl);
}

/* Card Destacado */
.pricing-card.featured {
    border-top-color: var(--primary);
    transform: scale(1.05);
    box-shadow: var(--shadow-xl);
}

.pricing-card.featured:hover {
    transform: scale(1.08);
}

.pricing-badge {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary);
    color: var(--light);
    padding: var(--spacing-2) var(--spacing-6);
    border-radius: var(--border-radius-full);
    font-size: var(--font-size-sm);
    font-weight: 600;
}

.pricing-title {
    font-size: var(--font-size-xl);
    font-weight: 600;
    margin-bottom: var(--spacing-4);
}

.pricing-price {
    font-size: var(--font-size-5xl);
    font-weight: 800;
    color: var(--primary);
    margin-bottom: var(--spacing-2);
}

.pricing-period {
    color: var(--gray);
    margin-bottom: var(--spacing-6);
}

.pricing-features {
    margin-bottom: var(--spacing-8);
}

.pricing-features li {
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--gray-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
}

.pricing-features li i {
    color: var(--success);
}
```

---

# PARTE 11: COMPONENTES - FAQ/ACCORDION

## 11.1 Estrutura FAQ

```css
.faq-container {
    max-width: 800px;
    margin: 0 auto;
}

.faq-item {
    margin-bottom: var(--spacing-4);
    border-radius: var(--border-radius-lg);
    overflow: hidden;
    background: var(--light);
    box-shadow: var(--shadow-sm);
}

.faq-question {
    width: 100%;
    padding: var(--spacing-6);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: var(--font-size-lg);
    text-align: left;
    cursor: pointer;
    transition: var(--transition);
}

.faq-question:hover {
    background: var(--light-bg);
}

.faq-question i {
    transition: var(--transition);
}

.faq-item.active .faq-question i {
    transform: rotate(180deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.faq-answer-content {
    padding: 0 var(--spacing-6) var(--spacing-6);
    color: var(--gray);
    line-height: 1.8;
}

.faq-item.active .faq-answer {
    max-height: 500px;
}
```

---

# PARTE 12: COMPONENTES - TESTIMONIALS

## 12.1 Grid de Depoimentos

```css
.testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-8);
}

@media (max-width: 992px) {
    .testimonials-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .testimonials-grid {
        grid-template-columns: 1fr;
    }
}
```

## 12.2 Card de Depoimento

```css
.testimonial-card {
    background: var(--light);
    border-radius: var(--border-radius-lg);
    padding: var(--spacing-8);
    position: relative;
}

.testimonial-quote {
    position: absolute;
    top: var(--spacing-4);
    left: var(--spacing-6);
    font-size: var(--font-size-4xl);
    color: var(--primary-light);
    opacity: 0.3;
}

.testimonial-rating {
    margin-bottom: var(--spacing-4);
    color: var(--warning);
}

.testimonial-text {
    font-style: italic;
    color: var(--gray);
    margin-bottom: var(--spacing-6);
    line-height: 1.8;
}

.testimonial-author {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
}

.testimonial-avatar {
    width: 50px;
    height: 50px;
    border-radius: var(--border-radius-full);
    object-fit: cover;
}

.testimonial-name {
    font-weight: 600;
}

.testimonial-role {
    font-size: var(--font-size-sm);
    color: var(--gray);
}
```

---

# PARTE 13: COMPONENTES - FOOTER

## 13.1 Estrutura do Footer

```css
.footer {
    background: var(--dark-bg);
    padding: var(--spacing-16) 0 var(--spacing-8);
    color: var(--gray-lighter);
}

.footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: var(--spacing-12);
    margin-bottom: var(--spacing-12);
}

@media (max-width: 992px) {
    .footer-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .footer-grid {
        grid-template-columns: 1fr;
        text-align: center;
    }
}

.footer-title {
    color: var(--light);
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin-bottom: var(--spacing-6);
}

.footer-links a {
    display: block;
    color: var(--gray-light);
    margin-bottom: var(--spacing-3);
    transition: var(--transition);
}

.footer-links a:hover {
    color: var(--primary-light);
    padding-left: var(--spacing-2);
}

.footer-social {
    display: flex;
    gap: var(--spacing-4);
}

@media (max-width: 768px) {
    .footer-social {
        justify-content: center;
    }
}

.footer-social a {
    width: 40px;
    height: 40px;
    border-radius: var(--border-radius-full);
    background: var(--gray-darker);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--light);
    transition: var(--transition);
}

.footer-social a:hover {
    background: var(--primary);
    transform: translateY(-3px);
}

.footer-bottom {
    border-top: 1px solid var(--gray-darker);
    padding-top: var(--spacing-8);
    text-align: center;
    color: var(--gray);
}
```

---

# PARTE 14: COMPONENTES - ELEMENTOS FLUTUANTES

## 14.1 Botao WhatsApp

```css
.whatsapp-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background: #25D366;
    border-radius: var(--border-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--light);
    font-size: var(--font-size-2xl);
    box-shadow: var(--shadow-lg);
    z-index: 999;
    animation: pulse 2s infinite;
    transition: var(--transition);
}

.whatsapp-btn:hover {
    transform: scale(1.1);
    background: #128C7E;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
    }
    70% {
        box-shadow: 0 0 0 15px rgba(37, 211, 102, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
    }
}
```

## 14.2 Back to Top

```css
.back-to-top {
    position: fixed;
    bottom: 30px;
    left: 30px;
    width: 45px;
    height: 45px;
    background: var(--primary);
    border-radius: var(--border-radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--light);
    opacity: 0;
    visibility: hidden;
    transition: var(--transition);
    z-index: 999;
}

.back-to-top.visible {
    opacity: 1;
    visibility: visible;
}

.back-to-top:hover {
    background: var(--primary-dark);
    transform: translateY(-3px);
}
```

---

# PARTE 15: COMPONENTES - BOTOES

## 15.1 Estilos Base

```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: 14px 32px;
    border-radius: var(--border-radius-full);
    font-weight: 600;
    font-size: var(--font-size-base);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}
```

## 15.2 Variantes

```css
/* Primario */
.btn-primary {
    background: var(--primary);
    color: var(--light);
}

.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
}

/* Secundario */
.btn-secondary {
    background: transparent;
    color: var(--primary);
    border: 2px solid var(--primary);
}

.btn-secondary:hover {
    background: var(--primary);
    color: var(--light);
    transform: translateY(-3px);
}

/* Outline Light (para fundos escuros) */
.btn-outline-light {
    background: transparent;
    color: var(--light);
    border: 2px solid var(--light);
}

.btn-outline-light:hover {
    background: var(--light);
    color: var(--dark);
}

/* Grande */
.btn-lg {
    padding: 18px 40px;
    font-size: var(--font-size-lg);
}
```

## 15.3 Regra de Contraste

| Cor de Fundo do Botao | Cor do Texto |
|-----------------------|--------------|
| Clara (branco, amarelo) | Texto escuro |
| Escura (preto, azul, roxo) | Texto claro |

## 15.4 Centralizacao Mobile

```css
@media (max-width: 768px) {
    .btn-mobile-full {
        width: 100%;
        max-width: 300px;
    }

    .buttons-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-4);
    }
}
```

---

# PARTE 16: RESPONSIVIDADE - BREAKPOINTS

## 16.1 Tabela de Breakpoints

| Dispositivo | Breakpoint | Uso |
|-------------|------------|-----|
| Desktop | Padrao | Estilos base |
| Tablet | max-width: 992px | Grid 2 colunas, menu hamburger |
| Mobile | max-width: 768px | Grid 1 coluna, fullscreen menu |
| Mobile Pequeno | max-width: 480px | Ajustes finos |

## 16.2 Especificacoes por Dispositivo

| Elemento | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Padding Secoes | 80px | 60px | 40px |
| Container | 1200px | 100% | 100% |
| Margem Lateral | 20px | 20px | 20px |
| Grid Cards | 4 colunas | 2 colunas | 1 coluna |
| Menu | Horizontal | Hamburger | Hamburger |
| Titulo H1 | 3rem+ | 2.5rem | 2rem |
| Titulo Secao | 2.5rem | 2rem | 1.75rem |

## 16.3 Media Queries Padrao

```css
/* Tablet */
@media (max-width: 992px) {
    .cards-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .section-title {
        font-size: var(--font-size-3xl);
    }
}

/* Mobile */
@media (max-width: 768px) {
    .section {
        padding: var(--section-padding-mobile) 0;
    }

    .cards-grid {
        grid-template-columns: 1fr;
    }

    .section-title {
        font-size: var(--font-size-2xl);
    }

    .btn {
        width: 100%;
        justify-content: center;
    }
}

/* Mobile Pequeno */
@media (max-width: 480px) {
    .hero-title {
        font-size: var(--font-size-2xl);
    }

    .section-title {
        font-size: var(--font-size-xl);
    }
}
```

---

# PARTE 17: ANIMACOES E EFEITOS

## 17.1 Keyframes Obrigatorios

```css
/* Fade In Up */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Fade In */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Slide In */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-30px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Pulse */
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

/* Bounce */
@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    60% {
        transform: translateY(-5px);
    }
}

/* Shimmer */
@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}
```

## 17.2 Classes de Animacao

```css
/* Elementos que animam ao aparecer */
.fade-in {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.fade-in.visible {
    opacity: 1;
    transform: translateY(0);
}

/* Delay escalonado para cards */
.fade-in:nth-child(1) { transition-delay: 0.1s; }
.fade-in:nth-child(2) { transition-delay: 0.2s; }
.fade-in:nth-child(3) { transition-delay: 0.3s; }
.fade-in:nth-child(4) { transition-delay: 0.4s; }
```

## 17.3 Ripple Effect

```css
.btn {
    position: relative;
    overflow: hidden;
}

.btn .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
}

@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
```

## 17.4 Progress Bar de Scroll

```css
.scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
    z-index: 1001;
    width: 0%;
    transition: width 0.1s;
}
```

---

# PARTE 18: JAVASCRIPT - FUNCIONALIDADES

## 18.1 Menu Mobile

```javascript
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
});
```

## 18.2 Header com Scroll

```javascript
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
```

## 18.3 Back to Top

```javascript
const backToTop = document.querySelector('.back-to-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});
```

## 18.4 Smooth Scroll

```javascript
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
```

## 18.5 FAQ Accordion

```javascript
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Fecha todos
        faqItems.forEach(i => i.classList.remove('active'));

        // Abre o clicado (se nao estava ativo)
        if (!isActive) {
            item.classList.add('active');
        }
    });
});
```

## 18.6 Scroll Animations (Intersection Observer)

```javascript
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});
```

## 18.7 Ripple Effect

```javascript
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - size / 2 + 'px';

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});
```

## 18.8 Progress Bar de Scroll

```javascript
const progressBar = document.querySelector('.scroll-progress');

window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    progressBar.style.width = scrollPercent + '%';
});
```

---

# PARTE 19: ACESSIBILIDADE

## 19.1 Atributos ARIA

```html
<!-- Botoes de icone -->
<button aria-label="Abrir menu" class="nav-toggle">
    <span></span>
    <span></span>
    <span></span>
</button>

<!-- Icones decorativos -->
<i class="fas fa-check" aria-hidden="true"></i>

<!-- Links que abrem nova aba -->
<a href="..." target="_blank" rel="noopener noreferrer" aria-label="Abrir em nova aba">
```

## 19.2 Focus States

```css
a:focus,
button:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}

/* Remover outline apenas se nao for navegacao por teclado */
.js-focus-visible :focus:not(.focus-visible) {
    outline: none;
}
```

## 19.3 Skip Link

```html
<a href="#main-content" class="skip-link">Pular para conteudo principal</a>

<main id="main-content">
    <!-- Conteudo -->
</main>
```

```css
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--primary);
    color: var(--light);
    padding: 8px 16px;
    z-index: 9999;
    transition: top 0.3s;
}

.skip-link:focus {
    top: 0;
}
```

---

# PARTE 20: PERFORMANCE

## 20.1 Lazy Loading

```html
<img src="image.jpg" loading="lazy" alt="Descricao">
```

## 20.2 Preload de Recursos Criticos

```html
<link rel="preload" href="fonts/poppins.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="hero-image.jpg" as="image">
```

## 20.3 Will-Change

```css
.animated-element {
    will-change: transform, opacity;
}
```

## 20.4 Contain

```css
.card {
    contain: layout style paint;
}
```

---

# PARTE 21: CHECKLIST FINAL

## Antes de Entregar

### Estrutura
- [ ] Alternancia de backgrounds entre secoes adjacentes
- [ ] Contraste de texto correto para cada tipo de fundo
- [ ] Textos de cards equilibrados em tamanho
- [ ] Subtitulos com `<br>` quando mais de 2 palavras

### Responsividade
- [ ] Botoes centralizados no mobile
- [ ] Menu centralizado no header
- [ ] Margem lateral 20px no mobile
- [ ] Padding 80px desktop / 40px mobile nas secoes
- [ ] Grid 4 → 2 → 1 colunas (desktop → tablet → mobile)

### Interatividade
- [ ] Todas animacoes funcionando
- [ ] Links e botoes com estados hover
- [ ] Menu mobile funcional (toggle, fechar em ESC/link)
- [ ] Scroll suave para ancoras

### Qualidade
- [ ] Responsividade testada em todos breakpoints
- [ ] Codigo sem comentarios
- [ ] Minimo de linhas atendido (1500 CSS, 1000 JS)
- [ ] Acessibilidade basica implementada

### Psicologia das Cores (OBRIGATORIO)
- [ ] Cor primaria alinhada ao segmento de mercado (Parte 22)
- [ ] Cor do CTA contrasta com a paleta dominante (Efeito Von Restorff)
- [ ] Emocao transmitida condiz com objetivo da pagina
- [ ] Cores adequadas ao publico-alvo (genero/idade - Hallock 2003)
- [ ] Contexto cultural brasileiro considerado (Parte 25.6)
- [ ] Regra 60-30-10 aplicada nas CSS variables
- [ ] Apenas UMA cor de destaque para CTAs em toda a pagina
- [ ] Cores de feedback: verde=sucesso, vermelho=erro, amarelo=alerta
- [ ] Contraste WCAG AA (ratio 4.5:1 minimo) verificado
- [ ] Amarelo NUNCA usado como background de secao inteira
- [ ] Vermelho + verde NAO usados como unica diferenciacao (daltonismo)

---

# PARTE 22: CORES POR SEGMENTO (Base Cientifica)

Tabela fundamentada em estudos cientificos. Consultar `PSICOLOGIA-DAS-CORES-GUIA-CIENTIFICO.md` para referencias completas.

| Segmento | Primaria | Secundaria | CTA Recomendado | Justificativa |
|----------|----------|------------|-----------------|---------------|
| Saude/Nutricao | #10B981 (verde) | #3B82F6 (azul) | Verde ou azul | Verde = natureza/saude; azul = calma/cuidado |
| Fitness/Esportes | #EF4444 (vermelho) | #000000 (preto) | Vermelho/laranja | Vermelho eleva metabolismo e energia (efeito fisiologico) |
| Tecnologia/SaaS | #3B82F6 (azul) | #8B5CF6 (roxo) | Laranja contrastante | 59% dos logos tech usam azul; CTA contrastante (Von Restorff) |
| Financas/Bancos | #1E40AF (azul escuro) | #059669 (verde escuro) | Verde (crescimento) | Azul = confianca (Singh, 2006); verde = dinheiro/crescimento |
| Moda/Luxo | #000000 (preto) | #D4A843 (dourado) | Preto/dourado | Preto e dominante em Nike, Gucci, Chanel, LV |
| Moda Feminina | #EC4899 (rosa) | #000000 (preto) | Rosa ou preto | Mulheres preferem tons avermelhados (Hurlbert & Ling, 2007) |
| Educacao | #6366F1 (indigo) | #F59E0B (amarelo) | Laranja/amarelo | Azul melhora criatividade (Mehta & Zhu, 2009); amarelo = otimismo |
| Imobiliario | #0EA5E9 (azul claro) | #64748B (cinza) | Verde ou azul | Azul = confianca; cinza = profissionalismo |
| Alimentacao/Fast-food | #EF4444 (vermelho) | #F59E0B (amarelo) | Vermelho | Vermelho+amarelo ativam hipotalamo → fome (grelina) |
| Alimentacao/Organica | #10B981 (verde) | #92400E (marrom) | Verde | Verde = natural; marrom = terra/organico |
| Beleza/Cosmeticos | #EC4899 (rosa) | #8B5CF6 (roxo) | Rosa ou roxo | Rosa = feminilidade; roxo = luxo acessivel |
| B2B/Corporate | #2563EB (azul) | #1E40AF (azul escuro) | Verde contrastante | Azul = competencia e confiabilidade |
| Sustentabilidade | #10B981 (verde) | #0EA5E9 (azul claro) | Verde | Verde = natureza; azul = agua/ceu limpo |
| Infantil | Multicolorido | Primarias vibrantes | Laranja/amarelo | Cores saturadas atraem atencao infantil |
| Automotivo | #000000 (preto) | #EF4444 (vermelho) | Vermelho | Preto = poder; vermelho = velocidade |

---

# PARTE 23: TEMPLATE DE INFORMACOES DO PROJETO

Ao criar uma landing page, preencha:

```
Nome/Marca:
Segmento:
Cores da marca (primaria, secundaria):
Objetivo da pagina:
Publico-alvo:
Genero predominante do publico: (M/F/Misto)
Emocao principal desejada: (confianca/urgencia/saude/luxo/diversao/criatividade)
Secoes desejadas:
Conteudo de cada secao:
Links de redes sociais:
Telefone/WhatsApp:
Endereco (se aplicavel):
Imagens/URLs de midia:
Textos especificos:
```

**Se nao informadas cores, usar a PARTE 25 para derivar automaticamente da psicologia das cores com base no segmento, publico e emocao desejada.**

---

# PARTE 24: COMPONENTES DISPONIVEIS

## Obrigatorios

- Header fixo com navegacao
- Hero section
- Secao de features/beneficios
- Call-to-action
- Footer

## Opcionais

- Tabela de comparacao
- Cards de pricing
- FAQ accordion
- Testimonials/depoimentos
- Galeria de resultados
- Formulario de contato
- Mapa de localizacao
- Secao "Sobre"
- Secao "Como funciona"
- Estatisticas/numeros
- Logos de parceiros
- Timeline/processo

---

---

# PARTE 25: PSICOLOGIA DAS CORES APLICADA (OBRIGATORIO)

**REGRA CRITICA**: Toda escolha de cor em landing pages DEVE considerar a psicologia das cores.
Documentacao cientifica completa: `PSICOLOGIA-DAS-CORES-GUIA-CIENTIFICO.md`

## 25.1 Protocolo de Escolha de Cores

Ao iniciar uma landing page, seguir esta sequencia ANTES de definir as CSS variables:

```
PASSO 1: Identificar segmento → Consultar PARTE 22 (cores por segmento)
PASSO 2: Identificar publico-alvo → Verificar preferencias por genero
PASSO 3: Definir emocao principal → Mapear cor correspondente
PASSO 4: Definir cor do CTA → Aplicar Efeito Von Restorff (contraste)
PASSO 5: Verificar contexto cultural brasileiro
PASSO 6: Aplicar regra 60-30-10
```

## 25.2 Regra 60-30-10 nas CSS Variables

```css
:root {
    /* 60% - Cor Dominante (backgrounds, areas grandes) */
    --primary: /* Definir baseado no segmento */;
    --primary-dark: /* -15% luminosidade */;
    --primary-light: /* +15% luminosidade */;

    /* 30% - Cor Secundaria (cards, secoes alternadas) */
    --secondary: /* Complementar a primaria */;
    --secondary-dark: /* -15% luminosidade */;
    --secondary-light: /* +15% luminosidade */;

    /* 10% - Cor de Destaque/CTA (DEVE contrastar com primaria) */
    --accent: /* COR CONTRASTANTE - Von Restorff */;
}
```

## 25.3 Cores de CTA por Contraste (Von Restorff)

O CTA DEVE contrastar com a paleta dominante da pagina:

| Se a pagina e predominantemente... | CTA recomendado | Hex sugerido |
|------------------------------------|-----------------|--------------|
| Azul | Laranja ou verde | #F97316 / #10B981 |
| Verde | Vermelho ou laranja | #EF4444 / #F97316 |
| Preto/Escuro | Verde brilhante ou laranja | #10B981 / #F97316 |
| Branco/Claro | Azul ou vermelho | #3B82F6 / #EF4444 |
| Roxo | Amarelo ou verde | #F59E0B / #10B981 |
| Vermelho | Branco ou verde | #FFFFFF / #10B981 |

## 25.4 Paletas Pre-Definidas por Emocao

### Confianca e Profissionalismo (Financas, B2B, Consultoria)
```css
:root {
    --primary: #2563EB;
    --primary-dark: #1E40AF;
    --primary-light: #60A5FA;
    --secondary: #1E40AF;
    --accent: #10B981;      /* CTA verde = crescimento */
}
```

### Urgencia e Venda Direta (E-commerce, Promocoes)
```css
:root {
    --primary: #0A0A0A;     /* Background escuro */
    --primary-dark: #000000;
    --primary-light: #1A1A1A;
    --secondary: #EF4444;   /* Vermelho urgencia */
    --accent: #F97316;      /* CTA laranja = acao */
}
```

### Saude e Bem-Estar (Nutricao, Wellness, Yoga)
```css
:root {
    --primary: #10B981;
    --primary-dark: #059669;
    --primary-light: #34D399;
    --secondary: #3B82F6;
    --accent: #06B6D4;      /* CTA ciano = frescor */
}
```

### Luxo e Sofisticacao (Moda, Joias, Premium)
```css
:root {
    --primary: #000000;
    --primary-dark: #000000;
    --primary-light: #1C1917;
    --secondary: #D4A843;   /* Dourado */
    --accent: #D4A843;      /* CTA dourado = exclusividade */
}
```

### Criatividade e Inovacao (Agencias, Startups, Educacao)
```css
:root {
    --primary: #8B5CF6;
    --primary-dark: #7C3AED;
    --primary-light: #A78BFA;
    --secondary: #3B82F6;
    --accent: #EC4899;      /* CTA rosa = energia criativa */
}
```

### Energia e Diversao (Alimentacao, Esportes, Jovem)
```css
:root {
    --primary: #F97316;
    --primary-dark: #EA580C;
    --primary-light: #FB923C;
    --secondary: #EAB308;
    --accent: #EF4444;      /* CTA vermelho = acao imediata */
}
```

## 25.5 Preferencias por Genero (Dados Hallock 2003 + Hurlbert & Ling 2007)

| Publico-Alvo | Cores Seguras | Cores a Evitar |
|--------------|---------------|----------------|
| Predominantemente masculino | Azul, verde, preto | Roxo, rosa, laranja |
| Predominantemente feminino | Azul, roxo, verde, rosa | Laranja, marrom, cinza |
| Misto/Universal | Azul, verde | Marrom, laranja como dominante |

## 25.6 Contexto Cultural Brasileiro (Cuidados)

| Combinacao | Risco no Brasil | Alternativa |
|------------|-----------------|-------------|
| Verde + Amarelo (puro, saturado) | Associacao politica/patriotica | Tons diferentes (verde-agua + dourado) |
| Vermelho dominante | Conotacao politica | Usar como acento, nao dominante |
| Roxo dominante | Associacao com luto/morte | Lavanda, tons claros |
| Branco total | Reveillon (contexto especifico) | Misturar com cores suaves |

## 25.7 Dados de Conversao Comprovados

Resultados reais de testes A/B para referencia:

| Teste | Resultado |
|-------|-----------|
| CTA verde → vermelho (HubSpot) | +21% conversoes |
| CTA verde → vermelho (Performable) | +30% conversoes |
| CTA azul → verde (Unbounce) | +35% sign-ups |
| CTA marrom → laranja (Unbounce) | +100% CTR |
| CTA preto → amarelo (Dmix) | +34% conversoes |

**PRINCIPIO:** Nao existe cor de CTA "melhor". O que funciona e o CONTRASTE com a pagina (Von Restorff).

## 25.8 Checklist Psicologia das Cores (Adicionar ao Checklist Final)

### Cores e Emocoes
- [ ] Cor primaria alinhada ao segmento de mercado (Parte 22)
- [ ] Cor do CTA contrasta com a paleta dominante (Von Restorff)
- [ ] Emocao transmitida condiz com objetivo da pagina
- [ ] Cores adequadas ao publico-alvo (genero/idade)
- [ ] Contexto cultural brasileiro considerado

### Aplicacao Tecnica
- [ ] Regra 60-30-10 aplicada nas CSS variables
- [ ] Apenas UMA cor de destaque para CTAs em toda a pagina
- [ ] Cores de feedback: verde=sucesso, vermelho=erro, amarelo=alerta
- [ ] Contraste WCAG AA (ratio 4.5:1 minimo) verificado
- [ ] Amarelo NUNCA usado como background de secao inteira

---

# PARTE 26: TEMPLATES DE REFERENCIA

## 26.1 Template Riwer Labs (Dark Tech/Agency)

**Arquivo:** `knowledge-base/templates/template-riwerlabs-landing-page.html`
**Origem:** [riwerlabs.com](https://riwerlabs.com) — site oficial da Riwer Labs
**Tipo:** Arquivo unico self-contained (HTML + CSS + JS inline)
**Tamanho:** ~172KB | ~6500 linhas

### Caracteristicas do Design

| Aspecto | Detalhe |
|---------|---------|
| **Estilo** | Dark tech/agency — fundo escuro (#0a0a0a) com acentos neon (verde-limao #c8ff00) |
| **Fonte** | Poppins (300-900) via Google Fonts |
| **Icones** | Font Awesome 6.5.1 via CDN |
| **Responsivo** | Mobile-first, breakpoints em 768px e 1024px |
| **Animacoes** | IntersectionObserver para scroll reveals, counter animation, parallax |
| **Efeitos** | Cursor personalizado, hover 3D, marquee infinito, magnetic buttons |

### Secoes Incluidas (11)

1. **Hero** — headline grande + stats animados + CTA
2. **Problema** — 4 cards storytelling (dor do cliente)
3. **Historia** — sobre a empresa + 3 cards diferenciais
4. **Numeros** — 4 metricas com counter animation
5. **Solucoes** — grid 6 pilares numerados (01-06) com hover 3D
6. **Processo** — timeline vertical 4 etapas
7. **Cases** — carrossel touch/swipe com 8 cases
8. **Depoimentos** — slider autoplay com 3 testimonials
9. **Diferenciais** — grid 6 diferenciais competitivos
10. **FAQ** — accordion expansivel com 5 perguntas
11. **Contato/CTA** — CTA final + footer completo

### Paleta de Cores

```css
:root {
    --bg-primary: #0a0a0a;       /* Fundo principal */
    --bg-secondary: #111111;     /* Fundo secundario */
    --bg-card: #1a1a1a;          /* Cards */
    --accent: #c8ff00;           /* Verde-limao neon (destaque/CTA) */
    --text-primary: #ffffff;     /* Texto principal */
    --text-secondary: #888888;   /* Texto secundario */
    --border: #222222;           /* Bordas */
}
```

### Quando Usar Este Template

- Landing pages de agencias digitais, tech, SaaS
- Sites com estetica dark/premium
- Paginas que precisam de muitas secoes e storytelling longo
- Quando se quer causar impacto visual com animacoes e efeitos
- Publico-alvo B2B ou tech-savvy

### Como Customizar

1. Substituir textos e numeros nas secoes HTML
2. Trocar `SEUNUMERO` pelo numero WhatsApp real (6 ocorrencias)
3. Ajustar cores `--accent` e `--bg-*` no `:root` para nova marca
4. Trocar fonte Poppins por outra se necessario (atualizar link CDN + CSS)
5. Adicionar/remover secoes conforme necessidade
6. Inserir Google Analytics ou outro tracking no `<head>`

---

**Documento Criado**: 2025-12-22
**Ultima Atualizacao**: 2026-03-14
**Versao**: 3.0.0
**Fonte Original**: Especificacoes tecnicas de desenvolvimento frontend + Estudos cientificos de psicologia das cores

---

**FIM DO DOCUMENTO**
