# SERVER BACKUP GDRIVE — TUTORIAL DE RESTAURAÇÃO

> **LEIA ISSO PRIMEIRO:** Este documento é para emergências. Se seu servidor caiu, respire fundo e siga os passos na ordem. Cada seção tem comandos prontos para copiar e colar.

---

## 1. VISÃO GERAL

### O que é

Sistema de backup automático do servidor `srv410981` (Hostinger VPS) para o Google Drive. Roda diariamente às 3h via systemd timer e mantém histórico rotativo de backups.

### Onde está

```
Servidor:   srv410981 — 46.202.149.24
Projeto:    /opt/backup-gdrive/
Script:     /opt/backup-gdrive/restore.js
Drive:      ServerBackups-CyberPanel/YYYY-MM-DD/
```

### O que é salvo

| Pacote       | Arquivo           | Conteúdo                                      |
|--------------|-------------------|-----------------------------------------------|
| `databases`  | databases.sql.gz  | Todos os bancos MariaDB 10.6                  |
| `sites`      | sites.tar.gz      | /home/*/public_html + vhosts OLS + SSL certs  |
| `docker`     | docker.tar.gz     | Imagens + volumes + compose configs           |
| `email`      | email.tar.gz      | /home/vmail + Postfix/Dovecot/DKIM            |
| `configs`    | configs.tar.gz    | CyberPanel + OLS conf + cron + fail2ban       |

### Retenção

- **7 diários** (últimos 7 dias)
- **4 semanais** (últimas 4 semanas)
- **2 mensais** (últimos 2 meses)

### Notificações

Cada backup bem-sucedido (ou com falha) envia e-mail para `tondinrafael@gmail.com`.

---

## 2. CENÁRIOS DE DESASTRE

Use esta tabela para decidir o que restaurar:

| Situação | O que restaurar | Seção |
|----------|----------------|-------|
| Servidor novo/limpo após falha catastrófica | TUDO | Seção 4 |
| Banco de dados corrompido ou deletado | Só databases | Seção 5.1 |
| Site hackeado ou arquivos deletados | Só sites | Seção 5.2 |
| Container Docker parou de funcionar | Só docker | Seção 5.3 |
| E-mail perdido ou configuração quebrada | Só email | Seção 5.4 |
| Configurações do servidor alteradas incorretamente | Só configs | Seção 5.5 |
| Quer verificar integridade sem restaurar | Verificação | Seção 3.3 |

---

## 3. ACESSO RÁPIDO

### 3.1 Conectar ao servidor

```bash
ssh root@46.202.149.24
```

### 3.2 Listar backups disponíveis

```bash
cd /opt/backup-gdrive
node restore.js
```

A saída mostra algo como:

```
Backups disponíveis no Google Drive:
  [0] 2026-03-14  (mais recente)
  [1] 2026-03-13
  [2] 2026-03-12
  [3] 2026-03-11
  ...
```

### 3.3 Verificar integridade de um backup (sem restaurar)

```bash
cd /opt/backup-gdrive

# Verificar o mais recente
node restore.js --latest --verify

# Verificar data específica
node restore.js --date 2026-03-14 --verify
```

O script baixa o `manifest.json` e valida os checksums SHA256 de cada arquivo. Se tudo estiver íntegro, aparece `✓ Todos os checksums validados`.

---

## 4. RESTAURAÇÃO COMPLETA (SERVIDOR NOVO OU CATÁSTROFE TOTAL)

Use quando o servidor foi reinstalado do zero ou perdeu todos os dados.

### Pré-requisitos no servidor novo

O servidor precisa ter antes de restaurar:

```bash
# 1. Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 2. MariaDB 10.6
apt-get install -y mariadb-server
systemctl start mariadb

# 3. Docker
curl -fsSL https://get.docker.com | bash
systemctl start docker

# 4. OpenLiteSpeed (ou via CyberPanel)
# Se reinstalando CyberPanel completo:
wget -O installer.sh https://cyberpanel.net/install.sh
bash installer.sh

# 5. Clonar o projeto de backup
cd /opt
git clone <repositorio-do-backup-gdrive> backup-gdrive
cd backup-gdrive
npm install
```

### Restauração completa com um comando

```bash
cd /opt/backup-gdrive

# Baixa o backup mais recente E restaura tudo
node restore.js --latest --apply
```

O script executa na seguinte ordem:
1. Baixa todos os pacotes do Drive
2. Valida checksums do manifest.json
3. Restaura configs
4. Restaura databases
5. Restaura sites
6. Restaura email
7. Restaura docker
8. Reinicia serviços

**Tempo estimado:** 15–40 minutos dependendo do tamanho total dos dados.

### Restauração completa de data específica

```bash
cd /opt/backup-gdrive
node restore.js --date 2026-03-14 --apply
```

---

## 5. RESTAURAÇÃO PARCIAL

### 5.1 Restaurar apenas o banco de dados

```bash
cd /opt/backup-gdrive

# Do backup mais recente
node restore.js --latest --apply --only db

# De data específica
node restore.js --date 2026-03-14 --apply --only db
```

> **ATENÇÃO:** Isso sobrescreve TODOS os bancos existentes. Se quiser restaurar apenas um banco específico, use a Seção 6.1.

### 5.2 Restaurar apenas os sites

```bash
cd /opt/backup-gdrive

# Do backup mais recente
node restore.js --latest --apply --only sites

# De data específica
node restore.js --date 2026-03-14 --apply --only sites
```

Restaura `/home/*/public_html`, virtual hosts do OLS e certificados SSL.

### 5.3 Restaurar apenas o Docker

```bash
cd /opt/backup-gdrive

# Do backup mais recente
node restore.js --latest --apply --only docker

# De data específica
node restore.js --date 2026-03-14 --apply --only docker
```

Restaura as imagens, volumes e arquivos docker-compose (incluindo `/opt/motion-api`).

Após restaurar, verifique o motion-api:

```bash
cd /opt/motion-api
docker compose up -d
docker compose ps
```

### 5.4 Restaurar apenas o e-mail

```bash
cd /opt/backup-gdrive

# Do backup mais recente
node restore.js --latest --apply --only email

# De data específica
node restore.js --date 2026-03-14 --apply --only email
```

Restaura `/home/vmail` e as configurações de Postfix, Dovecot e chaves DKIM/DMARC.

Após restaurar, reinicie os serviços de e-mail:

```bash
systemctl restart postfix dovecot
systemctl status postfix dovecot
```

### 5.5 Restaurar apenas as configurações

```bash
cd /opt/backup-gdrive

# Do backup mais recente
node restore.js --latest --apply --only configs

# De data específica
node restore.js --date 2026-03-14 --apply --only configs
```

Restaura configurações do CyberPanel, OLS, cron jobs e fail2ban.

Após restaurar:

```bash
systemctl restart lsws
cyberpanel reloadServer
```

---

## 6. RESTAURAÇÃO MANUAL (SEM O SCRIPT)

Use quando o script `restore.js` não estiver disponível ou quando precisar restaurar algo muito específico.

### 6.1 Restaurar um único banco de dados

```bash
# 1. Baixe databases.sql.gz do Google Drive manualmente
# (ou copie via scp de outra máquina)

# 2. Listar os bancos dentro do arquivo
gunzip -c databases.sql.gz | grep "^-- Current Database"

# 3. Extrair apenas um banco específico
gunzip -c databases.sql.gz | \
  awk '/^-- Current Database: `nome_do_banco`/,/^-- Current Database: `/' | \
  mysql -u root nome_do_banco

# 4. Restaurar TODOS os bancos
gunzip -c databases.sql.gz | mysql -u root
```

### 6.2 Restaurar sites manualmente

```bash
# 1. Baixe sites.tar.gz

# 2. Ver o conteúdo antes de extrair
tar tzf sites.tar.gz | head -30

# 3. Restaurar tudo
tar xzf sites.tar.gz -C /

# 4. Restaurar apenas um site específico
tar xzf sites.tar.gz -C / home/nome_do_site/

# 5. Ajustar permissões
chown -R nobody:nobody /home/*/public_html
```

### 6.3 Restaurar Docker manualmente

```bash
# 1. Baixe docker.tar.gz

# 2. Extrair
tar xzf docker.tar.gz -C /tmp/docker-restore/

# 3. Carregar imagens
docker load < /tmp/docker-restore/images.tar.gz

# 4. Restaurar volumes
# (volumes ficam em /tmp/docker-restore/volumes/)
docker run --rm \
  -v nome_do_volume:/volume \
  -v /tmp/docker-restore/volumes/nome_do_volume:/backup \
  alpine tar xzf /backup/volume.tar.gz -C /volume

# 5. Restaurar compose configs
cp -r /tmp/docker-restore/compose/opt/motion-api /opt/

# 6. Subir containers
cd /opt/motion-api
docker compose up -d
```

### 6.4 Restaurar e-mail manualmente

```bash
# 1. Baixe email.tar.gz

# 2. Parar serviços antes de restaurar
systemctl stop postfix dovecot

# 3. Restaurar
tar xzf email.tar.gz -C /

# 4. Ajustar permissões do vmail
chown -R vmail:vmail /home/vmail

# 5. Reiniciar serviços
systemctl start postfix dovecot
```

### 6.5 Restaurar configurações manualmente

```bash
# 1. Baixe configs.tar.gz

# 2. Ver o conteúdo
tar tzf configs.tar.gz | head -50

# 3. Restaurar tudo (cuidado: sobrescreve configs atuais)
tar xzf configs.tar.gz -C /

# 4. Reiniciar serviços afetados
systemctl restart lsws
systemctl restart cron
systemctl restart fail2ban
```

### 6.6 Verificar checksum manualmente

```bash
# Baixe o manifest.json junto com o pacote

# Verificar sha256 de um arquivo
sha256sum databases.sql.gz

# Comparar com o manifest
cat manifest.json | python3 -c "
import json, sys
m = json.load(sys.stdin)
print(m['files']['databases']['sha256'])
"
```

---

## 7. VERIFICAÇÃO PÓS-RESTAURAÇÃO

Execute este checklist após qualquer restauração. Todos os itens devem retornar `active (running)` ou resposta HTTP 200.

### 7.1 Serviços do sistema

```bash
# OpenLiteSpeed (web server)
systemctl status lsws

# MariaDB (banco de dados)
systemctl status mariadb

# Postfix (envio de e-mail)
systemctl status postfix

# Dovecot (recebimento de e-mail IMAP/POP3)
systemctl status dovecot

# Fail2ban (proteção SSH/web)
systemctl status fail2ban

# Docker
systemctl status docker

# Cron
systemctl status cron
```

### 7.2 Verificar bancos de dados

```bash
# Listar todos os bancos restaurados
mysql -u root -e "SHOW DATABASES;"

# Contar tabelas (deve ser > 0 em cada banco importante)
mysql -u root -e "
SELECT table_schema AS banco,
       COUNT(*) AS total_tabelas
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema','mysql','performance_schema','sys')
GROUP BY table_schema
ORDER BY total_tabelas DESC;
"
```

### 7.3 Verificar sites

```bash
# Listar sites com public_html
ls -la /home/*/public_html/ | grep "^total"

# Testar um site (substitua pelo seu domínio)
curl -I https://seudominio.com.br

# Ver virtual hosts ativos no OLS
ls /usr/local/lsws/conf/vhosts/
```

### 7.4 Verificar Docker / motion-api

```bash
# Status dos containers
docker compose -f /opt/motion-api/docker-compose.yml ps

# Testar API motion
curl -I http://localhost:3000/health
# ou
curl -I https://motion.rafaeltondin.com.br/health
```

### 7.5 Verificar e-mail

```bash
# Testar envio SMTP local
echo "Teste pos-restauracao" | mail -s "Teste" tondinrafael@gmail.com

# Ver fila de e-mail (deve estar vazia ou baixa)
mailq

# Verificar chaves DKIM
ls /etc/opendkim/keys/
```

### 7.6 Verificar backup automático

```bash
# Status do timer
systemctl status backup-gdrive.timer

# Ver próxima execução
systemctl list-timers backup-gdrive.timer

# Reativar se necessário
systemctl enable --now backup-gdrive.timer
```

### 7.7 Checklist rápido (resumo)

```
[ ] lsws rodando (web server)
[ ] mariadb rodando (banco de dados)
[ ] postfix rodando (e-mail saída)
[ ] dovecot rodando (e-mail entrada)
[ ] docker rodando
[ ] fail2ban rodando
[ ] motion-api respondendo
[ ] pelo menos 1 site abrindo no browser
[ ] backup-gdrive.timer ativo
```

---

## 8. TROUBLESHOOTING

### "node: command not found"

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version
```

### "Cannot authenticate with Google Drive"

O script usa credenciais OAuth2. Se o token expirou:

```bash
cd /opt/backup-gdrive

# Ver se o arquivo de credenciais existe
ls -la credentials.json token.json

# Se token.json não existe, re-autenticar
node auth.js
# Siga o link exibido, autorize, cole o código
```

### "mariadb: error 1045 — Access denied"

```bash
# Resetar senha do root MariaDB
systemctl stop mariadb
mysqld_safe --skip-grant-tables &
sleep 3
mysql -u root -e "
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
"
kill $(pgrep mysqld_safe)
systemctl start mariadb
```

### "lsws não inicia após restaurar configs"

```bash
# Verificar log de erro do OLS
tail -50 /usr/local/lsws/logs/error.log

# Testar configuração
/usr/local/lsws/bin/lswsctrl restart

# Se falhar, restaurar config padrão do OLS
cp /usr/local/lsws/conf/httpd_config.conf.bak \
   /usr/local/lsws/conf/httpd_config.conf
/usr/local/lsws/bin/lswsctrl restart
```

### "Sites restaurados mas SSL não funciona"

```bash
# Verificar se os certs foram restaurados
ls /etc/letsencrypt/live/

# Se não, re-emitir certificado via CyberPanel
cyberpanel issueSSL --domainName seudominio.com.br

# Ou via certbot direto
certbot --nginx -d seudominio.com.br
```

### "docker compose: No such file or directory"

```bash
# Verificar se o compose config foi restaurado
ls /opt/motion-api/

# Se não restaurou, restaurar só o docker
cd /opt/backup-gdrive
node restore.js --latest --apply --only docker
```

### "E-mail sendo rejeitado (DKIM falhou)"

```bash
# Verificar se as chaves DKIM existem
ls /etc/opendkim/keys/

# Reiniciar opendkim
systemctl restart opendkim postfix

# Testar DKIM
opendkim-testkey -d seudominio.com.br -s default -vvv
```

### "Restore travou no meio"

```bash
# Ver processos em execução
ps aux | grep "node restore"

# Matar o processo travado
kill $(pgrep -f "restore.js")

# Tentar novamente (o script é idempotente)
cd /opt/backup-gdrive
node restore.js --latest --apply
```

### "Backup do Drive está corrompido"

```bash
# Verificar checksum
cd /opt/backup-gdrive
node restore.js --date 2026-03-14 --verify

# Se falhar, tentar o dia anterior
node restore.js --date 2026-03-13 --verify

# Restaurar do backup válido mais recente
node restore.js --date 2026-03-13 --apply
```

---

## 9. REFERÊNCIA RÁPIDA

### Comandos do restore.js

| Comando | O que faz |
|---------|-----------|
| `node restore.js` | Lista todos os backups disponíveis |
| `node restore.js --latest` | Baixa o backup mais recente (sem restaurar) |
| `node restore.js --latest --apply` | Baixa E restaura tudo |
| `node restore.js --latest --verify` | Verifica checksums sem restaurar |
| `node restore.js --latest --apply --only db` | Restaura só o banco de dados |
| `node restore.js --latest --apply --only sites` | Restaura só os sites |
| `node restore.js --latest --apply --only docker` | Restaura só o Docker |
| `node restore.js --latest --apply --only email` | Restaura só o e-mail |
| `node restore.js --latest --apply --only configs` | Restaura só as configurações |
| `node restore.js --date 2026-03-14 --apply` | Restaura tudo de data específica |
| `node restore.js --date 2026-03-14 --apply --only sites` | Restaura sites de data específica |
| `node restore.js --date 2026-03-14 --verify` | Verifica integridade de data específica |

### Comandos de emergência — serviços

| Serviço | Reiniciar | Status |
|---------|-----------|--------|
| Web (OLS) | `systemctl restart lsws` | `systemctl status lsws` |
| Banco | `systemctl restart mariadb` | `systemctl status mariadb` |
| E-mail saída | `systemctl restart postfix` | `systemctl status postfix` |
| E-mail entrada | `systemctl restart dovecot` | `systemctl status dovecot` |
| Docker | `systemctl restart docker` | `systemctl status docker` |
| motion-api | `docker compose -f /opt/motion-api/docker-compose.yml restart` | `docker compose -f /opt/motion-api/docker-compose.yml ps` |
| Backup timer | `systemctl restart backup-gdrive.timer` | `systemctl status backup-gdrive.timer` |

### Restauração manual — referência rápida

| Pacote | Restaurar |
|--------|-----------|
| databases.sql.gz | `gunzip -c databases.sql.gz \| mysql` |
| sites.tar.gz | `tar xzf sites.tar.gz -C /` |
| docker.tar.gz | `tar xzf docker.tar.gz -C / && docker load < images.tar.gz` |
| email.tar.gz | `systemctl stop postfix dovecot && tar xzf email.tar.gz -C / && systemctl start postfix dovecot` |
| configs.tar.gz | `tar xzf configs.tar.gz -C / && systemctl restart lsws` |

### Informações do servidor

| Item | Valor |
|------|-------|
| Hostname | srv410981 |
| IP | 46.202.149.24 |
| SSH | `ssh root@46.202.149.24` |
| OS | Ubuntu 22.04 LTS |
| Hardware | 8 vCPUs, 32GB RAM |
| CyberPanel | v2.4 |
| Web Server | OpenLiteSpeed |
| Banco | MariaDB 10.6 |
| Sites | 60+ |
| Projeto backup | /opt/backup-gdrive/ |
| motion-api | /opt/motion-api/ |
| Notificação | tondinrafael@gmail.com |

---

*Documento gerado em 2026-03-14. Atualizar sempre que houver mudanças na estrutura do servidor ou no script de backup.*
