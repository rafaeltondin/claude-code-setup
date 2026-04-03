# JARDIM DO MUNDO — WordPress API Documentação

> **Última atualização:** 2026-03-02
> **Status:** Testado OK (5/5 endpoints)

## Dados do Site

| Campo | Valor |
|-------|-------|
| **Site** | jardimdomundo.com |
| **Plataforma** | WordPress (self-hosted) |
| **Hosting** | HostGator |
| **Descrição** | "Compartilhando ideias. Inspirando a mudança." |
| **Timezone** | America/Sao_Paulo (GMT-3) |
| **Admin User** | jardimdomundo (ID: 1) |
| **Admin Email** | Jardimdomundo@gmail.com |
| **WP Login** | SSO via WordPress.com (Jetpack) + formulário com reCAPTCHA |

## Plugins Instalados (31 ativos)

- Jetpack (SSO, Stats, CDN)
- Rank Math SEO
- WPForms
- Blog2Social
- Creative Mail
- Instagram Widget (WPZOOM)
- CAPTCHA 4WP
- Contact Form 7
- Akismet
- Envato Market
- Site Kit (Google)
- jQuery Migrate Helper
- E mais...

## Credenciais (Vault)

| Nome | Descrição |
|------|-----------|
| `JARDIMDOMUNDO_WP_URL` | URL do site: https://jardimdomundo.com |
| `JARDIMDOMUNDO_WP_USER` | Username WordPress: jardimdomundo |
| `JARDIMDOMUNDO_WP_APP_PASSWORD` | Application Password para REST API (nome: Claude Code API) |

**NUNCA** hardcodar credenciais. Sempre usar via Credential Vault:
```bash
node "~/.claude/task-scheduler/credential-cli.js" run "script.js"
# O script recebe as credenciais como env vars
```

## REST API — Autenticação

A autenticação usa **Basic Auth** com Application Password:

```javascript
// Em scripts executados via credential-cli.js run
const url = process.env.JARDIMDOMUNDO_WP_URL;
const user = process.env.JARDIMDOMUNDO_WP_USER;
const pass = process.env.JARDIMDOMUNDO_WP_APP_PASSWORD;
const auth = Buffer.from(`${user}:${pass}`).toString('base64');

// Headers
{ 'Authorization': `Basic ${auth}` }
```

```bash
# Via curl (exemplo — NÃO hardcodar credenciais em comandos reais)
curl -u "USER:APP_PASSWORD" https://jardimdomundo.com/wp-json/wp/v2/posts
```

## REST API — Endpoints Principais

Base URL: `https://jardimdomundo.com/wp-json/wp/v2/`

### Conteúdo

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/posts` | GET | Listar posts (default: 10, max: 100) |
| `/posts` | POST | Criar novo post |
| `/posts/{id}` | GET/PUT/DELETE | Ler/atualizar/deletar post |
| `/pages` | GET | Listar páginas |
| `/pages` | POST | Criar nova página |
| `/pages/{id}` | GET/PUT/DELETE | Ler/atualizar/deletar página |
| `/media` | GET | Listar mídia |
| `/media` | POST | Upload de mídia (multipart) |

### Taxonomias

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/categories` | GET/POST | Listar/criar categorias |
| `/tags` | GET/POST | Listar/criar tags |

### Usuários

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users/me` | GET | Dados do usuário autenticado |
| `/users` | GET | Listar usuários |

### Plugins & Sistema

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/plugins` | GET | Listar plugins instalados |
| `/settings` | GET | Configurações do site |
| `/search` | GET | Busca global |

### Namespaces Disponíveis

- `wp/v2` — API padrão WordPress
- `jetpack/v4` — Jetpack API
- `rankmath/v1` — Rank Math SEO
- `contact-form-7/v1` — CF7 API
- `wpcom/v2` — WordPress.com integração
- `akismet/v1` — Akismet anti-spam

## Parâmetros Comuns

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `per_page` | int | Itens por página (1-100, default: 10) |
| `page` | int | Número da página |
| `search` | string | Busca por texto |
| `orderby` | string | Campo de ordenação (date, title, id, etc.) |
| `order` | string | Direção (asc, desc) |
| `status` | string | Status do conteúdo (publish, draft, etc.) |
| `categories` | array | Filtrar por categorias (IDs) |
| `tags` | array | Filtrar por tags (IDs) |
| `_fields` | string | Selecionar campos específicos |
| `_embed` | bool | Incluir dados relacionados |

## Exemplos de Uso

### Listar últimos 5 posts
```javascript
const res = await fetch(`${url}/wp-json/wp/v2/posts?per_page=5&_fields=id,title,date,status`, {
  headers: { 'Authorization': `Basic ${auth}` }
});
```

### Criar post
```javascript
const res = await fetch(`${url}/wp-json/wp/v2/posts`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Meu Novo Post',
    content: '<p>Conteúdo do post aqui</p>',
    status: 'draft', // publish, draft, pending
    categories: [7], // ID da categoria
    tags: [10, 20]
  })
});
```

### Buscar posts por categoria
```javascript
const res = await fetch(`${url}/wp-json/wp/v2/posts?categories=7&per_page=20`, {
  headers: { 'Authorization': `Basic ${auth}` }
});
```

### Upload de imagem
```javascript
const FormData = require('form-data');
const form = new FormData();
form.append('file', fs.createReadStream('imagem.jpg'));
form.append('title', 'Minha Imagem');

const res = await fetch(`${url}/wp-json/wp/v2/media`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    ...form.getHeaders()
  },
  body: form
});
```

## Dados do Conteúdo (Testado)

- **Posts recentes:** "Práticas seguras para higienizar vegetais", "Bioindicadores na Horta", "Óleos Essenciais para Gatos"
- **Categorias:** Alimentação (162 posts), Entretenimento (179), Bike (21), Construção Natural (68)
- **Páginas:** Política de Privacidade, About, Text Styles

## Notas Importantes

1. **reCAPTCHA no login:** O wp-login.php tem CAPTCHA 4WP ativo. Para login via browser, usar SSO WordPress.com (sem captcha)
2. **Jetpack SSO:** O site usa Jetpack para SSO via WordPress.com. Login alternativo com email Jardimdomundo@gmail.com
3. **Application Password:** Gerada em 2026-03-02, nome "Claude Code API", UUID: 8626fb7b-f999-4682-8983-b7080491ec63
4. **Conta WordPress.com:** A conta WordPress.com do Jardim do Mundo está vinculada ao site via Jetpack (site_id: 63640356)
