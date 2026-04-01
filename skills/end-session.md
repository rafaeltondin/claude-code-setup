# Skill: End Session — Análise e Atualização de Documentação

## Descrição

Executa análise completa da sessão atual: identifica erros, dificuldades e insights, e atualiza a documentação do projeto automaticamente.

**QUANDO USAR:** Antes de qualquer despedida, encerramento ou quando o usuário indicar que a sessão terminou.

## Uso

```
/end-session
```

Sem argumentos — a skill gera a análise a partir do contexto da conversa.

## Implementação

Quando `/end-session` é invocado, execute os passos abaixo INTEGRALMENTE:

### PASSO 1 — Análise da Conversa

Reflita sobre TODA a conversa da sessão atual e construa mentalmente:

**a) Erros encontrados:**
- Ferramentas que falharam ou retornaram erros inesperados
- Comandos que precisaram ser reexecutados
- APIs ou caminhos que não funcionaram de primeira
- Exceções, timeouts, permissões negadas

**b) Dificuldades:**
- Áreas onde precisou de múltiplas tentativas
- Informações que estavam faltando e precisou descobrir
- Padrões do projeto que não estavam documentados
- Decisões ambíguas que precisou adivinhar

**c) Insights e melhorias:**
- Padrões de código/projeto que descobriu
- Convenções que o projeto segue
- Atalhos ou comandos úteis que encontrou
- Melhorias possíveis no fluxo de trabalho

**d) Atualizações de documentação necessárias:**
- O que DEVERIA estar no CLAUDE.md mas não está?
- O que DEVERIA estar na knowledge-base?
- Qual instrução teria evitado os erros cometidos?

### PASSO 2 — Construir o JSON de Análise

Monte o JSON seguindo exatamente este formato:

```json
{
  "session_summary": "Descrição em 1-2 frases do que foi feito na sessão",
  "project": "nome-do-projeto-ou-geral",
  "errors": [
    {
      "type": "tool_failure|logic|api|unclear_req|permission|path",
      "description": "O que aconteceu de errado",
      "solution": "Como foi resolvido ou como evitar no futuro"
    }
  ],
  "difficulties": [
    {
      "area": "área do problema (ex: filesystem, api, css, deploy)",
      "description": "Qual foi a dificuldade",
      "workaround": "Como foi contornado"
    }
  ],
  "insights": [
    {
      "category": "pattern|convention|tool|workflow|architecture",
      "title": "Título curto do insight",
      "content": "Descrição detalhada — o que foi aprendido e como aplicar"
    }
  ],
  "doc_updates": [
    {
      "action": "update|create|append",
      "target": "MEMORY|KB:NOME-DO-ARQUIVO|CLAUDE",
      "section": "Nome da seção existente (para update/append)",
      "content": "Conteúdo markdown a adicionar"
    }
  ],
  "pending_tasks": [
    "Tarefa que ficou pendente para próxima sessão"
  ]
}
```

**Regras para doc_updates:**
- `MEMORY` → atualiza `memory/MEMORY.md`
- `KB:NOME` → cria/atualiza `knowledge-base/NOME.md` (ex: `KB:ERROS-COMUNS`)
- `CLAUDE` → adiciona instrução ao `CLAUDE.md`
- Se não há nada a atualizar, use array vazio `[]`
- Seja específico: escreva o conteúdo markdown pronto para inserir

### PASSO 3 — Executar o Analyzer

Salve o JSON em um arquivo temporário e execute:

```bash
# Para C:\Users\USER\.claude (projeto atual padrão):
node "C:\Users\USER\.claude\session-analyzer\session-analyzer.js" --file "C:\Users\USER\.claude\session-analyzer\temp-analysis.json"

# Para Desktop\.claude (se a sessão for deste projeto):
node "C:\Users\USER\Desktop\.claude\session-analyzer\session-analyzer.js" --file "C:\Users\USER\Desktop\.claude\session-analyzer\temp-analysis.json"
```

Ou via pipe:
```bash
echo '<JSON_AQUI>' | node "C:\Users\USER\.claude\session-analyzer\session-analyzer.js"
```

### PASSO 4 — Verificar Resultado

Confirme que:
- [ ] Nenhum erro no output do analyzer
- [ ] MEMORY.md foi atualizado (se havia insights/erros)
- [ ] Docs da KB foram criados/atualizados (se havia doc_updates)
- [ ] Session diary foi salvo

### PASSO 5 — Relatório para o Usuário

Após executar o analyzer, informe o usuário:

```
✓ Sessão analisada:
  • X erros documentados
  • Y dificuldades registradas
  • Z insights salvos em MEMORY.md
  • W docs atualizados/criados

Próxima sessão: [listar pending_tasks se houver]
```

## Exemplos de doc_updates Úteis

### Adicionar instrução ao CLAUDE.md:
```json
{
  "action": "append",
  "target": "CLAUDE",
  "section": "REGRAS GLOBAIS",
  "content": "- **NOVO PADRÃO:** Sempre fazer X antes de Y quando trabalhando com Z"
}
```

### Criar documento na knowledge-base:
```json
{
  "action": "create",
  "target": "KB:ERROS-COMUNS-E-SOLUCOES",
  "content": "# Erros Comuns e Soluções\n\n## Erro: ...\n**Causa:** ...\n**Solução:** ..."
}
```

### Adicionar à MEMORY.md:
```json
{
  "action": "append",
  "target": "MEMORY",
  "section": "Padrões do Projeto",
  "content": "- O projeto usa snake_case para variáveis de banco de dados"
}
```

## Notas Importantes

- **Seja honesto:** Documente erros reais, não apenas sucessos
- **Seja específico:** "Erro 404 no path /api/v2/products" é melhor que "erro de API"
- **Pense no próximo agente:** Escreva instruções que você gostaria de ter tido
- **Não documente o óbvio:** Foque no que causou fricção real na sessão
- O analyzer salva automaticamente o JSON bruto em `session-analyzer/analyses/`
