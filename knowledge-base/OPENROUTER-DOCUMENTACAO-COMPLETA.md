---
title: "OpenRouter - Documentação Completa Unificada"
category: "AI"
tags:
  - openrouter
  - ai
  - llm
  - api
  - gpt
  - claude
  - gemini
  - prompt caching
  - provider routing
  - fallbacks
  - multimodal
  - pdf
  - imagens
topic: "OpenRouter API"
priority: high
version: "1.0.0"
last_updated: "2025-12-23"
---

# OpenRouter - Documentação Completa Unificada

Este documento consolida toda a documentacao OpenRouter disponivel na base de conhecimento.

---

# PARTE 1: VISAO GERAL E QUICKSTART

## O que e OpenRouter?

OpenRouter e uma API unificada que da acesso a **centenas de modelos de IA** atraves de um unico endpoint. Compativel com a API OpenAI.

## Endpoint Principal
```
https://openrouter.ai/api/v1/chat/completions
```

## Autenticacao
```python
# Via header
Authorization: Bearer sk-or-v1-sua-chave-aqui

# Via variavel de ambiente
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui
```

## Headers Opcionais (para rankings)
```python
HTTP-Referer: https://seu-site.com
X-Title: Nome da Sua Aplicacao
```

## Instalacao

### SDK OpenRouter (Recomendado)
```bash
npm install @openrouter/sdk
# ou
pip install openai  # SDK OpenAI compativel
```

### Configuracao Python
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="sk-or-v1-sua-chave"
)
```

## Primeira Requisicao
```python
response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[
        {"role": "user", "content": "Ola!"}
    ]
)
print(response.choices[0].message.content)
```

## Modelos Populares
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet (melhor custo-beneficio)
- `anthropic/claude-3-haiku` - Claude 3 Haiku (mais rapido e barato)
- `openai/gpt-4o` - GPT-4o (OpenAI)
- `google/gemini-2.0-flash-001` - Gemini 2.0 Flash (Google)
- `meta-llama/llama-3.1-70b-instruct` - Llama 3.1 70B

## Variantes de Modelos
- `:free` - Versao gratuita (rate limited)
- `:extended` - Context estendido
- `:thinking` - Modo thinking/reasoning
- `:online` - Com acesso a internet
- `:nitro` - Otimizado para velocidade

---

# PARTE 2: PARAMETROS E CONFIGURACOES

## Parametros Obrigatorios
```python
{
    "model": "anthropic/claude-3.5-sonnet",  # ID do modelo
    "messages": [                              # Array de mensagens
        {"role": "system", "content": "..."},
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."}
    ]
}
```

## Parametros Opcionais

### Controle de Geracao
| Parametro | Tipo | Padrao | Descricao |
|-----------|------|--------|-----------|
| `temperature` | float | 1.0 | Criatividade (0-2) |
| `max_tokens` | int | None | Limite de tokens na resposta |
| `top_p` | float | 1.0 | Nucleus sampling |
| `top_k` | int | None | Top-K sampling |
| `frequency_penalty` | float | 0 | Penalidade por repeticao (-2 a 2) |
| `presence_penalty` | float | 0 | Penalidade por presenca (-2 a 2) |
| `stop` | list | None | Sequencias de parada |

### Streaming SSE
```python
response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=[...],
    stream=True  # Habilita streaming SSE
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Tool Calling / Function Calling
```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Obtem clima de uma cidade",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"}
                },
                "required": ["city"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=[...],
    tools=tools,
    tool_choice="auto"  # "auto", "none", ou especifico
)
```

### Structured Outputs (JSON Schema)
```python
response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"}
                },
                "required": ["name", "age"]
            }
        }
    }
)
```

---

# PARTE 3: PROMPT CACHING

## O que e Prompt Caching?

Permite reutilizar partes de prompts entre requisicoes, reduzindo custos em ate 90% para tokens cacheados.

## Como Funciona
1. Marque partes do prompt com `cache_control`
2. OpenRouter armazena em cache
3. Requisicoes subsequentes usam o cache

## Implementacao
```python
messages = [
    {
        "role": "system",
        "content": [
            {
                "type": "text",
                "text": "Voce e um assistente especializado...",
                "cache_control": {"type": "ephemeral"}
            }
        ]
    },
    {
        "role": "user",
        "content": "Pergunta do usuario"
    }
]

response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=messages
)
```

## Cache Automatico no Agente

O OpenRouterClient do projeto aplica cache automaticamente:
```python
# Em openrouter_client.py
def _apply_prompt_caching(self, messages):
    # Aplica cache em:
    # - System prompts > 1000 caracteres
    # - Mensagens de contexto > 2000 caracteres
    # - Nao aplica na ultima mensagem do usuario
```

## Requisitos
- Minimo de 1024 tokens para cachear (Anthropic)
- Cache dura ~5 minutos (ephemeral)
- Suportado por: Claude 3+, GPT-4+, Gemini

## Economia
- Tokens cacheados: ate 90% de desconto
- Verificar na resposta: `usage.cached_tokens`

---

# PARTE 4: PROVIDER ROUTING E FALLBACKS

## O que e Provider Routing?

OpenRouter roteia requisicoes para diferentes providers (Anthropic, OpenAI, Google, etc) automaticamente. Voce pode configurar preferencias.

## Configuracao de Provider Preferences
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="sk-or-v1-..."
)

response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=[...],
    extra_body={
        "provider": {
            "order": ["Anthropic", "OpenAI"],  # Ordem de preferencia
            "allow_fallbacks": True,            # Permite fallback automatico
            "require_parameters": False,        # Requer que provider suporte todos params
            "data_collection": "deny",          # "allow" ou "deny" coleta de dados
            "ignore": ["Together"],             # Providers a ignorar
            "sort": "price"                     # "price", "throughput", "latency"
        }
    }
)
```

## Opcoes de Sort
| Valor | Descricao |
|-------|-----------|
| `price` | Prioriza menor custo |
| `throughput` | Prioriza maior throughput |
| `latency` | Prioriza menor latencia |

## Fallback Models

Configure modelos alternativos caso o principal falhe:
```python
# Via extra_body (OpenRouter especifico)
response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=[...],
    extra_body={
        "models": [
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-haiku",
            "google/gemini-2.0-flash-001"
        ]
    }
)
```

## Quantizacoes

Especifique quantizacoes aceitas:
```python
extra_body={
    "provider": {
        "quantizations": ["fp8", "fp16", "bf16"]
    }
}
```

## Max Price

Limite o preco maximo por token:
```python
extra_body={
    "provider": {
        "max_price": {
            "prompt": 0.001,      # USD por 1K tokens prompt
            "completion": 0.002   # USD por 1K tokens completion
        }
    }
}
```

---

# PARTE 5: SUPORTE MULTIMODAL

## Enviar Imagens
```python
import base64

# Codificar imagem
with open("imagem.png", "rb") as f:
    base64_image = base64.b64encode(f.read()).decode("utf-8")

messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "O que ha nesta imagem?"},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            }
        ]
    }
]

# Ou via URL
messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Descreva a imagem"},
            {
                "type": "image_url",
                "image_url": {"url": "https://exemplo.com/imagem.jpg"}
            }
        ]
    }
]
```

## Enviar PDFs
```python
with open("documento.pdf", "rb") as f:
    base64_pdf = base64.b64encode(f.read()).decode("utf-8")

messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Resuma este documento"},
            {
                "type": "file",
                "file": {
                    "filename": "documento.pdf",
                    "file_data": f"data:application/pdf;base64,{base64_pdf}"
                }
            }
        ]
    }
]

# Configurar engine de PDF
response = client.chat.completions.create(
    model="anthropic/claude-3.5-sonnet",
    messages=messages,
    extra_body={
        "plugins": [{
            "id": "file-parser",
            "pdf": {
                "engine": "pdf-text"  # "pdf-text", "mistral-ocr", "native"
            }
        }]
    }
)
```

## Engines de PDF
| Engine | Uso | Custo |
|--------|-----|-------|
| `pdf-text` | PDFs com texto selecionavel | Gratuito |
| `mistral-ocr` | PDFs escaneados/imagens | Por pagina |
| `native` | Capacidade nativa do modelo | Por token |

## Modelos com Suporte Visual
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-opus`
- `openai/gpt-4o`
- `google/gemini-2.0-flash-001`

---

# REFERENCIAS E LINKS UTEIS

## Documentacao Oficial
- Site Principal: https://openrouter.ai
- Documentacao API: https://openrouter.ai/docs
- Lista de Modelos: https://openrouter.ai/models
- Precos: https://openrouter.ai/models (ver coluna de preco)

## SDKs e Bibliotecas
- SDK Node.js: https://www.npmjs.com/package/@openrouter/sdk
- SDK Python: Usar OpenAI SDK com base_url customizada

## Recursos Adicionais
- Status do Servico: https://status.openrouter.ai
- Discord Comunidade: https://discord.gg/openrouter
- GitHub: https://github.com/openrouter-ai

## Compatibilidade
OpenRouter e compativel com:
- OpenAI SDK (Python, Node.js, etc)
- LangChain
- LlamaIndex
- Qualquer cliente compativel com API OpenAI

## Limites e Quotas
- Rate limits variam por modelo e provider
- Verifique headers de resposta para limites atuais
- Use exponential backoff para erros 429

## Melhores Praticas
1. Sempre configure `HTTP-Referer` e `X-Title` para melhor rastreamento
2. Use prompt caching para conversas longas
3. Configure fallback models para alta disponibilidade
4. Monitore custos via dashboard do OpenRouter
5. Use streaming para melhor UX em respostas longas
