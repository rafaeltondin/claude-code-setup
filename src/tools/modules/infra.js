/**
 * Tools: INFRA — cyberpanel_site, dns_lookup, ssl_check, db_query, docker_manage, log_analyzer, whois_lookup, server_health, disk_cleanup, firewall_manager, ssl_renew, dns_propagation, nginx_config, ssh_exec, scp_transfer, vhost_list, service_restart, port_forward, db_slow_queries
 */
const path = require('path');
const fs = require('fs');
const { execSync, execFileSync } = require('child_process');

// ──────────────────────────────────────────────────────────────────────────────
// Função auxiliar: emite SSL para um domínio no CyberPanel via SSH
// Tenta cyberpanel issueSSL primeiro, fallback para acme.sh, depois certbot
//
// Lições aprendidas da KB:
// - cyberpanel issueSSL emite cert autoassinado se DNS não propagou
// - LiteSpeed watchdog reinicia automaticamente e impede certbot --standalone
// - acme.sh disponível no servidor como alternativa ao certbot
// - .htaccess com regex ^. bloqueia .well-known e quebra ACME challenge
// ──────────────────────────────────────────────────────────────────────────────
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

const definitions = [
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
      name: 'server_health',
      description: 'Dashboard rápido do servidor remoto: CPU, RAM, disco, load average, uptime e top processos por consumo de memória.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'disk_cleanup',
      description: 'Identifica e limpa logs antigos, caches e arquivos temporários no servidor. Por padrão executa apenas análise (dry_run=true); set dry_run=false para limpar de verdade.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['analyze', 'clean'], description: 'analyze: mostra o que pode ser limpo. clean: executa a limpeza (exige dry_run=false).' },
          min_days: { type: 'number', description: 'Idade mínima em dias dos arquivos a considerar. Padrão: 30.' },
          dry_run: { type: 'boolean', description: 'Se true (padrão), apenas simula sem deletar. false executa a limpeza real.' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'firewall_manager',
      description: 'Gerencia regras de firewall UFW no servidor remoto. Ações: status (listar regras), allow (liberar porta), deny (bloquear porta), delete (remover regra por número).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['status', 'allow', 'deny', 'delete', 'reset'], description: 'Ação: status, allow, deny, delete (por rule_number), reset (bloqueado por segurança).' },
          port: { type: 'number', description: 'Porta para allow/deny. Ex: 3000.' },
          protocol: { type: 'string', description: 'Protocolo: tcp ou udp. Padrão: tcp.' },
          from_ip: { type: 'string', description: 'IP de origem para allow restrito. Ex: 192.168.1.100.' },
          rule_number: { type: 'number', description: 'Número da regra para delete (obtido via action=status).' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ssl_renew',
      description: 'Força renovação do certificado SSL de um domínio no servidor CyberPanel. Suporta métodos: acme (acme.sh), certbot e cyberpanel.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio para renovar SSL. Ex: meusite.com.br.' },
          method: { type: 'string', enum: ['acme', 'certbot', 'cyberpanel'], description: 'Método de emissão. Padrão: acme.' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dns_propagation',
      description: 'Verifica propagação DNS de um domínio em múltiplos resolvers globais (Google, Cloudflare, OpenDNS, Quad9, Level3). Indica se todos concordam ou se a propagação está incompleta.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio para verificar propagação. Ex: meusite.com.br.' },
          type: { type: 'string', description: 'Tipo de registro DNS: A, AAAA, CNAME, MX, TXT. Padrão: A.' }
        },
        required: ['domain']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'nginx_config',
      description: 'Gera configuração de proxy reverso no formato vhost.conf OpenLiteSpeed para um novo serviço/porta. Opcionalmente faz deploy no servidor via SSH.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domínio do vhost. Ex: app.meusite.com.br.' },
          backend_port: { type: 'number', description: 'Porta do backend local. Ex: 3000.' },
          backend_host: { type: 'string', description: 'Host do backend. Padrão: 127.0.0.1.' },
          ssl: { type: 'boolean', description: 'Incluir configuração SSL no vhost. Padrão: true.' },
          websocket: { type: 'boolean', description: 'Adicionar suporte a WebSocket (upgrade headers). Padrão: false.' },
          deploy: { type: 'boolean', description: 'Se true, faz deploy via SSH e reinicia OLS. Padrão: false.' }
        },
        required: ['domain', 'backend_port']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ssh_exec',
      description: 'Executa um comando SSH arbitrário no servidor remoto e retorna o output formatado. Bloqueia automaticamente comandos destrutivos como rm -rf /, mkfs, dd if= e fork bombs.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando SSH a executar no servidor. Ex: df -h' },
          timeout: { type: 'number', description: 'Timeout em milissegundos. Padrão: 30000.' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scp_transfer',
      description: 'Realiza upload ou download de arquivos entre a máquina local e o servidor remoto via SCP.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['upload', 'download'], description: 'upload: envia arquivo local para o servidor. download: baixa arquivo do servidor.' },
          local_path: { type: 'string', description: 'Caminho local do arquivo. Ex: /home/user/arquivo.txt ou ~/arquivo.txt' },
          remote_path: { type: 'string', description: 'Caminho remoto no servidor. Ex: /var/www/html/arquivo.txt' },
          recursive: { type: 'boolean', description: 'Transferência recursiva de diretórios. Padrão: false.' }
        },
        required: ['action', 'local_path', 'remote_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'vhost_list',
      description: 'Lista todos os vhosts OLS (OpenLiteSpeed) configurados no servidor com informações de domínio, docroot e SSL.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'service_restart',
      description: 'Controla serviços no servidor remoto: OLS, Postfix, MariaDB, PM2, Docker e Fail2ban. Suporta restart, start, stop e status.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', enum: ['ols', 'postfix', 'mariadb', 'pm2', 'docker', 'fail2ban'], description: 'Serviço a controlar.' },
          action: { type: 'string', enum: ['restart', 'start', 'stop', 'status'], description: 'Ação a executar. Padrão: restart.' }
        },
        required: ['service']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'port_forward',
      description: 'Cria ou gerencia túneis SSH para expor portas locais no servidor ou trazer portas do servidor para a máquina local.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['local', 'remote', 'list', 'kill'], description: 'local: traz porta do servidor para local. remote: expõe porta local no servidor. list: lista túneis ativos. kill: encerra túnel pelo PID.' },
          local_port: { type: 'number', description: 'Porta local para o túnel.' },
          remote_port: { type: 'number', description: 'Porta remota no servidor.' },
          background: { type: 'boolean', description: 'Executar em background. Padrão: true.' },
          pid: { type: 'number', description: 'PID do processo SSH a encerrar (necessário para action=kill).' }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'db_slow_queries',
      description: 'Analisa o slow query log do MySQL no servidor e retorna as queries mais lentas agrupadas e ordenadas por tempo total. Sugere como ativar o log se estiver desativado.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Quantidade de queries lentas a retornar. Padrão: 10.' },
          min_time: { type: 'number', description: 'Tempo mínimo em segundos para considerar uma query lenta. Padrão: 1.' }
        }
      }
    }
  },
];

const handlers = {
  async cyberpanel_site(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, domain, email, php = '8.1', package: pkg = 'Default', owner = 'admin', ssl_method = 'cyberpanel', skip_ssl = false } = args;
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
  },

  async dns_lookup(args) {
    try {
      const { domain, type: recordType = 'ALL' } = args;
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
  },

  async ssl_check(args) {
    try {
      const { domain, port = 443 } = args;
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
  },

  async db_query(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { query, database, confirm = false } = args;
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
  },

  async docker_manage(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, container, tail = 100, all = false } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

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
  },

  async log_analyzer(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { domain, log_type = 'both', lines = 200, filter, analysis = 'summary' } = args;
      if (!domain) return 'Parâmetro "domain" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

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
  },

  async whois_lookup(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { domain } = args;
      if (!domain) return 'Parâmetro "domain" é obrigatório';

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
  },

  async server_health(args, ctx) {
    try {
      const { credentialVault } = ctx;

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 30000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd
        ], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 }).trim();
      }

      const raw = sshExec(
        'uptime && free -h && df -h / /home && cat /proc/loadavg && ps aux --sort=-%mem | head -12',
        30000
      );

      return `Server Health — ${serverIP}\n${'─'.repeat(50)}\n${raw}`;
    } catch (e) {
      return `Erro server_health: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async disk_cleanup(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, min_days = 30, dry_run = true } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 60000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd
        ], { encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 }).trim();
      }

      const results = [`disk_cleanup — action=${action}, min_days=${min_days}, dry_run=${dry_run}\n${'─'.repeat(50)}`];

      if (action === 'analyze') {
        try {
          const usage = sshExec('du -sh /var/log/ /tmp/ /var/cache/ /root/.cache/ 2>/dev/null');
          results.push(`\nUso atual dos diretórios:\n${usage}`);
        } catch (e) { results.push(`\n[uso] ${e.message}`); }

        try {
          const gzLogs = sshExec(`find /var/log -name "*.gz" -mtime +${min_days} -type f 2>/dev/null | head -50`);
          results.push(`\nLogs comprimidos mais velhos que ${min_days} dias:\n${gzLogs || '(nenhum)'}`);
        } catch (e) { results.push(`\n[gz logs] ${e.message}`); }

        try {
          const tmpFiles = sshExec(`find /tmp -mtime +${min_days} -type f 2>/dev/null | head -50`);
          results.push(`\nArquivos em /tmp mais velhos que ${min_days} dias:\n${tmpFiles || '(nenhum)'}`);
        } catch (e) { results.push(`\n[tmp] ${e.message}`); }

        try {
          const journalUsage = sshExec('journalctl --disk-usage 2>/dev/null');
          results.push(`\nJournal: ${journalUsage}`);
        } catch (_) {}

        return results.join('\n');
      }

      if (action === 'clean') {
        if (dry_run) {
          // Simulação — mostra o que SERIA deletado
          results.push('\n[DRY RUN] Nenhum arquivo foi deletado. Defina dry_run=false para limpar de verdade.\n');

          try {
            const gzList = sshExec(`find /var/log -name "*.gz" -mtime +${min_days} -type f 2>/dev/null | head -50`);
            results.push(`Seriam deletados (logs .gz):\n${gzList || '(nenhum)'}`);
          } catch (e) { results.push(`[gz] ${e.message}`); }

          try {
            const tmpList = sshExec(`find /tmp -mtime +${min_days} -type f 2>/dev/null | head -50`);
            results.push(`\nSeriam deletados (/tmp):\n${tmpList || '(nenhum)'}`);
          } catch (e) { results.push(`[tmp] ${e.message}`); }

          try {
            const journalUsage = sshExec('journalctl --disk-usage 2>/dev/null');
            results.push(`\nJournal seria purgado até ${min_days} dias: ${journalUsage}`);
          } catch (_) {}

          return results.join('\n');
        }

        // Limpeza real
        try {
          sshExec(`find /var/log -name "*.gz" -mtime +${min_days} -delete 2>/dev/null; echo "OK"`);
          results.push(`[OK] Logs .gz mais velhos que ${min_days} dias deletados.`);
        } catch (e) { results.push(`[gz delete] ${e.message}`); }

        try {
          sshExec(`find /tmp -mtime +${min_days} -delete 2>/dev/null; echo "OK"`);
          results.push(`[OK] Arquivos /tmp mais velhos que ${min_days} dias deletados.`);
        } catch (e) { results.push(`[tmp delete] ${e.message}`); }

        try {
          const vacuumResult = sshExec(`journalctl --vacuum-time=${min_days}d 2>/dev/null`);
          results.push(`[OK] Journal purgado: ${vacuumResult}`);
        } catch (e) { results.push(`[journal vacuum] ${e.message}`); }

        // Mostrar espaço recuperado
        try {
          const dfAfter = sshExec('df -h / /home');
          results.push(`\nEspaço após limpeza:\n${dfAfter}`);
        } catch (_) {}

        return results.join('\n');
      }

      return `Ação "${action}" não reconhecida. Use: analyze, clean`;
    } catch (e) {
      return `Erro disk_cleanup: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async firewall_manager(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, port, protocol = 'tcp', from_ip, rule_number } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';

      if (action === 'reset') {
        return 'BLOQUEADO: reset é perigoso demais para executar remotamente. Execute manualmente no servidor se necessário.';
      }

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 20000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd
        ], { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 }).trim();
      }

      switch (action) {
        case 'status':
          return sshExec('ufw status numbered');

        case 'allow':
          if (!port) return 'Parâmetro "port" é obrigatório para allow';
          if (from_ip) {
            return sshExec(`ufw allow from ${from_ip} to any port ${port} proto ${protocol}`);
          }
          return sshExec(`ufw allow ${port}/${protocol}`);

        case 'deny':
          if (!port) return 'Parâmetro "port" é obrigatório para deny';
          return sshExec(`ufw deny ${port}/${protocol}`);

        case 'delete':
          if (!rule_number) return 'Parâmetro "rule_number" é obrigatório para delete (use action=status para ver os números)';
          return sshExec(`ufw --force delete ${rule_number}`);

        default:
          return `Ação "${action}" não reconhecida. Use: status, allow, deny, delete`;
      }
    } catch (e) {
      return `Erro firewall_manager: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async ssl_renew(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { domain, method = 'acme' } = args;
      if (!domain) return 'Parâmetro "domain" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 60000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd
        ], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 }).trim();
      }

      const result = await cyberpanelIssueSSL(sshExec, domain, method);
      return result;
    } catch (e) {
      return `Erro ssl_renew: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async dns_propagation(args) {
    try {
      const { domain, type: recordType = 'A' } = args;
      if (!domain) return 'Parâmetro "domain" é obrigatório';

      const dns = require('dns');

      const resolvers = [
        { name: 'Google',     ip: '8.8.8.8' },
        { name: 'Cloudflare', ip: '1.1.1.1' },
        { name: 'OpenDNS',    ip: '208.67.222.222' },
        { name: 'Quad9',      ip: '9.9.9.9' },
        { name: 'Level3',     ip: '4.2.2.1' },
      ];

      const results = [`DNS Propagation: ${domain} (tipo ${recordType})\n${'─'.repeat(50)}`];
      const answers = [];

      for (const resolver of resolvers) {
        try {
          const r = new dns.Resolver();
          r.setServers([resolver.ip]);

          const records = await new Promise((resolve, reject) => {
            const t = recordType.toUpperCase();
            if (t === 'A') r.resolve4(domain, (err, addrs) => err ? reject(err) : resolve(addrs));
            else if (t === 'AAAA') r.resolve6(domain, (err, addrs) => err ? reject(err) : resolve(addrs));
            else if (t === 'CNAME') r.resolveCname(domain, (err, addrs) => err ? reject(err) : resolve(addrs));
            else if (t === 'MX') r.resolveMx(domain, (err, addrs) => err ? reject(err) : resolve(addrs ? addrs.map(m => `${m.priority} ${m.exchange}`) : []));
            else if (t === 'TXT') r.resolveTxt(domain, (err, addrs) => err ? reject(err) : resolve(addrs ? addrs.map(a => a.join('')) : []));
            else if (t === 'NS') r.resolveNs(domain, (err, addrs) => err ? reject(err) : resolve(addrs));
            else reject(new Error(`Tipo ${t} não suportado`));
          });

          const answer = Array.isArray(records) ? records.join(', ') : String(records);
          answers.push(answer);
          results.push(`${resolver.name.padEnd(12)} (${resolver.ip}): ${answer}`);
        } catch (e) {
          answers.push(`ERRO: ${e.code || e.message}`);
          results.push(`${resolver.name.padEnd(12)} (${resolver.ip}): ERRO (${e.code || e.message})`);
        }
      }

      // Verificar consenso
      const validAnswers = answers.filter(a => !a.startsWith('ERRO'));
      const unique = [...new Set(validAnswers)];

      results.push('\n' + '─'.repeat(50));
      if (validAnswers.length === 0) {
        results.push('Resultado: FALHA — nenhum resolver respondeu.');
      } else if (unique.length === 1 && validAnswers.length === resolvers.length) {
        results.push(`Resultado: PROPAGADO — todos os ${resolvers.length} resolvers concordam: ${unique[0]}`);
      } else if (unique.length === 1) {
        results.push(`Resultado: PARCIAL — ${validAnswers.length}/${resolvers.length} resolvers responderam, mas concordam: ${unique[0]}`);
      } else {
        results.push(`Resultado: INCONSISTENTE — respostas divergem:\n  ${unique.join('\n  ')}\nPropagação incompleta ou DNS em transição.`);
      }

      return results.join('\n');
    } catch (e) {
      return `Erro dns_propagation: ${e.message}`;
    }
  },

  async nginx_config(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const {
        domain,
        backend_port,
        backend_host = '127.0.0.1',
        ssl = true,
        websocket = false,
        deploy = false,
      } = args;
      if (!domain) return 'Parâmetro "domain" é obrigatório';
      if (!backend_port) return 'Parâmetro "backend_port" é obrigatório';

      const wsBlock = websocket
        ? `\n  extraparam {\n    set Upgrade $http_upgrade\n    set Connection "upgrade"\n  }`
        : '';

      const sslBlock = ssl
        ? `\nvhssl  {\n  keyFile                   /etc/letsencrypt/live/${domain}/privkey.pem\n  certFile                  /etc/letsencrypt/live/${domain}/fullchain.pem\n  certChain                 1\n  sslProtocol               24\n}`
        : '';

      const config = `docRoot                   /home/${domain}/public_html
vhDomain                  ${domain}
enableGzip                1
${sslBlock}
context / {
  type                    proxy
  handler                 ${backend_host}:${backend_port}
  addDefaultCharset       off${wsBlock}
}
`;

      if (!deploy) {
        return `Configuração OLS vhost.conf para ${domain} → ${backend_host}:${backend_port}\n${'─'.repeat(60)}\n${config}\n[INFO] Para fazer deploy automático, use deploy=true`;
      }

      // Deploy via SSH
      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 30000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd
        ], { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 }).trim();
      }

      const vhostDir = `/usr/local/lsws/conf/vhosts/${domain}`;
      const vhostFile = `${vhostDir}/vhost.conf`;

      sshExec(`mkdir -p ${vhostDir}`);
      // Escrever arquivo via heredoc SSH
      const escapedConfig = config.replace(/'/g, "'\\''");
      sshExec(`cat > ${vhostFile} << 'VHOSTEOF'\n${config}\nVHOSTEOF`);
      sshExec('/usr/local/lsws/bin/lswsctrl restart');

      return `[DEPLOY OK] vhost.conf criado em ${vhostFile} e OLS reiniciado.\n\n${config}`;
    } catch (e) {
      return `Erro nginx_config: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async ssh_exec(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { command, timeout = 30000 } = args;
      if (!command) return 'Parâmetro "command" é obrigatório';

      // Bloquear comandos destrutivos
      const dangerous = [
        { pattern: /rm\s+-rf\s+\/(?:\s|$)/, label: 'rm -rf /' },
        { pattern: /mkfs/, label: 'mkfs' },
        { pattern: /dd\s+if=/, label: 'dd if=' },
        { pattern: /:\(\)\s*\{.*\|.*&.*\}/, label: 'fork bomb' },
      ];
      for (const d of dangerous) {
        if (d.pattern.test(command)) {
          return `[BLOQUEADO] Comando perigoso detectado: "${d.label}". Operação cancelada por segurança.`;
        }
      }

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      const output = execFileSync('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ConnectTimeout=10',
        `root@${serverIP}`,
        command,
      ], { encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 }).trim();

      return `[SSH] root@${serverIP} $ ${command}\n${'─'.repeat(60)}\n${output || '(sem output)'}`;
    } catch (e) {
      return `Erro ssh_exec: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async scp_transfer(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, local_path, remote_path, recursive = false } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';
      if (!local_path) return 'Parâmetro "local_path" é obrigatório';
      if (!remote_path) return 'Parâmetro "remote_path" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      const scpFlags = ['-o', 'StrictHostKeyChecking=no', ...(recursive ? ['-r'] : [])];
      let scpArgs;

      if (action === 'upload') {
        scpArgs = [...scpFlags, local_path, `root@${serverIP}:${remote_path}`];
      } else if (action === 'download') {
        scpArgs = [...scpFlags, `root@${serverIP}:${remote_path}`, local_path];
      } else {
        return 'Parâmetro "action" deve ser "upload" ou "download"';
      }

      execFileSync('scp', scpArgs, { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });

      // Verificar tamanho do arquivo transferido
      let sizeInfo = '';
      try {
        const targetPath = action === 'upload' ? remote_path : local_path;
        if (action === 'download' && fs.existsSync(local_path)) {
          const stat = fs.statSync(local_path);
          const kb = (stat.size / 1024).toFixed(1);
          sizeInfo = ` (${kb} KB)`;
        }
      } catch (_) {}

      const direction = action === 'upload'
        ? `${local_path} → root@${serverIP}:${remote_path}`
        : `root@${serverIP}:${remote_path} → ${local_path}`;

      return `[SCP OK] Transferência concluída${sizeInfo}\nDireção: ${direction}${recursive ? '\nModo: recursivo' : ''}`;
    } catch (e) {
      return `Erro scp_transfer: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async vhost_list(args, ctx) {
    try {
      const { credentialVault } = ctx;

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 30000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd,
        ], { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 }).trim();
      }

      // Listar domínios
      let domainsRaw = '';
      try {
        domainsRaw = sshExec('ls /usr/local/lsws/conf/vhosts/ 2>/dev/null');
      } catch (_) {}

      const domains = domainsRaw.split('\n').map(d => d.trim()).filter(Boolean);
      if (domains.length === 0) {
        return '[vhost_list] Nenhum vhost encontrado em /usr/local/lsws/conf/vhosts/';
      }

      const rows = [];
      for (const domain of domains) {
        let docRoot = '-';
        let certFile = '-';
        let vhDomain = domain;
        try {
          const confRaw = sshExec(
            `grep -E "docRoot|vhDomain|certFile" /usr/local/lsws/conf/vhosts/${domain}/vhost.conf 2>/dev/null || echo ""`
          );
          for (const line of confRaw.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('docRoot')) docRoot = trimmed.replace(/^docRoot\s+/, '').trim();
            if (trimmed.startsWith('vhDomain')) vhDomain = trimmed.replace(/^vhDomain\s+/, '').trim();
            if (trimmed.startsWith('certFile')) certFile = trimmed.replace(/^certFile\s+/, '').trim();
          }
        } catch (_) {}
        const ssl = certFile !== '-' ? 'SIM' : 'NÃO';
        rows.push({ domain: vhDomain, docRoot, ssl, certFile });
      }

      const header = `${'DOMÍNIO'.padEnd(40)} ${'SSL'.padEnd(5)} ${'DOCROOT'.padEnd(40)} CERT`;
      const separator = '─'.repeat(120);
      const lines = rows.map(r =>
        `${r.domain.padEnd(40)} ${r.ssl.padEnd(5)} ${r.docRoot.padEnd(40)} ${r.certFile}`
      );

      return `[vhost_list] ${rows.length} vhost(s) encontrado(s)\n${separator}\n${header}\n${separator}\n${lines.join('\n')}\n${separator}`;
    } catch (e) {
      return `Erro vhost_list: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async service_restart(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { service, action = 'restart' } = args;
      if (!service) return 'Parâmetro "service" é obrigatório';

      const validServices = ['ols', 'postfix', 'mariadb', 'pm2', 'docker', 'fail2ban'];
      const validActions = ['restart', 'start', 'stop', 'status'];
      if (!validServices.includes(service)) return `Serviço inválido. Use um de: ${validServices.join(', ')}`;
      if (!validActions.includes(action)) return `Ação inválida. Use uma de: ${validActions.join(', ')}`;

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 30000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd,
        ], { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 }).trim();
      }

      // Mapear serviço para comando
      let cmd;
      if (service === 'ols') {
        cmd = `/usr/local/lsws/bin/lswsctrl ${action}`;
      } else if (service === 'pm2') {
        if (action === 'status') {
          cmd = 'pm2 list';
        } else if (action === 'restart') {
          cmd = 'pm2 restart all';
        } else {
          cmd = `pm2 ${action} all`;
        }
      } else {
        cmd = `systemctl ${action} ${service}`;
      }

      const output = sshExec(cmd, 60000);
      return `[service_restart] ${service} → ${action}\n${'─'.repeat(50)}\n${output || '(sem output — comando executado com sucesso)'}`;
    } catch (e) {
      return `Erro service_restart: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async port_forward(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { action, local_port, remote_port, background = true, pid } = args;
      if (!action) return 'Parâmetro "action" é obrigatório';

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      const tunnelsFile = path.join(require('os').homedir(), '.claude', 'temp', 'tunnels.json');

      function loadTunnels() {
        try {
          if (fs.existsSync(tunnelsFile)) return JSON.parse(fs.readFileSync(tunnelsFile, 'utf8'));
        } catch (_) {}
        return [];
      }

      function saveTunnels(tunnels) {
        try {
          const dir = path.dirname(tunnelsFile);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(tunnelsFile, JSON.stringify(tunnels, null, 2), 'utf8');
        } catch (_) {}
      }

      if (action === 'list') {
        let psOutput = '';
        const isWindows = process.platform === 'win32';
        try {
          if (isWindows) {
            psOutput = execSync(
              'powershell -Command "Get-Process ssh -ErrorAction SilentlyContinue | Select-Object Id,StartTime,CommandLine | Format-List"',
              { encoding: 'utf8', timeout: 10000 }
            ).trim();
          } else {
            // macOS e Linux: usar ps aux para listar processos SSH
            psOutput = execSync(
              'ps aux | grep ssh | grep -v grep',
              { encoding: 'utf8', timeout: 10000 }
            ).trim();
          }
        } catch (_) {
          psOutput = '(nenhum processo SSH encontrado)';
        }
        const tunnels = loadTunnels();
        const tracked = tunnels.length > 0
          ? `\nTúneis rastreados (tunnels.json):\n${JSON.stringify(tunnels, null, 2)}`
          : '\nNenhum túnel rastreado em tunnels.json';
        return `[port_forward] Processos SSH ativos:\n${'─'.repeat(60)}\n${psOutput}${tracked}`;
      }

      if (action === 'kill') {
        if (!pid) return 'Parâmetro "pid" é obrigatório para action=kill';
        try {
          const isWindows = process.platform === 'win32';
          const killCmd = isWindows
            ? `powershell -Command "Stop-Process -Id ${pid} -Force"`
            : `kill -9 ${pid}`;
          execSync(killCmd, { encoding: 'utf8', timeout: 10000 });
          const tunnels = loadTunnels().filter(t => t.pid !== pid);
          saveTunnels(tunnels);
          return `[port_forward] Processo SSH PID ${pid} encerrado com sucesso.`;
        } catch (e) {
          return `Erro ao encerrar PID ${pid}: ${e.message}`;
        }
      }

      if (!local_port) return 'Parâmetro "local_port" é obrigatório';
      if (!remote_port) return 'Parâmetro "remote_port" é obrigatório';

      let sshArgs;
      let description;

      if (action === 'local') {
        sshArgs = ['-o', 'StrictHostKeyChecking=no', '-N', '-L', `${local_port}:127.0.0.1:${remote_port}`, `root@${serverIP}`];
        description = `LOCAL: porta do servidor ${remote_port} → localhost:${local_port}`;
      } else if (action === 'remote') {
        sshArgs = ['-o', 'StrictHostKeyChecking=no', '-N', '-R', `${remote_port}:127.0.0.1:${local_port}`, `root@${serverIP}`];
        description = `REMOTE: localhost:${local_port} → servidor:${remote_port}`;
      } else {
        return 'Parâmetro "action" deve ser "local", "remote", "list" ou "kill"';
      }

      if (background) {
        const { spawn } = require('child_process');
        const child = spawn('ssh', sshArgs, {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        const newPid = child.pid;

        const tunnels = loadTunnels();
        tunnels.push({ pid: newPid, action, local_port, remote_port, server: serverIP, created: new Date().toISOString() });
        saveTunnels(tunnels);

        return `[port_forward] Túnel criado em background.\nDescrição: ${description}\nPID: ${newPid}\nPara encerrar: ssh_exec action=kill pid=${newPid}\nTúneis salvos em: ${tunnelsFile}`;
      } else {
        execFileSync('ssh', sshArgs, { encoding: 'utf8', timeout: 300000 });
        return `[port_forward] Túnel encerrado (modo foreground).\nDescrição: ${description}`;
      }
    } catch (e) {
      return `Erro port_forward: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },

  async db_slow_queries(args, ctx) {
    try {
      const { credentialVault } = ctx;
      const { limit = 10, min_time = 1 } = args;

      let serverIP = '46.202.149.24';
      try {
        if (credentialVault) {
          const allCreds = credentialVault.getAll();
          const ipCred = allCreds.find(c => c.name === 'SERVER_IP');
          if (ipCred) { const val = credentialVault.reveal(ipCred.id); serverIP = val.value || val || serverIP; }
        }
      } catch (_) {}

      function sshExec(cmd, timeout = 30000) {
        return execFileSync('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ConnectTimeout=10',
          `root@${serverIP}`,
          cmd,
        ], { encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 }).trim();
      }

      // 1. Verificar se slow query log está ativo
      let slowLogStatus = '';
      try {
        slowLogStatus = sshExec("mysqladmin variables 2>/dev/null | grep -i slow");
      } catch (_) {}

      const isEnabled = slowLogStatus.toLowerCase().includes('on') ||
        (slowLogStatus.includes('slow_query_log') && !slowLogStatus.includes('OFF'));

      if (!isEnabled || !slowLogStatus) {
        return [
          '[db_slow_queries] Slow query log não está ativo ou não foi possível verificar.',
          '',
          'Para ativar, execute no MySQL:',
          '  SET GLOBAL slow_query_log = \'ON\';',
          `  SET GLOBAL long_query_time = ${min_time};`,
          '  SET GLOBAL slow_query_log_file = \'/var/lib/mysql/mysql-slow.log\';',
          '',
          'Para persistir após reinício, adicione ao /etc/mysql/my.cnf:',
          '  [mysqld]',
          '  slow_query_log = 1',
          `  long_query_time = ${min_time}`,
          '  slow_query_log_file = /var/lib/mysql/mysql-slow.log',
        ].join('\n');
      }

      // 2. Obter conteúdo do slow query log
      let rawLog = '';
      try {
        rawLog = sshExec(
          'tail -1000 /var/lib/mysql/*-slow.log 2>/dev/null || tail -1000 /var/log/mysql/slow.log 2>/dev/null || echo "LOG_NOT_FOUND"',
          60000
        );
      } catch (_) {}

      if (!rawLog || rawLog === 'LOG_NOT_FOUND' || rawLog.trim() === '') {
        return '[db_slow_queries] Slow query log ativo mas arquivo não encontrado ou vazio.';
      }

      // 3. Parsear o log — formato MySQL slow query
      const queryGroups = {};
      const blocks = rawLog.split(/^# User/m).filter(b => b.includes('Query_time'));

      for (const block of blocks) {
        const timeMatch = block.match(/Query_time:\s+([\d.]+)/);
        const queryMatch = block.match(/\n(SELECT|INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|SHOW)[^\n]*/i);

        if (!timeMatch || !queryMatch) continue;

        const queryTime = parseFloat(timeMatch[1]);
        if (queryTime < min_time) continue;

        // Normalizar query: substituir valores literais por ?
        let normalized = queryMatch[0].trim()
          .replace(/\b\d+(\.\d+)?\b/g, '?')
          .replace(/'[^']*'/g, '?')
          .replace(/"[^"]*"/g, '?')
          .replace(/\s+/g, ' ')
          .slice(0, 200);

        if (!queryGroups[normalized]) {
          queryGroups[normalized] = { count: 0, totalTime: 0, maxTime: 0, sample: normalized };
        }
        queryGroups[normalized].count++;
        queryGroups[normalized].totalTime += queryTime;
        if (queryTime > queryGroups[normalized].maxTime) queryGroups[normalized].maxTime = queryTime;
      }

      const sorted = Object.values(queryGroups)
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, limit);

      if (sorted.length === 0) {
        return `[db_slow_queries] Nenhuma query encontrada acima de ${min_time}s no log. O log pode estar vazio ou com poucas entradas recentes.`;
      }

      const header = `[db_slow_queries] Top ${sorted.length} queries lentas (min: ${min_time}s)\n${'═'.repeat(80)}`;
      const rows = sorted.map((q, i) => {
        const avg = (q.totalTime / q.count).toFixed(3);
        return [
          `#${i + 1} — Execuções: ${q.count} | Total: ${q.totalTime.toFixed(3)}s | Média: ${avg}s | Máx: ${q.maxTime.toFixed(3)}s`,
          `Query: ${q.sample}`,
          '─'.repeat(80),
        ].join('\n');
      });

      return `${header}\n${rows.join('\n')}`;
    } catch (e) {
      return `Erro db_slow_queries: ${(e.stderr || e.message).slice(0, 2000)}`;
    }
  },
};

module.exports = { definitions, handlers };
