/**
 * Tools: MEDIA — generate_image, image_optimize, color_palette, base64_image, video_tools, topaz_enhance, ocr_extract, audio_normalize, tts_generate, image_safe_zones, screenshot_compare, favicon_generator, color_contrast, ad_creative_analyzer, transcribe_audio
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

// Image Generator (Chrome CDP)
let imageGenerator = null;
try { imageGenerator = require('../image-generator'); } catch (_) {}

const definitions = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: `Gera uma imagem estática no formato feed (1080x1080 PNG) usando Chrome CDP para renderizar HTML/CSS.
NÃO requer API externa — usa o Chrome já aberto com debug.
Salva o PNG em ~/.claude/temp/images/ e retorna o caminho do arquivo.

USO OBRIGATÓRIO para criar imagens de: feed, stories, carrossel, criativos de anúncio, memes, posts de redes sociais.

TEMAS disponíveis:
- ocean: azul oceano (padrão, ótimo para pesca, natureza aquática)
- sunset: laranja/roxo (energia, motivação, vendas)
- dark: roxo escuro (tech, gaming, premium)
- nature: verde escuro (natureza, ecologia, outdoor)
- minimal: branco/clean (minimalista, elegante, profissional)`,
      parameters: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: 'Texto principal grande da imagem. Use negrito e impacto. Pode usar <em>palavra</em> para destacar em cor de acento.' },
          subtext: { type: 'string', description: 'Texto secundário / legenda / descrição. Máximo 150 chars para boa leitura.' },
          emoji: { type: 'string', description: 'Um ou dois emojis grandes como elemento visual. Ex: "🎣", "🐟😂", "🏆"' },
          hashtags: { type: 'string', description: 'Hashtags no rodapé. Ex: "#pescaesportiva #fishinglife #pesca"' },
          theme: { type: 'string', enum: ['ocean', 'sunset', 'dark', 'nature', 'minimal'], description: 'Tema visual da imagem' },
          brand: { type: 'string', description: 'Nome da conta/marca no canto inferior direito. Ex: "@minhapesca"' },
          filename: { type: 'string', description: 'Nome do arquivo PNG (sem extensão). Ex: "pesca-meme-gigante"' }
        },
        required: ['headline']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'image_optimize',
      description: 'Otimiza/redimensiona imagens para web usando sharp. Suporta JPEG, PNG, WebP, AVIF. Comprime e/ou redimensiona.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem de entrada' },
          output: { type: 'string', description: 'Caminho de saída. Padrão: mesmo nome com sufixo -optimized' },
          width: { type: 'number', description: 'Largura máxima em px. Mantém proporção.' },
          height: { type: 'number', description: 'Altura máxima em px. Mantém proporção.' },
          quality: { type: 'number', description: 'Qualidade (1-100). Padrão: 80' },
          format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'], description: 'Formato de saída. Padrão: mesmo do input' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'color_palette',
      description: 'Extrai paleta de cores dominantes de uma imagem. Retorna HEX, RGB, HSL, luminância, contraste WCAG e CSS variables.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem' },
          colors: { type: 'number', description: 'Número de cores a extrair. Padrão: 6' },
          output: { type: 'string', description: 'Caminho para salvar paleta HTML visual. Opcional.' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'base64_image',
      description: 'Converte imagem para/de base64 data URI. Útil para embutir imagens em HTML/CSS.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['encode', 'decode'], description: 'encode: imagem→base64 | decode: base64→imagem' },
          input: { type: 'string', description: 'Para encode: caminho da imagem. Para decode: string base64 ou data URI' },
          output: { type: 'string', description: 'Para decode: caminho do arquivo de saída. Para encode: se informado, salva o data URI em arquivo texto' },
          format: { type: 'string', enum: ['png', 'jpg', 'gif', 'webp', 'svg', 'ico'], description: 'Formato para decode (se não detectável do data URI). Padrão: png' }
        },
        required: ['action', 'input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'video_tools',
      description: 'Ferramentas de vídeo via ffmpeg: info, comprimir, converter, cortar, extrair frames, watermark, extrair áudio, thumbnail.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['info', 'compress', 'convert', 'cut', 'extract_frames', 'watermark', 'audio_extract', 'thumbnail'], description: 'Ação a executar' },
          input: { type: 'string', description: 'Caminho do vídeo de entrada' },
          output: { type: 'string', description: 'Caminho de saída' },
          quality: { type: 'string', description: 'Qualidade de compressão: low, medium, high. Padrão: medium' },
          format: { type: 'string', description: 'Formato de saída: mp4, webm, avi, mov, mp3, aac' },
          start: { type: 'string', description: 'Tempo de início para corte. Ex: "00:00:10"' },
          duration: { type: 'string', description: 'Duração do corte. Ex: "00:00:30"' },
          end: { type: 'string', description: 'Tempo final para corte. Ex: "00:01:00"' },
          watermark: { type: 'string', description: 'Caminho da imagem de watermark' },
          position: { type: 'string', description: 'Posição do watermark: topleft, topright, bottomleft, bottomright, center' },
          interval: { type: 'number', description: 'Intervalo em segundos para extract_frames. Padrão: 1' },
          time: { type: 'string', description: 'Timestamp para thumbnail. Padrão: "00:00:01"' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'topaz_enhance',
      description: 'Upscale de vídeo para 4K usando Topaz Video AI (cloud API). Envia vídeo, processa na nuvem e baixa resultado.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do vídeo de entrada (ex: ~/Downloads/video.mp4)' },
          output: { type: 'string', description: 'Caminho do vídeo de saída. Se omitido, adiciona "-4K-enhanced" ao nome' },
          model: { type: 'string', enum: ['ahq-12', 'prob-4', 'apo-8', 'rhea-1', 'ghq-5', 'iris-3', 'nyx-3', 'alq-13', 'amq-13'], description: 'Modelo IA. ahq-12=4K Upscaling (padrão), prob-4=Denoise+Sharpen, apo-8=Slowmo, rhea-1=Upscale 4x, ghq-5=Animação, iris-3=Restauração, nyx-3=Denoise' },
          width: { type: 'number', description: 'Largura saída. Padrão: auto-detecta para 4K mantendo aspect ratio' },
          height: { type: 'number', description: 'Altura saída. Padrão: auto-detecta para 4K mantendo aspect ratio' },
          fps: { type: 'number', description: 'FPS saída. Padrão: mantém original. NOTA: interpolação de frames só funciona com modelo apo-8' },
          encoder: { type: 'string', enum: ['H264', 'H265'], description: 'Codec. H265 = melhor qualidade (padrão), H264 = maior compatibilidade' },
          action: { type: 'string', enum: ['enhance', 'status', 'models'], description: 'Ação. enhance=processar vídeo (padrão), status=verificar job, models=listar modelos' },
          job_id: { type: 'string', description: 'ID do job para verificar status (usado com action=status)' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ocr_extract',
      description: 'Extrai texto de imagens (PNG, JPG, BMP, TIFF) e PDFs escaneados via Tesseract OCR. Suporta português e inglês.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem ou PDF para OCR' },
          lang: { type: 'string', description: 'Idiomas do Tesseract. Padrão: por+eng' },
          output: { type: 'string', description: 'Caminho para salvar o texto extraído. Se omitido, retorna o texto.' },
          pages: { type: 'string', description: 'Range de páginas para PDFs. Ex: "1-5"' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'audio_normalize',
      description: 'Normaliza áudio para EBU R128 via ffmpeg loudnorm em 2 passes. Garante loudness consistente para vídeos, podcasts e anúncios.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do arquivo de áudio/vídeo de entrada' },
          output: { type: 'string', description: 'Caminho de saída. Padrão: mesmo nome com sufixo -normalized' },
          target_lufs: { type: 'number', description: 'Target loudness em LUFS. Padrão: -14 (streaming). Use -23 para broadcast.' },
          target_tp: { type: 'number', description: 'True peak máximo em dBTP. Padrão: -1' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tts_generate',
      description: 'Gera narração de texto via ElevenLabs API. Suporta vozes em português.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a ser narrado' },
          voice: { type: 'string', description: 'Nome da voz. Opções: Onildo (padrão), Rachel, Antoni' },
          output: { type: 'string', description: 'Caminho para salvar o arquivo MP3 gerado' },
          model: { type: 'string', description: 'Modelo ElevenLabs. Padrão: eleven_multilingual_v2' },
          stability: { type: 'number', description: 'Estabilidade da voz (0-1). Padrão: 0.75' },
          similarity_boost: { type: 'number', description: 'Similaridade com a voz original (0-1). Padrão: 0.75' }
        },
        required: ['text', 'output']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'image_safe_zones',
      description: 'Analisa uma imagem e encontra zonas seguras para posicionar texto (regiões de background uniforme, sem produto ou conteúdo importante).',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem a analisar' },
          grid_size: { type: 'number', description: 'Divisão da imagem em grid NxN. Padrão: 8' },
          threshold: { type: 'number', description: 'Score mínimo para considerar zona segura (0-1). Padrão: 0.6' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'screenshot_compare',
      description: 'Compara dois screenshots e gera uma imagem diff visual destacando em vermelho os pixels diferentes. Retorna percentual de diferença.',
      parameters: {
        type: 'object',
        properties: {
          before: { type: 'string', description: 'Caminho da imagem "antes"' },
          after: { type: 'string', description: 'Caminho da imagem "depois"' },
          output: { type: 'string', description: 'Caminho da imagem diff gerada. Padrão: mesmo diretório do "before" com sufixo -diff' },
          threshold: { type: 'number', description: 'Diferença mínima por canal (0-255) para marcar pixel como diferente. Padrão: 25' }
        },
        required: ['before', 'after']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'favicon_generator',
      description: 'Gera todos os tamanhos de favicon (16, 32, 180, 192, 512px) a partir de uma imagem fonte. Retorna também o snippet HTML para colar no <head>.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem fonte (PNG ou SVG, preferencialmente quadrada)' },
          output_dir: { type: 'string', description: 'Diretório onde os favicons serão salvos. Padrão: mesmo diretório do input' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'color_contrast',
      description: 'Verifica ratio de contraste WCAG entre duas cores hex. Retorna ratio, conformidade AA e AAA para texto normal e grande.',
      parameters: {
        type: 'object',
        properties: {
          foreground: { type: 'string', description: 'Cor do texto em hex. Ex: "#FFFFFF"' },
          background: { type: 'string', description: 'Cor de fundo em hex. Ex: "#1A1A2E"' }
        },
        required: ['foreground', 'background']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ad_creative_analyzer',
      description: 'Analisa imagem de criativo de anúncio (Meta Ads, Google Display) e retorna score com issues e recomendações sobre dimensões, tamanho de arquivo, resolução e cores.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho da imagem do criativo' },
          type: { type: 'string', enum: ['feed', 'stories', 'carousel'], description: 'Tipo de posicionamento. Padrão: feed' }
        },
        required: ['input']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transcribe_audio',
      description: `Transcreve áudio para texto usando faster-whisper (Whisper, CPU, int8).
Suporta: mp3, wav, ogg, oga, m4a, flac, wma, aac, opus, webm, mp4.
Modelos: tiny (rápido, baixa qualidade), base, small (recomendado), medium (melhor qualidade), large-v3.
Pode gerar legendas SRT/VTT. Ideal para transcrever áudios de WhatsApp, reuniões, podcasts.
RTF médio ~0.35 (transcreve 1 min de áudio em ~21s no CPU).`,
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do arquivo de áudio para transcrever' },
          language: { type: 'string', description: 'Idioma do áudio. Padrão: "pt". Use "auto" para detecção automática. Códigos ISO: pt, en, es, fr, de, it, ja, zh, etc.' },
          model: { type: 'string', enum: ['tiny', 'base', 'small', 'medium', 'large-v3'], description: 'Tamanho do modelo Whisper. Padrão: small. Maior = melhor qualidade, mais lento.' },
          format: { type: 'string', enum: ['text', 'srt', 'vtt', 'json'], description: 'Formato de saída. text=texto puro, srt/vtt=legendas com timestamps, json=completo. Padrão: text' },
          output: { type: 'string', description: 'Caminho para salvar o resultado em arquivo. Opcional — se omitido, retorna no stdout.' },
          beam_size: { type: 'number', description: 'Beam size para busca. Maior = mais preciso, mais lento. Padrão: 5' },
          vad: { type: 'string', enum: ['true', 'false'], description: 'Usar Voice Activity Detection para filtrar silêncio. Padrão: true' }
        },
        required: ['input']
      }
    }
  },
];

const handlers = {
  async generate_image(args, ctx) {
    if (!imageGenerator) {
      return 'image-generator não está disponível. Verifique se chrome-remote-interface está instalado.';
    }
    try {
      const result = await imageGenerator.generateFeedImage(args);
      return `Imagem gerada com sucesso!\nArquivo: ${result.path}\nURL: ${result.url}\nFilename: ${result.filename}\n\nA imagem está salva em disco e pode ser aberta diretamente.`;
    } catch (e) {
      return `Erro ao gerar imagem: ${e.message}`;
    }
  },

  async image_optimize(args) {
    try {
      const { input, output, width, height, quality = 80, format } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      // Verificar se sharp está disponível
      let sharp;
      try {
        sharp = require('sharp');
      } catch (_) {
        // Fallback: tentar instalar sharp
        try {
          const { execSync: execS } = require('child_process');
          execS('npm install sharp --save 2>&1', { cwd: path.resolve(__dirname, '..'), timeout: 120000 });
          sharp = require('sharp');
        } catch (e2) {
          return `Erro: sharp não instalado. Execute: cd ${path.resolve(__dirname, '..')} && npm install sharp\n${e2.message}`;
        }
      }

      const inputPath = path.resolve(input.replace(/^~/, os.homedir()));
      if (!fs.existsSync(inputPath)) return `Arquivo não encontrado: ${inputPath}`;

      const ext = format || path.extname(inputPath).slice(1).toLowerCase() || 'jpeg';
      const outPath = output
        ? path.resolve(output.replace(/^~/, os.homedir()))
        : inputPath.replace(/(\.[^.]+)$/, `-optimized.${ext}`);

      const originalSize = fs.statSync(inputPath).size;

      let pipeline = sharp(inputPath);

      if (width || height) {
        pipeline = pipeline.resize(width || null, height || null, { fit: 'inside', withoutEnlargement: true });
      }

      switch (ext) {
        case 'jpeg': case 'jpg': pipeline = pipeline.jpeg({ quality, mozjpeg: true }); break;
        case 'png': pipeline = pipeline.png({ quality, compressionLevel: 9 }); break;
        case 'webp': pipeline = pipeline.webp({ quality }); break;
        case 'avif': pipeline = pipeline.avif({ quality }); break;
      }

      await pipeline.toFile(outPath);

      const newSize = fs.statSync(outPath).size;
      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
      const meta = await sharp(outPath).metadata();

      return [
        `Imagem otimizada com sucesso!`,
        `─`.repeat(40),
        `Input: ${inputPath} (${(originalSize / 1024).toFixed(1)} KB)`,
        `Output: ${outPath} (${(newSize / 1024).toFixed(1)} KB)`,
        `Redução: ${reduction}%`,
        `Dimensões: ${meta.width}x${meta.height}`,
        `Formato: ${meta.format}`,
        `Qualidade: ${quality}`
      ].join('\n');
    } catch (e) {
      return `Erro image_optimize: ${e.message}`;
    }
  },

  async color_palette(args) {
    // Delegado para python-tools/color_palette.py via uv run
    try {
      const { execFileSync } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'python-tools', 'color_palette.py');
      if (!fs.existsSync(scriptPath)) return `Erro: Script ${scriptPath} não encontrado`;

      const expandedArgs = { ...args };
      const homeDir = os.homedir().replace(/\\/g, '/');
      for (const key of ['input', 'output']) {
        if (expandedArgs[key] && typeof expandedArgs[key] === 'string') {
          expandedArgs[key] = expandedArgs[key].replace(/^~[\\/]/, homeDir + '/');
        }
      }

      const argsJson = JSON.stringify(expandedArgs);
      const result = execFileSync('uv', ['run', scriptPath, argsJson], {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
        cwd: path.resolve(__dirname, '..')
      });

      try {
        const parsed = JSON.parse(result.trim());
        if (parsed.error) return `Erro color_palette: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(color_palette executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro color_palette: ${e.message}${stderr}`;
    }
  },

  async base64_image(args) {
    try {
      const { action, input, output, format = 'png' } = args;
      if (!action || !input) return 'Parâmetros obrigatórios: action, input';

      if (action === 'encode') {
        const filePath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        if (!fs.existsSync(filePath)) return `Arquivo não encontrado: ${filePath}`;
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).slice(1).toLowerCase();
        const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp' };
        const mime = mimeMap[ext] || 'application/octet-stream';
        const base64 = buffer.toString('base64');
        const dataUri = `data:${mime};base64,${base64}`;

        if (output) {
          const outPath = output.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
          fs.writeFileSync(outPath, dataUri, 'utf8');
          return `Imagem convertida para base64 e salva em ${outPath}\nTamanho original: ${buffer.length.toLocaleString()} bytes\nTamanho base64: ${dataUri.length.toLocaleString()} chars (+${((dataUri.length / buffer.length - 1) * 100).toFixed(0)}%)`;
        }

        if (dataUri.length > 6000) {
          return `Data URI (${dataUri.length.toLocaleString()} chars, truncado):\n${dataUri.substring(0, 200)}...\n\nUse output="caminho.txt" para salvar o data URI completo.\nTamanho original: ${buffer.length.toLocaleString()} bytes`;
        }
        return `Data URI (${dataUri.length.toLocaleString()} chars):\n${dataUri}\n\nTamanho original: ${buffer.length.toLocaleString()} bytes`;
      }

      if (action === 'decode') {
        if (!output) return 'Para decode, informe output (caminho do arquivo de saída)';
        let base64Data = input;
        // Remover data URI prefix
        const dataUriMatch = input.match(/^data:[^;]+;base64,(.+)$/);
        if (dataUriMatch) base64Data = dataUriMatch[1];
        // Se for caminho de arquivo, ler
        if (input.length < 500 && fs.existsSync(input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/'))) {
          const content = fs.readFileSync(input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/'), 'utf8');
          const match = content.match(/^data:[^;]+;base64,(.+)$/);
          base64Data = match ? match[1] : content.replace(/\s/g, '');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const outPath = output.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
        fs.writeFileSync(outPath, buffer);
        return `Imagem decodificada e salva em ${outPath}\nTamanho: ${buffer.length.toLocaleString()} bytes`;
      }

      return `Ação "${action}" não reconhecida. Use: encode, decode`;
    } catch (e) {
      return `Erro base64_image: ${e.message}`;
    }
  },

  async video_tools(args) {
    // Delegado para python-tools/video_tools.py via uv run
    try {
      const { execFileSync } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'python-tools', 'video_tools.py');
      if (!fs.existsSync(scriptPath)) return `Erro: Script ${scriptPath} não encontrado`;

      const expandedArgs = { ...args };
      const homeDir = os.homedir().replace(/\\/g, '/');
      for (const key of ['input', 'output', 'watermark']) {
        if (expandedArgs[key] && typeof expandedArgs[key] === 'string') {
          expandedArgs[key] = expandedArgs[key].replace(/^~[\\/]/, homeDir + '/');
        }
      }

      const argsJson = JSON.stringify(expandedArgs);
      const result = execFileSync('uv', ['run', scriptPath, argsJson], {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
        cwd: path.resolve(__dirname, '..')
      });

      try {
        const parsed = JSON.parse(result.trim());
        if (parsed.error) return `Erro video_tools: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(video_tools executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro video_tools: ${e.message}${stderr}`;
    }
  },

  async topaz_enhance(args) {
    try {
      const action = args.action || 'enhance';
      const input = args.input || '';

      // --- ACTION: models ---
      if (action === 'models') {
        return JSON.stringify({
          models: {
            'ahq-12': 'Artemis High Quality (4K Upscaling) — RECOMENDADO para upscale',
            'prob-4': 'Artemis General (Denoise + Sharpen)',
            'apo-8': 'Apollo (Slowmo + Frame Interpolation) — ÚNICO que interpola FPS',
            'rhea-1': 'Rhea (Upscaling avançado 4x)',
            'ghq-5': 'Gaia HQ (GenAI/CG/Animação)',
            'iris-3': 'Iris (Restauração vídeos antigos)',
            'nyx-3': 'Nyx (Dedicado para denoise)',
            'alq-13': 'Artemis Low Quality',
            'amq-13': 'Artemis Medium Quality'
          },
          tips: {
            upscale_maximo: 'ahq-12 com encoder H265',
            denoise: 'nyx-3 ou prob-4',
            video_antigo: 'iris-3',
            animacao: 'ghq-5',
            slowmo_60fps: 'apo-8 (único que interpola frames)'
          }
        }, null, 2);
      }

      // --- ACTION: status ---
      if (action === 'status') {
        const jobId = args.job_id || input;
        if (!jobId) return 'Parâmetro "job_id" é obrigatório para action=status';

        const envContent = fs.readFileSync(path.resolve(os.homedir(), '.claude/task-scheduler/data/topaz-jobs.json'), 'utf8').trim();
        const allJobs = JSON.parse(envContent || '{}');
        const job = allJobs[jobId];
        if (!job) return `Job "${jobId}" não encontrado. Jobs conhecidos: ${Object.keys(allJobs).join(', ') || 'nenhum'}`;
        return JSON.stringify(job, null, 2);
      }

      // --- ACTION: enhance ---
      if (!input) return 'Parâmetro "input" é obrigatório (caminho do vídeo)';

      const resolvedInput = input.replace(/^~/, os.homedir()).replace(/\\/g, '/');
      if (!fs.existsSync(resolvedInput)) return `Arquivo não encontrado: ${resolvedInput}`;

      // Load Topaz credentials
      const envPath = path.resolve('D:/TOPAZ/modern_topaz/.env');
      if (!fs.existsSync(envPath)) return 'Erro: D:/TOPAZ/modern_topaz/.env não encontrado. Configure o projeto Topaz primeiro.';
      const envContent = fs.readFileSync(envPath, 'utf8');
      const topazApiKey = (envContent.match(/^TOPAZ_API_KEY=(.+)$/m) || [])[1]?.trim();
      const apiAuthKey = (envContent.match(/^API_AUTH_KEY=(.+)$/m) || [])[1]?.trim();
      if (!topazApiKey) return 'Erro: TOPAZ_API_KEY não encontrada no .env';
      if (!apiAuthKey) return 'Erro: API_AUTH_KEY não encontrada no .env';

      // Analyze source video with ffprobe or cv2 fallback
      let sourceInfo;
      try {
        const probe = execSync(`ffprobe -v quiet -print_format json -show_streams -show_format "${resolvedInput}"`, { encoding: 'utf8', timeout: 30000 });
        const probeData = JSON.parse(probe);
        const videoStream = probeData.streams.find(s => s.codec_type === 'video');
        sourceInfo = {
          width: parseInt(videoStream.width),
          height: parseInt(videoStream.height),
          fps: eval(videoStream.r_frame_rate) || 30,
          frame_count: parseInt(videoStream.nb_frames) || Math.round(parseFloat(probeData.format.duration) * eval(videoStream.r_frame_rate)),
          duration: parseFloat(probeData.format.duration),
          size: parseInt(probeData.format.size),
          container: path.extname(resolvedInput).replace('.', '').toLowerCase()
        };
      } catch (e) {
        // Fallback: try python cv2
        try {
          const pyCmd = `python -c "import cv2,os,json; cap=cv2.VideoCapture('${resolvedInput.replace(/'/g, "\\'")}'); print(json.dumps({'width':int(cap.get(3)),'height':int(cap.get(4)),'fps':cap.get(5),'frame_count':int(cap.get(7)),'duration':int(cap.get(7))/cap.get(5) if cap.get(5)>0 else 0,'size':os.path.getsize('${resolvedInput.replace(/'/g, "\\'")}'),'container':'${path.extname(resolvedInput).replace('.', '').toLowerCase()}'})); cap.release()"`;
          sourceInfo = JSON.parse(execSync(pyCmd, { encoding: 'utf8', timeout: 30000 }).trim());
        } catch (e2) {
          return `Erro ao analisar vídeo (nem ffprobe nem cv2 disponíveis): ${e2.message}`;
        }
      }
      if (sourceInfo.container === 'mkv') sourceInfo.container = 'mp4';

      // Determine output dimensions (auto 4K maintaining aspect ratio)
      const model = args.model || 'ahq-12';
      const encoder = args.encoder || 'H265';
      let outW = args.width;
      let outH = args.height;

      if (!outW && !outH) {
        // Auto: scale to ~4K maintaining aspect ratio
        const isPortrait = sourceInfo.height > sourceInfo.width;
        if (isPortrait) {
          outH = 3840;
          outW = Math.round(sourceInfo.width * (3840 / sourceInfo.height));
        } else {
          outW = 3840;
          outH = Math.round(sourceInfo.height * (3840 / sourceInfo.width));
        }
      } else if (outW && !outH) {
        outH = Math.round(sourceInfo.height * (outW / sourceInfo.width));
      } else if (!outW && outH) {
        outW = Math.round(sourceInfo.width * (outH / sourceInfo.height));
      }
      // Ensure even dimensions
      if (outW % 2 !== 0) outW += 1;
      if (outH % 2 !== 0) outH += 1;

      const outFps = args.fps || sourceInfo.fps;

      // Determine output path
      let outputPath = args.output;
      if (!outputPath) {
        const ext = path.extname(resolvedInput);
        const base = path.basename(resolvedInput, ext);
        const dir = path.dirname(resolvedInput);
        outputPath = path.join(dir, `${base}-4K-enhanced${ext}`);
      }
      outputPath = outputPath.replace(/^~/, os.homedir()).replace(/\\/g, '/');

      // Check if Flask server is running, start if needed
      let serverRunning = false;
      try {
        const checkResp = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/login', { encoding: 'utf8', timeout: 5000 });
        serverRunning = checkResp.trim() === '200';
      } catch (e) { /* not running */ }

      if (!serverRunning) {
        // Start Flask server in background
        const { spawn } = require('child_process');
        const serverProc = spawn('python', ['app.py'], {
          cwd: 'D:/TOPAZ/modern_topaz',
          detached: true,
          stdio: 'ignore',
          env: { ...process.env, TOPAZ_API_KEY: topazApiKey, API_AUTH_KEY: apiAuthKey }
        });
        serverProc.unref();
        // Wait for server to start
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const check = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/login', { encoding: 'utf8', timeout: 3000 });
            if (check.trim() === '200') { serverRunning = true; break; }
          } catch (e) { /* keep waiting */ }
        }
        if (!serverRunning) return 'Erro: Não foi possível iniciar o servidor Flask em D:/TOPAZ/modern_topaz';
      }

      // Submit video via API
      const boundary = '----TopazBoundary' + Date.now();
      const fileData = fs.readFileSync(resolvedInput);
      const fileName = path.basename(resolvedInput);

      const parts = [];
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: video/mp4\r\n\r\n`));
      parts.push(fileData);
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}`));
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="width"\r\n\r\n${outW}`));
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="height"\r\n\r\n${outH}`));
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="fps"\r\n\r\n${outFps}`));
      parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="encoder"\r\n\r\n${encoder}`));
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      const body = Buffer.concat(parts);

      const uploadResult = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/enhance',
          method: 'POST',
          timeout: 600000,
          headers: {
            'X-API-Key': apiAuthKey,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch (e) { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.on('error', e => reject(e));
        req.write(body);
        req.end();
      });

      if (uploadResult.status >= 400) {
        return `Erro ao enviar vídeo: ${JSON.stringify(uploadResult.body)}`;
      }

      const jobId = uploadResult.body.job_id;

      // Save job info for status tracking
      const jobsFile = path.resolve(os.homedir(), '.claude/task-scheduler/data/topaz-jobs.json');
      let allJobs = {};
      try { allJobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8')); } catch (e) { /* new file */ }
      allJobs[jobId] = {
        status: 'running',
        input: resolvedInput,
        output: outputPath,
        model, encoder,
        resolution: `${outW}x${outH}`,
        fps: outFps,
        source: `${sourceInfo.width}x${sourceInfo.height} @ ${sourceInfo.fps}fps`,
        started: new Date().toISOString(),
        settings: uploadResult.body.settings
      };
      fs.writeFileSync(jobsFile, JSON.stringify(allJobs, null, 2));

      // Poll for completion
      let lastProgress = -1;
      const logs = [];
      logs.push(`[Topaz] Job criado: ${jobId}`);
      logs.push(`[Topaz] ${sourceInfo.width}x${sourceInfo.height} → ${outW}x${outH} @ ${outFps}fps (${model}, ${encoder})`);

      while (true) {
        await new Promise(r => setTimeout(r, 10000));
        const statusResult = await new Promise((resolve) => {
          http.get({
            hostname: 'localhost', port: 5000,
            path: `/api/v1/status/${jobId}`,
            headers: { 'X-API-Key': apiAuthKey },
            timeout: 30000
          }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
          }).on('error', () => resolve(null));
        });

        if (!statusResult) continue;

        if (statusResult.progress !== lastProgress) {
          logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${statusResult.progress}% - ${statusResult.status}`);
          lastProgress = statusResult.progress;
        }

        if (statusResult.status === 'completed') {
          logs.push('[Topaz] Processamento concluído!');

          // Download the video
          const dlResult = await new Promise((resolve, reject) => {
            http.get({
              hostname: 'localhost', port: 5000,
              path: `/api/v1/download/${jobId}`,
              headers: { 'X-API-Key': apiAuthKey },
              timeout: 600000
            }, res => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                const url = new URL(res.headers.location);
                const proto = url.protocol === 'https:' ? https : http;
                proto.get(res.headers.location, dlRes => {
                  const chunks = [];
                  dlRes.on('data', c => chunks.push(c));
                  dlRes.on('end', () => resolve(Buffer.concat(chunks)));
                }).on('error', reject);
              } else {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
              }
            }).on('error', reject);
          });

          fs.writeFileSync(outputPath, dlResult);
          const outSize = (dlResult.length / 1024 / 1024).toFixed(1);
          logs.push(`[Topaz] Salvo: ${outputPath} (${outSize} MB)`);

          // Update job file
          allJobs[jobId].status = 'completed';
          allJobs[jobId].completed = new Date().toISOString();
          allJobs[jobId].output_size = `${outSize} MB`;
          fs.writeFileSync(jobsFile, JSON.stringify(allJobs, null, 2));

          return logs.join('\n');

        } else if (statusResult.status === 'failed') {
          logs.push(`[Topaz] ERRO: ${statusResult.result?.error || 'Desconhecido'}`);
          allJobs[jobId].status = 'failed';
          allJobs[jobId].error = statusResult.result?.error;
          fs.writeFileSync(jobsFile, JSON.stringify(allJobs, null, 2));
          return logs.join('\n');
        }
      }

    } catch (e) {
      return `Erro topaz_enhance: ${e.message}`;
    }
  },

  async ocr_extract(args) {
    // Delegado para python-tools/ocr_extract.py via uv run
    try {
      const { execFileSync } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'python-tools', 'ocr_extract.py');
      if (!fs.existsSync(scriptPath)) return `Erro: Script ${scriptPath} não encontrado`;

      const expandedArgs = { ...args };
      const homeDir = os.homedir().replace(/\\/g, '/');
      for (const key of ['input', 'output']) {
        if (expandedArgs[key] && typeof expandedArgs[key] === 'string') {
          expandedArgs[key] = expandedArgs[key].replace(/^~[\\/]/, homeDir + '/');
        }
      }

      const argsJson = JSON.stringify(expandedArgs);
      const result = execFileSync('uv', ['run', scriptPath, argsJson], {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 4 * 1024 * 1024,
        cwd: path.resolve(__dirname, '..')
      });

      try {
        const parsed = JSON.parse(result.trim());
        if (parsed.error) return `Erro ocr_extract: ${parsed.error}`;
        return JSON.stringify(parsed, null, 2);
      } catch (_) {
        return result.trim() || '(ocr_extract executado sem output)';
      }
    } catch (e) {
      const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
      return `Erro ocr_extract: ${e.message}${stderr}`;
    }
  },

  async audio_normalize(args) {
    try {
      const { input, target_lufs = -14, target_tp = -1 } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      const inputPath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(inputPath)) return `Arquivo não encontrado: ${inputPath}`;

      const ext = path.extname(inputPath);
      const outputPath = args.output
        ? args.output.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/')
        : inputPath.replace(/(\.[^.]+)$/, `-normalized${ext}`);

      // Passo 1: análise loudnorm para obter medições reais
      let measured;
      try {
        execSync(
          `ffmpeg -i "${inputPath}" -af loudnorm=I=${target_lufs}:TP=${target_tp}:LRA=11:print_format=json -f null -`,
          { encoding: 'utf8', timeout: 120000 }
        );
      } catch (e) {
        // ffmpeg imprime resultado no stderr
        const stderr = e.stderr || '';
        const jsonMatch = stderr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return `Erro na análise loudnorm (passo 1): ${e.message}\n${stderr.slice(0, 500)}`;
        measured = JSON.parse(jsonMatch[0]);
      }

      if (!measured || !measured.input_i) {
        return 'Erro: não foi possível extrair dados de medição do loudnorm';
      }

      // Passo 2: aplicar normalização com valores medidos
      const filter = `loudnorm=I=${target_lufs}:TP=${target_tp}:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=summary`;

      execSync(
        `ffmpeg -y -i "${inputPath}" -af "${filter}" "${outputPath}"`,
        { encoding: 'utf8', timeout: 300000 }
      );

      if (!fs.existsSync(outputPath)) return 'Erro: arquivo de saída não foi criado';

      const inSize = (fs.statSync(inputPath).size / 1024).toFixed(1);
      const outSize = (fs.statSync(outputPath).size / 1024).toFixed(1);

      return [
        'Áudio normalizado com sucesso!',
        '─'.repeat(40),
        `Input:  ${inputPath} (${inSize} KB)`,
        `Output: ${outputPath} (${outSize} KB)`,
        `Target loudness: ${target_lufs} LUFS | True Peak: ${target_tp} dBTP`,
        `Medido: I=${measured.input_i} LUFS | TP=${measured.input_tp} dBTP | LRA=${measured.input_lra} LU`,
        `Offset aplicado: ${measured.target_offset}`
      ].join('\n');
    } catch (e) {
      return `Erro audio_normalize: ${e.message}`;
    }
  },

  async tts_generate(args) {
    try {
      const { text, output, model = 'eleven_multilingual_v2', stability = 0.75, similarity_boost = 0.75 } = args;
      const voiceName = args.voice || 'Onildo';
      if (!text) return 'Parâmetro "text" é obrigatório';
      if (!output) return 'Parâmetro "output" é obrigatório';

      const voiceMap = {
        'Onildo': 'nWGFsjeb1hzL15rFe7qi',
        'Rachel': '21m00Tcm4TlvDq8ikWAM',
        'Antoni': 'ErXwobaYiN019PkySvjV'
      };

      const voiceId = voiceMap[voiceName] || voiceName;

      // Buscar API key do vault
      let apiKey;
      try {
        const credentialVault = require(path.join(__dirname, '..', 'credential-vault.js'));
        const vault = new credentialVault();
        apiKey = await vault.get('ELEVENLABS_API_KEY');
      } catch (e) {
        return `Erro ao buscar ELEVENLABS_API_KEY no vault: ${e.message}`;
      }
      if (!apiKey) return 'ELEVENLABS_API_KEY não encontrada no vault. Cadastre com: vault_manage action=set name=ELEVENLABS_API_KEY value=SUA_KEY';

      const outputPath = output.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const requestBody = JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability, similarity_boost }
      });

      const audioBuffer = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.elevenlabs.io',
          port: 443,
          path: `/v1/text-to-speech/${voiceId}`,
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
            'Content-Length': Buffer.byteLength(requestBody, 'utf8')
          }
        }, res => {
          if (res.statusCode >= 400) {
            let errData = '';
            res.on('data', c => errData += c);
            res.on('end', () => reject(new Error(`ElevenLabs API ${res.statusCode}: ${errData}`)));
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.write(requestBody, 'utf8');
        req.end();
      });

      fs.writeFileSync(outputPath, audioBuffer);
      const sizekb = (audioBuffer.length / 1024).toFixed(1);

      return [
        'Narração gerada com sucesso!',
        '─'.repeat(40),
        `Voz: ${voiceName} (${voiceId})`,
        `Modelo: ${model}`,
        `Stability: ${stability} | Similarity: ${similarity_boost}`,
        `Texto: ${text.slice(0, 80)}${text.length > 80 ? '...' : ''}`,
        `Arquivo: ${outputPath} (${sizekb} KB)`
      ].join('\n');
    } catch (e) {
      return `Erro tts_generate: ${e.message}`;
    }
  },

  async image_safe_zones(args) {
    try {
      const { input, grid_size = 8, threshold = 0.6 } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      const inputPath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(inputPath)) return `Arquivo não encontrado: ${inputPath}`;

      const escapedPath = inputPath.replace(/\\/g, '/').replace(/'/g, "\\'");

      const pyScript = `
import sys, json, math
try:
    from PIL import Image
    import numpy as np
except ImportError:
    print(json.dumps({'error': 'Instale Pillow e numpy: pip install Pillow numpy'}))
    sys.exit(0)
img = Image.open('${escapedPath}').convert('RGB')
arr = __import__('numpy').array(img, dtype=float)
h, w = arr.shape[:2]
gs = int(${grid_size})
cell_h = h // gs
cell_w = w // gs
grid = []
best_zones = []
import numpy as np
for row in range(gs):
    row_data = []
    for col in range(gs):
        y1, y2 = row * cell_h, (row + 1) * cell_h
        x1, x2 = col * cell_w, (col + 1) * cell_w
        cell = arr[y1:y2, x1:x2]
        variance = float(np.var(cell)) / (255.0 ** 2)
        hist, _ = np.histogram(cell.flatten(), bins=32, range=(0, 255))
        hist_norm = hist / (hist.sum() + 1e-9)
        entropy = float(-np.sum(hist_norm * np.log2(hist_norm + 1e-9))) / math.log2(32)
        safety = max(0.0, 1.0 - (variance * 0.5 + entropy * 0.5))
        row_data.append(round(safety, 3))
        best_zones.append({'row': row, 'col': col, 'score': round(safety, 3), 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
    grid.append(row_data)
best_zones.sort(key=lambda z: -z['score'])
top5 = best_zones[:5]
top_rows = [grid[r][c] for r in range(gs // 4) for c in range(gs)]
bottom_rows = [grid[r][c] for r in range(gs - gs // 4, gs) for c in range(gs)]
left_cols = [grid[r][c] for r in range(gs) for c in range(gs // 4)]
right_cols = [grid[r][c] for r in range(gs) for c in range(gs - gs // 4, gs)]
result = {'image': '${escapedPath}', 'dimensions': {'width': w, 'height': h}, 'grid_size': gs, 'threshold': float(${threshold}), 'grid': grid, 'best_zones': top5, 'recommended_positions': {'top': round(sum(top_rows)/len(top_rows),3), 'bottom': round(sum(bottom_rows)/len(bottom_rows),3), 'left': round(sum(left_cols)/len(left_cols),3), 'right': round(sum(right_cols)/len(right_cols),3)}, 'safe_zones': [z for z in best_zones if z['score'] >= float(${threshold})]}
print(json.dumps(result))
`.trim();

      const tmpScript = path.join(os.tmpdir(), `safe_zones_${Date.now()}.py`);
      fs.writeFileSync(tmpScript, pyScript, 'utf8');
      let rawOutput;
      try {
        rawOutput = execSync(`uv run python "${tmpScript}"`, {
          encoding: 'utf8',
          timeout: 60000,
          maxBuffer: 4 * 1024 * 1024
        });
      } finally {
        try { fs.unlinkSync(tmpScript); } catch (_) {}
      }

      const parsed = JSON.parse(rawOutput.trim());
      if (parsed.error) return `Erro image_safe_zones: ${parsed.error}`;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return `Erro image_safe_zones: ${e.message}`;
    }
  },

  async screenshot_compare(args) {
    try {
      const { before, after, threshold = 25 } = args;
      if (!before || !after) return 'Parâmetros obrigatórios: before, after';

      const beforePath = before.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      const afterPath = after.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(beforePath)) return `Arquivo "before" não encontrado: ${beforePath}`;
      if (!fs.existsSync(afterPath)) return `Arquivo "after" não encontrado: ${afterPath}`;

      const outputPath = args.output
        ? args.output.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/')
        : beforePath.replace(/(\.[^.]+)$/, '-diff$1');

      let sharp;
      try {
        sharp = require('sharp');
      } catch (_) {
        return 'Erro: sharp não instalado. Execute: npm install sharp no diretório do task-scheduler';
      }

      const [imgBefore, imgAfter] = await Promise.all([
        sharp(beforePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(afterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      ]);

      const { width, height } = imgBefore.info;
      if (imgBefore.info.width !== imgAfter.info.width || imgBefore.info.height !== imgAfter.info.height) {
        return `Erro: imagens têm dimensões diferentes. Before: ${imgBefore.info.width}x${imgBefore.info.height} | After: ${imgAfter.info.width}x${imgAfter.info.height}`;
      }

      const channels = 4; // RGBA
      const diffData = Buffer.alloc(width * height * channels);
      let diffPixels = 0;
      const totalPixels = width * height;

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * channels;
        const rDiff = Math.abs(imgBefore.data[offset] - imgAfter.data[offset]);
        const gDiff = Math.abs(imgBefore.data[offset + 1] - imgAfter.data[offset + 1]);
        const bDiff = Math.abs(imgBefore.data[offset + 2] - imgAfter.data[offset + 2]);
        const maxDiff = Math.max(rDiff, gDiff, bDiff);

        if (maxDiff > threshold) {
          diffPixels++;
          diffData[offset] = 255;
          diffData[offset + 1] = 0;
          diffData[offset + 2] = 0;
          diffData[offset + 3] = 255;
        } else {
          const gray = Math.round((imgBefore.data[offset] + imgBefore.data[offset + 1] + imgBefore.data[offset + 2]) / 3 * 0.3 + 180);
          diffData[offset] = gray;
          diffData[offset + 1] = gray;
          diffData[offset + 2] = gray;
          diffData[offset + 3] = 255;
        }
      }

      await sharp(diffData, { raw: { width, height, channels } }).png().toFile(outputPath);

      const diffPercent = ((diffPixels / totalPixels) * 100).toFixed(2);

      return [
        'Comparação concluída!',
        '─'.repeat(40),
        `Before: ${beforePath}`,
        `After:  ${afterPath}`,
        `Diff:   ${outputPath}`,
        `Dimensões: ${width}x${height}`,
        `Pixels diferentes: ${diffPixels.toLocaleString()} de ${totalPixels.toLocaleString()} (${diffPercent}%)`,
        `Threshold usado: ${threshold} (diferença máxima por canal)`
      ].join('\n');
    } catch (e) {
      return `Erro screenshot_compare: ${e.message}`;
    }
  },

  async favicon_generator(args) {
    try {
      const { input } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      const inputPath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(inputPath)) return `Arquivo não encontrado: ${inputPath}`;

      const outputDir = args.output_dir
        ? args.output_dir.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/')
        : path.dirname(inputPath);

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      let sharp;
      try {
        sharp = require('sharp');
      } catch (_) {
        return 'Erro: sharp não instalado. Execute: npm install sharp no diretório do task-scheduler';
      }

      const sizes = [
        { name: 'favicon-16x16.png', size: 16 },
        { name: 'favicon-32x32.png', size: 32 },
        { name: 'apple-touch-icon.png', size: 180 },
        { name: 'android-chrome-192x192.png', size: 192 },
        { name: 'android-chrome-512x512.png', size: 512 }
      ];

      const generated = [];
      for (const { name, size } of sizes) {
        const outFile = path.join(outputDir, name);
        await sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(outFile);
        const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
        generated.push({ file: outFile, size: `${size}x${size}`, kb: sizeKb });
      }

      const snippet = `<!-- Favicons gerados por favicon_generator -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">`;

      return [
        'Favicons gerados com sucesso!',
        '─'.repeat(40),
        ...generated.map(g => `${g.size.padEnd(10)} ${g.kb.padStart(6)} KB  →  ${g.file}`),
        '',
        'Snippet HTML para colar no <head>:',
        '─'.repeat(40),
        snippet
      ].join('\n');
    } catch (e) {
      return `Erro favicon_generator: ${e.message}`;
    }
  },

  async color_contrast(args) {
    try {
      const { foreground, background } = args;
      if (!foreground || !background) return 'Parâmetros obrigatórios: foreground, background';

      function hexToRgb(hex) {
        const clean = hex.replace(/^#/, '');
        const full = clean.length === 3
          ? clean.split('').map(c => c + c).join('')
          : clean;
        return {
          r: parseInt(full.substring(0, 2), 16),
          g: parseInt(full.substring(2, 4), 16),
          b: parseInt(full.substring(4, 6), 16)
        };
      }

      function relativeLuminance({ r, g, b }) {
        const linearize = c => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
      }

      const fgRgb = hexToRgb(foreground);
      const bgRgb = hexToRgb(background);
      const L1 = relativeLuminance(fgRgb);
      const L2 = relativeLuminance(bgRgb);
      const lighter = Math.max(L1, L2);
      const darker = Math.min(L1, L2);
      const ratio = (lighter + 0.05) / (darker + 0.05);
      const ratioRounded = Math.round(ratio * 100) / 100;

      const wcag = {
        AA_normal_text: { required: 4.5, pass: ratio >= 4.5 },
        AA_large_text: { required: 3.0, pass: ratio >= 3.0 },
        AAA_normal_text: { required: 7.0, pass: ratio >= 7.0 },
        AAA_large_text: { required: 4.5, pass: ratio >= 4.5 }
      };

      const passCount = Object.values(wcag).filter(v => v.pass).length;
      const overall = passCount === 4 ? 'EXCELENTE (AAA)' : passCount >= 2 ? 'BOM (AA)' : 'INSUFICIENTE';

      const result = {
        foreground, background,
        contrast_ratio: ratioRounded,
        ratio_display: `${ratioRounded}:1`,
        wcag,
        luminance: {
          foreground: Math.round(L1 * 1000) / 1000,
          background: Math.round(L2 * 1000) / 1000
        }
      };

      return [
        'Análise de contraste WCAG',
        '─'.repeat(40),
        `Foreground: ${foreground}  →  RGB(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b})`,
        `Background: ${background}  →  RGB(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`,
        `Ratio: ${ratioRounded}:1  —  ${overall}`,
        '',
        `AA  texto normal  (>=4.5): ${wcag.AA_normal_text.pass ? 'PASS' : 'FAIL'}`,
        `AA  texto grande  (>=3.0): ${wcag.AA_large_text.pass ? 'PASS' : 'FAIL'}`,
        `AAA texto normal  (>=7.0): ${wcag.AAA_normal_text.pass ? 'PASS' : 'FAIL'}`,
        `AAA texto grande  (>=4.5): ${wcag.AAA_large_text.pass ? 'PASS' : 'FAIL'}`,
        '',
        'JSON completo:',
        JSON.stringify(result, null, 2)
      ].join('\n');
    } catch (e) {
      return `Erro color_contrast: ${e.message}`;
    }
  },

  async ad_creative_analyzer(args) {
    try {
      const { input, type = 'feed' } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      const inputPath = input.replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');
      if (!fs.existsSync(inputPath)) return `Arquivo não encontrado: ${inputPath}`;

      let sharp;
      try {
        sharp = require('sharp');
      } catch (_) {
        return 'Erro: sharp não instalado. Execute: npm install sharp no diretório do task-scheduler';
      }

      const meta = await sharp(inputPath).metadata();
      const fileSize = fs.statSync(inputPath).size;
      const fileSizeMB = fileSize / (1024 * 1024);
      const { width, height, format } = meta;

      const aspectTargets = {
        feed: { w: 1, h: 1, label: '1:1', minSide: 1080 },
        stories: { w: 9, h: 16, label: '9:16', minSide: 1080 },
        carousel: { w: 1, h: 1, label: '1:1', minSide: 1080 }
      };

      const target = aspectTargets[type] || aspectTargets.feed;
      const actualRatio = width / height;
      const targetRatio = target.w / target.h;
      const ratioDiff = Math.abs(actualRatio - targetRatio);

      const issues = [];
      const recommendations = [];
      let score = 100;

      if (ratioDiff > 0.05) {
        score -= 20;
        issues.push(`Aspect ratio incorreto para ${type}: esperado ${target.label}, encontrado ~${(actualRatio).toFixed(2)}:1`);
        recommendations.push(`Recorte ou redimensione para ${target.label} (ex: 1080x${Math.round(1080 / targetRatio)}px)`);
      }

      const minSide = Math.min(width, height);
      if (minSide < 600) {
        score -= 30;
        issues.push(`Resolucao muito baixa: menor lado = ${minSide}px (minimo recomendado: 600px)`);
        recommendations.push('Use imagens com pelo menos 1080px no menor lado para Meta Ads');
      } else if (minSide < 1080) {
        score -= 10;
        issues.push(`Resolucao abaixo do ideal: menor lado = ${minSide}px (ideal: 1080px)`);
        recommendations.push('Idealmente use 1080px no menor lado');
      }

      if (fileSizeMB > 30) {
        score -= 25;
        issues.push(`Arquivo muito grande: ${fileSizeMB.toFixed(1)} MB (limite Meta Ads: 30 MB)`);
        recommendations.push('Comprima a imagem com image_optimize para reduzir o tamanho');
      } else if (fileSizeMB > 1) {
        score -= 5;
        issues.push(`Arquivo grande: ${fileSizeMB.toFixed(1)} MB (ideal: <1 MB)`);
        recommendations.push('Considere comprimir com image_optimize quality=85 format=webp');
      }

      if (format === 'bmp' || format === 'tiff') {
        score -= 10;
        issues.push(`Formato ${format.toUpperCase()} nao suportado por Meta Ads`);
        recommendations.push('Converta para JPEG ou PNG com image_optimize');
      }

      let paletteInfo = null;
      try {
        const { data, info: statsInfo } = await sharp(inputPath)
          .resize(100, 100, { fit: 'cover' })
          .raw()
          .toBuffer({ resolveWithObject: true });
        const pixels = data.length / statsInfo.channels;
        let totalSaturation = 0;
        for (let i = 0; i < pixels; i++) {
          const off = i * statsInfo.channels;
          const r = data[off] / 255, g = data[off + 1] / 255, b = data[off + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          totalSaturation += max === 0 ? 0 : (max - min) / max;
        }
        const avgSaturation = totalSaturation / pixels;
        paletteInfo = { avg_saturation: Math.round(avgSaturation * 100) };
        if (avgSaturation < 0.15) {
          score -= 5;
          issues.push('Imagem com baixa saturacao — cores pouco vibrantes podem reduzir CTR');
          recommendations.push('Considere aumentar saturacao/contraste para criativos mais impactantes');
        }
      } catch (_) { /* paleta nao critica */ }

      const overallGrade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

      const result = {
        input: inputPath,
        type,
        score,
        grade: overallGrade,
        metadata: {
          width, height,
          aspect_ratio: `${(actualRatio).toFixed(3)}:1`,
          format: format ? format.toUpperCase() : 'unknown',
          file_size_mb: parseFloat(fileSizeMB.toFixed(2)),
          min_side_px: minSide
        },
        palette: paletteInfo,
        issues: issues.length ? issues : ['Nenhum problema encontrado'],
        recommendations: recommendations.length ? recommendations : ['Criativo dentro dos padroes recomendados']
      };

      return [
        `Analise de Criativo — ${type.toUpperCase()}`,
        '─'.repeat(40),
        `Score: ${score}/100 (${overallGrade})`,
        `Dimensoes: ${width}x${height} | Formato: ${result.metadata.format} | Tamanho: ${result.metadata.file_size_mb} MB`,
        `Aspect ratio: ${result.metadata.aspect_ratio} (esperado: ${target.label})`,
        '',
        issues.length ? `Issues (${issues.length}):\n${issues.map(i => `  * ${i}`).join('\n')}` : 'Sem issues!',
        '',
        recommendations.length ? `Recomendacoes:\n${recommendations.map(r => `  -> ${r}`).join('\n')}` : '',
        '',
        'JSON completo:',
        JSON.stringify(result, null, 2)
      ].filter(l => l !== '').join('\n');
    } catch (e) {
      return `Erro ad_creative_analyzer: ${e.message}`;
    }
  },

  async transcribe_audio(args) {
    try {
      const { input, language = 'pt', model = 'small', format = 'text', output, beam_size = 5, vad = 'true' } = args;
      if (!input) return 'Parâmetro "input" é obrigatório';

      const resolved = path.resolve(input.replace(/^~/, os.homedir()));
      if (!fs.existsSync(resolved)) return `Arquivo não encontrado: ${resolved}`;

      const { execFileSync } = require('child_process');
      const scriptPath = path.join(__dirname, '..', 'python-tools', 'transcribe_audio.py');

      if (!fs.existsSync(scriptPath)) {
        return `Script Python não encontrado: ${scriptPath}. Verifique a instalação.`;
      }

      const expandedArgs = { input: resolved, language, model, format, beam_size: String(beam_size), vad };
      if (output) expandedArgs.output = path.resolve(output.replace(/^~/, os.homedir()));

      const argsJson = JSON.stringify(expandedArgs);

      // Tentar via uv run (preferencial) ou python direto (fallback)
      let result;
      try {
        result = execFileSync('uv', ['run', scriptPath, argsJson], {
          encoding: 'utf8',
          timeout: 600000,
          maxBuffer: 8 * 1024 * 1024,
        });
      } catch (_uvErr) {
        // Fallback: python direto (requer faster-whisper instalado via pip)
        try {
          result = execFileSync('python', [scriptPath, argsJson], {
            encoding: 'utf8',
            timeout: 600000,
            maxBuffer: 8 * 1024 * 1024,
          });
        } catch (pyErr) {
          return `Erro ao executar transcrição. Verifique se faster-whisper está instalado:\n  pip install faster-whisper\n\nDetalhes: ${pyErr.message}`;
        }
      }

      const parsed = JSON.parse(result.trim());
      if (parsed.error) return `Erro: ${parsed.error}`;

      if (format === 'json') return JSON.stringify(parsed, null, 2);

      const lines = [
        `Transcrição — ${parsed.model} (int8, CPU)`,
        '─'.repeat(50),
        `Arquivo: ${parsed.file}`,
        `Tamanho: ${parsed.file_size_kb} KB | Duração: ${parsed.duration_seconds}s`,
        `Idioma: ${parsed.language} (${(parsed.language_probability * 100).toFixed(1)}%)`,
        `Tempo: ${parsed.transcribe_time}s | RTF: ${parsed.rtf}`,
        '',
        'TEXTO:',
        parsed.text,
      ];

      if (parsed.segments && parsed.segments.length > 1) {
        lines.push('', 'SEGMENTOS:');
        for (const s of parsed.segments) {
          lines.push(`  [${s.start.toFixed(2)}s → ${s.end.toFixed(2)}s] ${s.text}`);
        }
      }

      if (parsed.output_file) {
        lines.push('', `Arquivo salvo: ${parsed.output_file}`);
      }

      return lines.join('\n');
    } catch (e) {
      return `Erro transcribe_audio: ${e.message}`;
    }
  },
};

module.exports = { definitions, handlers };
