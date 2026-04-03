---
title: "GLM-4.7-Flash API — Documentação Completa"
category: "APIs"
tags: "llm, glm, ia, api, ollama, proxy"
topic: "GLM-4.7-Flash API local"
priority: "high"
version: "1.0.0"
last_updated: "2026-03-03"
---

# GLM-4.7-Flash API — Documentação Completa

API REST compatível com OpenAI, servindo o modelo **GLM-4.7-Flash Q5_K_M** via Ollama no servidor CyberPanel.

---

## Informações de Acesso Rápido

| Item | Valor |
|------|-------|
| **URL Base** | `https://srv410981.hstgr.cloud/glm` |
| **Rota Chat** | `POST /v1/chat/completions` |
| **Health** | `GET /health` |
| **Autenticação** | Bearer Token no header `Authorization` |
| **API Key (vault)** | `GLM_API_KEY` |
| **URL (vault)** | `GLM_API_URL` |
| **Model ID (vault)** | `GLM_MODEL_NAME` |
| **Porta interna** | `8765` (Node.js/Express) |
| **Proxy** | OLS (OpenLiteSpeed) porta 443 → 8765 |

---

## Modelo

| Propriedade | Valor |
|------------|-------|
| **Nome** | GLM-4.7-Flash |
| **Versão GGUF** | `hf.co/bartowski/zai-org_GLM-4.7-Flash-GGUF:Q5_K_M` |
| **Parâmetros totais** | 30B (MoE) |
| **Parâmetros ativos** | 3.6B por inferência |
| **Contexto** | 200.000 tokens |
| **Tamanho em disco** | 21 GB |
| **RAM necessária** | ~23 GB |
| **Quantização** | Q5_K_M (~97% de qualidade do FP16) |
| **SWE-bench Verified** | 59.2% (coding agents) |
| **Serving** | Ollama v0.17.5 em `localhost:11434` |

---

## Infraestrutura

| Item | Detalhe |
|------|---------|
| **Servidor** | Hostinger VPS (46.202.149.24) |
| **OS** | Ubuntu 22.04, kernel 5.15 |
| **CPU** | AMD EPYC 9354P, 8 vCPUs |
| **RAM** | 32 GB |
| **GPU** | Nenhuma (inferência CPU) |
| **API service** | `glm-api.service` (systemd, auto-restart) |
| **Ollama service** | `ollama.service` (systemd) |
| **Arquivos** | `/opt/glm-api/` |

---

## Autenticação

Todas as rotas (exceto `/health`) exigem header:

```
Authorization: Bearer <GLM_API_KEY>
```

### Respostas de erro de autenticação

| Situação | HTTP | Código |
|----------|------|--------|
| Header ausente | 401 | `missing_authorization` |
| Formato inválido | 401 | `invalid_authorization_format` |
| Token errado | 401 | `invalid_api_key` |

---

## Rotas

### GET /health

Verifica se a API e o Ollama estão ativos. **Não requer autenticação.**

**Resposta:**
```json
{
  "status": "ok",
  "model": "hf.co/bartowski/zai-org_GLM-4.7-Flash-GGUF:Q5_K_M",
  "ollama": "http://localhost:11434",
  "timestamp": "2026-03-03T09:12:38.110Z"
}
```

---

### POST /v1/chat/completions

Gera texto usando o GLM-4.7-Flash. Formato compatível com OpenAI Chat Completions API.

**Headers obrigatórios:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "messages": [
    {"role": "system", "content": "Você é um assistente especialista em programação."},
    {"role": "user", "content": "Escreva uma função Python que verifica se um número é primo."}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| `messages` | array | ✅ | — | Array de mensagens (role + content) |
| `temperature` | number | ❌ | 0.7 | Criatividade 0.0–2.0 |
| `max_tokens` | number | ❌ | ilimitado | Máximo de tokens na resposta |
| `stream` | boolean | ❌ | false | Streaming SSE |
| `model` | string | ❌ | GLM_MODEL_NAME | Sobrescreve o modelo padrão |

**Roles válidos:** `system` | `user` | `assistant`

**Resposta (stream: false):**
```json
{
  "id": "chatcmpl-1772528752004",
  "object": "chat.completion",
  "created": 1772528752,
  "model": "hf.co/bartowski/zai-org_GLM-4.7-Flash-GGUF:Q5_K_M",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "```python\ndef is_prime(n):\n    ..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 23,
    "completion_tokens": 85,
    "total_tokens": 108
  }
}
```

---

## Exemplos de Uso

### Python (requests)

```python
import requests

# Obter credenciais do vault se disponível
API_URL = "https://srv410981.hstgr.cloud/glm"
API_KEY = "glm-sk-9f4a2b8c1e6d3f7a0b5c9d2e8f1a4b7c"

def chat(messages, temperature=0.7, max_tokens=1024):
    resp = requests.post(
        f"{API_URL}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        },
        timeout=180,
        verify=False  # Usar verify=True com cert válido
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

# Uso simples
resposta = chat([{"role": "user", "content": "Olá! Como você pode me ajudar?"}])
print(resposta)
```

### Python — Com system prompt para agente de código

```python
resposta = chat(
    messages=[
        {"role": "system", "content": "Você é um especialista em Python. Responda sempre com código limpo e comentado."},
        {"role": "user", "content": "Como fazer uma requisição HTTP com retry automático?"}
    ],
    temperature=0.3,
    max_tokens=2048
)
```

### Python — Streaming SSE

```python
import requests, json

def chat_stream(user_message):
    with requests.post(
        f"{API_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json={"messages": [{"role": "user", "content": user_message}], "stream": True},
        stream=True, timeout=180, verify=False
    ) as resp:
        for line in resp.iter_lines():
            if not line:
                continue
            text = line.decode("utf-8")
            if text == "data: [DONE]":
                break
            if text.startswith("data: "):
                chunk = json.loads(text[6:])
                delta = chunk["choices"][0]["delta"].get("content", "")
                print(delta, end="", flush=True)
        print()

chat_stream("Explique o algoritmo quicksort passo a passo.")
```

### Node.js (axios)

```javascript
const axios = require('axios');
const https = require('https');

const api = axios.create({
  baseURL: 'https://srv410981.hstgr.cloud/glm',
  headers: { 'Authorization': 'Bearer glm-sk-9f4a2b8c1e6d3f7a0b5c9d2e8f1a4b7c' },
  timeout: 180000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function chat(messages, options = {}) {
  const { data } = await api.post('/v1/chat/completions', {
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024
  });
  return data.choices[0].message.content;
}

// Uso
(async () => {
  const resposta = await chat([
    { role: 'user', content: 'Escreva um README para um projeto Node.js com Express.' }
  ]);
  console.log(resposta);
})();
```

### curl (via SSH no servidor — sem encoding issues)

```bash
# Testar pelo próprio servidor (evita problema de encoding do curl no Windows)
ssh root@46.202.149.24 'curl -s -X POST https://srv410981.hstgr.cloud/glm/v1/chat/completions \
  -H "Authorization: Bearer glm-sk-9f4a2b8c1e6d3f7a0b5c9d2e8f1a4b7c" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"max_tokens\":100}" -k'
```

> ⚠️ **Atenção Windows:** curl no Git Bash quebra aspas em JSON. Prefira Python (requests) ou Node.js.

---

## Casos de Uso Recomendados

| Caso | Temperature | Max Tokens | Observação |
|------|-------------|------------|------------|
| Geração de código | 0.1–0.3 | 2048 | Respostas mais determinísticas |
| Chat / Q&A | 0.5–0.7 | 512 | Equilíbrio criatividade/precisão |
| Análise de código | 0.2 | 4096 | Contexto longo |
| Brainstorming | 0.8–1.0 | 1024 | Mais criativo |
| Agentes (tool use) | 0.0 | 4096 | Máximo determinismo |

---

## Integração com Agentes Claude Code

Para usar em scripts de agente dentro do ecossistema:

```javascript
// ~/.claude/temp/glm-agent-example.js
// Executar com: node credential-cli.js run glm-agent-example.js

const http = require('http');
const https = require('https');

const API_KEY = process.env.GLM_API_KEY;
const API_URL = process.env.GLM_API_URL || 'https://srv410981.hstgr.cloud/glm';

function askGLM(userMessage, systemPrompt = '') {
  return new Promise((resolve, reject) => {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    const body = JSON.stringify({ messages, temperature: 0.3, max_tokens: 1024 });

    const opts = {
      hostname: 'srv410981.hstgr.cloud',
      path: '/glm/v1/chat/completions',
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body, 'utf8')
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices[0].message.content);
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body, 'utf8');
    req.end();
  });
}

(async () => {
  const resposta = await askGLM(
    'Analise este código e sugira melhorias: function soma(a,b){return a+b}',
    'Você é um especialista em JavaScript. Seja conciso e direto.'
  );
  console.log(resposta);
})();
```

---

## Gerenciamento do Serviço

```bash
# Status dos serviços
ssh root@46.202.149.24 'systemctl status glm-api ollama'

# Reiniciar API
ssh root@46.202.149.24 'systemctl restart glm-api'

# Ver logs em tempo real
ssh root@46.202.149.24 'journalctl -u glm-api -f'

# Ver logs do Ollama
ssh root@46.202.149.24 'journalctl -u ollama -f'

# Verificar modelo carregado
ssh root@46.202.149.24 'ollama ps'

# Listar modelos disponíveis
ssh root@46.202.149.24 'ollama list'
```

---

## Arquivos no Servidor

| Arquivo | Descrição |
|---------|-----------|
| `/opt/glm-api/server.js` | API proxy Express (148 linhas) |
| `/opt/glm-api/.env` | Configurações + API_KEY (chmod 600) |
| `/opt/glm-api/package.json` | Dependências npm |
| `/etc/systemd/system/glm-api.service` | Service systemd |
| `/var/log/ollama-pull.log` | Log do download do modelo |

---

## Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `503 ollama_offline` | Serviço Ollama parado | `systemctl restart ollama` |
| `504 ollama_timeout` | Resposta demorou >180s | Reduzir `max_tokens` ou simplificar prompt |
| `401 invalid_api_key` | Token errado | Usar `GLM_API_KEY` do vault |
| `400 missing_messages` | Body sem campo messages | Incluir array `messages` |
| Primeira resposta lenta (~2min) | Modelo carregando na RAM | Normal no cold start; seguintes são mais rápidas |
| curl Windows quebra JSON | Encoding do Git Bash | Usar Python/requests ou Node.js |

---

## Limitações Conhecidas

- **Sem GPU:** inferência em CPU puro (~4-8 tokens/s em respostas longas)
- **Cold start:** primeira chamada após inatividade leva ~2 minutos (carregamento de 21GB na RAM)
- **Sem paralelismo:** um request por vez (modelo CPU single-threaded)
- **RAM:** modelo usa ~23 GB dos 32 GB disponíveis
- **curl Windows:** encoding quebra JSON com aspas — usar Python ou Node.js

---

## Credential Vault

```bash
# Verificar credenciais salvas
node ~/.claude/task-scheduler/credential-cli.js names-for GLM_

# Usar em script
node ~/.claude/task-scheduler/credential-cli.js run meu-script.js
# No script: process.env.GLM_API_KEY, process.env.GLM_API_URL, process.env.GLM_MODEL_NAME
```
