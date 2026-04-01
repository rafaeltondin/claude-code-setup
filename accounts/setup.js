#!/usr/bin/env node
// ~/.claude/accounts/setup.js
// Guia o usuário para capturar credenciais de uma nova conta Claude Code

const fs   = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const CLAUDE_DIR   = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
const ACCOUNTS_DIR = path.join(CLAUDE_DIR, 'accounts');
const CRED_FILE    = path.join(CLAUDE_DIR, '.credentials.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

function accountFile(n) {
  return path.join(ACCOUNTS_DIR, `account-${n}.json`);
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Claude Code — Configuração de Contas       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Garantir que conta 1 está salva
  if (!fs.existsSync(accountFile('1'))) {
    if (fs.existsSync(CRED_FILE)) {
      fs.copyFileSync(CRED_FILE, accountFile('1'));
      console.log('  ✅ Conta 1 (atual) salva automaticamente.');
    } else {
      console.log('  ⚠️  Nenhuma credencial encontrada. Faça login primeiro com: claude');
      process.exit(1);
    }
  }

  // Descobrir quais contas faltam
  const missing = ['2', '3'].filter(n => !fs.existsSync(accountFile(n)));
  if (missing.length === 0) {
    console.log('  ✅ Todas as 3 contas já estão configuradas!');
    console.log('  📊 Verifique o status com: node ~/.claude/accounts/status.js');
    rl.close();
    return;
  }

  console.log(`  📋 Contas que precisam ser configuradas: ${missing.join(', ')}`);
  console.log('');

  for (const accountNum of missing) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  CONFIGURANDO CONTA ${accountNum}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('');
    console.log('  O processo vai:');
    console.log('  1. Fazer logout da conta atual');
    console.log('  2. Você faz login com a nova conta no browser');
    console.log(`  3. Salvar as credenciais como conta ${accountNum}`);
    console.log('  4. Restaurar a conta original automaticamente');
    console.log('');

    const confirm = await ask(`  Pronto para configurar a conta ${accountNum}? (s/n): `);
    if (confirm.toLowerCase() !== 's') {
      console.log('  ⏭️  Pulando conta ' + accountNum);
      continue;
    }

    // Backup das credenciais atuais
    const tempBackup = path.join(ACCOUNTS_DIR, '.temp-backup.json');
    if (fs.existsSync(CRED_FILE)) {
      fs.copyFileSync(CRED_FILE, tempBackup);
    }

    // Remover credenciais para forçar login
    if (fs.existsSync(CRED_FILE)) {
      fs.unlinkSync(CRED_FILE);
    }

    console.log('');
    console.log('  📌 INSTRUÇÕES:');
    console.log('  1. Abra um NOVO terminal');
    console.log('  2. Execute: claude');
    console.log(`  3. Faça login com a CONTA ${accountNum} (email diferente)`);
    console.log('  4. Quando o Claude Code abrir, FECHE-O (Ctrl+C ou /exit)');
    console.log('  5. Volte aqui e pressione ENTER');
    console.log('');
    console.log('  ⚠️  NÃO feche este terminal!');
    console.log('');

    await ask('  Pressione ENTER após concluir o login na conta ' + accountNum + '...');

    // Verificar se credenciais foram criadas
    if (fs.existsSync(CRED_FILE)) {
      fs.copyFileSync(CRED_FILE, accountFile(accountNum));
      console.log(`  ✅ Conta ${accountNum} salva com sucesso!`);
    } else {
      console.log(`  ❌ Credenciais não encontradas. Login pode ter falhado.`);
      console.log(`  💡 Tente novamente depois com: node ~/.claude/accounts/setup.js`);
    }

    // Restaurar conta 1
    if (fs.existsSync(tempBackup)) {
      fs.copyFileSync(tempBackup, CRED_FILE);
      fs.unlinkSync(tempBackup);
    }

    // Atualizar current.txt para conta 1
    fs.writeFileSync(path.join(ACCOUNTS_DIR, 'current.txt'), '1');
    console.log('  🔄 Conta 1 restaurada.');
    console.log('');
  }

  // Status final
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  RESUMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  ['1', '2', '3'].forEach(n => {
    const exists = fs.existsSync(accountFile(n));
    const icon   = exists ? '✅' : '❌';
    console.log(`  ${icon} Conta ${n}: ${exists ? 'configurada' : 'não configurada'}`);
  });
  console.log('');
  console.log('  💡 Para rotacionar manualmente: node ~/.claude/accounts/rotate.js');
  console.log('  📊 Para ver status:             node ~/.claude/accounts/status.js');
  console.log('  🤖 Para monitor automático:     node ~/.claude/accounts/monitor.js');
  console.log('');

  rl.close();
}

main().catch(err => {
  console.error('Erro:', err.message);
  rl.close();
  process.exit(1);
});
