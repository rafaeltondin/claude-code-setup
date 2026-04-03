# FIBER — Documentação de Template de Email

> Referência completa para criação de emails marketing da Fiber Oficial.
> Baseado no template `fiber-email-maxis.html` (arquivo referência em `C:/Users/sabola/Desktop/`).
> Atualizado em: 2026-03-04

---

## 1. VISÃO GERAL

- **Largura:** 620px (outer table), fundo externo `#0a0a0a`
- **Estrutura:** Table-based (compatível com Outlook, Gmail, Apple Mail)
- **Fontes:** Montserrat + Poppins (Google Fonts via `<link>`, não `@import`)
- **Paleta:** Dark theme com acento vermelho
- **Arquivo de referência:** `C:/Users/sabola/Desktop/fiber-email-maxis.html`

---

## 2. PALETA DE CORES

| Nome | Hex | Uso |
|------|-----|-----|
| Vermelho Fiber | `#d71f3f` | Cor principal — CTAs, badges, destaques, barras top/bottom |
| Vermelho borda | `#e84060` | Borda entre stats (versão mais clara do vermelho) |
| Preto fundo externo | `#0a0a0a` | Background do body/wrapper externo |
| Preto header/hero/footer | `#000000` | Header, hero, footer, oferta |
| Cinza escuro corpo | `#111111` | Background padrão do email |
| Cinza card | `#1a1a1a` | Seções com cards, testimoniais |
| Cinza seção dark | `#0d0d0d` | Seções alternadas (ex: comparativo) |
| Cinza card ativo | `#1a0a0f` | Card em destaque no comparativo |
| Branco | `#ffffff` | Títulos, logos, textos principais |
| Cinza claro texto | `#dadada` | Subtítulos, textos de depoimentos |
| Cinza médio | `#9a9a9a` | Textos secundários, descrições |
| Cinza escuro texto | `#6a6a6a` | Detalhes, autores, preços secundários |
| Cinza footer | `#aaaaaa` | Endereço, tagline do footer |
| Cinza links footer | `#cccccc` | Links legais |
| Cinza legal | `#666666` | Texto legal (unsubscribe) |
| Cinza divider | `#2a2a2a` | Linhas divisórias |
| Cinza border | `#222222` | Bordas de seções |
| Cinza card escuro | `#333333` | Borda dos botões sociais |
| Cinza card btn | `#2a2a2a` | Badge secundário |
| Vermelho stats | `#ffcccc` | Labels nos stats strip (vermelho muito claro) |

---

## 3. TIPOGRAFIA

| Fonte | Pesos | Uso |
|-------|-------|-----|
| Montserrat | 400, 600, 700, 800, 900 | Títulos, badges, logos, botões, labels uppercase |
| Poppins | 300, 400, 500, 600 | Textos corridos, descrições, subtítulos, rodapé |
| Fallback | Arial, sans-serif | Para clientes que bloqueiam Google Fonts |

### Tamanhos de fonte

| Elemento | Tamanho | Peso |
|----------|---------|------|
| Logo header | 26px | 900 |
| Hero title | 38px (mobile: 28px) | 900 |
| Section title | 28px | 800 |
| Offer title | 32px (mobile: 24px) | 900 |
| Offer price | 44px (mobile: 34px) | 900 |
| Compare name | 16px | 800 |
| Compare price | 22px | 900 |
| Stat number | 22px | 900 |
| Footer logo | 18px | 900 |
| Hero subtitle | 15px | 300 |
| Section desc | 14px | 400 |
| Testimonial text | 14px | 400 |
| Feature name | 13px | 700 |
| Feature desc | 13px | 400 |
| Hero btn | 13px | 800 |
| Offer btn | 14px | 800 |
| Compare feature | 12px | 400 |
| Testimonial author | 12px | 700 |
| Footer link | 11px | 400 |
| Social link | 11px | 700 |
| Footer tagline | 11px | 400 |
| Testimonial detail | 11px | 400 |
| Section tag / badges | 10px | 700 |
| Stat label | 10px | 400 |
| Footer legal | 10px | 400 |

### Letter-spacing padrão (uppercase)

| Elemento | Letter-spacing |
|----------|---------------|
| Logo header | 6px |
| Footer logo | 6px |
| Header tagline | 3px |
| Section tag | 3px |
| Hero badge | 2px |
| Botões CTA | 2px |
| Stat label | 1px |
| Footer tagline | 2px |

---

## 4. ESTRUTURA GERAL DO EMAIL

```
DOCTYPE html
<html xmlns:v xmlns:o>
<head>
  meta charset, viewport, X-UA-Compatible, format-detection
  <link> Google Fonts (Montserrat + Poppins)
  <!--[if mso]--> OfficeDocumentSettings
  <style> reset + classes + @media
</head>
<body>
  <!-- PREHEADER (oculto) -->
  <!-- OUTER TABLE (width=100%, bgcolor=#0a0a0a) -->
    <!-- INNER TABLE (width=620, bgcolor=#111111) -->
      TOP BAR (3px, #d71f3f)     ← FIXO
      HEADER                      ← FIXO
      [SEÇÕES DE CONTEÚDO]        ← variável por email
      FOOTER                      ← FIXO
      BOTTOM BAR (3px, #d71f3f)  ← FIXO
```

---

## 5. REGRAS TÉCNICAS DE COMPATIBILIDADE (OBRIGATÓRIAS)

### O que NUNCA usar em email HTML

| Proibido | Motivo | Alternativa |
|----------|--------|-------------|
| `@import` CSS | Não funciona no Gmail | `<link rel="stylesheet">` no `<head>` |
| `:root` / CSS variables / `var()` | Sem suporte em clientes de email | Valores literais diretos |
| `position: relative/absolute` | Outlook ignora | Layout com tabelas |
| `margin-top` negativo | Não renderiza no Outlook | Separar em rows distintos |
| `linear-gradient` | Sem suporte no Outlook | Cor sólida de fundo |
| `calc()` | Não suportado | Tabelas com `width` fixo em px |
| `opacity` | Sem suporte no Outlook | Cor sólida equivalente |
| `rgba()` em border | Sem suporte no Outlook | Cor hex sólida |
| `<hr>` estilizado | Renderização inconsistente | `<table><tr><td height="1" bgcolor="...">` |
| `<ul>/<li>` com `list-style:none` | Outlook não respeita o reset | `<p>` com classes explícitas |
| `display: flex` / `grid` | Sem suporte em email | Tabelas |
| `display: inline-block` em botões largos | Quebra no Outlook | `<table>` envolvendo o `<a>` |
| `overflow: hidden` | Não tem efeito | Não usar |
| Pseudo-seletores `:last-child`, `:nth-child` | Gmail/Outlook ignoram | Classes explícitas (`-last`) |
| JavaScript | Bloqueado por todos | Não usar |

### O que SEMPRE usar

- `role="presentation"` em todas as tabelas de layout
- `bgcolor` attribute nos `<td>` além do CSS `background-color` (Outlook fallback)
- `border="0" cellspacing="0" cellpadding="0"` em todas as tabelas
- `width` attribute nas imagens além do CSS
- `target="_blank"` em todos os links externos
- `alt` text em todas as imagens
- Estilos inline nos elementos críticos (além das classes no `<style>`)
- Entidades HTML para caracteres especiais: `&#36;` (R$), `&#9733;` (★), `&middot;` (·), `&#8212;` (—), `&rarr;` (→), `&zwnj;` (zero-width non-joiner)

---

## 6. PREHEADER (OBRIGATÓRIO)

Texto oculto que aparece como preview do inbox. Deve estar logo após `<body>`, antes de qualquer tabela.

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#0a0a0a;line-height:1px;">
  [TEXTO DO PREHEADER — 85 a 100 caracteres]&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;
</div>
```

> Os `&zwnj;` impedem que o cliente de email complete o preheader com texto do corpo do email.

---

## 7. CABEÇALHO FIXO (COPIAR IDÊNTICO)

```html
<!-- TOP BAR -->
<tr>
  <td bgcolor="#d71f3f" height="3" style="background-color:#d71f3f;font-size:0;line-height:0;">&nbsp;</td>
</tr>

<!-- HEADER -->
<tr>
  <td bgcolor="#000000" align="center" style="padding:20px 40px;text-align:center;border-bottom:1px solid #222222;">
    <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:26px;font-weight:900;letter-spacing:6px;text-decoration:none;text-transform:uppercase;display:block;">FIBER</span>
    <span style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;display:block;">Performance · Tecnologia · Movimento</span>
  </td>
</tr>
```

---

## 8. RODAPÉ FIXO (COPIAR IDÊNTICO)

```html
<!-- FOOTER -->
<tr>
  <td bgcolor="#000000" align="center" style="background-color:#000000;border-top:3px solid #d71f3f;padding:40px 40px 30px;text-align:center;">

    <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:6px;text-transform:uppercase;margin:0 0 6px;display:block;">FIBER</span>
    <span style="color:#aaaaaa;font-family:'Poppins',Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px;display:block;">Performance &middot; Tecnologia &middot; Movimento</span>

    <!-- Redes sociais -->
    <div style="margin-bottom:24px;">
      <a href="https://www.instagram.com/fiber.oficial/" target="_blank"
         style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">Instagram</a>
      <a href="https://www.tiktok.com/@fiber.oficial" target="_blank"
         style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">TikTok</a>
      <a href="https://www.youtube.com/channel/UCwtyPzb8KMAaib8yDR8XlEw" target="_blank"
         style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">YouTube</a>
    </div>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 24px;">
      <tr><td height="1" bgcolor="#2a2a2a" style="background-color:#2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Endereço -->
    <p style="color:#aaaaaa;font-family:'Poppins',Arial,sans-serif;font-size:11px;line-height:1.7;margin:0 0 16px;">
      <strong style="color:#ffffff;">FIBER &#8212; Fiber Knit Sport</strong><br>
      Almirante Barroso, 240 &#8212; Campo Bom, RS &middot; Brasil<br>
      Atendimento: <a href="mailto:sac@fiber.com.br" style="color:#aaaaaa;text-decoration:underline;">sac@fiber.com.br</a>
    </p>

    <!-- Links legais -->
    <p style="margin:0 0 16px;">
      <a href="https://fiberoficial.com.br/policies/privacy-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Privacidade</a>
      <a href="https://fiberoficial.com.br/policies/terms-of-service" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Termos</a>
      <a href="https://fiberoficial.com.br/policies/shipping-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Entrega</a>
      <a href="https://fiberoficial.com.br/policies/refund-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Trocas</a>
    </p>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 20px;">
      <tr><td height="1" bgcolor="#2a2a2a" style="background-color:#2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- Legal / Unsubscribe -->
    <p style="color:#666666;font-family:'Poppins',Arial,sans-serif;font-size:10px;line-height:1.6;margin:0;">
      Você está recebendo este e-mail porque se cadastrou em<br>
      <a href="https://fiberoficial.com.br" style="color:#999999;text-decoration:underline;">fiberoficial.com.br</a> ou realizou uma compra em nossa loja.<br><br>
      Não quer mais receber nossas comunicações?<br>
      <a href="{{unsubscribe_url}}" style="color:#999999;text-decoration:underline;">Cancelar inscrição</a>
      &nbsp;&middot;&nbsp;
      <a href="{{preferences_url}}" style="color:#999999;text-decoration:underline;">Gerenciar preferências</a>
    </p>
  </td>
</tr>

<!-- BOTTOM BAR -->
<tr>
  <td bgcolor="#d71f3f" height="3" style="background-color:#d71f3f;font-size:0;line-height:0;">&nbsp;</td>
</tr>
```

---

## 9. BLOCOS DE CONTEÚDO (SEÇÕES REUTILIZÁVEIS)

### 9.1 Hero — Imagem + Texto

```html
<!-- IMAGEM HERO (clicável) -->
<tr>
  <td bgcolor="#000000" style="padding:0;background-color:#000000;">
    <a href="[URL_PRODUTO]" target="_blank" style="display:block;">
      <img src="[URL_IMAGEM]" alt="[ALT]" width="620"
           style="width:100%;max-width:620px;height:auto;display:block;">
    </a>
  </td>
</tr>

<!-- TEXTO HERO -->
<tr>
  <td bgcolor="#000000" style="padding:40px 40px 50px;background-color:#000000;">
    <span style="display:inline-block;background-color:#d71f3f;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 12px;margin-bottom:16px;">[BADGE]</span>
    <h1 style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:38px;font-weight:900;line-height:1.1;margin:0 0 12px;text-transform:uppercase;">
      [TÍTULO]<br><span style="color:#d71f3f;">[DESTAQUE]</span>
    </h1>
    <p style="color:#dadada;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:300;line-height:1.6;margin:0 0 28px;">
      [SUBTÍTULO]
    </p>
    <!-- CTA via tabela -->
    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td bgcolor="#d71f3f" style="background-color:#d71f3f;">
          <a href="[URL]" target="_blank"
             style="display:inline-block;background-color:#d71f3f;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 36px;">
            [TEXTO CTA] &rarr;
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

---

### 9.2 Stats Strip (faixa vermelha com 3 números)

```html
<tr>
  <td bgcolor="#d71f3f" style="background-color:#d71f3f;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td width="33%" align="center" style="text-align:center;padding:18px 10px;border-right:1px solid #e84060;">
          <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:22px;font-weight:900;display:block;">[VALOR1]</span>
          <span style="color:#ffcccc;font-family:'Poppins',Arial,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;display:block;">[LABEL1]</span>
        </td>
        <td width="33%" align="center" style="text-align:center;padding:18px 10px;border-right:1px solid #e84060;">
          <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:22px;font-weight:900;display:block;">[VALOR2]</span>
          <span style="color:#ffcccc;font-family:'Poppins',Arial,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;display:block;">[LABEL2]</span>
        </td>
        <td width="34%" align="center" style="text-align:center;padding:18px 10px;">
          <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:22px;font-weight:900;display:block;">[VALOR3]</span>
          <span style="color:#ffcccc;font-family:'Poppins',Arial,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;display:block;">[LABEL3]</span>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

> ⚠️ O último `<td>` **não** tem `border-right`. Use classes explícitas — sem `:last-child`.

---

### 9.3 Seção de Texto Padrão

```html
<tr>
  <td bgcolor="#1a1a1a" style="padding:50px 40px;background-color:#1a1a1a;">
    <p style="color:#d71f3f;font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">[TAG]</p>
    <h2 style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:28px;font-weight:800;line-height:1.2;text-transform:uppercase;margin:0 0 8px;">
      [TÍTULO] <span style="color:#d71f3f;">[DESTAQUE]</span>
    </h2>
    <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:14px;line-height:1.7;margin:0 0 30px;">
      [DESCRIÇÃO]
    </p>
    [CONTEÚDO]
  </td>
</tr>
```

Backgrounds disponíveis:
- `#1a1a1a` — card cinza (padrão)
- `#0d0d0d` — dark alternado
- `#111111` — cinza padrão
- `#000000` — preto total

---

### 9.4 Item de Feature (lista com ícone)

```html
<!-- Com separador (todos menos o último) -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
       style="border-bottom:1px solid #222222;padding-bottom:16px;margin-bottom:16px;">
  <tr>
    <td width="40" valign="top" style="padding-top:2px;">
      <p style="color:#d71f3f;font-family:'Montserrat',Arial,sans-serif;font-size:18px;font-weight:900;margin:0;">[ÍCONE]</p>
    </td>
    <td valign="top">
      <p style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">[NOME]</p>
      <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:13px;line-height:1.5;margin:0;">[DESCRIÇÃO]</p>
    </td>
  </tr>
</table>

<!-- Sem separador (último item) -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td width="40" valign="top" style="padding-top:2px;">
      <p style="color:#d71f3f;font-family:'Montserrat',Arial,sans-serif;font-size:18px;font-weight:900;margin:0;">[ÍCONE]</p>
    </td>
    <td valign="top">
      <p style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 4px;">[NOME]</p>
      <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:13px;line-height:1.5;margin:0;">[DESCRIÇÃO]</p>
    </td>
  </tr>
</table>
```

Ícones HTML disponíveis: `&#9650;` ▲ `&#9670;` ◆ `&#9679;` ● `&#9632;` ■ `&#9733;` ★ `&#9654;` ▶

---

### 9.5 Galeria de Imagens

```html
<!-- Imagem full-width (620px) -->
<tr>
  <td bgcolor="#000000" style="padding:2px 0;background-color:#000000;">
    <img src="[URL]" alt="[ALT]" width="620"
         style="width:100%;max-width:620px;height:auto;display:block;">
  </td>
</tr>

<!-- Grid 2 colunas (309px + 309px) -->
<tr>
  <td bgcolor="#000000" style="padding:2px 0;background-color:#000000;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
      <tr>
        <td width="309" valign="top" style="padding-right:2px;">
          <img src="[URL1]" alt="[ALT1]" width="309"
               style="width:100%;height:auto;display:block;">
        </td>
        <td width="309" valign="top" style="padding-left:2px;">
          <img src="[URL2]" alt="[ALT2]" width="309"
               style="width:100%;height:auto;display:block;">
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Grid 2 colunas comparativo (310px + 310px, gap 1px) -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td width="310" valign="top" style="padding-right:1px;">
      <img src="[URL1]" alt="[ALT1]" width="310" style="width:100%;height:auto;display:block;">
    </td>
    <td width="310" valign="top" style="padding-left:1px;">
      <img src="[URL2]" alt="[ALT2]" width="310" style="width:100%;height:auto;display:block;">
    </td>
  </tr>
</table>
```

---

### 9.6 Depoimento (Testimonial)

```html
<!-- Com margem (todos menos o último) -->
<div style="background-color:#1a1a1a;border-left:3px solid #d71f3f;padding:24px 24px 24px 28px;margin-bottom:16px;">
  <span style="color:#d71f3f;font-size:14px;margin:0 0 10px;letter-spacing:2px;display:block;">&#9733; &#9733; &#9733; &#9733; &#9733;</span>
  <p style="color:#dadada;font-family:'Poppins',Arial,sans-serif;font-size:14px;font-style:italic;line-height:1.7;margin:0 0 14px;">"[TEXTO DO DEPOIMENTO]"</p>
  <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;display:block;">[NOME]</span>
  <span style="color:#6a6a6a;font-family:'Poppins',Arial,sans-serif;font-size:11px;margin-top:2px;display:block;">[CIDADE] &middot; [DETALHE]</span>
</div>

<!-- Sem margem (último item) -->
<div style="background-color:#1a1a1a;border-left:3px solid #d71f3f;padding:24px 24px 24px 28px;">
  [MESMO CONTEÚDO]
</div>
```

---

### 9.7 Cards Comparativos (2 colunas)

```html
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <!-- Card destaque (produto principal) -->
    <td width="310" valign="top" bgcolor="#1a0a0f" style="background-color:#1a0a0f;vertical-align:top;">
      <div style="padding:28px 24px;">
        <span style="display:inline-block;background-color:#d71f3f;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;margin-bottom:12px;">&#9733; [BADGE]</span>
        <p style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:16px;font-weight:800;text-transform:uppercase;margin:0 0 4px;">[NOME]</p>
        <!-- items da lista -->
        <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:12px;padding:6px 0;border-bottom:1px solid #222222;margin:0;"><span style="color:#d71f3f;font-weight:700;">&#10003;</span> [ITEM]</p>
        <!-- último item sem border-bottom -->
        <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:12px;padding:6px 0;margin:0;"><span style="color:#d71f3f;font-weight:700;">&#10003;</span> [ÚLTIMO ITEM]</p>
      </div>
    </td>
    <!-- Card secundário -->
    <td width="310" valign="top" bgcolor="#111111" style="background-color:#111111;vertical-align:top;">
      <div style="padding:28px 24px;">
        <span style="display:inline-block;background-color:#2a2a2a;color:#9a9a9a;font-family:'Montserrat',Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;margin-bottom:12px;">[BADGE]</span>
        [MESMO PADRÃO]
      </div>
    </td>
  </tr>
</table>
```

---

### 9.8 Seção de CTA Final (Oferta)

```html
<tr>
  <td bgcolor="#000000" align="center" style="background-color:#000000;padding:60px 40px;text-align:center;border-top:1px solid #222222;">
    <p style="color:#d71f3f;font-family:'Montserrat',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;display:block;">[TAG]</p>
    <h2 style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:32px;font-weight:900;line-height:1.1;text-transform:uppercase;margin:0 0 8px;">
      [TÍTULO]
    </h2>
    <p style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 30px;">
      [SUBTÍTULO]
    </p>

    <!-- CTA principal full-width -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:14px;">
      <tr>
        <td bgcolor="#d71f3f" align="center" style="background-color:#d71f3f;">
          <a href="[URL]" target="_blank"
             style="display:block;background-color:#d71f3f;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:20px 50px;">
            [TEXTO DO BOTÃO]
          </a>
        </td>
      </tr>
    </table>

    <!-- CTA secundário (link) -->
    <a href="[URL]" target="_blank"
       style="color:#9a9a9a;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:underline;">
      [TEXTO SECUNDÁRIO]
    </a>
  </td>
</tr>
```

---

### 9.9 Divider (linha separadora)

```html
<!-- NUNCA usar <hr>. Sempre usar tabela: -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0;">
  <tr><td height="1" bgcolor="#2a2a2a" style="background-color:#2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
```

---

## 10. SKELETON — TEMPLATE VAZIO (CABEÇALHO + RODAPÉ FIXOS)

Use este esqueleto para iniciar qualquer novo email da Fiber:

```html
<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <title>[ASSUNTO DO EMAIL] | FIBER</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" type="text/css">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0; }
    table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
    body { margin:0 !important; padding:0 !important; background-color:#0a0a0a; }
    ul, ol { margin:0; padding:0; list-style:none; }
    li { margin:0; padding:0; }
    a { color:inherit; }
    @media only screen and (max-width:620px) {
      .email-wrap { width:100% !important; }
      .section-pad { padding:36px 24px !important; }
      .hero-title-r { font-size:28px !important; }
      .footer-r { padding:32px 24px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;">

<!-- PREHEADER -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#0a0a0a;line-height:1px;">
  [TEXTO PREHEADER — 85 a 100 chars]&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0a0a0a">
<tr><td align="center" valign="top">
<table width="620" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#111111">

  <!-- ====== TOP BAR ====== -->
  <tr><td bgcolor="#d71f3f" height="3" style="background-color:#d71f3f;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- ====== HEADER ====== -->
  <tr>
    <td bgcolor="#000000" align="center" style="padding:20px 40px;text-align:center;border-bottom:1px solid #222222;">
      <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:26px;font-weight:900;letter-spacing:6px;text-transform:uppercase;display:block;">FIBER</span>
      <span style="color:#9a9a9a;font-family:'Poppins',Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;display:block;">Performance · Tecnologia · Movimento</span>
    </td>
  </tr>

  <!-- ====== CONTEÚDO — inserir blocos aqui ====== -->


  <!-- ====== FOOTER ====== -->
  <tr>
    <td bgcolor="#000000" align="center" style="background-color:#000000;border-top:3px solid #d71f3f;padding:40px 40px 30px;text-align:center;">
      <span style="color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:6px;text-transform:uppercase;margin:0 0 6px;display:block;">FIBER</span>
      <span style="color:#aaaaaa;font-family:'Poppins',Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 24px;display:block;">Performance &middot; Tecnologia &middot; Movimento</span>
      <div style="margin-bottom:24px;">
        <a href="https://www.instagram.com/fiber.oficial/" target="_blank" style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">Instagram</a>
        <a href="https://www.tiktok.com/@fiber.oficial" target="_blank" style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">TikTok</a>
        <a href="https://www.youtube.com/channel/UCwtyPzb8KMAaib8yDR8XlEw" target="_blank" style="display:inline-block;background-color:#1a1a1a;border:1px solid #333333;color:#ffffff;font-family:'Montserrat',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;margin:0 4px 8px;">YouTube</a>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 24px;"><tr><td height="1" bgcolor="#2a2a2a" style="background-color:#2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <p style="color:#aaaaaa;font-family:'Poppins',Arial,sans-serif;font-size:11px;line-height:1.7;margin:0 0 16px;">
        <strong style="color:#ffffff;">FIBER &#8212; Fiber Knit Sport</strong><br>
        Almirante Barroso, 240 &#8212; Campo Bom, RS &middot; Brasil<br>
        Atendimento: <a href="mailto:sac@fiber.com.br" style="color:#aaaaaa;text-decoration:underline;">sac@fiber.com.br</a>
      </p>
      <p style="margin:0 0 16px;">
        <a href="https://fiberoficial.com.br/policies/privacy-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Privacidade</a>
        <a href="https://fiberoficial.com.br/policies/terms-of-service" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Termos</a>
        <a href="https://fiberoficial.com.br/policies/shipping-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Entrega</a>
        <a href="https://fiberoficial.com.br/policies/refund-policy" target="_blank" style="color:#cccccc;font-family:'Poppins',Arial,sans-serif;font-size:11px;text-decoration:none;border-bottom:1px solid #444444;padding-bottom:1px;margin:0 8px;">Trocas</a>
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 20px;"><tr><td height="1" bgcolor="#2a2a2a" style="background-color:#2a2a2a;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <p style="color:#666666;font-family:'Poppins',Arial,sans-serif;font-size:10px;line-height:1.6;margin:0;">
        Você está recebendo este e-mail porque se cadastrou em<br>
        <a href="https://fiberoficial.com.br" style="color:#999999;text-decoration:underline;">fiberoficial.com.br</a> ou realizou uma compra em nossa loja.<br><br>
        Não quer mais receber nossas comunicações?<br>
        <a href="{{unsubscribe_url}}" style="color:#999999;text-decoration:underline;">Cancelar inscrição</a>
        &nbsp;&middot;&nbsp;
        <a href="{{preferences_url}}" style="color:#999999;text-decoration:underline;">Gerenciar preferências</a>
      </p>
    </td>
  </tr>

  <!-- ====== BOTTOM BAR ====== -->
  <tr><td bgcolor="#d71f3f" height="3" style="background-color:#d71f3f;font-size:0;line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## 11. LINKS E DADOS OFICIAIS DA FIBER

### Redes sociais
| Rede | URL |
|------|-----|
| Instagram | `https://www.instagram.com/fiber.oficial/` |
| TikTok | `https://www.tiktok.com/@fiber.oficial` |
| YouTube | `https://www.youtube.com/channel/UCwtyPzb8KMAaib8yDR8XlEw` |

### Site e contato
| Item | Valor |
|------|-------|
| Site | `https://fiberoficial.com.br` |
| SAC email | `sac@fiber.com.br` |
| WhatsApp | `https://api.whatsapp.com/send?phone=555199692122` |

### Endereço físico (obrigatório no rodapé — LGPD/CAN-SPAM)
> Almirante Barroso, 240 — Campo Bom, RS · Brasil

### Políticas (links fixos Shopify)
| Política | URL |
|----------|-----|
| Privacidade | `https://fiberoficial.com.br/policies/privacy-policy` |
| Termos | `https://fiberoficial.com.br/policies/terms-of-service` |
| Entrega | `https://fiberoficial.com.br/policies/shipping-policy` |
| Trocas/Devoluções | `https://fiberoficial.com.br/policies/refund-policy` |

### Coleções principais
| Coleção | URL | Handle Shopify |
|---------|-----|---------------|
| Todos Calçados | `https://fiberoficial.com.br/collections/calcados-1` | `calcados-1` |
| Calçados Academia | `https://fiberoficial.com.br/collections/calcados-academia` | `calcados-academia` |
| Calçados Esportivo | `https://fiberoficial.com.br/collections/esportivo` | `esportivo` |
| Best Sellers | `https://fiberoficial.com.br/collections/best-sellers` | `best-sellers` |

### Variáveis de personalização (ESP)
| Variável | Uso |
|----------|-----|
| `{{unsubscribe_url}}` | Link de descadastro |
| `{{preferences_url}}` | Gerenciar preferências |
| `{{first_name}}` | Nome do destinatário (se disponível) |

---

## 12. ANTI-SPAM — CHECKLIST ANTES DE ENVIAR

- [ ] Preheader preenchido (85-100 chars) com `&zwnj;` de padding
- [ ] Endereço físico no rodapé
- [ ] Link de descadastro (`{{unsubscribe_url}}`) funcionando
- [ ] Proporção texto/imagem razoável (não só imagens)
- [ ] `alt` text em todas as imagens
- [ ] Sem palavras de spam em excesso: "grátis", "promoção", "clique aqui", "urgente", "ganhe"
- [ ] Subject line sem ALL CAPS excessivo e sem excesso de `!!!`
- [ ] Domínio remetente autenticado (SPF, DKIM, DMARC)
- [ ] Sem JavaScript
- [ ] Links externos com `target="_blank"`
- [ ] Não usar encurtadores de URL (bit.ly, etc.)

---

## 13. CHECKLIST TÉCNICO ANTES DE ENVIAR

- [ ] Testado no Gmail (web + mobile)
- [ ] Testado no Outlook (desktop)
- [ ] Testado no Apple Mail
- [ ] Imagens hospedadas em CDN confiável (Shopify CDN ✓)
- [ ] Todos os links funcionando
- [ ] Preheader visível na preview
- [ ] Responsive no mobile (max-width: 620px)
- [ ] Sem erros de encoding (caracteres especiais como ç, ã, é corretamente exibidos)

---

## 14. SHOPIFY CDN — COMO ENCONTRAR IMAGENS DE PRODUTO

Para obter URLs das imagens de um produto via Shopify Admin API:

```bash
# Via API REST
GET https://fiber-knit-sport-br.myshopify.com/admin/api/2025-01/products/[ID]/images.json
Header: X-Shopify-Access-Token: [TOKEN]

# Via credential-cli
node ~/.claude/task-scheduler/credential-cli.js run script.js
# com process.env.SHOPIFY_ACCESS_TOKEN
```

Formato padrão das URLs de CDN da Fiber:
```
https://cdn.shopify.com/s/files/1/0570/3483/4103/files/[nome-arquivo].webp?v=[versao]
```

---

*Arquivo referência completo:* `C:/Users/sabola/Desktop/fiber-email-maxis.html`
