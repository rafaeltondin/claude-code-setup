---
title: "ElevenLabs API - Documentação Completa de Text-to-Speech"
category: "APIs"
tags:
  - elevenlabs
  - text-to-speech
  - tts
  - speech synthesis
  - voice cloning
  - speech-to-speech
  - audio generation
  - vozes brasileiras
  - multilingual
  - eleven_v3
  - streaming audio
  - api rest
  - inteligencia artificial
  - voz artificial
  - narração
topic: "API Text-to-Speech"
priority: high
version: "1.0"
last_updated: "2026-03-13"
---

# ElevenLabs API — Documentação Completa de Text-to-Speech

Documentação completa da API ElevenLabs para geração de voz com IA. Este guia cobre todos os endpoints, vozes brasileiras disponíveis, modelos, parâmetros, exemplos práticos em Python e Node.js, e boas práticas de uso.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Credenciais e Configuração](#2-credenciais-e-configuração)
3. [Autenticação](#3-autenticação)
4. [Modelos Disponíveis](#4-modelos-disponíveis)
5. [Vozes Brasileiras](#5-vozes-brasileiras)
6. [Endpoint: Text-to-Speech](#6-endpoint-text-to-speech)
7. [Endpoint: TTS em Streaming](#7-endpoint-tts-em-streaming)
8. [Endpoint: Listar Vozes](#8-endpoint-listar-vozes)
9. [Endpoint: Detalhes de uma Voz](#9-endpoint-detalhes-de-uma-voz)
10. [Endpoint: Listar Modelos](#10-endpoint-listar-modelos)
11. [Endpoint: Informações do Usuário](#11-endpoint-informações-do-usuário)
12. [Endpoint: Histórico de Gerações](#12-endpoint-histórico-de-gerações)
13. [Endpoint: Speech-to-Speech](#13-endpoint-speech-to-speech)
14. [Endpoint: Adicionar Voz Clonada](#14-endpoint-adicionar-voz-clonada)
15. [Formatos de Saída de Áudio](#15-formatos-de-saída-de-áudio)
16. [Parâmetros de Voice Settings](#16-parâmetros-de-voice-settings)
17. [Exemplos Completos em Python](#17-exemplos-completos-em-python)
18. [Exemplos Completos em Node.js](#18-exemplos-completos-em-nodejs)
19. [Referência Rápida — Vozes BR](#19-referência-rápida--vozes-br)
20. [Boas Práticas](#20-boas-práticas)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Visão Geral

A ElevenLabs é uma plataforma líder em síntese de voz com IA, oferecendo:

- **Text-to-Speech (TTS):** Converter texto em áudio com vozes realistas
- **Speech-to-Speech (STS):** Transformar uma voz em outra mantendo o conteúdo
- **Voice Cloning:** Clonar vozes a partir de amostras de áudio
- **Streaming:** Geração de áudio em tempo real para aplicações interativas
- **72 idiomas** suportados (incluindo português brasileiro) no modelo v3

### Informações Essenciais

| Item | Valor |
|------|-------|
| **URL Base** | `https://api.elevenlabs.io` |
| **Versão da API** | `v1` |
| **Autenticação** | Header `xi-api-key` |
| **Vault** | `ELEVENLABS_API_KEY` |
| **Formato padrão** | `mp3_44100_128` |
| **Encoding de resposta** | `audio/mpeg` (MP3) ou `audio/pcm` (PCM) |

---

## 2. Credenciais e Configuração

### Obter a API Key do Vault

```bash
# Via credential CLI
node ~/.claude/task-scheduler/credential-cli.js get ELEVENLABS_API_KEY

# Via script seguro (recomendado para uso em código)
node ~/.claude/task-scheduler/credential-cli.js run meu-script.js
```

### Variável de Ambiente no Script

```javascript
// No script salvo em ~/.claude/temp/
const API_KEY = process.env.ELEVENLABS_API_KEY;
```

> **REGRA DE SEGURANÇA:** NUNCA logar a API key no stdout, em arquivos de log ou commitar em repositórios git.

---

## 3. Autenticação

Todas as requisições precisam do header de autenticação:

```
xi-api-key: SUA_API_KEY
```

### Exemplo de header completo (TTS)

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
xi-api-key: SUA_API_KEY
Content-Type: application/json
Accept: audio/mpeg
```

### Verificar autenticação (testar conexão)

```bash
curl -s https://api.elevenlabs.io/v1/user \
  -H "xi-api-key: $ELEVENLABS_API_KEY"
```

---

## 4. Modelos Disponíveis

### Tabela Completa de Modelos

| Model ID | Nome | Idiomas | Melhor Para |
|----------|------|---------|-------------|
| `eleven_v3` | Eleven v3 | 72 (inclui pt-BR) | Máxima qualidade, multilingual |
| `eleven_multilingual_v2` | Eleven Multilingual v2 | 28 (inclui pt-BR) | Qualidade alta, compatibilidade |
| `eleven_flash_v2_5` | Eleven Flash v2.5 | 31 (inclui pt-BR) | Velocidade, streaming real-time |
| `eleven_turbo_v2_5` | Eleven Turbo v2.5 | 31 (inclui pt-BR) | Equilíbrio velocidade/qualidade |
| `eleven_turbo_v2` | Turbo v2 | Apenas inglês | Inglês rápido |
| `eleven_flash_v2` | Flash v2 | Apenas inglês | Inglês ultra-rápido |
| `eleven_english_sts_v2` | English STS v2 | Apenas inglês | Speech-to-speech em inglês |
| `eleven_monolingual_v1` | English v1 | Apenas inglês | Legado inglês |
| `eleven_multilingual_sts_v2` | Multilingual STS v2 | 28 idiomas | Speech-to-speech multilingual |
| `eleven_multilingual_v1` | Multilingual v1 | Multilingual | Legado multilingual |

### Recomendações por Caso de Uso

| Cenário | Modelo Recomendado |
|---------|--------------------|
| Narração em português, máxima qualidade | `eleven_v3` |
| Podcast / audiobook PT-BR | `eleven_v3` |
| Chatbot / resposta em tempo real | `eleven_flash_v2_5` |
| VSL (Video Sales Letter) | `eleven_v3` |
| Locução corporativa | `eleven_multilingual_v2` |
| Prototipagem rápida | `eleven_flash_v2_5` |
| Speech-to-speech PT-BR | `eleven_multilingual_sts_v2` |

---

## 5. Vozes Brasileiras

### Visão Geral

O ElevenLabs possui **13 vozes brasileiras nativas** disponíveis na plataforma. Abaixo estão detalhadas por gênero com seus IDs e características.

---

### 5.1 Vozes Femininas (7)

| Voice ID | Nome | Faixa Etária | Estilo | Casos de Uso |
|----------|------|--------------|--------|--------------|
| `oJebhZNaPllxk6W0LSBA` | Carla — Narradora Infantil | Jovem | Narrativo | Histórias infantis, conteúdo kids |
| `m151rjrbWXbBqyq56tly` | Carla — Institucional | Jovem | Corporativo | Vídeos corporativos, treinamentos |
| `x8FWrDHAK5xiFTJLpnHq` | Carla — VSL Extra Income | Jovem | Vendas, mídias sociais | VSL, anúncios de renda extra |
| `cyD08lEy76q03ER1jZ7y` | ScheilaSMTy | Meia-idade | Conversacional | Podcasts, conversas naturais |
| `GDzHdQOi6jjf8zaXhCYD` | Raquel — Conversacional | Jovem | Amigável | Chatbots, atendimento ao cliente |
| `5EtawPduB139avoMLQgH` | Thais N — Female Voice | Jovem | Narrativo | Narrações em geral, e-learning |
| `lWq4KDY8znfkV0DrK8Vb` | Yasmin | Jovem | Narrativo | Audiobooks, narrações |

---

### 5.2 Vozes Masculinas (6)

| Voice ID | Nome | Faixa Etária | Estilo | Casos de Uso |
|----------|------|--------------|--------|--------------|
| `tS45q0QcrDHqHoaWdCDR` | Lax | Jovem | Alegre, jornalismo | News broadcast, locuções animadas |
| `F7823wtD50WK1gnmgBk5` | Matheus Moretti Cruz | Jovem | Calmo, conversacional | Meditação, narração suave |
| `0YziWIrqiRTHCxeg1lyc` | Will — Dynamic Voiceover | Jovem | Barítono, mídias sociais | Reels, stories, anúncios |
| `MjS9ecoVZlOFzvnemirW` | João Gabriel | Meia-idade | Conversacional, jornalismo | Notícias, podcasts, documentários |
| `vr6MVhO51WHYH7ev2Qn9` | Onildo F R | Meia-idade | Narrativo | Documentários, narrações sérias |
| `7lu3ze7orhWaNeSPowWx` | Lucas — Social Media Voice | Jovem | Mídias sociais, YouTube | YouTube, TikTok, Instagram |

---

### 5.3 Guia de Seleção de Voz

```
Precisa de voz para ANÚNCIOS / VSL?
  → Feminina: Carla VSL (x8FWrDHAK5xiFTJLpnHq)
  → Masculina: Will (0YziWIrqiRTHCxeg1lyc) ou Lax (tS45q0QcrDHqHoaWdCDR)

Precisa de NARRAÇÃO / AUDIOBOOK?
  → Feminina: Thais N (5EtawPduB139avoMLQgH) ou Yasmin (lWq4KDY8znfkV0DrK8Vb)
  → Masculina: Onildo (vr6MVhO51WHYH7ev2Qn9) ou Matheus (F7823wtD50WK1gnmgBk5)

Precisa de voz CONVERSACIONAL / CHATBOT?
  → Feminina: Raquel (GDzHdQOi6jjf8zaXhCYD) ou Scheila (cyD08lEy76q03ER1jZ7y)
  → Masculina: João Gabriel (MjS9ecoVZlOFzvnemirW)

Precisa de CONTEÚDO INFANTIL?
  → Carla Infantil (oJebhZNaPllxk6W0LSBA)

Precisa de voz CORPORATIVA / INSTITUCIONAL?
  → Feminina: Carla Institucional (m151rjrbWXbBqyq56tly)
  → Masculina: João Gabriel (MjS9ecoVZlOFzvnemirW)

Precisa de voz para REDES SOCIAIS / YOUTUBE?
  → Lucas (7lu3ze7orhWaNeSPowWx) ou Will (0YziWIrqiRTHCxeg1lyc)
```

---

## 6. Endpoint: Text-to-Speech

### Requisição

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
```

### Headers

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| `xi-api-key` | Sua API key | Sim |
| `Content-Type` | `application/json` | Sim |
| `Accept` | `audio/mpeg` | Recomendado |

### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `output_format` | string | Formato do áudio (alternativa ao body) |

### Body JSON

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `text` | string | — | **Obrigatório.** Texto a converter em voz |
| `model_id` | string | `eleven_monolingual_v1` | ID do modelo de síntese |
| `voice_settings` | object | — | Configurações de voz (ver seção 16) |
| `output_format` | string | `mp3_44100_128` | Formato do áudio de saída |

### Headers de Resposta

| Header | Descrição |
|--------|-----------|
| `character-cost` | Custo em caracteres desta geração |
| `character-count-change-from` | Saldo de caracteres antes |
| `character-count-change-to` | Saldo de caracteres depois |

### Exemplo de Requisição (cURL)

```bash
curl -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/GDzHdQOi6jjf8zaXhCYD" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: audio/mpeg" \
  -d '{
    "text": "Olá! Seja bem-vindo ao sistema de narração automática.",
    "model_id": "eleven_v3",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true
    }
  }' \
  --output audio.mp3
```

---

## 7. Endpoint: TTS em Streaming

Gera o áudio em chunks progressivos — ideal para chatbots e respostas em tempo real.

### Requisição

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream
```

Os parâmetros de body e headers são idênticos ao endpoint padrão (seção 6).

### Diferença Principal

- O endpoint padrão retorna o áudio completo de uma vez
- O endpoint de stream retorna chunks de áudio conforme são gerados
- Recomendado usar com `eleven_flash_v2_5` para menor latência

### Exemplo Node.js com Stream

```javascript
const https = require('https');
const fs = require('fs');

const VOICE_ID = 'GDzHdQOi6jjf8zaXhCYD'; // Raquel
const API_KEY = process.env.ELEVENLABS_API_KEY;

const body = JSON.stringify({
    text: 'Esta é uma resposta em streaming para menor latência.',
    model_id: 'eleven_flash_v2_5',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
});

const opts = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}/stream`,
    method: 'POST',
    headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
    }
};

const file = fs.createWriteStream('stream_output.mp3');
const req = https.request(opts, res => {
    console.log('Status:', res.statusCode);
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Stream concluído: stream_output.mp3');
    });
});

req.on('error', err => console.error('Erro:', err.message));
req.write(body);
req.end();
```

---

## 8. Endpoint: Listar Vozes

### Requisição

```
GET https://api.elevenlabs.io/v1/voices
```

### Headers

| Header | Valor |
|--------|-------|
| `xi-api-key` | Sua API key |

### Resposta

```json
{
  "voices": [
    {
      "voice_id": "GDzHdQOi6jjf8zaXhCYD",
      "name": "Raquel - For Conversational",
      "category": "premade",
      "labels": {
        "accent": "brazilian",
        "age": "young",
        "use_case": "conversational",
        "description": "friendly"
      },
      "preview_url": "https://...",
      "settings": null
    }
  ]
}
```

### Exemplo cURL

```bash
curl -s "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for v in data['voices']:
    labels = v.get('labels', {})
    if labels.get('accent') == 'brazilian':
        print(f\"{v['voice_id']} | {v['name']}\")
"
```

---

## 9. Endpoint: Detalhes de uma Voz

### Requisição

```
GET https://api.elevenlabs.io/v1/voices/{voice_id}
```

### Resposta

```json
{
  "voice_id": "GDzHdQOi6jjf8zaXhCYD",
  "name": "Raquel - For Conversational",
  "samples": null,
  "category": "premade",
  "fine_tuning": { ... },
  "labels": {
    "accent": "brazilian",
    "age": "young",
    "use_case": "conversational",
    "description": "friendly"
  },
  "description": null,
  "preview_url": "https://...",
  "available_for_tiers": [],
  "settings": {
    "stability": 0.75,
    "similarity_boost": 0.75
  },
  "sharing": null,
  "high_quality_base_model_ids": ["eleven_multilingual_v2"]
}
```

---

## 10. Endpoint: Listar Modelos

### Requisição

```
GET https://api.elevenlabs.io/v1/models
```

### Resposta

```json
[
  {
    "model_id": "eleven_v3",
    "name": "Eleven v3",
    "can_be_finetuned": false,
    "can_do_text_to_speech": true,
    "can_do_voice_conversion": false,
    "can_use_style": true,
    "can_use_speaker_boost": true,
    "serves_pro_voices": false,
    "token_cost_factor": 1.0,
    "description": "Our most advanced multilingual model...",
    "requires_alpha_access": false,
    "max_characters_request_free_user": 500,
    "max_characters_request_subscribed_user": 5000,
    "maximum_text_length_per_request": 5000,
    "languages": [
      { "language_id": "pt", "name": "Portuguese" },
      ...
    ]
  }
]
```

---

## 11. Endpoint: Informações do Usuário

### Requisição

```
GET https://api.elevenlabs.io/v1/user
GET https://api.elevenlabs.io/v1/user/subscription
```

### Resposta de /v1/user

```json
{
  "subscription": {
    "tier": "free",
    "character_count": 1250,
    "character_limit": 10000,
    "can_extend_character_limit": false,
    "allowed_to_extend_character_limit": false,
    "next_character_count_reset_unix": 1712000000,
    "voice_limit": 30,
    "professional_voice_limit": 0,
    "can_extend_voice_limit": false,
    "can_use_instant_voice_cloning": false,
    "can_use_professional_voice_cloning": false,
    "currency": "usd",
    "status": "active"
  },
  "is_onboarding_completed": true
}
```

### Verificar saldo de caracteres (Node.js)

```javascript
const https = require('https');

const API_KEY = process.env.ELEVENLABS_API_KEY;

const opts = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/user/subscription',
    method: 'GET',
    headers: { 'xi-api-key': API_KEY }
};

https.request(opts, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const sub = JSON.parse(data);
        const usado = sub.character_count;
        const limite = sub.character_limit;
        const restante = limite - usado;
        console.log(`Caracteres: ${usado}/${limite} (${restante} restantes)`);
    });
}).end();
```

---

## 12. Endpoint: Histórico de Gerações

Acessa o histórico de todas as gerações de áudio realizadas na conta.

### Requisição

```
GET https://api.elevenlabs.io/v1/history
```

### Query Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page_size` | integer | Número de itens por página (padrão: 100, máx: 1000) |
| `start_after_history_item_id` | string | Paginação — ID do último item da página anterior |

### Resposta

```json
{
  "history": [
    {
      "history_item_id": "abc123",
      "request_id": "req_xyz",
      "voice_id": "GDzHdQOi6jjf8zaXhCYD",
      "voice_name": "Raquel - For Conversational",
      "model_id": "eleven_v3",
      "voice_category": "premade",
      "text": "Texto gerado aqui...",
      "date_unix": 1710000000,
      "character_count_change_from": 8750,
      "character_count_change_to": 8720,
      "content_type": "audio/mpeg",
      "state": "created",
      "settings": {
        "similarity_boost": 0.75,
        "stability": 0.5,
        "style": 0.0,
        "use_speaker_boost": true
      }
    }
  ],
  "last_history_item_id": "abc123",
  "has_more": false
}
```

### Download de áudio do histórico

```
GET https://api.elevenlabs.io/v1/history/{history_item_id}/audio
```

---

## 13. Endpoint: Speech-to-Speech

Converte um áudio de entrada em outra voz, preservando o conteúdo falado.

### Requisição

```
POST https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}
```

### Headers

```
xi-api-key: SUA_API_KEY
Content-Type: multipart/form-data
```

### Form Data

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `audio` | file | Arquivo de áudio de entrada (mp3, wav, etc.) |
| `model_id` | string | `eleven_multilingual_sts_v2` (para PT-BR) |
| `voice_settings` | JSON string | Configurações de voz |

### Exemplo Python

```python
import requests

API_KEY = "SUA_API_KEY"
VOICE_ID = "GDzHdQOi6jjf8zaXhCYD"  # Voz de destino

with open("audio_entrada.mp3", "rb") as f:
    response = requests.post(
        f"https://api.elevenlabs.io/v1/speech-to-speech/{VOICE_ID}",
        headers={"xi-api-key": API_KEY},
        data={
            "model_id": "eleven_multilingual_sts_v2",
            "voice_settings": '{"stability": 0.5, "similarity_boost": 0.75}'
        },
        files={"audio": f}
    )

with open("audio_saida.mp3", "wb") as out:
    out.write(response.content)
print("Speech-to-speech concluído!")
```

---

## 14. Endpoint: Adicionar Voz Clonada

Clona uma voz a partir de amostras de áudio fornecidas.

### Requisição

```
POST https://api.elevenlabs.io/v1/voices/add
```

### Form Data

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome da voz clonada |
| `description` | string | Descrição (opcional) |
| `labels` | JSON string | Labels como `{"accent": "brazilian"}` |
| `files` | file[] | 1 a 25 arquivos de áudio (.mp3, .wav) |

### Requisitos para bom clone de voz

- **Duração mínima:** 1 minuto de áudio
- **Duração ideal:** 3-5 minutos de áudio limpo
- **Qualidade:** Áudio sem ruído de fundo, sem música, sem eco
- **Variação:** Incluir variações de tom e ritmo na fala
- **Formato:** MP3 ou WAV de boa qualidade

### Exemplo Python

```python
import requests

API_KEY = "SUA_API_KEY"

files = [
    ("files", open("amostra1.mp3", "rb")),
    ("files", open("amostra2.mp3", "rb")),
]

response = requests.post(
    "https://api.elevenlabs.io/v1/voices/add",
    headers={"xi-api-key": API_KEY},
    data={
        "name": "Voz Personalizada Rafael",
        "description": "Clone de voz para narrações",
        "labels": '{"accent": "brazilian", "age": "young"}'
    },
    files=files
)

data = response.json()
print(f"Voz criada! ID: {data['voice_id']}")
```

---

## 15. Formatos de Saída de Áudio

### Tabela Completa

| Format ID | Codec | Sample Rate | Bitrate | Caso de Uso |
|-----------|-------|-------------|---------|-------------|
| `mp3_22050_32` | MP3 | 22,05 kHz | 32 kbps | Tamanho mínimo, voz simples |
| `mp3_44100_64` | MP3 | 44,1 kHz | 64 kbps | Podcasts com restrição de tamanho |
| `mp3_44100_96` | MP3 | 44,1 kHz | 96 kbps | Uso geral |
| `mp3_44100_128` | MP3 | 44,1 kHz | 128 kbps | **Padrão — bom equilíbrio** |
| `mp3_44100_192` | MP3 | 44,1 kHz | 192 kbps | Alta qualidade, produção final |
| `pcm_16000` | PCM | 16 kHz | 16-bit | Telefonia VoIP |
| `pcm_22050` | PCM | 22,05 kHz | 16-bit | Compatibilidade ampla |
| `pcm_24000` | PCM | 24 kHz | 16-bit | Web Audio API |
| `pcm_44100` | PCM | 44,1 kHz | 16-bit | Processamento de áudio |
| `ulaw_8000` | µ-law | 8 kHz | — | Telefonia clássica (PSTN) |

### Recomendações por Uso

| Uso | Formato Recomendado |
|-----|---------------------|
| Narração / audiobook (produção final) | `mp3_44100_192` |
| Uso geral / web | `mp3_44100_128` |
| Chatbot / resposta em tempo real | `mp3_44100_64` |
| Integração com Web Audio API | `pcm_24000` |
| Sistema de telefonia (URA) | `ulaw_8000` |
| Processamento posterior com DAW | `pcm_44100` |

---

## 16. Parâmetros de Voice Settings

### Tabela de Parâmetros

| Parâmetro | Tipo | Range | Padrão | Descrição |
|-----------|------|-------|--------|-----------|
| `stability` | float | 0.0 – 1.0 | 0.5 | Consistência e previsibilidade da voz |
| `similarity_boost` | float | 0.0 – 1.0 | 0.75 | Fidelidade à voz original |
| `style` | float | 0.0 – 1.0 | 0.0 | Intensidade de estilo/expressividade |
| `use_speaker_boost` | boolean | — | true | Melhora qualidade geral (consome mais) |

### Guia Prático: Stability

| Valor | Comportamento | Recomendado Para |
|-------|---------------|------------------|
| 0.1 – 0.3 | Muito expressivo, variável, às vezes imprevisível | Dramatizações, personagens |
| 0.3 – 0.5 | Expressivo com boa variação | Narrações dinâmicas, VSL |
| 0.5 – 0.7 | Equilibrado (padrão) | Uso geral, podcasts |
| 0.7 – 1.0 | Consistente, previsível, monótono | Locução corporativa, textos longos |

### Guia Prático: Similarity Boost

| Valor | Comportamento | Recomendado Para |
|-------|---------------|------------------|
| 0.5 – 0.6 | Menos fiel à voz, mais criativo | Experimentação |
| 0.7 – 0.8 | Boa fidelidade (recomendado) | Uso geral |
| 0.8 – 0.9 | Alta fidelidade à voz original | Vozes clonadas, consistência de marca |
| 0.9 – 1.0 | Máxima fidelidade, pode introduzir artefatos | Apenas para vozes de alta qualidade |

### Guia Prático: Style

| Valor | Comportamento | Recomendado Para |
|-------|---------------|------------------|
| 0.0 | Sem estilo adicional (mais natural) | Narração, notícias, corporativo |
| 0.1 – 0.3 | Leve estilo (sutil) | Podcasts, conteúdo casual |
| 0.3 – 0.5 | Estilo moderado | Anúncios, entretenimento |
| 0.5 – 1.0 | Estilo forte (consome mais caracteres) | Dramatizações, conteúdo expressivo |

### Preset de Configurações por Contexto

```json
// Narração neutra / corporativo
{
  "stability": 0.75,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true
}

// VSL / anúncio persuasivo
{
  "stability": 0.4,
  "similarity_boost": 0.8,
  "style": 0.2,
  "use_speaker_boost": true
}

// Podcast / conversa natural
{
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.1,
  "use_speaker_boost": true
}

// Chatbot / resposta rápida
{
  "stability": 0.6,
  "similarity_boost": 0.7,
  "style": 0.0,
  "use_speaker_boost": false
}

// Dramatização / personagem
{
  "stability": 0.25,
  "similarity_boost": 0.75,
  "style": 0.4,
  "use_speaker_boost": true
}
```

---

## 17. Exemplos Completos em Python

### 17.1 Geração Básica de TTS

```python
import requests

def gerar_audio(texto, voice_id, api_key, arquivo_saida="output.mp3"):
    """Gera áudio a partir de texto usando a API ElevenLabs."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }

    payload = {
        "text": texto,
        "model_id": "eleven_v3",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        },
        "output_format": "mp3_44100_128"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        with open(arquivo_saida, "wb") as f:
            f.write(response.content)

        # Informações de uso
        custo = response.headers.get("character-cost", "N/A")
        print(f"Áudio gerado: {arquivo_saida}")
        print(f"Custo: {custo} caracteres")
        return True
    else:
        print(f"Erro {response.status_code}: {response.text}")
        return False

# Uso
API_KEY = "SUA_API_KEY"
VOICE_ID = "GDzHdQOi6jjf8zaXhCYD"  # Raquel

gerar_audio(
    texto="Olá! Bem-vindo ao sistema de narração automática. Como posso ajudá-lo hoje?",
    voice_id=VOICE_ID,
    api_key=API_KEY,
    arquivo_saida="narração.mp3"
)
```

### 17.2 Geração com Streaming

```python
import requests

def gerar_audio_stream(texto, voice_id, api_key, arquivo_saida="output_stream.mp3"):
    """Gera áudio em streaming para menor latência."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }

    payload = {
        "text": texto,
        "model_id": "eleven_flash_v2_5",  # Modelo mais rápido para streaming
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    with requests.post(url, json=payload, headers=headers, stream=True) as response:
        if response.status_code == 200:
            with open(arquivo_saida, "wb") as f:
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        f.write(chunk)
            print(f"Stream concluído: {arquivo_saida}")
        else:
            print(f"Erro {response.status_code}: {response.text}")
```

### 17.3 Verificar Saldo de Caracteres

```python
import requests

def verificar_saldo(api_key):
    """Verifica o saldo de caracteres disponíveis."""
    response = requests.get(
        "https://api.elevenlabs.io/v1/user/subscription",
        headers={"xi-api-key": api_key}
    )

    if response.status_code == 200:
        sub = response.json()
        usado = sub.get("character_count", 0)
        limite = sub.get("character_limit", 0)
        tier = sub.get("tier", "unknown")
        restante = limite - usado

        print(f"Plano: {tier}")
        print(f"Caracteres usados: {usado:,}/{limite:,}")
        print(f"Caracteres restantes: {restante:,}")
        print(f"Uso: {(usado/limite*100):.1f}%")
        return restante
    else:
        print(f"Erro ao verificar saldo: {response.status_code}")
        return 0

# Uso
saldo = verificar_saldo("SUA_API_KEY")
```

### 17.4 Listar Vozes Brasileiras

```python
import requests

def listar_vozes_brasileiras(api_key):
    """Lista todas as vozes brasileiras disponíveis."""
    response = requests.get(
        "https://api.elevenlabs.io/v1/voices",
        headers={"xi-api-key": api_key}
    )

    if response.status_code == 200:
        vozes = response.json()["voices"]
        vozes_br = [
            v for v in vozes
            if v.get("labels", {}).get("accent") == "brazilian"
        ]

        print(f"Vozes brasileiras encontradas: {len(vozes_br)}")
        print("-" * 60)

        for voz in vozes_br:
            labels = voz.get("labels", {})
            print(f"ID: {voz['voice_id']}")
            print(f"Nome: {voz['name']}")
            print(f"Idade: {labels.get('age', 'N/A')}")
            print(f"Uso: {labels.get('use_case', 'N/A')}")
            print()

        return vozes_br
    else:
        print(f"Erro: {response.status_code}")
        return []
```

### 17.5 Gerar Múltiplos Áudios (Batch)

```python
import requests
import os
import time

def gerar_batch(textos_e_arquivos, voice_id, api_key, pausa=0.5):
    """
    Gera múltiplos áudios em sequência.
    textos_e_arquivos: lista de tuplas (texto, nome_arquivo)
    """
    resultados = []

    for i, (texto, arquivo) in enumerate(textos_e_arquivos, 1):
        print(f"Gerando {i}/{len(textos_e_arquivos)}: {arquivo}")

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": texto,
            "model_id": "eleven_v3",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        }

        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            with open(arquivo, "wb") as f:
                f.write(response.content)
            resultados.append({"arquivo": arquivo, "status": "ok"})
            print(f"  OK — {arquivo}")
        else:
            resultados.append({"arquivo": arquivo, "status": "erro", "codigo": response.status_code})
            print(f"  ERRO {response.status_code}")

        # Pausa para não sobrecarregar a API
        if i < len(textos_e_arquivos):
            time.sleep(pausa)

    sucessos = sum(1 for r in resultados if r["status"] == "ok")
    print(f"\nConcluído: {sucessos}/{len(textos_e_arquivos)} arquivos gerados")
    return resultados

# Uso
textos = [
    ("Bem-vindo à nossa plataforma.", "01_boas_vindas.mp3"),
    ("Escolha uma das opções abaixo.", "02_opcoes.mp3"),
    ("Obrigado por utilizar nosso serviço.", "03_obrigado.mp3"),
]

gerar_batch(textos, "GDzHdQOi6jjf8zaXhCYD", "SUA_API_KEY")
```

---

## 18. Exemplos Completos em Node.js

### 18.1 Geração Básica de TTS

```javascript
const https = require('https');
const fs = require('fs');

/**
 * Gera áudio a partir de texto usando a API ElevenLabs.
 * @param {string} text - Texto a converter
 * @param {string} voiceId - ID da voz
 * @param {string} apiKey - Chave da API
 * @param {string} outputFile - Caminho do arquivo de saída
 */
function gerarAudio(text, voiceId, apiKey, outputFile = 'output.mp3') {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            text,
            model_id: 'eleven_v3',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
            },
            output_format: 'mp3_44100_128'
        });

        const opts = {
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(opts, res => {
            if (res.statusCode !== 200) {
                let errorData = '';
                res.on('data', chunk => errorData += chunk);
                res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errorData}`)));
                return;
            }

            const file = fs.createWriteStream(outputFile);
            res.pipe(file);

            file.on('finish', () => {
                file.close();
                const custo = res.headers['character-cost'] || 'N/A';
                console.log(`Áudio gerado: ${outputFile} (custo: ${custo} chars)`);
                resolve(outputFile);
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Uso com variável de ambiente (seguro)
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'GDzHdQOi6jjf8zaXhCYD'; // Raquel

gerarAudio(
    'Olá! Seja bem-vindo à nossa plataforma de atendimento.',
    VOICE_ID,
    API_KEY,
    'boas_vindas.mp3'
).then(file => console.log('Pronto:', file))
 .catch(err => console.error('Erro:', err.message));
```

### 18.2 Geração com Streaming

```javascript
const https = require('https');
const fs = require('fs');

function gerarAudioStream(text, voiceId, apiKey, outputFile = 'stream.mp3') {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            text,
            model_id: 'eleven_flash_v2_5', // Modelo otimizado para streaming
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        });

        const opts = {
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}/stream`,
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const file = fs.createWriteStream(outputFile);

        const req = https.request(opts, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(outputFile);
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
```

### 18.3 Verificar Saldo de Caracteres

```javascript
const https = require('https');

function verificarSaldo(apiKey) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.elevenlabs.io',
            path: '/v1/user/subscription',
            method: 'GET',
            headers: { 'xi-api-key': apiKey }
        };

        https.request(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const sub = JSON.parse(data);
                const usado = sub.character_count || 0;
                const limite = sub.character_limit || 0;
                const restante = limite - usado;

                console.log(`Plano: ${sub.tier}`);
                console.log(`Caracteres: ${usado.toLocaleString('pt-BR')}/${limite.toLocaleString('pt-BR')}`);
                console.log(`Restante: ${restante.toLocaleString('pt-BR')}`);
                console.log(`Uso: ${((usado / limite) * 100).toFixed(1)}%`);

                resolve({ usado, limite, restante, tier: sub.tier });
            });
        }).on('error', reject).end();
    });
}
```

### 18.4 Listar Vozes com Filtro

```javascript
const https = require('https');

function listarVozesBrasileiras(apiKey) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.elevenlabs.io',
            path: '/v1/voices',
            method: 'GET',
            headers: { 'xi-api-key': apiKey }
        };

        https.request(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const { voices } = JSON.parse(data);
                const vozesBR = voices.filter(v =>
                    v.labels && v.labels.accent === 'brazilian'
                );

                console.log(`Vozes brasileiras: ${vozesBR.length}`);
                vozesBR.forEach(v => {
                    const l = v.labels || {};
                    console.log(`  ${v.voice_id} | ${v.name} | ${l.age || 'N/A'} | ${l.use_case || 'N/A'}`);
                });

                resolve(vozesBR);
            });
        }).on('error', reject).end();
    });
}
```

### 18.5 Script Completo com Vault (Padrão Seguro)

Salve em `~/.claude/temp/elevenlabs-tts.js` e execute via credential-cli:

```javascript
// ~/.claude/temp/elevenlabs-tts.js
const https = require('https');
const fs = require('fs');

const API_KEY = process.env.ELEVENLABS_API_KEY;

if (!API_KEY) {
    console.error('ELEVENLABS_API_KEY não encontrada no environment');
    process.exit(1);
}

const VOICE_ID = 'GDzHdQOi6jjf8zaXhCYD'; // Raquel
const TEXTO = 'Este é um teste de geração de voz em português brasileiro com a API ElevenLabs.';
const OUTPUT = '/c/Users/sabola/.claude/temp/teste_voz.mp3';

const body = JSON.stringify({
    text: TEXTO,
    model_id: 'eleven_v3',
    voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
    },
    output_format: 'mp3_44100_128'
});

const opts = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}`,
    method: 'POST',
    headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
    }
};

const file = fs.createWriteStream(OUTPUT);
const req = https.request(opts, res => {
    if (res.statusCode !== 200) {
        let err = '';
        res.on('data', c => err += c);
        res.on('end', () => console.error(`Erro ${res.statusCode}: ${err}`));
        return;
    }

    res.pipe(file);
    file.on('finish', () => {
        file.close();
        const custo = res.headers['character-cost'] || 'N/A';
        console.log(`Áudio gerado: ${OUTPUT}`);
        console.log(`Custo: ${custo} caracteres`);
    });
});

req.on('error', err => console.error('Erro de rede:', err.message));
req.write(body);
req.end();
```

```bash
# Executar com segurança via vault
node ~/.claude/task-scheduler/credential-cli.js run ~/.claude/temp/elevenlabs-tts.js
```

---

## 19. Referência Rápida — Vozes BR

### Tabela Completa de IDs

```
# VOZES FEMININAS
oJebhZNaPllxk6W0LSBA  →  Carla - Narradora Infantil      (jovem, infantil)
m151rjrbWXbBqyq56tly  →  Carla - Institucional            (jovem, corporativo)
x8FWrDHAK5xiFTJLpnHq  →  Carla - VSL Extra Income         (jovem, vendas)
cyD08lEy76q03ER1jZ7y  →  ScheilaSMTy                      (meia-idade, conversacional)
GDzHdQOi6jjf8zaXhCYD  →  Raquel - For Conversational      (jovem, amigável)
5EtawPduB139avoMLQgH  →  Thais N - Young Brazilian Female  (jovem, narrativo)
lWq4KDY8znfkV0DrK8Vb  →  Yasmin                           (jovem, narrativo)

# VOZES MASCULINAS
tS45q0QcrDHqHoaWdCDR  →  Lax                              (jovem, alegre, news)
F7823wtD50WK1gnmgBk5  →  Matheus Moretti Cruz              (jovem, calmo)
0YziWIrqiRTHCxeg1lyc  →  Will - Dynamic Voiceover          (jovem, barítono)
MjS9ecoVZlOFzvnemirW  →  João Gabriel                      (meia-idade, jornalismo)
vr6MVhO51WHYH7ev2Qn9  →  Onildo F R                        (meia-idade, narrativo)
7lu3ze7orhWaNeSPowWx  →  Lucas - Social Media Voice        (jovem, YouTube)
```

### Mapeamento por Objetivo

```
VSL / Anúncio persuasivo  →  Carla VSL (x8FWrDHAK5xiFTJLpnHq) ou Will (0YziWIrqiRTHCxeg1lyc)
Chatbot / atendimento     →  Raquel (GDzHdQOi6jjf8zaXhCYD) ou Scheila (cyD08lEy76q03ER1jZ7y)
Narração / audiobook      →  Thais (5EtawPduB139avoMLQgH) ou Onildo (vr6MVhO51WHYH7ev2Qn9)
YouTube / redes sociais   →  Lucas (7lu3ze7orhWaNeSPowWx) ou Will (0YziWIrqiRTHCxeg1lyc)
Conteúdo infantil         →  Carla Infantil (oJebhZNaPllxk6W0LSBA)
Institucional / trein.    →  Carla Instit. (m151rjrbWXbBqyq56tly) ou João Gabriel (MjS9ecoVZlOFzvnemirW)
Documentário / sério      →  Onildo (vr6MVhO51WHYH7ev2Qn9) ou João Gabriel (MjS9ecoVZlOFzvnemirW)
News / jornalismo         →  Lax (tS45q0QcrDHqHoaWdCDR) ou João Gabriel (MjS9ecoVZlOFzvnemirW)
```

---

## 20. Boas Práticas

### 20.1 Seleção de Modelo

- **`eleven_v3`** — Use quando a qualidade é prioridade. Melhor opção para PT-BR. Suporta 72 idiomas.
- **`eleven_flash_v2_5`** — Use para streaming em tempo real ou quando a velocidade é crítica.
- **`eleven_multilingual_v2`** — Alternativa confiável ao v3, mais testado, 28 idiomas.
- **Evite `eleven_monolingual_v1`** para português — é apenas inglês.

### 20.2 Configurações de Voice Settings

```
Narração longa e consistente:   stability 0.7-0.9, similarity 0.75, style 0.0
Anúncio / persuasão:           stability 0.3-0.5, similarity 0.8, style 0.1-0.3
Chatbot / resposta natural:    stability 0.5-0.6, similarity 0.7, style 0.0
Dramatização:                  stability 0.2-0.4, similarity 0.75, style 0.3-0.5
```

### 20.3 Formato de Áudio

- Use `mp3_44100_192` para conteúdo de alta qualidade (narração, podcasts, VSL)
- Use `mp3_44100_128` para uso geral e web
- Use `mp3_44100_64` para streaming/chatbot onde o tamanho importa
- Use `pcm_24000` se precisar processar o áudio programaticamente depois

### 20.4 Gestão de Caracteres

- Cada caractere do texto conta como 1 crédito
- Parágrafos longos consomem mais — considere dividir textos extensos
- `style > 0` pode multiplicar o custo em caracteres
- `use_speaker_boost: false` reduz levemente o consumo em batch processing
- Verifique o saldo antes de processar grandes volumes

### 20.5 Segurança

- **NUNCA** incluir a API key diretamente no código-fonte
- **SEMPRE** usar variáveis de ambiente ou o Credential Vault
- **NUNCA** logar a API key em stdout, arquivos de log ou consoles
- **NUNCA** commitar arquivos `.env` com credenciais

### 20.6 Performance

- Para textos longos (> 500 caracteres), considere dividir em parágrafos e usar batch
- Use streaming (`/stream`) para reduzir latência percebida pelo usuário
- Aguarde pelo menos 100ms entre requisições em batch para evitar rate limiting
- Cache os áudios gerados quando o texto for estático (economiza créditos)

### 20.7 Limites da API

| Limite | Valor |
|--------|-------|
| Máx. caracteres por requisição (free) | 500 |
| Máx. caracteres por requisição (pago) | 5.000 |
| Tamanho máximo de texto por request | 5.000 caracteres |
| Rate limit | Varia por plano |

---

## 21. Troubleshooting

### Erros Comuns e Soluções

#### HTTP 401 — Unauthorized

```
Causa: API key inválida ou ausente
Solução:
  1. Verificar se ELEVENLABS_API_KEY está no vault
  2. Confirmar que o header 'xi-api-key' está sendo enviado (não 'Authorization')
  3. Verificar se a key não expirou no painel ElevenLabs
```

#### HTTP 422 — Unprocessable Entity

```
Causa: Parâmetros inválidos no body
Solução:
  1. Verificar se 'text' não está vazio
  2. Verificar se 'model_id' é um ID válido
  3. Verificar se 'stability' e 'similarity_boost' estão entre 0.0 e 1.0
  4. Verificar se 'output_format' é um valor válido
```

#### HTTP 429 — Too Many Requests

```
Causa: Rate limit excedido
Solução:
  1. Aguardar o tempo indicado no header 'Retry-After'
  2. Adicionar pausa entre requisições em batch (time.sleep(1) ou setTimeout(1000))
  3. Considerar upgrade de plano para maior rate limit
```

#### HTTP 400 — Bad Request

```
Causa: JSON malformado ou parâmetros ausentes
Solução:
  1. Verificar se Content-Type é 'application/json'
  2. Validar o JSON com json.dumps() / JSON.stringify()
  3. Verificar se o campo 'text' está presente
```

#### Arquivo de áudio vazio ou corrompido

```
Causa: Erro na escrita do arquivo ou resposta parcial
Solução:
  1. Verificar se o status code foi 200 ANTES de salvar
  2. Em Node.js: aguardar o evento 'finish' antes de usar o arquivo
  3. Em Python: usar 'with' para garantir fechamento correto
  4. Verificar se há espaço em disco suficiente
```

#### Áudio com qualidade ruim ou artefatos

```
Causa: Configurações de voice_settings inadequadas
Solução:
  1. Reduzir 'similarity_boost' (tentar 0.6-0.7)
  2. Aumentar 'stability' (tentar 0.6-0.8)
  3. Definir 'style' como 0.0
  4. Ativar 'use_speaker_boost: true'
  5. Usar modelo 'eleven_v3' em vez de modelos mais antigos
```

#### Voz soa muito monótona / robótica

```
Causa: Stability muito alta
Solução:
  1. Reduzir 'stability' para 0.3-0.5
  2. Aumentar levemente 'style' (0.1-0.2)
  3. Experimentar voz diferente (algumas são naturalmente mais expressivas)
```

#### Erro de encoding em textos com acentuação (Windows)

```
Causa: curl quebrando caracteres UTF-8 no Windows
Solução:
  NUNCA usar curl com -d para enviar JSON com acentos no Windows.
  SEMPRE usar Node.js com Buffer.byteLength(body, 'utf8').
  Ver seção 18.5 — Script Completo com Vault.
```

#### Voice ID não encontrado

```
Causa: Voice ID inválido ou voz removida da plataforma
Solução:
  1. Verificar IDs na seção 19 desta documentação
  2. Usar GET /v1/voices para listar vozes disponíveis
  3. Filtrar por accent=brazilian para vozes BR
```

### Tabela de Códigos de Status

| Código | Significado | Ação |
|--------|-------------|------|
| 200 | Sucesso | Processar resposta |
| 400 | Parâmetros inválidos | Verificar body/payload |
| 401 | Não autenticado | Verificar API key |
| 403 | Sem permissão | Verificar plano/limites |
| 404 | Recurso não encontrado | Verificar voice_id ou endpoint |
| 422 | Entidade não processável | Verificar tipos e valores |
| 429 | Rate limit | Aguardar e tentar novamente |
| 500 | Erro interno do servidor | Aguardar 5s, tentar 1x |

---

## Apêndice: Endpoints Resumidos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/v1/text-to-speech/{voice_id}` | Gerar áudio TTS |
| `POST` | `/v1/text-to-speech/{voice_id}/stream` | Gerar áudio em streaming |
| `GET` | `/v1/voices` | Listar todas as vozes |
| `GET` | `/v1/voices/{voice_id}` | Detalhes de uma voz |
| `POST` | `/v1/voices/add` | Adicionar voz clonada |
| `DELETE` | `/v1/voices/{voice_id}` | Deletar voz clonada |
| `GET` | `/v1/models` | Listar modelos disponíveis |
| `GET` | `/v1/user` | Informações da conta |
| `GET` | `/v1/user/subscription` | Detalhes da assinatura |
| `GET` | `/v1/history` | Histórico de gerações |
| `GET` | `/v1/history/{id}/audio` | Download de áudio do histórico |
| `POST` | `/v1/speech-to-speech/{voice_id}` | Converter voz em outra voz |
| `POST` | `/v1/voice-generation/generate-voice` | Gerar voz personalizada |

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-13 - Vault: reveal() retorna objeto, não string
**Contexto:** Acesso à API key via credential vault
**Erro:** `vault.reveal(id)` retorna `{id, name, value}`, não a string diretamente
**Solução:** Usar `vault.reveal(elCred.id).value` para obter a key
**Regra:** Sempre acessar `.value` do retorno de `vault.reveal()`.

### 2026-03-13 - Voz Onildo F R: settings ideais para narração de anúncio
**Contexto:** Geração de 8 narrações para motion ad BetPredict
**Solução:** Settings que funcionaram bem: `stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true`. Output: `mp3_44100_192`. Voice ID: `vr6MVhO51WHYH7ev2Qn9`.
**Regra:** Para narrações de anúncio em PT-BR com Onildo, usar estes settings como base.

### 2026-03-13 - Durações ElevenLabs são ~30-40% maiores que edge-tts
**Contexto:** Migração de edge-tts para ElevenLabs Onildo
**Erro:** Timestamps calculados para edge-tts causaram overlaps (ex: "Setenta e dois por cento..." edge-tts=2588ms, Onildo=3520ms)
**Solução:** Sempre gerar TTS primeiro, medir com ffprobe, depois calcular timestamps
**Regra:** ElevenLabs fala mais naturalmente (e devagar). Sempre medir antes de definir timeline.
