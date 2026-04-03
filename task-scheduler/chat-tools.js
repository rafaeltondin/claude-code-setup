/**
 * CHAT TOOLS - Ferramentas disponíveis para o modelo de chat
 *
 * Permite que o modelo acesse:
 *   - Credenciais (vault seguro)
 *   - Knowledge Base (busca semântica)
 *   - APIs externas (fetch_api)
 *   - CRM local (call_crm — autenticado automaticamente)
 *   - Código Node.js (execute_node)
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CRM_BASE = process.env.CRM_URL || `http://localhost:${process.env.PORT || 8000}`;
const CRM_TOKEN = process.env.CRM_TOKEN || 'local-dev-token';

// Tool Utils — Circuit Breaker, Cache, Timeout
let toolUtils = null;
try { toolUtils = require('./tool-utils'); } catch (_) { console.log('[chat-tools] tool-utils.js não encontrado, rodando sem proteção'); }

// Chrome DevTools Protocol
let chromeTool = null;
try { chromeTool = require('./chrome-tool'); } catch (_) {}

// Web Search (DuckDuckGo + Brave — sem API paga)
const { googleSearch, mapsSearch } = require('./web-search');

// Image Generator (Chrome CDP)
let imageGenerator = null;
try { imageGenerator = require('./image-generator'); } catch (_) {}

const TOOLS_DEF = [
  {
    type: 'function',
    function: {
      name: 'get_credential',
      description: 'Obtém uma credencial do vault seguro (API keys, tokens, senhas).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da credencial. Ex: FB_ACCESS_TOKEN, SHOPIFY_ACCESS_TOKEN, EVOLUTION_API_KEY, OPENROUTER_API_KEY' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'call_crm',
      description: 'Chamada autenticada ao CRM local. Recursos: GET/POST /leads, /leads/:id/notes, /messages/whatsapp, /messages/email, /campaigns, /personal-tasks, /finance, /notes, /templates, /settings.',
      parameters: {
        type: 'object',
        properties: {
          endpoint: { type: 'string', description: 'Endpoint sem o prefixo /api/crm. Ex: /leads, /personal-tasks, /finance' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'Método HTTP. Padrão: GET' },
          body: { type: 'object', description: 'Body da requisição como objeto JSON (para POST/PUT)' },
          query: { type: 'string', description: 'Query string. Ex: status=pending&priority=high' }
        },
        required: ['endpoint']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_api',
      description: 'Chamada HTTP a APIs externas (Meta Ads, Shopify, Evolution/WhatsApp, Google, etc.). Use call_crm para o CRM local.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa da API externa' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'Método HTTP' },
          headers: { type: 'object', description: 'Headers HTTP como objeto JSON' },
          body: { type: 'string', description: 'Body da requisição (string JSON ou texto)' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_kb',
      description: 'Busca documentação, guias e APIs na Knowledge Base local. Use para saber como usar uma API ou encontrar configurações.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca. Ex: "Meta Ads API campaigns", "Shopify orders", "Evolution WhatsApp groups"' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_node',
      description: 'Executa código Node.js e retorna o stdout. Use APENAS para cálculos, formatação ou lógica que NAO tenha ferramenta dedicada. PROIBIDO usar para: medir velocidade de site (use pagespeed), analisar SEO (use seo_check), consultar Meta Ads (use meta_ads), processar CSV (use csv_processor).',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Código Node.js a executar. Pode usar require() para módulos nativos do Node (fs, path, crypto, http, https).' }
        },
        required: ['code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lê o conteúdo de um arquivo local do sistema. Aceita caminhos absolutos (C:/... ou /home/...) e URLs file:// (file:///C:/...). Use para ler HTMLs, JSONs, textos, logs, etc.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do arquivo ou URL file://. Ex: ~/Desktop/proposta.html ou file:///~/Desktop/proposta.html' },
          encoding: { type: 'string', enum: ['utf8', 'base64', 'hex'], description: 'Encoding para leitura. Padrão: utf8' },
          maxBytes: { type: 'number', description: 'Limite de bytes a ler (padrão: 50000). Use para arquivos grandes.' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Escreve ou cria um arquivo local. Pode sobrescrever o conteúdo completo ou adicionar ao final (append). Use para criar HTMLs, JSONs, scripts, textos, etc.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do arquivo. Ex: ~/Desktop/resultado.txt' },
          content: { type: 'string', description: 'Conteúdo a escrever no arquivo' },
          encoding: { type: 'string', enum: ['utf8', 'base64'], description: 'Encoding. Padrão: utf8' },
          append: { type: 'boolean', description: 'Se true, adiciona ao final do arquivo em vez de sobrescrever. Padrão: false' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lista arquivos e pastas em um diretório local. Retorna nome, tipo (file/dir), tamanho e data de modificação.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do diretório. Ex: ~/Desktop' },
          recursive: { type: 'boolean', description: 'Se true, lista recursivamente. Padrão: false' },
          filter: { type: 'string', description: 'Filtro de extensão. Ex: ".html" ou ".js" — filtra só arquivos com essa extensão' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Deleta um arquivo ou diretório vazio. Para diretórios com conteúdo, use force: true.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do arquivo ou diretório a deletar' },
          force: { type: 'boolean', description: 'Se true, deleta diretórios com conteúdo recursivamente. CUIDADO: irreversível. Padrão: false' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Move ou renomeia um arquivo ou diretório. Funciona como "mv" no Linux ou "Move-Item" no PowerShell.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Caminho absoluto de origem' },
          destination: { type: 'string', description: 'Caminho absoluto de destino (novo nome ou novo local)' },
          overwrite: { type: 'boolean', description: 'Se true, sobrescreve o destino se já existir. Padrão: false' }
        },
        required: ['source', 'destination']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_info',
      description: 'Retorna metadados de um arquivo ou diretório: tamanho, tipo, datas de criação/modificação, permissões, extensão.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do arquivo ou diretório' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: `Executa um comando no terminal do sistema (bash no Linux/Mac, PowerShell no Windows).
Use para: npm install, pip install, docker, python, node scripts, compilar, testar, iniciar servidores, etc.
Prefer run_command sobre execute_node quando precisar de CLIs externas (git, npm, docker, python, etc.).
ATENÇÃO: comandos destrutivos (rm -rf, format, drop) serão executados — confirme com o usuário antes.`,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando a executar. Ex: "npm install", "python script.py", "docker ps", "pip install requests"' },
          cwd: { type: 'string', description: 'Diretório de trabalho. Ex: ~/Desktop/meu-projeto. Padrão: diretório do servidor.' },
          timeout: { type: 'number', description: 'Timeout em segundos. Padrão: 30. Máximo: 300.' },
          shell: { type: 'string', enum: ['auto', 'bash', 'powershell', 'cmd'], description: 'Shell a usar. auto detecta automaticamente (bash no Linux, powershell no Windows). Padrão: auto' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git',
      description: 'Executa operações Git em um repositório local. Suporta: status, log, diff, add, commit, push, pull, branch, checkout, clone, stash, reset.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['status', 'log', 'diff', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'clone', 'stash', 'reset', 'init', 'remote', 'tag', 'fetch', 'merge', 'rebase', 'show'],
            description: 'Ação Git a executar'
          },
          args: { type: 'string', description: 'Argumentos adicionais. Ex: para commit → "-m \\"mensagem\\"", para log → "--oneline -20", para clone → "https://... ./pasta"' },
          cwd: { type: 'string', description: 'Diretório do repositório Git. Padrão: diretório do servidor.' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_in_files',
      description: 'Busca texto ou padrão regex dentro de arquivos (equivalente ao grep/rg). Retorna arquivo, linha e contexto.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Texto ou regex a buscar. Ex: "TODO", "function handleClick", "api_key\\s*=.*"' },
          path: { type: 'string', description: 'Diretório ou arquivo onde buscar. Ex: ~/Desktop/projeto' },
          recursive: { type: 'boolean', description: 'Buscar recursivamente em subpastas. Padrão: true' },
          fileFilter: { type: 'string', description: 'Filtrar por extensão. Ex: ".js", ".py", ".html". Se omitido, busca em todos os arquivos de texto.' },
          caseSensitive: { type: 'boolean', description: 'Diferencia maiúsculas/minúsculas. Padrão: false' },
          maxResults: { type: 'number', description: 'Máximo de resultados. Padrão: 50' }
        },
        required: ['pattern', 'path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_files',
      description: 'Encontra arquivos por nome ou padrão glob em um diretório (equivalente ao find/Glob). Ex: "*.html", "package.json", "*config*".',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Diretório raiz onde procurar' },
          pattern: { type: 'string', description: 'Padrão de nome de arquivo. Suporta * e ?. Ex: "*.js", "*.test.*", "package.json", "*config*"' },
          recursive: { type: 'boolean', description: 'Buscar em subpastas. Padrão: true' },
          maxResults: { type: 'number', description: 'Máximo de resultados. Padrão: 100' }
        },
        required: ['path', 'pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_manager',
      description: 'Gerencia processos do sistema: listar processos, verificar portas, matar processo por PID ou porta. Use para diagnóstico e gerenciamento de servidores.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'kill', 'port_info', 'find_by_name'],
            description: 'list: lista todos os processos node/python/java ativos | kill: mata processo por PID | port_info: mostra processo ouvindo em uma porta | find_by_name: encontra PIDs pelo nome do processo'
          },
          pid: { type: 'number', description: 'PID do processo (para action: kill)' },
          port: { type: 'number', description: 'Porta a verificar (para action: port_info)' },
          name: { type: 'string', description: 'Nome do processo a buscar (para action: find_by_name). Ex: "node", "python", "nginx"' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'diff_files',
      description: 'Compara dois arquivos e mostra as diferenças linha a linha (equivalente ao diff). Útil para revisar mudanças antes de commitar.',
      parameters: {
        type: 'object',
        properties: {
          fileA: { type: 'string', description: 'Caminho absoluto do primeiro arquivo' },
          fileB: { type: 'string', description: 'Caminho absoluto do segundo arquivo' },
          context: { type: 'number', description: 'Número de linhas de contexto ao redor das diferenças. Padrão: 3' }
        },
        required: ['fileA', 'fileB']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_url',
      description: 'Abre uma URL ou arquivo no navegador padrão do sistema, ou abre um arquivo em seu programa padrão (PDF, imagem, etc.).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL ou caminho de arquivo a abrir. Ex: "http://localhost:3000", "~/Desktop/index.html", "~/relatorio.pdf"' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scrape_website',
      description: `Raspa um site e extrai informações estruturadas da identidade visual e contato.
Coleta automaticamente:
- Texto completo da página (limpo, sem HTML)
- Cores da identidade visual (hex/rgb mais usados no CSS)
- Logotipo (og:image, favicon, apple-touch-icon, <img> com "logo")
- WhatsApp (links wa.me, api.whatsapp.com, números próximos à palavra "whatsapp")
- E-mails (links mailto: e regex no conteúdo)
- Título e meta description

Use para analisar sites de concorrentes, clientes ou referências antes de criar anúncios, landing pages ou estratégias.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site a raspar. Ex: https://www.exemplo.com.br' },
          includeText: { type: 'boolean', description: 'Incluir o texto completo da página. Padrão: true' },
          maxTextLength: { type: 'number', description: 'Limite de caracteres do texto extraído. Padrão: 5000' }
        },
        required: ['url']
      }
    }
  },
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
      name: 'instagram',
      description: `Interage com o Instagram via instagrapi (servico Python local na porta 8001).
Requer conta conectada em Configuracoes > Instagram.

ACOES DISPONIVEIS:
- status: verifica se esta autenticado e retorna o username
- feed: busca posts do feed (args: {amount?})
- user: info de um perfil (args: {username, posts?})
- my_posts: posts da sua conta (args: {amount?})
- hashtag: posts de uma hashtag (args: {tag, amount?})
- followers: seguidores de um perfil (args: {username, amount?})
- following: quem um perfil segue (args: {username, amount?})
- like: curtir post (args: {media_id ou url})
- unlike: descurtir post (args: {media_id})
- comment: comentar em post (args: {media_id, text})
- follow: seguir usuario (args: {username})
- unfollow: deixar de seguir (args: {username})
- dm: enviar mensagem direta (args: {username, text})
- dm_inbox: caixa de entrada de DMs (args: {amount?})
- post_photo: publicar foto (args: {image_path, caption?})
- post_reel: publicar reel (args: {video_path, caption?, thumbnail_path?})
- story: publicar story (args: {image_path})
- search_users: buscar usuarios (args: {query})

EXEMPLO:
{"tool_call": {"name": "instagram", "args": {"action": "user", "username": "fiberoficial", "posts": 6}}}`,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['status', 'feed', 'user', 'my_posts', 'hashtag', 'followers', 'following', 'like', 'unlike', 'comment', 'follow', 'unfollow', 'dm', 'dm_inbox', 'post_photo', 'post_reel', 'story', 'search_users'],
            description: 'Acao a executar'
          },
          username: { type: 'string', description: 'Username do Instagram (sem @). Para acoes: user, followers, following, follow, unfollow, dm' },
          tag: { type: 'string', description: 'Hashtag sem #. Para action: hashtag' },
          amount: { type: 'number', description: 'Quantidade de resultados. Padrao: 12 para feed/posts, 50 para followers/following' },
          posts: { type: 'number', description: 'Numero de posts recentes a incluir no perfil. Para action: user' },
          media_id: { type: 'string', description: 'ID do post ou URL completa do Instagram. Para: like, unlike, comment' },
          text: { type: 'string', description: 'Texto do comentario ou DM. Para: comment, dm' },
          image_path: { type: 'string', description: 'Caminho absoluto da imagem a publicar. Para: post_photo, story' },
          video_path: { type: 'string', description: 'Caminho absoluto do video a publicar. Para: post_reel' },
          thumbnail_path: { type: 'string', description: 'Caminho absoluto da thumbnail do reel (opcional). Para: post_reel' },
          caption: { type: 'string', description: 'Legenda do post. Para: post_photo, post_reel' },
          query: { type: 'string', description: 'Termo de busca. Para: search_users' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'chrome',
      description: `Controla o Chrome via Chrome DevTools Protocol (CDP). Equivalente ao MCP chrome-devtools.
O Chrome deve estar aberto com --remote-debugging-port (portas 9222, 9333-9350).
Para abrir: node ~/.claude/chrome-manager.js open --port 9333

AÇÕES DISPONÍVEIS:
- screenshot: Tira screenshot da aba ativa. Salva PNG em arquivo temp e retorna o caminho.
- snapshot: Retorna DOM simplificado (títulos, links, inputs, texto) para entender a página sem imagem.
- navigate: Navega para uma URL. Args: {url}
- click: Clica em elemento CSS. Args: {selector}
- type: Digita texto em input. Args: {selector, text}
- evaluate: Executa JavaScript. Args: {code} → retorna o resultado
- wait_for: Aguarda elemento aparecer. Args: {selector, timeout?}
- scroll: Scrolla a página. Args: {y?, selector?}
- get_url: Retorna URL e título da aba ativa.
- list_tabs: Lista todas as abas abertas.

PROTOCOLO OBRIGATÓRIO:
1. SEMPRE tire snapshot() ANTES de interagir com a página
2. SEMPRE use wait_for() APÓS navigate() antes de clicar
3. Use screenshot() para validar resultados visuais`,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['screenshot', 'snapshot', 'navigate', 'click', 'type', 'evaluate', 'wait_for', 'scroll', 'get_url', 'list_tabs'],
            description: 'Ação a executar'
          },
          args: {
            type: 'object',
            description: 'Argumentos da ação. Ex: {url: "https://..."} para navigate, {selector: "#btn"} para click, {code: "document.title"} para evaluate'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'orchestrate',
      description: `Orquestra uma tarefa complexa usando multiplos agentes especializados em paralelo.
Use quando a tarefa requer multiplos passos, diferentes especialidades ou quando o usuario pede para "orquestrar", "usar agentes" ou a tarefa e claramente complexa.
O orquestrador decompoe automaticamente em subtarefas, despacha agentes especializados e so retorna quando 100% concluido.`,
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'A instrucao/tarefa completa a ser orquestrada. Inclua todos os detalhes relevantes.'
          },
          mode: {
            type: 'string',
            enum: ['auto', 'sequential', 'parallel'],
            description: 'Modo de execucao. auto=decide automaticamente, sequential=um por vez, parallel=paralelo'
          }
        },
        required: ['instruction']
      }
    }
  },
  // ── PDF READER ──────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'pdf_reader',
      description: 'Le e extrai texto de arquivos PDF. Retorna o texto completo ou de paginas especificas. Util para ler relatorios, contratos, notas fiscais, boletos, etc.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Caminho absoluto do arquivo PDF' },
          pages: { type: 'string', description: 'Paginas a extrair. Ex: "1-3", "1,3,5", "all". Padrao: all' },
          max_chars: { type: 'number', description: 'Limite maximo de caracteres no retorno. Padrao: 10000' }
        },
        required: ['file_path']
      }
    }
  },
  // ── CSV PROCESSOR ───────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'csv_processor',
      description: `Processa arquivos CSV com operacoes diversas.
Acoes disponiveis:
- read: Le o CSV e retorna as primeiras N linhas como JSON
- stats: Estatisticas do CSV (total linhas, colunas, tipos de dados)
- filter: Filtra linhas por condicao (coluna, operador, valor)
- aggregate: Agrega dados (sum, avg, count, min, max por coluna)
- search: Busca texto em qualquer coluna
- transform: Converte CSV para JSON ou vice-versa`,
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Caminho absoluto do arquivo CSV' },
          action: { type: 'string', enum: ['read', 'stats', 'filter', 'aggregate', 'search', 'transform'], description: 'Acao a executar' },
          limit: { type: 'number', description: 'Limite de linhas para read. Padrao: 50' },
          column: { type: 'string', description: 'Nome da coluna (para filter/aggregate)' },
          operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'starts_with'], description: 'Operador para filter' },
          value: { type: 'string', description: 'Valor para filter/search' },
          agg_function: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max', 'distinct'], description: 'Funcao de agregacao' },
          delimiter: { type: 'string', description: 'Delimitador do CSV. Padrao: ","' },
          output_format: { type: 'string', enum: ['json', 'csv', 'table'], description: 'Formato de saida. Padrao: json' }
        },
        required: ['file_path', 'action']
      }
    }
  },
  // ── SCHEDULER ───────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'scheduler',
      description: `Agenda tarefas recorrentes ou unicas usando cron. Persiste entre reinicializacoes.
Acoes:
- create: Cria nova tarefa agendada (cron expression + comando/script)
- list: Lista todas as tarefas agendadas
- delete: Remove uma tarefa agendada por ID
- pause: Pausa uma tarefa
- resume: Retoma uma tarefa pausada
- history: Mostra historico de execucoes recentes`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'list', 'delete', 'pause', 'resume', 'history'], description: 'Acao a executar' },
          id: { type: 'string', description: 'ID da tarefa (para delete/pause/resume/history)' },
          name: { type: 'string', description: 'Nome descritivo da tarefa' },
          cron: { type: 'string', description: 'Cron expression. Ex: "0 9 * * 1" (seg 9h), "*/30 * * * *" (a cada 30min), "0 8 * * *" (todo dia 8h)' },
          command: { type: 'string', description: 'Comando shell ou caminho de script Node.js a executar' },
          type: { type: 'string', enum: ['shell', 'node', 'api'], description: 'Tipo: shell=comando, node=script .js, api=chamada HTTP' },
          api_config: {
            type: 'object',
            description: 'Config para type=api: {url, method, headers, body}',
            properties: {
              url: { type: 'string' },
              method: { type: 'string' },
              headers: { type: 'object' },
              body: { type: 'string' }
            }
          }
        },
        required: ['action']
      }
    }
  },
  // ── META ADS ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'meta_ads',
      description: `Acessa a API do Meta Ads (Facebook/Instagram) para consultar metricas, campanhas, adsets e anuncios.
Acoes:
- account_info: Info da conta de anuncios
- campaigns: Lista campanhas (ativas, pausadas, etc)
- insights: Metricas de performance (spend, ROAS, impressions, clicks, purchases, etc)
- adsets: Lista conjuntos de anuncios de uma campanha
- ads: Lista anuncios de um adset
- campaign_insights: Insights detalhados por campanha
- adset_insights: Insights por adset
Datas: use date_preset (yesterday, last_7d, last_30d, this_month) ou time_range {since, until} no formato YYYY-MM-DD.`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['account_info', 'campaigns', 'insights', 'adsets', 'ads', 'campaign_insights', 'adset_insights'], description: 'Acao a executar' },
          date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month', 'last_3d'], description: 'Periodo predefinido' },
          time_range: { type: 'object', description: '{ "since": "YYYY-MM-DD", "until": "YYYY-MM-DD" }', properties: { since: { type: 'string' }, until: { type: 'string' } } },
          campaign_id: { type: 'string', description: 'ID da campanha (para adsets, campaign_insights)' },
          adset_id: { type: 'string', description: 'ID do adset (para ads, adset_insights)' },
          fields: { type: 'string', description: 'Campos extras separados por virgula. Padrao: impressions,spend,clicks,ctr,cpc,actions,action_values,purchase_roas' },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'], description: 'Filtrar por status. Padrao: ALL' },
          limit: { type: 'number', description: 'Limite de resultados. Padrao: 50' }
        },
        required: ['action']
      }
    }
  },
  // ── SEO CHECK ───────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'seo_check',
      description: `Analisa SEO de uma URL. Verifica titulo, meta description, headings, imagens, links, performance, schema markup e mais.
Retorna score SEO e lista de problemas/recomendacoes.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site/pagina a analisar' },
          checks: {
            type: 'string',
            description: 'Checks a executar separados por virgula. Padrao: all. Opcoes: meta, headings, images, links, performance, schema, social, mobile'
          }
        },
        required: ['url']
      }
    }
  },
  // ── PAGESPEED INSIGHTS ──────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'pagespeed',
      description: `OBRIGATORIO quando o usuario pedir: velocidade, speed, performance, nota do site, tempo de carregamento, lighthouse, pagespeed ou core web vitals. Consulta o Google PageSpeed Insights REAL para obter scores de 0-100 de Performance, Acessibilidade, SEO e Boas Praticas + Core Web Vitals (LCP, FCP, TBT, CLS, Speed Index). NUNCA use execute_node com http.request para medir velocidade — isso mede latencia de rede, NAO performance real.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL completa do site/pagina a analisar' },
          strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Estrategia de analise. Padrao: mobile' },
          categories: { type: 'string', description: 'Categorias separadas por virgula. Padrao: performance,accessibility,seo,best-practices' }
        },
        required: ['url']
      }
    }
  },
  // ── GOOGLE SEARCH ─────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'google_search',
      description: `Busca no Google e retorna resultados organicos (titulo, URL, snippet).
OBRIGATORIO para: pesquisar na web, buscar informacoes externas, prospectar leads, investigar empresas/pessoas, comparar concorrentes.
NAO usa API paga — scraping direto.

Parametros:
- query: termos de busca (aceita operadores Google: site:, intitle:, "frase exata", -excluir)
- num_results: quantidade de resultados (padrao: 10, max: 30)
- lang: idioma (padrao: pt-BR)
- country: pais (padrao: BR)

Exemplos:
- "médicos dermatologistas Garopaba SC"
- "site:linkedin.com CEO empresa X"
- "\"clinica odontologica\" Florianopolis telefone"`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca no Google. Aceita operadores: site:, intitle:, "frase", -excluir' },
          num_results: { type: 'number', description: 'Quantidade de resultados a retornar. Padrao: 10, Max: 30' },
          lang: { type: 'string', description: 'Idioma dos resultados. Padrao: pt-BR' },
          country: { type: 'string', description: 'Pais para resultados locais. Padrao: BR' }
        },
        required: ['query']
      }
    }
  },
  // ── MAPS SEARCH ───────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'maps_search',
      description: `Busca negocios/estabelecimentos no Google Maps por categoria + localizacao.
OBRIGATORIO para: prospectar leads locais, encontrar empresas por cidade/bairro, buscar telefones e enderecos de negocios.
NAO usa API paga — scraping direto.

Retorna para cada resultado: nome, endereco, telefone, rating, reviews, categoria, website.

Exemplos:
- query: "dentistas", location: "Garopaba SC"
- query: "restaurantes italianos", location: "Florianopolis centro"
- query: "clinica veterinaria", location: "Porto Alegre RS"`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Tipo de negocio ou categoria. Ex: "dentistas", "restaurantes", "academias"' },
          location: { type: 'string', description: 'Cidade, bairro ou regiao. Ex: "Garopaba SC", "Florianopolis centro"' },
          num_results: { type: 'number', description: 'Quantidade maxima de resultados. Padrao: 20' }
        },
        required: ['query', 'location']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp',
      description: 'Envia mensagem via WhatsApp (Evolution API). Suporta texto e mídia. CONFIRMAR COM USUÁRIO ANTES DE ENVIAR.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'string', description: 'Número com DDI. Ex: 5548999999999' },
          text: { type: 'string', description: 'Texto da mensagem' },
          mediaUrl: { type: 'string', description: 'URL da mídia (imagem, vídeo, documento). Opcional.' },
          mediaType: { type: 'string', enum: ['image', 'video', 'document'], description: 'Tipo da mídia. Obrigatório se mediaUrl fornecido.' },
          caption: { type: 'string', description: 'Legenda da mídia. Opcional.' }
        },
        required: ['number', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Envia email via CRM (SMTP configurado). Para notificações, follow-ups e comunicações com leads.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Email do destinatário' },
          subject: { type: 'string', description: 'Assunto do email' },
          body: { type: 'string', description: 'Corpo do email (texto puro)' },
          html: { type: 'string', description: 'Corpo do email em HTML. Opcional — se fornecido, sobrepõe body.' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_telegram',
      description: 'Envia mensagem via Telegram Bot (Cenorinha). Usa o bot token e chatId do config.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto da mensagem (suporta HTML: <b>, <i>, <code>)' },
          chat_id: { type: 'string', description: 'Chat ID do destinatário. Opcional — usa o padrão do config se omitido.' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'vault_manage',
      description: 'Gerencia credenciais no vault. Ações: list (listar nomes), create (adicionar), update (alterar), delete (remover).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'Ação a executar' },
          name: { type: 'string', description: 'Nome da credencial (obrigatório para create/update/delete)' },
          value: { type: 'string', description: 'Valor da credencial (obrigatório para create/update)' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cyberpanel_site',
      description: 'Gerencia sites no CyberPanel (servidor remoto via SSH). Ações: create (cria site + configura SSL + fixa listener HTTP), list (lista sites), delete (remove site), ssl (emite/reemite SSL).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'list', 'delete', 'ssl'], description: 'Ação: create (novo site+SSL), list (listar sites), delete (remover), ssl (emitir/reemitir SSL)' },
          domain: { type: 'string', description: 'Domínio do site. Ex: meusite.com.br (obrigatório para create/delete/ssl)' },
          email: { type: 'string', description: 'Email do admin do site. Padrão: admin@dominio' },
          php: { type: 'string', description: 'Versão do PHP. Padrão: 8.1. Opções: 7.4, 8.0, 8.1, 8.2, 8.3' },
          package: { type: 'string', description: 'Pacote CyberPanel. Padrão: Default' },
          owner: { type: 'string', description: 'Owner no CyberPanel. Padrão: admin' },
          ssl_method: { type: 'string', enum: ['cyberpanel', 'acme', 'certbot'], description: 'Método SSL. Padrão: cyberpanel (tenta cyberpanel issueSSL, fallback acme.sh)' },
          skip_ssl: { type: 'boolean', description: 'Se true, cria o site sem emitir SSL. Padrão: false' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dns_lookup',
      description: 'Consulta registros DNS de um domínio (A, AAAA, CNAME, MX, TXT, NS, SOA). Verifica propagação e se aponta para o servidor CyberPanel.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio para consultar. Ex: meusite.com.br' },
          type: { type: 'string', description: 'Tipo de registro: A, AAAA, CNAME, MX, TXT, NS, SOA, ALL. Padrão: ALL' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ssl_check',
      description: 'Verifica certificado SSL de um domínio: emissor, validade, dias até expirar, cadeia de certificação e problemas.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio para verificar SSL. Ex: meusite.com.br' },
          port: { type: 'number', description: 'Porta HTTPS. Padrão: 443' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'db_query',
      description: 'Executa query SQL no MariaDB do servidor CyberPanel via SSH. Suporta SELECT, SHOW, DESCRIBE. Queries destrutivas (DROP, DELETE, TRUNCATE) requerem confirm=true.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query SQL. Ex: "SHOW DATABASES", "SELECT * FROM wp_posts LIMIT 5"' },
          database: { type: 'string', description: 'Nome do banco de dados. Obrigatório para SELECT/DESCRIBE.' },
          confirm: { type: 'boolean', description: 'Obrigatório true para queries destrutivas (DROP, DELETE, TRUNCATE, ALTER, UPDATE, INSERT). Padrão: false' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'docker_manage',
      description: 'Gerencia containers Docker no servidor CyberPanel via SSH. Ações: list (ps), start, stop, restart, logs, images, stats.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'start', 'stop', 'restart', 'logs', 'images', 'stats', 'inspect'], description: 'Ação a executar' },
          container: { type: 'string', description: 'Nome ou ID do container (obrigatório para start/stop/restart/logs/inspect)' },
          tail: { type: 'number', description: 'Número de linhas de log. Padrão: 100. Usado com action=logs' },
          all: { type: 'boolean', description: 'Incluir containers parados no list. Padrão: false' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_analyzer',
      description: 'Analisa logs do OpenLiteSpeed no servidor CyberPanel via SSH. Mostra erros, top IPs, top paths, status codes e últimas linhas.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio do site para analisar logs. Ex: meusite.com.br' },
          log_type: { type: 'string', enum: ['access', 'error', 'both'], description: 'Tipo de log. Padrão: both' },
          lines: { type: 'number', description: 'Número de linhas recentes. Padrão: 200' },
          filter: { type: 'string', description: 'Filtro grep opcional. Ex: "404", "500", "POST"' },
          analysis: { type: 'string', enum: ['raw', 'summary', 'top_ips', 'top_paths', 'status_codes', 'errors'], description: 'Tipo de análise. Padrão: summary' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'whois_lookup',
      description: 'Consulta WHOIS de um domínio: registrador, datas de criação/expiração, nameservers, status e dados do registrante.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio para consultar. Ex: meusite.com.br' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'text_utils',
      description: 'Utilitários de texto: base64 encode/decode, MD5/SHA256 hash, URL encode/decode, slugify, JWT decode, UUID generate, contagem de caracteres/palavras.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['base64_encode', 'base64_decode', 'md5', 'sha256', 'url_encode', 'url_decode', 'slugify', 'jwt_decode', 'uuid', 'count', 'json_minify', 'json_prettify'], description: 'Operação a executar' },
          text: { type: 'string', description: 'Texto de entrada (obrigatório exceto para uuid)' }
        },
        required: ['action']
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
      name: 'data_transform',
      description: 'ETL de dados: converte entre CSV/Excel/JSON, filtra, ordena, deduplica, normaliza telefones/emails. Usa pandas.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['convert', 'preview', 'stats', 'filter', 'deduplicate', 'normalize_phones', 'normalize_emails'], description: 'Ação a executar' },
          input: { type: 'string', description: 'Caminho do arquivo de entrada (CSV, Excel, JSON)' },
          output: { type: 'string', description: 'Caminho de saída (extensão define formato: .csv, .xlsx, .json, .tsv)' },
          columns: { type: 'string', description: 'Colunas separadas por vírgula. Ex: "nome,email,telefone"' },
          filter: { type: 'string', description: 'Expressão pandas query. Ex: "idade > 18 and cidade == \'SP\'"' },
          sort: { type: 'string', description: 'Coluna para ordenar. Prefixo - para desc. Ex: "-data"' },
          rename: { type: 'object', description: 'Renomear colunas. Ex: {"Name": "nome", "Phone": "telefone"}' },
          limit: { type: 'number', description: 'Limitar número de linhas' },
          data: { type: 'array', description: 'Lista de valores para normalize_phones/normalize_emails' },
          separator: { type: 'string', description: 'Separador do CSV. Padrão: ","' }
        },
        required: ['action']
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
      name: 'html_to_pdf',
      description: 'Converte HTML (arquivo local ou URL) para PDF via Playwright (headless Chromium). Suporta CSS, JS, imagens.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Caminho do arquivo HTML local' },
          url: { type: 'string', description: 'URL para converter (alternativa ao input)' },
          output: { type: 'string', description: 'Caminho do PDF de saída' },
          format: { type: 'string', description: 'Tamanho da página: A4, A3, Letter, Legal. Padrão: A4' },
          landscape: { type: 'boolean', description: 'Orientação paisagem. Padrão: false' },
          margin: { type: 'string', description: 'Margens. Padrão: "1cm"' },
          scale: { type: 'number', description: 'Escala (0.1-2.0). Padrão: 1.0' },
          print_background: { type: 'boolean', description: 'Incluir backgrounds CSS. Padrão: true' },
          wait: { type: 'number', description: 'Tempo de espera em ms após carregar. Padrão: 2000' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'contact_validator',
      description: 'Valida e normaliza telefones (BR/intl) e emails. Suporta validação individual, batch e arquivo CSV/Excel.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['validate_phone', 'validate_email', 'validate_batch', 'validate_file'], description: 'Ação: validate_phone, validate_email, validate_batch, validate_file' },
          phone: { type: 'string', description: 'Telefone para validar (validate_phone)' },
          email: { type: 'string', description: 'Email para validar (validate_email)' },
          phones: { type: 'array', description: 'Lista de telefones (validate_batch)' },
          emails: { type: 'array', description: 'Lista de emails (validate_batch)' },
          input: { type: 'string', description: 'Arquivo CSV/Excel (validate_file)' },
          phone_column: { type: 'string', description: 'Nome da coluna de telefone no arquivo' },
          email_column: { type: 'string', description: 'Nome da coluna de email no arquivo' },
          output: { type: 'string', description: 'Arquivo de saída com validação (validate_file)' },
          country: { type: 'string', description: 'Código do país. Padrão: BR' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'whatsapp_contacts',
      description: 'Lista e busca contatos e grupos do WhatsApp via Evolution API (instância cenora). Ações: contacts (listar/buscar contatos), groups (listar/buscar grupos), chats (listar conversas recentes).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['contacts', 'groups', 'chats', 'group_info'], description: 'Ação: contacts (buscar contatos), groups (listar grupos), chats (conversas recentes), group_info (detalhes de um grupo)' },
          search: { type: 'string', description: 'Termo de busca (nome, número ou parte). Filtra resultados localmente.' },
          limit: { type: 'number', description: 'Máximo de resultados. Padrão: 50' },
          group_jid: { type: 'string', description: 'JID do grupo para group_info. Ex: "123456789@g.us"' }
        },
        required: ['action']
      }
    }
  }
];

/**
 * Faz uma requisição HTTP e retorna Promise<string>
 */
function httpRequest(opts, bodyBuf) {
  return new Promise((resolve) => {
    const isHttps = opts.protocol === 'https:' || (opts.hostname || '').startsWith('https');
    const lib = (opts.port === 443 || opts._isHttps) ? https : http;

    const req = lib.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
        resolve(`HTTP ${res.statusCode}\n${truncated}`);
      });
    });
    req.on('error', e => resolve(`Erro HTTP: ${e.message}`));
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

/**
 * Emite SSL para um domínio no CyberPanel via SSH
 * Tenta cyberpanel issueSSL primeiro, fallback para acme.sh, depois certbot
 *
 * Lições aprendidas da KB:
 * - cyberpanel issueSSL emite cert autoassinado se DNS não propagou
 * - LiteSpeed watchdog reinicia automaticamente e impede certbot --standalone
 * - acme.sh disponível no servidor como alternativa ao certbot
 * - .htaccess com regex ^. bloqueia .well-known e quebra ACME challenge
 */
async function cyberpanelIssueSSL(sshExec, domain, method = 'cyberpanel') {
  const results = [];

  // Garantir que .htaccess não bloqueia .well-known
  try {
    const htaccess = sshExec(`cat /home/${domain}/public_html/.htaccess 2>/dev/null || echo "NO_HTACCESS"`);
    if (htaccess !== 'NO_HTACCESS' && htaccess.includes('^\\.')) {
      sshExec(`sed -i '/^\\./{/well-known/!s/^/#/}' /home/${domain}/public_html/.htaccess`);
      results.push('[SSL PRE] .htaccess corrigido (regex ^. comentada)');
    }
  } catch (_) {}

  if (method === 'cyberpanel' || method === 'acme') {
    // Método 1: CyberPanel issueSSL (usa acme.sh internamente nas versões recentes)
    if (method === 'cyberpanel') {
      try {
        const issueResult = sshExec(`cyberpanel issueSSL --domainName ${domain}`, 120000);
        results.push(`[SSL CYBERPANEL] ${issueResult}`);

        // Verificar se o certificado emitido é autoassinado
        const certCheck = sshExec(`echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null || echo "CERT_CHECK_FAILED"`);
        if (certCheck.includes("Let's Encrypt") || certCheck.includes('ZeroSSL') || certCheck.includes('R3') || certCheck.includes('R10') || certCheck.includes('R11')) {
          results.push('[SSL VERIFY] Certificado válido emitido');
          sshExec('/usr/local/lsws/bin/lswsctrl restart');
          return results.join('\n');
        } else {
          results.push(`[SSL VERIFY] Certificado pode ser autoassinado (${certCheck}). Tentando acme.sh...`);
        }
      } catch (e) {
        results.push(`[SSL CYBERPANEL] Falhou: ${e.message}. Tentando acme.sh...`);
      }
    }

    // Método 2: acme.sh (fallback ou direto se method=acme)
    try {
      // Verificar se acme.sh existe
      sshExec('which acme.sh || ls /root/.acme.sh/acme.sh');

      // Emitir com webroot (não precisa parar LiteSpeed)
      const acmeCmd = `/root/.acme.sh/acme.sh --issue -d ${domain} -w /home/${domain}/public_html --server letsencrypt --force 2>&1`;
      const acmeResult = sshExec(acmeCmd, 180000);
      results.push(`[SSL ACME.SH] ${acmeResult.slice(0, 2000)}`);

      // Instalar certificado nos caminhos do CyberPanel/OLS
      const installCmd = `/root/.acme.sh/acme.sh --install-cert -d ${domain} --key-file /etc/letsencrypt/live/${domain}/privkey.pem --fullchain-file /etc/letsencrypt/live/${domain}/fullchain.pem --reloadcmd "/usr/local/lsws/bin/lswsctrl restart" 2>&1`;
      sshExec(`mkdir -p /etc/letsencrypt/live/${domain}`);
      const installResult = sshExec(installCmd, 60000);
      results.push(`[SSL INSTALL] ${installResult.slice(0, 1000)}`);

      // Atualizar vhost.conf para apontar para os certificados corretos
      try {
        const vhostConf = `/usr/local/lsws/conf/vhosts/${domain}/vhost.conf`;
        sshExec(`grep -q 'vhssl' ${vhostConf} && sed -i "s|keyFile.*|keyFile /etc/letsencrypt/live/${domain}/privkey.pem|" ${vhostConf} && sed -i "s|certFile.*|certFile /etc/letsencrypt/live/${domain}/fullchain.pem|" ${vhostConf}`);
        results.push('[SSL VHOST] vhost.conf atualizado com caminhos dos certificados');
      } catch (_) {
        results.push('[SSL VHOST] Aviso: não foi possível atualizar vhost.conf automaticamente');
      }

      sshExec('/usr/local/lsws/bin/lswsctrl restart');
      results.push('[SSL OK] SSL emitido e instalado com sucesso via acme.sh');
      return results.join('\n');
    } catch (e) {
      results.push(`[SSL ACME.SH] Falhou: ${(e.stderr || e.message).slice(0, 500)}`);
    }
  }

  // Método 3: certbot webroot (último fallback)
  if (method === 'certbot' || results.some(r => r.includes('Falhou'))) {
    try {
      const certbotCmd = `certbot certonly --webroot -w /home/${domain}/public_html -d ${domain} --non-interactive --agree-tos --email admin@${domain} 2>&1`;
      const certbotResult = sshExec(certbotCmd, 180000);
      results.push(`[SSL CERTBOT] ${certbotResult.slice(0, 2000)}`);

      // Atualizar vhost.conf
      try {
        const vhostConf = `/usr/local/lsws/conf/vhosts/${domain}/vhost.conf`;
        sshExec(`sed -i "s|keyFile.*|keyFile /etc/letsencrypt/live/${domain}/privkey.pem|" ${vhostConf} && sed -i "s|certFile.*|certFile /etc/letsencrypt/live/${domain}/fullchain.pem|" ${vhostConf}`);
      } catch (_) {}

      sshExec('/usr/local/lsws/bin/lswsctrl restart');
      results.push('[SSL OK] SSL emitido via certbot');
      return results.join('\n');
    } catch (e) {
      results.push(`[SSL CERTBOT] Falhou: ${(e.stderr || e.message).slice(0, 500)}`);
    }
  }

  results.push('[SSL] Todos os métodos falharam. Verifique se o DNS do domínio aponta para o servidor (46.202.149.24)');
  return results.join('\n');
}

/**
 * Executa uma ferramenta e retorna o resultado como string
 */
async function executeTool(toolName, toolArgs, credentialVault) {
  switch (toolName) {

    case 'get_credential': {
      try {
        const allCreds = credentialVault.getAll();
        const cred = allCreds.find(c => c.name === toolArgs.name);
        if (!cred) return `Credencial "${toolArgs.name}" não encontrada. Disponíveis: ${allCreds.map(c => c.name).join(', ')}`;
        const value = credentialVault.reveal(cred.id);
        return value ? value.value || value : `Credencial "${toolArgs.name}" está vazia`;
      } catch (e) {
        return `Erro ao obter credencial: ${e.message}`;
      }
    }

    case 'call_crm': {
      return new Promise((resolve) => {
        const { endpoint, method = 'GET', body, query } = toolArgs;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

        // Suporta query como string ("limit=100&page=1") ou objeto ({limit:100,page:1})
        let queryStr = '';
        if (query) {
          if (typeof query === 'string') {
            queryStr = '?' + query;
          } else if (typeof query === 'object') {
            queryStr = '?' + new URLSearchParams(query).toString();
          }
        }

        // encodeURI garante que o path não tenha caracteres inválidos (Node http rejeita)
        const rawPath = `/api/crm${cleanEndpoint}${queryStr}`;
        const fullPath = encodeURI(rawPath).replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%26/g, '&').replace(/%3F/g, '?');
        const bodyBuf = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;

        const crmUrl = new URL(CRM_BASE);
        const opts = {
          hostname: crmUrl.hostname,
          port: parseInt(crmUrl.port) || 80,
          path: fullPath,
          method: method.toUpperCase(),
          headers: {
            'Authorization': `Bearer ${CRM_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
            ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {})
          }
        };

        const req = http.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
            resolve(`HTTP ${res.statusCode}\n${truncated}`);
          });
        });
        req.setTimeout(15000, () => { req.destroy(); resolve('Erro CRM: timeout de 15s excedido'); });
        req.on('error', e => resolve(`Erro CRM: ${e.message}`));
        if (bodyBuf) req.write(bodyBuf);
        req.end();
      });
    }

    case 'fetch_api': {
      return new Promise((resolve) => {
        const { url, method = 'GET', headers = {}, body } = toolArgs;
        let urlObj;
        try {
          urlObj = new URL(url);
        } catch (e) {
          return resolve(`URL inválida: ${url}`);
        }
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        const bodyBuf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8') : null;
        const opts = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {})
          }
        };
        const req = lib.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            const truncated = data.length > 8000 ? data.substring(0, 8000) + '\n...[truncado]' : data;
            resolve(`HTTP ${res.statusCode}\n${truncated}`);
          });
        });
        req.setTimeout(15000, () => { req.destroy(); resolve('Erro HTTP: timeout de 15s excedido'); });
        req.on('error', e => resolve(`Erro HTTP: ${e.message}`));
        if (bodyBuf) req.write(bodyBuf);
        req.end();
      });
    }

    case 'search_kb': {
      try {
        const kbPath = path.join(__dirname, '..', 'knowledge-base', 'knowledge-search.js');
        if (!fs.existsSync(kbPath)) return 'Knowledge base não encontrada';
        const result = execSync(`node "${kbPath}" "${toolArgs.query.replace(/"/g, '\\"')}"`, {
          cwd: path.dirname(kbPath),
          timeout: 30000,
          encoding: 'utf8'
        });
        return result.substring(0, 6000) || 'Nenhum resultado encontrado';
      } catch (e) {
        return `Erro ao buscar KB: ${e.message}`;
      }
    }

    case 'read_file': {
      try {
        let filePath = toolArgs.path || '';
        // Normalizar URL file:// para caminho absoluto
        if (filePath.startsWith('file:///')) {
          filePath = filePath.slice(8); // remove 'file:///'
          // No Windows: file:///C:/... → C:/...
          // No Unix: file:///home/... → /home/...
          if (!filePath.startsWith('/')) {
            // Windows path: já está correto (C:/...)
          } else {
            filePath = '/' + filePath;
          }
        } else if (filePath.startsWith('file://')) {
          filePath = filePath.slice(7);
        }
        if (!fs.existsSync(filePath)) return `Arquivo não encontrado: ${filePath}`;
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) return `O caminho é um diretório, não um arquivo: ${filePath}`;
        const maxBytes = toolArgs.maxBytes || 50000;
        const encoding = toolArgs.encoding || 'utf8';
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(Math.min(maxBytes, stat.size));
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const content = buf.toString(encoding);
        const truncated = stat.size > maxBytes ? content + `\n...[truncado — arquivo tem ${stat.size} bytes, lido ${maxBytes}]` : content;
        return truncated;
      } catch (e) {
        return `Erro ao ler arquivo: ${e.message}`;
      }
    }

    case 'write_file': {
      try {
        let filePath = toolArgs.path || '';
        if (!filePath) return 'Parâmetro "path" é obrigatório';
        const content = toolArgs.content ?? '';
        const encoding = toolArgs.encoding || 'utf8';
        const append = toolArgs.append === true;
        // Criar diretório pai se não existir
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const flag = append ? 'a' : 'w';
        fs.writeFileSync(filePath, content, { encoding, flag });
        const stat = fs.statSync(filePath);
        return `Arquivo ${append ? 'atualizado' : 'escrito'} com sucesso: ${filePath} (${stat.size} bytes)`;
      } catch (e) {
        return `Erro ao escrever arquivo: ${e.message}`;
      }
    }

    case 'list_directory': {
      try {
        const dirPath = toolArgs.path || '';
        if (!dirPath) return 'Parâmetro "path" é obrigatório';
        if (!fs.existsSync(dirPath)) return `Diretório não encontrado: ${dirPath}`;
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) return `O caminho não é um diretório: ${dirPath}`;
        const recursive = toolArgs.recursive === true;
        const filter = toolArgs.filter || null;

        function listDir(dirP, depth = 0) {
          const entries = fs.readdirSync(dirP, { withFileTypes: true });
          const result = [];
          for (const entry of entries) {
            const full = path.join(dirP, entry.name);
            const isDir = entry.isDirectory();
            if (filter && !isDir && !entry.name.endsWith(filter)) continue;
            let size = '';
            let mtime = '';
            try {
              const s = fs.statSync(full);
              size = isDir ? '' : `${s.size}B`;
              mtime = s.mtime.toISOString().slice(0, 16).replace('T', ' ');
            } catch (_) {}
            result.push(`${'  '.repeat(depth)}${isDir ? '[DIR]' : '[FILE]'} ${entry.name}${size ? ' (' + size + ')' : ''} ${mtime}`);
            if (recursive && isDir && depth < 5) {
              result.push(...listDir(full, depth + 1));
            }
          }
          return result;
        }

        const lines = listDir(dirPath);
        if (lines.length === 0) return `Diretório vazio: ${dirPath}`;
        return `${dirPath} (${lines.length} itens):\n` + lines.join('\n');
      } catch (e) {
        return `Erro ao listar diretório: ${e.message}`;
      }
    }

    case 'delete_file': {
      try {
        const filePath = toolArgs.path || '';
        if (!filePath) return 'Parâmetro "path" é obrigatório';
        if (!fs.existsSync(filePath)) return `Arquivo/diretório não encontrado: ${filePath}`;
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (toolArgs.force === true) {
            fs.rmSync(filePath, { recursive: true, force: true });
            return `Diretório deletado recursivamente: ${filePath}`;
          } else {
            const entries = fs.readdirSync(filePath);
            if (entries.length > 0) return `Diretório não está vazio (${entries.length} itens). Use force: true para deletar com conteúdo.`;
            fs.rmdirSync(filePath);
            return `Diretório vazio deletado: ${filePath}`;
          }
        } else {
          fs.unlinkSync(filePath);
          return `Arquivo deletado: ${filePath}`;
        }
      } catch (e) {
        return `Erro ao deletar: ${e.message}`;
      }
    }

    case 'move_file': {
      try {
        const src = toolArgs.source || '';
        const dst = toolArgs.destination || '';
        if (!src) return 'Parâmetro "source" é obrigatório';
        if (!dst) return 'Parâmetro "destination" é obrigatório';
        if (!fs.existsSync(src)) return `Origem não encontrada: ${src}`;
        if (fs.existsSync(dst) && toolArgs.overwrite !== true) {
          return `Destino já existe: ${dst}. Use overwrite: true para sobrescrever.`;
        }
        // Criar diretório pai do destino se não existir
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        fs.renameSync(src, dst);
        return `Movido/renomeado: ${src} → ${dst}`;
      } catch (e) {
        return `Erro ao mover arquivo: ${e.message}`;
      }
    }

    case 'file_info': {
      try {
        const filePath = toolArgs.path || '';
        if (!filePath) return 'Parâmetro "path" é obrigatório';
        if (!fs.existsSync(filePath)) return `Caminho não encontrado: ${filePath}`;
        const stat = fs.statSync(filePath);
        const isDir = stat.isDirectory();
        const ext = isDir ? '(diretório)' : path.extname(filePath) || '(sem extensão)';
        const info = {
          path: filePath,
          type: isDir ? 'directory' : 'file',
          extension: ext,
          size: stat.size,
          sizeHuman: stat.size < 1024 ? `${stat.size}B` : stat.size < 1048576 ? `${(stat.size/1024).toFixed(1)}KB` : `${(stat.size/1048576).toFixed(2)}MB`,
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
          accessed: stat.atime.toISOString(),
          readonly: !(stat.mode & 0o200)
        };
        if (isDir) {
          try {
            const entries = fs.readdirSync(filePath);
            info.childCount = entries.length;
          } catch (_) {}
        }
        return JSON.stringify(info, null, 2);
      } catch (e) {
        return `Erro ao obter info do arquivo: ${e.message}`;
      }
    }

    case 'run_command': {
      try {
        let cmd = toolArgs.command || '';
        if (!cmd) return 'Parâmetro "command" é obrigatório';

        // Expandir ~ para o home dir real (PowerShell/Node não expandem ~ automaticamente)
        const homeDir = os.homedir().replace(/\\/g, '/');
        cmd = cmd.replace(/^~\//, homeDir + '/').replace(/^~\\/, homeDir + '\\');

        const cwd = toolArgs.cwd || __dirname;
        const timeoutSec = Math.min(toolArgs.timeout || 30, 300);
        const isWindows = process.platform === 'win32';

        let shellCmd, shellArgs;
        const shellPref = toolArgs.shell || 'auto';
        if (shellPref === 'powershell' || (shellPref === 'auto' && isWindows)) {
          shellCmd = 'powershell';
          shellArgs = ['-NoProfile', '-NonInteractive', '-Command', cmd];
        } else if (shellPref === 'cmd') {
          // Remover prefixo 'cmd /c' redundante se já presente no comando
          const stripped = cmd.replace(/^cmd\s+\/c\s+/i, '');
          shellCmd = 'cmd';
          shellArgs = ['/c', stripped];
        } else {
          shellCmd = 'bash';
          shellArgs = ['-c', cmd];
        }

        const { execFileSync } = require('child_process');
        const result = execFileSync(shellCmd, shellArgs, {
          cwd,
          timeout: timeoutSec * 1000,
          encoding: 'utf8',
          maxBuffer: 2 * 1024 * 1024
        });
        const out = result || '(comando executado sem output)';
        return out.length > 8000 ? out.slice(0, 8000) + '\n...[truncado]' : out;
      } catch (e) {
        const stdout = e.stdout ? `\nSTDOUT: ${e.stdout.slice(0, 3000)}` : '';
        const stderr = e.stderr ? `\nSTDERR: ${e.stderr.slice(0, 3000)}` : '';
        return `Erro (exit ${e.status ?? '?'}): ${e.message}${stdout}${stderr}`;
      }
    }

    case 'git': {
      try {
        const action = toolArgs.action || '';
        const args = toolArgs.args || '';
        const cwd = toolArgs.cwd || __dirname;
        if (!action) return 'Parâmetro "action" é obrigatório';
        const gitCmd = `git ${action}${args ? ' ' + args : ''}`;
        const result = execSync(gitCmd, {
          cwd,
          timeout: 60000,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024
        });
        return result.trim() || `(git ${action} executado sem output)`;
      } catch (e) {
        return `Erro git: ${e.message}\n${e.stderr || ''}`.slice(0, 4000);
      }
    }

    case 'search_in_files': {
      try {
        const pattern = toolArgs.pattern || '';
        const searchPath = toolArgs.path || '';
        if (!pattern) return 'Parâmetro "pattern" é obrigatório';
        if (!searchPath) return 'Parâmetro "path" é obrigatório';
        if (!fs.existsSync(searchPath)) return `Caminho não encontrado: ${searchPath}`;

        const recursive = toolArgs.recursive !== false;
        const fileFilter = toolArgs.fileFilter || null;
        const caseSensitive = toolArgs.caseSensitive === true;
        const maxResults = toolArgs.maxResults || 50;
        const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');

        const TEXT_EXTS = new Set(['.js','.ts','.jsx','.tsx','.mjs','.cjs','.json','.html','.htm','.css','.scss','.less','.md','.txt','.py','.php','.rb','.go','.rs','.java','.cs','.cpp','.c','.h','.sh','.bash','.ps1','.yaml','.yml','.toml','.ini','.env','.xml','.svg','.vue','.liquid','.njk','.ejs']);

        const results = [];

        function searchFile(filePath) {
          if (results.length >= maxResults) return;
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              if (results.length >= maxResults) return;
              regex.lastIndex = 0;
              if (regex.test(line)) {
                results.push(`${filePath}:${i + 1}: ${line.trimEnd().slice(0, 200)}`);
              }
            });
          } catch (_) {}
        }

        function walk(dirPath) {
          if (results.length >= maxResults) return;
          let entries;
          try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch (_) { return; }
          for (const entry of entries) {
            if (results.length >= maxResults) break;
            const full = path.join(dirPath, entry.name);
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            if (entry.isDirectory() && recursive) { walk(full); continue; }
            if (!entry.isFile()) continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (fileFilter && ext !== fileFilter) continue;
            if (!fileFilter && !TEXT_EXTS.has(ext)) continue;
            searchFile(full);
          }
        }

        const stat = fs.statSync(searchPath);
        if (stat.isDirectory()) {
          walk(searchPath);
        } else {
          searchFile(searchPath);
        }

        if (results.length === 0) return `Nenhum resultado para "${pattern}" em ${searchPath}`;
        const header = `${results.length} resultado(s)${results.length >= maxResults ? ' (limite atingido)' : ''} para "${pattern}":\n`;
        return header + results.join('\n');
      } catch (e) {
        return `Erro na busca: ${e.message}`;
      }
    }

    case 'find_files': {
      try {
        const searchPath = toolArgs.path || '';
        const pattern = toolArgs.pattern || '*';
        if (!searchPath) return 'Parâmetro "path" é obrigatório';
        if (!fs.existsSync(searchPath)) return `Diretório não encontrado: ${searchPath}`;

        const recursive = toolArgs.recursive !== false;
        const maxResults = toolArgs.maxResults || 100;
        const results = [];

        // Converte glob simples (* e ?) para regex
        function globToRegex(glob) {
          const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
          return new RegExp(`^${escaped}$`, 'i');
        }
        const re = globToRegex(pattern);

        function walk(dirPath, depth = 0) {
          if (results.length >= maxResults) return;
          let entries;
          try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch (_) { return; }
          for (const entry of entries) {
            if (results.length >= maxResults) break;
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            const full = path.join(dirPath, entry.name);
            if (re.test(entry.name)) {
              try {
                const s = fs.statSync(full);
                results.push(`${full} (${entry.isDirectory() ? 'DIR' : s.size + 'B'})`);
              } catch (_) { results.push(full); }
            }
            if (entry.isDirectory() && recursive && depth < 8) walk(full, depth + 1);
          }
        }

        walk(searchPath);
        if (results.length === 0) return `Nenhum arquivo encontrado com padrão "${pattern}" em ${searchPath}`;
        return `${results.length} arquivo(s) encontrado(s)${results.length >= maxResults ? ' (limite atingido)' : ''}:\n` + results.join('\n');
      } catch (e) {
        return `Erro ao buscar arquivos: ${e.message}`;
      }
    }

    case 'process_manager': {
      try {
        const action = toolArgs.action || '';
        const isWindows = process.platform === 'win32';

        if (action === 'list') {
          // Listar processos dev relevantes
          const cmd = isWindows
            ? 'powershell -NoProfile -Command "Get-Process | Where-Object {$_.Name -match \'node|python|java|ruby|php|nginx|apache|docker\'} | Select-Object Id,Name,CPU,WorkingSet | Format-Table -AutoSize | Out-String -Width 200"'
            : 'ps aux | grep -E "node|python|java|ruby|php|nginx|apache|docker" | grep -v grep';
          const result = execSync(cmd, { timeout: 15000, encoding: 'utf8' });
          return result.trim() || 'Nenhum processo dev encontrado';
        }

        if (action === 'kill') {
          const pid = toolArgs.pid;
          if (!pid) return 'Parâmetro "pid" é obrigatório para action: kill';
          const cmd = isWindows
            ? `powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`
            : `kill -9 ${pid}`;
          execSync(cmd, { timeout: 10000, encoding: 'utf8' });
          return `Processo PID ${pid} encerrado com sucesso`;
        }

        if (action === 'port_info') {
          const port = toolArgs.port;
          if (!port) return 'Parâmetro "port" é obrigatório para action: port_info';
          const cmd = isWindows
            ? `netstat -ano | findstr ":${port}"`
            : `lsof -i :${port} -n -P 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":${port}"`;
          try {
            const result = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
            return result.trim() || `Nenhum processo na porta ${port}`;
          } catch (_) {
            return `Nenhum processo encontrado na porta ${port}`;
          }
        }

        if (action === 'find_by_name') {
          const name = toolArgs.name || '';
          if (!name) return 'Parâmetro "name" é obrigatório para action: find_by_name';
          const cmd = isWindows
            ? `powershell -NoProfile -Command "Get-Process | Where-Object {$_.Name -like '*${name}*'} | Select-Object Id,Name,Path | Format-Table -AutoSize | Out-String -Width 200"`
            : `pgrep -la ${name} 2>/dev/null || ps aux | grep ${name} | grep -v grep`;
          try {
            const result = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
            return result.trim() || `Nenhum processo encontrado com nome "${name}"`;
          } catch (_) {
            return `Nenhum processo encontrado com nome "${name}"`;
          }
        }

        return `Action "${action}" não reconhecida. Use: list, kill, port_info, find_by_name`;
      } catch (e) {
        return `Erro process_manager: ${e.message}`;
      }
    }

    case 'diff_files': {
      try {
        const fileA = toolArgs.fileA || '';
        const fileB = toolArgs.fileB || '';
        if (!fileA || !fileB) return 'Parâmetros "fileA" e "fileB" são obrigatórios';
        if (!fs.existsSync(fileA)) return `Arquivo não encontrado: ${fileA}`;
        if (!fs.existsSync(fileB)) return `Arquivo não encontrado: ${fileB}`;

        const linesA = fs.readFileSync(fileA, 'utf8').split('\n');
        const linesB = fs.readFileSync(fileB, 'utf8').split('\n');
        const context = toolArgs.context ?? 3;

        // Diff simples LCS-based
        const output = [];
        output.push(`--- ${fileA}`);
        output.push(`+++ ${fileB}`);

        // Encontrar linhas diferentes com contexto
        const changes = [];
        const maxLen = Math.max(linesA.length, linesB.length);
        for (let i = 0; i < maxLen; i++) {
          const a = linesA[i] ?? null;
          const b = linesB[i] ?? null;
          if (a !== b) changes.push(i);
        }

        if (changes.length === 0) return `Arquivos idênticos: ${fileA} e ${fileB}`;

        // Agrupar mudanças com contexto
        const groups = [];
        let group = null;
        for (const idx of changes) {
          const start = Math.max(0, idx - context);
          const end = Math.min(maxLen - 1, idx + context);
          if (!group || start > group.end + 1) {
            if (group) groups.push(group);
            group = { start, end, changes: [idx] };
          } else {
            group.end = end;
            group.changes.push(idx);
          }
        }
        if (group) groups.push(group);

        for (const g of groups) {
          output.push(`@@ linhas ${g.start + 1}-${g.end + 1} @@`);
          for (let i = g.start; i <= g.end; i++) {
            const a = linesA[i] ?? null;
            const b = linesB[i] ?? null;
            if (a === b) {
              output.push(` ${a ?? ''}`);
            } else {
              if (a !== null) output.push(`-${a}`);
              if (b !== null) output.push(`+${b}`);
            }
          }
        }

        const result = output.join('\n');
        return result.length > 8000 ? result.slice(0, 8000) + '\n...[truncado]' : result;
      } catch (e) {
        return `Erro ao comparar arquivos: ${e.message}`;
      }
    }

    case 'open_url': {
      try {
        const url = toolArgs.url || '';
        if (!url) return 'Parâmetro "url" é obrigatório';
        const isWindows = process.platform === 'win32';
        const isMac = process.platform === 'darwin';

        let cmd;
        if (isWindows) {
          // No Windows, Start-Process funciona com URLs e arquivos
          const escaped = url.replace(/'/g, "''");
          cmd = `powershell -NoProfile -Command "Start-Process '${escaped}'"`;
        } else if (isMac) {
          cmd = `open "${url}"`;
        } else {
          cmd = `xdg-open "${url}"`;
        }

        execSync(cmd, { timeout: 10000, encoding: 'utf8' });
        return `Aberto no navegador/programa padrão: ${url}`;
      } catch (e) {
        return `Erro ao abrir URL: ${e.message}`;
      }
    }

    case 'scrape_website': {
      try {
        const targetUrl = toolArgs.url || '';
        if (!targetUrl) return 'Parâmetro "url" é obrigatório';

        // Fetch HTML com suporte a redirects
        const fetchHtml = (url, redirectCount = 0) => new Promise((resolve, reject) => {
          if (redirectCount > 5) return reject(new Error('Muitos redirecionamentos'));
          let urlObj;
          try { urlObj = new URL(url); } catch (e) { return reject(new Error(`URL inválida: ${url}`)); }
          const lib = urlObj.protocol === 'https:' ? https : http;
          const req = lib.request({
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: (urlObj.pathname || '/') + urlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
            }
          }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const next = res.headers.location.startsWith('http')
                ? res.headers.location
                : `${urlObj.protocol}//${urlObj.host}${res.headers.location.startsWith('/') ? '' : '/'}${res.headers.location}`;
              res.resume();
              return resolve(fetchHtml(next, redirectCount + 1));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url, status: res.statusCode }));
          });
          req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout (20s)')); });
          req.on('error', reject);
          req.end();
        });

        const { html, finalUrl, status } = await fetchHtml(targetUrl);
        if (status >= 400) return `Erro HTTP ${status} ao acessar ${targetUrl}`;

        const baseUrl = new URL(finalUrl);
        const baseOrigin = baseUrl.origin;

        // Helper: resolver URL relativa para absoluta
        const resolveUrl = (href) => {
          if (!href) return '';
          if (href.startsWith('http')) return href;
          if (href.startsWith('//')) return baseUrl.protocol + href;
          if (href.startsWith('/')) return baseOrigin + href;
          return baseOrigin + '/' + href;
        };

        // --- 1. TEXTO ---
        const includeText = toolArgs.includeText !== false;
        const maxTextLength = toolArgs.maxTextLength || 5000;
        let textContent = '';
        if (includeText) {
          textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
            .replace(/\s+/g, ' ').trim()
            .substring(0, maxTextLength);
        }

        // --- 2. CORES ---
        const colorCount = {};
        const styleBlocks = [...html.matchAll(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi)].map(m => m[1]);
        const inlineStyles = [...html.matchAll(/style="([^"]{1,500})"/gi)].map(m => m[1]);
        const allCss = [...styleBlocks, ...inlineStyles].join(' ');

        // Hex colors
        const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
        let hm;
        while ((hm = hexPattern.exec(allCss)) !== null) {
          let h = hm[1].toUpperCase();
          if (h.length === 3) h = h.split('').map(c => c + c).join('');
          // Ignorar preto/branco/cinza puro e transparente
          if (['FFFFFF','000000','111111','222222','333333','444444','555555',
               'EEEEEE','DDDDDD','CCCCCC','BBBBBB','AAAAAA','999999','F5F5F5',
               'FAFAFA','E5E5E5','F0F0F0'].includes(h)) continue;
          colorCount[`#${h}`] = (colorCount[`#${h}`] || 0) + 1;
        }
        // RGB/RGBA
        const rgbPattern = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
        let rm;
        while ((rm = rgbPattern.exec(allCss)) !== null) {
          const [r, g, b] = [parseInt(rm[1]), parseInt(rm[2]), parseInt(rm[3])];
          if ((r < 15 && g < 15 && b < 15) || (r > 240 && g > 240 && b > 240)) continue;
          const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
          colorCount[hex] = (colorCount[hex] || 0) + 1;
        }
        const colors = Object.entries(colorCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([color, count]) => ({ color, occurrences: count }));

        // --- 3. LOGOTIPO ---
        const logos = [];
        // og:image
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogImg) logos.push({ type: 'og:image', url: resolveUrl(ogImg[1]) });

        // favicon
        const favicon = html.match(/<link[^>]+rel=["'][^"']*(?:shortcut\s+icon|icon)[^"']*["'][^>]+href=["']([^"']+)["']/i)
          || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
        if (favicon) logos.push({ type: 'favicon', url: resolveUrl(favicon[1]) });

        // apple-touch-icon
        const appleIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
          || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
        if (appleIcon) logos.push({ type: 'apple-touch-icon', url: resolveUrl(appleIcon[1]) });

        // <img> com "logo" no src, alt, class ou id
        const imgTags = [...html.matchAll(/<img[^>]{1,500}>/gi)];
        for (const m of imgTags) {
          const tag = m[0];
          if (!/logo|brand|marca/i.test(tag)) continue;
          const srcM = tag.match(/src=["']([^"']+)["']/i);
          const altM = tag.match(/alt=["']([^"']+)["']/i);
          if (srcM) {
            logos.push({ type: 'img-logo', url: resolveUrl(srcM[1]), alt: altM ? altM[1] : '' });
            if (logos.filter(l => l.type === 'img-logo').length >= 3) break;
          }
        }

        // --- 4. WHATSAPP ---
        const whatsapps = [];
        // wa.me e api.whatsapp.com
        const waLinks = [...html.matchAll(/href=["']https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[/?]?([^"'&\s]*)/gi)];
        for (const m of waLinks) {
          const num = m[1].replace(/[^\d]/g, '');
          if (num.length >= 8 && !whatsapps.includes(num)) whatsapps.push(num);
        }
        // wa.me no texto
        const waText = [...html.matchAll(/wa\.me\/(\d+)/g)];
        for (const m of waText) {
          if (!whatsapps.includes(m[1])) whatsapps.push(m[1]);
        }
        // Números BR (formato +55) próximos à palavra whatsapp
        const waBr = [...html.matchAll(/whatsapp[^<>"]{0,150}?(\+?55\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/gi)];
        for (const m of waBr) {
          const num = m[1].replace(/\D/g, '');
          if (num.length >= 10 && !whatsapps.includes(num)) whatsapps.push(num);
        }
        // data-* com phone perto de whatsapp
        const dataPhone = [...html.matchAll(/data-(?:phone|number|whatsapp)=["'](\+?[\d\s\-()]{8,20})["']/gi)];
        for (const m of dataPhone) {
          const num = m[1].replace(/\D/g, '');
          if (num.length >= 8 && !whatsapps.includes(num)) whatsapps.push(num);
        }

        // --- 5. EMAILS ---
        const emails = [];
        // mailto: links
        const mailtoLinks = [...html.matchAll(/href=["']mailto:([^"'?&#\s]+)/gi)];
        for (const m of mailtoLinks) {
          const email = m[1].toLowerCase().trim();
          if (!emails.includes(email)) emails.push(email);
        }
        // Regex no texto limpo
        const textForEmail = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
        const emailRe = /\b[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,6}\b/g;
        const emailMatches = [...textForEmail.matchAll(emailRe)];
        for (const m of emailMatches) {
          const email = m[0].toLowerCase();
          if (!emails.includes(email) &&
              !email.includes('example') && !email.includes('placeholder') &&
              !email.includes('sentry') && !email.includes('@2x')) {
            emails.push(email);
          }
          if (emails.length >= 10) break;
        }

        // --- 6. TÍTULO E DESCRIÇÃO ---
        const titleM = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
        const title = titleM ? titleM[1].trim() : '';
        const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,500})["']/i)
          || html.match(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']description["']/i);
        const description = descM ? descM[1].trim() : '';

        const result = {
          url: finalUrl,
          title,
          description,
          colors,
          logos,
          whatsapp: whatsapps.slice(0, 5),
          emails: emails.slice(0, 10),
          ...(includeText ? { text: textContent } : {})
        };

        return JSON.stringify(result, null, 2).substring(0, 12000);
      } catch (e) {
        return `Erro ao raspar site: ${e.message}`;
      }
    }

    case 'execute_node': {
      try {
        const tmpFile = path.join(os.tmpdir(), `chat-tool-${Date.now()}.js`);
        fs.writeFileSync(tmpFile, toolArgs.code, 'utf8');
        let stdout = '', stderr = '';
        try {
          stdout = execSync(`node "${tmpFile}" 2>&1`, {
            cwd: __dirname,
            timeout: 30000,
            encoding: 'utf8',
            maxBuffer: 2 * 1024 * 1024,
            // Redirecionar stderr para stdout para capturar tudo
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (e) {
          stdout = e.stdout || '';
          stderr = e.stderr || '';
        }
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
        return combined.substring(0, 6000) || '(script executado sem output — verifique se há console.log no código)';
      } catch (e) {
        return `Erro ao executar Node.js: ${e.message}`;
      }
    }

    case 'generate_image': {
      if (!imageGenerator) {
        return 'image-generator não está disponível. Verifique se chrome-remote-interface está instalado.';
      }
      try {
        const result = await imageGenerator.generateFeedImage(toolArgs);
        return `Imagem gerada com sucesso!\nArquivo: ${result.path}\nURL: ${result.url}\nFilename: ${result.filename}\n\nA imagem está salva em disco e pode ser aberta diretamente.`;
      } catch (e) {
        return `Erro ao gerar imagem: ${e.message}`;
      }
    }

    case 'chrome': {
      if (!chromeTool) {
        return 'chrome-remote-interface não está instalado. Execute: npm install chrome-remote-interface --save no diretório do servidor.';
      }
      const { action, args: chromeArgs = {} } = toolArgs;
      if (!action) return 'Argumento "action" é obrigatório para chrome.';
      try {
        return await chromeTool.executeChromeAction(action, chromeArgs);
      } catch (e) {
        return `Erro chrome: ${e.message}`;
      }
    }

    case 'instagram': {
      const action = toolArgs.action || '';
      const INSTA_BASE = `http://127.0.0.1:${process.env.INSTAGRAM_PORT || 8001}`;

      function instaRequest(method, endpoint, body) {
        return new Promise((resolve) => {
          const url = new URL(INSTA_BASE + endpoint);
          const bodyStr = body ? JSON.stringify(body) : null;
          const opts = {
            hostname: url.hostname,
            port: parseInt(url.port) || 8001,
            path: url.pathname + url.search,
            method: method.toUpperCase(),
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            timeout: 60000,
          };
          if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
          const req = http.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
          });
          req.on('error', e => resolve(JSON.stringify({ ok: false, error: `Servico Instagram indisponivel (porta ${opts.port}): ${e.message}. Inicie em Configuracoes > Instagram ou verifique se o servico esta rodando.` })));
          req.on('timeout', () => { req.destroy(); resolve(JSON.stringify({ ok: false, error: 'Timeout ao conectar ao servico Instagram (60s)' })); });
          if (bodyStr) req.write(bodyStr);
          req.end();
        });
      }

      try {
        let result;
        const amount = toolArgs.amount;
        const username = toolArgs.username || '';

        switch (action) {
          case 'status':
            result = await instaRequest('GET', '/status');
            break;
          case 'feed': {
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/feed${q}`);
            break;
          }
          case 'user': {
            if (!username) return 'Parametro "username" e obrigatorio para action: user';
            const q = toolArgs.posts ? `?posts=${toolArgs.posts}` : '';
            result = await instaRequest('GET', `/user/${encodeURIComponent(username)}${q}`);
            break;
          }
          case 'my_posts': {
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/my/posts${q}`);
            break;
          }
          case 'hashtag': {
            const tag = toolArgs.tag || '';
            if (!tag) return 'Parametro "tag" e obrigatorio para action: hashtag';
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/hashtag/${encodeURIComponent(tag)}${q}`);
            break;
          }
          case 'followers': {
            if (!username) return 'Parametro "username" e obrigatorio para action: followers';
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/followers/${encodeURIComponent(username)}${q}`);
            break;
          }
          case 'following': {
            if (!username) return 'Parametro "username" e obrigatorio para action: following';
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/following/${encodeURIComponent(username)}${q}`);
            break;
          }
          case 'like':
            result = await instaRequest('POST', '/like', { media_id: toolArgs.media_id || '' });
            break;
          case 'unlike':
            result = await instaRequest('POST', '/unlike', { media_id: toolArgs.media_id || '' });
            break;
          case 'comment':
            result = await instaRequest('POST', '/comment', { media_id: toolArgs.media_id || '', text: toolArgs.text || '' });
            break;
          case 'follow':
            if (!username) return 'Parametro "username" e obrigatorio para action: follow';
            result = await instaRequest('POST', '/follow', { username });
            break;
          case 'unfollow':
            if (!username) return 'Parametro "username" e obrigatorio para action: unfollow';
            result = await instaRequest('POST', '/unfollow', { username });
            break;
          case 'dm':
            if (!username) return 'Parametro "username" e obrigatorio para action: dm';
            result = await instaRequest('POST', '/dm', { username, text: toolArgs.text || '' });
            break;
          case 'dm_inbox': {
            const q = amount ? `?amount=${amount}` : '';
            result = await instaRequest('GET', `/dm/inbox${q}`);
            break;
          }
          case 'post_photo':
            result = await instaRequest('POST', '/post/photo', { image_path: toolArgs.image_path || '', caption: toolArgs.caption || '' });
            break;
          case 'post_reel':
            result = await instaRequest('POST', '/post/reel', { video_path: toolArgs.video_path || '', caption: toolArgs.caption || '', thumbnail_path: toolArgs.thumbnail_path || null });
            break;
          case 'story':
            result = await instaRequest('POST', '/story', { image_path: toolArgs.image_path || '' });
            break;
          case 'search_users': {
            const q = encodeURIComponent(toolArgs.query || '');
            result = await instaRequest('GET', `/search/users?q=${q}`);
            break;
          }
          default:
            return `Action "${action}" nao reconhecida. Actions disponíveis: status, feed, user, my_posts, hashtag, followers, following, like, unlike, comment, follow, unfollow, dm, dm_inbox, post_photo, post_reel, story, search_users`;
        }

        return typeof result === 'string' ? result.substring(0, 8000) : JSON.stringify(result).substring(0, 8000);
      } catch (e) {
        return `Erro na ferramenta instagram: ${e.message}`;
      }
    }

    case 'orchestrate': {
      try {
        const { Orchestrator } = require('./orchestrator');
        const agentsConfig = require('./agents-config');

        // Obter API key
        let apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey && credentialVault) {
          try {
            const envVars = credentialVault.getEnvVars ? credentialVault.getEnvVars() : {};
            apiKey = envVars['OPENROUTER_API_KEY'];
          } catch (e) {
            // ignorar erro de vault
          }
        }

        const events = [];
        const orchestrator = new Orchestrator({
          apiKey,
          model: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-sonnet-4-6',
          agentsConfig,
          executeTool: async (name, toolCallArgs) => executeTool(name, toolCallArgs, credentialVault),
          credentialVault,
          sendEvent: (evt) => events.push(evt)
        });

        const instruction = toolArgs.instruction || toolArgs.task || '';
        if (!instruction) {
          return JSON.stringify({ ok: false, error: 'Parametro "instruction" e obrigatorio' });
        }

        const result = await orchestrator.run(instruction);
        return JSON.stringify({ ok: true, result, events: events.slice(-10) });
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro ao orquestrar: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PDF READER
    // ══════════════════════════════════════════════════════════════════════════
    case 'pdf_reader': {
      const filePath = toolArgs.file_path || '';
      if (!filePath) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio' });

      const fs = require('fs');
      if (!fs.existsSync(filePath)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${filePath}` });

      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        const maxChars = toolArgs.max_chars || 10000;
        let text = data.text || '';

        // Filtrar por paginas se solicitado
        const pagesArg = toolArgs.pages || 'all';
        if (pagesArg !== 'all' && data.text) {
          // pdf-parse nao suporta paginas individuais nativamente, retorna texto completo
          // Informamos o total de paginas
        }

        if (text.length > maxChars) {
          text = text.substring(0, maxChars) + `\n\n[...TRUNCADO em ${maxChars} caracteres. Total: ${text.length}]`;
        }

        return JSON.stringify({
          ok: true,
          pages: data.numpages,
          info: {
            title: data.info?.Title || null,
            author: data.info?.Author || null,
            subject: data.info?.Subject || null,
            creator: data.info?.Creator || null,
            creation_date: data.info?.CreationDate || null
          },
          text_length: data.text?.length || 0,
          text
        });
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro ao ler PDF: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CSV PROCESSOR
    // ══════════════════════════════════════════════════════════════════════════
    case 'csv_processor': {
      const fs = require('fs');
      const filePath = toolArgs.file_path || '';
      const action = toolArgs.action || 'read';

      if (!filePath) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio' });
      if (!fs.existsSync(filePath)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${filePath}` });

      try {
        const { parse } = require('csv-parse/sync');
        const raw = fs.readFileSync(filePath, 'utf-8');
        const delimiter = toolArgs.delimiter || ',';
        const records = parse(raw, { columns: true, skip_empty_lines: true, delimiter, trim: true });
        const columns = records.length > 0 ? Object.keys(records[0]) : [];

        switch (action) {
          case 'read': {
            const limit = toolArgs.limit || 50;
            return JSON.stringify({ ok: true, total_rows: records.length, columns, rows: records.slice(0, limit) });
          }

          case 'stats': {
            const colStats = {};
            for (const col of columns) {
              const values = records.map(r => r[col]).filter(v => v !== '' && v !== null && v !== undefined);
              const numericValues = values.map(Number).filter(n => !isNaN(n));
              colStats[col] = {
                total: values.length,
                empty: records.length - values.length,
                unique: new Set(values).size,
                is_numeric: numericValues.length > values.length * 0.8,
                sample: values.slice(0, 3)
              };
              if (numericValues.length > 0) {
                colStats[col].min = Math.min(...numericValues);
                colStats[col].max = Math.max(...numericValues);
                colStats[col].avg = +(numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2);
              }
            }
            return JSON.stringify({ ok: true, total_rows: records.length, columns, column_stats: colStats });
          }

          case 'filter': {
            const col = toolArgs.column;
            const op = toolArgs.operator || 'eq';
            const val = toolArgs.value || '';
            if (!col) return JSON.stringify({ ok: false, error: 'column e obrigatorio para filter' });

            const filtered = records.filter(r => {
              const v = r[col] || '';
              const numV = parseFloat(v);
              const numVal = parseFloat(val);
              switch (op) {
                case 'eq': return v === val;
                case 'neq': return v !== val;
                case 'gt': return numV > numVal;
                case 'lt': return numV < numVal;
                case 'gte': return numV >= numVal;
                case 'lte': return numV <= numVal;
                case 'contains': return v.toLowerCase().includes(val.toLowerCase());
                case 'starts_with': return v.toLowerCase().startsWith(val.toLowerCase());
                default: return v === val;
              }
            });
            const limit = toolArgs.limit || 50;
            return JSON.stringify({ ok: true, total_matched: filtered.length, rows: filtered.slice(0, limit) });
          }

          case 'aggregate': {
            const col = toolArgs.column;
            const fn = toolArgs.agg_function || 'count';
            if (!col) return JSON.stringify({ ok: false, error: 'column e obrigatorio para aggregate' });

            const values = records.map(r => r[col]).filter(v => v !== '' && v !== null);
            const nums = values.map(Number).filter(n => !isNaN(n));

            let result;
            switch (fn) {
              case 'count': result = values.length; break;
              case 'distinct': result = [...new Set(values)]; break;
              case 'sum': result = nums.reduce((a, b) => a + b, 0); break;
              case 'avg': result = nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0; break;
              case 'min': result = nums.length ? Math.min(...nums) : null; break;
              case 'max': result = nums.length ? Math.max(...nums) : null; break;
              default: result = values.length;
            }
            return JSON.stringify({ ok: true, column: col, function: fn, result });
          }

          case 'search': {
            const q = (toolArgs.value || '').toLowerCase();
            if (!q) return JSON.stringify({ ok: false, error: 'value e obrigatorio para search' });
            const matched = records.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
            const limit = toolArgs.limit || 50;
            return JSON.stringify({ ok: true, query: q, total_matched: matched.length, rows: matched.slice(0, limit) });
          }

          case 'transform': {
            const fmt = toolArgs.output_format || 'json';
            if (fmt === 'json') {
              return JSON.stringify({ ok: true, format: 'json', total: records.length, data: records.slice(0, 200) });
            } else if (fmt === 'table') {
              const header = columns.join(' | ');
              const sep = columns.map(() => '---').join(' | ');
              const rows = records.slice(0, 100).map(r => columns.map(c => r[c] || '').join(' | '));
              return `| ${header} |\n| ${sep} |\n${rows.map(r => `| ${r} |`).join('\n')}`;
            }
            return JSON.stringify({ ok: true, format: fmt, data: records.slice(0, 200) });
          }

          default:
            return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida. Use: read, stats, filter, aggregate, search, transform` });
        }
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro ao processar CSV: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCHEDULER
    // ══════════════════════════════════════════════════════════════════════════
    case 'scheduler': {
      const fs = require('fs');
      const action = toolArgs.action || 'list';
      const SCHEDULE_FILE = path.join(__dirname, 'data', 'scheduled-tasks.json');
      const SCHEDULE_LOG = path.join(__dirname, 'data', 'scheduled-tasks-log.json');

      // Garantir diretorio data existe
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      function loadSchedules() {
        try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8')); } catch { return []; }
      }
      function saveSchedules(tasks) {
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
      }
      function loadLog() {
        try { return JSON.parse(fs.readFileSync(SCHEDULE_LOG, 'utf-8')); } catch { return []; }
      }
      function appendLog(entry) {
        const log = loadLog();
        log.push({ ...entry, timestamp: new Date().toISOString() });
        // Manter apenas ultimas 200 entradas
        const trimmed = log.slice(-200);
        fs.writeFileSync(SCHEDULE_LOG, JSON.stringify(trimmed, null, 2), 'utf-8');
      }

      try {
        switch (action) {
          case 'create': {
            const name = toolArgs.name || 'Tarefa sem nome';
            const cron = toolArgs.cron;
            const command = toolArgs.command || '';
            const type = toolArgs.type || 'shell';
            const apiConfig = toolArgs.api_config || null;

            if (!cron) return JSON.stringify({ ok: false, error: 'cron expression e obrigatoria. Ex: "0 9 * * 1" (seg 9h)' });
            if (type !== 'api' && !command) return JSON.stringify({ ok: false, error: 'command e obrigatorio para type shell/node' });

            // Validar cron
            const cronLib = require('node-cron');
            if (!cronLib.validate(cron)) return JSON.stringify({ ok: false, error: `Cron expression invalida: "${cron}"` });

            const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const task = { id, name, cron, command, type, api_config: apiConfig, status: 'active', created_at: new Date().toISOString() };
            const tasks = loadSchedules();
            tasks.push(task);
            saveSchedules(tasks);

            // Ativar o cron job
            cronLib.schedule(cron, async () => {
              const startTime = Date.now();
              try {
                let output = '';
                if (type === 'shell') {
                  output = execSync(command, { timeout: 60000, encoding: 'utf-8' }).substring(0, 2000);
                } else if (type === 'node') {
                  output = execSync(`node "${command}"`, { timeout: 60000, encoding: 'utf-8' }).substring(0, 2000);
                } else if (type === 'api' && apiConfig) {
                  const resp = await httpRequest({
                    hostname: new URL(apiConfig.url).hostname,
                    port: new URL(apiConfig.url).port || (apiConfig.url.startsWith('https') ? 443 : 80),
                    path: new URL(apiConfig.url).pathname + (new URL(apiConfig.url).search || ''),
                    method: apiConfig.method || 'GET',
                    headers: apiConfig.headers || { 'Content-Type': 'application/json' },
                    protocol: new URL(apiConfig.url).protocol
                  }, apiConfig.body ? Buffer.from(apiConfig.body, 'utf8') : null);
                  output = resp.substring(0, 2000);
                }
                appendLog({ id, name, status: 'success', duration_ms: Date.now() - startTime, output: output.substring(0, 500) });
              } catch (e) {
                appendLog({ id, name, status: 'error', duration_ms: Date.now() - startTime, error: e.message.substring(0, 500) });
              }
            }, { name: id });

            return JSON.stringify({ ok: true, message: `Tarefa "${name}" agendada com sucesso`, task });
          }

          case 'list': {
            const tasks = loadSchedules();
            return JSON.stringify({ ok: true, total: tasks.length, tasks });
          }

          case 'delete': {
            const id = toolArgs.id;
            if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
            let tasks = loadSchedules();
            const before = tasks.length;
            tasks = tasks.filter(t => t.id !== id);
            saveSchedules(tasks);
            // Tentar destruir o cron job
            try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).stop(); } catch {}
            return JSON.stringify({ ok: true, deleted: before > tasks.length, remaining: tasks.length });
          }

          case 'pause': {
            const id = toolArgs.id;
            if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
            const tasks = loadSchedules();
            const task = tasks.find(t => t.id === id);
            if (!task) return JSON.stringify({ ok: false, error: `Tarefa ${id} nao encontrada` });
            task.status = 'paused';
            saveSchedules(tasks);
            try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).stop(); } catch {}
            return JSON.stringify({ ok: true, message: `Tarefa "${task.name}" pausada` });
          }

          case 'resume': {
            const id = toolArgs.id;
            if (!id) return JSON.stringify({ ok: false, error: 'id e obrigatorio' });
            const tasks = loadSchedules();
            const task = tasks.find(t => t.id === id);
            if (!task) return JSON.stringify({ ok: false, error: `Tarefa ${id} nao encontrada` });
            task.status = 'active';
            saveSchedules(tasks);
            try { const cronLib = require('node-cron'); const jobs = cronLib.getTasks(); if (jobs.has(id)) jobs.get(id).start(); } catch {}
            return JSON.stringify({ ok: true, message: `Tarefa "${task.name}" retomada` });
          }

          case 'history': {
            const id = toolArgs.id;
            const log = loadLog();
            const filtered = id ? log.filter(l => l.id === id) : log;
            return JSON.stringify({ ok: true, total: filtered.length, entries: filtered.slice(-50) });
          }

          default:
            return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida` });
        }
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro no scheduler: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // META ADS
    // ══════════════════════════════════════════════════════════════════════════
    case 'meta_ads': {
      const action = toolArgs.action || 'insights';

      // Buscar credenciais do vault
      let FB_TOKEN, FB_ACCOUNT_ID;
      try {
        const vault = require(path.join(__dirname, 'credential-vault.js'));
        const envVars = vault.getEnvVars();
        FB_TOKEN = envVars.FB_ACCESS_TOKEN;
        FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro ao acessar credenciais: ${e.message}. Verifique FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID no vault.` });
      }

      if (!FB_TOKEN) return JSON.stringify({ ok: false, error: 'FB_ACCESS_TOKEN nao encontrado no vault' });
      if (!FB_ACCOUNT_ID) return JSON.stringify({ ok: false, error: 'FB_AD_ACCOUNT_ID nao encontrado no vault' });

      const baseFields = toolArgs.fields || 'impressions,spend,clicks,ctr,cpc,actions,action_values,purchase_roas';
      const limit = toolArgs.limit || 50;
      const statusFilter = toolArgs.status || 'ALL';

      function buildDateParams() {
        let params = '';
        if (toolArgs.time_range && toolArgs.time_range.since && toolArgs.time_range.until) {
          params += `&time_range={"since":"${toolArgs.time_range.since}","until":"${toolArgs.time_range.until}"}`;
        } else if (toolArgs.date_preset) {
          params += `&date_preset=${toolArgs.date_preset}`;
        } else {
          params += '&date_preset=last_7d';
        }
        return params;
      }

      function metaGet(endpoint) {
        return new Promise((resolve) => {
          const url = `https://graph.facebook.com/v19.0/${endpoint}&access_token=${FB_TOKEN}`;
          https.get(url, { timeout: 30000 }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
          }).on('error', e => resolve(JSON.stringify({ error: e.message })));
        });
      }

      function parseActions(item) {
        if (!item) return item;
        const result = { ...item };
        // Extrair purchases e revenue das actions
        if (item.actions) {
          const purchases = item.actions.find(a => a.action_type === 'purchase');
          if (purchases) result._purchases = parseInt(purchases.value);
        }
        if (item.action_values) {
          const revenue = item.action_values.find(a => a.action_type === 'purchase');
          if (revenue) result._revenue = parseFloat(revenue.value);
        }
        if (item.purchase_roas) {
          const roas = item.purchase_roas.find(a => a.action_type === 'omni_purchase');
          if (roas) result._roas = parseFloat(roas.value);
        }
        return result;
      }

      try {
        let raw, parsed;

        switch (action) {
          case 'account_info':
            raw = await metaGet(`${FB_ACCOUNT_ID}?fields=name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name`);
            parsed = JSON.parse(raw);
            return JSON.stringify({ ok: !parsed.error, ...parsed });

          case 'campaigns': {
            let statusParam = '';
            if (statusFilter !== 'ALL') statusParam = `&filtering=[{"field":"effective_status","operator":"IN","value":["${statusFilter}"]}]`;
            raw = await metaGet(`${FB_ACCOUNT_ID}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=${limit}${statusParam}`);
            parsed = JSON.parse(raw);
            return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, campaigns: parsed.data || [], error: parsed.error });
          }

          case 'insights':
            raw = await metaGet(`${FB_ACCOUNT_ID}/insights?fields=${baseFields}${buildDateParams()}&level=account`);
            parsed = JSON.parse(raw);
            if (parsed.data) parsed.data = parsed.data.map(parseActions);
            return JSON.stringify({ ok: !parsed.error, data: parsed.data || [], error: parsed.error });

          case 'campaign_insights':
            raw = await metaGet(`${FB_ACCOUNT_ID}/insights?fields=campaign_id,campaign_name,${baseFields}${buildDateParams()}&level=campaign&limit=${limit}`);
            parsed = JSON.parse(raw);
            if (parsed.data) parsed.data = parsed.data.map(parseActions);
            return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, data: parsed.data || [], error: parsed.error });

          case 'adsets': {
            const campaignId = toolArgs.campaign_id;
            if (!campaignId) return JSON.stringify({ ok: false, error: 'campaign_id e obrigatorio para listar adsets' });
            raw = await metaGet(`${campaignId}/adsets?fields=id,name,status,effective_status,daily_budget,bid_strategy,targeting,optimization_goal&limit=${limit}`);
            parsed = JSON.parse(raw);
            return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, adsets: parsed.data || [], error: parsed.error });
          }

          case 'adset_insights': {
            const adsetId = toolArgs.adset_id || toolArgs.campaign_id;
            if (!adsetId) return JSON.stringify({ ok: false, error: 'adset_id ou campaign_id e obrigatorio' });
            const level = toolArgs.adset_id ? 'adset' : 'adset';
            const entity = toolArgs.adset_id ? adsetId : `${FB_ACCOUNT_ID}`;
            raw = await metaGet(`${entity}/insights?fields=adset_id,adset_name,${baseFields}${buildDateParams()}&level=${level}&limit=${limit}`);
            parsed = JSON.parse(raw);
            if (parsed.data) parsed.data = parsed.data.map(parseActions);
            return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, data: parsed.data || [], error: parsed.error });
          }

          case 'ads': {
            const adsetId = toolArgs.adset_id;
            if (!adsetId) return JSON.stringify({ ok: false, error: 'adset_id e obrigatorio para listar ads' });
            raw = await metaGet(`${adsetId}/ads?fields=id,name,status,effective_status,creative&limit=${limit}`);
            parsed = JSON.parse(raw);
            return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, ads: parsed.data || [], error: parsed.error });
          }

          default:
            return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida. Use: account_info, campaigns, insights, adsets, ads, campaign_insights, adset_insights` });
        }
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro Meta Ads: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SEO CHECK
    // ══════════════════════════════════════════════════════════════════════════
    case 'seo_check': {
      const url = toolArgs.url || '';
      if (!url) return JSON.stringify({ ok: false, error: 'url e obrigatoria' });

      const checksArg = (toolArgs.checks || 'all').toLowerCase().split(',').map(s => s.trim());
      const doAll = checksArg.includes('all');

      try {
        // Buscar pagina
        const fetchUrl = new URL(url);
        const proto = fetchUrl.protocol === 'https:' ? https : http;
        const html = await new Promise((resolve, reject) => {
          const req = proto.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' } }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              // Seguir redirect
              proto.get(res.headers.location, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' } }, res2 => {
                let d = '';
                res2.on('data', c => d += c);
                res2.on('end', () => resolve(d));
              }).on('error', reject);
              return;
            }
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('Timeout ao carregar pagina')); });
        });

        const issues = [];
        const warnings = [];
        const passed = [];
        const data = {};
        let score = 100;

        // ── META ──
        if (doAll || checksArg.includes('meta')) {
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
          const description = descMatch ? descMatch[1].trim() : '';
          const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
          const robots = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
          const viewport = html.match(/<meta[^>]*name=["']viewport["']/i);

          data.title = { text: title, length: title.length };
          data.description = { text: description, length: description.length };
          data.canonical = canonical ? canonical[1] : null;
          data.robots = robots ? robots[1] : null;

          if (!title) { issues.push('Sem tag <title>'); score -= 15; }
          else if (title.length < 30) { warnings.push(`Title muito curto (${title.length} chars, recomendado: 30-60)`); score -= 5; }
          else if (title.length > 60) { warnings.push(`Title muito longo (${title.length} chars, recomendado: 30-60)`); score -= 3; }
          else passed.push('Title OK');

          if (!description) { issues.push('Sem meta description'); score -= 10; }
          else if (description.length < 70) { warnings.push(`Description curta (${description.length} chars, recomendado: 70-160)`); score -= 3; }
          else if (description.length > 160) { warnings.push(`Description longa (${description.length} chars, recomendado: 70-160)`); score -= 2; }
          else passed.push('Meta description OK');

          if (!canonical) { warnings.push('Sem canonical URL'); score -= 3; }
          else passed.push('Canonical definida');

          if (!viewport) { issues.push('Sem meta viewport (mobile)'); score -= 10; }
          else passed.push('Viewport OK');
        }

        // ── HEADINGS ──
        if (doAll || checksArg.includes('headings')) {
          const h1s = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
          const h2s = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
          const h3s = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

          data.headings = {
            h1_count: h1s.length,
            h1_text: h1s.map(h => h.replace(/<[^>]*>/g, '').trim()).slice(0, 3),
            h2_count: h2s.length,
            h3_count: h3s.length
          };

          if (h1s.length === 0) { issues.push('Sem tag H1'); score -= 10; }
          else if (h1s.length > 1) { warnings.push(`Multiplos H1 (${h1s.length}), recomendado: apenas 1`); score -= 3; }
          else passed.push('H1 unico OK');

          if (h2s.length === 0) { warnings.push('Sem tags H2'); score -= 3; }
        }

        // ── IMAGES ──
        if (doAll || checksArg.includes('images')) {
          const imgs = html.match(/<img[^>]*>/gi) || [];
          const withoutAlt = imgs.filter(i => !i.match(/alt=["'][^"']+["']/i));

          data.images = { total: imgs.length, without_alt: withoutAlt.length };

          if (withoutAlt.length > 0) {
            warnings.push(`${withoutAlt.length}/${imgs.length} imagens sem alt text`);
            score -= Math.min(withoutAlt.length * 2, 10);
          } else if (imgs.length > 0) {
            passed.push('Todas imagens com alt text');
          }
        }

        // ── LINKS ──
        if (doAll || checksArg.includes('links')) {
          const links = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
          const internal = links.filter(l => {
            const href = (l.match(/href=["']([^"']*)["']/i) || [])[1] || '';
            return href.startsWith('/') || href.includes(fetchUrl.hostname);
          });
          const external = links.length - internal.length;
          const nofollow = links.filter(l => l.match(/rel=["'][^"']*nofollow[^"']*["']/i));

          data.links = { total: links.length, internal: internal.length, external, nofollow: nofollow.length };
        }

        // ── PERFORMANCE ──
        if (doAll || checksArg.includes('performance')) {
          const htmlSize = Buffer.byteLength(html, 'utf8');
          const scripts = html.match(/<script[^>]*>/gi) || [];
          const styles = html.match(/<link[^>]*stylesheet[^>]*>/gi) || [];
          const inlineStyles = html.match(/<style[^>]*>/gi) || [];

          data.performance = {
            html_size_kb: +(htmlSize / 1024).toFixed(1),
            scripts: scripts.length,
            stylesheets: styles.length,
            inline_styles: inlineStyles.length
          };

          if (htmlSize > 200000) { warnings.push(`HTML grande (${(htmlSize/1024).toFixed(0)}KB)`); score -= 5; }
          if (scripts.length > 15) { warnings.push(`Muitos scripts (${scripts.length})`); score -= 3; }
        }

        // ── SCHEMA ──
        if (doAll || checksArg.includes('schema')) {
          const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
          data.schema = { json_ld_count: jsonLd.length };

          if (jsonLd.length > 0) {
            try {
              data.schema.types = jsonLd.map(s => {
                const content = s.replace(/<[^>]*>/g, '');
                const parsed = JSON.parse(content);
                return parsed['@type'] || 'unknown';
              });
            } catch {}
            passed.push(`Schema markup encontrado (${jsonLd.length} blocos)`);
          } else {
            warnings.push('Sem schema markup (JSON-LD)');
            score -= 5;
          }
        }

        // ── SOCIAL ──
        if (doAll || checksArg.includes('social')) {
          const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
          const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
          const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
          const twCard = html.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i);

          data.social = {
            og_title: ogTitle ? ogTitle[1] : null,
            og_description: ogDesc ? ogDesc[1] : null,
            og_image: ogImage ? ogImage[1] : null,
            twitter_card: twCard ? twCard[1] : null
          };

          if (!ogTitle) { warnings.push('Sem og:title'); score -= 3; }
          if (!ogImage) { warnings.push('Sem og:image'); score -= 3; }
          if (ogTitle && ogImage) passed.push('Open Graph tags OK');
        }

        score = Math.max(0, Math.min(100, score));

        return JSON.stringify({
          ok: true,
          url,
          score,
          grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F',
          summary: { issues: issues.length, warnings: warnings.length, passed: passed.length },
          issues,
          warnings,
          passed,
          data
        });
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro ao analisar SEO: ${e.message}` });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGESPEED INSIGHTS (API + fallback headless browser)
    // ══════════════════════════════════════════════════════════════════════════
    case 'pagespeed': {
      const url = toolArgs.url || '';
      if (!url) return JSON.stringify({ ok: false, error: 'url e obrigatoria' });

      const strategy = toolArgs.strategy || 'mobile';
      const categoriesArg = toolArgs.categories || 'performance,accessibility,seo,best-practices';
      const categories = categoriesArg.split(',').map(c => c.trim());

      // ── Helper: parsear resultado do Lighthouse ──
      function parseLighthouseResult(result) {
        const lhr = result.lighthouseResult;
        if (!lhr) return null;

        const scores = {};
        for (const [key, cat] of Object.entries(lhr.categories || {})) {
          scores[key] = { score: Math.round((cat.score || 0) * 100), title: cat.title };
        }

        const metrics = {};
        const audits = lhr.audits || {};
        const metricMap = {
          'largest-contentful-paint': 'LCP', 'first-contentful-paint': 'FCP',
          'total-blocking-time': 'TBT', 'cumulative-layout-shift': 'CLS',
          'speed-index': 'Speed Index', 'interactive': 'TTI', 'server-response-time': 'TTFB'
        };
        for (const [auditId, label] of Object.entries(metricMap)) {
          if (audits[auditId]) {
            metrics[label] = {
              value: audits[auditId].displayValue || audits[auditId].numericValue,
              score: audits[auditId].score !== null ? Math.round((audits[auditId].score || 0) * 100) : null
            };
          }
        }

        const fieldData = {};
        if (result.loadingExperience?.metrics) {
          for (const [key, metric] of Object.entries(result.loadingExperience.metrics)) {
            fieldData[key] = { percentile: metric.percentile, category: metric.category };
          }
        }

        const opportunities = [];
        for (const [, audit] of Object.entries(audits)) {
          if (audit.score !== null && audit.score < 0.9 && audit.details?.type === 'opportunity') {
            opportunities.push({
              title: audit.title,
              description: audit.description?.substring(0, 200),
              savings: audit.details?.overallSavingsMs ? `${Math.round(audit.details.overallSavingsMs)}ms` : null,
              score: Math.round((audit.score || 0) * 100)
            });
          }
        }
        opportunities.sort((a, b) => (a.score || 0) - (b.score || 0));

        const diagnostics = [];
        for (const [, audit] of Object.entries(audits)) {
          if (audit.score !== null && audit.score < 0.5 && audit.details?.type !== 'opportunity' && audit.scoreDisplayMode !== 'informative') {
            diagnostics.push({ title: audit.title, displayValue: audit.displayValue || null, score: Math.round((audit.score || 0) * 100) });
          }
        }
        diagnostics.sort((a, b) => (a.score || 0) - (b.score || 0));

        return {
          scores, core_web_vitals: metrics,
          field_data: Object.keys(fieldData).length > 0 ? fieldData : null,
          opportunities: opportunities.slice(0, 10),
          diagnostics: diagnostics.slice(0, 10),
          summary: `Performance: ${scores.performance?.score || '?'}/100 | A11y: ${scores.accessibility?.score || '?'}/100 | SEO: ${scores.seo?.score || '?'}/100 | Best Practices: ${scores['best-practices']?.score || '?'}/100`
        };
      }

      // ── Metodo 1: API REST (rapido, com quota) ──
      async function tryApi() {
        let apiKey = '';
        try {
          const vault = require(path.join(__dirname, 'credential-vault.js'));
          const envVars = vault.getEnvVars();
          apiKey = envVars.GOOGLE_PAGESPEED_KEY || envVars.GOOGLE_API_KEY || '';
        } catch {}
        const keyParam = apiKey ? `&key=${apiKey}` : '';
        const categoryParams = categories.map(c => `&category=${encodeURIComponent(c)}`).join('');
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${categoryParams}${keyParam}`;

        const raw = await new Promise((resolve, reject) => {
          https.get(apiUrl, { timeout: 60000 }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
          }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout API')); });
        });

        const result = JSON.parse(raw);
        if (result.error) throw new Error(result.error.message || 'Erro API');

        const parsed = parseLighthouseResult(result);
        if (!parsed) throw new Error('Sem dados Lighthouse');
        return { ...parsed, method: 'api' };
      }

      // ── Metodo 2: Headless browser (sem quota, mais lento) ──
      async function tryBrowser() {
        const puppeteer = require('puppeteer');
        const psiUrl = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy}`;

        let browser;
        try {
          browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
          });
          const page = await browser.newPage();
          await page.setViewport({ width: 1280, height: 900 });
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

          // Navegar para o PageSpeed web.dev
          await page.goto(psiUrl, { waitUntil: 'networkidle2', timeout: 30000 });

          // Aguardar os resultados carregarem (o score aparece nos gauge elements)
          // O PageSpeed web.dev usa a API internamente e mostra os resultados
          // Vamos interceptar a chamada de API que ele faz
          const apiResult = await page.evaluate(async (targetUrl, strat) => {
            // Tentar extrair via API interna do pagespeed.web.dev
            try {
              const categoryList = ['performance', 'accessibility', 'seo', 'best-practices'];
              const cats = categoryList.map(c => `&category=${c}`).join('');
              const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strat}${cats}`;
              const resp = await fetch(apiUrl);
              if (resp.ok) {
                return await resp.json();
              }
            } catch {}
            return null;
          }, url, strategy);

          if (apiResult && apiResult.lighthouseResult) {
            const parsed = parseLighthouseResult(apiResult);
            if (parsed) return { ...parsed, method: 'browser-api' };
          }

          // Fallback: esperar os scores aparecerem no DOM e extrair
          await page.waitForSelector('.lh-gauge__percentage, [class*="gauge"]', { timeout: 120000 });
          // Dar tempo extra para todos os scores carregarem
          await new Promise(r => setTimeout(r, 5000));

          const scores = await page.evaluate(() => {
            const result = {};
            // Tentar extrair dos gauges do pagespeed.web.dev
            const gauges = document.querySelectorAll('.lh-gauge__wrapper, .lh-column .lh-gauge');
            gauges.forEach(g => {
              const label = g.querySelector('.lh-gauge__label')?.textContent?.trim()?.toLowerCase() || '';
              const score = g.querySelector('.lh-gauge__percentage')?.textContent?.trim();
              if (label && score) {
                const key = label.includes('perform') ? 'performance' :
                            label.includes('access') ? 'accessibility' :
                            label.includes('best') ? 'best-practices' :
                            label.includes('seo') ? 'seo' : label;
                result[key] = { score: parseInt(score) || 0, title: label };
              }
            });

            // Extrair metricas se disponiveis
            const metrics = {};
            const metricEls = document.querySelectorAll('.lh-metric');
            metricEls.forEach(el => {
              const title = el.querySelector('.lh-metric__title')?.textContent?.trim() || '';
              const value = el.querySelector('.lh-metric__value')?.textContent?.trim() || '';
              if (title && value) {
                const key = title.includes('Largest') ? 'LCP' :
                            title.includes('First Contentful') ? 'FCP' :
                            title.includes('Total Blocking') ? 'TBT' :
                            title.includes('Cumulative') ? 'CLS' :
                            title.includes('Speed') ? 'Speed Index' :
                            title.includes('Interactive') ? 'TTI' : title;
                metrics[key] = { value, score: null };
              }
            });

            // Extrair oportunidades
            const opps = [];
            const oppEls = document.querySelectorAll('.lh-audit--load-opportunity');
            oppEls.forEach(el => {
              const title = el.querySelector('.lh-audit__title')?.textContent?.trim() || '';
              const savings = el.querySelector('.lh-audit__display-text')?.textContent?.trim() || '';
              if (title) opps.push({ title, savings: savings || null, score: 0 });
            });

            return { scores: result, metrics, opportunities: opps };
          });

          return {
            scores: scores.scores || {},
            core_web_vitals: scores.metrics || {},
            field_data: null,
            opportunities: (scores.opportunities || []).slice(0, 10),
            diagnostics: [],
            summary: Object.entries(scores.scores || {}).map(([k, v]) => `${v.title || k}: ${v.score}/100`).join(' | '),
            method: 'browser-scrape'
          };
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      }

      try {
        // Tentar API primeiro (rapido)
        try {
          const apiResult = await tryApi();
          return JSON.stringify({ ok: true, url, strategy, ...apiResult });
        } catch (apiErr) {
          console.log(`[pagespeed] API falhou (${apiErr.message}), tentando via headless browser...`);
        }

        // Fallback: headless browser
        try {
          const browserResult = await tryBrowser();
          return JSON.stringify({ ok: true, url, strategy, ...browserResult });
        } catch (browserErr) {
          return JSON.stringify({ ok: false, error: `API e browser falharam. API: quota excedida. Browser: ${browserErr.message}` });
        }
      } catch (e) {
        return JSON.stringify({ ok: false, error: `Erro PageSpeed: ${e.message}` });
      }
    }

        // ── GOOGLE SEARCH (via web-search.js) ──────────────────────────────
    case 'google_search': {
      try {
        if (toolUtils) {
          const cached = toolUtils.getCached('google_search', toolArgs);
          if (cached) return cached;
          const result = await toolUtils.withCircuitBreaker('google_search', () =>
            toolUtils.withTimeout(googleSearch(toolArgs), 25000, 'google_search')
          );
          toolUtils.setCached('google_search', toolArgs, result);
          return result;
        }
        return await googleSearch(toolArgs);
      } catch (e) {
        return `Erro ao buscar na web: ${e.message}`;
      }
    }

    // ── MAPS SEARCH (via web-search.js) ─────────────────────────────────
    case 'maps_search': {
      try {
        if (toolUtils) {
          const cached = toolUtils.getCached('maps_search', toolArgs);
          if (cached) return cached;
          const result = await toolUtils.withCircuitBreaker('maps_search', () =>
            toolUtils.withTimeout(mapsSearch(toolArgs), 25000, 'maps_search')
          );
          toolUtils.setCached('maps_search', toolArgs, result);
          return result;
        }
        return await mapsSearch(toolArgs);
      } catch (e) {
        return `Erro ao buscar negócios: ${e.message}`;
      }
    }

    // ── SEND WHATSAPP (via Evolution API proxy) ─────────────────────────
    case 'send_whatsapp': {
      return new Promise((resolve) => {
        const { number, text, mediaUrl, mediaType, caption } = toolArgs;
        const isMedia = mediaUrl && mediaType;
        const endpoint = isMedia ? '/api/evolution/send-media' : '/api/evolution/send-text';
        const body = isMedia
          ? { number, mediaUrl, mediaType, caption: caption || text }
          : { number, text };
        const bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
        const crmUrl = new URL(CRM_BASE);
        const opts = {
          hostname: crmUrl.hostname,
          port: parseInt(crmUrl.port) || 80,
          path: endpoint,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CRM_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': bodyBuf.length
          }
        };
        const req = http.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(`HTTP ${res.statusCode}\n${data}`));
        });
        req.setTimeout(15000, () => { req.destroy(); resolve('Erro WhatsApp: timeout de 15s'); });
        req.on('error', e => resolve(`Erro WhatsApp: ${e.message}`));
        req.write(bodyBuf);
        req.end();
      });
    }

    // ── SEND EMAIL (via CRM email service) ──────────────────────────────
    case 'send_email': {
      return new Promise((resolve) => {
        const { to, subject, body: emailBody, html } = toolArgs;
        const payload = { to, subject, body: emailBody, html: html || undefined };
        const bodyBuf = Buffer.from(JSON.stringify(payload), 'utf8');
        const crmUrl = new URL(CRM_BASE);
        const opts = {
          hostname: crmUrl.hostname,
          port: parseInt(crmUrl.port) || 80,
          path: '/api/crm/messages/email',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CRM_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': bodyBuf.length
          }
        };
        const req = http.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(`HTTP ${res.statusCode}\n${data}`));
        });
        req.setTimeout(15000, () => { req.destroy(); resolve('Erro Email: timeout de 15s'); });
        req.on('error', e => resolve(`Erro Email: ${e.message}`));
        req.write(bodyBuf);
        req.end();
      });
    }

    // ── SEND TELEGRAM ─────────────────────────────────────────────────
    case 'send_telegram': {
      return new Promise((resolve) => {
        const { text, chat_id } = toolArgs;
        // Ler config do task-scheduler
        let botToken, chatId;
        try {
          const cfgPath = require('path').join(__dirname, 'data', 'config.json');
          const cfg = JSON.parse(require('fs').readFileSync(cfgPath, 'utf8'));
          botToken = cfg.telegram?.botToken;
          chatId = chat_id || cfg.telegram?.chatId;
        } catch (e) {
          return resolve('Erro: config do Telegram não encontrado');
        }
        if (!botToken || !chatId) return resolve('Erro: botToken ou chatId não configurado');
        const bodyBuf = Buffer.from(JSON.stringify({
          chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true
        }), 'utf8');
        const opts = {
          hostname: 'api.telegram.org',
          path: `/bot${botToken}/sendMessage`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': bodyBuf.length }
        };
        const https = require('https');
        const req = https.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(`HTTP ${res.statusCode}\n${data}`));
        });
        req.setTimeout(10000, () => { req.destroy(); resolve('Erro Telegram: timeout de 10s'); });
        req.on('error', e => resolve(`Erro Telegram: ${e.message}`));
        req.write(bodyBuf);
        req.end();
      });
    }

    // ── VAULT MANAGE ────────────────────────────────────────────────────
    case 'vault_manage': {
      try {
        const { action, name, value } = toolArgs;
        if (!credentialVault) return 'Vault não disponível';
        switch (action) {
          case 'list': {
            const all = credentialVault.getAll();
            return `${all.length} credenciais:\n${all.map(c => `  - ${c.name}`).join('\n')}`;
          }
          case 'create': {
            if (!name || !value) return 'Parâmetros name e value são obrigatórios para create';
            credentialVault.create(name, value);
            return `Credencial "${name}" criada com sucesso`;
          }
          case 'update': {
            if (!name || !value) return 'Parâmetros name e value são obrigatórios para update';
            const all = credentialVault.getAll();
            const cred = all.find(c => c.name === name);
            if (!cred) return `Credencial "${name}" não encontrada`;
            credentialVault.update(cred.id, value);
            return `Credencial "${name}" atualizada com sucesso`;
          }
          case 'delete': {
            if (!name) return 'Parâmetro name é obrigatório para delete';
            const allCreds = credentialVault.getAll();
            const target = allCreds.find(c => c.name === name);
            if (!target) return `Credencial "${name}" não encontrada`;
            credentialVault.remove(target.id);
            return `Credencial "${name}" removida com sucesso`;
          }
          default:
            return `Ação "${action}" não reconhecida. Use: list, create, update, delete`;
        }
      } catch (e) {
        return `Erro vault: ${e.message}`;
      }
    }

    case 'dns_lookup': {
      try {
        const { domain, type: recordType = 'ALL' } = toolArgs;
        if (!domain) return 'Parâmetro "domain" é obrigatório';
        const dns = require('dns');
        const { promisify } = require('util');

        const results = [`DNS Lookup: ${domain}\n${'─'.repeat(40)}`];
        const SERVER_IP = '46.202.149.24';

        const types = recordType === 'ALL' ? ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'] : [recordType.toUpperCase()];

        for (const t of types) {
          try {
            let records;
            switch (t) {
              case 'A': records = await promisify(dns.resolve4)(domain); break;
              case 'AAAA': records = await promisify(dns.resolve6)(domain); break;
              case 'CNAME': records = await promisify(dns.resolveCname)(domain); break;
              case 'MX': records = await promisify(dns.resolveMx)(domain); break;
              case 'TXT': records = await promisify(dns.resolveTxt)(domain); break;
              case 'NS': records = await promisify(dns.resolveNs)(domain); break;
              case 'SOA': records = [await promisify(dns.resolveSoa)(domain)]; break;
              default: records = [];
            }
            if (t === 'MX') {
              results.push(`${t}: ${records.map(r => `${r.priority} ${r.exchange}`).join(', ')}`);
            } else if (t === 'TXT') {
              results.push(`${t}: ${records.map(r => r.join('')).join(' | ')}`);
            } else if (t === 'SOA') {
              const s = records[0];
              results.push(`${t}: ns=${s.nsname} mail=${s.hostmaster} serial=${s.serial}`);
            } else {
              results.push(`${t}: ${Array.isArray(records) ? records.join(', ') : records}`);
            }

            // Verificar se A record aponta para o servidor
            if (t === 'A' && Array.isArray(records)) {
              const pointsToServer = records.includes(SERVER_IP);
              results.push(pointsToServer
                ? `  ✓ Aponta para o servidor CyberPanel (${SERVER_IP})`
                : `  ✗ NÃO aponta para o servidor (${SERVER_IP}). DNS não propagou ou domínio aponta para outro lugar.`);
            }
          } catch (e) {
            if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
              results.push(`${t}: (não encontrado)`);
            }
          }
        }
        return results.join('\n');
      } catch (e) {
        return `Erro dns_lookup: ${e.message}`;
      }
    }

    case 'ssl_check': {
      try {
        const { domain, port = 443 } = toolArgs;
        if (!domain) return 'Parâmetro "domain" é obrigatório';
        const tls = require('tls');

        return new Promise((resolve) => {
          const socket = tls.connect({ host: domain, port, servername: domain, rejectUnauthorized: false, timeout: 10000 }, () => {
            const cert = socket.getPeerCertificate(true);
            socket.destroy();
            if (!cert || !cert.subject) return resolve(`Nenhum certificado encontrado em ${domain}:${port}`);

            const now = new Date();
            const validFrom = new Date(cert.valid_from);
            const validTo = new Date(cert.valid_to);
            const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
            const isExpired = daysLeft < 0;
            const isAutoSigned = cert.issuer && cert.subject && JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);

            const status = isExpired ? 'EXPIRADO' : daysLeft <= 7 ? 'CRÍTICO' : daysLeft <= 30 ? 'ATENÇÃO' : 'OK';

            const lines = [
              `SSL Check: ${domain}:${port}`,
              '─'.repeat(40),
              `Status: ${status} (${isExpired ? 'expirado há ' + Math.abs(daysLeft) + ' dias' : daysLeft + ' dias restantes'})`,
              `Domínio: ${cert.subject.CN || '(sem CN)'}`,
              `SANs: ${cert.subjectaltname || '(nenhum)'}`,
              `Emissor: ${cert.issuer.O || cert.issuer.CN || '(desconhecido)'}`,
              `Válido de: ${validFrom.toISOString().split('T')[0]}`,
              `Válido até: ${validTo.toISOString().split('T')[0]}`,
              `Serial: ${cert.serialNumber}`,
              `Autoassinado: ${isAutoSigned ? 'SIM ⚠️' : 'Não'}`,
              `Protocolo: ${socket.getProtocol ? socket.getProtocol() : 'N/A'}`,
            ];
            resolve(lines.join('\n'));
          });
          socket.on('error', e => resolve(`Erro SSL em ${domain}:${port}: ${e.message}`));
          socket.on('timeout', () => { socket.destroy(); resolve(`Timeout conectando a ${domain}:${port}`); });
        });
      } catch (e) {
        return `Erro ssl_check: ${e.message}`;
      }
    }

    case 'whois_lookup': {
      try {
        const { domain } = toolArgs;
        if (!domain) return 'Parâmetro "domain" é obrigatório';
        const { execFileSync } = require('child_process');

        // Tentar whois local, senão via SSH no servidor
        let result;
        try {
          result = execFileSync('whois', [domain], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
        } catch (_) {
          // Fallback: whois via servidor SSH
          try {
            let serverIP = '46.202.149.24';
            try {
              if (credentialVault) {
                const allCreds = credentialVault.getAll();
                const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
                if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
              }
            } catch (_) {}
            result = execFileSync('ssh', ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', `root@${serverIP}`, `whois ${domain}`], { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
          } catch (e2) {
            return `Erro whois: comando whois não disponível localmente nem no servidor. ${e2.message}`;
          }
        }

        // Extrair campos relevantes
        const lines = result.split('\n');
        const relevant = lines.filter(l => {
          const lower = l.toLowerCase();
          return lower.includes('domain name') || lower.includes('registrar') || lower.includes('creation') || lower.includes('expir') || lower.includes('updated') || lower.includes('name server') || lower.includes('status') || lower.includes('registrant') || lower.includes('owner') || lower.includes('nserver') || lower.includes('created') || lower.includes('changed');
        }).map(l => l.trim()).filter(l => l && !l.startsWith('%'));

        if (relevant.length === 0) {
          return result.length > 4000 ? result.slice(0, 4000) + '\n...[truncado]' : result;
        }
        return `WHOIS: ${domain}\n${'─'.repeat(40)}\n${relevant.join('\n')}`;
      } catch (e) {
        return `Erro whois_lookup: ${e.message}`;
      }
    }

    case 'db_query': {
      try {
        const { query, database, confirm = false } = toolArgs;
        if (!query) return 'Parâmetro "query" é obrigatório';

        // Proteção contra queries destrutivas sem confirm
        const destructive = /^\s*(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT|REPLACE|RENAME|CREATE|GRANT|REVOKE)/i;
        if (destructive.test(query) && !confirm) {
          return `BLOQUEADO: Query destrutiva detectada. Adicione confirm=true para executar:\n  "${query}"`;
        }

        let serverIP = '46.202.149.24';
        try {
          if (credentialVault) {
            const allCreds = credentialVault.getAll();
            const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
            if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
          }
        } catch (_) {}

        const { execFileSync } = require('child_process');
        const dbFlag = database ? ` ${database}` : '';
        const escapedQuery = query.replace(/'/g, "'\\''");
        const cmd = `mysql -e '${escapedQuery}'${dbFlag} 2>&1`;

        const result = execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10',
          `root@${serverIP}`, cmd
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });

        return result.trim() || '(query executada sem retorno)';
      } catch (e) {
        return `Erro db_query: ${(e.stderr || e.message).slice(0, 3000)}`;
      }
    }

    case 'docker_manage': {
      try {
        const { action, container, tail = 100, all = false } = toolArgs;
        if (!action) return 'Parâmetro "action" é obrigatório';

        let serverIP = '46.202.149.24';
        try {
          if (credentialVault) {
            const allCreds = credentialVault.getAll();
            const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
            if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
          }
        } catch (_) {}

        const { execFileSync } = require('child_process');
        function sshRun(cmd, timeout = 30000) {
          return execFileSync('ssh', ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', `root@${serverIP}`, cmd], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 }).trim();
        }

        switch (action) {
          case 'list':
            return sshRun(`docker ps ${all ? '-a ' : ''}--format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`);
          case 'start':
            if (!container) return 'Parâmetro "container" é obrigatório para start';
            return sshRun(`docker start ${container}`);
          case 'stop':
            if (!container) return 'Parâmetro "container" é obrigatório para stop';
            return sshRun(`docker stop ${container}`);
          case 'restart':
            if (!container) return 'Parâmetro "container" é obrigatório para restart';
            return sshRun(`docker restart ${container}`);
          case 'logs':
            if (!container) return 'Parâmetro "container" é obrigatório para logs';
            const logResult = sshRun(`docker logs --tail ${tail} ${container} 2>&1`, 60000);
            return logResult.length > 6000 ? logResult.slice(-6000) + '\n...[truncado ao final]' : logResult;
          case 'images':
            return sshRun('docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"');
          case 'stats':
            return sshRun('docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"');
          case 'inspect':
            if (!container) return 'Parâmetro "container" é obrigatório para inspect';
            const inspectResult = sshRun(`docker inspect ${container}`);
            return inspectResult.length > 6000 ? inspectResult.slice(0, 6000) + '\n...[truncado]' : inspectResult;
          default:
            return `Ação "${action}" não reconhecida. Use: list, start, stop, restart, logs, images, stats, inspect`;
        }
      } catch (e) {
        return `Erro docker_manage: ${(e.stderr || e.message).slice(0, 3000)}`;
      }
    }

    case 'log_analyzer': {
      try {
        const { domain, log_type = 'both', lines = 200, filter, analysis = 'summary' } = toolArgs;
        if (!domain) return 'Parâmetro "domain" é obrigatório';

        let serverIP = '46.202.149.24';
        try {
          if (credentialVault) {
            const allCreds = credentialVault.getAll();
            const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
            if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
          }
        } catch (_) {}

        const { execFileSync } = require('child_process');
        function sshRun(cmd, timeout = 30000) {
          return execFileSync('ssh', ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', `root@${serverIP}`, cmd], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 }).trim();
        }

        const accessLog = `/home/${domain}/logs/${domain}.access_log`;
        const errorLog = `/home/${domain}/logs/${domain}.error_log`;
        const results = [`Log Analyzer: ${domain}\n${'─'.repeat(40)}`];

        if (analysis === 'raw') {
          if (log_type !== 'error') {
            const filterCmd = filter ? ` | grep '${filter}'` : '';
            results.push(`\n=== ACCESS LOG (últimas ${lines} linhas) ===`);
            try { results.push(sshRun(`tail -n ${lines} ${accessLog}${filterCmd} 2>/dev/null || echo "(sem access log)"`)); } catch (_) { results.push('(sem access log)'); }
          }
          if (log_type !== 'access') {
            const filterCmd = filter ? ` | grep '${filter}'` : '';
            results.push(`\n=== ERROR LOG (últimas ${lines} linhas) ===`);
            try { results.push(sshRun(`tail -n ${lines} ${errorLog}${filterCmd} 2>/dev/null || echo "(sem error log)"`)); } catch (_) { results.push('(sem error log)'); }
          }
          const out = results.join('\n');
          return out.length > 8000 ? out.slice(-8000) : out;
        }

        // Summary / analysis modes
        if (log_type !== 'error' && ['summary', 'top_ips', 'top_paths', 'status_codes'].includes(analysis)) {
          try {
            if (analysis === 'summary' || analysis === 'top_ips') {
              const topIPs = sshRun(`tail -n ${lines} ${accessLog} 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -10`);
              results.push(`\nTop 10 IPs:\n${topIPs}`);
            }
            if (analysis === 'summary' || analysis === 'status_codes') {
              const statusCodes = sshRun(`tail -n ${lines} ${accessLog} 2>/dev/null | awk '{print $9}' | sort | uniq -c | sort -rn`);
              results.push(`\nStatus Codes:\n${statusCodes}`);
            }
            if (analysis === 'summary' || analysis === 'top_paths') {
              const topPaths = sshRun(`tail -n ${lines} ${accessLog} 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn | head -15`);
              results.push(`\nTop 15 Paths:\n${topPaths}`);
            }
          } catch (_) { results.push('(access log não encontrado)'); }
        }

        if (log_type !== 'access' && ['summary', 'errors'].includes(analysis)) {
          try {
            const errors = sshRun(`tail -n ${lines} ${errorLog} 2>/dev/null | tail -20`);
            results.push(`\nÚltimos erros:\n${errors || '(nenhum erro recente)'}`);
          } catch (_) { results.push('(error log não encontrado)'); }
        }

        return results.join('\n');
      } catch (e) {
        return `Erro log_analyzer: ${e.message}`;
      }
    }

    case 'text_utils': {
      try {
        const { action, text = '' } = toolArgs;
        if (!action) return 'Parâmetro "action" é obrigatório';
        const crypto = require('crypto');

        switch (action) {
          case 'base64_encode':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return Buffer.from(text, 'utf8').toString('base64');
          case 'base64_decode':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return Buffer.from(text, 'base64').toString('utf8');
          case 'md5':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return crypto.createHash('md5').update(text).digest('hex');
          case 'sha256':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return crypto.createHash('sha256').update(text).digest('hex');
          case 'url_encode':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return encodeURIComponent(text);
          case 'url_decode':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return decodeURIComponent(text);
          case 'slugify':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          case 'jwt_decode': {
            if (!text) return 'Parâmetro "text" é obrigatório';
            const parts = text.split('.');
            if (parts.length < 2) return 'Token JWT inválido (esperado 3 partes separadas por .)';
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            if (payload.exp) payload._exp_readable = new Date(payload.exp * 1000).toISOString();
            if (payload.iat) payload._iat_readable = new Date(payload.iat * 1000).toISOString();
            return JSON.stringify({ header, payload }, null, 2);
          }
          case 'uuid':
            return crypto.randomUUID();
          case 'count':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return JSON.stringify({ chars: text.length, words: text.trim().split(/\s+/).length, lines: text.split('\n').length, bytes: Buffer.byteLength(text, 'utf8') });
          case 'json_minify':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return JSON.stringify(JSON.parse(text));
          case 'json_prettify':
            if (!text) return 'Parâmetro "text" é obrigatório';
            return JSON.stringify(JSON.parse(text), null, 2);
          default:
            return `Ação "${action}" não reconhecida. Use: base64_encode, base64_decode, md5, sha256, url_encode, url_decode, slugify, jwt_decode, uuid, count, json_minify, json_prettify`;
        }
      } catch (e) {
        return `Erro text_utils: ${e.message}`;
      }
    }

    case 'image_optimize': {
      try {
        const { input, output, width, height, quality = 80, format } = toolArgs;
        if (!input) return 'Parâmetro "input" é obrigatório';

        // Verificar se sharp está disponível
        let sharp;
        try {
          sharp = require('sharp');
        } catch (_) {
          // Fallback: tentar instalar sharp
          try {
            const { execSync: execS } = require('child_process');
            execS('npm install sharp --save 2>&1', { cwd: __dirname, timeout: 120000 });
            sharp = require('sharp');
          } catch (e2) {
            return `Erro: sharp não instalado. Execute: cd ${__dirname} && npm install sharp\n${e2.message}`;
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
    }

    case 'whatsapp_contacts': {
      try {
        const { action, search = '', limit = 50, group_jid } = toolArgs;
        if (!action) return 'Parâmetro "action" é obrigatório';

        // Obter credenciais do vault
        let apiKey = '', instanceToken = '';
        const EVOLUTION_URL = 'https://evolution.seudominio.com.br';
        const INSTANCE = 'cenora';

        try {
          if (credentialVault) {
            const allCreds = credentialVault.getAll();
            const keyCred = allCreds.find(c => c.name === 'EVOLUTION_API_KEY');
            if (keyCred) { const val = credentialVault.reveal(keyCred.id); apiKey = val.value || val || ''; }
          }
        } catch (_) {}

        if (!apiKey) return 'Erro: EVOLUTION_API_KEY não encontrada no vault';

        // Helper: requisição HTTPS à Evolution API
        function evoRequest(method, endpoint, body = null) {
          return new Promise((resolve, reject) => {
            const url = new URL(`${EVOLUTION_URL}${endpoint}`);
            const opts = {
              hostname: url.hostname,
              port: 443,
              path: url.pathname + url.search,
              method,
              headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
              },
              rejectUnauthorized: false
            };
            const req = https.request(opts, res => {
              let data = '';
              res.on('data', c => data += c);
              res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (_) { resolve(data); }
              });
            });
            req.on('error', reject);
            req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
            if (body) req.write(JSON.stringify(body));
            req.end();
          });
        }

        switch (action) {

          case 'contacts': {
            // Buscar todos os contatos e filtrar localmente (API faz match exato, não parcial)
            let contacts;
            try {
              contacts = await evoRequest('POST', `/chat/findContacts/${INSTANCE}`, {});
            } catch (e) {
              return `Erro ao buscar contatos: ${e.message}`;
            }

            if (!Array.isArray(contacts)) {
              return `Resposta inesperada: ${JSON.stringify(contacts).slice(0, 500)}`;
            }

            // Filtrar apenas contatos reais (não group_member) e por search
            let filtered = contacts.filter(c => c.type !== 'group_member' && !c.isGroup);
            if (search) {
              const term = search.toLowerCase();
              filtered = filtered.filter(c => {
                const name = (c.pushName || '').toLowerCase();
                const jid = (c.remoteJid || '').toLowerCase();
                const numero = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
                return name.includes(term) || numero.includes(term);
              });
            }

            // Limitar e formatar
            const results = filtered.slice(0, limit).map(c => {
              const jid = c.remoteJid || '';
              const numero = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
              return {
                nome: c.pushName || '(sem nome)',
                numero,
                jid,
                salvo: c.isSaved || false,
                foto: c.profilePicUrl || null
              };
            });

            return JSON.stringify({
              total_encontrados: filtered.length,
              exibindo: results.length,
              busca: search || '(todos)',
              contatos: results
            }, null, 2);
          }

          case 'groups': {
            let groups;
            try {
              groups = await evoRequest('GET', `/group/fetchAllGroups/${INSTANCE}?getParticipants=false`);
            } catch (e) {
              return `Erro ao listar grupos: ${e.message}`;
            }

            if (!Array.isArray(groups)) {
              return `Resposta inesperada: ${JSON.stringify(groups).slice(0, 500)}`;
            }

            // Filtrar por search
            let filtered = groups;
            if (search) {
              const term = search.toLowerCase();
              filtered = groups.filter(g => {
                const name = (g.subject || g.name || '').toLowerCase();
                const desc = (g.desc || g.description || '').toLowerCase();
                const id = (g.id || g.jid || '').toLowerCase();
                return name.includes(term) || desc.includes(term) || id.includes(term);
              });
            }

            const results = filtered.slice(0, limit).map(g => ({
              nome: g.subject || g.name || '(sem nome)',
              jid: g.id || g.jid || '',
              participantes: g.size || (g.participants ? g.participants.length : 0),
              descricao: (g.desc || g.description || '').slice(0, 100),
              criado_por: g.subjectOwner || g.owner || '',
              criado_em: g.subjectTime ? new Date(g.subjectTime * 1000).toISOString().split('T')[0] : ''
            }));

            return JSON.stringify({
              total_grupos: groups.length,
              encontrados: filtered.length,
              exibindo: results.length,
              busca: search || '(todos)',
              grupos: results
            }, null, 2);
          }

          case 'chats': {
            // Busca unificada: contatos + grupos, ordenados por atualização recente
            let contacts = [], groups = [];
            try {
              contacts = await evoRequest('POST', `/chat/findContacts/${INSTANCE}`, {});
            } catch (_) {}
            try {
              groups = await evoRequest('GET', `/group/fetchAllGroups/${INSTANCE}?getParticipants=false`);
            } catch (_) {}

            // Unificar em lista única
            const all = [];

            if (Array.isArray(contacts)) {
              for (const c of contacts) {
                if (c.type === 'group_member') continue;
                const jid = c.remoteJid || '';
                all.push({
                  nome: c.pushName || '(sem nome)',
                  tipo: c.isGroup ? 'grupo' : 'contato',
                  jid,
                  numero: c.isGroup ? null : jid.replace('@s.whatsapp.net', '').replace('@c.us', ''),
                  atualizado: c.updatedAt || c.createdAt || ''
                });
              }
            }

            if (Array.isArray(groups)) {
              for (const g of groups) {
                const jid = g.id || g.jid || '';
                // Evitar duplicata se já veio nos contatos
                if (!all.find(a => a.jid === jid)) {
                  all.push({
                    nome: g.subject || g.name || '(sem nome)',
                    tipo: 'grupo',
                    jid,
                    numero: null,
                    participantes: g.size || 0,
                    atualizado: ''
                  });
                }
              }
            }

            // Filtrar por search
            let filtered = all;
            if (search) {
              const term = search.toLowerCase();
              filtered = all.filter(c => {
                return (c.nome || '').toLowerCase().includes(term) || (c.numero || '').includes(term) || (c.jid || '').includes(term);
              });
            }

            // Ordenar por atualização recente
            filtered.sort((a, b) => (b.atualizado || '').localeCompare(a.atualizado || ''));

            const results = filtered.slice(0, limit);

            return JSON.stringify({
              total: all.length,
              encontrados: filtered.length,
              exibindo: results.length,
              busca: search || '(todos)',
              chats: results
            }, null, 2);
          }

          case 'group_info': {
            if (!group_jid) return 'Parâmetro "group_jid" é obrigatório para group_info';
            let info;
            try {
              info = await evoRequest('GET', `/group/findGroupInfos/${INSTANCE}?groupJid=${group_jid}`);
            } catch (e) {
              return `Erro ao buscar grupo: ${e.message}`;
            }
            return JSON.stringify(info, null, 2);
          }

          default:
            return `Ação "${action}" não reconhecida. Use: contacts, groups, chats, group_info`;
        }
      } catch (e) {
        return `Erro whatsapp_contacts: ${e.message}`;
      }
    }

    // === FERRAMENTAS PYTHON (via uv run) ===

    case 'ocr_extract':
    case 'data_transform':
    case 'video_tools':
    case 'color_palette':
    case 'html_to_pdf':
    case 'contact_validator': {
      try {
        const { execFileSync } = require('child_process');
        const scriptMap = {
          'ocr_extract': 'ocr_extract.py',
          'data_transform': 'data_transform.py',
          'video_tools': 'video_tools.py',
          'color_palette': 'color_palette.py',
          'html_to_pdf': 'html_to_pdf.py',
          'contact_validator': 'contact_validator.py',
        };
        const scriptName = scriptMap[toolName];
        const scriptPath = path.join(__dirname, 'python-tools', scriptName);

        if (!fs.existsSync(scriptPath)) {
          return `Erro: Script ${scriptPath} não encontrado`;
        }

        // Expandir ~ em caminhos dentro dos args
        const expandedArgs = { ...toolArgs };
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
          cwd: __dirname
        });

        // Tentar parsear JSON e formatar
        try {
          const parsed = JSON.parse(result.trim());
          if (parsed.error) return `Erro ${toolName}: ${parsed.error}`;
          return JSON.stringify(parsed, null, 2);
        } catch (_) {
          return result.trim() || `(${toolName} executado sem output)`;
        }
      } catch (e) {
        const stderr = e.stderr ? `\n${e.stderr.slice(0, 2000)}` : '';
        return `Erro ${toolName}: ${e.message}${stderr}`;
      }
    }

    case 'cyberpanel_site': {
      try {
        const { action, domain, email, php = '8.1', package: pkg = 'Default', owner = 'admin', ssl_method = 'cyberpanel', skip_ssl = false } = toolArgs;
        if (!action) return 'Parâmetro "action" é obrigatório';

        // Obter IP do servidor via vault
        let serverIP = '46.202.149.24';
        try {
          if (credentialVault) {
            const allCreds = credentialVault.getAll();
            const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
            if (ipCred) {
              const val = credentialVault.reveal(ipCred.id);
              serverIP = val.value || val || serverIP;
            }
          }
        } catch (_) {}

        const { execFileSync } = require('child_process');

        // Helper: executar comando SSH no servidor
        function sshExec(cmd, timeout = 60000) {
          const result = execFileSync('ssh', [
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ConnectTimeout=10',
            `root@${serverIP}`,
            cmd
          ], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 });
          return result.trim();
        }

        switch (action) {

          case 'create': {
            if (!domain) return 'Parâmetro "domain" é obrigatório para criar site';
            const adminEmail = email || `admin@${domain}`;
            const results = [];

            // 1. Verificar se site já existe
            try {
              const check = sshExec(`ls -d /home/${domain} 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"`);
              if (check.includes('EXISTS')) return `Site ${domain} já existe no servidor. Use action=ssl para reemitir SSL.`;
            } catch (_) {}

            // 2. Criar website via CyberPanel CLI
            try {
              const createCmd = `cyberpanel createWebsite --package ${pkg} --owner ${owner} --domainName ${domain} --email ${adminEmail} --php ${php}`;
              const createResult = sshExec(createCmd, 120000);
              results.push(`[CRIAR SITE] ${createResult}`);
            } catch (e) {
              return `Erro ao criar site ${domain}: ${e.stderr || e.message}`;
            }

            // 3. Garantir que o domínio está mapeado no listener HTTP (não só no Default)
            try {
              const listenerCheck = sshExec(`grep -c "map.*${domain}" /usr/local/lsws/conf/httpd_config.conf || echo "0"`);
              const mapInHTTP = sshExec(`sed -n '/^listener HTTP {/,/^}/p' /usr/local/lsws/conf/httpd_config.conf | grep -c "${domain}" || echo "0"`);

              if (mapInHTTP.trim() === '0') {
                // Adicionar mapeamento no listener HTTP
                sshExec(`sed -i '/^listener HTTP {/a\\  map                     ${domain} ${domain}' /usr/local/lsws/conf/httpd_config.conf`);
                results.push('[LISTENER HTTP] Mapeamento adicionado ao listener HTTP');
              } else {
                results.push('[LISTENER HTTP] Domínio já mapeado no listener HTTP');
              }
            } catch (e) {
              results.push(`[LISTENER HTTP] Aviso: ${e.message}`);
            }

            // 4. Criar diretório .well-known para ACME challenge
            try {
              sshExec(`mkdir -p /home/${domain}/public_html/.well-known/acme-challenge`);
              // Descobrir o usuário do site
              const siteUser = sshExec(`stat -c '%U' /home/${domain}/public_html 2>/dev/null || echo 'nobody'`);
              sshExec(`chown -R ${siteUser}:${siteUser} /home/${domain}/public_html/.well-known`);
              results.push('[ACME DIR] .well-known/acme-challenge criado');
            } catch (e) {
              results.push(`[ACME DIR] Aviso: ${e.message}`);
            }

            // 5. Reiniciar LiteSpeed para aplicar configurações
            try {
              sshExec('/usr/local/lsws/bin/lswsctrl restart');
              results.push('[OLS] OpenLiteSpeed reiniciado');
            } catch (e) {
              results.push(`[OLS] Aviso ao reiniciar: ${e.message}`);
            }

            // 6. Emitir SSL (se não skip_ssl)
            if (!skip_ssl) {
              // Aguardar um pouco para o DNS/servidor estabilizar
              try {
                const sslResult = await cyberpanelIssueSSL(sshExec, domain, ssl_method);
                results.push(sslResult);
              } catch (e) {
                results.push(`[SSL] Erro: ${e.message}. Tente novamente com: cyberpanel_site action=ssl domain=${domain}`);
              }
            } else {
              results.push('[SSL] Ignorado (skip_ssl=true)');
            }

            return results.join('\n');
          }

          case 'list': {
            try {
              const sites = sshExec(`ls -1 /home/ | grep -v '^cyberpanel$' | grep -v '^vmail$' | grep '\\.' | sort`, 30000);
              const count = sites.split('\n').filter(s => s.trim()).length;
              return `Sites no servidor (${count}):\n${sites}`;
            } catch (e) {
              return `Erro ao listar sites: ${e.message}`;
            }
          }

          case 'delete': {
            if (!domain) return 'Parâmetro "domain" é obrigatório para deletar site';
            try {
              const deleteResult = sshExec(`cyberpanel deleteWebsite --domainName ${domain}`, 60000);
              // Remover mapeamento do listener HTTP
              try {
                sshExec(`sed -i '/map.*${domain}/d' /usr/local/lsws/conf/httpd_config.conf`);
                sshExec('/usr/local/lsws/bin/lswsctrl restart');
              } catch (_) {}
              return `[DELETE] ${deleteResult}\n[CLEANUP] Mapeamento removido e OLS reiniciado`;
            } catch (e) {
              return `Erro ao deletar ${domain}: ${e.stderr || e.message}`;
            }
          }

          case 'ssl': {
            if (!domain) return 'Parâmetro "domain" é obrigatório para emitir SSL';
            try {
              const sslResult = await cyberpanelIssueSSL(sshExec, domain, ssl_method);
              return sslResult;
            } catch (e) {
              return `Erro SSL para ${domain}: ${e.message}`;
            }
          }

          default:
            return `Ação "${action}" não reconhecida. Use: create, list, delete, ssl`;
        }
      } catch (e) {
        return `Erro cyberpanel_site: ${e.message}`;
      }
    }

    default:
      return `Ferramenta "${toolName}" não reconhecida. Ferramentas disponíveis: get_credential, call_crm, fetch_api, search_kb, read_file, write_file, list_directory, delete_file, move_file, file_info, run_command, git, search_in_files, find_files, process_manager, diff_files, open_url, scrape_website, execute_node, generate_image, chrome, instagram, orchestrate, pdf_reader, csv_processor, scheduler, meta_ads, seo_check, pagespeed, google_search, maps_search, send_whatsapp, send_email, vault_manage, cyberpanel_site, dns_lookup, ssl_check, db_query, docker_manage, log_analyzer, whois_lookup, text_utils, image_optimize, ocr_extract, data_transform, video_tools, color_palette, html_to_pdf, contact_validator, whatsapp_contacts`;
  }
}

module.exports = { TOOLS_DEF, executeTool };
