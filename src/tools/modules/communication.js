/**
 * Tools: COMMUNICATION — send_whatsapp, send_email, send_telegram, whatsapp_contacts, instagram, voice_message, sentiment_analyzer
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const definitions = [
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
      description: 'Envia mensagem, foto, vídeo, áudio ou documento via Telegram Bot. Suporta arquivo local (path), URL ou texto puro.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto da mensagem (enviado como mensagem de texto se nenhum arquivo fornecido, ou como caption se arquivo presente)' },
          file: { type: 'string', description: 'Caminho local do arquivo ou URL. Opcional. Tipo detectado automaticamente pela extensão.' },
          type: { type: 'string', enum: ['auto', 'photo', 'video', 'audio', 'document'], description: 'Tipo de mídia. Padrão: auto (detecta pela extensão). Use "document" para forçar envio como arquivo.' },
          chatId: { type: 'string', description: 'Chat ID destino. Opcional — se omitido, envia para o chatId padrão configurado.' }
        },
        required: []
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
      name: 'voice_message',
      description: 'Gera um áudio com ElevenLabs TTS e envia como mensagem de voz via WhatsApp. Útil para comunicações mais pessoais e humanizadas.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a ser convertido em áudio' },
          number: { type: 'string', description: 'Número WhatsApp com DDI. Ex: 5548999999999' },
          voice: { type: 'string', description: 'Voz a usar: "Onildo" (pt-BR masculino) ou "Rachel" (en feminino). Padrão: Onildo' }
        },
        required: ['text', 'number']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sentiment_analyzer',
      description: 'Analisa o sentimento de um texto em PT-BR (positivo/negativo/neutro) usando análise léxica sem API externa. Retorna score, matches positivos/negativos e nível de confiança.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a analisar' },
          language: { type: 'string', description: 'Idioma do texto. Padrão: "pt" (português). Atualmente suporta apenas pt.' }
        },
        required: ['text']
      }
    }
  },
];

const handlers = {
  async send_whatsapp(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { number, text, mediaUrl, mediaType, caption } = args;
      if (!number || !text) return 'Erro: number e text são obrigatórios';

      // Evolution API remota (servidor CyberPanel)
      const EVOLUTION_URL = 'https://evolution.YOUR-USER.com.br';
      const INSTANCE = 'cenora';

      // Obter API key do vault
      let apiKey = '';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const keyCred = allCreds.find(c => c.name === 'EVOLUTION_API_KEY');
          if (keyCred) { const val = credentialVault.reveal(keyCred.id); apiKey = val.value || val || ''; }
        }
      } catch (_) {}
      if (!apiKey) return 'Erro: EVOLUTION_API_KEY não encontrada no vault';

      // Helper: requisição HTTPS à Evolution API
      function evoSend(endpoint, body) {
        return new Promise((resolve, reject) => {
          const url = new URL(`${EVOLUTION_URL}${endpoint}`);
          const bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
          const opts = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Length': bodyBuf.length
            },
            rejectUnauthorized: false
          };
          const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
              catch (_) { resolve({ status: res.statusCode, data }); }
            });
          });
          req.on('error', reject);
          req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout 30s')); });
          req.write(bodyBuf);
          req.end();
        });
      }

      // Normalizar número: adicionar @s.whatsapp.net se não tiver
      const numStr = String(number);
      const normalizedNumber = numStr.includes('@') ? numStr : `${numStr.replace(/\D/g, '')}@s.whatsapp.net`;

      const isMedia = mediaUrl && mediaType;
      let result;

      if (isMedia) {
        // Enviar mídia (imagem, vídeo, documento)
        result = await evoSend(`/message/sendMedia/${INSTANCE}`, {
          number: normalizedNumber,
          mediatype: mediaType,
          media: mediaUrl,
          caption: caption || text,
          fileName: mediaUrl.split('/').pop() || 'file'
        });
      } else {
        // Enviar texto simples
        result = await evoSend(`/message/sendText/${INSTANCE}`, {
          number: normalizedNumber,
          text
        });
      }

      if (result.status === 201 || result.status === 200) {
        const key = result.data?.key;
        return `WhatsApp enviado com sucesso!\nStatus: ${result.status}\nID: ${key?.id || 'N/A'}\nPara: ${key?.remoteJid || number}`;
      } else {
        return `Erro WhatsApp: HTTP ${result.status}\n${JSON.stringify(result.data, null, 2)}`;
      }
    } catch (e) {
      return `Erro WhatsApp: ${e.message}`;
    }
  },

  async send_email(args, ctx) {
    return new Promise((resolve) => {
      const { CRM_BASE, CRM_TOKEN } = ctx;
      const { to, subject, body: emailBody, html } = args;
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
  },

  async send_telegram(args, ctx) {
    return new Promise((resolve) => {
      const { CRM_BASE, CRM_TOKEN } = ctx;
      const { text, file, type: mediaType, chatId } = args;

      // Se não tem arquivo, envia texto simples via API do bot
      if (!file) {
        if (!text) return resolve('Erro Telegram: forneça text ou file');
        const payload = { message: text, chatId: chatId || undefined };
        const bodyBuf = Buffer.from(JSON.stringify(payload), 'utf8');
        const crmUrl = new URL(CRM_BASE);
        const opts = {
          hostname: crmUrl.hostname,
          port: parseInt(crmUrl.port) || 80,
          path: '/api/telegram/send',
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
        req.setTimeout(15000, () => { req.destroy(); resolve('Erro Telegram: timeout de 15s'); });
        req.on('error', e => resolve(`Erro Telegram: ${e.message}`));
        req.write(bodyBuf);
        req.end();
        return;
      }

      // Com arquivo: detectar tipo e chamar endpoint correto
      const ext = (file.match(/\.(\w+)$/)?.[1] || '').toLowerCase();
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
      const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
      const audioExts = ['mp3', 'ogg', 'wav', 'flac', 'm4a', 'aac'];

      let detectedType = mediaType || 'auto';
      if (detectedType === 'auto') {
        if (imageExts.includes(ext)) detectedType = 'photo';
        else if (videoExts.includes(ext)) detectedType = 'video';
        else if (audioExts.includes(ext)) detectedType = 'audio';
        else detectedType = 'document';
      }

      const endpointMap = {
        photo: '/api/telegram/send-photo',
        video: '/api/telegram/send-video',
        audio: '/api/telegram/send-audio',
        document: '/api/telegram/send-document'
      };
      const endpoint = endpointMap[detectedType] || '/api/telegram/send-file';

      // Verificar se é caminho local ou URL
      const isUrl = file.startsWith('http://') || file.startsWith('https://');
      const isLocalPath = !isUrl;

      if (isLocalPath) {
        // Enviar via multipart/form-data com arquivo local
        const filePath = file.startsWith('~')
          ? require('path').join(process.env.HOME || process.env.USERPROFILE || '', file.slice(1))
          : require('path').resolve(file);

        if (!require('fs').existsSync(filePath)) {
          return resolve(`Erro Telegram: arquivo não encontrado: ${filePath}`);
        }

        const boundary = '----TelegramBoundary' + Date.now();
        const fileName = require('path').basename(filePath);
        const fileData = require('fs').readFileSync(filePath);
        const fieldName = detectedType === 'photo' ? 'photo' : detectedType === 'video' ? 'video' : detectedType === 'audio' ? 'audio' : detectedType === 'document' ? 'document' : 'file';

        const parts = [];
        // Campo file
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
        parts.push(fileData);
        parts.push(Buffer.from('\r\n'));
        // Campo caption
        if (text) {
          parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${text}\r\n`));
        }
        // Campo chatId
        if (chatId) {
          parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chatId"\r\n\r\n${chatId}\r\n`));
        }
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const body = Buffer.concat(parts);
        const crmUrl = new URL(CRM_BASE);
        const opts = {
          hostname: crmUrl.hostname,
          port: parseInt(crmUrl.port) || 80,
          path: endpoint,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CRM_TOKEN}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          }
        };
        const req = http.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(`HTTP ${res.statusCode}\n${data}`));
        });
        req.setTimeout(60000, () => { req.destroy(); resolve('Erro Telegram: timeout de 60s (arquivo grande?)'); });
        req.on('error', e => resolve(`Erro Telegram: ${e.message}`));
        req.write(body);
        req.end();
      } else {
        // URL: enviar via JSON com campo url
        const payload = { url: file, caption: text || '', chatId: chatId || undefined };
        const bodyBuf = Buffer.from(JSON.stringify(payload), 'utf8');
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
        req.setTimeout(30000, () => { req.destroy(); resolve('Erro Telegram: timeout de 30s'); });
        req.on('error', e => resolve(`Erro Telegram: ${e.message}`));
        req.write(bodyBuf);
        req.end();
      }
    });
  },

  async whatsapp_contacts(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, search = '', limit = 50, group_jid } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';

      // Obter credenciais do vault
      let apiKey = '';
      const EVOLUTION_URL = 'https://evolution.YOUR-USER.com.br';
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
  },

  async voice_message(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { text, number, voice = 'Onildo' } = args;
      if (!text) return 'Erro: parâmetro "text" é obrigatório';
      if (!number) return 'Erro: parâmetro "number" é obrigatório';

      // Mapeamento de vozes
      const voiceMap = {
        'Onildo': 'nWGFsjeb1hzL15rFe7qi',
        'Rachel': '21m00Tcm4TlvDq8ikWAM'
      };
      const voiceId = voiceMap[voice] || voiceMap['Onildo'];

      // Buscar API key do ElevenLabs
      let elevenLabsKey = '';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const keyCred = allCreds.find(c => c.name === 'ELEVENLABS_API_KEY');
          if (keyCred) { const val = credentialVault.reveal(keyCred.id); elevenLabsKey = val.value || val || ''; }
        }
      } catch (_) {}
      if (!elevenLabsKey) return 'Erro: ELEVENLABS_API_KEY não encontrada no vault';

      // Buscar API key da Evolution
      let evoKey = '';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const keyCred = allCreds.find(c => c.name === 'EVOLUTION_API_KEY');
          if (keyCred) { const val = credentialVault.reveal(keyCred.id); evoKey = val.value || val || ''; }
        }
      } catch (_) {}
      if (!evoKey) return 'Erro: EVOLUTION_API_KEY não encontrada no vault';

      // 1. Gerar TTS via ElevenLabs
      const ttsBody = JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.75, similarity_boost: 0.75 }
      });

      const audioBuffer = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.elevenlabs.io',
          port: 443,
          path: `/v1/text-to-speech/${voiceId}`,
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
            'Content-Length': Buffer.byteLength(ttsBody, 'utf8')
          }
        };
        const req = https.request(opts, res => {
          if (res.statusCode !== 200) {
            let errData = '';
            res.on('data', c => errData += c);
            res.on('end', () => reject(new Error(`ElevenLabs HTTP ${res.statusCode}: ${errData.substring(0, 200)}`)));
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout ElevenLabs 30s')); });
        req.on('error', reject);
        req.write(ttsBody, 'utf8');
        req.end();
      });

      // 2. Salvar arquivo MP3
      const os = require('os');
      const tempDir = path.join(os.homedir(), '.claude', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const audioPath = path.join(tempDir, `voice_${Date.now()}.mp3`);
      fs.writeFileSync(audioPath, audioBuffer);

      // 3. Converter para base64 e enviar via Evolution API como áudio
      const audioBase64 = audioBuffer.toString('base64');
      const EVOLUTION_URL = 'https://evolution.YOUR-USER.com.br';
      const INSTANCE = 'cenora';

      const numStr = String(number);
      const normalizedNumber = numStr.includes('@') ? numStr : `${numStr.replace(/\D/g, '')}@s.whatsapp.net`;

      const evoBody = JSON.stringify({
        number: normalizedNumber,
        audio: audioBase64,
        encoding: true
      });

      const evoResult = await new Promise((resolve, reject) => {
        const evoBodyBuf = Buffer.from(evoBody, 'utf8');
        const opts = {
          hostname: new URL(EVOLUTION_URL).hostname,
          port: 443,
          path: `/message/sendWhatsAppAudio/${INSTANCE}`,
          method: 'POST',
          headers: {
            'apikey': evoKey,
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': evoBodyBuf.length
          },
          rejectUnauthorized: false
        };
        const req = https.request(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
            catch (_) { resolve({ status: res.statusCode, data }); }
          });
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout Evolution 30s')); });
        req.on('error', reject);
        req.write(evoBodyBuf);
        req.end();
      });

      if (evoResult.status === 200 || evoResult.status === 201) {
        const key = evoResult.data?.key;
        return `Mensagem de voz enviada com sucesso!\nPara: ${number}\nVoz: ${voice}\nDuração do áudio: ~${Math.round(audioBuffer.length / 16000)}s\nArquivo salvo: ${audioPath}\nID: ${key?.id || 'N/A'}`;
      } else {
        return `Erro ao enviar áudio via WhatsApp: HTTP ${evoResult.status}\n${JSON.stringify(evoResult.data, null, 2)}\nÁudio salvo em: ${audioPath}`;
      }
    } catch (e) {
      return `Erro voice_message: ${e.message}`;
    }
  },

  async sentiment_analyzer(args, ctx) {
    try {
      const { text, language = 'pt' } = args;
      if (!text) return JSON.stringify({ ok: false, error: 'Parâmetro "text" é obrigatório' });

      const POSITIVE_WORDS = [
        'bom', 'boa', 'bons', 'boas', 'ótimo', 'ótima', 'excelente', 'maravilhoso', 'maravilhosa',
        'perfeito', 'perfeita', 'incrível', 'fantástico', 'fantástica', 'adorei', 'amei', 'parabéns',
        'obrigado', 'obrigada', 'feliz', 'satisfeito', 'satisfeita', 'recomendo', 'melhor', 'top',
        'show', 'demais', 'sensacional', 'nota 10', 'nota10', 'aprovado', 'aprovada', 'eficiente',
        'rápido', 'rápida', 'fácil', 'lindo', 'linda', 'sucesso', 'ótimos', 'ótimas', 'adorável',
        'adorei', 'gostei', 'recomendo', 'funciona', 'funcionou', 'perfeição', 'qualidade',
        'confiável', 'confiança', 'entrega rápida', 'atendimento', 'atendeu', 'superou'
      ];

      const NEGATIVE_WORDS = [
        'ruim', 'péssimo', 'péssima', 'horrível', 'terrível', 'problema', 'problemas', 'erro',
        'falha', 'lento', 'lenta', 'difícil', 'caro', 'cara', 'decepção', 'decepcionado',
        'decepcionada', 'frustrado', 'frustrada', 'irritado', 'irritada', 'insatisfeito',
        'insatisfeita', 'reclamação', 'pior', 'nunca', 'odiei', 'detestei', 'vergonha',
        'absurdo', 'absurda', 'inaceitável', 'defeito', 'defeituoso', 'quebrou', 'não funciona',
        'cancelar', 'cancelei', 'devolução', 'devolver', 'fraude', 'golpe', 'enganou', 'mentira',
        'demora', 'demorou', 'perdeu', 'sumiu', 'desapareceu', 'cobrou errado', 'cobrança indevida'
      ];

      const textLower = text.toLowerCase();

      // Conta matches positivos
      const positiveMatches = [];
      for (const word of POSITIVE_WORDS) {
        if (textLower.includes(word)) {
          positiveMatches.push(word);
        }
      }

      // Conta matches negativos
      const negativeMatches = [];
      for (const word of NEGATIVE_WORDS) {
        if (textLower.includes(word)) {
          negativeMatches.push(word);
        }
      }

      const pos = positiveMatches.length;
      const neg = negativeMatches.length;

      // Score normalizado: -1 a +1
      const score = (pos - neg) / (pos + neg + 1);

      // Classifica sentimento
      let sentiment;
      if (score > 0.2) sentiment = 'POSITIVO';
      else if (score < -0.2) sentiment = 'NEGATIVO';
      else sentiment = 'NEUTRO';

      // Confiança: quanto maior a diferença e mais matches, mais confiante
      const totalMatches = pos + neg;
      const rawConfidence = totalMatches === 0 ? 0 : Math.min(1, Math.abs(score) * (1 + Math.log(totalMatches + 1) / 3));
      const confidence = parseFloat(rawConfidence.toFixed(2));

      return JSON.stringify({
        ok: true,
        sentiment,
        score: parseFloat(score.toFixed(4)),
        confidence,
        positive_count: pos,
        negative_count: neg,
        positive_matches: [...new Set(positiveMatches)],
        negative_matches: [...new Set(negativeMatches)],
        text_length: text.length,
        summary: `Sentimento ${sentiment} (score: ${score.toFixed(2)}, confiança: ${(confidence * 100).toFixed(0)}%)`
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro sentiment_analyzer: ${e.message}` });
    }
  },

  async instagram(args) {
    const action = args.action || '';
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
      const amount = args.amount;
      const username = args.username || '';

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
          const q = args.posts ? `?posts=${args.posts}` : '';
          result = await instaRequest('GET', `/user/${encodeURIComponent(username)}${q}`);
          break;
        }
        case 'my_posts': {
          const q = amount ? `?amount=${amount}` : '';
          result = await instaRequest('GET', `/my/posts${q}`);
          break;
        }
        case 'hashtag': {
          const tag = args.tag || '';
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
          result = await instaRequest('POST', '/like', { media_id: args.media_id || '' });
          break;
        case 'unlike':
          result = await instaRequest('POST', '/unlike', { media_id: args.media_id || '' });
          break;
        case 'comment':
          result = await instaRequest('POST', '/comment', { media_id: args.media_id || '', text: args.text || '' });
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
          result = await instaRequest('POST', '/dm', { username, text: args.text || '' });
          break;
        case 'dm_inbox': {
          const q = amount ? `?amount=${amount}` : '';
          result = await instaRequest('GET', `/dm/inbox${q}`);
          break;
        }
        case 'post_photo':
          result = await instaRequest('POST', '/post/photo', { image_path: args.image_path || '', caption: args.caption || '' });
          break;
        case 'post_reel':
          result = await instaRequest('POST', '/post/reel', { video_path: args.video_path || '', caption: args.caption || '', thumbnail_path: args.thumbnail_path || null });
          break;
        case 'story':
          result = await instaRequest('POST', '/story', { image_path: args.image_path || '' });
          break;
        case 'search_users': {
          const q = encodeURIComponent(args.query || '');
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
  },
};

module.exports = { definitions, handlers };
