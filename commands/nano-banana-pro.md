# Skill: Nano Banana Pro — Geração e Edição de Imagens

## Descrição

Gera e edita imagens usando a API Google Nano Banana Pro (Gemini 3 Pro Image), com suporte a fluxos texto-para-imagem e imagem-para-imagem em múltiplas resoluções.

**QUANDO USAR:** Sempre que o usuário pedir para criar, gerar, editar ou modificar imagens, ilustrações, fotos ou artes visuais.

## Uso

```
/nano-banana-pro [descrição ou instrução de edição]
```

Ou simplesmente o usuário pode pedir em linguagem natural:
- "gere uma imagem de..."
- "crie uma arte de..."
- "edite esta imagem para..."
- "transforme a imagem em..."

## Comandos Principais

### Gerar imagem (texto para imagem):
```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "descrição da imagem" \
  --filename "nome-do-arquivo.png" \
  [--resolution 1K|2K|4K] \
  [--api-key CHAVE]
```

### Editar imagem existente (imagem para imagem):
```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "instrução de edição" \
  --filename "nome-saida.png" \
  --input-image "caminho/para/imagem-original.png" \
  [--resolution 1K|2K|4K]
```

## Resoluções Disponíveis

| Resolução | Uso recomendado | Pixels aprox. |
|-----------|----------------|---------------|
| `1K` | Rascunhos e iterações rápidas (padrão) | ~1024px |
| `2K` | Versão intermediária/revisão | ~2048px |
| `4K` | Entrega final em alta qualidade | ~4096px |

Quando o usuário pedir "alta resolução", "4K", "qualidade máxima" → usar `4K`.
Quando for rascunho, teste ou iteração → usar `1K`.

## Fluxo de Trabalho Recomendado

1. **Rascunho (1K):** Gerar com `--resolution 1K` para testar o conceito
2. **Iterar:** Ajustar o prompt mantendo `--input-image` para edições
3. **Final (4K):** Somente quando o prompt estiver refinado, gerar com `--resolution 4K`

## Configuração da API Key

O script busca a chave na seguinte ordem:
1. Argumento `--api-key`
2. Variável de ambiente `GEMINI_API_KEY`

Para configurar permanentemente, adicionar ao ambiente ou usar o Credential Vault:
```bash
node "~/.claude/task-scheduler/credential-cli.js" get GEMINI_API_KEY
```

## Padrão de Nomenclatura de Arquivos

Formato: `aaaa-mm-dd-hh-mm-ss-nome-descritivo.png`

Exemplo: `2025-11-23-14-23-05-jardim-japones.png`

## Capacidades Especiais

- **Texto dentro de imagens:** Melhor do mercado — preserva e insere texto legível
- **Fotorrealismo:** Alta fidelidade em cenas reais
- **Arte e ilustração:** Estilos variados (realista, cartoon, aquarela, etc.)
- **Edição por instrução:** Remover/adicionar elementos, mudar estilo, ajustar cores, desfocar fundo
- **Auto-detecção de resolução:** Para edições, detecta automaticamente a resolução da imagem original

## Exemplos de Prompts

### Geração de imagem:
```
"Foto de um café aconchegante em São Paulo ao entardecer, estilo cinematográfico, luz quente"
```

### Edição:
```
"Remova o carro do fundo e substitua por árvores"
"Mude o céu para um pôr do sol dramático"
"Adicione o texto 'Promoção de Verão' em fonte moderna na parte superior"
```

## Dependências

- `uv` instalado (gerenciador Python)
- `google-genai >= 1.0.0` (instalado automaticamente pelo uv)
- `pillow >= 10.0.0` (instalado automaticamente pelo uv)
- Chave de API Google Gemini válida

## Instalação e Configuração Inicial

### 1. Instalar o `uv` (necessário uma vez)

No Windows (PowerShell):
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

No terminal Git Bash / WSL:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verificar instalação:
```bash
uv --version
```

### 2. Obter chave de API Google Gemini

1. Acesse https://aistudio.google.com/apikey
2. Crie ou copie sua chave de API
3. Salve no Credential Vault:
```bash
node "~/.claude/task-scheduler/credential-cli.js" set GEMINI_API_KEY "sua-chave-aqui"
```

Ou defina diretamente no ambiente:
```bash
export GEMINI_API_KEY="sua-chave-aqui"  # Linux/Mac/Git Bash
$env:GEMINI_API_KEY="sua-chave-aqui"    # PowerShell
```

### 3. Teste rápido após instalação

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "um gato laranja fofo" \
  --filename "teste.png" \
  --resolution 1K
```

## Notas Importantes

- Imagens são salvas como PNG no diretório de trabalho atual
- Para edições, o arquivo de entrada deve existir e ser legível
- O modelo é `gemini-2.0-flash-preview-image-generation` (API Google)
- Taxa de geração: rascunho 1K é muito mais rápido e barato que 4K
