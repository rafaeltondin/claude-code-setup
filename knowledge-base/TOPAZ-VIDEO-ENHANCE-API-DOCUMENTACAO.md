---
title: "Topaz Video Enhance API - Documentacao da Rota de Upscale 4K 60FPS"
category: "APIs"
tags:
  - topaz
  - video
  - enhance
  - 4k
  - upscale
  - api
  - flask
  - docker
  - cyberpanel
topic: "Video Enhancement API"
priority: high
version: "1.3.0"
last_updated: "2026-03-03"
---

# Topaz Video Enhance API - Rota de Upscale 4K 60FPS

## O que e

API REST autenticada que recebe qualquer video e processa automaticamente para **4K (3840x2160) a 60FPS** usando a Topaz Labs Cloud API com o modelo **Artemis High Quality (ahq-12)**, o melhor para upscaling. Usa codec **H265 (HEVC)** para maxima qualidade em 4K.

## Onde esta hospedado

| Item | Valor |
|------|-------|
| **Servidor** | `46.202.149.24` (CyberPanel) |
| **Porta** | `8086` |
| **URL Base** | `http://46.202.149.24:8086` |
| **Container** | `topaz-web` (Docker) |
| **Imagem** | `topaz-app:v1.1` |
| **Projeto Local** | `D:\TOPAZ\modern_topaz` |

## Credenciais (Credential Vault)

Todas as credenciais estao no Credential Vault com prefixo `TOPAZ_`:

| Variavel Vault | Uso |
|----------------|-----|
| `TOPAZ_API_KEY` | Chave da Topaz Labs Cloud API (processamento IA) |
| `TOPAZ_API_AUTH_KEY` | API Key para autenticacao das rotas /api/v1/* |
| `TOPAZ_LOGIN_USERNAME` | Usuario da interface web |
| `TOPAZ_LOGIN_PASSWORD` | Senha da interface web |
| `TOPAZ_SECRET_KEY` | Flask SECRET_KEY para sessoes |
| `TOPAZ_BASE_URL` | URL base da API Topaz |

**Acesso via CLI:**
```bash
# Listar todas credenciais Topaz
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" names-for TOPAZ

# Obter valor especifico
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" get TOPAZ_API_AUTH_KEY

# Usar em scripts (injeta como env vars)
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" run meu-script.js
```

**Referencia em templates:** `{{secret:TOPAZ_API_AUTH_KEY}}`

## Autenticacao

Todas as rotas `/api/v1/*` requerem API Key via header:

```
X-API-Key: {{secret:TOPAZ_API_AUTH_KEY}}
```

Ou via Authorization Bearer:
```
Authorization: Bearer {{secret:TOPAZ_API_AUTH_KEY}}
```

**Variavel de ambiente no container:** `API_AUTH_KEY`
**Variavel no vault:** `TOPAZ_API_AUTH_KEY`

Sem key ou key errada retorna `401 Unauthorized`.

---

## Endpoints

### 1. POST /api/v1/enhance

**Rota principal.** Recebe video e inicia processamento automatico para 4K 60FPS.

**Request:**
```bash
# Obter a key do vault antes de usar
API_KEY=$(node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" get TOPAZ_API_AUTH_KEY)

curl -X POST http://46.202.149.24:8086/api/v1/enhance \
  -H "X-API-Key: $API_KEY" \
  -F "file=@meu_video.mp4"
```

**Com parametros opcionais:**
```bash
curl -X POST http://46.202.149.24:8086/api/v1/enhance \
  -H "X-API-Key: $API_KEY" \
  -F "file=@meu_video.mp4" \
  -F "model=prob-4" \
  -F "width=1920" \
  -F "height=1080" \
  -F "fps=30" \
  -F "encoder=H264"
```

**Parametros opcionais (form fields):**

| Parametro | Default | Descricao |
|-----------|---------|-----------|
| `model` | `ahq-12` | Modelo IA (ver tabela abaixo) |
| `width` | `3840` | Largura de saida em pixels |
| `height` | `2160` | Altura de saida em pixels |
| `fps` | `60.0` | Frames por segundo |
| `encoder` | `H265` | Codec: H264 ou H265 (HEVC) |

**Response (202 Accepted):**
```json
{
  "job_id": "uuid-do-job",
  "message": "Processamento iniciado com sucesso",
  "settings": {
    "model": "ahq-12",
    "model_name": "Artemis High Quality (4K Upscaling)",
    "output_resolution": "3840x2160",
    "fps": 60.0,
    "encoder": "H265",
    "source_resolution": "1920x1080",
    "source_fps": 30.0,
    "filename": "meu_video.mp4"
  },
  "status_url": "/api/v1/status/uuid-do-job",
  "download_url": "/api/v1/download/uuid-do-job"
}
```

### 2. GET /api/v1/status/<job_id>

**Verifica status do processamento.** Fazer polling a cada 5-10 segundos.

```bash
curl -H "X-API-Key: $API_KEY" \
  http://46.202.149.24:8086/api/v1/status/UUID_DO_JOB
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "running",
  "progress": 45,
  "log": [
    "[10:30:45] [4K ENHANCE] Iniciando: video.mp4",
    "[10:30:46] 1/5 Criando requisicao na Topaz API...",
    "[10:30:47] Request criado: abc123",
    "[10:31:00] 3/5 Fazendo upload do video...",
    "[10:35:00] 5/5 Aguardando processamento..."
  ],
  "settings": { ... },
  "result": null
}
```

**Quando completo:**
```json
{
  "status": "completed",
  "progress": 100,
  "result": {
    "download_url": "https://cdn.topazlabs.com/..."
  }
}
```

**Quando falhou:**
```json
{
  "status": "failed",
  "result": {
    "error": "Mensagem de erro"
  }
}
```

### 3. GET /api/v1/download/<job_id>

**Redireciona para download** do video processado (HTTP 302).

```bash
# Download direto
curl -L -o video_4k.mp4 \
  -H "X-API-Key: $API_KEY" \
  http://46.202.149.24:8086/api/v1/download/UUID_DO_JOB
```

**Erros possiveis:**
- `404`: Job nao encontrado
- `425`: Video ainda em processamento (retorna status e progresso)
- `500`: URL de download nao disponivel

### 4. GET /api/v1/models

**Lista modelos de IA disponiveis** com recomendacoes por caso de uso.

```bash
curl -H "X-API-Key: $API_KEY" \
  http://46.202.149.24:8086/api/v1/models
```

---

## Modelos de IA Disponiveis

| Modelo | Nome | Melhor Para |
|--------|------|-------------|
| `ahq-12` | Artemis High Quality | **4K Upscaling** (DEFAULT - recomendado) |
| `prob-4` | Artemis General | Denoise + Sharpen geral |
| `apo-8` | Apollo | Enhancement geral + 8x slowmo |
| `rhea-1` | Rhea | Upscaling avancado 4x |
| `ghq-5` | Gaia HQ | GenAI/CG/Animacao |
| `iris-3` | Iris | Restauracao de videos antigos |
| `nyx-3` | Nyx | Dedicado para denoising |
| `alq-13` | Artemis Low Quality | Videos de baixa qualidade |
| `amq-13` | Artemis Medium Quality | Videos de media qualidade |

**Recomendacoes:**
- **Upscale para 4K**: `ahq-12` (default)
- **Melhorar qualidade geral**: `prob-4`
- **Remover ruido**: `nyx-3`
- **Restaurar video antigo**: `iris-3`
- **Animacao/CG**: `ghq-5`
- **Slow motion**: `apo-8`

---

## Configuracoes Tecnicas Otimizadas

O endpoint `/api/v1/enhance` usa por padrao as melhores tecnicas:

| Configuracao | Valor | Motivo |
|-------------|-------|--------|
| Modelo | `ahq-12` | Melhor qualidade para upscaling 4K |
| Resolucao | `3840x2160` | 4K UHD padrao |
| FPS | `60` | Maximo de fluidez |
| Encoder | `H265 (HEVC)` | Melhor compressao/qualidade em 4K |
| Compressao | `High` | Maximo de detalhes preservados |
| Audio | `AAC Copy` | Copia audio original sem recodificar |
| Container | `MP4` | Maximo compatibilidade |

---

## Exemplo Completo: Script Python

```python
import requests
import time
import subprocess

# Obter API Key do Credential Vault
# Em scripts executados via credential-cli.js run, use: os.environ['TOPAZ_API_AUTH_KEY']
API_URL = "http://46.202.149.24:8086"
API_KEY = os.environ.get('TOPAZ_API_AUTH_KEY')  # via credential-cli.js run
headers = {"X-API-Key": API_KEY}

# 1. Enviar video
with open("meu_video.mp4", "rb") as f:
    resp = requests.post(f"{API_URL}/api/v1/enhance",
                         headers=headers, files={"file": f})
data = resp.json()
job_id = data["job_id"]
print(f"Job criado: {job_id}")

# 2. Aguardar processamento
while True:
    status = requests.get(f"{API_URL}/api/v1/status/{job_id}",
                          headers=headers).json()
    print(f"Progresso: {status['progress']}% - Status: {status['status']}")
    if status["status"] == "completed":
        print("Download URL:", status["result"]["download_url"])
        break
    elif status["status"] == "failed":
        print("ERRO:", status["result"]["error"])
        break
    time.sleep(10)

# 3. Download
resp = requests.get(f"{API_URL}/api/v1/download/{job_id}",
                    headers=headers, allow_redirects=True)
with open("video_4k_60fps.mp4", "wb") as f:
    f.write(resp.content)
print("Download concluido!")
```

**Para executar com credenciais injetadas:**
```bash
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" run "D:\meu-script\enhance.js"
```

---

## Interface Web (separada da API)

A interface web continua acessivel em `http://46.202.149.24:8086/` com login:
- **Usuario**: `{{secret:TOPAZ_LOGIN_USERNAME}}`
- **Senha**: `{{secret:TOPAZ_LOGIN_PASSWORD}}`

Obter via vault:
```bash
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" get TOPAZ_LOGIN_USERNAME
node "C:\Users\sabola\.claude\task-scheduler\credential-cli.js" get TOPAZ_LOGIN_PASSWORD
```

A interface web usa autenticacao por sessao (cookie), nao API Key.

---

## Docker / Deploy

**Container:** `topaz-web`
**Imagem:** `topaz-app:v1.1`
**Porta:** `8086 → 80`
**Volume:** `topaz-uploads:/app/uploads`
**Restart Policy:** `unless-stopped`
**Memoria:** 4GB limite
**CPUs:** 2 limites

### Variaveis de Ambiente do Container

| Variavel Container | Vault Credential | Descricao |
|-------------------|------------------|-----------|
| `TOPAZ_API_KEY` | `TOPAZ_API_KEY` | Chave da Topaz Labs Cloud API |
| `API_AUTH_KEY` | `TOPAZ_API_AUTH_KEY` | Chave de autenticacao /api/v1/* |
| `SECRET_KEY` | `TOPAZ_SECRET_KEY` | Chave de sessao Flask |
| `LOGIN_USERNAME` | `TOPAZ_LOGIN_USERNAME` | Usuario da interface web |
| `LOGIN_PASSWORD` | `TOPAZ_LOGIN_PASSWORD` | Senha da interface web |
| `TOPAZ_BASE_URL` | `TOPAZ_BASE_URL` | URL base da API Topaz |

### Rebuild e Redeploy

```bash
# 1. Copiar arquivos atualizados para o servidor
scp -r D:/TOPAZ/modern_topaz/app.py D:/TOPAZ/modern_topaz/requirements.txt \
  D:/TOPAZ/modern_topaz/Dockerfile root@46.202.149.24:/tmp/topaz-build/
scp -r D:/TOPAZ/modern_topaz/static D:/TOPAZ/modern_topaz/templates \
  root@46.202.149.24:/tmp/topaz-build/

# 2. Build no servidor (incrementar versao!)
ssh root@46.202.149.24 "cd /tmp/topaz-build && docker build -t topaz-app:vX.Y ."

# 3. Recriar container (obter credenciais do vault)
ssh root@46.202.149.24 "docker stop topaz-web && docker rm topaz-web"
ssh root@46.202.149.24 "docker run -d --name topaz-web --restart unless-stopped \
  -p 8086:80 -v topaz-uploads:/app/uploads \
  -e TOPAZ_API_KEY={{secret:TOPAZ_API_KEY}} \
  -e TOPAZ_BASE_URL={{secret:TOPAZ_BASE_URL}} \
  -e API_AUTH_KEY={{secret:TOPAZ_API_AUTH_KEY}} \
  -e SECRET_KEY={{secret:TOPAZ_SECRET_KEY}} \
  -e LOGIN_USERNAME={{secret:TOPAZ_LOGIN_USERNAME}} \
  -e LOGIN_PASSWORD={{secret:TOPAZ_LOGIN_PASSWORD}} \
  -e FLASK_ENV=production -e PORT=80 -e DEBUG=False \
  -e WORKERS=2 -e THREADS=4 -e TIMEOUT=300 \
  --memory=4g --cpus=2 topaz-app:vX.Y"

# 4. Limpar
ssh root@46.202.149.24 "rm -rf /tmp/topaz-build"
```

---

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| 401 na API | Verificar header `X-API-Key` - obter do vault: `credential-cli.js get TOPAZ_API_AUTH_KEY` |
| 400 no enhance | Verificar campo `file` no multipart/form-data |
| Job travado | Verificar logs: `ssh root@46.202.149.24 "docker logs topaz-web --tail 50"` |
| Container unhealthy | `ssh root@46.202.149.24 "docker restart topaz-web"` |
| Timeout no upload | Aumentar `TIMEOUT` (default 300s) no docker run |
| **Status preso em "processing" 100%** | **BUG TOPAZ CLOUD** — ver secao abaixo |
| **Porta 8086 inacessivel** | Firewall bloqueia acesso externo — usar SSH (ver secao abaixo) |
| **Video abre tela branca / so miniatura** | **BUG PTS HEVC iPhone** — ver secao abaixo |
| **Saida landscape em video portrait** | Passar `-F "width=W" -F "height=H"` com dimensoes reais da fonte |

---

## ⚠️ BUG CRITICO: Status preso em "processing" 100%

**Descoberto em:** 2026-03-03

### O Problema

Quando um video tem mais de ~25 segundos, a Topaz Labs Cloud API divide o job em **2 ou mais chunks** para processamento paralelo. Apos todos os chunks completarem (`"status": "complete"` nos `processingJobs`), o status geral do request **NUNCA transiciona para "completed"** — fica preso em `"status": "processing"` com `"progress": 100` indefinidamente.

**Sintoma no log do container:**
```
Status: processing | Progresso: 100%
Status: processing | Progresso: 100%
Status: processing | Progresso: 100%
... (para sempre)
```

**Resposta da Topaz Cloud API quando travado:**
```json
{
  "status": "processing",
  "progress": 100,
  "processingJobs": [
    {"chunkIndex": 0, "status": "complete", "progress": 100},
    {"chunkIndex": 1, "status": "complete", "progress": 100}
  ]
}
```

### Comportamento Correto (videos curtos, chunk unico)

Videos com menos de ~25 segundos geram apenas 1 chunk e completam normalmente:
1. `"status": "processing"` → progresso sobe de 0% a 100%
2. `"status": "postprocessing"` com `"progress": 100%` (estado intermediario)
3. `"status": "completed"` com a URL de download

### Solucao Comprovada: Processar em Segmentos

**Regra:** Nunca enviar videos maiores que **19 segundos** diretamente para `/api/v1/enhance`.

**Fluxo correto para videos longos (>19s):**

```
1. ffmpeg split → segmentos de ≤19s
2. Enviar cada segmento para /api/v1/enhance (em paralelo)
3. Polling de cada job ate status=completed
4. Download de cada segmento processado
5. ffmpeg concat → video final
```

### Script Completo: Processar Video Longo (versao correta com fix de timestamps)

> **ATENCAO:** A versao antiga do script usava `-c copy` no split e causava **tela branca** no video final (bug PTS com HEVC iPhone). O script abaixo e a versao corrigida que resolve esse problema.

Salvar localmente em `~/.claude/temp/topaz-process.sh` e enviar para o servidor:

```bash
#!/bin/bash
# topaz-process.sh — Processa video longo em segmentos com timestamps corretos
# Uso: bash topaz-process.sh <AUTH_KEY> <INPUT_FILE> <OUTPUT_FILE> [WIDTH] [HEIGHT]
# Exemplo portrait 4K: bash topaz-process.sh "key" /tmp/in.mp4 /tmp/out.mp4 2160 3840
# Exemplo landscape 4K: bash topaz-process.sh "key" /tmp/in.mp4 /tmp/out.mp4 3840 2160
# Se WIDTH/HEIGHT omitidos, detecta automaticamente do video fonte

AUTH_KEY="$1"
INPUT="$2"
OUTPUT="$3"
SEG_DUR=19  # MAXIMO 19s por segmento (evita multi-chunk bug Topaz Cloud)
WORK_DIR="/tmp/topaz_work_$$"

mkdir -p "$WORK_DIR"

# --- Detectar dimensoes da fonte se nao passadas ---
if [ -z "$4" ] || [ -z "$5" ]; then
  WIDTH=$(ffprobe -v quiet -show_streams "$INPUT" 2>/dev/null | grep '^width=' | cut -d= -f2 | head -1)
  HEIGHT=$(ffprobe -v quiet -show_streams "$INPUT" 2>/dev/null | grep '^height=' | cut -d= -f2 | head -1)
else
  WIDTH="$4"
  HEIGHT="$5"
fi

echo "=== TOPAZ PROCESS (timestamps corretos) ==="
echo "Input:     $INPUT"
echo "Output:    $OUTPUT"
echo "Dimensoes: ${WIDTH}x${HEIGHT}"

# --- DURACAO ---
TOTAL=$(ffprobe -v quiet -show_format "$INPUT" 2>/dev/null | grep '^duration=' | cut -d= -f2 | cut -d. -f1)
echo "Duracao:   ${TOTAL}s"

# --- ETAPA 1: Split com RE-ENCODE (nao -c copy) para normalizar timestamps ---
# CRITICO: -c copy em videos HEVC de iPhone causa duracao errada (video!=audio)
# o que resulta em tela branca no video final apos concatenacao
echo ""
echo "[1/5] Dividindo em segmentos de ${SEG_DUR}s (re-encode H264 para timestamps corretos)..."
i=1
START=0
while [ $START -lt $TOTAL ]; do
  END=$((START + SEG_DUR))
  [ $END -gt $TOTAL ] && END=$TOTAL
  DUR=$((END - START))
  ffmpeg -ss $START -i "$INPUT" -t $DUR \
    -c:v libx264 -crf 20 -preset ultrafast \
    -c:a aac -b:a 192k \
    -avoid_negative_ts make_zero -reset_timestamps 1 \
    "$WORK_DIR/seg${i}.mp4" -y 2>/dev/null
  SZ=$(ls -lh "$WORK_DIR/seg${i}.mp4" 2>/dev/null | awk '{print $5}')
  DUR_REAL=$(ffprobe -v quiet -show_format "$WORK_DIR/seg${i}.mp4" 2>/dev/null | grep '^duration=' | cut -d= -f2 | cut -d. -f1)
  echo "  seg${i}.mp4 ${SZ} (${DUR_REAL}s)"
  START=$((START + SEG_DUR))
  i=$((i+1))
done
NUM_SEGS=$((i-1))
echo "  -> $NUM_SEGS segmentos criados"

# --- ETAPA 2: Submeter todos para Topaz API ---
# CRITICO: sempre passar width e height com dimensoes reais (portrait ou landscape)
echo ""
echo "[2/5] Enviando $NUM_SEGS segmentos para Topaz API..."
for j in $(seq 1 $NUM_SEGS); do
  RESP=$(curl -s -X POST "http://localhost:8086/api/v1/enhance" \
    -H "X-API-Key: $AUTH_KEY" \
    -F "file=@$WORK_DIR/seg${j}.mp4" \
    -F "width=$WIDTH" \
    -F "height=$HEIGHT" \
    -F "fps=30")
  JOB=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['job_id'])" 2>/dev/null)
  echo "$JOB" > "$WORK_DIR/job${j}.txt"
  echo "  seg${j} -> job: $JOB"
done

# --- ETAPA 3: Polling ate todos completarem ---
echo ""
echo "[3/5] Aguardando conclusao dos jobs..."
DONE=0
ITER=0
while [ $DONE -lt $NUM_SEGS ] && [ $ITER -lt 150 ]; do
  DONE=0
  for j in $(seq 1 $NUM_SEGS); do
    if [ -f "$WORK_DIR/url${j}.txt" ]; then
      DONE=$((DONE+1))
      continue
    fi
    JOB=$(cat "$WORK_DIR/job${j}.txt")
    RESP=$(curl -s "http://localhost:8086/api/v1/status/$JOB" -H "X-API-Key: $AUTH_KEY")
    STATUS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null)
    PROG=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d.get('progress',0)))" 2>/dev/null)
    printf "  [%s] seg%d [%s] %d%%\n" "$(date +%H:%M:%S)" $j "$STATUS" $PROG
    if [ "$STATUS" = "completed" ]; then
      echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result']['download_url'])" > "$WORK_DIR/url${j}.txt" 2>/dev/null
      echo "  -> seg${j} CONCLUIDO!"
      DONE=$((DONE+1))
    fi
  done
  [ $DONE -lt $NUM_SEGS ] && sleep 10
  ITER=$((ITER+1))
done
echo "  -> Todos os $NUM_SEGS jobs concluidos."

# --- ETAPA 4: Download + normalizar timestamps de cada segmento ---
echo ""
echo "[4/5] Baixando segmentos processados..."
> "$WORK_DIR/concat.txt"
for j in $(seq 1 $NUM_SEGS); do
  URL=$(cat "$WORK_DIR/url${j}.txt" 2>/dev/null)
  if [ -n "$URL" ]; then
    curl -s -L "$URL" -o "$WORK_DIR/raw${j}.mp4"
    # Normalizar timestamps do segmento Topaz antes de concatenar
    ffmpeg -i "$WORK_DIR/raw${j}.mp4" -c copy \
      -avoid_negative_ts make_zero -reset_timestamps 1 \
      "$WORK_DIR/proc${j}.mp4" -y 2>/dev/null
    SZ=$(ls -lh "$WORK_DIR/proc${j}.mp4" 2>/dev/null | awk '{print $5}')
    DUR=$(ffprobe -v quiet -show_format "$WORK_DIR/proc${j}.mp4" 2>/dev/null | grep '^duration=' | cut -d= -f2 | cut -d. -f1)
    echo "  proc${j}.mp4 $SZ (~${DUR}s)"
    echo "file '$WORK_DIR/proc${j}.mp4'" >> "$WORK_DIR/concat.txt"
  fi
done

# --- ETAPA 5: Concatenacao final ---
echo ""
echo "[5/5] Concatenando..."
ffmpeg -f concat -safe 0 -i "$WORK_DIR/concat.txt" -c copy "$OUTPUT" -y 2>&1 | tail -3
rm -rf "$WORK_DIR"

echo ""
echo "=== RESULTADO ==="
if [ -f "$OUTPUT" ]; then
  SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
  DUR=$(ffprobe -v quiet -show_format "$OUTPUT" 2>/dev/null | grep '^duration=' | cut -d= -f2)
  NF=$(ffprobe -v quiet -show_streams "$OUTPUT" 2>/dev/null | grep nb_frames | head -1 | cut -d= -f2)
  echo "[OK] $OUTPUT"
  echo "     Tamanho: $SIZE | Duracao: ${DUR}s | Frames: $NF"
else
  echo "[ERRO] Nao foi possivel criar o arquivo final"
fi
```

**Como usar via SSH (a porta 8086 nao e acessivel externamente):**

```bash
# 1. Enviar video para o servidor
scp "C:/Users/sabola/Downloads/meu_video.mp4" root@46.202.149.24:/tmp/

# 2. Enviar script
scp "~/.claude/temp/topaz-process.sh" root@46.202.149.24:/tmp/

# 3. Obter API key do vault
cd ~/.claude/task-scheduler
TOPAZ_KEY=$(node credential-cli.js get TOPAZ_API_AUTH_KEY)

# 4. Executar (dimensoes detectadas automaticamente; ou passar manualmente)
ssh root@46.202.149.24 "bash /tmp/topaz-process.sh '$TOPAZ_KEY' /tmp/meu_video.mp4 /tmp/meu_video_enhanced.mp4"
# Para portrait 4K:
ssh root@46.202.149.24 "bash /tmp/topaz-process.sh '$TOPAZ_KEY' /tmp/meu_video.mp4 /tmp/enhanced.mp4 2160 3840"

# 5. Baixar resultado
scp root@46.202.149.24:/tmp/meu_video_enhanced.mp4 "C:/Users/sabola/Downloads/"

# 6. Limpar servidor
ssh root@46.202.149.24 "rm -f /tmp/meu_video.mp4 /tmp/meu_video_enhanced.mp4 /tmp/topaz-process.sh"
```

**Para jobs longos (>10min), executar em background com nohup:**

```bash
# Iniciar em background
ssh root@46.202.149.24 "nohup bash /tmp/topaz-process.sh '$TOPAZ_KEY' /tmp/in.mp4 /tmp/out.mp4 > /tmp/topaz.log 2>&1 &"

# Monitorar progresso
ssh root@46.202.149.24 "tail -f /tmp/topaz.log"

# Verificar conclusao
ssh root@46.202.149.24 "tail -5 /tmp/topaz.log && ls -lh /tmp/out.mp4 2>/dev/null"
```

---

## ⚠️ BUG CRITICO: Tela Branca no Video Final (HEVC iPhone)

**Descoberto em:** 2026-03-03

### O Problema

Videos gravados no iPhone em HEVC (codec `hevc`) possuem um **edit list** no container que cria um offset de PTS (Presentation Timestamp) nao-zero. Quando esses videos sao divididos com `-c copy`, o stream de video e o stream de audio ficam com duracoes diferentes dentro de cada segmento:

```
seg1.mp4 (19s nominal)
  → stream video: duration=14s  ← ERRADO (PTS offset do edit list)
  → stream audio: duration=19s  ← correto
```

A concatenacao de segmentos com streams desalinhados gera um arquivo final que:
- Abre normalmente no player (miniatura visivel)
- Exibe **tela branca** durante toda a reproducao
- Pode ter duracao incorreta (ex: 54s em vez de 59s)

### Como Detectar

```bash
# Verificar se o video tem edit list / offset PTS
ffprobe -v quiet -show_format video.mp4 | grep duration
ffprobe -v quiet -show_streams video.mp4 | grep -E 'duration|codec_name'
# Se a duracao do stream video != duracao do stream audio => problema de PTS
```

### Solucao Comprovada

**Duas correcoes necessarias:**

**1. Antes de tudo: normalizar o arquivo fonte**

Se a fonte for HEVC (iPhone), normalizar timestamps antes de qualquer operacao:

```bash
# No servidor, via SSH
ffmpeg -i /tmp/video_original.mp4 \
  -c copy \
  -avoid_negative_ts make_zero \
  -reset_timestamps 1 \
  /tmp/video_norm.mp4 -y
```

Verificar que a normalizacao funcionou:
```bash
ffprobe -v quiet -show_streams /tmp/video_norm.mp4 | grep -E 'codec_name|nb_frames|duration'
# duracoes de video e audio devem ser iguais apos normalizacao
```

**2. Split com RE-ENCODE (nao `-c copy`)**

Ao dividir em segmentos, usar re-encode H264 com `avoid_negative_ts` e `reset_timestamps`:

```bash
# CORRETO — re-encode garante timestamps zero em cada segmento
ffmpeg -ss $START -i video_norm.mp4 -t $DUR \
  -c:v libx264 -crf 20 -preset ultrafast \
  -c:a aac -b:a 192k \
  -avoid_negative_ts make_zero -reset_timestamps 1 \
  seg1.mp4

# ERRADO — -c copy mantem o PTS offset do HEVC original
ffmpeg -i video.mp4 -ss $START -t $DUR -c copy seg1.mp4
```

**3. Normalizar cada segmento baixado do Topaz antes de concatenar**

```bash
# Apos baixar raw do Topaz (proc1_raw.mp4), normalizar antes de adicionar ao concat
ffmpeg -i proc1_raw.mp4 -c copy \
  -avoid_negative_ts make_zero -reset_timestamps 1 \
  proc1.mp4 -y
```

### Resumo do Fluxo Anti-Tela-Branca

```
fonte HEVC iPhone
    ↓
[1] normalizar fonte (ffmpeg -c copy -avoid_negative_ts make_zero -reset_timestamps 1)
    ↓
[2] split com RE-ENCODE H264 (nao -c copy) + avoid_negative_ts + reset_timestamps
    ↓
[3] enviar segmentos para Topaz API com width/height corretos
    ↓
[4] baixar cada segmento Topaz
    ↓
[5] normalizar cada segmento baixado (-c copy -avoid_negative_ts make_zero -reset_timestamps 1)
    ↓
[6] concatenar com ffmpeg concat + -c copy
    ↓
video final sem tela branca, duração e frames corretos
```

---

## ⚠️ Acesso Via SSH Obrigatorio

**A porta 8086 e bloqueada externamente por firewall.**

- `curl` direto de fora do servidor → `ETIMEDOUT`
- Todo acesso a `http://46.202.149.24:8086` deve ser feito **de dentro do servidor** via SSH
- Workflow correto: SCP arquivo → SSH execute → SCP download

---

## Orientacoes de Resolucao (width/height)

**REGRA CRITICA:** Sempre passar `width` e `height` com as dimensoes REAIS do video fonte.

O default da API e `3840x2160` (landscape 4K). Se o video for portrait (ex: iPhone vertical) e os parametros forem omitidos, a saida sai em landscape — **orientacao errada sem erro ou aviso**.

| Tipo de video | width | height |
|--------------|-------|--------|
| Landscape FHD (1080p) | 1920 | 1080 |
| Landscape 4K | 3840 | 2160 |
| Portrait FHD (celular vertical) | 1080 | 1920 |
| Portrait 4K (celular vertical 4K) | 2160 | 3840 |

Para detectar automaticamente as dimensoes do video fonte:
```bash
# No servidor, via SSH
W=$(ffprobe -v quiet -show_streams /tmp/video.mp4 2>/dev/null | grep '^width=' | cut -d= -f2 | head -1)
H=$(ffprobe -v quiet -show_streams /tmp/video.mp4 2>/dev/null | grep '^height=' | cut -d= -f2 | head -1)
echo "Dimensoes: ${W}x${H}"
# Usar -F "width=$W" -F "height=$H" no curl
```

O script `topaz-process.sh` da secao anterior ja detecta as dimensoes automaticamente se `WIDTH`/`HEIGHT` nao forem passados como parametros 4 e 5.

---

## fps=60 NAO faz interpolacao de frames

**Importante:** O parametro `fps=60` na API **nao gera frames interpolados**.

- Com modelo `ahq-12` (Artemis HQ) ou qualquer Artemis: o `fps` apenas define o metadata do container. O frame rate real de saida permanece igual ao da fonte.
- Para **interpolacao real de frames** (ex: 30fps → 60fps com novos frames gerados por IA): usar modelo **`apo-8` (Apollo)**

| Objetivo | Modelo | fps param |
|---------|--------|-----------|
| Melhorar qualidade, upscale | `ahq-12` | usar fps da fonte (ex: 30) |
| Gerar frames interpolados (slow-mo ou fluido) | `apo-8` | fps desejado (ex: 60) |
| Denoising apenas | `nyx-3` | usar fps da fonte |

---

## Lições Aprendidas (Auto-gerado por /aprender)

> Seção atualizada automaticamente. Consultar ANTES de executar tarefas relacionadas.

### 2026-03-17 - ahq-12 ignora parâmetro fps (não interpola frames)
**Contexto:** Upscale de vídeos do Instagram (720x1280 30fps) para 4K com fps=60
**Erro:** Configurar fps=60 com modelo ahq-12 — a API aceitou mas o vídeo saiu 30fps
**Solução:** ahq-12 só faz upscale de resolução. Para interpolação de frames (30→60fps), usar apo-8 (Apollo)
**Regra:** NUNCA esperar interpolação de frames com ahq-12/prob-4/nyx-3. Só apo-8 interpola FPS.

### 2026-03-17 - Ferramenta tools-cli topaz_enhance criada
**Contexto:** Necessidade de reutilizar o fluxo de enhance sem criar scripts manuais
**Solução:** `topaz_enhance` no tools-cli — auto-detecta dimensões, inicia Flask se necessário, faz upload/poll/download
**Uso:** `topaz_enhance input="video.mp4"` (defaults: ahq-12, 4K auto, H265) | `topaz_enhance action=models` | `topaz_enhance action=status job_id=X`

### 2026-03-18 - topaz_enhance falha na detecção do Flask no Windows (execSync + curl)
**Contexto:** Ferramenta topaz_enhance tenta verificar se Flask está rodando via `execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/login')`
**Erro:** No Windows, o `execSync` com curl e aspas `%{http_code}` falha silenciosamente (exit code 1), fazendo a ferramenta achar que o Flask não está rodando — mesmo com ele ativo na porta 5000.
**Solução:** Workaround: iniciar o Flask manualmente antes (`cd D:/TOPAZ/modern_topaz && python app.py &`) e submeter diretamente via Node.js http. Fix definitivo: trocar o health check de `execSync('curl ...')` para `http.get()` nativo do Node.js.
**Regra:** No Windows, NUNCA usar `execSync('curl -w "%{http_code}" ...')` para health checks. Usar `http.get()` do Node.js.

### 2026-03-18 - Download do Topaz redireciona para HTTPS (precisa do módulo https)
**Contexto:** Após processamento, `/api/v1/download/{job_id}` redireciona (302) para URL HTTPS da Topaz Cloud
**Erro:** Código usava `http.get(res.headers.location)` que falha com `ERR_INVALID_PROTOCOL` quando o redirect é HTTPS
**Solução:** Detectar protocolo da URL de redirect: `const proto = loc.startsWith('https') ? require('https') : require('http'); proto.get(loc, ...)`
**Regra:** Em downloads do Topaz API, SEMPRE importar `https` e detectar protocolo do redirect antes de seguir.

### 2026-03-18 - Container Topaz pode desaparecer do servidor
**Contexto:** Tentativa de usar Topaz API remota (servidor 46.202.149.24:8086)
**Erro:** Container `topaz-web` e imagem `topaz-app:v1.1` não existiam no servidor. Causa provável: limpeza de Docker ou rebuild sem recriar o container.
**Solução:** Usar Topaz local (Flask em `D:/TOPAZ/modern_topaz`) como método primário. Servidor remoto é backup.
**Regra:** Topaz local (Flask porta 5000) é o método PRIMÁRIO. Servidor remoto é fallback. Se ambos falharem, verificar: (1) Flask local com `python app.py`, (2) container no servidor com `docker ps -a | grep topaz`.
