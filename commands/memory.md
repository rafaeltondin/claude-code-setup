# Skill: Memory - Gerenciamento de Memória de Conversa

## Descrição

Esta skill gerencia a memória persistente da conversa, permitindo manter contexto, tarefas e histórico ao longo de toda a sessão de trabalho.

## Uso

```
/memory [comando] [argumentos]
```

## Comandos Disponíveis

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `status` | Mostra status da sessão atual | `/memory status` |
| `summary` | Exibe resumo detalhado | `/memory summary` |
| `objective <texto>` | Define objetivo da sessão | `/memory objective Implementar autenticação` |
| `phase <texto>` | Define fase atual | `/memory phase Fase 2: Testes` |
| `checkpoint [nome]` | Cria ponto de salvamento | `/memory checkpoint Antes de deploy` |
| `list` | Lista todas as sessões | `/memory list` |
| `load <id\|índice>` | Carrega sessão específica | `/memory load 1` |
| `new` | Inicia nova sessão | `/memory new` |
| `finalize` | Finaliza sessão atual | `/memory finalize` |
| `tasks` | Lista todas as tarefas | `/memory tasks` |
| `history` | Mostra histórico de ações | `/memory history` |
| `artifacts` | Lista arquivos criados | `/memory artifacts` |
| `decisions` | Lista decisões tomadas | `/memory decisions` |

## Implementação

Quando `/memory` é invocado, execute:

```bash
node "~\.claude\conversation-memory\memory-cli.js" [comando] [argumentos]
```

## Integração Automática

O sistema de memória é integrado automaticamente ao Claude Code através de:

1. **Inicialização**: No início de cada conversa, o sistema verifica sessões ativas
2. **Sincronização**: Tarefas do TodoWrite são sincronizadas automaticamente
3. **Persistência**: Estado é salvo após cada interação significativa
4. **Recuperação**: Sessões anteriores podem ser retomadas

## Protocolo de Uso

### No Início da Conversa

1. Verificar se existe sessão ativa: `/memory status`
2. Se não, criar nova sessão: `/memory new`
3. Definir objetivo: `/memory objective [descrição do trabalho]`

### Durante o Trabalho

1. Atualizar fase quando mudar: `/memory phase [nova fase]`
2. Criar checkpoints antes de mudanças críticas: `/memory checkpoint [nome]`
3. Verificar progresso: `/memory summary`

### Ao Finalizar

1. Revisar o que foi feito: `/memory summary`
2. Finalizar sessão se completa: `/memory finalize`

## Benefícios

- **Continuidade**: Retoma trabalho de onde parou
- **Rastreabilidade**: Histórico completo de ações
- **Organização**: Tarefas e fases bem definidas
- **Recuperação**: Checkpoints para voltar a estados anteriores
- **Documentação**: Decisões e artefatos registrados automaticamente
