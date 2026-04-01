/**
 * Tools: ARQUIVOS — read_file, write_file, list_directory, delete_file, move_file, file_info, diff_files
 */
const path = require('path');
const fs = require('fs');

// Definições das ferramentas (para TOOLS_DEF)
const definitions = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lê o conteúdo de um arquivo local do sistema. Aceita caminhos absolutos (C:/... ou /home/...) e URLs file:// (file:///C:/...). Use para ler HTMLs, JSONs, textos, logs, etc.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Caminho absoluto do arquivo ou URL file://. Ex: /home/user/Desktop/proposta.html ou ~/Desktop/proposta.html' },
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
          path: { type: 'string', description: 'Caminho absoluto do arquivo. Ex: /home/user/Desktop/resultado.txt ou ~/Desktop/resultado.txt' },
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
          path: { type: 'string', description: 'Caminho absoluto do diretório. Ex: /home/user/Desktop ou ~/Desktop' },
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
  }
];

// Implementações (handlers)
const handlers = {
  async read_file(args, _ctx) {
    try {
      let filePath = args.path || '';
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
      const maxBytes = args.maxBytes || 50000;
      const encoding = args.encoding || 'utf8';
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
  },

  async write_file(args, _ctx) {
    try {
      let filePath = args.path || '';
      if (!filePath) return 'Parâmetro "path" é obrigatório';
      const content = args.content ?? '';
      const encoding = args.encoding || 'utf8';
      const append = args.append === true;
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
  },

  async list_directory(args, _ctx) {
    try {
      const dirPath = args.path || '';
      if (!dirPath) return 'Parâmetro "path" é obrigatório';
      if (!fs.existsSync(dirPath)) return `Diretório não encontrado: ${dirPath}`;
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) return `O caminho não é um diretório: ${dirPath}`;
      const recursive = args.recursive === true;
      const filter = args.filter || null;

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
  },

  async delete_file(args, _ctx) {
    try {
      const filePath = args.path || '';
      if (!filePath) return 'Parâmetro "path" é obrigatório';
      if (!fs.existsSync(filePath)) return `Arquivo/diretório não encontrado: ${filePath}`;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (args.force === true) {
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
  },

  async move_file(args, _ctx) {
    try {
      const src = args.source || '';
      const dst = args.destination || '';
      if (!src) return 'Parâmetro "source" é obrigatório';
      if (!dst) return 'Parâmetro "destination" é obrigatório';
      if (!fs.existsSync(src)) return `Origem não encontrada: ${src}`;
      if (fs.existsSync(dst) && args.overwrite !== true) {
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
  },

  async file_info(args, _ctx) {
    try {
      const filePath = args.path || '';
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
  },

  async diff_files(args, _ctx) {
    try {
      const fileA = args.fileA || '';
      const fileB = args.fileB || '';
      if (!fileA || !fileB) return 'Parâmetros "fileA" e "fileB" são obrigatórios';
      if (!fs.existsSync(fileA)) return `Arquivo não encontrado: ${fileA}`;
      if (!fs.existsSync(fileB)) return `Arquivo não encontrado: ${fileB}`;

      const linesA = fs.readFileSync(fileA, 'utf8').split('\n');
      const linesB = fs.readFileSync(fileB, 'utf8').split('\n');
      const context = args.context ?? 3;

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
};

module.exports = { definitions, handlers };
