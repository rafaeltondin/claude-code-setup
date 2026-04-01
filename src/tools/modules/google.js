/**
 * Tools: GOOGLE — gdrive_upload, gcalendar_create, gmail_search
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

// ---------------------------------------------------------------------------
// Helper compartilhado: obtém access token do Google
// Tenta GOOGLE_ACCESS_TOKEN primeiro; se não houver, faz refresh via OAuth2
// ---------------------------------------------------------------------------
async function getGoogleToken(credentialVault) {
  let envVars = {};
  try {
    envVars = credentialVault.getEnvVars ? credentialVault.getEnvVars() : {};
  } catch (_) {}

  if (envVars.GOOGLE_ACCESS_TOKEN) {
    return envVars.GOOGLE_ACCESS_TOKEN;
  }

  const refreshToken = envVars.GOOGLE_REFRESH_TOKEN;
  const clientId = envVars.GOOGLE_CLIENT_ID;
  const clientSecret = envVars.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      'Credenciais Google não encontradas no vault. ' +
      'Configure GOOGLE_ACCESS_TOKEN ou GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.'
    );
  }

  // POST para trocar refresh_token por access_token
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  const data = await httpPost('oauth2.googleapis.com', '/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
  });

  const parsed = JSON.parse(data);
  if (!parsed.access_token) {
    throw new Error(`Falha ao obter access_token: ${data}`);
  }
  return parsed.access_token;
}

// ---------------------------------------------------------------------------
// Utilitário HTTP HTTPS simples (sem dependências externas)
// ---------------------------------------------------------------------------
function httpPost(hostname, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyBuf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    const options = {
      hostname,
      port: 443,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Length': bodyBuf.length,
        ...extraHeaders,
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout 30s')); });
    req.write(bodyBuf);
    req.end();
  });
}

function httpGet(hostname, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: urlPath,
      method: 'GET',
      headers,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout 30s')); });
    req.end();
  });
}

// Detecta MIME type pela extensão do arquivo
function mimeByExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
  };
  return map[ext] || 'application/octet-stream';
}

// Converte "YYYY-MM-DD HH:mm" para ISO 8601 com timezone America/Sao_Paulo
function parseDateBr(dateStr) {
  if (!dateStr) return null;
  // Já é ISO 8601
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) return dateStr;
  // Formato "YYYY-MM-DD HH:mm"
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (m) {
    // -03:00 = America/Sao_Paulo (horário padrão; não leva em conta horário de verão)
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`;
  }
  return dateStr;
}

// Gera UUID v4 simples sem dependência
function uuidv4() {
  const crypto = require('crypto');
  return crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------
const definitions = [
  {
    type: 'function',
    function: {
      name: 'gdrive_upload',
      description:
        'Faz upload de um arquivo local para o Google Drive. Aceita qualquer tipo de arquivo. ' +
        'Retorna o ID, link de visualização e link de download do arquivo criado.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Caminho local do arquivo a enviar. Ex: /tmp/relatorio.pdf ou ~/Desktop/foto.png',
          },
          folder_id: {
            type: 'string',
            description: 'ID da pasta de destino no Google Drive. Opcional — se omitido, vai para o root (Meu Drive).',
          },
          title: {
            type: 'string',
            description: 'Nome do arquivo no Drive. Opcional — padrão: nome do arquivo local.',
          },
        },
        required: ['file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gcalendar_create',
      description:
        'Cria um evento no Google Calendar (calendário primário). ' +
        'Suporta convidados, localização e geração automática de link Google Meet.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título do evento.',
          },
          start: {
            type: 'string',
            description: 'Data/hora de início. Formatos aceitos: "2026-03-20 14:00" ou ISO 8601 completo.',
          },
          end: {
            type: 'string',
            description: 'Data/hora de término. Formatos aceitos: "2026-03-20 15:00" ou ISO 8601 completo.',
          },
          description: {
            type: 'string',
            description: 'Descrição ou pauta do evento. Opcional.',
          },
          attendees: {
            type: 'string',
            description: 'Emails dos convidados separados por vírgula. Ex: "joao@empresa.com,maria@empresa.com". Opcional.',
          },
          location: {
            type: 'string',
            description: 'Localização ou endereço do evento. Opcional.',
          },
          meet: {
            type: 'boolean',
            description: 'Adicionar link Google Meet ao evento. Padrão: false.',
          },
        },
        required: ['title', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_search',
      description:
        'Busca emails no Gmail usando a sintaxe de pesquisa nativa do Google ' +
        '(from:, to:, subject:, after:, before:, has:attachment, etc.). ' +
        'Retorna lista com remetente, destinatário, assunto, data e snippet.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query de busca no estilo Gmail. Ex: "from:joao@empresa.com subject:proposta after:2026/01/01"',
          },
          max_results: {
            type: 'number',
            description: 'Quantidade máxima de emails a retornar. Padrão: 10. Máximo: 50.',
          },
          include_body: {
            type: 'boolean',
            description: 'Incluir o corpo do email na resposta. Padrão: false (retorna apenas metadados e snippet).',
          },
        },
        required: ['query'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
const handlers = {
  async gdrive_upload(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const rawPath = (args.file_path || '').replace(/^~[\\/]/, os.homedir().replace(/\\/g, '/') + '/');

      if (!rawPath) {
        return JSON.stringify({ ok: false, error: 'Parâmetro "file_path" é obrigatório' });
      }

      if (!fs.existsSync(rawPath)) {
        return JSON.stringify({ ok: false, error: `Arquivo não encontrado: ${rawPath}` });
      }

      const stat = fs.statSync(rawPath);
      if (!stat.isFile()) {
        return JSON.stringify({ ok: false, error: `O caminho informado não é um arquivo: ${rawPath}` });
      }

      const token = await getGoogleToken(credentialVault);
      const fileName = args.title || path.basename(rawPath);
      const mimeType = mimeByExt(rawPath);
      const fileContent = fs.readFileSync(rawPath);

      // Multipart upload
      const boundary = `-------gdrive_upload_${Date.now()}`;
      const metadata = JSON.stringify({
        name: fileName,
        ...(args.folder_id ? { parents: [args.folder_id] } : {}),
      });

      const metaPart =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n`;

      const filePart =
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`;

      const closing = `\r\n--${boundary}--`;

      const body = Buffer.concat([
        Buffer.from(metaPart, 'utf8'),
        Buffer.from(filePart, 'utf8'),
        fileContent,
        Buffer.from(closing, 'utf8'),
      ]);

      const uploadPath =
        '/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink,webContentLink';

      const responseRaw = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          port: 443,
          path: uploadPath,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': body.length,
          },
        };
        const req = https.request(options, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout 60s')); });
        req.write(body);
        req.end();
      });

      if (responseRaw.status < 200 || responseRaw.status >= 300) {
        return JSON.stringify({
          ok: false,
          error: `Google Drive retornou status ${responseRaw.status}`,
          details: responseRaw.body,
        });
      }

      const result = JSON.parse(responseRaw.body);

      return JSON.stringify({
        ok: true,
        file_id: result.id,
        name: result.name,
        size_bytes: stat.size,
        mime_type: mimeType,
        web_view_link: result.webViewLink || null,
        download_link: result.webContentLink || null,
        message: `Arquivo "${fileName}" enviado com sucesso para o Google Drive.`,
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro gdrive_upload: ${e.message}` });
    }
  },

  async gcalendar_create(args, ctx) {
    try {
      const { credentialVault } = ctx;

      if (!args.title) return JSON.stringify({ ok: false, error: 'Parâmetro "title" é obrigatório' });
      if (!args.start) return JSON.stringify({ ok: false, error: 'Parâmetro "start" é obrigatório' });
      if (!args.end) return JSON.stringify({ ok: false, error: 'Parâmetro "end" é obrigatório' });

      const token = await getGoogleToken(credentialVault);

      const startDateTime = parseDateBr(args.start);
      const endDateTime = parseDateBr(args.end);
      const addMeet = args.meet === true;

      // Monta body do evento
      const eventBody = {
        summary: args.title,
        start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
      };

      if (args.description) eventBody.description = args.description;
      if (args.location) eventBody.location = args.location;

      if (args.attendees) {
        eventBody.attendees = args.attendees
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean)
          .map((email) => ({ email }));
      }

      if (addMeet) {
        eventBody.conferenceData = {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const bodyStr = JSON.stringify(eventBody);
      const calPath =
        '/calendar/v3/calendars/primary/events' +
        (addMeet ? '?conferenceDataVersion=1&sendUpdates=all' : '?sendUpdates=all');

      const responseRaw = await httpPost(
        'www.googleapis.com',
        calPath,
        bodyStr,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        }
      );

      let result;
      try {
        result = JSON.parse(responseRaw);
      } catch (_) {
        return JSON.stringify({ ok: false, error: 'Resposta inválida do Google Calendar', raw: responseRaw });
      }

      if (result.error) {
        return JSON.stringify({
          ok: false,
          error: `Google Calendar retornou erro: ${result.error.message || JSON.stringify(result.error)}`,
        });
      }

      // Extrai Meet link se criado
      let meetLink = null;
      if (result.conferenceData && result.conferenceData.entryPoints) {
        const meetEntry = result.conferenceData.entryPoints.find((ep) => ep.entryPointType === 'video');
        if (meetEntry) meetLink = meetEntry.uri;
      }

      // Formata data legível
      const startFormatted = new Date(startDateTime).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return JSON.stringify({
        ok: true,
        event_id: result.id,
        title: result.summary,
        start: startFormatted,
        start_iso: startDateTime,
        end_iso: endDateTime,
        html_link: result.htmlLink || null,
        meet_link: meetLink,
        attendees_count: eventBody.attendees ? eventBody.attendees.length : 0,
        message: `Evento "${args.title}" criado com sucesso.${meetLink ? ' Link Meet: ' + meetLink : ''}`,
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro gcalendar_create: ${e.message}` });
    }
  },

  async gmail_search(args, ctx) {
    try {
      const { credentialVault } = ctx;

      if (!args.query) return JSON.stringify({ ok: false, error: 'Parâmetro "query" é obrigatório' });

      const token = await getGoogleToken(credentialVault);
      const maxResults = Math.min(args.max_results || 10, 50);
      const includeBody = args.include_body === true;

      // 1. Busca IDs das mensagens
      const listPath =
        `/gmail/v1/users/me/messages?q=${encodeURIComponent(args.query)}&maxResults=${maxResults}`;

      const listRaw = await httpGet('gmail.googleapis.com', listPath, {
        Authorization: `Bearer ${token}`,
      });

      if (listRaw.status < 200 || listRaw.status >= 300) {
        return JSON.stringify({
          ok: false,
          error: `Gmail retornou status ${listRaw.status}`,
          details: listRaw.body,
        });
      }

      const listData = JSON.parse(listRaw.body);
      const messages = listData.messages || [];

      if (messages.length === 0) {
        return JSON.stringify({
          ok: true,
          query: args.query,
          total_found: 0,
          emails: [],
          message: 'Nenhum email encontrado para a query informada.',
        });
      }

      // 2. Para cada ID, busca detalhes
      const format = includeBody ? 'full' : 'metadata';
      const metaHeaders = ['From', 'To', 'Subject', 'Date'];
      const metaParams = metaHeaders.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&');

      const emailResults = [];

      for (const msg of messages) {
        try {
          const detailPath =
            `/gmail/v1/users/me/messages/${msg.id}?format=${format}&${metaParams}`;

          const detailRaw = await httpGet('gmail.googleapis.com', detailPath, {
            Authorization: `Bearer ${token}`,
          });

          if (detailRaw.status < 200 || detailRaw.status >= 300) {
            emailResults.push({ id: msg.id, error: `Status ${detailRaw.status}` });
            continue;
          }

          const detail = JSON.parse(detailRaw.body);

          // Parse dos headers
          const headers = (detail.payload && detail.payload.headers) || [];
          const getHeader = (name) => {
            const h = headers.find((hh) => hh.name.toLowerCase() === name.toLowerCase());
            return h ? h.value : null;
          };

          const email = {
            id: detail.id,
            thread_id: detail.threadId,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            snippet: detail.snippet || null,
            labels: detail.labelIds || [],
          };

          // Se includeBody, extrai texto do payload
          if (includeBody && detail.payload) {
            const extractBody = (payload) => {
              if (!payload) return null;
              // Parte direta com body
              if (payload.body && payload.body.data) {
                return Buffer.from(payload.body.data, 'base64').toString('utf8');
              }
              // Partes aninhadas — prefere text/plain, depois text/html
              if (payload.parts && payload.parts.length > 0) {
                const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
                if (plainPart && plainPart.body && plainPart.body.data) {
                  return Buffer.from(plainPart.body.data, 'base64').toString('utf8');
                }
                const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
                if (htmlPart && htmlPart.body && htmlPart.body.data) {
                  return Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
                }
                // Recursivo para multipart aninhado
                for (const part of payload.parts) {
                  const nested = extractBody(part);
                  if (nested) return nested;
                }
              }
              return null;
            };
            email.body = extractBody(detail.payload);
          }

          emailResults.push(email);
        } catch (msgErr) {
          emailResults.push({ id: msg.id, error: `Erro ao buscar detalhe: ${msgErr.message}` });
        }
      }

      return JSON.stringify({
        ok: true,
        query: args.query,
        total_found: listData.resultSizeEstimate || emailResults.length,
        returned: emailResults.length,
        emails: emailResults,
      }, null, 2);
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro gmail_search: ${e.message}` });
    }
  },
};

module.exports = { definitions, handlers };
