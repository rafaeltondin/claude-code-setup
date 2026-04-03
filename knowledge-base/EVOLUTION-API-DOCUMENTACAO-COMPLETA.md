---
title: "Evolution API - Documentação Completa de Integração WhatsApp"
category: "Desenvolvimento"
tags:
  - evolution api
  - whatsapp api
  - whatsapp integration
  - api rest
  - webhook
  - mensagens whatsapp
  - chatbot
  - automacao whatsapp
  - baileys
  - cloud api
  - typebot
  - chatwoot
  - instancia whatsapp
  - qrcode
  - envio mensagens
  - grupos whatsapp
  - multidevice
  - nodejs
  - typescript
topic: "API WhatsApp"
priority: high
version: "2.2.0"
last_updated: "2026-02-24"
---

# Evolution API - Documentação Completa de Integração WhatsApp

Documentação completa da Evolution API para integração com WhatsApp. Este guia cobre todos os endpoints, configurações, webhooks e exemplos práticos de implementação.

---

## REGRA OBRIGATORIA: INSTANCIA CENORA

> **REGRA CRITICA:** Para TODAS as operacoes com WhatsApp via Evolution API, utilize EXCLUSIVAMENTE a instancia `cenora`. Esta e a instancia principal conectada ao WhatsApp pessoal do Rafael.

| Item | Valor |
|------|-------|
| **Instancia padrao** | `cenora` |
| **URL Base** | `https://evolution.rafaeltondin.com.br` |
| **Manager** | `https://evolution.rafaeltondin.com.br/manager/` |
| **API Key** | `{{secret:EVOLUTION_API_KEY}}` |
| **Instance Token** | `{{secret:EVOLUTION_INSTANCE_TOKEN}}` |
| **Numero conectado** | 555499000753 |
| **Perfil** | Rafael A Tondin |
| **Servidor** | Docker em 46.202.149.24, porta interna 8080 |

**Regras:**
- **SEMPRE** use `cenora` como nome da instancia em todos os endpoints
- **NUNCA** crie novas instancias — use apenas `cenora`
- **NUNCA** peca ao usuario o nome da instancia — e SEMPRE `cenora`
- Nos exemplos abaixo, substitua `minha-instancia` por `cenora` ao executar

**Para guia completo de interacao (envio de mensagens, padrao de escrita, contatos):**
Consulte: `MEU-WHATSAPP-EVOLUTION-API-GUIA-INTERACAO.md`

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Credenciais e Configuração](#credenciais-e-configuração)
3. [Autenticação](#autenticação)
4. [Gerenciamento de Instâncias](#gerenciamento-de-instâncias)
5. [Envio de Mensagens](#envio-de-mensagens)
6. [Envio de Mídia](#envio-de-mídia)
7. [Gerenciamento de Grupos](#gerenciamento-de-grupos)
8. [Webhooks](#webhooks)
9. [Configurações](#configurações)
10. [Chat Controller](#chat-controller)
11. [Profile Settings](#profile-settings)
12. [Integrações](#integrações)
13. [Exemplos Práticos](#exemplos-práticos)
14. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é a Evolution API?

A Evolution API é uma API REST open-source para integração com WhatsApp que permite:

- Conectar múltiplas contas WhatsApp simultaneamente
- Enviar e receber mensagens automaticamente
- Gerenciar grupos e contatos
- Integrar com sistemas de atendimento (Chatwoot, Typebot)
- Receber eventos em tempo real via webhooks

### Tipos de Conexão Suportados

| Tipo | Descrição | Uso Recomendado |
|------|-----------|-----------------|
| **WhatsApp Web (Baileys)** | API gratuita baseada no protocolo Web | Pequenas e médias operações |
| **WhatsApp Cloud API** | API oficial da Meta | Alto volume, empresas |

### Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Aplicação     │────▶│  Evolution API  │────▶│    WhatsApp     │
│   (Cliente)     │◀────│   (Servidor)    │◀────│    (Destino)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────▶│    Webhook      │
                        │   (Eventos)     │
                        └─────────────────┘
```

---

## 🔐 Credenciais e Configuração

### Servidor Evolution API

| Campo | Valor |
|-------|-------|
| **URL Base** | `https://evolution.rafaeltondin.com.br` |
| **Manager** | `https://evolution.rafaeltondin.com.br/manager/` |
| **API Key (Global)** | `{{secret:EVOLUTION_API_KEY}}` |
| **Porta Interna Docker** | `8080` |

### Variáveis de Ambiente

```dotenv
# Configuração do Servidor Evolution API
EVOLUTION_API_URL=https://evolution.rafaeltondin.com.br
AUTHENTICATION_JWT_SECRET={{secret:EVOLUTION_API_KEY}}

# Configuração da Instância (após criar)
INSTANCE_NAME=minha-instancia
INSTANCE_TOKEN=token-gerado-pela-api
```

### Exemplo de Configuração Node.js

```javascript
// config/evolution.js
const EVOLUTION_CONFIG = {
  baseUrl: 'https://evolution.rafaeltondin.com.br',
  apiKey: '{{secret:EVOLUTION_API_KEY}}',
  headers: {
    'Content-Type': 'application/json',
    'apikey': '{{secret:EVOLUTION_API_KEY}}'
  }
};

module.exports = EVOLUTION_CONFIG;
```

### Exemplo de Configuração Python

```python
# config/evolution.py
EVOLUTION_CONFIG = {
    'base_url': 'https://evolution.rafaeltondin.com.br',
    'api_key': '{{secret:EVOLUTION_API_KEY}}',
    'headers': {
        'Content-Type': 'application/json',
        'apikey': '{{secret:EVOLUTION_API_KEY}}'
    }
}
```

---

## 🔑 Autenticação

### Header de Autenticação

Todas as requisições à API devem incluir o header `apikey`:

```http
apikey: {{secret:EVOLUTION_API_KEY}}
```

### Exemplo cURL

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/instance/fetchInstances \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Exemplo JavaScript (Fetch)

```javascript
const response = await fetch('https://evolution.rafaeltondin.com.br/instance/fetchInstances', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'apikey': '{{secret:EVOLUTION_API_KEY}}'
  }
});

const data = await response.json();
console.log(data);
```

### Exemplo Python (Requests)

```python
import requests

url = "https://evolution.rafaeltondin.com.br/instance/fetchInstances"
headers = {
    "Content-Type": "application/json",
    "apikey": "{{secret:EVOLUTION_API_KEY}}"
}

response = requests.get(url, headers=headers)
print(response.json())
```

---

## 📱 Gerenciamento de Instâncias

### Criar Instância Básica

Cria uma nova instância de conexão WhatsApp.

**Endpoint:** `POST /instance/create`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/instance/create \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "instanceName": "minha-instancia",
    "qrcode": true
  }'
```

**Parâmetros do Body:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `instanceName` | string | ✅ | Nome único da instância |
| `token` | string | ❌ | Token personalizado (auto-gerado se omitido) |
| `qrcode` | boolean | ❌ | Gerar QR Code na criação |
| `integration` | string | ❌ | Tipo: `WHATSAPP-BAILEYS` ou `WHATSAPP-BUSINESS` |

**Resposta de Sucesso (201):**

```json
{
  "instance": {
    "instanceName": "minha-instancia",
    "instanceId": "af6c5b7c-ee27-4f94-9ea8-192393746ddd",
    "status": "created"
  },
  "hash": {
    "apikey": "token-gerado-automaticamente"
  },
  "qrcode": {
    "code": "2@ABC123...",
    "base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

### Criar Instância com Webhook

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/instance/create \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "instanceName": "minha-instancia",
    "token": "meu-token-customizado",
    "qrcode": true,
    "webhook": "https://meu-servidor.com/webhook",
    "webhookByEvents": false,
    "events": [
      "QRCODE_UPDATED",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### Criar Instância Completa

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/instance/create \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "instanceName": "instancia-completa",
    "token": "meu-token",
    "qrcode": true,
    "number": "5511999999999",
    "integration": "WHATSAPP-BAILEYS",
    "rejectCall": true,
    "msgCall": "Não posso atender agora. Deixe sua mensagem.",
    "groupsIgnore": false,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "syncFullHistory": true,
    "webhook": {
      "url": "https://meu-servidor.com/webhook",
      "byEvents": false,
      "base64": true,
      "headers": {
        "authorization": "Bearer meu-token-webhook"
      },
      "events": [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE"
      ]
    }
  }'
```

### Listar Todas as Instâncias

**Endpoint:** `GET /instance/fetchInstances`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/instance/fetchInstances \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

**Resposta:**

```json
[
  {
    "instance": {
      "instanceName": "minha-instancia",
      "instanceId": "af6c5b7c-ee27-4f94-9ea8-192393746ddd",
      "owner": "5511999999999@s.whatsapp.net",
      "profileName": "Meu Nome",
      "profilePictureUrl": "https://...",
      "status": "open"
    }
  }
]
```

### Conectar Instância (Gerar QR Code)

**Endpoint:** `GET /instance/connect/{instance}`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/instance/connect/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

**Resposta:**

```json
{
  "pairingCode": null,
  "code": "2@ABCD1234...",
  "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "count": 1
}
```

### Verificar Status da Conexão

**Endpoint:** `GET /instance/connectionState/{instance}`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/instance/connectionState/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

**Resposta:**

```json
{
  "instance": "minha-instancia",
  "state": "open"
}
```

**Estados Possíveis:**

| Estado | Descrição |
|--------|-----------|
| `open` | Conectado e pronto |
| `close` | Desconectado |
| `connecting` | Tentando conectar |

### Reiniciar Instância

**Endpoint:** `PUT /instance/restart/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/instance/restart/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Desconectar (Logout) Instância

**Endpoint:** `DELETE /instance/logout/{instance}`

```bash
curl --request DELETE \
  --url https://evolution.rafaeltondin.com.br/instance/logout/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Deletar Instância

**Endpoint:** `DELETE /instance/delete/{instance}`

```bash
curl --request DELETE \
  --url https://evolution.rafaeltondin.com.br/instance/delete/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Definir Presença

**Endpoint:** `POST /instance/setPresence/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/instance/setPresence/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "presence": "available"
  }'
```

**Valores de Presença:**

| Valor | Descrição |
|-------|-----------|
| `available` | Disponível (online) |
| `unavailable` | Indisponível (offline) |
| `composing` | Digitando |
| `recording` | Gravando áudio |

---

## 💬 Envio de Mensagens

### Enviar Texto Simples

**Endpoint:** `POST /message/sendText/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendText/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem enviada pela Evolution API 🚀"
  }'
```

**Com Opções Avançadas:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendText/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "options": {
      "delay": 1200,
      "presence": "composing",
      "linkPreview": true
    },
    "text": "Mensagem com *negrito*, _itálico_, ~tachado~ e `monoespaçado`.\n\nConfira: https://evolution-api.com"
  }'
```

**Parâmetros:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `number` | string | Número do destinatário com código do país |
| `options.delay` | number | Delay em ms antes de enviar |
| `options.presence` | string | Mostrar "digitando" antes de enviar |
| `options.linkPreview` | boolean | Gerar preview de links |
| `text` | string | Texto da mensagem |

**Resposta:**

```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5B8BC84A484E3"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá! Esta é uma mensagem enviada pela Evolution API 🚀"
    }
  },
  "messageTimestamp": "1689604487",
  "status": "PENDING"
}
```

### Enviar Mensagem com Menção (Grupos)

**Endpoint:** `POST /message/sendText/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendText/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "123456789012345678@g.us",
    "options": {
      "delay": 1200,
      "presence": "composing",
      "mentions": {
        "everyOne": false,
        "mentioned": ["5511999999999"]
      }
    },
    "text": "Olá @5511999999999, tudo bem?"
  }'
```

**Mencionar Todos:**

```json
{
  "number": "123456789012345678@g.us",
  "options": {
    "mentions": {
      "everyOne": true
    }
  },
  "text": "Atenção todos! Mensagem importante."
}
```

### Enviar Reação

**Endpoint:** `POST /message/sendReaction/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendReaction/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "reactionMessage": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "BAE5766236A2AEFF"
      },
      "reaction": "👍"
    }
  }'
```

### Enviar Localização

**Endpoint:** `POST /message/sendLocation/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendLocation/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "locationMessage": {
      "latitude": -23.5505,
      "longitude": -46.6333,
      "name": "São Paulo, SP",
      "address": "Praça da Sé, Centro, São Paulo - SP"
    }
  }'
```

### Enviar Contato

**Endpoint:** `POST /message/sendContact/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendContact/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "contactMessage": [
      {
        "fullName": "João Silva",
        "wuid": "5511888888888@s.whatsapp.net",
        "phoneNumber": "+5511888888888",
        "organization": "Empresa XYZ",
        "email": "joao@empresa.com",
        "url": "https://empresa.com"
      }
    ]
  }'
```

### Enviar Enquete (Poll)

**Endpoint:** `POST /message/sendPoll/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendPoll/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "pollMessage": {
      "name": "Qual sua linguagem favorita?",
      "selectableCount": 1,
      "values": [
        "JavaScript",
        "Python",
        "TypeScript",
        "Go"
      ]
    }
  }'
```

### Enviar Lista

**Endpoint:** `POST /message/sendList/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendList/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "listMessage": {
      "title": "Menu de Opções",
      "description": "Selecione uma opção abaixo",
      "buttonText": "Ver Opções",
      "footerText": "Evolution API",
      "sections": [
        {
          "title": "Serviços",
          "rows": [
            {
              "title": "Suporte",
              "description": "Falar com suporte técnico",
              "rowId": "1"
            },
            {
              "title": "Vendas",
              "description": "Falar com equipe de vendas",
              "rowId": "2"
            }
          ]
        },
        {
          "title": "Informações",
          "rows": [
            {
              "title": "Horários",
              "description": "Ver horários de funcionamento",
              "rowId": "3"
            }
          ]
        }
      ]
    }
  }'
```

### Enviar Status/Stories

**Texto:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendStatus/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "statusMessage": {
      "type": "text",
      "content": "Meu status de texto!",
      "backgroundColor": "#FF5733",
      "font": 1,
      "allContacts": true
    }
  }'
```

**Imagem/Vídeo:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendStatus/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "statusMessage": {
      "type": "image",
      "content": "https://exemplo.com/imagem.jpg",
      "caption": "Meu status com imagem! 📷",
      "allContacts": false,
      "statusJidList": ["5511999999999@s.whatsapp.net"]
    }
  }'
```

---

## 📎 Envio de Mídia

### Enviar Imagem

**Via URL:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendMedia/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "mediatype": "image",
    "caption": "Descrição da imagem",
    "media": "https://exemplo.com/imagem.jpg"
  }'
```

**Via Base64:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendMedia/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "mediatype": "image",
    "caption": "Imagem em base64",
    "media": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "mimetype": "image/png",
    "fileName": "minha-imagem.png"
  }'
```

### Enviar Vídeo

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendMedia/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "mediatype": "video",
    "caption": "Veja este vídeo!",
    "media": "https://exemplo.com/video.mp4"
  }'
```

### Enviar Documento

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendMedia/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "mediatype": "document",
    "caption": "Documento importante",
    "media": "https://exemplo.com/documento.pdf",
    "fileName": "relatorio.pdf"
  }'
```

### Enviar Áudio

**Endpoint:** `POST /message/sendWhatsAppAudio/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendWhatsAppAudio/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "audio": "https://exemplo.com/audio.mp3"
  }'
```

### Enviar Sticker

**Endpoint:** `POST /message/sendSticker/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/message/sendSticker/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "image": "https://exemplo.com/sticker.webp"
  }'
```

### Tipos de Mídia Suportados

| Tipo | Extensões | Max Size |
|------|-----------|----------|
| `image` | jpg, jpeg, png, gif, webp | 16 MB |
| `video` | mp4, 3gp | 16 MB |
| `audio` | mp3, ogg, wav | 16 MB |
| `document` | pdf, doc, xls, ppt, etc | 100 MB |
| `sticker` | webp | 100 KB |

---

## 👥 Gerenciamento de Grupos

### Criar Grupo

**Endpoint:** `POST /group/create/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/group/create/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "subject": "Meu Novo Grupo",
    "description": "Descrição do grupo",
    "participants": [
      "5511999999999",
      "5511888888888"
    ]
  }'
```

### Listar Todos os Grupos

**Endpoint:** `GET /group/fetchAllGroups/{instance}`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/group/fetchAllGroups/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Buscar Grupo por JID

**Endpoint:** `GET /group/findGroupInfos/{instance}`

```bash
curl --request GET \
  --url 'https://evolution.rafaeltondin.com.br/group/findGroupInfos/minha-instancia?groupJid=123456789012345678@g.us' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Atualizar Imagem do Grupo

**Endpoint:** `PUT /group/updateGroupPicture/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateGroupPicture/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "image": "https://exemplo.com/foto-grupo.jpg"
  }'
```

### Atualizar Nome do Grupo

**Endpoint:** `PUT /group/updateGroupSubject/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateGroupSubject/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "subject": "Novo Nome do Grupo"
  }'
```

### Atualizar Descrição do Grupo

**Endpoint:** `PUT /group/updateGroupDescription/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateGroupDescription/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "description": "Nova descrição do grupo"
  }'
```

### Obter Link de Convite

**Endpoint:** `GET /group/inviteCode/{instance}`

```bash
curl --request GET \
  --url 'https://evolution.rafaeltondin.com.br/group/inviteCode/minha-instancia?groupJid=123456789012345678@g.us' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Revogar Link de Convite

**Endpoint:** `PUT /group/revokeInviteCode/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/revokeInviteCode/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us"
  }'
```

### Gerenciar Participantes

**Adicionar:**

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateParticipant/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "action": "add",
    "participants": ["5511999999999"]
  }'
```

**Remover:**

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateParticipant/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "action": "remove",
    "participants": ["5511999999999"]
  }'
```

**Promover a Admin:**

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateParticipant/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "action": "promote",
    "participants": ["5511999999999"]
  }'
```

**Rebaixar de Admin:**

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateParticipant/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "action": "demote",
    "participants": ["5511999999999"]
  }'
```

### Configurações do Grupo

**Endpoint:** `PUT /group/updateSetting/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/group/updateSetting/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us",
    "action": "announcement"
  }'
```

**Ações Disponíveis:**

| Ação | Descrição |
|------|-----------|
| `announcement` | Somente admins enviam mensagens |
| `not_announcement` | Todos podem enviar mensagens |
| `locked` | Somente admins editam dados do grupo |
| `unlocked` | Todos podem editar dados do grupo |

### Sair do Grupo

**Endpoint:** `DELETE /group/leaveGroup/{instance}`

```bash
curl --request DELETE \
  --url https://evolution.rafaeltondin.com.br/group/leaveGroup/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "groupJid": "123456789012345678@g.us"
  }'
```

---

## 🔔 Webhooks

### Configurar Webhook

**Endpoint:** `POST /webhook/set/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/webhook/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "enabled": true,
    "url": "https://meu-servidor.com/webhook",
    "webhookByEvents": false,
    "webhookBase64": true,
    "events": [
      "QRCODE_UPDATED",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_DELETE",
      "SEND_MESSAGE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### Buscar Configuração de Webhook

**Endpoint:** `GET /webhook/find/{instance}`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/webhook/find/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `APPLICATION_STARTUP` | API iniciou |
| `QRCODE_UPDATED` | QR Code atualizado |
| `CONNECTION_UPDATE` | Status da conexão mudou |
| `MESSAGES_SET` | Mensagens carregadas |
| `MESSAGES_UPSERT` | Nova mensagem recebida |
| `MESSAGES_UPDATE` | Mensagem atualizada (lida, entregue) |
| `MESSAGES_DELETE` | Mensagem deletada |
| `SEND_MESSAGE` | Mensagem enviada |
| `CONTACTS_SET` | Contatos carregados |
| `CONTACTS_UPSERT` | Contato adicionado/atualizado |
| `CONTACTS_UPDATE` | Contato atualizado |
| `PRESENCE_UPDATE` | Presença atualizada |
| `CHATS_SET` | Chats carregados |
| `CHATS_UPSERT` | Chat criado/atualizado |
| `CHATS_UPDATE` | Chat atualizado |
| `CHATS_DELETE` | Chat deletado |
| `GROUPS_UPSERT` | Grupo criado/atualizado |
| `GROUP_UPDATE` | Grupo atualizado |
| `GROUP_PARTICIPANTS_UPDATE` | Participantes do grupo alterados |
| `NEW_JWT_TOKEN` | Novo token JWT gerado |
| `TYPEBOT_START` | Typebot iniciado |
| `TYPEBOT_CHANGE_STATUS` | Status do Typebot alterado |

### Exemplo de Payload Webhook

**Mensagem Recebida (MESSAGES_UPSERT):**

```json
{
  "event": "messages.upsert",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0796DC6B77B85C633"
    },
    "pushName": "Nome do Contato",
    "message": {
      "conversation": "Olá, tudo bem?"
    },
    "messageType": "conversation",
    "messageTimestamp": 1689604487,
    "instanceId": "af6c5b7c-ee27-4f94-9ea8-192393746ddd",
    "source": "android"
  }
}
```

**Conexão Atualizada (CONNECTION_UPDATE):**

```json
{
  "event": "connection.update",
  "instance": "minha-instancia",
  "data": {
    "instance": "minha-instancia",
    "state": "open",
    "statusReason": 200
  }
}
```

**QR Code Atualizado (QRCODE_UPDATED):**

```json
{
  "event": "qrcode.updated",
  "instance": "minha-instancia",
  "data": {
    "qrcode": {
      "code": "2@ABCD1234...",
      "base64": "data:image/png;base64,iVBORw0KGgo..."
    }
  }
}
```

### Servidor Webhook (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { event, instance, data } = req.body;
  
  console.log(`Evento: ${event}`);
  console.log(`Instância: ${instance}`);
  console.log('Dados:', JSON.stringify(data, null, 2));
  
  switch (event) {
    case 'messages.upsert':
      handleNewMessage(data);
      break;
    case 'connection.update':
      handleConnectionUpdate(data);
      break;
    case 'qrcode.updated':
      handleQRCodeUpdate(data);
      break;
  }
  
  res.status(200).json({ received: true });
});

function handleNewMessage(data) {
  const { key, message, pushName } = data;
  
  if (!key.fromMe && message.conversation) {
    console.log(`Nova mensagem de ${pushName}: ${message.conversation}`);
    // Processar mensagem...
  }
}

function handleConnectionUpdate(data) {
  console.log(`Status da conexão: ${data.state}`);
}

function handleQRCodeUpdate(data) {
  console.log('Novo QR Code gerado');
  // Exibir QR Code...
}

app.listen(3000, () => {
  console.log('Servidor webhook rodando na porta 3000');
});
```

### Servidor Webhook (Python/FastAPI)

```python
from fastapi import FastAPI, Request
import json

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request):
    body = await request.json()
    
    event = body.get("event")
    instance = body.get("instance")
    data = body.get("data")
    
    print(f"Evento: {event}")
    print(f"Instância: {instance}")
    print(f"Dados: {json.dumps(data, indent=2)}")
    
    if event == "messages.upsert":
        await handle_new_message(data)
    elif event == "connection.update":
        await handle_connection_update(data)
    elif event == "qrcode.updated":
        await handle_qrcode_update(data)
    
    return {"received": True}

async def handle_new_message(data):
    key = data.get("key", {})
    message = data.get("message", {})
    push_name = data.get("pushName", "")
    
    if not key.get("fromMe") and message.get("conversation"):
        print(f"Nova mensagem de {push_name}: {message['conversation']}")

async def handle_connection_update(data):
    print(f"Status da conexão: {data.get('state')}")

async def handle_qrcode_update(data):
    print("Novo QR Code gerado")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
```

---

## ⚙️ Configurações

### Definir Configurações

**Endpoint:** `POST /settings/set/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/settings/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "rejectCall": true,
    "msgCall": "Não posso atender agora. Por favor, envie uma mensagem.",
    "groupsIgnore": false,
    "alwaysOnline": true,
    "readMessages": true,
    "readStatus": true,
    "syncFullHistory": false
  }'
```

**Parâmetros:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `rejectCall` | boolean | Rejeitar chamadas automaticamente |
| `msgCall` | string | Mensagem ao rejeitar chamada |
| `groupsIgnore` | boolean | Ignorar mensagens de grupos |
| `alwaysOnline` | boolean | Manter sempre online |
| `readMessages` | boolean | Marcar mensagens como lidas automaticamente |
| `readStatus` | boolean | Marcar status como visto automaticamente |
| `syncFullHistory` | boolean | Sincronizar histórico completo |

### Buscar Configurações

**Endpoint:** `GET /settings/find/{instance}`

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/settings/find/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

---

## 💬 Chat Controller

### Verificar se é WhatsApp

**Endpoint:** `POST /chat/whatsappNumbers/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/whatsappNumbers/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "numbers": ["5511999999999", "5511888888888"]
  }'
```

**Resposta:**

```json
[
  {
    "exists": true,
    "jid": "5511999999999@s.whatsapp.net",
    "number": "5511999999999"
  },
  {
    "exists": false,
    "jid": "",
    "number": "5511888888888"
  }
]
```

### Marcar Mensagem como Lida

**Endpoint:** `PUT /chat/markMessageAsRead/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/chat/markMessageAsRead/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "readMessages": [
      {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "3EB0796DC6B77B85C633"
      }
    ]
  }'
```

### Arquivar Chat

**Endpoint:** `PUT /chat/archiveChat/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/chat/archiveChat/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "chat": "5511999999999@s.whatsapp.net",
    "archive": true
  }'
```

### Deletar Mensagem para Todos

**Endpoint:** `DELETE /chat/deleteMessageForEveryone/{instance}`

```bash
curl --request DELETE \
  --url https://evolution.rafaeltondin.com.br/chat/deleteMessageForEveryone/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "remoteJid": "5511999999999@s.whatsapp.net",
    "messageId": "3EB0796DC6B77B85C633",
    "fromMe": true
  }'
```

### Enviar Presença (Digitando/Gravando)

**Endpoint:** `POST /chat/sendPresence/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/sendPresence/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999",
    "presence": "composing",
    "delay": 3000
  }'
```

### Buscar Foto do Perfil

**Endpoint:** `POST /chat/fetchProfilePictureUrl/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/fetchProfilePictureUrl/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999"
  }'
```

### Buscar Contatos

**Endpoint:** `POST /chat/findContacts/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/findContacts/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "where": {
      "pushName": "João"
    }
  }'
```

### Buscar Mensagens

**Endpoint:** `POST /chat/findMessages/{instance}`

> **ATENÇÃO (LID):** Muitos contatos usam formato LID (`123456789@lid`) ao invés de `numero@s.whatsapp.net`. Se `findMessages` retornar 0 para um JID `@s.whatsapp.net`, busque o JID real via `findChats` primeiro.

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/findMessages/cenora \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "where": {
      "key": {
        "remoteJid": "166232967921803@lid"
      }
    },
    "limit": 50
  }'
```

**Filtros disponíveis no `where`:**

| Filtro | Funciona? | Exemplo |
|--------|-----------|---------|
| `key.remoteJid` | SIM | `"166232967921803@lid"` |
| `messageType` | SIM | `"documentMessage"`, `"imageMessage"`, `"audioMessage"` |
| `owner` | SIM (retorna TUDO da instância) | `"cenora"` |
| `pushName` | NÃO — retorna todas as msgs | Não usar! |

**Paginação:** `"limit": 50, "page": 2`

**Resposta:** `{ "messages": { "total": N, "pages": N, "currentPage": N, "records": [...] } }`

### Listar Chats

**Endpoint:** `POST /chat/findChats/{instance}` (é **POST**, NÃO GET)

> **IMPORTANTE:** Use este endpoint para descobrir o JID real de um contato (pode ser LID).

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/findChats/cenora \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "where": {
      "owner": "cenora"
    }
  }'
```

**Resposta:** Array de chats com `remoteJid`, `pushName`, `updatedAt`, `lastMessage`, `unreadCount`.

**Fluxo recomendado para buscar mensagens de um contato:**
1. `POST /chat/findChats/cenora` → listar todos os chats
2. Encontrar o chat pelo `pushName` → pegar o `remoteJid` (pode ser `@lid` ou `@s.whatsapp.net`)
3. `POST /chat/findMessages/cenora` com o `remoteJid` correto

### Baixar Mídia (Base64)

**Endpoint:** `POST /chat/getBase64FromMediaMessage/{instance}`

> Para baixar imagens, vídeos, documentos e áudios recebidos no WhatsApp.

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/getBase64FromMediaMessage/cenora \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "message": {
      "key": {
        "id": "3A321681E013FCB96D17",
        "remoteJid": "166232967921803@lid"
      }
    },
    "convertToMp4": false
  }'
```

**Resposta:** `{ "base64": "iVBORw0KGgo..." }` → Salvar com `Buffer.from(base64, 'base64')`

**NUNCA** tentar baixar mídia pela URL `mmg.whatsapp.net` — é encriptada e expira.

---

## 👤 Profile Settings

### Buscar Perfil Comercial

**Endpoint:** `POST /profile/fetchBusinessProfile/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/profile/fetchBusinessProfile/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999"
  }'
```

### Buscar Perfil

**Endpoint:** `POST /profile/fetchProfile/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/profile/fetchProfile/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "number": "5511999999999"
  }'
```

### Atualizar Nome do Perfil

**Endpoint:** `POST /profile/updateProfileName/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/profile/updateProfileName/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "name": "Meu Novo Nome"
  }'
```

### Atualizar Status do Perfil

**Endpoint:** `POST /profile/updateProfileStatus/{instance}`

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/profile/updateProfileStatus/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "status": "Disponível para atendimento"
  }'
```

### Atualizar Foto do Perfil

**Endpoint:** `PUT /profile/updateProfilePicture/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/profile/updateProfilePicture/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "picture": "https://exemplo.com/minha-foto.jpg"
  }'
```

### Remover Foto do Perfil

**Endpoint:** `PUT /profile/removeProfilePicture/{instance}`

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/profile/removeProfilePicture/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

### Configurações de Privacidade

**Buscar:**

```bash
curl --request GET \
  --url https://evolution.rafaeltondin.com.br/profile/fetchPrivacySettings/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

**Atualizar:**

```bash
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/profile/updatePrivacySettings/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "readreceipts": "all",
    "profile": "contacts",
    "status": "contacts",
    "online": "all",
    "last": "contacts",
    "groupadd": "contacts"
  }'
```

---

## 🔗 Integrações

### Typebot

**Configurar:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/typebot/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "enabled": true,
    "url": "https://typebot.io",
    "typebot": "meu-fluxo",
    "expire": 20,
    "keywordFinish": "#sair",
    "delayMessage": 1000,
    "unknownMessage": "Desculpe, não entendi.",
    "listeningFromMe": false,
    "stopBotFromMe": true,
    "keepOpen": false
  }'
```

**Iniciar Sessão:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/typebot/start/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "remoteJid": "5511999999999@s.whatsapp.net",
    "url": "https://typebot.io",
    "typebot": "meu-fluxo"
  }'
```

**Alterar Status:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/typebot/changeStatus/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "remoteJid": "5511999999999@s.whatsapp.net",
    "status": "paused"
  }'
```

### Chatwoot

**Configurar:**

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chatwoot/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "enabled": true,
    "accountId": 1,
    "token": "token-do-chatwoot",
    "url": "https://app.chatwoot.com",
    "signMsg": true,
    "reopenConversation": true,
    "conversationPending": false,
    "nameInbox": "WhatsApp",
    "importContacts": true,
    "importMessages": true,
    "daysLimitImportMessages": 7
  }'
```

### RabbitMQ

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/rabbitmq/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "enabled": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### SQS (Amazon)

```bash
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/sqs/set/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{
    "enabled": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE"
    ]
  }'
```

---

## 💻 Exemplos Práticos

### Bot de Atendimento Básico (Node.js)

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const EVOLUTION_URL = 'https://evolution.rafaeltondin.com.br';
const API_KEY = '{{secret:EVOLUTION_API_KEY}}';
const INSTANCE = 'minha-instancia';

// Função para enviar mensagem
async function sendMessage(number, text) {
  try {
    const response = await axios.post(
      `${EVOLUTION_URL}/message/sendText/${INSTANCE}`,
      {
        number: number,
        text: text
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.message);
    throw error;
  }
}

// Webhook para receber mensagens
app.post('/webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'messages.upsert') {
    const { key, message, pushName } = data;
    
    // Ignorar mensagens enviadas por mim
    if (key.fromMe) {
      return res.status(200).json({ received: true });
    }
    
    const number = key.remoteJid.replace('@s.whatsapp.net', '');
    const text = message.conversation || 
                 message.extendedTextMessage?.text || '';
    
    console.log(`Mensagem de ${pushName} (${number}): ${text}`);
    
    // Respostas automáticas
    const textLower = text.toLowerCase();
    
    if (textLower.includes('oi') || textLower.includes('olá')) {
      await sendMessage(number, `Olá ${pushName}! 👋\n\nComo posso ajudá-lo hoje?\n\n1️⃣ Informações\n2️⃣ Suporte\n3️⃣ Vendas`);
    } else if (text === '1') {
      await sendMessage(number, '📋 *Informações*\n\nHorário: Seg-Sex 9h às 18h\nEndereço: Rua Exemplo, 123\nSite: https://exemplo.com');
    } else if (text === '2') {
      await sendMessage(number, '🛠 *Suporte*\n\nUm atendente entrará em contato em breve!\n\nOu envie um email para: suporte@exemplo.com');
    } else if (text === '3') {
      await sendMessage(number, '💰 *Vendas*\n\nConheça nossos produtos em:\nhttps://loja.exemplo.com\n\nOu fale com um vendedor: (11) 99999-9999');
    } else {
      await sendMessage(number, 'Desculpe, não entendi. Digite "Oi" para iniciar o atendimento.');
    }
  }
  
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Bot rodando na porta 3000');
});
```

### Cliente API Completo (Python)

```python
import requests
from typing import Optional, List, Dict, Any

class EvolutionAPI:
    def __init__(self, base_url: str, api_key: str, instance: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.instance = instance
        self.headers = {
            'Content-Type': 'application/json',
            'apikey': api_key
        }
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}/{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    # === Instância ===
    def create_instance(self, name: str, qrcode: bool = True) -> Dict:
        return self._request('POST', 'instance/create', {
            'instanceName': name,
            'qrcode': qrcode
        })
    
    def get_qrcode(self) -> Dict:
        return self._request('GET', f'instance/connect/{self.instance}')
    
    def get_connection_state(self) -> Dict:
        return self._request('GET', f'instance/connectionState/{self.instance}')
    
    # === Mensagens ===
    def send_text(self, number: str, text: str, delay: int = 0) -> Dict:
        data = {
            'number': number,
            'text': text
        }
        if delay:
            data['delay'] = delay
        return self._request('POST', f'message/sendText/{self.instance}', data)
    
    def send_media(self, number: str, media_type: str, media_url: str, 
                   caption: str = '', filename: str = '') -> Dict:
        data = {
            'number': number,
            'mediatype': media_type,
            'media': media_url,
            'caption': caption
        }
        if filename:
            data['fileName'] = filename
        return self._request('POST', f'message/sendMedia/{self.instance}', data)
    
    def send_location(self, number: str, lat: float, lng: float, 
                      name: str = '', address: str = '') -> Dict:
        return self._request('POST', f'message/sendLocation/{self.instance}', {
            'number': number,
            'locationMessage': {
                'latitude': lat,
                'longitude': lng,
                'name': name,
                'address': address
            }
        })
    
    def send_contact(self, number: str, contacts: List[Dict]) -> Dict:
        return self._request('POST', f'message/sendContact/{self.instance}', {
            'number': number,
            'contactMessage': contacts
        })
    
    # === Chat ===
    def check_whatsapp_numbers(self, numbers: List[str]) -> List[Dict]:
        return self._request('POST', f'chat/whatsappNumbers/{self.instance}', {
            'numbers': numbers
        })
    
    def mark_as_read(self, remote_jid: str, message_id: str, from_me: bool = False) -> Dict:
        return self._request('PUT', f'chat/markMessageAsRead/{self.instance}', {
            'readMessages': [{
                'remoteJid': remote_jid,
                'fromMe': from_me,
                'id': message_id
            }]
        })
    
    def find_chats(self) -> List[Dict]:
        return self._request('GET', f'chat/findChats/{self.instance}')
    
    # === Grupos ===
    def create_group(self, subject: str, participants: List[str], 
                     description: str = '') -> Dict:
        return self._request('POST', f'group/create/{self.instance}', {
            'subject': subject,
            'description': description,
            'participants': participants
        })
    
    def fetch_all_groups(self) -> List[Dict]:
        return self._request('GET', f'group/fetchAllGroups/{self.instance}')
    
    def add_participants(self, group_jid: str, participants: List[str]) -> Dict:
        return self._request('PUT', f'group/updateParticipant/{self.instance}', {
            'groupJid': group_jid,
            'action': 'add',
            'participants': participants
        })
    
    # === Webhook ===
    def set_webhook(self, url: str, events: List[str]) -> Dict:
        return self._request('POST', f'webhook/set/{self.instance}', {
            'enabled': True,
            'url': url,
            'webhookByEvents': False,
            'events': events
        })


# Exemplo de uso
if __name__ == "__main__":
    api = EvolutionAPI(
        base_url='https://evolution.rafaeltondin.com.br',
        api_key='{{secret:EVOLUTION_API_KEY}}',
        instance='minha-instancia'
    )
    
    # Verificar conexão
    state = api.get_connection_state()
    print(f"Status: {state['state']}")
    
    # Enviar mensagem
    result = api.send_text('5511999999999', 'Olá! Teste da API.')
    print(f"Mensagem enviada: {result['key']['id']}")
    
    # Verificar números
    numbers = api.check_whatsapp_numbers(['5511999999999', '5511888888888'])
    for n in numbers:
        print(f"{n['number']}: {'✅' if n['exists'] else '❌'}")
```

### Envio em Massa com Rate Limiting

```javascript
const axios = require('axios');

const EVOLUTION_URL = 'https://evolution.rafaeltondin.com.br';
const API_KEY = '{{secret:EVOLUTION_API_KEY}}';
const INSTANCE = 'minha-instancia';

// Delay entre mensagens (recomendado: 3-5 segundos)
const DELAY_BETWEEN_MESSAGES = 4000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendBulkMessages(contacts, message) {
  const results = [];
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    try {
      console.log(`[${i + 1}/${contacts.length}] Enviando para ${contact.number}...`);
      
      const response = await axios.post(
        `${EVOLUTION_URL}/message/sendText/${INSTANCE}`,
        {
          number: contact.number,
          options: {
            delay: 1500,
            presence: 'composing'
          },
          text: message.replace('{nome}', contact.name || 'Cliente')
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );
      
      results.push({
        number: contact.number,
        success: true,
        messageId: response.data.key.id
      });
      
      console.log(`✅ Enviado para ${contact.number}`);
      
    } catch (error) {
      results.push({
        number: contact.number,
        success: false,
        error: error.message
      });
      
      console.log(`❌ Erro ao enviar para ${contact.number}: ${error.message}`);
    }
    
    // Aguardar antes da próxima mensagem
    if (i < contacts.length - 1) {
      await sleep(DELAY_BETWEEN_MESSAGES);
    }
  }
  
  return results;
}

// Exemplo de uso
const contacts = [
  { number: '5511999999999', name: 'João' },
  { number: '5511888888888', name: 'Maria' },
  { number: '5511777777777', name: 'Pedro' }
];

const message = `Olá {nome}! 👋

Esta é uma mensagem promocional.

🎉 Aproveite nosso desconto especial!

Acesse: https://loja.exemplo.com`;

sendBulkMessages(contacts, message)
  .then(results => {
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Relatório Final:`);
    console.log(`✅ Sucesso: ${success}`);
    console.log(`❌ Falhas: ${failed}`);
  });
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. QR Code não é gerado

**Sintoma:** Endpoint `/instance/connect` não retorna QR Code

**Soluções:**
- Verifique se a instância foi criada corretamente
- Confirme que a instância não está já conectada
- Reinicie a instância com `/instance/restart`

```bash
# Reiniciar instância
curl --request PUT \
  --url https://evolution.rafaeltondin.com.br/instance/restart/minha-instancia \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}'
```

#### 2. Erro 401 - Unauthorized

**Sintoma:** Todas as requisições retornam erro 401

**Soluções:**
- Verifique se o header `apikey` está correto
- Confirme a API Key: `{{secret:EVOLUTION_API_KEY}}`
- Certifique-se de usar `apikey` e não `Authorization`

#### 3. Mensagem não enviada

**Sintoma:** Status "PENDING" mas mensagem não chega

**Soluções:**
- Verifique se o número está correto (com código do país)
- Confirme que a instância está conectada
- Verifique se o número é um WhatsApp válido

```bash
# Verificar se número é WhatsApp
curl --request POST \
  --url https://evolution.rafaeltondin.com.br/chat/whatsappNumbers/minha-instancia \
  --header 'Content-Type: application/json' \
  --header 'apikey: {{secret:EVOLUTION_API_KEY}}' \
  --data '{"numbers": ["5511999999999"]}'
```

#### 4. Webhook não recebe eventos

**Sintoma:** Webhook configurado mas não recebe dados

**Soluções:**
- Verifique se a URL do webhook está acessível publicamente
- Confirme que o webhook retorna status 200
- Verifique os eventos configurados
- Use ferramentas como [webhook.site](https://webhook.site) para testar

#### 5. Conexão caindo frequentemente

**Sintoma:** Instância desconecta sozinha

**Soluções:**
- Não use o mesmo número em múltiplos dispositivos
- Evite enviar muitas mensagens rapidamente
- Configure `alwaysOnline: true` nas settings
- Verifique logs do servidor para mais detalhes

### Códigos de Status HTTP

| Código | Significado | Ação |
|--------|-------------|------|
| 200 | Sucesso | Requisição processada |
| 201 | Criado | Recurso criado com sucesso |
| 400 | Bad Request | Verifique o body da requisição |
| 401 | Unauthorized | Verifique a API Key |
| 404 | Not Found | Verifique o nome da instância |
| 500 | Server Error | Erro interno, tente novamente |

### Logs de Debug

Para ativar logs detalhados em suas aplicações:

**Node.js:**
```javascript
axios.interceptors.request.use(request => {
  console.log('Request:', JSON.stringify(request, null, 2));
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
});
```

**Python:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 📚 Referências

- **Documentação Oficial:** [doc.evolution-api.com](https://doc.evolution-api.com)
- **GitHub:** [github.com/EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api)
- **Postman Collection:** [Evolution API Postman](https://www.postman.com/agenciadgcode/evolution-api)

---

## 📝 Resumo de Endpoints

### Instâncias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/instance/create` | Criar instância |
| GET | `/instance/fetchInstances` | Listar instâncias |
| GET | `/instance/connect/{instance}` | Conectar/QR Code |
| GET | `/instance/connectionState/{instance}` | Status conexão |
| PUT | `/instance/restart/{instance}` | Reiniciar |
| DELETE | `/instance/logout/{instance}` | Desconectar |
| DELETE | `/instance/delete/{instance}` | Deletar |

### Mensagens
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/message/sendText/{instance}` | Enviar texto |
| POST | `/message/sendMedia/{instance}` | Enviar mídia |
| POST | `/message/sendWhatsAppAudio/{instance}` | Enviar áudio |
| POST | `/message/sendLocation/{instance}` | Enviar localização |
| POST | `/message/sendContact/{instance}` | Enviar contato |
| POST | `/message/sendReaction/{instance}` | Enviar reação |
| POST | `/message/sendPoll/{instance}` | Enviar enquete |
| POST | `/message/sendList/{instance}` | Enviar lista |
| POST | `/message/sendStatus/{instance}` | Enviar status |
| POST | `/message/sendSticker/{instance}` | Enviar sticker |

### Grupos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/group/create/{instance}` | Criar grupo |
| GET | `/group/fetchAllGroups/{instance}` | Listar grupos |
| PUT | `/group/updateParticipant/{instance}` | Gerenciar membros |
| PUT | `/group/updateSetting/{instance}` | Configurações |
| DELETE | `/group/leaveGroup/{instance}` | Sair do grupo |

### Chat Controller
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/chat/whatsappNumbers/{instance}` | Verificar se é WhatsApp |
| POST | `/chat/findContacts/{instance}` | Buscar contatos (body: where) |
| POST | `/chat/findMessages/{instance}` | Buscar mensagens (body: where, limit, page) |
| POST | `/chat/findChats/{instance}` | Listar chats (**POST**, não GET!) |
| POST | `/chat/getBase64FromMediaMessage/{instance}` | Baixar mídia como base64 |
| PUT | `/chat/markMessageAsRead/{instance}` | Marcar como lida |
| PUT | `/chat/archiveChat/{instance}` | Arquivar chat |
| DELETE | `/chat/deleteMessageForEveryone/{instance}` | Deletar msg para todos |
| POST | `/chat/sendPresence/{instance}` | Enviar presença (digitando) |
| POST | `/chat/fetchProfilePictureUrl/{instance}` | Foto do perfil |

### Webhook
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/webhook/set/{instance}` | Configurar webhook |
| GET | `/webhook/find/{instance}` | Buscar configuração |

---

**Documento criado:** 2025-12-25  
**Última atualização:** 2025-12-25  
**Versão:** 2.0.0

---

## 🔒 Segurança

> ⚠️ **IMPORTANTE:** Mantenha sua API Key em segredo. Nunca exponha em código frontend ou repositórios públicos. Use variáveis de ambiente para armazenar credenciais sensíveis.

```bash
# .env (nunca commitar este arquivo)
EVOLUTION_API_KEY={{secret:EVOLUTION_API_KEY}}
```

```javascript
// Usar variável de ambiente
const API_KEY = process.env.EVOLUTION_API_KEY;
```

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-12 - findContacts faz match EXATO, não parcial
**Contexto:** Busca de contatos por nome usando `POST /chat/findContacts/{instance}` com `where.pushName`
**Erro:** Enviar `{"where":{"pushName":"João"}}` retorna 0 resultados se o nome completo é "João Silva"
**Solução:** Buscar TODOS os contatos com body `{}` e filtrar localmente com `includes()` case-insensitive
**Regra:** NUNCA usar `where.pushName` para busca parcial. Sempre buscar todos e filtrar no client-side.

### 2026-03-12 - fetchAllGroups exige getParticipants na query
**Contexto:** Listagem de grupos via `GET /group/fetchAllGroups/{instance}`
**Erro:** Chamar sem query params retorna 400: `{"message":["The getParticipants needs to be informed in the query"]}`
**Solução:** Adicionar `?getParticipants=false` (ou true se precisar dos membros)
**Regra:** SEMPRE incluir `?getParticipants=false` ao listar grupos. Sem esse param a API retorna 400.

### 2026-03-12 - findChats endpoint NÃO existe na v2 (**CORRIGIDO 2026-03-17**)
**Contexto:** Tentativa de listar chats via `GET /chat/findChats/{instance}`
**Erro ORIGINAL:** Endpoint retorna 404 com método GET
**CORREÇÃO (2026-03-17):** O endpoint **EXISTE** mas é **POST**, não GET. Body: `{"where":{"owner":"cenora"}}`. Retorna todos os chats DM e grupos com pushName, remoteJid, lastMessage.
**Regra:** findChats é **POST** com body where. NUNCA usar GET. Funciona perfeitamente para listar todos os chats.

### 2026-03-12 - Campo remoteJid vs id nos contatos
**Contexto:** Exibição do número de telefone dos contatos retornados por findContacts
**Erro:** Usar `c.id` retorna UUID interno do banco (ex: `cmmgeljl901vujj5pyc3jf3f2`), não o telefone
**Solução:** Usar `c.remoteJid` que contém o JID real (ex: `554891574215@s.whatsapp.net`) e fazer strip do `@s.whatsapp.net`
**Regra:** Para obter o número do contato, usar `remoteJid` e remover sufixo. Campo `id` é UUID interno.

### 2026-03-12 - fetchAllGroups timeout com muitos grupos
**Contexto:** Listagem de 206 grupos via fetchAllGroups com timeout padrão de 30s
**Erro:** Request timeout antes de completar a resposta
**Solução:** Aumentar timeout para 120000ms (2 minutos)
**Regra:** Para fetchAllGroups, usar timeout mínimo de 120s. Com muitos grupos, a resposta pode demorar.

### 2026-03-17 - Domínio correto é evolution.rafaeltondin.com.br (NÃO evo.)
**Contexto:** Acesso à Evolution API para buscar mensagens WhatsApp
**Erro:** Usado `evo.rafaeltondin.com.br` — SSL mismatch e 404
**Solução:** O domínio correto é `evolution.rafaeltondin.com.br`. Precisa `rejectUnauthorized: false` (cert aponta para srv410981.hstgr.cloud)
**Regra:** SEMPRE usar `evolution.rafaeltondin.com.br` como hostname. NUNCA abreviar para `evo.`.

### 2026-03-17 - Contatos com LID: findMessages com remoteJid @s.whatsapp.net retorna 0
**Contexto:** Buscar mensagens de contato específico usando `POST /chat/findMessages/{instance}` com `where.key.remoteJid: "55XXXX@s.whatsapp.net"`
**Erro:** Retorna `total: 0` mesmo com 191 mensagens existentes. O WhatsApp migrou JIDs para formato LID (ex: `166232967921803@lid`)
**Solução:** 1) Usar `POST /chat/findChats/{instance}` com body `{"where":{"owner":"cenora"}}` para listar todos os chats. 2) Encontrar o chat do contato pelo `pushName`. 3) Usar o `remoteJid` no formato LID para buscar mensagens.
**Regra:** NUNCA assumir que o JID de um contato é `numero@s.whatsapp.net`. Muitos contatos usam formato LID (`numero@lid`). SEMPRE buscar o JID real via findChats antes de findMessages.

### 2026-03-17 - findChats EXISTE na versão atual (contradiz lição de 2026-03-12)
**Contexto:** Listagem de chats via `POST /chat/findChats/{instance}`
**Erro:** Lição anterior dizia que findChats não existia na v2 (retornava 404 com GET)
**Solução:** O endpoint existe como **POST** (não GET). Body: `{"where":{"owner":"cenora"}}`. Retorna todos os chats com remoteJid, pushName, lastMessage, unreadCount.
**Regra:** findChats funciona como POST com body where. A lição anterior estava incorreta — provavelmente testou com GET.

### 2026-03-17 - findMessages com pushName NÃO filtra corretamente
**Contexto:** Tentativa de filtrar mensagens por `where.pushName: "Gabi Rossetti"` no findMessages
**Erro:** Retorna TODAS as 23776 mensagens da instância, ignorando o filtro pushName
**Solução:** Filtrar por `where.key.remoteJid` usando o JID/LID correto do contato
**Regra:** NUNCA usar `pushName` como filtro em findMessages — não funciona. SEMPRE filtrar por `key.remoteJid`.

### 2026-03-17 - getBase64FromMediaMessage funciona para baixar mídia
**Contexto:** Download de imagens enviadas como documento no WhatsApp
**Erro:** URLs de mídia do WhatsApp (mmg.whatsapp.net) são encriptadas e expiram
**Solução:** Usar `POST /chat/getBase64FromMediaMessage/{instance}` com body `{"message":{"key":{"id":"MSG_ID","remoteJid":"JID"}}}`. Retorna `{base64: "..."}` que pode ser salvo com `Buffer.from(base64, 'base64')`.
**Regra:** Para baixar mídia do WhatsApp, SEMPRE usar getBase64FromMediaMessage. NUNCA tentar baixar da URL direta (encriptada e expira).

### 2026-03-17 - Filtro por messageType funciona em findMessages
**Contexto:** Buscar apenas documentos enviados por contato específico
**Erro:** Nenhum — descoberta positiva
**Solução:** `where: { key: { remoteJid: "JID" }, messageType: "documentMessage" }` filtra corretamente por tipo
**Regra:** Para buscar mídia específica, usar `messageType` no where: `documentMessage`, `imageMessage`, `videoMessage`, `audioMessage`, `stickerMessage`.

### 2026-03-20 - URL correta da Evolution API é evolution.rafaeltondin.com.br (NÃO press.)
**Contexto:** Configuração do CRM Riwer Labs com integração WhatsApp via Evolution API V2
**Erro:** Config usava `press.rafaeltondin.com.br` — retorna 404 e SSL inválido
**Solução:** Usar `evolution.rafaeltondin.com.br` como URL base da Evolution API. Instância ativa: `cenora` (não `RiwerLabs`)
**Regra:** ANTES de configurar qualquer integração com a Evolution API, verificar instâncias disponíveis com `GET /instance/fetchInstances` usando a URL correta. NUNCA assumir nome de instância sem verificar.
