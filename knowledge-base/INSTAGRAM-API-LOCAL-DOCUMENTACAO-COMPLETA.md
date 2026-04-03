---
title: "Instagram API Local - Documentação Completa"
category: "APIs"
tags: "instagram, instagrapi, automacao, social-media"
topic: "Instagram Private API via instagrapi"
priority: "high"
version: "2.0.0"
last_updated: "2026-03-06"
---

# Instagram API Local — Documentação Completa

Serviço Python local (porta 8001) que encapsula o **instagrapi** para interagir com o Instagram sem usar a API oficial. Login via cookies do browser, device settings reais e delays humanizados anti-detecção.

---

## PARTE 1: VISÃO GERAL E ARQUITETURA

### Stack

| Componente | Tecnologia |
|-----------|-----------|
| Serviço | Python 3.12 + Flask (porta 8001) |
| Biblioteca | instagrapi 2.2.1 |
| Proxy Node.js | server.js (porta 3847/8000) → `/api/instagram/*` |
| CLI | `node tools-cli.js instagram action=... args...` |
| Frontend | Configurações > Instagram no CRM |

### Arquivos

| Arquivo | Local | Descrição |
|---------|-------|-----------|
| `app.py` | `~/.claude/task-scheduler/instagram-service/` | Serviço principal v2.0 |
| `app.py` | `~/Desktop/.claude/task-scheduler/instagram-service/` | Cópia sincronizada |
| `session.json` | Mesmo diretório do app.py | Sessão persistente (cookies, UUIDs, device) |
| `config.json` | Mesmo diretório do app.py | Username e user_id salvos |
| `requirements.txt` | Mesmo diretório | `instagrapi>=2.1.3, flask>=3.0.0, pillow>=10.0.0` |

### Fluxo de Chamadas

```
tools-cli.js → server.js (proxy) → localhost:8001 (Flask/Python) → Instagram Private API
```

### Device Simulado

O serviço simula um **Samsung Galaxy S23 Ultra** com app Instagram v302.1:

```
User-Agent: Instagram 302.1.0.36.111 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; pt_BR; 567505718)
Locale: pt_BR
Timezone: UTC-3 (America/Sao_Paulo)
Country: BR
```

---

## PARTE 2: AUTENTICAÇÃO

### Método 1: Login via Cookies do Browser (RECOMENDADO)

Exportar cookies do instagram.com no browser e enviar para o serviço. O cookie essencial é o `sessionid`.

**Como obter o sessionid:**
1. Abra instagram.com no Chrome (logado)
2. F12 → Application → Cookies → `https://www.instagram.com`
3. Copie o valor de `sessionid`

**Via tools-cli (direto com sessionid):**
```bash
# Passar sessionid diretamente
curl -X POST http://localhost:8001/login-cookies \
  -H "Content-Type: application/json" \
  -d '{"sessionid": "SEU_SESSIONID_AQUI"}'
```

**Via tools-cli (com array de cookies do Cookie Editor):**
```bash
curl -X POST http://localhost:8001/login-cookies \
  -H "Content-Type: application/json" \
  -d '{"cookies": [
    {"name": "sessionid", "value": "..."},
    {"name": "ds_user_id", "value": "..."},
    {"name": "csrftoken", "value": "..."}
  ]}'
```

**Cookies essenciais (mínimo):**
- `sessionid` — token de sessão (obrigatório)
- `ds_user_id` — ID numérico do usuário (obrigatório)

**Cookies opcionais (melhoram anti-detecção):**
- `csrftoken` — token CSRF
- `mid` — machine ID
- `ig_did` — device ID
- `datr` — browser tracking

**Resposta de sucesso:**
```json
{
  "ok": true,
  "username": "rafaeltondin",
  "user_id": "75239483237",
  "verified": true,
  "message": "Login realizado com sucesso como @rafaeltondin"
}
```

### Método 2: Login com Usuário e Senha

```bash
curl -X POST http://localhost:8001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "usuario", "password": "senha"}'
```

**Com 2FA:**
```bash
curl -X POST http://localhost:8001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "usuario", "password": "senha", "verification_code": "123456"}'
```

### Logout

```bash
curl -X POST http://localhost:8001/logout
```
Remove sessão salva e desconecta a conta.

### Verificar Status

```bash
# Status básico
curl http://localhost:8001/status

# Com verificação real (faz chamada à API do Instagram)
curl "http://localhost:8001/status?verify=true"
```

**Resposta:**
```json
{
  "logged_in": true,
  "username": "rafaeltondin",
  "user_id": "75239483237",
  "session_verified": true
}
```

### Health Check

```bash
curl http://localhost:8001/health
```

```json
{
  "ok": true,
  "service": "instagram-service",
  "version": "2.0",
  "logged_in": true,
  "username": "rafaeltondin"
}
```

---

## PARTE 3: CONSULTAS (LEITURA)

### 3.1 Perfil de Usuário

Retorna informações completas de um perfil + posts recentes.

```bash
node tools-cli.js instagram action=user username=fiber.oficial posts=6
```

**Endpoint direto:** `GET /user/<username>?posts=6`

**Resposta:**
```json
{
  "ok": true,
  "user": {
    "pk": "46397900794",
    "username": "fiber.oficial",
    "full_name": "FIBER®",
    "biography": "Design e tecnologia esportiva...",
    "follower_count": 301793,
    "following_count": 323,
    "media_count": 608,
    "is_private": false,
    "is_verified": true,
    "external_url": "https://www.fiberoficial.com.br/pages/home",
    "profile_pic_url": "https://..."
  },
  "recent_posts": [
    {
      "id": "3291200464761939625_46397900794",
      "pk": "3291200464761939625",
      "code": "C2ssWKavGap",
      "url": "https://www.instagram.com/p/C2ssWKavGap/",
      "media_type": 1,
      "caption": "Força, potência & performance...",
      "like_count": 4115,
      "comment_count": 888,
      "taken_at": "2024-01-29 20:54:50+00:00",
      "thumbnail_url": "https://...",
      "video_url": null,
      "user": {"pk": "46397900794", "username": "fiber.oficial"}
    }
  ]
}
```

**Campos do user:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| pk | string | ID numérico único |
| username | string | @ do perfil |
| full_name | string | Nome de exibição |
| biography | string | Bio do perfil |
| follower_count | number | Total de seguidores |
| following_count | number | Total que segue |
| media_count | number | Total de posts |
| is_private | boolean | Perfil privado? |
| is_verified | boolean | Verificado (selo azul)? |
| external_url | string | Link na bio |
| profile_pic_url | string | URL da foto de perfil |

### 3.2 Buscar Usuários

Busca perfis por nome, username ou termo.

```bash
node tools-cli.js instagram action=search_users query="dentista garopaba"
```

**Endpoint direto:** `GET /search/users?q=dentista+garopaba`

**Resposta:**
```json
{
  "ok": true,
  "count": 15,
  "users": [
    {
      "pk": "123456",
      "username": "dr.dentista",
      "full_name": "Dr. João Dentista",
      "is_private": false,
      "profile_pic_url": "https://..."
    }
  ]
}
```

### 3.3 Feed (Timeline)

Posts do feed de quem você segue.

```bash
node tools-cli.js instagram action=feed amount=20
```

**Endpoint direto:** `GET /feed?amount=20`

### 3.4 Meus Posts

Lista posts da sua própria conta.

```bash
node tools-cli.js instagram action=my_posts amount=10
```

**Endpoint direto:** `GET /my/posts?amount=10`

### 3.5 Posts de Hashtag

Posts recentes de uma hashtag.

```bash
node tools-cli.js instagram action=hashtag tag=crossfit amount=9
```

**Endpoint direto:** `GET /hashtag/crossfit?amount=9`

### 3.6 Seguidores de um Perfil

```bash
node tools-cli.js instagram action=followers username=fiber.oficial amount=50
```

**Endpoint direto:** `GET /followers/fiber.oficial?amount=50`

**Resposta:**
```json
{
  "ok": true,
  "username": "fiber.oficial",
  "count": 50,
  "followers": [
    {"pk": "123", "username": "usuario1", "full_name": "Nome", "is_private": false}
  ]
}
```

### 3.7 Quem um Perfil Segue

```bash
node tools-cli.js instagram action=following username=fiber.oficial amount=50
```

**Endpoint direto:** `GET /following/fiber.oficial?amount=50`

### 3.8 Caixa de DMs (Inbox)

```bash
node tools-cli.js instagram action=dm_inbox amount=10
```

**Endpoint direto:** `GET /dm/inbox?amount=10`

**Resposta:**
```json
{
  "ok": true,
  "count": 10,
  "threads": [
    {
      "thread_id": "340282366841710300949128147767161987456",
      "users": [{"username": "alguem", "pk": "123456"}],
      "last_message": {
        "text": "Oi, tudo bem?",
        "timestamp": "2026-03-06 15:30:00+00:00",
        "user_id": "123456"
      }
    }
  ]
}
```

### 3.9 Insights da Conta

Métricas da conta (requer conta profissional/business).

```bash
node tools-cli.js instagram action=insights
```

**Endpoint direto:** `GET /insights`

---

## PARTE 4: INTERAÇÕES (ESCRITA)

### 4.1 Curtir Post

```bash
# Por URL do post
node tools-cli.js instagram action=like media_id="https://www.instagram.com/p/C2ssWKavGap/"

# Por URL de reel
node tools-cli.js instagram action=like media_id="https://www.instagram.com/reel/ABC123/"

# Por media_id numérico
node tools-cli.js instagram action=like media_id="3291200464761939625_46397900794"
```

**Endpoint direto:** `POST /like` com body `{"media_id": "URL_OU_ID"}`

### 4.2 Descurtir Post

```bash
node tools-cli.js instagram action=unlike media_id="3291200464761939625_46397900794"
```

**Endpoint direto:** `POST /unlike` com body `{"media_id": "ID"}`

### 4.3 Comentar em Post

```bash
node tools-cli.js instagram action=comment media_id="https://www.instagram.com/p/CODE/" text="Conteudo incrivel!"
```

**Endpoint direto:** `POST /comment` com body `{"media_id": "URL_OU_ID", "text": "comentario"}`

**Resposta:**
```json
{
  "ok": true,
  "comment_id": "17890012345678",
  "message": "Comentario publicado"
}
```

### 4.4 Seguir Usuário

```bash
node tools-cli.js instagram action=follow username=fiber.oficial
```

**Endpoint direto:** `POST /follow` com body `{"username": "fiber.oficial"}`

### 4.5 Deixar de Seguir

```bash
node tools-cli.js instagram action=unfollow username=alguem
```

**Endpoint direto:** `POST /unfollow` com body `{"username": "alguem"}`

### 4.6 Enviar Mensagem Direta (DM)

```bash
node tools-cli.js instagram action=dm username=alguem text="Oi! Vi seu perfil e achei muito legal."
```

**Endpoint direto:** `POST /dm` com body `{"username": "alguem", "text": "mensagem"}`

**Resposta:**
```json
{
  "ok": true,
  "thread_id": "340282366841710300949128147767161987456",
  "message": "DM enviada para @alguem"
}
```

---

## PARTE 5: PUBLICAÇÕES

### 5.1 Publicar Foto

```bash
node tools-cli.js instagram action=post_photo image_path="C:/criativos/foto.jpg" caption="Legenda do post #hashtag"
```

**Endpoint direto:** `POST /post/photo` com body:
```json
{
  "image_path": "C:/caminho/absoluto/foto.jpg",
  "caption": "Legenda com #hashtags e @menções"
}
```

**Resposta:**
```json
{
  "ok": true,
  "media_id": "3291200464761939625_75239483237",
  "code": "ABC123",
  "url": "https://www.instagram.com/p/ABC123/",
  "message": "Foto publicada com sucesso"
}
```

**Formatos aceitos:** JPG, PNG
**Tamanho recomendado:** 1080x1080 (quadrado), 1080x1350 (retrato), 1080x566 (paisagem)

### 5.2 Publicar Reel

```bash
node tools-cli.js instagram action=post_reel video_path="C:/videos/reel.mp4" caption="Meu reel"
```

**Com thumbnail personalizada:**
```bash
node tools-cli.js instagram action=post_reel video_path="C:/videos/reel.mp4" caption="Reel" thumbnail_path="C:/thumb.jpg"
```

**Endpoint direto:** `POST /post/reel` com body:
```json
{
  "video_path": "C:/caminho/video.mp4",
  "caption": "Legenda do reel",
  "thumbnail_path": "C:/thumb.jpg"
}
```

**Formatos:** MP4 (H.264)
**Resolução ideal:** 1080x1920 (9:16 vertical)
**Duração:** até 90 segundos

### 5.3 Publicar Story

```bash
node tools-cli.js instagram action=story image_path="C:/imagens/story.jpg"
```

**Endpoint direto:** `POST /story` com body `{"image_path": "C:/caminho/imagem.jpg"}`

**Resolução ideal:** 1080x1920 (9:16)
**Duração:** desaparece em 24h

---

## PARTE 6: CASOS DE USO PRÁTICOS

### 6.1 Prospecção de Leads no Instagram

```bash
# 1. Buscar perfis de um nicho
node tools-cli.js instagram action=search_users query="dentista florianopolis"

# 2. Ver seguidores de um concorrente (leads potenciais)
node tools-cli.js instagram action=followers username=concorrente amount=100

# 3. Analisar perfil de um lead
node tools-cli.js instagram action=user username=dr.fulano posts=3

# 4. Engajar com o lead (curtir post dele)
node tools-cli.js instagram action=like media_id="https://instagram.com/p/POST_DO_LEAD/"

# 5. Seguir o lead
node tools-cli.js instagram action=follow username=dr.fulano

# 6. Após ele seguir de volta, enviar DM
node tools-cli.js instagram action=dm username=dr.fulano text="Oi Dr. Fulano! Gostei muito do seu conteudo sobre..."
```

### 6.2 Análise de Concorrência

```bash
# Perfil completo do concorrente
node tools-cli.js instagram action=user username=concorrente posts=9

# Quem o concorrente segue (parcerias, influencers, fornecedores)
node tools-cli.js instagram action=following username=concorrente amount=100

# Posts do nicho via hashtag
node tools-cli.js instagram action=hashtag tag=seunicho amount=20
```

### 6.3 Publicação Automatizada

```bash
# Postar criativo do feed
node tools-cli.js instagram action=post_photo \
  image_path="C:/criativos/promo-maio.jpg" \
  caption="Promoção de maio! 🔥 30% OFF em todos os produtos. Link na bio. #promo #desconto"

# Postar reel de produto
node tools-cli.js instagram action=post_reel \
  video_path="C:/videos/produto-demo.mp4" \
  caption="Veja como funciona! 💪"
```

### 6.4 Monitoramento de DMs

```bash
# Ver últimas conversas
node tools-cli.js instagram action=dm_inbox amount=20

# Responder a um lead
node tools-cli.js instagram action=dm username=lead123 text="Obrigado pelo interesse! Posso te ajudar com..."
```

---

## PARTE 7: LIMITES E ANTI-DETECÇÃO

### Limites Seguros por Dia

| Ação | Máximo/dia | Máximo/hora | Delay recomendado |
|------|-----------|-------------|-------------------|
| Curtidas | 150-200 | 30-50 | 10-30s entre cada |
| Follows | 100-150 | 20-30 | 30-90s entre cada |
| Unfollows | 100-150 | 20-30 | 30-90s entre cada |
| Comentários | 30-50 | 5-10 | 60-180s entre cada |
| DMs | 50-100 | 10-20 | 120-300s entre cada |
| Posts | 5-10 | 2-3 | Sem limite especial |
| Stories | 10-20 | 5-10 | Sem limite especial |

### Técnicas Anti-Detecção Implementadas

1. **Device settings reais** — Samsung Galaxy S23 Ultra (modelo real e popular no Brasil)
2. **User-Agent idêntico ao app** — Instagram 302.1 Android 14
3. **Locale brasileiro** — pt_BR, timezone UTC-3, country BR
4. **Delays humanizados** — 2-5s entre requests (configurável via `delay_range`)
5. **Delays extras por ação** — 0.5-3s adicionais em curtidas, comentários, follows
6. **Persistência de UUIDs** — Mesmo `phone_id`, `uuid`, `device_id` entre sessões
7. **Session restore** — Reutiliza sessão salva (não faz login do zero a cada execução)

### Protocolo de Warmup (Contas Novas)

```
Dias 1-3:   Apenas scroll de feed, visualizar perfis
Dias 4-7:   Curtidas ocasionais (1-5 por dia)
Dias 8-14:  Follows graduais (5-10 por dia), posts próprios
Após dia 14: Escalar gradualmente até os limites normais
```

### O que NUNCA Fazer

- Mais de 100 ações por hora
- Mesmo comentário/DM repetido (Instagram detecta texto idêntico)
- Automatizar 24h por dia sem pausas
- Usar vários dispositivos/IPs na mesma conta
- Fazer login do zero a cada execução (sempre reutilizar sessão)

---

## PARTE 8: TRATAMENTO DE ERROS

### Tipos de Erro

| error_type | Status HTTP | Significado | Ação |
|-----------|------------|-------------|------|
| `LoginRequired` | 401 | Sessão expirada | Fazer login novamente |
| `ChallengeRequired` | 403 | Instagram pediu verificação | Abrir app no celular, aprovar, tentar novamente |
| `RateLimited` | 429 | Muitas requisições | Aguardar 1-2 minutos |
| `UserNotFound` | 500 | Usuário não existe | Verificar username |

### Exemplo de Erro

```json
{
  "ok": false,
  "error": "Sessao expirada. Faca login novamente.",
  "error_type": "LoginRequired",
  "logged_in": false
}
```

### Recuperação Automática

O serviço v2.0 implementa:
- **Auto-save de sessão** após ações de escrita (like, comment, follow)
- **Preservação de UUIDs** quando sessão expira (relogin não parece novo device)
- **Fallback cookie injection** quando `login_by_sessionid` falha por challenge/rate limit

---

## PARTE 9: ENDPOINTS HTTP COMPLETOS

### Referência Rápida

| Método | Endpoint | Ação |
|--------|---------|------|
| GET | `/health` | Health check do serviço |
| GET | `/status` | Status de autenticação |
| GET | `/status?verify=true` | Status com verificação real |
| POST | `/login-cookies` | Login via cookies/sessionid |
| POST | `/login` | Login via usuário/senha |
| POST | `/logout` | Desconectar conta |
| GET | `/feed?amount=12` | Feed/timeline |
| GET | `/user/<username>?posts=9` | Perfil de usuário |
| GET | `/my/posts?amount=12` | Meus posts |
| GET | `/hashtag/<tag>?amount=9` | Posts de hashtag |
| GET | `/followers/<username>?amount=50` | Seguidores |
| GET | `/following/<username>?amount=50` | Seguindo |
| GET | `/search/users?q=termo` | Buscar usuários |
| GET | `/dm/inbox?amount=10` | Inbox de DMs |
| GET | `/insights` | Insights da conta |
| POST | `/like` | Curtir post |
| POST | `/unlike` | Descurtir post |
| POST | `/comment` | Comentar em post |
| POST | `/follow` | Seguir usuário |
| POST | `/unfollow` | Deixar de seguir |
| POST | `/dm` | Enviar DM |
| POST | `/post/photo` | Publicar foto |
| POST | `/post/reel` | Publicar reel |
| POST | `/story` | Publicar story |

### Proxies no server.js

O server.js (porta 3847 ou 8000) faz proxy para todos os endpoints acima em:
- `GET/POST /api/instagram/*` — rota principal
- `GET/POST /api/crm/instagram/*` — alias para o frontend

Endpoints adicionais no server.js:
- `GET /api/instagram/service-status` — verifica se o serviço Python está rodando
- `POST /api/instagram/start-service` — inicia o serviço Python

---

## PARTE 10: TOOLS-CLI — REFERÊNCIA DE COMANDOS

### Sintaxe

```bash
node tools-cli.js instagram action=<ACAO> [args...]
```

### Todos os Comandos

```bash
# === AUTENTICAÇÃO ===
node tools-cli.js instagram action=status

# === CONSULTAS ===
node tools-cli.js instagram action=user username=<USER> posts=<N>
node tools-cli.js instagram action=search_users query="<TERMO>"
node tools-cli.js instagram action=feed amount=<N>
node tools-cli.js instagram action=my_posts amount=<N>
node tools-cli.js instagram action=hashtag tag=<TAG> amount=<N>
node tools-cli.js instagram action=followers username=<USER> amount=<N>
node tools-cli.js instagram action=following username=<USER> amount=<N>
node tools-cli.js instagram action=dm_inbox amount=<N>

# === INTERAÇÕES ===
node tools-cli.js instagram action=like media_id="<URL_OU_ID>"
node tools-cli.js instagram action=unlike media_id="<ID>"
node tools-cli.js instagram action=comment media_id="<URL_OU_ID>" text="<TEXTO>"
node tools-cli.js instagram action=follow username=<USER>
node tools-cli.js instagram action=unfollow username=<USER>
node tools-cli.js instagram action=dm username=<USER> text="<MENSAGEM>"

# === PUBLICAÇÕES ===
node tools-cli.js instagram action=post_photo image_path="<CAMINHO>" caption="<LEGENDA>"
node tools-cli.js instagram action=post_reel video_path="<CAMINHO>" caption="<LEGENDA>" thumbnail_path="<THUMB>"
node tools-cli.js instagram action=story image_path="<CAMINHO>"
```

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| action | string | Sim | Ação a executar (ver lista acima) |
| username | string | Depende | Username sem @ |
| query | string | search_users | Termo de busca |
| tag | string | hashtag | Hashtag sem # |
| amount | number | Não | Quantidade de resultados (padrão: 12) |
| posts | number | Não | Posts a incluir no perfil (padrão: 9) |
| media_id | string | like/unlike/comment | ID do post ou URL completa |
| text | string | comment/dm | Texto da mensagem |
| image_path | string | post_photo/story | Caminho absoluto da imagem |
| video_path | string | post_reel | Caminho absoluto do vídeo |
| thumbnail_path | string | Não | Thumbnail do reel (opcional) |
| caption | string | Não | Legenda do post |

---

## PARTE 11: INICIALIZAÇÃO E MANUTENÇÃO

### Iniciar o Serviço

```bash
cd ~/Desktop/.claude/task-scheduler/instagram-service
python app.py
```

Ou via server.js:
```bash
POST /api/instagram/start-service
```

### Verificar se Está Rodando

```bash
curl http://localhost:8001/health
# ou
GET /api/instagram/service-status
```

### Matar o Serviço (com cuidado)

```bash
# Encontrar PID específico
netstat -ano | grep ":8001.*LISTEN"

# Matar APENAS o PID encontrado
taskkill //PID <PID> //F
```

**NUNCA** usar `pkill python` ou `Stop-Process -Name python` — pode matar outros processos.

### Renovar Sessão

Quando a sessão expirar (erro `LoginRequired`):
1. Abra instagram.com no browser (logado)
2. F12 → Application → Cookies → copie `sessionid`
3. `POST /login-cookies` com o novo sessionid

### Instalar Dependências

```bash
cd ~/Desktop/.claude/task-scheduler/instagram-service
pip install -r requirements.txt
```

---

## PARTE 12: GOTCHAS E DICAS

### GOTCHA 1: Username da Fiber
O username correto é `fiber.oficial` (com ponto), NÃO `fiberoficial`.

### GOTCHA 2: Sessionid do Browser vs Mobile
O sessionid do browser (web) funciona com `login_by_sessionid` do instagrapi. O serviço v2.0 lida com a conversão automaticamente.

### GOTCHA 3: Rate Limit ao Fazer Login
Se receber rate limit ao fazer login com cookies, o serviço usa fallback via cookie injection (injeta cookies diretamente sem chamar a API de login).

### GOTCHA 4: ChallengeRequired
Se o Instagram pedir verificação de segurança:
1. Abra o app Instagram no celular
2. Aprove o login no aviso que aparecerá
3. Tente novamente via API

### GOTCHA 5: Conta Sem Posts
`my_posts` retorna `count: 0` se a conta não tem posts. Isso é comportamento correto.

### GOTCHA 6: Encoding no Windows
Ao enviar JSON com acentos via curl no Windows, use Node.js ou Python em vez de curl. Curl no Git Bash quebra caracteres especiais.

### GOTCHA 7: Múltiplos Processos na Porta 8001
O server.js pode iniciar múltiplas instâncias. Sempre verificar com `netstat -ano | grep :8001` antes de iniciar novo serviço.

### GOTCHA 8: Sessão Persistente Entre Sessões do Claude
O `session.json` persiste no disco. Ao iniciar uma nova sessão do Claude Code, o serviço carrega automaticamente a sessão salva. Não é necessário fazer login novamente (a menos que tenha expirado).
