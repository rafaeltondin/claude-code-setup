# GOOGLE CALENDAR API — DOCUMENTACAO COMPLETA

> Documentacao criada em 2026-02-25 com base em testes reais da API.
> Conta testada: tondinrafael@gmail.com
> Todos os exemplos usam placeholders — nunca exponha tokens reais.

---

## INDICE

1. [Descricao da API](#descricao)
2. [Credenciais e Autenticacao](#credenciais)
3. [Como Renovar o Access Token](#renovar-token)
4. [Escopos Necessarios](#escopos)
5. [Endpoints Principais](#endpoints)
6. [Exemplos de Eventos Avancados](#eventos-avancados)
7. [Scripts Node.js](#scripts-nodejs)
8. [Formatos de Data e Timezone](#formatos)
9. [Webhook / Watch Notifications](#webhooks)
10. [Rate Limits e Quotas](#limites)
11. [Troubleshooting e Erros Comuns](#troubleshooting)

---

## 1. Descricao da API {#descricao}

A **Google Calendar API v3** permite criar, ler, atualizar e deletar eventos em calendarios do Google. Suporta:

- Gerenciamento de multiplos calendarios
- Criacao de eventos simples, recorrentes, all-day e com convidados
- Busca de eventos por texto e por faixa de datas
- Verificacao de disponibilidade (freeBusy)
- Notificacoes em tempo real via webhooks (watch)
- Compartilhamento e controle de acesso a calendarios

**Base URL:** `https://www.googleapis.com/calendar/v3`

**Documentacao oficial:** https://developers.google.com/calendar/api/v3/reference

---

## 2. Credenciais e Autenticacao {#credenciais}

### Variaveis de ambiente necessarias

```bash
export GOOGLE_CLIENT_ID="SEU_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-SEU_CLIENT_SECRET"
export GOOGLE_REFRESH_TOKEN="1//SEU_REFRESH_TOKEN"
export GOOGLE_ACCESS_TOKEN="ya29.SEU_ACCESS_TOKEN"  # expira em ~1 hora
```

### Onde obter as credenciais

1. Acesse https://console.cloud.google.com
2. Crie ou selecione um projeto
3. Ative a **Google Calendar API** em "APIs e Servicos"
4. Em "Credenciais", crie um **OAuth 2.0 Client ID** (tipo: Aplicativo Web ou Desktop)
5. Anote `client_id` e `client_secret`
6. Faca o fluxo OAuth para obter `refresh_token` e `access_token`

### Tipos de autenticacao suportados

| Tipo | Quando usar |
|------|-------------|
| OAuth 2.0 (Bearer Token) | Acesso a dados de usuarios reais |
| Service Account | Acesso a calendarios compartilhados / automacao server-side |
| API Key | Apenas para calendarios publicos (sem escrita) |

---

## 3. Como Renovar o Access Token {#renovar-token}

O `access_token` expira em aproximadamente 1 hora. Use o `refresh_token` para obter um novo sem interacao do usuario.

### Via curl

```bash
curl -s -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

**Resposta esperada (200 OK):**
```json
{
  "access_token": "ya29.NOVO_TOKEN",
  "expires_in": 3599,
  "scope": "https://www.googleapis.com/auth/calendar",
  "token_type": "Bearer"
}
```

### Via Node.js (com renovacao automatica)

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Renovar token manualmente
const { token } = await oauth2Client.getAccessToken();
console.log('Novo access token:', token);

// Com googleapis, a renovacao e automatica ao usar o client
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
```

### Script de renovacao standalone (bash)

```bash
#!/bin/bash
# renew-token.sh
NEW_TOKEN=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=$GOOGLE_CLIENT_ID" \
  -d "client_secret=$GOOGLE_CLIENT_SECRET" \
  -d "refresh_token=$GOOGLE_REFRESH_TOKEN" \
  -d "grant_type=refresh_token" | \
  node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).access_token))")

echo "export GOOGLE_ACCESS_TOKEN=$NEW_TOKEN"
```

---

## 4. Escopos Necessarios {#escopos}

| Escopo | Permissao |
|--------|-----------|
| `https://www.googleapis.com/auth/calendar` | Leitura e escrita em todos os calendarios |
| `https://www.googleapis.com/auth/calendar.events` | Apenas eventos (nao dados do calendario) |
| `https://www.googleapis.com/auth/calendar.readonly` | Somente leitura |
| `https://www.googleapis.com/auth/calendar.events.readonly` | Leitura de eventos apenas |

**Escopo minimo recomendado para a maioria dos casos:**
`https://www.googleapis.com/auth/calendar.events`

---

## 5. Endpoints Principais {#endpoints}

### Header padrao para todas as requisicoes

```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-H "Accept: application/json"
```

---

### 5.1 Listar Calendarios

**GET** `/users/me/calendarList`

Lista todos os calendarios do usuario autenticado.

```bash
curl -s \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta (200 OK):**
```json
{
  "kind": "calendar#calendarList",
  "items": [
    {
      "id": "usuario@gmail.com",
      "summary": "usuario@gmail.com",
      "timeZone": "America/Sao_Paulo",
      "accessRole": "owner",
      "primary": true,
      "defaultReminders": [{"method": "popup", "minutes": 30}]
    },
    {
      "id": "pt-br.brazilian#holiday@group.v.calendar.google.com",
      "summary": "Feriados no Brasil",
      "accessRole": "reader"
    }
  ]
}
```

**Campos relevantes dos items:**
| Campo | Descricao |
|-------|-----------|
| `id` | ID do calendario (use em outros endpoints) |
| `summary` | Nome do calendario |
| `primary` | `true` se for o calendario principal |
| `accessRole` | `owner`, `writer`, `reader` |
| `timeZone` | Timezone padrao do calendario |

---

### 5.2 Obter Detalhes de um Calendario

**GET** `/calendars/{calendarId}`

Use `primary` como calendarId para o calendario principal.

```bash
curl -s \
  "https://www.googleapis.com/calendar/v3/calendars/primary" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta (200 OK):**
```json
{
  "kind": "calendar#calendar",
  "id": "usuario@gmail.com",
  "summary": "usuario@gmail.com",
  "timeZone": "America/Sao_Paulo",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": ["hangoutsMeet"]
  }
}
```

---

### 5.3 Listar Eventos (com filtros)

**GET** `/calendars/{calendarId}/events`

```bash
# Proximos 10 eventos a partir de agora
TIME_MIN=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
curl -s \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${TIME_MIN}&maxResults=10&orderBy=startTime&singleEvents=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Query Parameters principais:**

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `timeMin` | string (ISO 8601) | Data/hora minima dos eventos |
| `timeMax` | string (ISO 8601) | Data/hora maxima dos eventos |
| `maxResults` | integer | Max de resultados (default: 250, max: 2500) |
| `orderBy` | string | `startTime` (requer singleEvents=true) ou `updated` |
| `singleEvents` | boolean | `true` para expandir eventos recorrentes |
| `q` | string | Texto para buscar no titulo, descricao, local e email dos convidados |
| `pageToken` | string | Token para proxima pagina (paginacao) |
| `showDeleted` | boolean | Incluir eventos deletados |

**Exemplo com faixa de datas (proximos 7 dias):**
```bash
curl -s \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events\
?timeMin=2026-02-25T00%3A00%3A00-03%3A00\
&timeMax=2026-03-04T23%3A59%3A59-03%3A00\
&singleEvents=true\
&orderBy=startTime" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta (200 OK):**
```json
{
  "kind": "calendar#events",
  "summary": "usuario@gmail.com",
  "timeZone": "America/Sao_Paulo",
  "nextPageToken": "TOKEN_PARA_PROXIMA_PAGINA",
  "items": [
    {
      "id": "abc123",
      "summary": "Reuniao de equipe",
      "start": {"dateTime": "2026-02-26T10:00:00-03:00"},
      "end": {"dateTime": "2026-02-26T11:00:00-03:00"},
      "status": "confirmed"
    }
  ]
}
```

---

### 5.4 Criar Evento

**POST** `/calendars/{calendarId}/events`

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Nome do Evento",
    "description": "Descricao do evento",
    "location": "Rua Exemplo, 123, Porto Alegre",
    "start": {
      "dateTime": "2026-02-26T10:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "end": {
      "dateTime": "2026-02-26T11:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "reminders": {
      "useDefault": false,
      "overrides": [
        {"method": "popup", "minutes": 15},
        {"method": "email", "minutes": 60}
      ]
    }
  }'
```

**Resposta (200 OK):**
```json
{
  "kind": "calendar#event",
  "id": "NOVO_EVENT_ID",
  "status": "confirmed",
  "htmlLink": "https://www.google.com/calendar/event?eid=...",
  "created": "2026-02-25T13:13:40.000Z",
  "summary": "Nome do Evento",
  "start": {"dateTime": "2026-02-26T10:00:00-03:00"},
  "end": {"dateTime": "2026-02-26T11:00:00-03:00"}
}
```

> **Nota:** A API retorna 200 (nao 201) na criacao de eventos — comportamento diferente do REST padrao.

---

### 5.5 Atualizar Evento (PUT — substituicao completa)

**PUT** `/calendars/{calendarId}/events/{eventId}`

Substitui o evento inteiro. Todos os campos devem ser enviados.

```bash
curl -s -X PUT \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/EVENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Titulo Atualizado",
    "description": "Nova descricao",
    "start": {
      "dateTime": "2026-02-26T10:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "end": {
      "dateTime": "2026-02-26T11:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    }
  }'
```

### 5.6 Atualizar Evento Parcialmente (PATCH)

**PATCH** `/calendars/{calendarId}/events/{eventId}`

Atualiza apenas os campos enviados.

```bash
curl -s -X PATCH \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/EVENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"summary": "Apenas o titulo muda"}'
```

---

### 5.7 Buscar Eventos por Texto

**GET** `/calendars/{calendarId}/events?q=TEXTO`

Busca no titulo, descricao, local e emails dos participantes.

```bash
curl -s \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?q=reuniao&singleEvents=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 5.8 Deletar Evento

**DELETE** `/calendars/{calendarId}/events/{eventId}`

```bash
curl -s -X DELETE \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/EVENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Resposta:** HTTP 204 No Content (sem body). Sucesso.

---

### 5.9 Verificar Disponibilidade (freeBusy)

**POST** `/freeBusy`

Retorna os periodos ocupados de um ou mais calendarios.

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/freeBusy" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timeMin": "2026-02-26T00:00:00-03:00",
    "timeMax": "2026-02-26T23:59:59-03:00",
    "timeZone": "America/Sao_Paulo",
    "items": [
      {"id": "usuario@gmail.com"},
      {"id": "outro@exemplo.com"}
    ]
  }'
```

**Resposta (200 OK):**
```json
{
  "kind": "calendar#freeBusy",
  "timeMin": "2026-02-26T03:00:00.000Z",
  "timeMax": "2026-02-27T02:59:59.000Z",
  "calendars": {
    "usuario@gmail.com": {
      "busy": [
        {
          "start": "2026-02-26T10:00:00-03:00",
          "end": "2026-02-26T11:00:00-03:00"
        }
      ]
    }
  }
}
```

---

## 6. Exemplos de Eventos Avancados {#eventos-avancados}

### 6.1 Evento All-Day (dia inteiro)

Use `date` (sem hora) em vez de `dateTime`.

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Ferias",
    "start": {"date": "2026-03-10"},
    "end": {"date": "2026-03-18"}
  }'
```

> **Nota:** Para all-day, `end.date` deve ser o dia POSTERIOR ao ultimo dia do evento (exclusivo).

---

### 6.2 Evento Recorrente

Usa a sintaxe **RRULE** do iCalendar.

```bash
# Reuniao toda segunda-feira as 9h por 8 semanas
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Daily - Equipe",
    "start": {
      "dateTime": "2026-03-02T09:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "end": {
      "dateTime": "2026-03-02T09:30:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "recurrence": [
      "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8"
    ]
  }'
```

**Padroes RRULE comuns:**

| Padrao | RRULE |
|--------|-------|
| Todo dia | `RRULE:FREQ=DAILY` |
| Toda semana (segunda) | `RRULE:FREQ=WEEKLY;BYDAY=MO` |
| Dias uteis | `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| Todo mes (dia 15) | `RRULE:FREQ=MONTHLY;BYMONTHDAY=15` |
| Toda segunda-feira por 10 vezes | `RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10` |
| Ate uma data limite | `RRULE:FREQ=WEEKLY;UNTIL=20261231T000000Z` |

---

### 6.3 Evento com Convidados

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Reuniao de Projeto",
    "start": {
      "dateTime": "2026-03-01T14:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "end": {
      "dateTime": "2026-03-01T15:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "attendees": [
      {"email": "convidado1@exemplo.com"},
      {"email": "convidado2@exemplo.com", "displayName": "Joao Silva"},
      {"email": "opcional@exemplo.com", "optional": true}
    ],
    "guestsCanModifyEvent": false,
    "guestsCanInviteOthers": false,
    "sendUpdates": "all"
  }'
```

**Parametro `sendUpdates`:**
| Valor | Comportamento |
|-------|--------------|
| `all` | Envia emails para todos os convidados |
| `externalOnly` | Envia apenas para convidados externos (fora do dominio) |
| `none` | Nao envia emails |

---

### 6.4 Evento com Google Meet

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Reuniao com Video",
    "start": {
      "dateTime": "2026-03-01T15:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "end": {
      "dateTime": "2026-03-01T16:00:00-03:00",
      "timeZone": "America/Sao_Paulo"
    },
    "conferenceData": {
      "createRequest": {
        "requestId": "unique-request-id-123",
        "conferenceSolutionKey": {"type": "hangoutsMeet"}
      }
    }
  }'
```

> **Importante:** Use `?conferenceDataVersion=1` na URL para criar o Meet.

---

### 6.5 Evento com Reminder Customizado

```bash
-d '{
  "summary": "Lembrete importante",
  "start": {"dateTime": "2026-03-01T09:00:00-03:00", "timeZone": "America/Sao_Paulo"},
  "end": {"dateTime": "2026-03-01T10:00:00-03:00", "timeZone": "America/Sao_Paulo"},
  "reminders": {
    "useDefault": false,
    "overrides": [
      {"method": "popup", "minutes": 5},
      {"method": "popup", "minutes": 30},
      {"method": "email", "minutes": 1440}
    ]
  }
}'
```

> **Limites de reminders:** Max 5 por evento. `minutes` aceita ate 40320 (28 dias).

---

## 7. Scripts Node.js {#scripts-nodejs}

### Instalacao

```bash
npm install googleapis
```

### 7.1 Configuracao do Cliente

```javascript
// google-calendar-client.js
const { google } = require('googleapis');

function createCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

module.exports = { createCalendarClient };
```

---

### 7.2 Listar Eventos

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function listarEventos(diasFuturos = 7) {
  const calendar = createCalendarClient();
  const agora = new Date();
  const futuro = new Date(agora.getTime() + diasFuturos * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: agora.toISOString(),
    timeMax: futuro.toISOString(),
    maxResults: 50,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const eventos = response.data.items || [];
  console.log(`${eventos.length} eventos encontrados:`);

  eventos.forEach(evento => {
    const inicio = evento.start.dateTime || evento.start.date;
    console.log(`- [${inicio}] ${evento.summary} (ID: ${evento.id})`);
  });

  return eventos;
}

listarEventos().catch(console.error);
```

---

### 7.3 Criar Evento

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function criarEvento({
  titulo,
  descricao = '',
  local = '',
  inicio, // Date object ou string ISO
  fim,    // Date object ou string ISO
  convidados = [], // array de emails
  timezone = 'America/Sao_Paulo',
  lembretes = [{ method: 'popup', minutes: 15 }],
  recorrencia = null, // ex: ['RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=4']
}) {
  const calendar = createCalendarClient();

  const evento = {
    summary: titulo,
    description: descricao,
    location: local,
    start: {
      dateTime: new Date(inicio).toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: new Date(fim).toISOString(),
      timeZone: timezone,
    },
    attendees: convidados.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: lembretes,
    },
  };

  if (recorrencia) {
    evento.recurrence = recorrencia;
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: evento,
    sendUpdates: convidados.length > 0 ? 'all' : 'none',
  });

  console.log(`Evento criado: ${response.data.id}`);
  console.log(`Link: ${response.data.htmlLink}`);
  return response.data;
}

// Exemplo de uso
criarEvento({
  titulo: 'Reuniao de Projeto',
  descricao: 'Discussao sobre roadmap Q1',
  inicio: '2026-03-01T14:00:00-03:00',
  fim: '2026-03-01T15:00:00-03:00',
  convidados: ['colega@empresa.com'],
}).catch(console.error);
```

---

### 7.4 Atualizar Evento

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function atualizarEvento(eventId, camposParaAtualizar) {
  const calendar = createCalendarClient();

  // PATCH — atualiza apenas os campos enviados
  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId: eventId,
    resource: camposParaAtualizar,
  });

  console.log(`Evento atualizado: ${response.data.summary}`);
  return response.data;
}

// Exemplo: mudar apenas o titulo
atualizarEvento('EVENT_ID', {
  summary: 'Novo Titulo do Evento'
}).catch(console.error);

// Exemplo: adicionar local
atualizarEvento('EVENT_ID', {
  location: 'Av. Paulista, 1000, Sao Paulo'
}).catch(console.error);
```

---

### 7.5 Deletar Evento

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function deletarEvento(eventId) {
  const calendar = createCalendarClient();

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
    sendUpdates: 'all', // avisa convidados
  });

  console.log(`Evento ${eventId} deletado com sucesso.`);
}

deletarEvento('EVENT_ID').catch(console.error);
```

---

### 7.6 Verificar Disponibilidade

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function verificarDisponibilidade(emails, inicio, fim) {
  const calendar = createCalendarClient();

  const response = await calendar.freebusy.query({
    resource: {
      timeMin: new Date(inicio).toISOString(),
      timeMax: new Date(fim).toISOString(),
      timeZone: 'America/Sao_Paulo',
      items: emails.map(email => ({ id: email })),
    },
  });

  const calendarios = response.data.calendars;
  const resultado = {};

  for (const [email, dados] of Object.entries(calendarios)) {
    resultado[email] = {
      ocupado: dados.busy || [],
      disponivel: dados.busy.length === 0,
    };
  }

  return resultado;
}

// Exemplo
verificarDisponibilidade(
  ['usuario@gmail.com', 'colega@empresa.com'],
  '2026-03-01T00:00:00-03:00',
  '2026-03-01T23:59:59-03:00'
).then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
```

---

### 7.7 Buscar Eventos por Texto

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function buscarEventos(textoBusca) {
  const calendar = createCalendarClient();

  const response = await calendar.events.list({
    calendarId: 'primary',
    q: textoBusca,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  return response.data.items || [];
}

buscarEventos('reuniao').then(eventos =>
  eventos.forEach(e => console.log(`${e.id}: ${e.summary}`))
).catch(console.error);
```

---

### 7.8 Listar Calendarios

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function listarCalendarios() {
  const calendar = createCalendarClient();

  const response = await calendar.calendarList.list();
  const calendarios = response.data.items || [];

  calendarios.forEach(cal => {
    const tipo = cal.primary ? '[PRINCIPAL]' : '[SECUNDARIO]';
    console.log(`${tipo} ${cal.summary} (ID: ${cal.id})`);
  });

  return calendarios;
}

listarCalendarios().catch(console.error);
```

---

## 8. Formatos de Data e Timezone {#formatos}

### Formatos aceitos pela API

| Tipo | Formato | Exemplo |
|------|---------|---------|
| Com hora (com timezone offset) | `YYYY-MM-DDTHH:mm:ssZ` | `2026-02-26T10:00:00-03:00` |
| Com hora (UTC) | `YYYY-MM-DDTHH:mm:ssZ` | `2026-02-26T13:00:00Z` |
| Dia inteiro (all-day) | `YYYY-MM-DD` | `2026-02-26` |

### Timezones mais usados no Brasil

| Cidade | Timezone | Offset inverno | Offset verao |
|--------|----------|---------------|--------------|
| Sao Paulo, Rio | `America/Sao_Paulo` | -03:00 | -02:00 |
| Brasilia | `America/Sao_Paulo` | -03:00 | -02:00 |
| Manaus | `America/Manaus` | -04:00 | -04:00 |
| Fortaleza | `America/Fortaleza` | -03:00 | -03:00 |
| Belem | `America/Belem` | -03:00 | -03:00 |

### Convertendo datas em JavaScript

```javascript
// Data atual em ISO 8601
const agora = new Date().toISOString();
// "2026-02-25T13:13:30.000Z"

// Amanha ao meio-dia no fuso de SP
const amanha = new Date();
amanha.setDate(amanha.getDate() + 1);
amanha.setHours(12, 0, 0, 0);
// Para garantir timezone correto, use uma lib como date-fns-tz ou luxon

// Com luxon (recomendado)
const { DateTime } = require('luxon');
const inicioSP = DateTime.now()
  .setZone('America/Sao_Paulo')
  .plus({ days: 1 })
  .set({ hour: 10, minute: 0, second: 0 })
  .toISO(); // "2026-02-26T10:00:00.000-03:00"
```

---

## 9. Webhook / Watch Notifications {#webhooks}

Receba notificacoes em tempo real quando eventos forem criados, atualizados ou deletados.

### Criar um Watch (assinatura de mudancas)

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "meu-canal-unico-123",
    "type": "web_hook",
    "address": "https://meusite.com/webhook/google-calendar",
    "token": "meu-token-secreto-para-validar",
    "expiration": 1800000000000
  }'
```

**Resposta:**
```json
{
  "kind": "api#channel",
  "id": "meu-canal-unico-123",
  "resourceId": "RESOURCE_ID",
  "resourceUri": "https://www.googleapis.com/...",
  "token": "meu-token-secreto-para-validar",
  "expiration": "1800000000000"
}
```

### Parar um Watch

```bash
curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/channels/stop" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "meu-canal-unico-123",
    "resourceId": "RESOURCE_ID"
  }'
```

### Recebendo notificacoes (Node.js/Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/google-calendar', (req, res) => {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  const token = req.headers['x-goog-channel-token'];

  // Validar o token
  if (token !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  console.log(`Notificacao recebida - Canal: ${channelId}, Estado: ${resourceState}`);

  // resourceState pode ser: 'sync', 'exists', 'not_exists'
  if (resourceState === 'exists') {
    // Algum evento foi criado ou modificado — buscar dados atualizados
    console.log('Calendario modificado, sincronizando...');
    // Chamar calendar.events.list com syncToken para obter apenas mudancas
  }

  res.status(200).send('OK');
});
```

### Pontos importantes sobre Webhooks

- O endpoint precisa ser HTTPS com certificado valido
- Validade maxima do canal: 30 dias (campo `expiration` em milissegundos UNIX)
- Renove o canal antes de expirar
- Use `syncToken` para buscar apenas mudancas incrementais
- Limite: 1 canal por recurso por usuario

---

## 10. Rate Limits e Quotas {#limites}

### Limites padrao (conta Google pessoal)

| Recurso | Limite |
|---------|--------|
| Requisicoes por segundo por usuario | 10 |
| Requisicoes por dia por projeto | 1.000.000 |
| Eventos criados por dia | Sem limite documentado |
| Convidados por evento | 2.000 |
| Calendarios por usuario | 10.000 |
| Lembretes por evento | 5 |

### Tratamento de erros de rate limit

```javascript
const { createCalendarClient } = require('./google-calendar-client');

async function comRetryAutomatico(fn, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 429 || (error.errors && error.errors[0].domain === 'usageLimits')) {
        const espera = Math.pow(2, i) * 1000; // exponential backoff
        console.log(`Rate limit atingido. Aguardando ${espera}ms...`);
        await new Promise(r => setTimeout(r, espera));
      } else {
        throw error;
      }
    }
  }
}

// Uso
await comRetryAutomatico(() =>
  calendar.events.insert({ calendarId: 'primary', resource: meuEvento })
);
```

---

## 11. Troubleshooting e Erros Comuns {#troubleshooting}

### Tabela de erros

| Status | Codigo | Causa | Solucao |
|--------|--------|-------|---------|
| 400 | `invalid_grant` | Refresh token invalido ou revogado | Refazer fluxo OAuth |
| 400 | `required` | Campo obrigatorio ausente | Verificar body da requisicao |
| 401 | `unauthorized` | Access token expirado ou invalido | Renovar o access token |
| 403 | `forbidden` | Escopo insuficiente | Adicionar escopo `calendar` ao token |
| 403 | `insufficientPermissions` | Sem permissao no calendario | Verificar accessRole do calendario |
| 404 | `notFound` | Evento ou calendario nao existe | Verificar ID do recurso |
| 409 | `duplicate` | requestId duplicado (conferenceData) | Gerar novo requestId unico |
| 410 | `gone` | syncToken expirado | Fazer sync completo sem syncToken |
| 429 | `rateLimitExceeded` | Muitas requisicoes | Implementar exponential backoff |
| 500 | `backendError` | Erro interno do Google | Retry com backoff |

### Erros comuns em detalhes

**1. "Invalid grant" ao renovar token**
```
{"error": "invalid_grant", "error_description": "Token has been expired or revoked"}
```
Causa: refresh_token expirado (apps em modo "testing" expiram em 7 dias) ou revogado pelo usuario.
Solucao: Refazer o fluxo de autorizacao OAuth.

**2. "Forbidden" ao acessar evento**
```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```
Causa: Evento pertence a outro organizador ou token sem escopo suficiente.
Solucao: Verificar se o escopo inclui `calendar` (nao apenas `calendar.readonly`).

**3. Token expirado — detectar e renovar automaticamente**
```javascript
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // Salvar novo refresh_token se foi rotacionado
    console.log('Novo refresh_token:', tokens.refresh_token);
  }
  console.log('Novo access_token:', tokens.access_token);
});
```

**4. Fuso horario incorreto nos eventos**

Sempre especifique `timeZone` junto com `dateTime`:
```json
"start": {
  "dateTime": "2026-02-26T10:00:00-03:00",
  "timeZone": "America/Sao_Paulo"
}
```
Sem `timeZone`, a API usa UTC como padrao.

**5. singleEvents obrigatorio com orderBy=startTime**
```
orderBy=startTime is only supported when singleEvents is true
```
Solucao: Sempre use `&singleEvents=true&orderBy=startTime` juntos.

**6. Evento recorrente — como modificar apenas uma ocorrencia**
```bash
# Listar ocorrencias para obter o ID da instancia
curl "https://www.googleapis.com/calendar/v3/calendars/primary/events/RECURRING_EVENT_ID/instances" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Modificar apenas a instancia especifica
curl -X PATCH \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/INSTANCE_EVENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"summary": "Titulo diferente para esta ocorrencia"}'
```

---

## RESUMO DOS RESULTADOS DOS TESTES (2026-02-25)

| # | Teste | Endpoint | Status | Resultado |
|---|-------|----------|--------|-----------|
| 1 | Listar calendarios | GET /calendarList | 200 | OK — 2 calendarios encontrados (principal + Feriados BR) |
| 2 | Detalhes do calendario | GET /calendars/primary | 200 | OK — timezone America/Sao_Paulo confirmado |
| 3 | Listar proximos eventos | GET /events (timeMin+maxResults) | 200 | OK — eventos futuros retornados |
| 4 | Criar evento | POST /events | 200 | OK — ID: ampiu8nsang2s40k9g77ekinlg |
| 5 | Atualizar evento (PUT) | PUT /events/:id | 200 | OK — titulo atualizado para "Teste Atualizado" |
| 6 | Buscar por texto | GET /events?q=Teste | 200 | OK — 5 eventos encontrados |
| 7 | Faixa de datas (7 dias) | GET /events?timeMin&timeMax | 200 | OK — 2 eventos na semana |
| 8 | Deletar evento | DELETE /events/:id | 204 | OK — evento removido com sucesso |
| 9 | Verificar freeBusy | POST /freeBusy | 200 | OK — periodo ocupado detectado corretamente |

**Taxa de sucesso: 9/9 (100%)**

---

*Documentacao gerada pelo Python API Tester — Claude Code*
*Ultima atualizacao: 2026-02-25*
