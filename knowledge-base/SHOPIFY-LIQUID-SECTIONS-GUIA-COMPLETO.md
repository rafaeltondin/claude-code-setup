---
title: "Shopify Liquid Sections - Guia Completo de Desenvolvimento"
category: "Shopify"
tags:
  - shopify
  - liquid
  - sections
  - schema
  - css dinamico
  - javascript
  - blocks
  - settings
  - configuracoes globais
  - whatsapp
  - redes sociais
  - best practices
topic: "Shopify Liquid Development"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# Shopify Liquid Sections - Guia Completo de Desenvolvimento

Este documento consolida todas as tecnicas para adicionar recursos em secoes Shopify Liquid, incluindo configuracoes, CSS dinamico, HTML, JavaScript e Blocks.

---

# PARTE 1: ESTRUTURA DE UMA SECAO LIQUID

## Anatomia Completa

```liquid
{%- comment -%} 1. LOGICA E VARIAVEIS {%- endcomment -%}

<style>
  /* 2. CSS (sempre com escopo) */
</style>

<script>
  /* 3. JAVASCRIPT */
</script>

<!-- 4. HTML -->
<section>...</section>

{% schema %}
  /* 5. CONFIGURACOES */
{% endschema %}
```

## Ordem de Elementos

| Ordem | Elemento | Descricao |
|-------|----------|-----------|
| 1 | Logica/Variaveis | Assigns, captures, calculos |
| 2 | CSS | Estilos com escopo da secao |
| 3 | JavaScript | Scripts da secao |
| 4 | HTML | Estrutura visual |
| 5 | Schema | Configuracoes do admin |

---

# PARTE 2: REGRA DE OURO - USAR CONFIGURACOES GLOBAIS DO TEMA

## Principio Fundamental

**SEMPRE** priorize usar as configuracoes globais do tema (`settings.X`) antes de criar novas configuracoes na section (`section.settings.X`).

### Hierarquia de Prioridade

```
1. Configuracoes globais do tema (settings_schema.json)
   ↓ Se nao existir ou precisar sobrescrever
2. Configuracoes da section (schema da section)
   ↓ Se for especifico do block
3. Configuracoes do block (blocks no schema)
```

### Vantagens de Usar Configuracoes Globais

| Vantagem | Descricao |
|----------|-----------|
| Consistencia | Mesmas cores, fontes e estilos em todo o site |
| Manutencao | Alterar em um lugar reflete em todo o tema |
| Menos duplicacao | Evita configuracoes redundantes |
| Melhor UX | Usuario configura uma vez, aplica em tudo |

## Configuracoes Globais Comuns (settings_schema.json)

### Cores do Tema

```liquid
{%- comment -%} SEMPRE usar cores globais do tema {%- endcomment -%}

{%- comment -%} Cores de texto e fundo {%- endcomment -%}
{{ settings.heading_color }}           {%- comment -%} Cor dos titulos {%- endcomment -%}
{{ settings.text_color }}              {%- comment -%} Cor do texto {%- endcomment -%}
{{ settings.background }}              {%- comment -%} Fundo principal {%- endcomment -%}
{{ settings.secondary_background }}    {%- comment -%} Fundo secundario {%- endcomment -%}

{%- comment -%} Cores do header/footer {%- endcomment -%}
{{ settings.header_background }}       {%- comment -%} Fundo do cabecalho {%- endcomment -%}
{{ settings.header_text_color }}       {%- comment -%} Texto do cabecalho {%- endcomment -%}
{{ settings.footer_background }}       {%- comment -%} Fundo do rodape {%- endcomment -%}
{{ settings.footer_text_color }}       {%- comment -%} Texto do rodape {%- endcomment -%}

{%- comment -%} Cores de botoes {%- endcomment -%}
{{ settings.primary_button_background }}    {%- comment -%} Fundo botao primario {%- endcomment -%}
{{ settings.primary_button_text_color }}    {%- comment -%} Texto botao primario {%- endcomment -%}
{{ settings.secondary_button_background }}  {%- comment -%} Fundo botao secundario {%- endcomment -%}
{{ settings.secondary_button_text_color }}  {%- comment -%} Texto botao secundario {%- endcomment -%}

{%- comment -%} Cores de status {%- endcomment -%}
{{ settings.success_color }}           {%- comment -%} Cor de sucesso {%- endcomment -%}
{{ settings.error_color }}             {%- comment -%} Cor de erro {%- endcomment -%}
{{ settings.product_on_sale_accent }}  {%- comment -%} Cor de promocao {%- endcomment -%}
{{ settings.product_sold_out_accent }} {%- comment -%} Cor de esgotado {%- endcomment -%}
```

### Tipografia

```liquid
{{ settings.heading_font }}            {%- comment -%} Fonte dos titulos {%- endcomment -%}
{{ settings.text_font }}               {%- comment -%} Fonte do texto {%- endcomment -%}
{{ settings.text_font_size }}          {%- comment -%} Tamanho base do texto {%- endcomment -%}
{{ settings.heading_text_transform }}  {%- comment -%} Transform dos titulos {%- endcomment -%}
```

### Redes Sociais

```liquid
{{ settings.social_facebook }}
{{ settings.social_instagram }}
{{ settings.social_twitter }}
{{ settings.social_youtube }}
{{ settings.social_tiktok }}
{{ settings.social_linkedin }}
{{ settings.social_pinterest }}
{{ settings.social_whatsapp }}
```

### WhatsApp

```liquid
{{ settings.whats_num_sticky }}        {%- comment -%} Numero do WhatsApp {%- endcomment -%}
{{ settings.show_sticky_whats }}       {%- comment -%} Mostrar botao flutuante {%- endcomment -%}
```

### Informacoes da Empresa (Rodape)

```liquid
{{ settings.footer_company_name }}
{{ settings.footer_cnpj }}
{{ settings.footer_address }}
{{ settings.footer_phone }}
{{ settings.footer_email }}
{{ settings.footer_business_hours }}
```

---

# PARTE 3: PADROES DE USO - GLOBAL vs SECTION

## Padrao 1: Usar Global com Override Opcional

**MELHOR PRATICA**: Usar configuracao global como padrao, permitindo override na section.

### No CSS da Section

```liquid
<style>
  #shopify-section-{{ section.id }} {
    {%- comment -%} Usa cor da section se definida, senao usa global do tema {%- endcomment -%}
    {%- if section.settings.cor_fundo != blank -%}
      {%- assign cor_fundo = section.settings.cor_fundo -%}
    {%- else -%}
      {%- assign cor_fundo = settings.background -%}
    {%- endif -%}

    {%- if section.settings.cor_texto != blank -%}
      {%- assign cor_texto = section.settings.cor_texto -%}
    {%- else -%}
      {%- assign cor_texto = settings.text_color -%}
    {%- endif -%}

    background: {{ cor_fundo }};
    color: {{ cor_texto }};
  }
</style>
```

### No Schema (Opcional Override)

```json
{
  "type": "color",
  "id": "cor_fundo",
  "label": "Cor de fundo",
  "info": "Deixe vazio para usar a cor padrao do tema."
}
```

## Padrao 2: Usar Variaveis CSS Globais

**RECOMENDADO**: Usar variaveis CSS que ja existem no tema.

```liquid
<style>
  #shopify-section-{{ section.id }} .elemento {
    {%- comment -%} Usa variaveis CSS globais do tema {%- endcomment -%}
    background: rgb(var(--background));
    color: rgb(var(--text-color));
  }

  #shopify-section-{{ section.id }} .titulo {
    color: rgb(var(--heading-color));
    font-family: var(--heading-font-family);
  }

  #shopify-section-{{ section.id }} .botao {
    background: rgb(var(--primary-button-background));
    color: rgb(var(--primary-button-text-color));
  }

  #shopify-section-{{ section.id }} .botao-secundario {
    background: rgb(var(--secondary-button-background));
    color: rgb(var(--secondary-button-text-color));
  }
</style>
```

## Padrao 3: WhatsApp Usando Config Global

**NUNCA** crie configuracao de numero do WhatsApp na section. Use a global.

```liquid
{%- comment -%} ERRADO - Nao faca isso {%- endcomment -%}
{%- if section.settings.whatsapp_number != blank -%}
  <a href="https://wa.me/{{ section.settings.whatsapp_number }}">WhatsApp</a>
{%- endif -%}

{%- comment -%} CORRETO - Use a configuracao global do tema {%- endcomment -%}
{%- if settings.whats_num_sticky != blank -%}
  {%- assign whatsapp_clean = settings.whats_num_sticky | remove: ' ' | remove: '-' | remove: '(' | remove: ')' | remove: '+' -%}
  <a href="https://wa.me/{{ whatsapp_clean }}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
    {%- render 'icon' with 'whatsapp' -%}
    <span>WhatsApp</span>
  </a>
{%- endif -%}
```

### Schema para Controle de Visibilidade (Nao Numero)

```json
{
  "type": "checkbox",
  "id": "show_whatsapp",
  "label": "Mostrar botao WhatsApp",
  "info": "O numero e configurado em Configuracoes do Tema > WhatsApp Flutuante",
  "default": true
}
```

## Padrao 4: Redes Sociais Usando Config Global

```liquid
{%- comment -%} Usar configuracoes globais de redes sociais {%- endcomment -%}
{%- if section.settings.show_social_icons -%}
  <div class="social-icons">
    {%- if settings.social_facebook != blank -%}
      <a href="{{ settings.social_facebook }}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
        {%- render 'icon' with 'facebook' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_instagram != blank -%}
      <a href="{{ settings.social_instagram }}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        {%- render 'icon' with 'instagram' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_twitter != blank -%}
      <a href="{{ settings.social_twitter }}" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
        {%- render 'icon' with 'twitter' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_youtube != blank -%}
      <a href="{{ settings.social_youtube }}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
        {%- render 'icon' with 'youtube' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_tiktok != blank -%}
      <a href="{{ settings.social_tiktok }}" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
        {%- render 'icon' with 'tiktok' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_linkedin != blank -%}
      <a href="{{ settings.social_linkedin }}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        {%- render 'icon' with 'linkedin' -%}
      </a>
    {%- endif -%}

    {%- if settings.social_pinterest != blank -%}
      <a href="{{ settings.social_pinterest }}" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
        {%- render 'icon' with 'pinterest' -%}
      </a>
    {%- endif -%}
  </div>
{%- endif -%}
```

### Schema (Apenas Controle de Visibilidade)

```json
{
  "type": "checkbox",
  "id": "show_social_icons",
  "label": "Mostrar icones de redes sociais",
  "info": "Configure os links em Configuracoes do Tema > Redes Sociais",
  "default": true
}
```

## Padrao 5: Informacoes de Contato Usando Config Global

```liquid
{%- comment -%} Usar informacoes do rodape/empresa {%- endcomment -%}
<div class="contact-info">
  {%- if settings.footer_phone != blank -%}
    <a href="tel:{{ settings.footer_phone | remove: ' ' | remove: '-' | remove: '(' | remove: ')' }}">
      {%- render 'icon' with 'phone' -%}
      {{ settings.footer_phone }}
    </a>
  {%- endif -%}

  {%- if settings.footer_email != blank -%}
    <a href="mailto:{{ settings.footer_email }}">
      {%- render 'icon' with 'email' -%}
      {{ settings.footer_email }}
    </a>
  {%- endif -%}

  {%- if settings.footer_business_hours != blank -%}
    <span>
      {%- render 'icon' with 'clock' -%}
      {{ settings.footer_business_hours }}
    </span>
  {%- endif -%}
</div>
```

---

# PARTE 4: TIPOS DE CAMPOS DO SCHEMA

## Referencia Rapida de Tipos

| Tipo | Uso | Exemplo de ID |
|------|-----|---------------|
| `text` | Texto simples | titulo, subtitulo |
| `textarea` | Texto longo | descricao, bio |
| `checkbox` | Liga/Desliga | ativar, mostrar |
| `range` | Slider numerico | tamanho, espacamento |
| `select` | Dropdown | estilo, alinhamento |
| `color` | Seletor de cor | cor_fundo, cor_texto |
| `url` | Link | link_botao, link_externo |
| `image_picker` | Imagem | imagem, banner |
| `video` | Video Shopify | video_fundo |
| `video_url` | YouTube/Vimeo | video_externo |
| `product` | Produto | produto_destaque |
| `collection` | Colecao | colecao_principal |
| `header` | Separador visual | - |

## Exemplos de Cada Tipo

### Texto Simples
```json
{
  "type": "text",
  "id": "titulo",
  "label": "Titulo",
  "default": "Meu titulo"
}
```

### Textarea (Texto Longo)
```json
{
  "type": "textarea",
  "id": "descricao",
  "label": "Descricao"
}
```

### Checkbox (Booleano)
```json
{
  "type": "checkbox",
  "id": "ativar",
  "label": "Ativar recurso",
  "default": false
}
```

### Range (Slider Numerico)
```json
{
  "type": "range",
  "id": "tamanho",
  "min": 0,
  "max": 100,
  "step": 5,
  "unit": "px",
  "label": "Tamanho",
  "default": 50
}
```

### Select (Dropdown)
```json
{
  "type": "select",
  "id": "estilo",
  "label": "Estilo",
  "options": [
    { "value": "opcao1", "label": "Opcao 1" },
    { "value": "opcao2", "label": "Opcao 2" }
  ],
  "default": "opcao1"
}
```

### Color (Cor)
```json
{
  "type": "color",
  "id": "cor",
  "label": "Cor",
  "default": "#000000"
}
```

### Color Transparente
```json
{
  "type": "color",
  "id": "cor",
  "label": "Cor",
  "default": "rgba(0,0,0,0)"
}
```

### URL/Link
```json
{
  "type": "url",
  "id": "link",
  "label": "Link"
}
```

### Image Picker
```json
{
  "type": "image_picker",
  "id": "imagem",
  "label": "Imagem"
}
```

### Video (Hospedado Shopify)
```json
{
  "type": "video",
  "id": "video",
  "label": "Video"
}
```

### Video Externo (YouTube/Vimeo)
```json
{
  "type": "video_url",
  "id": "video_url",
  "accept": ["youtube", "vimeo"],
  "label": "URL do video"
}
```

### Produto
```json
{
  "type": "product",
  "id": "produto",
  "label": "Produto"
}
```

### Colecao
```json
{
  "type": "collection",
  "id": "colecao",
  "label": "Colecao"
}
```

### Header (Separador)
```json
{
  "type": "header",
  "content": "Nome da Categoria"
}
```

### Campo com Info (Ajuda)
```json
{
  "type": "text",
  "id": "campo",
  "label": "Campo",
  "info": "Texto de ajuda aqui"
}
```

## Regra Critica do Range

O valor `default` DEVE ser um valor valido no intervalo definido por min, max e step:

**CORRETO** - 50 esta no intervalo (0, 10, 20, 30, 40, 50...):
```json
{ "min": 0, "max": 100, "step": 10, "default": 50 }
```

**ERRADO** - 55 nao esta no intervalo:
```json
{ "min": 0, "max": 100, "step": 10, "default": 55 }
```

---

# PARTE 5: CSS DINAMICO COM LIQUID

## Regra de Ouro: Sempre Usar Escopo

```liquid
<style>
  #shopify-section-{{ section.id }} .elemento {
    /* seus estilos aqui */
  }
</style>
```

## Valor Direto

```liquid
#shopify-section-{{ section.id }} .elemento {
  padding: {{ section.settings.espacamento }}px;
  font-size: {{ section.settings.tamanho }}px;
  border-radius: {{ section.settings.arredondamento }}px;
}
```

## Cor com Fallback para Global

```liquid
{%- comment -%} PADRAO RECOMENDADO: fallback para configuracao global {%- endcomment -%}
{%- if section.settings.cor_fundo != blank -%}
  {%- assign bg_color = section.settings.cor_fundo -%}
{%- else -%}
  {%- assign bg_color = settings.background -%}
{%- endif -%}

{%- if section.settings.cor_texto != blank -%}
  {%- assign text_color = section.settings.cor_texto -%}
{%- else -%}
  {%- assign text_color = settings.text_color -%}
{%- endif -%}

#shopify-section-{{ section.id }} .elemento {
  background: {{ bg_color }};
  color: {{ text_color }};
}
```

## Usando Variaveis CSS Globais (RECOMENDADO)

```liquid
#shopify-section-{{ section.id }} .elemento {
  {%- comment -%} Usa variaveis CSS ja definidas pelo tema {%- endcomment -%}
  background: rgb(var(--background));
  color: rgb(var(--text-color));
}

#shopify-section-{{ section.id }} .titulo {
  color: rgb(var(--heading-color));
}

#shopify-section-{{ section.id }} .botao {
  background: rgb(var(--primary-button-background));
  color: rgb(var(--primary-button-text-color));
}
```

## Cor com Opacidade (RGBA)

```liquid
#shopify-section-{{ section.id }} .elemento {
  background: rgba(
    {{ section.settings.cor.red }},
    {{ section.settings.cor.green }},
    {{ section.settings.cor.blue }},
    0.5
  );
}
```

## Condicional IF

```liquid
{%- if section.settings.ativar_sombra -%}
  #shopify-section-{{ section.id }} .elemento {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
{%- endif -%}
```

## Condicional CASE/WHEN

```liquid
{%- case section.settings.tamanho -%}
  {%- when 'pequeno' -%}
    #shopify-section-{{ section.id }} .elemento { padding: 10px; }
  {%- when 'medio' -%}
    #shopify-section-{{ section.id }} .elemento { padding: 20px; }
  {%- when 'grande' -%}
    #shopify-section-{{ section.id }} .elemento { padding: 40px; }
{%- endcase -%}
```

## Media Query (Responsivo)

```liquid
@media screen and (max-width: 749px) {
  #shopify-section-{{ section.id }} .elemento {
    font-size: {{ section.settings.tamanho_mobile }}px;
  }

  {%- if section.settings.ocultar_mobile -%}
    #shopify-section-{{ section.id }} {
      display: none;
    }
  {%- endif -%}
}
```

---

# PARTE 6: HTML DINAMICO COM LIQUID

## Texto Simples

```liquid
<h1>{{ section.settings.titulo }}</h1>
<p>{{ section.settings.descricao }}</p>
```

## Com Escape (Seguranca)

```liquid
<h1>{{ section.settings.titulo | escape }}</h1>
```

## Condicional para Evitar Vazio

```liquid
{%- if section.settings.titulo != blank -%}
  <h1>{{ section.settings.titulo }}</h1>
{%- endif -%}
```

## Link/Botao

```liquid
{%- if section.settings.link != blank -%}
  <a href="{{ section.settings.link }}">
    {{ section.settings.texto_botao }}
  </a>
{%- endif -%}
```

## Imagem (com width/height OBRIGATORIOS)

```liquid
{%- if section.settings.imagem != blank -%}
  <img
    src="{{ section.settings.imagem | image_url: width: 800 }}"
    alt="{{ section.settings.imagem.alt | escape }}"
    width="{{ section.settings.imagem.width }}"
    height="{{ section.settings.imagem.height }}"
    loading="lazy"
  >
{%- endif -%}
```

## Video Shopify

```liquid
{%- if section.settings.video != blank -%}
  <video
    playsinline
    {% if section.settings.autoplay %}autoplay muted loop{% endif %}
    {% if section.settings.controles %}controls{% endif %}
    poster="{{ section.settings.video.preview_image | image_url: width: 1920 }}"
  >
    {%- for source in section.settings.video.sources -%}
      <source src="{{ source.url }}" type="{{ source.mime_type }}">
    {%- endfor -%}
  </video>
{%- endif -%}
```

## Produto

```liquid
{%- assign produto = section.settings.produto -%}
{%- if produto != blank -%}
  <div class="produto">
    <img
      src="{{ produto.featured_image | image_url: width: 400 }}"
      alt="{{ produto.title | escape }}"
      width="400"
      height="400"
    >
    <h3>{{ produto.title }}</h3>
    <p>{{ produto.price | money }}</p>
    <a href="{{ produto.url }}">Ver produto</a>
  </div>
{%- endif -%}
```

## Estilo Inline Dinamico

```liquid
<div style="
  padding: {{ section.settings.espacamento }}px;
  background: {{ section.settings.cor_fundo }};
">
  Conteudo
</div>
```

---

# PARTE 7: JAVASCRIPT COM LIQUID

## Estrutura Base

```liquid
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const section = document.getElementById('shopify-section-{{ section.id }}');
    if (!section) return;

    // Seu codigo aqui
  });
</script>
```

## Codigo Condicional

```liquid
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const section = document.getElementById('shopify-section-{{ section.id }}');
    if (!section) return;

    {%- if section.settings.ativar_animacao -%}
    // Este codigo so sera incluido se a opcao estiver ativada
    const elemento = section.querySelector('.meu-elemento');
    elemento.classList.add('animado');
    {%- endif -%}
  });
</script>
```

## Passar Valores Liquid para JS

```liquid
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const section = document.getElementById('shopify-section-{{ section.id }}');
    if (!section) return;

    const config = {
      duracao: {{ section.settings.duracao }},
      ativar: {{ section.settings.ativar | json }},
      texto: {{ section.settings.texto | json }}
    };

    console.log(config);
  });
</script>
```

---

# PARTE 8: BLOCKS (ELEMENTOS REPETIVEIES)

## Schema de Blocks

```json
"blocks": [
  {
    "type": "item",
    "name": "Item",
    "settings": [
      {
        "type": "text",
        "id": "titulo",
        "label": "Titulo"
      },
      {
        "type": "image_picker",
        "id": "imagem",
        "label": "Imagem"
      }
    ]
  }
]
```

## Renderizando Blocks no HTML

```liquid
{%- for block in section.blocks -%}
  {%- if block.type == 'item' -%}
    <div class="item" {{ block.shopify_attributes }}>
      {%- if block.settings.imagem != blank -%}
        <img
          src="{{ block.settings.imagem | image_url: width: 400 }}"
          alt="{{ block.settings.titulo | escape }}"
          width="{{ block.settings.imagem.width }}"
          height="{{ block.settings.imagem.height }}"
        >
      {%- endif -%}
      <h3>{{ block.settings.titulo }}</h3>
    </div>
  {%- endif -%}
{%- endfor -%}
```

## Atributos Importantes

| Atributo | Uso |
|----------|-----|
| `block.type` | Tipo do block para condicionais |
| `block.settings.X` | Acessar configuracao X do block |
| `block.shopify_attributes` | OBRIGATORIO para editor visual funcionar |

---

# PARTE 9: TEMPLATE COMPLETO COM CONFIGURACOES GLOBAIS

```liquid
{%- comment -%}
  Secao: Nome da Secao
  Descricao: Template usando configuracoes globais do tema
  Autor: Seu Nome
  Versao: 2.0.0

  IMPORTANTE: Esta section usa configuracoes globais do tema quando possivel
  para manter consistencia e evitar duplicacao.
{%- endcomment -%}

{%- liquid
  comment
    Fallback para cores: usa section.settings se definido, senao usa global
  endcomment
  if section.settings.cor_fundo != blank
    assign cor_fundo = section.settings.cor_fundo
  else
    assign cor_fundo = settings.background
  endif

  if section.settings.cor_texto != blank
    assign cor_texto = section.settings.cor_texto
  else
    assign cor_texto = settings.text_color
  endif

  if section.settings.cor_titulo != blank
    assign cor_titulo = section.settings.cor_titulo
  else
    assign cor_titulo = settings.heading_color
  endif

  assign titulo = section.settings.titulo
  assign mostrar_botao = section.settings.mostrar_botao
  assign mostrar_social = section.settings.mostrar_social
  assign mostrar_whatsapp = section.settings.mostrar_whatsapp
-%}

<style>
  #shopify-section-{{ section.id }} {
    padding-top: {{ section.settings.padding_top }}px;
    padding-bottom: {{ section.settings.padding_bottom }}px;
    background: {{ cor_fundo }};
    color: {{ cor_texto }};
  }

  #shopify-section-{{ section.id }} .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  #shopify-section-{{ section.id }} .titulo {
    font-size: {{ section.settings.tamanho_titulo }}px;
    color: {{ cor_titulo }};
    text-align: {{ section.settings.alinhamento }};
  }

  {%- comment -%} Usar variaveis CSS globais para botoes {%- endcomment -%}
  #shopify-section-{{ section.id }} .botao {
    display: inline-block;
    padding: 12px 24px;
    background: rgb(var(--primary-button-background));
    color: rgb(var(--primary-button-text-color));
    text-decoration: none;
    border-radius: 4px;
    transition: opacity 0.3s;
  }

  #shopify-section-{{ section.id }} .botao:hover {
    opacity: 0.9;
  }

  {%- comment -%} Estilos para icones sociais {%- endcomment -%}
  #shopify-section-{{ section.id }} .social-icons {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  #shopify-section-{{ section.id }} .social-icons a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: {{ cor_texto }};
    transition: color 0.2s ease, transform 0.2s ease;
  }

  #shopify-section-{{ section.id }} .social-icons a:hover {
    color: rgb(var(--primary-button-background));
    transform: scale(1.1);
  }

  #shopify-section-{{ section.id }} .social-icons svg {
    width: 20px;
    height: 20px;
  }

  {%- comment -%} Botao WhatsApp {%- endcomment -%}
  #shopify-section-{{ section.id }} .whatsapp-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #25D366;
    color: #fff;
    border-radius: 25px;
    text-decoration: none;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  #shopify-section-{{ section.id }} .whatsapp-btn:hover {
    background: #128C7E;
  }

  #shopify-section-{{ section.id }} .whatsapp-btn svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  @media screen and (max-width: 749px) {
    #shopify-section-{{ section.id }} .titulo {
      font-size: {{ section.settings.tamanho_titulo | times: 0.8 }}px;
    }
  }
</style>

<section class="minha-secao">
  <div class="container">
    {%- if titulo != blank -%}
      <h2 class="titulo">{{ titulo | escape }}</h2>
    {%- endif -%}

    {%- for block in section.blocks -%}
      <div class="item" {{ block.shopify_attributes }}>
        {%- if block.settings.imagem != blank -%}
          <img
            src="{{ block.settings.imagem | image_url: width: 600 }}"
            alt="{{ block.settings.titulo | escape }}"
            width="{{ block.settings.imagem.width }}"
            height="{{ block.settings.imagem.height }}"
            loading="lazy"
          >
        {%- endif -%}
        <h3>{{ block.settings.titulo }}</h3>
      </div>
    {%- endfor -%}

    {%- if mostrar_botao and section.settings.texto_botao != blank -%}
      <a href="{{ section.settings.link_botao }}" class="botao">
        {{ section.settings.texto_botao }}
      </a>
    {%- endif -%}

    {%- comment -%}[REDES SOCIAIS] Usando configuracoes globais do tema{%- endcomment -%}
    {%- if mostrar_social -%}
      <div class="social-icons">
        {%- if settings.social_facebook != blank -%}
          <a href="{{ settings.social_facebook }}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            {%- render 'icon' with 'facebook' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_instagram != blank -%}
          <a href="{{ settings.social_instagram }}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            {%- render 'icon' with 'instagram' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_twitter != blank -%}
          <a href="{{ settings.social_twitter }}" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
            {%- render 'icon' with 'twitter' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_youtube != blank -%}
          <a href="{{ settings.social_youtube }}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            {%- render 'icon' with 'youtube' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_tiktok != blank -%}
          <a href="{{ settings.social_tiktok }}" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            {%- render 'icon' with 'tiktok' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_linkedin != blank -%}
          <a href="{{ settings.social_linkedin }}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            {%- render 'icon' with 'linkedin' -%}
          </a>
        {%- endif -%}
        {%- if settings.social_pinterest != blank -%}
          <a href="{{ settings.social_pinterest }}" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
            {%- render 'icon' with 'pinterest' -%}
          </a>
        {%- endif -%}
      </div>
    {%- endif -%}

    {%- comment -%}[WHATSAPP] Usando numero das configuracoes globais{%- endcomment -%}
    {%- if mostrar_whatsapp and settings.whats_num_sticky != blank -%}
      {%- assign whatsapp_clean = settings.whats_num_sticky | remove: ' ' | remove: '-' | remove: '(' | remove: ')' | remove: '+' -%}
      <a href="https://wa.me/{{ whatsapp_clean }}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" aria-label="WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span>{{ section.settings.whatsapp_text | default: 'Fale conosco' }}</span>
      </a>
    {%- endif -%}
  </div>
</section>

{% schema %}
{
  "name": "Minha Secao",
  "tag": "section",
  "class": "minha-secao-wrapper",
  "settings": [
    {
      "type": "header",
      "content": "Conteudo"
    },
    {
      "type": "text",
      "id": "titulo",
      "label": "Titulo",
      "default": "Titulo da Secao"
    },
    {
      "type": "header",
      "content": "Estilo"
    },
    {
      "type": "range",
      "id": "tamanho_titulo",
      "min": 16,
      "max": 48,
      "step": 2,
      "unit": "px",
      "label": "Tamanho do titulo",
      "default": 32
    },
    {
      "type": "select",
      "id": "alinhamento",
      "label": "Alinhamento",
      "options": [
        { "value": "left", "label": "Esquerda" },
        { "value": "center", "label": "Centro" },
        { "value": "right", "label": "Direita" }
      ],
      "default": "center"
    },
    {
      "type": "header",
      "content": "Cores (Opcional)",
      "info": "Deixe vazio para usar as cores padrão do tema"
    },
    {
      "type": "color",
      "id": "cor_fundo",
      "label": "Cor de fundo",
      "info": "Sobrescreve a cor de fundo do tema"
    },
    {
      "type": "color",
      "id": "cor_texto",
      "label": "Cor do texto",
      "info": "Sobrescreve a cor do texto do tema"
    },
    {
      "type": "color",
      "id": "cor_titulo",
      "label": "Cor do titulo",
      "info": "Sobrescreve a cor de titulo do tema"
    },
    {
      "type": "header",
      "content": "Espacamento"
    },
    {
      "type": "range",
      "id": "padding_top",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Espacamento superior",
      "default": 40
    },
    {
      "type": "range",
      "id": "padding_bottom",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Espacamento inferior",
      "default": 40
    },
    {
      "type": "header",
      "content": "Botao de Acao"
    },
    {
      "type": "checkbox",
      "id": "mostrar_botao",
      "label": "Mostrar botao",
      "default": false
    },
    {
      "type": "text",
      "id": "texto_botao",
      "label": "Texto do botao",
      "default": "Ver mais"
    },
    {
      "type": "url",
      "id": "link_botao",
      "label": "Link do botao"
    },
    {
      "type": "header",
      "content": "Redes Sociais"
    },
    {
      "type": "checkbox",
      "id": "mostrar_social",
      "label": "Mostrar icones de redes sociais",
      "info": "Os links sao configurados em Configuracoes do Tema > Redes Sociais",
      "default": false
    },
    {
      "type": "header",
      "content": "WhatsApp"
    },
    {
      "type": "checkbox",
      "id": "mostrar_whatsapp",
      "label": "Mostrar botao WhatsApp",
      "info": "O numero e configurado em Configuracoes do Tema > WhatsApp Flutuante",
      "default": false
    },
    {
      "type": "text",
      "id": "whatsapp_text",
      "label": "Texto do botao WhatsApp",
      "default": "Fale conosco"
    }
  ],
  "blocks": [
    {
      "type": "item",
      "name": "Item",
      "settings": [
        {
          "type": "image_picker",
          "id": "imagem",
          "label": "Imagem"
        },
        {
          "type": "text",
          "id": "titulo",
          "label": "Titulo",
          "default": "Titulo do item"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Minha Secao"
    }
  ]
}
{% endschema %}
```

---

# PARTE 10: CHECKLIST DE VALIDACAO

## Antes de Salvar, Verifique

### Configuracoes Globais
- [ ] Usando `settings.X` para cores quando possivel
- [ ] Usando `settings.X` para redes sociais (nao duplicando)
- [ ] Usando `settings.whats_num_sticky` para WhatsApp
- [ ] Usando variaveis CSS globais (`var(--X)`)
- [ ] Fallbacks implementados quando section.settings pode estar vazio

### Imagens
- [ ] Todas as `<img>` tem `width` e `height`
- [ ] Usando `loading="lazy"` para performance
- [ ] Alt text com `| escape` para seguranca

### CSS
- [ ] Usando `#shopify-section-{{ section.id }}` como escopo
- [ ] Nao ha estilos globais que vazam para outras secoes
- [ ] Usando variaveis CSS globais do tema quando possivel

### Schema
- [ ] Valores `default` de range sao multiplos validos de `step`
- [ ] Labels estao traduzidos para pt-BR
- [ ] Headers organizam grupos de configuracoes
- [ ] Campos com `info` explicam quando usar configs globais

### HTML
- [ ] Textos usam `| escape` para seguranca
- [ ] Condicionais verificam `!= blank` antes de usar valores
- [ ] Blocks usam `{{ block.shopify_attributes }}`
- [ ] Links externos tem `target="_blank" rel="noopener noreferrer"`

### JavaScript
- [ ] Verifica se section existe antes de manipular
- [ ] Usa `{{ section.id }}` para escopo
- [ ] Valores Liquid usam `| json` quando necessario

---

# PARTE 11: ANTI-PATTERNS (O QUE NAO FAZER)

## Erros Comuns a Evitar

### 1. Duplicar Configuracao de WhatsApp

```liquid
{%- comment -%} ERRADO - Duplicando config que ja existe no tema {%- endcomment -%}
{% schema %}
{
  "settings": [
    {
      "type": "text",
      "id": "whatsapp_number",
      "label": "Numero do WhatsApp"
    }
  ]
}
{% endschema %}

{%- comment -%} CORRETO - Usar config global {%- endcomment -%}
{% schema %}
{
  "settings": [
    {
      "type": "checkbox",
      "id": "show_whatsapp",
      "label": "Mostrar WhatsApp",
      "info": "Configure o numero em Configuracoes do Tema > WhatsApp Flutuante"
    }
  ]
}
{% endschema %}
```

### 2. Duplicar Links de Redes Sociais

```liquid
{%- comment -%} ERRADO - Cada section com seus proprios links {%- endcomment -%}
{% schema %}
{
  "settings": [
    {
      "type": "text",
      "id": "facebook_url",
      "label": "Facebook URL"
    },
    {
      "type": "text",
      "id": "instagram_url",
      "label": "Instagram URL"
    }
  ]
}
{% endschema %}

{%- comment -%} CORRETO - Usar configs globais {%- endcomment -%}
{%- if settings.social_facebook != blank -%}
  <a href="{{ settings.social_facebook }}">Facebook</a>
{%- endif -%}
```

### 3. Ignorar Variaveis CSS Globais

```liquid
{%- comment -%} ERRADO - Cores hardcoded {%- endcomment -%}
.botao {
  background: #000;
  color: #fff;
}

{%- comment -%} CORRETO - Usar variaveis do tema {%- endcomment -%}
.botao {
  background: rgb(var(--primary-button-background));
  color: rgb(var(--primary-button-text-color));
}
```

### 4. Nao Implementar Fallbacks

```liquid
{%- comment -%} ERRADO - Sem fallback {%- endcomment -%}
background: {{ section.settings.cor_fundo }};

{%- comment -%} CORRETO - Com fallback para global {%- endcomment -%}
{%- if section.settings.cor_fundo != blank -%}
  background: {{ section.settings.cor_fundo }};
{%- else -%}
  background: rgb(var(--background));
{%- endif -%}
```

---

# PARTE 12: RESUMO - QUANDO USAR O QUE

| Tipo de Configuracao | Usar Config Global | Usar Section Setting |
|---------------------|-------------------|---------------------|
| Cores principais | Sim | Apenas para override opcional |
| Fontes | Sim | Raramente |
| WhatsApp numero | Sim | Nunca |
| Redes sociais links | Sim | Nunca |
| Telefone/Email empresa | Sim | Nunca |
| Textos especificos | Nao | Sim |
| Layout da section | Nao | Sim |
| Espacamento | Nao | Sim |
| Visibilidade de elementos | Nao | Sim (checkbox) |
| Animacoes | Nao | Sim |

---

**Documento Criado**: 2025-12-22
**Ultima Atualizacao**: 2025-12-22
**Versao**: 2.0.0
**Fonte Original**: Guia Shopify Liquid Sections + Best Practices

---

**FIM DO DOCUMENTO**
