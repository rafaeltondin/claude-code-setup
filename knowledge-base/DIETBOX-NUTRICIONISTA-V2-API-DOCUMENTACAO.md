# DIETBOX — API Nutricionista V2

> **Documento gerado automaticamente a partir do spec OpenAPI 3.0.4**
> Base URL: `https://api-dev.dietbox.me`  |  Total: 201 endpoints  |  384 schemas

## Índice

- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Guia de Início Rápido](#guia-de-início-rápido)
- [Endpoints por Tag](#endpoints-por-tag)
  - [Account (1)](#account)
  - [Agenda (12)](#agenda)
  - [AgendaGoogle (7)](#agendagoogle)
  - [Agua (3)](#agua)
  - [Anamnesis (10)](#anamnesis)
  - [AnamnesisModel (4)](#anamnesismodel)
  - [Anthropometry (14)](#anthropometry)
  - [Chat (6)](#chat)
  - [Configuration (2)](#configuration)
  - [CustomizableCard (1)](#customizablecard)
  - [Diario (8)](#diario)
  - [EnergyExpenditure (7)](#energyexpenditure)
  - [Especialidade (1)](#especialidade)
  - [Extensions (2)](#extensions)
  - [ExternalVoucher (1)](#externalvoucher)
  - [Feed (3)](#feed)
  - [File (1)](#file)
  - [Finance (16)](#finance)
  - [Formulas (26)](#formulas)
  - [GiftConfiguration (1)](#giftconfiguration)
  - [LocalAtendimento (4)](#localatendimento)
  - [Materiais (7)](#materiais)
  - [Meta (7)](#meta)
  - [News (2)](#news)
  - [Nutritionist (14)](#nutritionist)
  - [NutritionistNotes (8)](#nutritionistnotes)
  - [Opiniao (2)](#opiniao)
  - [PCQ (7)](#pcq)
  - [PCQModel (7)](#pcqmodel)
  - [Paciente (12)](#paciente)
  - [Patient (6)](#patient)
  - [Perfil (3)](#perfil)
  - [PlanoAlimentar (1)](#planoalimentar)
  - [PreAgendamento (3)](#preagendamento)
  - [Prescription (18)](#prescription)
  - [Qpc (6)](#qpc)
  - [QpcModel (5)](#qpcmodel)
  - [Supplement (4)](#supplement)
  - [Tag (5)](#tag)
  - [Videoconferencia (1)](#videoconferencia)
  - [Whatsapp (3)](#whatsapp)
  - [WhatsappTemplate (5)](#whatsapptemplate)
- [Schemas Principais](#schemas-principais)
- [Tabela Completa de Endpoints](#tabela-completa-de-endpoints)

---

## Visão Geral

A **API Nutricionista Dietbox V2** é uma API RESTful destinada a nutricionistas cadastrados na plataforma Dietbox. Ela permite gerenciar pacientes, agendamentos, planos alimentares, antropometria, finanças, chat, prescrições e muito mais.

| Atributo | Valor |
|----------|-------|
| **Título** | API Nutricionista |
| **Versão** | v2 |
| **Base URL** | `https://api-dev.dietbox.me` |
| **Especificação** | OpenAPI 3.0.4 |
| **Total de Endpoints** | 201 |
| **Total de Schemas** | 384 |
| **Autenticação** | OAuth2 — Azure AD B2C |
| **Formato** | JSON |

---

## Autenticação

A API utiliza **OAuth2 com Azure AD B2C** (fluxo Implicit). Todos os endpoints requerem autenticação via Bearer token.

### Fluxo OAuth2 — Azure AD B2C

| Atributo | Valor |
|----------|-------|
| **Tipo** | OAuth2 Implicit Flow |
| **Provedor** | Azure Active Directory B2C |
| **Tenant** | `dietbox1.b2clogin.com` |
| **Política** | `b2c_1a_signup_signin` |

### URLs de Autenticação

```
Authorization URL:
https://dietbox1.b2clogin.com/dietbox1.onmicrosoft.com/b2c_1a_signup_signin/oauth2/v2.0/authorize?prompt=login

Token URL:
https://dietbox1.b2clogin.com/dietbox1.onmicrosoft.com/b2c_1a_signup_signin/oauth2/v2.0/token
```

### Scopes Disponíveis

| Scope | Permissão |
|-------|-----------|
| `https://dietbox1.onmicrosoft.com/api/user_impersonation` | Acesso completo como usuário autenticado |
| `https://dietbox1.onmicrosoft.com/api/dietbox-api-leitura` | Acesso de leitura |
| `https://dietbox1.onmicrosoft.com/api/dietbox-api-escrita` | Acesso de escrita |

### Usando o Token

Após obter o access token, inclua-o no header `Authorization` de todas as requisições:

```bash
Authorization: Bearer {access_token}
```

**Exemplo completo:**
```bash
curl -X GET "https://api-dev.dietbox.me/v2/perfil" \
     -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
     -H "Content-Type: application/json"
```

---

## Guia de Início Rápido

### 1. Obter Token de Acesso

Utilize o fluxo OAuth2 implicit com Azure AD B2C para obter seu `access_token`.

### 2. Consultar Perfil do Nutricionista

```bash
curl "https://api-dev.dietbox.me/v2/perfil" \
     -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Listar Pacientes

```bash
curl "https://api-dev.dietbox.me/v2/paciente" \
     -H "Authorization: Bearer SEU_TOKEN"
```

### 4. Criar um Paciente

```bash
curl -X POST "https://api-dev.dietbox.me/v2/paciente" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "Name": "João Silva",
       "Email": "joao@email.com",
       "Phone": "+5511999999999",
       "RecipeAccess": "full",
       "ComplementAccess": "full"
     }'
```

### 5. Consultar Agenda

```bash
curl "https://api-dev.dietbox.me/v2/agenda?start=2024-01-01&end=2024-01-31" \
     -H "Authorization: Bearer SEU_TOKEN"
```

### Endpoints Mais Usados

| Endpoint | Descrição |
|----------|-----------|
| `GET /v2/perfil` | Perfil do nutricionista |
| `GET /v2/paciente` | Listar pacientes |
| `POST /v2/paciente` | Criar paciente |
| `GET /v2/agenda` | Listar consultas da agenda |
| `POST /v2/agenda` | Criar nova consulta |
| `GET /v2/anthropometries` | Listar avaliações antropométricas |
| `POST /v2/anthropometries` | Criar avaliação antropométrica |
| `GET /v2/finance/transactions` | Listar transações financeiras |
| `GET /v2/chat` | Listar conversas do chat |
| `POST /v2/chat/mensagem` | Enviar mensagem |
| `GET /v2/notes` | Listar notas do nutricionista |
| `GET /v2/meta` | Listar metas dos pacientes |
| `GET /v2/prescription` | Listar prescrições |

---

## Endpoints por Tag

### Account

**Total:** 1 endpoint(s)

#### `PATCH /v2/account/email`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  NewEmail?: string
  NutritionistId?: integer(int64)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/account/email" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Agenda

**Total:** 12 endpoint(s)

#### `GET /v2/agenda`

**Parâmetros:**

  - `Start` (query) *opc.* `string(date-time)` — 
  - `End` (query) *opc.* `string(date-time)` — 
  - `Timezone` (query) **obrig.** `integer(int32)` — 
  - `IdLocalAtendimento` (query) *opc.* `string` — 
  - `ShowReturnPrevision` (query) *opc.* `boolean` — 
  - `ShowBirthdaysOnTheCalendar` (query) *opc.* `boolean` — 
  - `ShowGoogleEvents` (query) *opc.* `boolean` — 
  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `VerifiedByPatient` (query) *opc.* `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/agenda`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{ ... campos complexos ... }
```

**Respostas:**

- `201` — Created
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/agenda/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/agenda/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{ ... campos complexos ... }
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/agenda/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/agenda/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/agenda/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/agenda/horarios-disponiveis`

**Parâmetros:**

  - `IdNutricionista` (query) *opc.* `integer(int64)` — 
  - `IdLocalAtendimento` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Disponivel?: boolean
  Horario?: string(date-time)
  HorarioFim?: string(date-time)
}>
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/horarios-disponiveis" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/agenda/{id}/enviar-lembrete`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda/{id}/enviar-lembrete" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/agenda/{id}/solicitar-confirmacao`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda/{id}/solicitar-confirmacao" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/agenda/{id}/exception`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  RecurrenceId?: string
  Start?: string(date-time)
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda/{id}/exception" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/agenda/{id}/dates`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Start?: string(date-time)
  End?: string(date-time)
  AllDay?: boolean
  Type?: string(int32)[Consulta|PrevisaoDeRetorno|Retorno|Aniversario|Outro]
}
```

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/agenda/{id}/dates" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/agenda/summary`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/summary" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/agenda/timezones`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/timezones" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### AgendaGoogle

**Total:** 7 endpoint(s)

#### `GET /v2/agenda/google/connect`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/google/connect" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/agenda/google/callback`

**Parâmetros:**

  - `code` (query) *opc.* `string` — 
  - `state` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/google/callback" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/agenda/google/webhook`

**Parâmetros:**

  - `code` (query) *opc.* `string` — 
  - `state` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda/google/webhook" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/agenda/google/disconnect`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agenda/google/disconnect" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/agenda/google`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/google" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/agenda/google/calendars`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agenda/google/calendars" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/agenda/google/calendar`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  CalendarId?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/agenda/google/calendar" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Agua

**Total:** 3 endpoint(s)

#### `GET /v2/agua/{patientId}`

**Parâmetros:**

  - `patientId` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/agua/{patientId}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/agua/{patientId}`

**Parâmetros:**

  - `patientId` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/agua/{patientId}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/agua`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  id?: string
  inicio?: string(date-time)
  fim?: string(date-time)
  intervalo?: integer(int32)
  idPatient?: integer(int64)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/agua" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Anamnesis

**Total:** 10 endpoint(s)

#### `PUT /v2/anamneses`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  Id?: string
  PatientId?: integer(int64)
  Description?: string
  Date?: string(date-time)
  Notes?: string
  IsEatingOutside?: boolean
  WhichMealIsEatingOutside?: string
  IsConsumingAlcoholicDrinks?: boolean
  FrequencyOfDrinking?: string
  QuantityOfDrinking?: string
  IsSmoking?: boolean
  FrequencyOfSmoking?: string
  QuantityOfSmoking?: string
  HasDiabetes?: boolean
  HasOsteoporosis?: boolean
  HasEndocrine?: boolean
  HasHypertension?: boolean
  HasHeartCondition?: boolean
  HasCirculatoryProblems?: boolean
  HasDyslipidemia?: boolean
  ... (171 more fields)
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Anamnesis?: object{...}
  WasAnamnesisLimitExceeded?: boolean
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/anamneses" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/anamneses/bases`

**Parâmetros:**

  - `PatientId` (query) *opc.* `integer(int64)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Search` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/bases" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anamneses/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/anamneses/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Anamnesis?: object{...}
  WasAnamnesisLimitExceeded?: boolean
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/anamneses/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anamneses/{id}/text`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Id?: string
  Text?: string
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/{id}/text" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anamneses/last/patient/{patientId}`

**Parâmetros:**

  - `patientId` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/last/patient/{patientId}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anamneses/last/patient/{patientId}/symptoms`

**Parâmetros:**

  - `patientId` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/last/patient/{patientId}/symptoms" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anamneses/{id}/files`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Name?: string
  SignedUri?: string
}>
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamneses/{id}/files" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/anamneses/{id}/metabolic-tracking-form`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/anamneses/{id}/metabolic-tracking-form" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/anamneses/{id}/metabolic-tracking-form/cancel`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/anamneses/{id}/metabolic-tracking-form/cancel" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### AnamnesisModel

**Total:** 4 endpoint(s)

#### `GET /v2/anamnesis-models`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `SearchFilter` (query) *opc.* `string(int32)[All|Mine|Dietbox]` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamnesis-models" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/anamnesis-models`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  Title?: string
  Text?: string
  IsPublic?: boolean
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  WasAnamnesisModelLimitExceeded?: boolean
  AnamnesisModel?: object{...}
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/anamnesis-models" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/anamnesis-models/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anamnesis-models/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/anamnesis-models/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/anamnesis-models/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Anthropometry

**Total:** 14 endpoint(s)

#### `GET /v2/anthropometries`

**Parâmetros:**

  - `idPatient` (query) **obrig.** `integer(int64)` — 
  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `disponivelApp` (query) *opc.* `boolean` — 
  - `tipo` (query) *opc.* `integer(int32)` — 
  - `tipoComposicao` (query) *opc.* `string(int32)[Bioimpedancia|Dobras|Todas]` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  data?: array<object{...}>
  total?: integer(int32)
  totalApp?: integer(int32)
  skip?: integer(int32)
  take?: integer(int32)
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/anthropometries`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  item?: string
  files?: array<string(binary)>
  images?: array<string(binary)>
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  id?: string
  limiteDeAntropometria?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/anthropometries" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/anthropometries/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/anthropometries/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  item?: string
  files?: array<string(binary)>
  images?: array<string(binary)>
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  id?: string
  limiteDeAntropometria?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/anthropometries/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/anthropometries/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  limiteDeAntropometria?: string
  success?: boolean
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/anthropometries/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/latest`

**Parâmetros:**

  - `patientId` (query) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/latest" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/gestation-initial-data`

**Parâmetros:**

  - `patientId` (query) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  pesoPreGestacional?: number(double)
  dataUltimaMenstruacao?: string(date-time)
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/gestation-initial-data" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/chart`

**Parâmetros:**

  - `idPatient` (query) *opc.* `integer(int64)` — 
  - `tipo` (query) *opc.* `integer(int32)` — 
  - `tipoComposicao` (query) *opc.* `string(int32)[Bioimpedancia|Dobras|Todas]` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/chart" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/{id}/attachments`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  files?: array<object{...}>
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/{id}/attachments" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/anthropometries/{id}/attachments/{fileName}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `fileName` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  success?: boolean
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/anthropometries/{id}/attachments/{fileName}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/{id}/photos`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  photos?: array<object{...}>
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/{id}/photos" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/anthropometries/{id}/photos/{fileName}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `fileName` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  success?: boolean
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/anthropometries/{id}/photos/{fileName}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/anthropometries/db360/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/anthropometries/db360/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/anthropometries/db360`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  PatientId*: integer(int64)
  Height*: number(double)
  Age*: integer(int32)
  Gender*: string
  Weight*: number(double)
  WaistCircumference?: number(double)
  HipCircumference?: number(double)
  FrontalImageBase64*: string
  LateralImageBase64*: string
  Description?: string
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `500` — Internal Server Error

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/anthropometries/db360" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Chat

**Total:** 6 endpoint(s)

#### `GET /v2/chat`

**Parâmetros:**

  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `NextPartitionKey` (query) *opc.* `string` — 
  - `NextRowKey` (query) *opc.* `string` — 
  - `Unread` (query) *opc.* `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  entities?: array<object{...}>
  nextPartitionKey?: string
  nextRowKey?: string
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/chat" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/chat/notificar`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  IdNutricionista?: integer(int64)
  Message*: string
  SendAll?: boolean
  SendEmail?: boolean
  IdPacientes?: array<integer(int64)>
  IdTags?: array<string>
  IdLocaisAtendimento?: array<string>
  File?: string(binary)
  Timestamp?: string(date-time)
  MessageType?: string
}
```

**Respostas:**

- `202` — Accepted
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/chat/notificar" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/chat/lido`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdPaciente*: integer(int64)
}
```

**Respostas:**

- `202` — Accepted
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/chat/lido" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/chat/mensagem`

**Parâmetros:**

  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `NextPartitionKey` (query) *opc.* `string` — 
  - `NextRowKey` (query) *opc.* `string` — 
  - `Update` (query) *opc.* `boolean` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  entities?: array<object{...}>
  nextPartitionKey?: string
  nextRowKey?: string
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/chat/mensagem" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/chat/mensagem`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdPaciente*: integer(int64)
  Message*: string
  Type?: string
}
```

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/chat/mensagem" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/chat/mensagem/{rowKey}`

**Parâmetros:**

  - `rowKey` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/chat/mensagem/{rowKey}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Configuration

**Total:** 2 endpoint(s)

#### `GET /v2/configurations`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/configurations" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/configurations`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{ ... campos complexos ... }
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/configurations" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### CustomizableCard

**Total:** 1 endpoint(s)

#### `GET /v2/customizable-card`

**Parâmetros:**

  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/customizable-card" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Diario

**Total:** 8 endpoint(s)

#### `GET /v2/diario`

**Parâmetros:**

  - `Date` (query) **obrig.** `string(date-time)` — 
  - `IdMeta` (query) *opc.* `string` — 
  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/diario" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/diario/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/diario/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/diario/{id}/like`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/diario/{id}/like" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/diario/{id}/dislike`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/diario/{id}/dislike" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/diario/{id}/comentario`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `IdPaciente` (query) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/diario/{id}/comentario" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/diario/{id}/comentario`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  PacienteName*: string
  Message*: string
}
```

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/diario/{id}/comentario" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/diario/{id}/comentario/{rowKey}/edita`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `rowKey` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  NovaMensagem?: string
}
```

**Respostas:**

- `202` — Accepted
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/diario/{id}/comentario/{rowKey}/edita" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/diario/{id}/comentario/{idComentario}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `idComentario` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/diario/{id}/comentario/{idComentario}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### EnergyExpenditure

**Total:** 7 endpoint(s)

#### `GET /v2/energy-expenditure`

**Parâmetros:**

  - `patientId` (query) *opc.* `integer(int64)` — 
  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/energy-expenditure" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/energy-expenditure`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  id?: string
  tipo?: string(int32)[Adult|Pregnant|Child|Athlete|Elder]
  idPatient?: integer(int64)
  peso?: number(double)
  altura?: number(double)
  data?: string(date-time)
  protocolo?: string(int32)[HarrisBenedict|FAOOMS2001|FAOOMS1985|EER|Cunningham]
  atividadeFisica?: number(double)
  descricao?: string
  subprotocolo?: integer(int32)
  subprotocoloSemanal?: integer(int32)
  massaMagra?: number(double)
  fatorInjuria?: number(double)
  idFatorInjuria?: string
  pesoVenta?: number(double)
  diasVenta?: integer(int32)
  AtividadesFisicasPraticadas?: array<{
  idAtividadeFisica?: string
  duracao?: integer(int32)
  frequencia?: integer(int32)
  frequenciaTipo?: integer(int32)
}>
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/energy-expenditure" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/energy-expenditure/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/energy-expenditure/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/energy-expenditure/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/energy-expenditure/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/energy-expenditure/physical-activities-list`

**Parâmetros:**

  - `search` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/energy-expenditure/physical-activities-list" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/energy-expenditure/last`

**Parâmetros:**

  - `patientId` (query) *opc.* `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/energy-expenditure/last" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/energy-expenditure/physical-activities`

**Parâmetros:**

  - `protocolo` (query) *opc.* `string(int32)[HarrisBenedict|FAOOMS2001|FAOOMS1985|EER|Cunningham]` — 
  - `masculino` (query) *opc.* `boolean` — 
  - `idade` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/energy-expenditure/physical-activities" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Especialidade

**Total:** 1 endpoint(s)

#### `GET /v2/especialidade`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  id?: string
  nome?: string
}>
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/especialidade" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Extensions

**Total:** 2 endpoint(s)

#### `GET /v2/extensions`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/extensions" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/extensions/nutritionist`

**Parâmetros:**

  - `nutritionist_id` (query) *opc.* `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/extensions/nutritionist" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### ExternalVoucher

**Total:** 1 endpoint(s)

#### `GET /v2/external-voucher`

**Parâmetros:**

  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/external-voucher" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Feed

**Total:** 3 endpoint(s)

#### `GET /v2/feed`

**Parâmetros:**

  - `Timezone` (query) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Chat?: array<object{...}>
  Diario?: array<object{...}>
  Geral?: array<object{...}>
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/feed" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/feed/chat`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/feed/chat" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/feed/general`

**Parâmetros:**

  - `Timezone` (query) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/feed/general" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### File

**Total:** 1 endpoint(s)

#### `GET /v2/file/{id}/{fileName}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `fileName` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: string
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/file/{id}/{fileName}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Finance

**Total:** 16 endpoint(s)

#### `GET /v2/finance/transactions/latest`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions/latest" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/transactions/next`

**Parâmetros:**

  - `idPatient` (query) *opc.* `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions/next" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/transactions/by-patient`

**Parâmetros:**

  - `idPatient` (query) *opc.* `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions/by-patient" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/transactions/by-appointment`

**Parâmetros:**

  - `appointmentId` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions/by-appointment" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/transactions`

**Parâmetros:**

  - `NutritionistId` (query) *opc.* `integer(int64)` — 
  - `StartDate` (query) *opc.* `string(date-time)` — 
  - `EndDate` (query) *opc.* `string(date-time)` — 
  - `Type` (query) *opc.* `integer(int32)` — 
  - `Paid` (query) *opc.* `boolean` — 
  - `Category` (query) *opc.* `string` — 
  - `Start` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/finance/transactions`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{ ... campos complexos ... }
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/finance/transactions" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/finance/transactions/totals/month`

**Parâmetros:**

  - `startDate` (query) *opc.* `string(date-time)` — 
  - `endDate` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/transactions/totals/month" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/patients/debtors`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/patients/debtors" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/accounts`

**Parâmetros:**

  - `referenceDate` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/accounts" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/finance/accounts`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{ ... campos complexos ... }
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/finance/accounts" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/finance/accounts/cache`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/accounts/cache" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/cashflow/{year}`

**Parâmetros:**

  - `year` (path) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/cashflow/{year}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/categories`

**Parâmetros:**

  - `start` (query) *opc.* `string(date-time)` — 
  - `end` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/categories" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/entries-outputs`

**Parâmetros:**

  - `start` (query) *opc.* `string(date-time)` — 
  - `end` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/entries-outputs" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/finance/totals/receivable-payable`

**Parâmetros:**

  - `start` (query) *opc.* `string(date-time)` — 
  - `end` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/finance/totals/receivable-payable" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/finance/transactions/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/finance/transactions/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Formulas

**Total:** 26 endpoint(s)

#### `GET /v2/formulas/pregnancy-weight-assessment`

**Parâmetros:**

  - `pesoInicioGestacao` (query) **obrig.** `number(double)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `pesoAtual` (query) **obrig.** `number(double)` — 
  - `semanaDeGestacao` (query) **obrig.** `integer(int32)` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `protocoloGanhoPeso` (query) **obrig.** `string` — 
  - `gestacaoGemelar` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/pregnancy-weight-assessment" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/skeletal-muscle-situation`

**Parâmetros:**

  - `musculoEsqueletico` (query) **obrig.** `number(double)` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/skeletal-muscle-situation" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/gestational-age`

**Parâmetros:**

  - `dataUltimaMenstruacao` (query) **obrig.** `string(date-time)` — 
  - `dataAntropometria` (query) **obrig.** `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/gestational-age" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/child-assessment`

**Parâmetros:**

  - `idade` (query) **obrig.** `integer(int32)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `peso` (query) **obrig.** `number(double)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/child-assessment" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/weight-height-charts`

**Parâmetros:**

  - `idade` (query) **obrig.** `integer(int32)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `peso` (query) **obrig.** `number(double)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/weight-height-charts" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/weight-age-charts`

**Parâmetros:**

  - `idade` (query) **obrig.** `integer(int32)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `peso` (query) **obrig.** `number(double)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/weight-age-charts" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/height-age-charts`

**Parâmetros:**

  - `idade` (query) **obrig.** `integer(int32)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `peso` (query) **obrig.** `number(double)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/height-age-charts" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/bmi-chart`

**Parâmetros:**

  - `idade` (query) **obrig.** `integer(int32)` — 
  - `altura` (query) **obrig.** `number(double)` — 
  - `peso` (query) **obrig.** `number(double)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/bmi-chart" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/bmi`

**Parâmetros:**

  - `weight` (query) **obrig.** `number(double)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/bmi" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/bmi-situation`

**Parâmetros:**

  - `imc` (query) **obrig.** `number(double)` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/bmi-situation" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/waist-risk`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `cintura` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/waist-risk" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/elderly-malnutrition`

**Parâmetros:**

  - `panturrilha` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/elderly-malnutrition" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/waist-hip-ratio`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `cintura` (query) **obrig.** `number(double)` — 
  - `quadril` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/waist-hip-ratio" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/ideal-weight`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/ideal-weight" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/caloric-needs`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `weight` (query) **obrig.** `number(double)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `age` (query) **obrig.** `integer(int32)` — 
  - `atividade` (query) *opc.* `number(double)` — 
  - `protocolo` (query) *opc.* `string` — 
  - `subprotocolo` (query) *opc.* `integer(int32)` — 
  - `massaMagra` (query) *opc.* `number(double)` — 
  - `gastosDetalhados` (query) *opc.* `number(double)` — 
  - `fatorInjuria` (query) *opc.* `number(double)` — 
  - `subprotocoloSemanal` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/caloric-needs" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/rule-of-thumb`

**Parâmetros:**

  - `weight` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/rule-of-thumb" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/total-caloric-needs`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `weight` (query) **obrig.** `number(double)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `age` (query) **obrig.** `integer(int32)` — 
  - `atividade` (query) *opc.* `number(double)` — 
  - `protocolo` (query) *opc.* `string` — 
  - `subprotocolo` (query) *opc.* `integer(int32)` — 
  - `massaMagra` (query) *opc.* `number(double)` — 
  - `gastosDetalhados` (query) *opc.* `number(double)` — 
  - `fatorInjuria` (query) *opc.* `number(double)` — 
  - `subprotocoloSemanal` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/total-caloric-needs" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/bone-diameter`

**Parâmetros:**

  - `numeroDePregas` (query) **obrig.** `integer(int32)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `age` (query) **obrig.** `integer(int32)` — 
  - `weight` (query) **obrig.** `number(double)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `punho` (query) *opc.* `number(double)` — 
  - `femur` (query) *opc.* `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/bone-diameter" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/mass-and-weights`

**Parâmetros:**

  - `numeroDePregas` (query) **obrig.** `string` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `age` (query) **obrig.** `integer(int32)` — 
  - `weight` (query) **obrig.** `number(double)` — 
  - `height` (query) **obrig.** `number(double)` — 
  - `torax` (query) *opc.* `number(double)` — 
  - `axilamedia` (query) *opc.* `number(double)` — 
  - `triceps` (query) *opc.* `number(double)` — 
  - `subescapular` (query) *opc.* `number(double)` — 
  - `abdominal` (query) *opc.* `number(double)` — 
  - `suprailiaca` (query) *opc.* `number(double)` — 
  - `coxaDobra` (query) *opc.* `number(double)` — 
  - `biceps` (query) *opc.* `number(double)` — 
  - `panturrilhaMedial` (query) *opc.* `number(double)` — 
  - `punho` (query) *opc.* `number(double)` — 
  - `femur` (query) *opc.* `number(double)` — 
  - `abdomen` (query) *opc.* `number(double)` — 
  - `abdomen2` (query) *opc.* `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/mass-and-weights" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/mass-situation`

**Parâmetros:**

  - `percentual` (query) **obrig.** `number(double)` — 
  - `age` (query) **obrig.** `integer(int32)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/mass-situation" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/lab-assessment-reference`

**Parâmetros:**

  - `field` (query) **obrig.** `string` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `masculino` (query) **obrig.** `boolean` — 
  - `value` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/lab-assessment-reference" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/physical-activity-energy-expenditure`

**Parâmetros:**

  - `peso` (query) **obrig.** `number(double)` — 
  - `met` (query) **obrig.** `number(double)` — 
  - `duracao` (query) **obrig.** `integer(int32)` — 
  - `frequencia` (query) **obrig.** `integer(int32)` — 
  - `frequenciaTipo` (query) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/physical-activity-energy-expenditure" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/knee-height`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `kneeHeight` (query) **obrig.** `number(double)` — 
  - `panturrilha` (query) **obrig.** `number(double)` — 
  - `braco` (query) **obrig.** `number(double)` — 
  - `subescapular` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/knee-height" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/arm-area`

**Parâmetros:**

  - `masculino` (query) **obrig.** `boolean` — 
  - `idade` (query) **obrig.** `integer(int32)` — 
  - `bracorelaxado` (query) **obrig.** `number(double)` — 
  - `triceps` (query) **obrig.** `number(double)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/arm-area" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/bristol-scale`

**Parâmetros:**

  - `escala` (query) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/bristol-scale" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/formulas/stool-color`

**Parâmetros:**

  - `cor` (query) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/formulas/stool-color" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### GiftConfiguration

**Total:** 1 endpoint(s)

#### `GET /v2/gift-configuration`

**Parâmetros:**

  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `date` (query) *opc.* `string(date-time)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/gift-configuration" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### LocalAtendimento

**Total:** 4 endpoint(s)

#### `GET /v2/local-atendimento`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/local-atendimento" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/local-atendimento/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/local-atendimento/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/local-atendimento/{id}/servicos`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  id?: string
  titulo?: string
  descricao?: string
  valor?: number(double)
}>
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/local-atendimento/{id}/servicos" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/local-atendimento/{id}/servico/{idServico}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `idServico` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  id?: string
  titulo?: string
  descricao?: string
  valor?: number(double)
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/local-atendimento/{id}/servico/{idServico}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Materiais

**Total:** 7 endpoint(s)

#### `GET /v2/materiais/laminas`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `Tags[]` (query) *opc.* `array<string>` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/materiais/laminas" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/materiais`

**Parâmetros:**

  - `Titulo` (query) *opc.* `string` — 
  - `Tipo` (query) *opc.* `string(int32)[Texto|Arquivo|Link|Lamina]` — 
  - `Tags[]` (query) *opc.* `array<string>` — 
  - `Model` (query) *opc.* `string(int32)[All|Mine|Dietbox|Extension]` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/materiais" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/materiais`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  IdNutricionista?: integer(int64)
  Titulo?: string
  Tipo?: string(int32)[Texto|Arquivo|Link|Lamina]
  Url?: string
  Texto?: string
  File?: string(binary)
  IdTags?: array<string>
  IsTrial?: boolean
  Count?: integer(int32)
  Timestamp?: string(date-time)
  MessageType?: string
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  ReachedLimit?: boolean
  Material?: object{...}
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/materiais" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/materiais/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/materiais/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/materiais/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  IdMaterial?: string
  IdNutricionista?: integer(int64)
  Titulo?: string
  Tipo?: string(int32)[Texto|Arquivo|Link|Lamina]
  Url?: string
  Texto?: string
  File?: string(binary)
  IdTags?: array<string>
  Timestamp?: string(date-time)
  MessageType?: string
}
```

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/materiais/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/materiais/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  ReachedLimit?: boolean
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/materiais/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/materiais/paciente/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/materiais/paciente/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Meta

**Total:** 7 endpoint(s)

#### `GET /v2/meta`

**Parâmetros:**

  - `Search` (query) *opc.* `string(int32)[Dietbox|Mine]` — 
  - `Nome` (query) *opc.* `string` — 
  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/meta" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/meta`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Nome?: string
  Descricao?: string
  Icone?: string
  Objetivo?: number(double)
  Unidade?: string
  Frequencia?: string(int32)[Diaria|Semanal|Mensal]
  Ativo?: boolean
  IdPaciente?: integer(int64)
}
```

**Respostas:**

- `201` — Created
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/meta" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/meta/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/meta/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/meta/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Nome?: string
  Descricao?: string
  Icone?: string
  Objetivo?: number(double)
  Unidade?: string
  Frequencia?: string(int32)[Diaria|Semanal|Mensal]
  Ativo?: boolean
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/meta/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/meta/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/meta/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/meta/progresso`

**Parâmetros:**

  - `IdPaciente` (query) **obrig.** `integer(int64)` — 
  - `Timezone` (query) **obrig.** `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/meta/progresso" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/meta/{id}/historico`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `IdPaciente` (query) *opc.* `integer(int64)` — 
  - `Timezone` (query) **obrig.** `integer(int32)` — 
  - `Ano` (query) **obrig.** `integer(int32)` — 
  - `Mes` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Dia?: integer(int32)
  Semana?: integer(int32)
  Mes?: integer(int32)
  Ano?: integer(int32)
  Atingido?: boolean
}>
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/meta/{id}/historico" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### News

**Total:** 2 endpoint(s)

#### `GET /v2/news`

**Parâmetros:**

  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `OnlyActive` (query) *opc.* `boolean` — 
  - `OnlyFeatured` (query) *opc.* `boolean` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
  errors?: {

}
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/news" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/news/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string(uuid)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
  errors?: {

}
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/news/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Nutritionist

**Total:** 14 endpoint(s)

#### `PUT /v2/nutritionist/cancellation-reason`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Reason?: string
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/nutritionist/cancellation-reason" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/nutritionist/images`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Name?: string
  Size?: integer(int64)
  Uri?: string
}>
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/images" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/nutritionist/checklist`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Value?: any
  Code?: any
}
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/checklist" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/nutritionist/features`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Name?: string
  Enabled?: boolean
}>
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/features" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/nutritionist/base-info`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/base-info" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/nutritionist/enrollment-verification`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  file?: string(binary)
}
```

**Respostas:**

- `202` — Accepted

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/nutritionist/enrollment-verification" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/nutritionist/electronic-signature`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Font?: string(int32)[Caveat|LeckerliOne|Lexend|LibreCaslon|MarckScript]
  Text?: string
  NutritionistId?: integer(int64)
  Url?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/electronic-signature" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/nutritionist/electronic-signature`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`multipart/form-data`):

```json
{
  Font?: string(int32)[Caveat|LeckerliOne|Lexend|LibreCaslon|MarckScript]
  Text?: string
  ElectronicSignatureFile?: string(binary)
  Timestamp?: string(date-time)
  MessageType?: string
}
```

**Respostas:**

- `202` — Accepted

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/nutritionist/electronic-signature" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/nutritionist/electronic-signature`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/nutritionist/electronic-signature" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/nutritionist/subscription`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/subscription" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/nutritionist/product-fruits`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/product-fruits" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/nutritionist/stream`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Prompt?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/nutritionist/stream" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/nutritionist/upload-url`

**Parâmetros:**

  - `type` (query) *opc.* `string` — 
  - `fileName` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  UploadUrl?: string
  BlobPath?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/nutritionist/upload-url" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/nutritionist/logo`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/nutritionist/logo" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### NutritionistNotes

**Total:** 8 endpoint(s)

#### `GET /v2/notes`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `Completed` (query) *opc.* `boolean` — 
  - `Pinned` (query) *opc.* `boolean` — 
  - `Type` (query) *opc.* `string(int32)[Note|Task]` — 
  - `Priority` (query) *opc.* `string(int32)[None|Low|Medium|High]` — 
  - `StartAt` (query) *opc.* `string(date-time)` — 
  - `EndAt` (query) *opc.* `string(date-time)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/notes" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/notes`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Text?: string
  Description?: string
  Date?: string(date-time)
  Type?: string(int32)[Note|Task]
  Priority?: string(int32)[None|Low|Medium|High]
  Pinned?: boolean
  Completed?: boolean
}
```

**Respostas:**

- `201` — Created
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/notes" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/notes/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/notes/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/notes/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Text?: string
  Description?: string
  Date?: string(date-time)
  Priority?: string(int32)[None|Low|Medium|High]
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/notes/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/notes/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/notes/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/notes/{id}/completed`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Completed?: boolean
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/notes/{id}/completed" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/notes/{id}/pinned`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Pinned?: boolean
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/notes/{id}/pinned" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/notes/{id}/priority`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Priority?: string(int32)[None|Low|Medium|High]
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/notes/{id}/priority" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Opiniao

**Total:** 2 endpoint(s)

#### `GET /v2/opiniao`

**Parâmetros:**

  - `Nome` (query) *opc.* `string` — 
  - `Nota` (query) *opc.* `integer(int32)` — 
  - `ComResposta` (query) *opc.* `boolean` — 
  - `OrdemMelhoresParaPiores` (query) *opc.* `boolean` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/opiniao" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/opiniao/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdOpiniao?: string
  Resposta*: string
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/opiniao/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### PCQ

**Total:** 7 endpoint(s)

#### `GET /v2/pcq/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcq/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/pcq/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/pcq/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/pcq`

**Parâmetros:**

  - `idPatient` (query) *opc.* `integer(int32)` — 
  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcq" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/pcq`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  PatientId?: integer(int64)
  Description?: string
  Questions?: string
  IsPending?: boolean
  Date?: string(date-time)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/pcq" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/pcq`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  PatientId?: integer(int64)
  Description?: string
  Questions?: string
  Date?: string(date-time)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/pcq" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/pcq/completion-request`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/pcq/completion-request" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/pcq/{id}/print`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcq/{id}/print" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### PCQModel

**Total:** 7 endpoint(s)

#### `GET /v2/pcqmodel`

**Parâmetros:**

  - `search` (query) *opc.* `string` — 
  - `modelo` (query) *opc.* `string(int32)[All|Mine|Dietbox]` — 
  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcqmodel" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/pcqmodel`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Deleted?: boolean
  Description?: string
  Questions?: string
  NutritionistId?: integer(int64)
  Public?: boolean
  Country?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/pcqmodel" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/pcqmodel`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  Deleted?: boolean
  Description?: string
  Questions?: string
  Public?: boolean
  Country?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/pcqmodel" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/pcqmodel/combo`

**Parâmetros:**

  - `search` (query) *opc.* `string` — 
  - `skip` (query) *opc.* `integer(int32)` — 
  - `take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcqmodel/combo" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/pcqmodel/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcqmodel/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/pcqmodel/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/pcqmodel/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/pcqmodel/{id}/questions`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pcqmodel/{id}/questions" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Paciente

**Total:** 12 endpoint(s)

#### `GET /v2/paciente`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `IdLocalAtendimento` (query) *opc.* `string` — 
  - `Order` (query) *opc.* `string(int32)[name|appointment|created]` — 
  - `IsActive` (query) *opc.* `boolean` — 
  - `Tags` (query) *opc.* `array<string>` — 
  - `Start` (query) *opc.* `string(date-time)` — 
  - `End` (query) *opc.* `string(date-time)` — 
  - `Sort` (query) *opc.* `string(int32)[Ascending|Descending]` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/paciente" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/paciente`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Name?: string
  Email?: string
  MaritalStatus?: string(int32)[Solteiro|Casado|Separado|Viuvo]
  Cpf?: string
  Gender?: boolean
  Pregnant?: boolean
  Birthday?: string(date-time)
  BirthForecast?: string(date-time)
  Occupancy?: string
  Phone?: string
  MobilePhone?: string
  Address?: string
  Number?: string
  Complement?: string
  Neighborhood?: string
  State?: string
  City?: string
  Cep?: string
  Tags?: array<string>
  IdLocalAtendimento?: string
  ... (4 more fields)
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/paciente" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/paciente/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/paciente/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/paciente/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Name?: string
  Email?: string
  MaritalStatus?: string(int32)[Solteiro|Casado|Separado|Viuvo]
  Cpf?: string
  Gender?: boolean
  Pregnant?: boolean
  Birthday?: string(date-time)
  BirthForecast?: string(date-time)
  Occupancy?: string
  Phone?: string
  MobilePhone?: string
  Address?: string
  Number?: string
  Complement?: string
  Neighborhood?: string
  State?: string
  City?: string
  Cep?: string
  Tags?: array<string>
  IdLocalAtendimento?: string
  ... (5 more fields)
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/paciente/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/paciente/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/paciente/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/paciente/{id}/prontuario`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/paciente/{id}/prontuario" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/paciente/{id}/prontuario`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Prontuario?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/paciente/{id}/prontuario" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/paciente/{id}/celular`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: integer(int64)
  MobilePhone?: string
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `409` — Conflict
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/paciente/{id}/celular" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/paciente/{id}/tem-aplicativo`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  boolean
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/paciente/{id}/tem-aplicativo" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/paciente/materiais`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdPaciente*: integer(int64)
  MaterialAccess*: string
  IdMateriais?: array<string>
  ExtensionsId?: array<integer(int64)>
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/paciente/materiais" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/paciente/{patientId}/active`

**Parâmetros:**

  - `patientId` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Active?: boolean
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/paciente/{patientId}/active" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/paciente/{id}/delete-registrations-hub`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/paciente/{id}/delete-registrations-hub" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Patient

**Total:** 6 endpoint(s)

#### `GET /v2/patients`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `IsActive` (query) *opc.* `boolean` — 
  - `ServiceLocationId` (query) *opc.* `string` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `TagsIds` (query) *opc.* `array<string>` — 
  - `OrderBy` (query) *opc.* `string[Name|LastAppointment|CreatedAt]` — 
  - `SortDirection` (query) *opc.* `string(int32)[Ascending|Descending]` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/patients" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/patients`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: integer(int64)
  Name?: string
  Email?: string
  IsMale?: boolean
  Birthdate?: string(date-time)
  BirthForecastDate?: string(date-time)
  IsPregnant?: boolean
  Occupation?: string
  Phone?: string
  MobilePhone?: string
  City?: string
  State?: string
  Observation?: string
  IsActive?: boolean
  HeightInMeters?: number(double)
  MedicalRecord?: string
  HasAccessToAllRecipes?: boolean
  HasAccessToAllComplementaryInfo?: boolean
  DocumentNumber?: string
  NeedPassword?: boolean
  ... (10 more fields)
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/patients" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/patients/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```
- `404` — Not Found
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/patients/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/patients/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/patients/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/patients/{id}/recipes`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  RecipesIds?: array<string>
  RecipeAccess?: string
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/patients/{id}/recipes" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/patients/{id}/replacement-lists`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  ReplacementListsIds?: array<string>
}
```

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/patients/{id}/replacement-lists" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Perfil

**Total:** 3 endpoint(s)

#### `GET /v2/perfil`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/perfil" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/perfil`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Name*: string
  CRN?: string
  CRM?: string
  Phone?: string
  Website?: string
  DeleteSearch*: boolean
  UniversityId?: string
  OtherUniversity?: string
  Especialidades?: array<string>
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/perfil" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/perfil/ativar-assinatura-estudante`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  id_universidade?: string
  another_university?: string
  abbreviation_university?: string
  graduation_month?: integer(int32)
  graduation_year?: integer(int32)
}
```

**Respostas:**

- `202` — Accepted
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/perfil/ativar-assinatura-estudante" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### PlanoAlimentar

**Total:** 1 endpoint(s)

#### `GET /v2/plano-alimentar/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/plano-alimentar/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### PreAgendamento

**Total:** 3 endpoint(s)

#### `GET /v2/pre-agendamento/pendencias`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  (schema complexo — ver spec)
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/pre-agendamento/pendencias" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/pre-agendamento/{id}/confirmar`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/pre-agendamento/{id}/confirmar" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/pre-agendamento/{id}/rejeitar`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/pre-agendamento/{id}/rejeitar" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Prescription

**Total:** 18 endpoint(s)

#### `GET /v2/prescription`

**Parâmetros:**

  - `PatientId` (query) *opc.* `integer(int64)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  TotalItems?: integer(int32)
  TotalPages?: integer(int32)
  Items?: array<object{...}>
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/prescription" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/prescription`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Title?: string
  Date?: string(date-time)
  Description?: string
  PatientId?: integer(int64)
  Posology?: string
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Id?: string
  PatientId?: integer(int64)
  Title?: string
  Date?: string(date-time)
  UpdatedAt?: string(date-time)
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/prescription/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/prescription/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PUT /v2/prescription/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Title?: string
  Date?: string(date-time)
  Description?: string
  Posology?: string
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/prescription/{id}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/prescription/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/prescription/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/prescription/{id}/set-available-on-app`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  AvailableOnApp?: boolean
}
```

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/prescription/{id}/set-available-on-app" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PATCH /v2/prescription/{id}/set-type`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  Type?: string(int32)[Default|FreeText]
}
```

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/prescription/{id}/set-type" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/prescription/{id}/supplement`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdLiahProduct?: string
  IdCustomSupplement?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/supplement" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/prescription/{id}/supplement/batch`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  LiahSupplements?: array<{
  IdLiahProduct?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}>
  DbSupplements?: array<{
  IdSupplement?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}>
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/supplement/batch" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/prescription/{id}/supplement/personalized`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdSupplement?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/supplement/personalized" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/prescription/{id}/supplement/{prescriptionSupplementId}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `prescriptionSupplementId` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdLiahProduct?: string
  IdCustomSupplement?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}
```

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/prescription/{id}/supplement/{prescriptionSupplementId}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/prescription/{id}/supplement/{prescriptionSupplementId}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `prescriptionSupplementId` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/prescription/{id}/supplement/{prescriptionSupplementId}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/prescription/{id}/herbal-remedy`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  HerbalRemedyId?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/herbal-remedy" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/prescription/{id}/herbal-remedy/batch`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  HerbalRemedies?: array<{
  HerbalRemedyId?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}>
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/herbal-remedy/batch" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/prescription/{id}/herbal-remedy/{prescriptionHerbalRemedyId}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `prescriptionHerbalRemedyId` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  HerbalRemedyId?: string
  Quantity?: number(double)
  MeasurementUnit?: string
}
```

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/prescription/{id}/herbal-remedy/{prescriptionHerbalRemedyId}" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `DELETE /v2/prescription/{id}/herbal-medicine/{prescriptionHerbalRemedyId}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `prescriptionHerbalRemedyId` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/prescription/{id}/herbal-medicine/{prescriptionHerbalRemedyId}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/prescription/{id}/save-as-model`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `201` — Created
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/save-as-model" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `POST /v2/prescription/{id}/load-model`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  IdModel?: string
}
```

**Respostas:**

- `204` — No Content
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/prescription/{id}/load-model" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Qpc

**Total:** 6 endpoint(s)

#### `GET /v2/qpc`

**Parâmetros:**

  - `PatientId` (query) *opc.* `integer(int64)` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/qpc" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/qpc`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  PatientId?: integer(int64)
  Description?: string
  Questions?: string
  IsPending?: boolean
  Date?: string(date-time)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/qpc" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/qpc`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  PatientId?: integer(int64)
  Description?: string
  Questions?: string
  IsPending?: boolean
  Date?: string(date-time)
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/qpc" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/qpc/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/qpc/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/qpc/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/qpc/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/qpc/{id}/un-complete`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/qpc/{id}/un-complete" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### QpcModel

**Total:** 5 endpoint(s)

#### `GET /v2/qpc-model`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `Model` (query) *opc.* `string(int32)[All|Mine|Dietbox]` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/qpc-model" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/qpc-model`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Description?: string
  Questions?: string
  IsPublic?: boolean
  Country?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/qpc-model" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `PUT /v2/qpc-model`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Id?: string
  Description?: string
  Questions?: string
  IsPublic?: boolean
  Country?: string
}
```

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X PUT "https://api-dev.dietbox.me/v2/qpc-model" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/qpc-model/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/qpc-model/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/qpc-model/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/qpc-model/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Supplement

**Total:** 4 endpoint(s)

#### `GET /v2/supplement`

**Parâmetros:**

  - `Name` (query) *opc.* `string` — 
  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Categories` (query) *opc.* `array<integer(int32)>` — 
  - `Brands` (query) *opc.* `array<integer(int32)>` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  LiahId?: string
  Name?: string
  PhotoUrl?: string
  AvaragePrice?: string
  Brand?: string
  Description?: string
}>
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/supplement" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/supplement/personalized`

**Parâmetros:**

  - `Skip` (query) *opc.* `integer(int32)` — 
  - `Take` (query) *opc.* `integer(int32)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Id?: string
  Name?: string
  Description?: string
  MeasureSuggest?: string
  QuantitySuggest?: number(double)
}>
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/supplement/personalized" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/supplement/brands`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Id?: string
  Brand?: string
}>
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/supplement/brands" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `GET /v2/supplement/categories`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  Id?: string
  Name?: string
  Description?: string
  MeasureSuggest?: string
  QuantitySuggest?: number(double)
}>
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/supplement/categories" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Tag

**Total:** 5 endpoint(s)

#### `GET /v2/tag`

**Parâmetros:**

  - `Search` (query) *opc.* `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: array<{
  id?: string
  nome?: string
}>
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/tag" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/tag`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Name?: string
}
```

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: string
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/tag" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/tag/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  id?: string
  nome?: string
}
}
  ```
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/tag/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/tag/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/tag/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/tag/{id}/name`

**Parâmetros:**

  - `id` (path) **obrig.** `string` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Name?: string
}
```

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/tag/{id}/name" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### Videoconferencia

**Total:** 1 endpoint(s)

#### `GET /v2/videoconferencia/token/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Token?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/videoconferencia/token/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

### Whatsapp

**Total:** 3 endpoint(s)

#### `POST /v2/whatsapp/open-connection`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Status?: string
  QrCode?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/whatsapp/open-connection" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/whatsapp/status`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: {
  Instance?: string
  Status?: string
}
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/whatsapp/status" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/whatsapp/disconnect`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
  ```
  {
  Success?: boolean
  Message?: string
  Data?: boolean
}
  ```
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/whatsapp/disconnect" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

### WhatsappTemplate

**Total:** 5 endpoint(s)

#### `GET /v2/whatsapp-templates`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/whatsapp-templates" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `POST /v2/whatsapp-templates`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Content?: string
  Type?: string[BirthdayWish|AppointmentRemember30MinutesBefore|MissYou|RequestFeedback|AppointmentCreated]
  IsActive?: boolean
}
```

**Respostas:**

- `201` — Created
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X POST "https://api-dev.dietbox.me/v2/whatsapp-templates" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

#### `GET /v2/whatsapp-templates/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `200` — OK
- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl "https://api-dev.dietbox.me/v2/whatsapp-templates/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `DELETE /v2/whatsapp-templates/{id}`

**Parâmetros:**

  - `id` (path) **obrig.** `integer(int64)` — 
  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Respostas:**

- `204` — No Content
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X DELETE "https://api-dev.dietbox.me/v2/whatsapp-templates/{id}" \
     -H "Authorization: Bearer SEU_TOKEN"
```

---

#### `PATCH /v2/whatsapp-templates/set-status-by-type`

**Parâmetros:**

  - `Accept-Language` (header) *opc.* `string[pt-BR|es-CL|es-MX]` — Lingua

**Request Body** (`application/json`):

```json
{
  Type?: string[BirthdayWish|AppointmentRemember30MinutesBefore|MissYou|RequestFeedback|AppointmentCreated]
  IsActive?: boolean
}
```

**Respostas:**

- `200` — OK
- `400` — Bad Request
  ```
  {
  type?: string
  title?: string
  status?: integer(int32)
  detail?: string
  instance?: string
}
  ```

**Exemplo:**

```bash
curl -X PATCH "https://api-dev.dietbox.me/v2/whatsapp-templates/set-status-by-type" \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
```

---

## Schemas Principais

Os schemas abaixo são os mais utilizados nos request bodies e responses da API.

### CreatePatientCommand

*Dados para criação de paciente*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Name` | `string` | Não |  |
| `Email` | `string` | Não |  |
| `MaritalStatus` | `string(int32)[Solteiro|Casado|Separado|Viuvo]` | Não |  |
| `Cpf` | `string` | Não |  |
| `Gender` | `boolean` | Não |  |
| `Pregnant` | `boolean` | Não |  |
| `Birthday` | `string(date-time)` | Não |  |
| `BirthForecast` | `string(date-time)` | Não |  |
| `Occupancy` | `string` | Não |  |
| `Phone` | `string` | Não |  |
| `MobilePhone` | `string` | Não |  |
| `Address` | `string` | Não |  |
| `Number` | `string` | Não |  |
| `Complement` | `string` | Não |  |
| `Neighborhood` | `string` | Não |  |
| `State` | `string` | Não |  |
| `City` | `string` | Não |  |
| `Cep` | `string` | Não |  |
| `Tags` | `array<string>` | Não |  |
| `IdLocalAtendimento` | `string` | Não |  |
| `RecipeAccess` | `string` | Sim |  |
| `ComplementAccess` | `string` | Sim |  |
| `Expire` | `string(date-time)` | Não |  |
| `Observation` | `string` | Não |  |

### UpdatePatientCommand

*Dados para atualização de paciente*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Name` | `string` | Não |  |
| `Email` | `string` | Não |  |
| `MaritalStatus` | `string(int32)[Solteiro|Casado|Separado|Viuvo]` | Não |  |
| `Cpf` | `string` | Não |  |
| `Gender` | `boolean` | Não |  |
| `Pregnant` | `boolean` | Não |  |
| `Birthday` | `string(date-time)` | Não |  |
| `BirthForecast` | `string(date-time)` | Não |  |
| `Occupancy` | `string` | Não |  |
| `Phone` | `string` | Não |  |
| `MobilePhone` | `string` | Não |  |
| `Address` | `string` | Não |  |
| `Number` | `string` | Não |  |
| `Complement` | `string` | Não |  |
| `Neighborhood` | `string` | Não |  |
| `State` | `string` | Não |  |
| `City` | `string` | Não |  |
| `Cep` | `string` | Não |  |
| `Tags` | `array<string>` | Não |  |
| `IdLocalAtendimento` | `string` | Não |  |
| `RecipeAccess` | `string` | Sim |  |
| `ComplementAccess` | `string` | Sim |  |
| `Expire` | `string(date-time)` | Não |  |
| `Observation` | `string` | Não |  |
| `IsActive` | `boolean` | Não |  |

### CreateAppointmentCommand

*Dados para criar consulta na agenda*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `IdRecurrence` | `string` | Não |  |
| `RecurrenceDate` | `string(date-time)` | Não |  |
| `Agenda` | `{
  Type*: string(int32)[Consulta|PrevisaoDeRetorno|Retorno|Aniversario|Outro]
  Start*: string(date-time)
  End*: string(date-time)
  Timezone*: string
  IdPaciente?: integer(int64)
  IdLocalAtendimento?: string
  IdServico?: string
  Title?: string
  Description?: string
  BirthdayPatient?: string(date-time)
  Recurrence?: string
  RecurrenceException?: string
  AllDay?: boolean
  Alert?: boolean
  Confirmed?: boolean
  ConfirmedByNutricionista?: boolean
  Unchecked?: boolean
  Blocked?: boolean
  IsOnline?: boolean
  IsVideoConference?: boolean
}` | Não |  |
| `Lancamento` | `{
  Id?: string
  IdCategoria?: string
  IdAgenda?: string
  IdFatura?: string
  IdConta?: string
  IdPaciente?: integer(int64)
  Date?: string(date-time)
  Description?: string
  Type?: string(int32)[Saida|Entrada]
  CategoryDescription?: string
  PacienteName?: string
  CPF?: string
  IsPaid?: boolean
  Value?: number(double)
}` | Não |  |

### UpdateProfileCommand

*Atualizar perfil do nutricionista*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Name` | `string` | Sim |  |
| `CRN` | `string` | Não |  |
| `CRM` | `string` | Não |  |
| `Phone` | `string` | Não |  |
| `Website` | `string` | Não |  |
| `DeleteSearch` | `boolean` | Sim |  |
| `UniversityId` | `string` | Não |  |
| `OtherUniversity` | `string` | Não |  |
| `Especialidades` | `array<string>` | Não |  |

### SaveTransactionCommand

*Salvar transação financeira*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | `string` | Não |  |
| `C__createdAt` | `string(date-time)` | Não |  |
| `C__updatedAt` | `string(date-time)` | Não |  |
| `C__version` | `string(byte)` | Não |  |
| `data` | `string(date-time)` | Não |  |
| `descricao` | `string` | Não |  |
| `observacao` | `string` | Não |  |
| `idCategoria` | `string` | Não |  |
| `idPatient` | `integer(int64)` | Não |  |
| `tipo` | `string(int32)[Saida|Entrada]` | Não |  |
| `pago` | `boolean` | Não |  |
| `valor` | `number(double)` | Não |  |
| `idConta` | `string` | Não |  |
| `idAgenda` | `string` | Não |  |
| `idfatura` | `string` | Não |  |
| `Agenda` | `{
  id?: string
  idNutritionist?: integer(int64)
  idPatient?: integer(int64)
  tipo?: string(int32)[Consulta|PrevisaoDeRetorno|Retorno|Aniversario|Outro]
  titulo?: string
  inicio?: string(date-time)
  fim?: string(date-time)
  todoDia?: boolean
  descricao?: string
  timezone?: string
  fusohorariowindows?: string
  alertar?: boolean
  C__createdAt?: string(date-time)
  C__updatedAt?: string(date-time)
  UpdatedAtAuditable?: string(date-time)
  C__version?: string(byte)
  confirmada?: boolean
  desmarcada?: boolean
  Patient?: {
  Id?: integer(int64)
  Name?: string
  Email?: string
  NutritionistId?: integer(int64)
  IsMale*: boolean
  Birthdate?: string(date-time)
  BirthForecastDate?: string(date-time)
  IsPregnant*: boolean
  Occupation?: string
  Phone?: string
  MobilePhone?: string
  City?: string
  State?: string
  Password?: string
  Observation?: string
  IsActive?: boolean
  HeightInMeters?: number(double)
  MedicalRecord?: string
  HasAccessToAllRecipes?: boolean
  HasAccessToAllComplementaryInfo?: boolean
  ... (35 more fields)
}
  Nutritionist?: {
  Id?: integer(int64)
  Name?: string
  Email*: string
  CPF?: string
  Document?: string
  IsActive?: boolean
  Trial?: boolean
  ExpiresAt?: string(date-time)
  Phone?: string
  Website?: string
  CodeReference?: string
  IuguId?: string
  MethodOfPayment?: string(int64)[PayPal|Iugu|Ebanx|TSPay]
  Crn?: string
  AffiliateId?: integer(int64)
  CancellationReason?: string
  Created?: string(date-time)
  LastLogin?: string(date-time)
  Emailconfirmado?: boolean
  LastEmailSentAt?: string(date-time)
  ... (74 more fields)
}
  ... (19 more fields)
}` | Não |  |
| `CategoriaFinanceira` | `{
  id?: string
  descricao?: string
  idNutritionist?: integer(int64)
  tipo?: string(int32)[Saida|Entrada]
  Lancamento?: array<{
  id?: string
  C__createdAt?: string(date-time)
  C__updatedAt?: string(date-time)
  UpdatedAtAuditable?: string(date-time)
  C__version?: string(byte)
  data?: string(date-time)
  descricao*: string
  observacao?: string
  idCategoria*: string
  idPatient?: integer(int64)
  tipo?: string(int32)[Saida|Entrada]
  pago?: boolean
  valor?: number(double)
  idConta*: string
  idAgenda?: string
  idfatura?: string
  Agenda?: object{...}
  CategoriaFinanceira?: CategoriaFinanceira(ref)
  Conta?: object{...}
  Patient?: object{...}
}>
}` | Não |  |
| `Conta` | `{
  id?: string
  C__createdAt?: string(date-time)
  C__version?: string(byte)
  descricao*: string
  saldo?: number(double)
  idNutritionist?: integer(int64)
  Nutritionist?: {
  Id?: integer(int64)
  Name?: string
  Email*: string
  CPF?: string
  Document?: string
  IsActive?: boolean
  Trial?: boolean
  ExpiresAt?: string(date-time)
  Phone?: string
  Website?: string
  CodeReference?: string
  IuguId?: string
  MethodOfPayment?: string(int64)[PayPal|Iugu|Ebanx|TSPay]
  Crn?: string
  AffiliateId?: integer(int64)
  CancellationReason?: string
  Created?: string(date-time)
  LastLogin?: string(date-time)
  Emailconfirmado?: boolean
  LastEmailSentAt?: string(date-time)
  ... (74 more fields)
}
  Lancamento?: array<{
  id?: string
  C__createdAt?: string(date-time)
  C__updatedAt?: string(date-time)
  UpdatedAtAuditable?: string(date-time)
  C__version?: string(byte)
  data?: string(date-time)
  descricao*: string
  observacao?: string
  idCategoria*: string
  idPatient?: integer(int64)
  tipo?: string(int32)[Saida|Entrada]
  pago?: boolean
  valor?: number(double)
  idConta*: string
  idAgenda?: string
  idfatura?: string
  Agenda?: object{...}
  CategoriaFinanceira?: object{...}
  Conta?: Conta(ref)
  Patient?: object{...}
}>
}` | Não |  |
| `Patient` | `{
  Id?: integer(int64)
  Name?: string
  Email?: string
  NutritionistId?: integer(int64)
  IsMale*: boolean
  Birthdate?: string(date-time)
  BirthForecastDate?: string(date-time)
  IsPregnant*: boolean
  Occupation?: string
  Phone?: string
  MobilePhone?: string
  City?: string
  State?: string
  Password?: string
  Observation?: string
  IsActive?: boolean
  HeightInMeters?: number(double)
  MedicalRecord?: string
  HasAccessToAllRecipes?: boolean
  HasAccessToAllComplementaryInfo?: boolean
  ... (35 more fields)
}` | Não |  |

### SaveAccountFinanceCommand

*Salvar conta financeira*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Id` | `string` | Não |  |
| `C__createdAt` | `string(date-time)` | Não |  |
| `C__version` | `string(byte)` | Não |  |
| `Descricao` | `string` | Não |  |
| `Saldo` | `number(double)` | Não |  |
| `IdNutritionist` | `integer(int64)` | Não |  |
| `Nutritionist` | `{
  Id?: integer(int64)
  Name?: string
  Email*: string
  CPF?: string
  Document?: string
  IsActive?: boolean
  Trial?: boolean
  ExpiresAt?: string(date-time)
  Phone?: string
  Website?: string
  CodeReference?: string
  IuguId?: string
  MethodOfPayment?: string(int64)[PayPal|Iugu|Ebanx|TSPay]
  Crn?: string
  AffiliateId?: integer(int64)
  CancellationReason?: string
  Created?: string(date-time)
  LastLogin?: string(date-time)
  Emailconfirmado?: boolean
  LastEmailSentAt?: string(date-time)
  ... (74 more fields)
}` | Não |  |
| `Lancamento` | `array<{
  id?: string
  C__createdAt?: string(date-time)
  C__updatedAt?: string(date-time)
  UpdatedAtAuditable?: string(date-time)
  C__version?: string(byte)
  data?: string(date-time)
  descricao*: string
  observacao?: string
  idCategoria*: string
  idPatient?: integer(int64)
  tipo?: string(int32)[Saida|Entrada]
  pago?: boolean
  valor?: number(double)
  idConta*: string
  idAgenda?: string
  idfatura?: string
  Agenda?: {
  id?: string
  idNutritionist?: integer(int64)
  idPatient?: integer(int64)
  tipo?: string(int32)[Consulta|PrevisaoDeRetorno|Retorno|Aniversario|Outro]
  titulo?: string
  inicio?: string(date-time)
  fim?: string(date-time)
  todoDia?: boolean
  descricao?: string
  timezone?: string
  fusohorariowindows?: string
  alertar?: boolean
  C__createdAt?: string(date-time)
  C__updatedAt?: string(date-time)
  UpdatedAtAuditable?: string(date-time)
  C__version?: string(byte)
  confirmada?: boolean
  desmarcada?: boolean
  Patient?: object{...}
  Nutritionist?: object{...}
  ... (19 more fields)
}
  CategoriaFinanceira?: {
  id?: string
  descricao?: string
  idNutritionist?: integer(int64)
  tipo?: string(int32)[Saida|Entrada]
  Lancamento?: array<Lancamento(ref)>
}
  Conta?: {
  id?: string
  C__createdAt?: string(date-time)
  C__version?: string(byte)
  descricao*: string
  saldo?: number(double)
  idNutritionist?: integer(int64)
  Nutritionist?: object{...}
  Lancamento?: array<Lancamento(ref)>
}
  Patient?: {
  Id?: integer(int64)
  Name?: string
  Email?: string
  NutritionistId?: integer(int64)
  IsMale*: boolean
  Birthdate?: string(date-time)
  BirthForecastDate?: string(date-time)
  IsPregnant*: boolean
  Occupation?: string
  Phone?: string
  MobilePhone?: string
  City?: string
  State?: string
  Password?: string
  Observation?: string
  IsActive?: boolean
  HeightInMeters?: number(double)
  MedicalRecord?: string
  HasAccessToAllRecipes?: boolean
  HasAccessToAllComplementaryInfo?: boolean
  ... (35 more fields)
}
}>` | Não |  |

### NutricionistaEnviarMensagemCommand

*Enviar mensagem no chat*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `IdPaciente` | `integer(int64)` | Sim |  |
| `Message` | `string` | Sim |  |
| `Type` | `string` | Não |  |

### CreateNutritionistNoteCommand

*Criar nota do nutricionista*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Text` | `string` | Não |  |
| `Description` | `string` | Não |  |
| `Date` | `string(date-time)` | Não |  |
| `Type` | `string(int32)[Note|Task]` | Não |  |
| `Priority` | `string(int32)[None|Low|Medium|High]` | Não |  |
| `Pinned` | `boolean` | Não |  |
| `Completed` | `boolean` | Não |  |

### CriarMetaCommand

*Criar meta para paciente*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Nome` | `string` | Não |  |
| `Descricao` | `string` | Não |  |
| `Icone` | `string` | Não |  |
| `Objetivo` | `number(double)` | Não |  |
| `Unidade` | `string` | Não |  |
| `Frequencia` | `string(int32)[Diaria|Semanal|Mensal]` | Não |  |
| `Ativo` | `boolean` | Não |  |
| `IdPaciente` | `integer(int64)` | Não |  |

### CreatePrescriptionCommand

*Criar prescrição*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Title` | `string` | Não |  |
| `Date` | `string(date-time)` | Não |  |
| `Description` | `string` | Não |  |
| `PatientId` | `integer(int64)` | Não |  |
| `Posology` | `string` | Não |  |

### AddPCQCommand

*Adicionar PCQ (Plano de Controle de Qualidade)*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `PatientId` | `integer(int64)` | Não |  |
| `Description` | `string` | Não |  |
| `Questions` | `string` | Não |  |
| `IsPending` | `boolean` | Não |  |
| `Date` | `string(date-time)` | Não |  |

### CreateDB360AnthropometryCommand

*Criar avaliação antropométrica DB360*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `PatientId` | `integer(int64)` | Sim |  |
| `Height` | `number(double)` | Sim |  |
| `Age` | `integer(int32)` | Sim |  |
| `Gender` | `string` | Sim |  |
| `Weight` | `number(double)` | Sim |  |
| `WaistCircumference` | `number(double)` | Não |  |
| `HipCircumference` | `number(double)` | Não |  |
| `FrontalImageBase64` | `string` | Sim |  |
| `LateralImageBase64` | `string` | Sim |  |
| `Description` | `string` | Não |  |

### ApiResponse

*Resposta padrão da API*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `Success` | `boolean` | Não |  |
| `Message` | `string` | Não |  |

### ProblemDetails

*Detalhes de erro (RFC 7807)*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | `string` | Não |  |
| `title` | `string` | Não |  |
| `status` | `integer(int32)` | Não |  |
| `detail` | `string` | Não |  |
| `instance` | `string` | Não |  |

### NutritionistUpdatedEmailCommand

*Atualizar email do nutricionista*

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `NewEmail` | `string` | Não |  |
| `NutritionistId` | `integer(int64)` | Não |  |

### Enums Importantes

**`ESortDirection`**: `Ascending | Descending`

**`EActivityFrequency`**: `Daily | Weekly | Monthly`

**`EAnamnesisType`**: `Standard | Free`

**`EAnthropometryType`**: `Adult | Pregnant | Child | DB360 | Elder`

**`EAppetiteSituation`**: `Normal | Increased | Decreased`

**`EBodyCompositionAssessmentType`**: `BioImpedance | SkinFold`

**`EBowelHabits`**: `Normal | Constipating | Diarrhea | Miscellaneous`

**`EBristolScale`**: `HardLumps | LumpySausage | CrackedSausage | SmoothSausage | SoftBlobs | MushyPieces | Watery`

**`EChewingHabit`**: `Normal | Fast | Slow`

**`EChildFeeding`**: `EatsSameTimes | NoFixedSchedule | AsksForFoodWhenHungry | NeedsAdultEncouragement | EatsOnlyWhenDistracted`

**`EDiasDaSemana`**: `Domingo | Segunda | Terca | Quarta | Quinta | Sexta | Sabado`

**`EDietaryRestriction`**: `No | Vegetarian | Vegan`

**`EEnergyExpenditureProtocol`**: `HarrisBenedict | FAOOMS2001 | FAOOMS1985 | EER | Cunningham | KatchMcArdle | HenryRees | Schofield | MifflinStJeor | TinsleyMLG | TinsleyPeso | EERIOM2023 | EERInfantilObeso`

**`EEnergyExpenditureType`**: `Adult | Pregnant | Child | Athlete | Elder`

**`EExamStatus`**: `Normal | Desejavel | Otimo | Suficiencia | Saudavel | Aceitavel | DesnutricaoLeve | DesnutricaoModerada | Insuficiencia | Alterada | Deficiencia | Risco | Baixo | Alto | MuitoAlto | DesnutricaoGrave | Diabetes`

**`EExamStatusRisk`**: `Positivo | Neutro | Negativo`

**`EFatPercentageProtocol`**: `Bioimpedance | ThreeSiteGuedesBrasileiro | ThreeSiteJacksonPollock | FourSiteDurninWomersley | FourSiteFaulkner | FourSitePetrosik | SevenSiteJacksonPollockWard | SlaughterTeenager | McArdleTeenager | BoileauTeenager | DurninElderly | WeltmanProtocol`

**`EFatPercentageReference`**: `Pollock | Gallagher`

**`EFeedTemplates`**: `None | RegisteredIOS | RegisteredAndroid | RegisteredWindowsPhone | DiaryUpdated | RastreamentoPreenchido | NovaOpiniao | Expirando | QPCPreenchido | MetaAtingida | Nascimento | Agenda`

**`EFrequenciaMeta`**: `Diaria | Semanal | Mensal`

---

## Tabela Completa de Endpoints

| Método | Path | Tag | Descrição |
|--------|------|-----|-----------|
| `PATCH` | `/v2/account/email` | Account |  |
| `GET` | `/v2/agenda` | Agenda |  |
| `POST` | `/v2/agenda` | Agenda |  |
| `GET` | `/v2/agenda/{id}` | Agenda |  |
| `PUT` | `/v2/agenda/{id}` | Agenda |  |
| `DELETE` | `/v2/agenda/{id}` | Agenda |  |
| `GET` | `/v2/agenda/horarios-disponiveis` | Agenda |  |
| `POST` | `/v2/agenda/{id}/enviar-lembrete` | Agenda |  |
| `POST` | `/v2/agenda/{id}/solicitar-confirmacao` | Agenda |  |
| `POST` | `/v2/agenda/{id}/exception` | Agenda |  |
| `PATCH` | `/v2/agenda/{id}/dates` | Agenda |  |
| `GET` | `/v2/agenda/summary` | Agenda |  |
| `GET` | `/v2/agenda/timezones` | Agenda |  |
| `GET` | `/v2/agenda/google/connect` | AgendaGoogle |  |
| `GET` | `/v2/agenda/google/callback` | AgendaGoogle |  |
| `POST` | `/v2/agenda/google/webhook` | AgendaGoogle |  |
| `POST` | `/v2/agenda/google/disconnect` | AgendaGoogle |  |
| `GET` | `/v2/agenda/google` | AgendaGoogle |  |
| `GET` | `/v2/agenda/google/calendars` | AgendaGoogle |  |
| `PUT` | `/v2/agenda/google/calendar` | AgendaGoogle |  |
| `GET` | `/v2/agua/{patientId}` | Agua |  |
| `DELETE` | `/v2/agua/{patientId}` | Agua |  |
| `POST` | `/v2/agua` | Agua |  |
| `PUT` | `/v2/anamneses` | Anamnesis |  |
| `GET` | `/v2/anamneses/bases` | Anamnesis |  |
| `GET` | `/v2/anamneses/{id}` | Anamnesis |  |
| `DELETE` | `/v2/anamneses/{id}` | Anamnesis |  |
| `GET` | `/v2/anamneses/{id}/text` | Anamnesis |  |
| `GET` | `/v2/anamneses/last/patient/{patientId}` | Anamnesis |  |
| `GET` | `/v2/anamneses/last/patient/{patientId}/symptoms` | Anamnesis |  |
| `GET` | `/v2/anamneses/{id}/files` | Anamnesis |  |
| `POST` | `/v2/anamneses/{id}/metabolic-tracking-form` | Anamnesis |  |
| `POST` | `/v2/anamneses/{id}/metabolic-tracking-form/cancel` | Anamnesis |  |
| `GET` | `/v2/anamnesis-models` | AnamnesisModel |  |
| `PUT` | `/v2/anamnesis-models` | AnamnesisModel |  |
| `GET` | `/v2/anamnesis-models/{id}` | AnamnesisModel |  |
| `DELETE` | `/v2/anamnesis-models/{id}` | AnamnesisModel |  |
| `GET` | `/v2/anthropometries` | Anthropometry |  |
| `POST` | `/v2/anthropometries` | Anthropometry |  |
| `GET` | `/v2/anthropometries/{id}` | Anthropometry |  |
| `PUT` | `/v2/anthropometries/{id}` | Anthropometry |  |
| `DELETE` | `/v2/anthropometries/{id}` | Anthropometry |  |
| `GET` | `/v2/anthropometries/latest` | Anthropometry |  |
| `GET` | `/v2/anthropometries/gestation-initial-data` | Anthropometry |  |
| `GET` | `/v2/anthropometries/chart` | Anthropometry |  |
| `GET` | `/v2/anthropometries/{id}/attachments` | Anthropometry |  |
| `DELETE` | `/v2/anthropometries/{id}/attachments/{fileName}` | Anthropometry |  |
| `GET` | `/v2/anthropometries/{id}/photos` | Anthropometry |  |
| `DELETE` | `/v2/anthropometries/{id}/photos/{fileName}` | Anthropometry |  |
| `GET` | `/v2/anthropometries/db360/{id}` | Anthropometry |  |
| `POST` | `/v2/anthropometries/db360` | Anthropometry |  |
| `GET` | `/v2/chat` | Chat |  |
| `POST` | `/v2/chat/notificar` | Chat |  |
| `POST` | `/v2/chat/lido` | Chat |  |
| `GET` | `/v2/chat/mensagem` | Chat |  |
| `POST` | `/v2/chat/mensagem` | Chat |  |
| `DELETE` | `/v2/chat/mensagem/{rowKey}` | Chat |  |
| `GET` | `/v2/configurations` | Configuration |  |
| `PATCH` | `/v2/configurations` | Configuration |  |
| `GET` | `/v2/customizable-card` | CustomizableCard |  |
| `GET` | `/v2/diario` | Diario |  |
| `GET` | `/v2/diario/{id}` | Diario |  |
| `PUT` | `/v2/diario/{id}/like` | Diario |  |
| `PUT` | `/v2/diario/{id}/dislike` | Diario |  |
| `GET` | `/v2/diario/{id}/comentario` | Diario |  |
| `POST` | `/v2/diario/{id}/comentario` | Diario |  |
| `PUT` | `/v2/diario/{id}/comentario/{rowKey}/edita` | Diario |  |
| `DELETE` | `/v2/diario/{id}/comentario/{idComentario}` | Diario |  |
| `GET` | `/v2/energy-expenditure` | EnergyExpenditure |  |
| `POST` | `/v2/energy-expenditure` | EnergyExpenditure |  |
| `GET` | `/v2/energy-expenditure/{id}` | EnergyExpenditure |  |
| `DELETE` | `/v2/energy-expenditure/{id}` | EnergyExpenditure |  |
| `GET` | `/v2/energy-expenditure/physical-activities-list` | EnergyExpenditure |  |
| `GET` | `/v2/energy-expenditure/last` | EnergyExpenditure |  |
| `GET` | `/v2/energy-expenditure/physical-activities` | EnergyExpenditure |  |
| `GET` | `/v2/especialidade` | Especialidade |  |
| `GET` | `/v2/extensions` | Extensions |  |
| `GET` | `/v2/extensions/nutritionist` | Extensions |  |
| `GET` | `/v2/external-voucher` | ExternalVoucher |  |
| `GET` | `/v2/feed` | Feed |  |
| `GET` | `/v2/feed/chat` | Feed |  |
| `GET` | `/v2/feed/general` | Feed |  |
| `GET` | `/v2/file/{id}/{fileName}` | File |  |
| `GET` | `/v2/finance/transactions/latest` | Finance |  |
| `GET` | `/v2/finance/transactions/next` | Finance |  |
| `GET` | `/v2/finance/transactions/by-patient` | Finance |  |
| `GET` | `/v2/finance/transactions/by-appointment` | Finance |  |
| `GET` | `/v2/finance/transactions` | Finance |  |
| `POST` | `/v2/finance/transactions` | Finance |  |
| `GET` | `/v2/finance/transactions/totals/month` | Finance |  |
| `GET` | `/v2/finance/patients/debtors` | Finance |  |
| `GET` | `/v2/finance/accounts` | Finance |  |
| `POST` | `/v2/finance/accounts` | Finance |  |
| `GET` | `/v2/finance/accounts/cache` | Finance |  |
| `GET` | `/v2/finance/cashflow/{year}` | Finance |  |
| `GET` | `/v2/finance/categories` | Finance |  |
| `GET` | `/v2/finance/entries-outputs` | Finance |  |
| `GET` | `/v2/finance/totals/receivable-payable` | Finance |  |
| `DELETE` | `/v2/finance/transactions/{id}` | Finance |  |
| `GET` | `/v2/formulas/pregnancy-weight-assessment` | Formulas |  |
| `GET` | `/v2/formulas/skeletal-muscle-situation` | Formulas |  |
| `GET` | `/v2/formulas/gestational-age` | Formulas |  |
| `GET` | `/v2/formulas/child-assessment` | Formulas |  |
| `GET` | `/v2/formulas/weight-height-charts` | Formulas |  |
| `GET` | `/v2/formulas/weight-age-charts` | Formulas |  |
| `GET` | `/v2/formulas/height-age-charts` | Formulas |  |
| `GET` | `/v2/formulas/bmi-chart` | Formulas |  |
| `GET` | `/v2/formulas/bmi` | Formulas |  |
| `GET` | `/v2/formulas/bmi-situation` | Formulas |  |
| `GET` | `/v2/formulas/waist-risk` | Formulas |  |
| `GET` | `/v2/formulas/elderly-malnutrition` | Formulas |  |
| `GET` | `/v2/formulas/waist-hip-ratio` | Formulas |  |
| `GET` | `/v2/formulas/ideal-weight` | Formulas |  |
| `GET` | `/v2/formulas/caloric-needs` | Formulas |  |
| `GET` | `/v2/formulas/rule-of-thumb` | Formulas |  |
| `GET` | `/v2/formulas/total-caloric-needs` | Formulas |  |
| `GET` | `/v2/formulas/bone-diameter` | Formulas |  |
| `GET` | `/v2/formulas/mass-and-weights` | Formulas |  |
| `GET` | `/v2/formulas/mass-situation` | Formulas |  |
| `GET` | `/v2/formulas/lab-assessment-reference` | Formulas |  |
| `GET` | `/v2/formulas/physical-activity-energy-expenditure` | Formulas |  |
| `GET` | `/v2/formulas/knee-height` | Formulas |  |
| `GET` | `/v2/formulas/arm-area` | Formulas |  |
| `GET` | `/v2/formulas/bristol-scale` | Formulas |  |
| `GET` | `/v2/formulas/stool-color` | Formulas |  |
| `GET` | `/v2/gift-configuration` | GiftConfiguration |  |
| `GET` | `/v2/local-atendimento` | LocalAtendimento |  |
| `GET` | `/v2/local-atendimento/{id}` | LocalAtendimento |  |
| `GET` | `/v2/local-atendimento/{id}/servicos` | LocalAtendimento |  |
| `GET` | `/v2/local-atendimento/{id}/servico/{idServico}` | LocalAtendimento |  |
| `GET` | `/v2/materiais/laminas` | Materiais |  |
| `GET` | `/v2/materiais` | Materiais |  |
| `POST` | `/v2/materiais` | Materiais |  |
| `GET` | `/v2/materiais/{id}` | Materiais |  |
| `PUT` | `/v2/materiais/{id}` | Materiais |  |
| `DELETE` | `/v2/materiais/{id}` | Materiais |  |
| `GET` | `/v2/materiais/paciente/{id}` | Materiais |  |
| `GET` | `/v2/meta` | Meta |  |
| `POST` | `/v2/meta` | Meta |  |
| `GET` | `/v2/meta/{id}` | Meta |  |
| `PUT` | `/v2/meta/{id}` | Meta |  |
| `DELETE` | `/v2/meta/{id}` | Meta |  |
| `GET` | `/v2/meta/progresso` | Meta |  |
| `GET` | `/v2/meta/{id}/historico` | Meta |  |
| `GET` | `/v2/news` | News |  |
| `GET` | `/v2/news/{id}` | News |  |
| `PUT` | `/v2/nutritionist/cancellation-reason` | Nutritionist |  |
| `GET` | `/v2/nutritionist/images` | Nutritionist |  |
| `GET` | `/v2/nutritionist/checklist` | Nutritionist |  |
| `GET` | `/v2/nutritionist/features` | Nutritionist |  |
| `GET` | `/v2/nutritionist/base-info` | Nutritionist |  |
| `POST` | `/v2/nutritionist/enrollment-verification` | Nutritionist |  |
| `GET` | `/v2/nutritionist/electronic-signature` | Nutritionist |  |
| `POST` | `/v2/nutritionist/electronic-signature` | Nutritionist |  |
| `DELETE` | `/v2/nutritionist/electronic-signature` | Nutritionist |  |
| `GET` | `/v2/nutritionist/subscription` | Nutritionist |  |
| `GET` | `/v2/nutritionist/product-fruits` | Nutritionist |  |
| `POST` | `/v2/nutritionist/stream` | Nutritionist |  |
| `GET` | `/v2/nutritionist/upload-url` | Nutritionist |  |
| `DELETE` | `/v2/nutritionist/logo` | Nutritionist |  |
| `GET` | `/v2/notes` | NutritionistNotes |  |
| `POST` | `/v2/notes` | NutritionistNotes |  |
| `GET` | `/v2/notes/{id}` | NutritionistNotes |  |
| `PUT` | `/v2/notes/{id}` | NutritionistNotes |  |
| `DELETE` | `/v2/notes/{id}` | NutritionistNotes |  |
| `PATCH` | `/v2/notes/{id}/completed` | NutritionistNotes |  |
| `PATCH` | `/v2/notes/{id}/pinned` | NutritionistNotes |  |
| `PATCH` | `/v2/notes/{id}/priority` | NutritionistNotes |  |
| `GET` | `/v2/opiniao` | Opiniao |  |
| `PUT` | `/v2/opiniao/{id}` | Opiniao |  |
| `GET` | `/v2/pcq/{id}` | PCQ |  |
| `DELETE` | `/v2/pcq/{id}` | PCQ |  |
| `GET` | `/v2/pcq` | PCQ |  |
| `POST` | `/v2/pcq` | PCQ |  |
| `PUT` | `/v2/pcq` | PCQ |  |
| `POST` | `/v2/pcq/completion-request` | PCQ |  |
| `GET` | `/v2/pcq/{id}/print` | PCQ |  |
| `GET` | `/v2/pcqmodel` | PCQModel |  |
| `POST` | `/v2/pcqmodel` | PCQModel |  |
| `PUT` | `/v2/pcqmodel` | PCQModel |  |
| `GET` | `/v2/pcqmodel/combo` | PCQModel |  |
| `GET` | `/v2/pcqmodel/{id}` | PCQModel |  |
| `DELETE` | `/v2/pcqmodel/{id}` | PCQModel |  |
| `GET` | `/v2/pcqmodel/{id}/questions` | PCQModel |  |
| `GET` | `/v2/paciente` | Paciente |  |
| `POST` | `/v2/paciente` | Paciente |  |
| `GET` | `/v2/paciente/{id}` | Paciente |  |
| `PUT` | `/v2/paciente/{id}` | Paciente |  |
| `DELETE` | `/v2/paciente/{id}` | Paciente |  |
| `GET` | `/v2/paciente/{id}/prontuario` | Paciente |  |
| `PUT` | `/v2/paciente/{id}/prontuario` | Paciente |  |
| `PUT` | `/v2/paciente/{id}/celular` | Paciente |  |
| `GET` | `/v2/paciente/{id}/tem-aplicativo` | Paciente |  |
| `PUT` | `/v2/paciente/materiais` | Paciente |  |
| `PATCH` | `/v2/paciente/{patientId}/active` | Paciente |  |
| `DELETE` | `/v2/paciente/{id}/delete-registrations-hub` | Paciente |  |
| `GET` | `/v2/patients` | Patient |  |
| `PUT` | `/v2/patients` | Patient |  |
| `GET` | `/v2/patients/{id}` | Patient |  |
| `DELETE` | `/v2/patients/{id}` | Patient |  |
| `PATCH` | `/v2/patients/{id}/recipes` | Patient |  |
| `PATCH` | `/v2/patients/{id}/replacement-lists` | Patient |  |
| `GET` | `/v2/perfil` | Perfil |  |
| `PUT` | `/v2/perfil` | Perfil |  |
| `POST` | `/v2/perfil/ativar-assinatura-estudante` | Perfil |  |
| `GET` | `/v2/plano-alimentar/{id}` | PlanoAlimentar |  |
| `GET` | `/v2/pre-agendamento/pendencias` | PreAgendamento |  |
| `PUT` | `/v2/pre-agendamento/{id}/confirmar` | PreAgendamento |  |
| `DELETE` | `/v2/pre-agendamento/{id}/rejeitar` | PreAgendamento |  |
| `GET` | `/v2/prescription` | Prescription |  |
| `POST` | `/v2/prescription` | Prescription |  |
| `GET` | `/v2/prescription/{id}` | Prescription |  |
| `PUT` | `/v2/prescription/{id}` | Prescription |  |
| `DELETE` | `/v2/prescription/{id}` | Prescription |  |
| `PATCH` | `/v2/prescription/{id}/set-available-on-app` | Prescription |  |
| `PATCH` | `/v2/prescription/{id}/set-type` | Prescription |  |
| `POST` | `/v2/prescription/{id}/supplement` | Prescription |  |
| `POST` | `/v2/prescription/{id}/supplement/batch` | Prescription |  |
| `POST` | `/v2/prescription/{id}/supplement/personalized` | Prescription |  |
| `PUT` | `/v2/prescription/{id}/supplement/{prescriptionSupplementId}` | Prescription |  |
| `DELETE` | `/v2/prescription/{id}/supplement/{prescriptionSupplementId}` | Prescription |  |
| `POST` | `/v2/prescription/{id}/herbal-remedy` | Prescription |  |
| `POST` | `/v2/prescription/{id}/herbal-remedy/batch` | Prescription |  |
| `PUT` | `/v2/prescription/{id}/herbal-remedy/{prescriptionHerbalRemedyId}` | Prescription |  |
| `DELETE` | `/v2/prescription/{id}/herbal-medicine/{prescriptionHerbalRemedyId}` | Prescription |  |
| `POST` | `/v2/prescription/{id}/save-as-model` | Prescription |  |
| `POST` | `/v2/prescription/{id}/load-model` | Prescription |  |
| `GET` | `/v2/qpc` | Qpc |  |
| `POST` | `/v2/qpc` | Qpc |  |
| `PUT` | `/v2/qpc` | Qpc |  |
| `GET` | `/v2/qpc/{id}` | Qpc |  |
| `DELETE` | `/v2/qpc/{id}` | Qpc |  |
| `PATCH` | `/v2/qpc/{id}/un-complete` | Qpc |  |
| `GET` | `/v2/qpc-model` | QpcModel |  |
| `POST` | `/v2/qpc-model` | QpcModel |  |
| `PUT` | `/v2/qpc-model` | QpcModel |  |
| `GET` | `/v2/qpc-model/{id}` | QpcModel |  |
| `DELETE` | `/v2/qpc-model/{id}` | QpcModel |  |
| `GET` | `/v2/supplement` | Supplement |  |
| `GET` | `/v2/supplement/personalized` | Supplement |  |
| `GET` | `/v2/supplement/brands` | Supplement |  |
| `GET` | `/v2/supplement/categories` | Supplement |  |
| `GET` | `/v2/tag` | Tag |  |
| `POST` | `/v2/tag` | Tag |  |
| `GET` | `/v2/tag/{id}` | Tag |  |
| `DELETE` | `/v2/tag/{id}` | Tag |  |
| `PATCH` | `/v2/tag/{id}/name` | Tag |  |
| `GET` | `/v2/videoconferencia/token/{id}` | Videoconferencia |  |
| `POST` | `/v2/whatsapp/open-connection` | Whatsapp |  |
| `GET` | `/v2/whatsapp/status` | Whatsapp |  |
| `POST` | `/v2/whatsapp/disconnect` | Whatsapp |  |
| `GET` | `/v2/whatsapp-templates` | WhatsappTemplate |  |
| `POST` | `/v2/whatsapp-templates` | WhatsappTemplate |  |
| `GET` | `/v2/whatsapp-templates/{id}` | WhatsappTemplate |  |
| `DELETE` | `/v2/whatsapp-templates/{id}` | WhatsappTemplate |  |
| `PATCH` | `/v2/whatsapp-templates/set-status-by-type` | WhatsappTemplate |  |

---

*Documentação gerada a partir do spec OpenAPI 3.0.4 — https://api-dev.dietbox.me/swagger/nutricionista-v2/swagger.json*