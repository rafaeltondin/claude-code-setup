/**
 * Tools: META ADS — meta_ads, meta_ads_audience, meta_ads_creative_upload, meta_ads_pixel_events
 */
const https = require('https');
const path = require('path');

const definitions = [
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
  {
    type: 'function',
    function: {
      name: 'meta_ads_audience',
      description: `Lista e gerencia publicos custom e lookalike no Meta Ads.
Acoes:
- list: Lista todos os publicos customizados da conta
- create_custom: Cria um publico customizado (CUSTOM, WEBSITE ou ENGAGEMENT)
- create_lookalike: Cria um publico lookalike a partir de um publico existente
- delete: Remove um publico customizado pelo audience_id`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'create_custom', 'create_lookalike', 'delete'], description: 'Acao a executar' },
          name: { type: 'string', description: 'Nome do publico (obrigatorio para create_custom e create_lookalike)' },
          description: { type: 'string', description: 'Descricao do publico (opcional)' },
          source_audience_id: { type: 'string', description: 'ID do publico de origem para criar lookalike' },
          country: { type: 'string', description: 'Codigo do pais para lookalike (default: BR)' },
          ratio: { type: 'number', description: 'Percentual do lookalike entre 0.01 (1%) e 0.20 (20%). Default: 0.01' },
          subtype: { type: 'string', enum: ['CUSTOM', 'WEBSITE', 'ENGAGEMENT'], description: 'Subtipo do publico customizado. Default: CUSTOM' },
          audience_id: { type: 'string', description: 'ID do publico (obrigatorio para delete)' },
          limit: { type: 'number', description: 'Limite de resultados para list. Default: 50' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'meta_ads_creative_upload',
      description: `Upload e listagem de criativos (imagens e videos) na biblioteca do Meta Ads.
Acoes:
- upload_image: Envia uma imagem local para a biblioteca de criativos (base64)
- upload_video: Envia um arquivo de video local via multipart/form-data
- list_images: Lista imagens cadastradas na conta
- list_videos: Lista videos cadastrados na conta`,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['upload_image', 'upload_video', 'list_images', 'list_videos'], description: 'Acao a executar' },
          file_path: { type: 'string', description: 'Caminho absoluto do arquivo a enviar (obrigatorio para upload_image e upload_video)' },
          name: { type: 'string', description: 'Nome do arquivo na biblioteca (opcional, usa o nome do arquivo por padrao)' },
          limit: { type: 'number', description: 'Limite de resultados para list_images e list_videos. Default: 20' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'meta_ads_pixel_events',
      description: `Lista eventos do pixel Meta com contagens para debug e validacao de tracking.
- Se pixel_id nao for fornecido, busca automaticamente o primeiro pixel da conta.
- Retorna nome do pixel, last_fired_time e estatisticas de eventos no periodo.`,
      parameters: {
        type: 'object',
        properties: {
          pixel_id: { type: 'string', description: 'ID do pixel (opcional — se omitido usa o primeiro pixel da conta)' },
          event_name: { type: 'string', description: 'Filtrar por nome do evento (ex: Purchase, ViewContent, AddToCart)' },
          date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'], description: 'Periodo de consulta. Default: last_7d' }
        },
        required: []
      }
    }
  }
];

const handlers = {
  async meta_ads(args, ctx) {
    const action = args.action || 'insights';

    // Buscar credenciais do vault
    let FB_TOKEN, FB_ACCOUNT_ID;
    try {
      const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
      const envVars = vault.getEnvVars();
      FB_TOKEN = envVars.FB_ACCESS_TOKEN;
      FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao acessar credenciais: ${e.message}. Verifique FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID no vault.` });
    }

    if (!FB_TOKEN) return JSON.stringify({ ok: false, error: 'FB_ACCESS_TOKEN nao encontrado no vault' });
    if (!FB_ACCOUNT_ID) return JSON.stringify({ ok: false, error: 'FB_AD_ACCOUNT_ID nao encontrado no vault' });

    const baseFields = args.fields || 'impressions,spend,clicks,ctr,cpc,actions,action_values,purchase_roas';
    const limit = args.limit || 50;
    const statusFilter = args.status || 'ALL';

    function buildDateParams() {
      let params = '';
      if (args.time_range && args.time_range.since && args.time_range.until) {
        params += `&time_range={"since":"${args.time_range.since}","until":"${args.time_range.until}"}`;
      } else if (args.date_preset) {
        params += `&date_preset=${args.date_preset}`;
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
          const campaignId = args.campaign_id;
          if (!campaignId) return JSON.stringify({ ok: false, error: 'campaign_id e obrigatorio para listar adsets' });
          raw = await metaGet(`${campaignId}/adsets?fields=id,name,status,effective_status,daily_budget,bid_strategy,targeting,optimization_goal&limit=${limit}`);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, adsets: parsed.data || [], error: parsed.error });
        }

        case 'adset_insights': {
          const adsetId = args.adset_id || args.campaign_id;
          if (!adsetId) return JSON.stringify({ ok: false, error: 'adset_id ou campaign_id e obrigatorio' });
          const level = args.adset_id ? 'adset' : 'adset';
          const entity = args.adset_id ? adsetId : `${FB_ACCOUNT_ID}`;
          raw = await metaGet(`${entity}/insights?fields=adset_id,adset_name,${baseFields}${buildDateParams()}&level=${level}&limit=${limit}`);
          parsed = JSON.parse(raw);
          if (parsed.data) parsed.data = parsed.data.map(parseActions);
          return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, data: parsed.data || [], error: parsed.error });
        }

        case 'ads': {
          const adsetId = args.adset_id;
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
  },

  async meta_ads_audience(args, ctx) {
    const action = args.action || 'list';

    // Buscar credenciais do vault
    let FB_TOKEN, FB_ACCOUNT_ID;
    try {
      const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
      const envVars = vault.getEnvVars();
      FB_TOKEN = envVars.FB_ACCESS_TOKEN;
      FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao acessar credenciais: ${e.message}. Verifique FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID no vault.` });
    }

    if (!FB_TOKEN) return JSON.stringify({ ok: false, error: 'FB_ACCESS_TOKEN nao encontrado no vault' });
    if (!FB_ACCOUNT_ID) return JSON.stringify({ ok: false, error: 'FB_AD_ACCOUNT_ID nao encontrado no vault' });

    const limit = args.limit || 50;

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

    function metaPost(endpoint, body) {
      return new Promise((resolve) => {
        const bodyStr = JSON.stringify({ ...body, access_token: FB_TOKEN });
        const options = {
          hostname: 'graph.facebook.com',
          path: `/v19.0/${endpoint}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr, 'utf8')
          },
          timeout: 30000
        };
        const req = https.request(options, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', e => resolve(JSON.stringify({ error: e.message })));
        req.write(bodyStr, 'utf8');
        req.end();
      });
    }

    function metaDelete(endpoint) {
      return new Promise((resolve) => {
        const options = {
          hostname: 'graph.facebook.com',
          path: `/v19.0/${endpoint}?access_token=${FB_TOKEN}`,
          method: 'DELETE',
          timeout: 30000
        };
        const req = https.request(options, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', e => resolve(JSON.stringify({ error: e.message })));
        req.end();
      });
    }

    try {
      let raw, parsed;

      switch (action) {
        case 'list':
          raw = await metaGet(`${FB_ACCOUNT_ID}/customaudiences?fields=id,name,approximate_count,subtype,delivery_status,time_created,description&limit=${limit}`);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, audiences: parsed.data || [], error: parsed.error });

        case 'create_custom': {
          if (!args.name) return JSON.stringify({ ok: false, error: 'name e obrigatorio para create_custom' });
          const body = {
            name: args.name,
            subtype: args.subtype || 'CUSTOM',
            description: args.description || '',
            customer_file_source: 'USER_PROVIDED_ONLY'
          };
          raw = await metaPost(`${FB_ACCOUNT_ID}/customaudiences`, body);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, audience: parsed, error: parsed.error });
        }

        case 'create_lookalike': {
          if (!args.name) return JSON.stringify({ ok: false, error: 'name e obrigatorio para create_lookalike' });
          if (!args.source_audience_id) return JSON.stringify({ ok: false, error: 'source_audience_id e obrigatorio para create_lookalike' });
          const country = args.country || 'BR';
          const ratio = args.ratio || 0.01;
          const body = {
            name: args.name,
            subtype: 'LOOKALIKE',
            origin_audience_id: args.source_audience_id,
            lookalike_spec: JSON.stringify({ type: 'similarity', country, ratio })
          };
          raw = await metaPost(`${FB_ACCOUNT_ID}/customaudiences`, body);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, audience: parsed, error: parsed.error });
        }

        case 'delete': {
          if (!args.audience_id) return JSON.stringify({ ok: false, error: 'audience_id e obrigatorio para delete' });
          raw = await metaDelete(args.audience_id);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, result: parsed, error: parsed.error });
        }

        default:
          return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida. Use: list, create_custom, create_lookalike, delete` });
      }
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro meta_ads_audience: ${e.message}` });
    }
  },

  async meta_ads_creative_upload(args, ctx) {
    const action = args.action || 'list_images';
    const fs = require('fs');

    // Buscar credenciais do vault
    let FB_TOKEN, FB_ACCOUNT_ID;
    try {
      const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
      const envVars = vault.getEnvVars();
      FB_TOKEN = envVars.FB_ACCESS_TOKEN;
      FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao acessar credenciais: ${e.message}. Verifique FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID no vault.` });
    }

    if (!FB_TOKEN) return JSON.stringify({ ok: false, error: 'FB_ACCESS_TOKEN nao encontrado no vault' });
    if (!FB_ACCOUNT_ID) return JSON.stringify({ ok: false, error: 'FB_AD_ACCOUNT_ID nao encontrado no vault' });

    const limit = args.limit || 20;

    function metaGet(endpoint) {
      return new Promise((resolve) => {
        const url = `https://graph.facebook.com/v19.0/${endpoint}&access_token=${FB_TOKEN}`;
        https.get(url, { timeout: 60000 }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        }).on('error', e => resolve(JSON.stringify({ error: e.message })));
      });
    }

    function metaPost(endpoint, body) {
      return new Promise((resolve) => {
        const bodyStr = JSON.stringify({ ...body, access_token: FB_TOKEN });
        const options = {
          hostname: 'graph.facebook.com',
          path: `/v19.0/${endpoint}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr, 'utf8')
          },
          timeout: 60000
        };
        const req = https.request(options, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', e => resolve(JSON.stringify({ error: e.message })));
        req.write(bodyStr, 'utf8');
        req.end();
      });
    }

    function metaPostMultipart(endpoint, filePath, fieldName, extraFields) {
      return new Promise((resolve) => {
        const boundary = `----MetaUpload${Date.now()}`;
        const filename = path.basename(filePath);
        let fileBuffer;
        try {
          fileBuffer = fs.readFileSync(filePath);
        } catch (e) {
          return resolve(JSON.stringify({ error: `Nao foi possivel ler o arquivo: ${e.message}` }));
        }

        const parts = [];
        // access_token
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${FB_TOKEN}`
        );
        // campos extras (ex: title)
        for (const [key, value] of Object.entries(extraFields || {})) {
          parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`);
        }
        // arquivo
        const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;

        const headerBuf = Buffer.from(parts.join('\r\n') + '\r\n' + fileHeader, 'utf8');
        const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
        const bodyBuf = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

        const options = {
          hostname: 'graph.facebook.com',
          path: `/v19.0/${endpoint}`,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': bodyBuf.length
          },
          timeout: 120000
        };
        const req = https.request(options, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', e => resolve(JSON.stringify({ error: e.message })));
        req.write(bodyBuf);
        req.end();
      });
    }

    try {
      let raw, parsed;

      switch (action) {
        case 'upload_image': {
          if (!args.file_path) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio para upload_image' });
          if (!fs.existsSync(args.file_path)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${args.file_path}` });
          const filename = args.name || path.basename(args.file_path);
          let fileBuffer;
          try {
            fileBuffer = fs.readFileSync(args.file_path);
          } catch (e) {
            return JSON.stringify({ ok: false, error: `Nao foi possivel ler o arquivo: ${e.message}` });
          }
          const base64data = fileBuffer.toString('base64');
          raw = await metaPost(`${FB_ACCOUNT_ID}/adimages`, { bytes: base64data, name: filename });
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, result: parsed, error: parsed.error });
        }

        case 'upload_video': {
          if (!args.file_path) return JSON.stringify({ ok: false, error: 'file_path e obrigatorio para upload_video' });
          if (!fs.existsSync(args.file_path)) return JSON.stringify({ ok: false, error: `Arquivo nao encontrado: ${args.file_path}` });
          const title = args.name || path.basename(args.file_path);
          raw = await metaPostMultipart(`${FB_ACCOUNT_ID}/advideos`, args.file_path, 'source', { title });
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, result: parsed, error: parsed.error });
        }

        case 'list_images':
          raw = await metaGet(`${FB_ACCOUNT_ID}/adimages?fields=id,name,url,url_128,width,height,created_time&limit=${limit}`);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, images: parsed.data || [], error: parsed.error });

        case 'list_videos':
          raw = await metaGet(`${FB_ACCOUNT_ID}/advideos?fields=id,title,length,source,thumbnails,created_time&limit=${limit}`);
          parsed = JSON.parse(raw);
          return JSON.stringify({ ok: !parsed.error, total: parsed.data?.length || 0, videos: parsed.data || [], error: parsed.error });

        default:
          return JSON.stringify({ ok: false, error: `Action "${action}" nao reconhecida. Use: upload_image, upload_video, list_images, list_videos` });
      }
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro meta_ads_creative_upload: ${e.message}` });
    }
  },

  async meta_ads_pixel_events(args, ctx) {
    // Buscar credenciais do vault
    let FB_TOKEN, FB_ACCOUNT_ID;
    try {
      const vault = require(path.join(__dirname, '..', 'credential-vault.js'));
      const envVars = vault.getEnvVars();
      FB_TOKEN = envVars.FB_ACCESS_TOKEN;
      FB_ACCOUNT_ID = envVars.FB_AD_ACCOUNT_ID;
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro ao acessar credenciais: ${e.message}. Verifique FB_ACCESS_TOKEN e FB_AD_ACCOUNT_ID no vault.` });
    }

    if (!FB_TOKEN) return JSON.stringify({ ok: false, error: 'FB_ACCESS_TOKEN nao encontrado no vault' });
    if (!FB_ACCOUNT_ID) return JSON.stringify({ ok: false, error: 'FB_AD_ACCOUNT_ID nao encontrado no vault' });

    const datePreset = args.date_preset || 'last_7d';

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

    // Calcular timestamps para date_preset
    function getTimeRange(preset) {
      const now = Math.floor(Date.now() / 1000);
      const presetMap = {
        today: 86400,
        yesterday: 86400 * 2,
        last_7d: 86400 * 7,
        last_14d: 86400 * 14,
        last_30d: 86400 * 30,
        this_month: 86400 * 30,
        last_month: 86400 * 60
      };
      const seconds = presetMap[preset] || 86400 * 7;
      return { start_time: now - seconds, end_time: now };
    }

    try {
      let pixelId = args.pixel_id;
      let pixelName = '';
      let pixelLastFired = '';

      // Se nao foi fornecido pixel_id, buscar o primeiro pixel da conta
      if (!pixelId) {
        const rawPixels = await metaGet(`${FB_ACCOUNT_ID}/adspixels?fields=id,name,code`);
        const parsedPixels = JSON.parse(rawPixels);
        if (parsedPixels.error) {
          return JSON.stringify({ ok: false, error: `Erro ao buscar pixels: ${parsedPixels.error.message}` });
        }
        if (!parsedPixels.data || parsedPixels.data.length === 0) {
          return JSON.stringify({ ok: false, error: 'Nenhum pixel encontrado na conta' });
        }
        pixelId = parsedPixels.data[0].id;
        pixelName = parsedPixels.data[0].name || '';
      }

      // Buscar info do pixel
      const rawPixelInfo = await metaGet(`${pixelId}?fields=id,name,last_fired_time,is_created_by_business`);
      const pixelInfo = JSON.parse(rawPixelInfo);
      if (!pixelInfo.error) {
        pixelName = pixelInfo.name || pixelName;
        pixelLastFired = pixelInfo.last_fired_time || '';
      }

      // Buscar estatisticas de eventos
      const { start_time, end_time } = getTimeRange(datePreset);
      let statsEndpoint = `${pixelId}/stats?aggregation=event&start_time=${start_time}&end_time=${end_time}`;
      if (args.event_name) {
        statsEndpoint += `&event=${encodeURIComponent(args.event_name)}`;
      }
      const rawStats = await metaGet(statsEndpoint);
      const parsedStats = JSON.parse(rawStats);

      return JSON.stringify({
        ok: !parsedStats.error,
        pixel_id: pixelId,
        pixel_name: pixelName,
        last_fired_time: pixelLastFired,
        date_preset: datePreset,
        events: parsedStats.data || [],
        error: parsedStats.error
      });
    } catch (e) {
      return JSON.stringify({ ok: false, error: `Erro meta_ads_pixel_events: ${e.message}` });
    }
  }
};

module.exports = { definitions, handlers };
