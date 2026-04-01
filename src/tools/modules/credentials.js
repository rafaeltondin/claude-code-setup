/**
 * Tools: CREDENCIAIS — get_credential, vault_manage
 */

// Definições das ferramentas (para TOOLS_DEF)
const definitions = [
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
  }
];

// Implementações (handlers)
const handlers = {
  async get_credential(args, ctx) {
    try {
      const allCreds = ctx.credentialVault.getAll();
      const cred = allCreds.find(c => c.name === args.name);
      if (!cred) return `Credencial "${args.name}" não encontrada. Disponíveis: ${allCreds.map(c => c.name).join(', ')}`;
      const value = ctx.credentialVault.reveal(cred.id);
      return value ? value.value || value : `Credencial "${args.name}" está vazia`;
    } catch (e) {
      return `Erro ao obter credencial: ${e.message}`;
    }
  },

  async vault_manage(args, ctx) {
    try {
      const { action, name, value } = args;
      if (!ctx.credentialVault) return 'Vault não disponível';
      switch (action) {
        case 'list': {
          const all = ctx.credentialVault.getAll();
          return `${all.length} credenciais:\n${all.map(c => `  - ${c.name}`).join('\n')}`;
        }
        case 'create': {
          if (!name || !value) return 'Parâmetros name e value são obrigatórios para create';
          ctx.credentialVault.create(name, value);
          return `Credencial "${name}" criada com sucesso`;
        }
        case 'update': {
          if (!name || !value) return 'Parâmetros name e value são obrigatórios para update';
          const all = ctx.credentialVault.getAll();
          const cred = all.find(c => c.name === name);
          if (!cred) return `Credencial "${name}" não encontrada`;
          ctx.credentialVault.update(cred.id, value);
          return `Credencial "${name}" atualizada com sucesso`;
        }
        case 'delete': {
          if (!name) return 'Parâmetro name é obrigatório para delete';
          const allCreds = ctx.credentialVault.getAll();
          const target = allCreds.find(c => c.name === name);
          if (!target) return `Credencial "${name}" não encontrada`;
          ctx.credentialVault.remove(target.id);
          return `Credencial "${name}" removida com sucesso`;
        }
        default:
          return `Ação "${action}" não reconhecida. Use: list, create, update, delete`;
      }
    } catch (e) {
      return `Erro vault: ${e.message}`;
    }
  }
};

module.exports = { definitions, handlers };
