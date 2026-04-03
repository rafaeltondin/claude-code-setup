# ActiveCampaign — Guia Completo da Plataforma

**Data de Criação:** 2026-03-02
**Versão:** 1.0
**Categoria:** Marketing Automation / Email Marketing / CRM
**Arquivo Complementar:** `ACTIVECAMPAIGN-API-DOCUMENTACAO-COMPLETA.md`

---

## ÍNDICE

1. [O que é o ActiveCampaign](#1-o-que-é-o-activecampaign)
2. [Planos e Preços](#2-planos-e-preços)
3. [Email Marketing](#3-email-marketing)
4. [Automações (Automation Builder)](#4-automações-automation-builder)
5. [Segmentação e Contatos](#5-segmentação-e-contatos)
6. [CRM e Deals (Vendas)](#6-crm-e-deals-vendas)
7. [Site Tracking](#7-site-tracking)
8. [Event Tracking](#8-event-tracking)
9. [Formulários](#9-formulários)
10. [WhatsApp Business (Diferencial BR)](#10-whatsapp-business-diferencial-br)
11. [Integrações Populares](#11-integrações-populares)
12. [Relatórios e Métricas](#12-relatórios-e-métricas)
13. [IA e Funcionalidades Preditivas](#13-ia-e-funcionalidades-preditivas)
14. [Boas Práticas e Casos de Uso](#14-boas-práticas-e-casos-de-uso)
15. [Automações Prontas (Templates)](#15-automações-prontas-templates)
16. [Configuração Inicial](#16-configuração-inicial)

---

## 1. O QUE É O ACTIVECAMPAIGN

### Descrição Geral

ActiveCampaign é uma plataforma de **automação de marketing impulsionada por inteligência artificial** que oferece recursos integrados de:

- **Email Marketing** (newsletters, campanhas, automações)
- **WhatsApp Business** (único com integração nativa)
- **CRM de Vendas** (deals, pipeline, scoring)
- **SMS Marketing**
- **Formulários e Landing Pages**
- **Site Tracking e Event Tracking**
- **Tecnologia Preditiva** (IA)

### Posicionamento

Plataforma completa de **Customer Experience Automation (CXA)** para:
- Escalar comunicações hiperpersonalizadas
- Automatizar jornadas do cliente do primeiro contato à retenção
- Integrar marketing e vendas em uma única plataforma

### Ideal para

| Segmento | Caso de Uso Principal |
|----------|----------------------|
| **E-commerce** | Carrinho abandonado, pós-compra, recomendações |
| **SaaS** | Onboarding, feature adoption, churn prevention |
| **B2B** | Lead nurturing, account-based marketing |
| **Educação** | Enrollment, progress tracking, upsell |
| **Agências** | Gestão multi-cliente, white label |

### Diferenciais Competitivos

1. **WhatsApp integrado**: Única plataforma com WhatsApp Business nativo (crucial no Brasil — 96% da população usa WhatsApp)
2. **Automation Builder visual**: Interface drag-and-drop intuitiva para automações complexas
3. **Predictive Sending**: IA analisa quando cada contato está mais propenso a abrir emails
4. **AI Automation Builder**: Construção de automações por linguagem natural
5. **CRM integrado**: Sem necessidade de ferramenta separada para vendas

---

## 2. PLANOS E PREÇOS

### Estrutura Geral

4 planos principais escalando pelo número de contatos.

| Plano | Preço Base (1K contatos) | Usuários | Envios/mês |
|-------|--------------------------|----------|-----------|
| **Starter** | ~$19/mês | 1 | 10.000 |
| **Plus** | ~$59/mês | 1 | Ilimitado |
| **Professional** | ~$99/mês | 3 | 12x contatos |
| **Enterprise** | ~$179/mês | 5 | Ilimitado |

**Desconto:** 20% pagando anualmente.

### Funcionalidades por Plano

**Starter (MVP):**
- Email marketing básico
- Marketing automation
- Drag-and-drop email editor
- Formulários básicos
- Site tracking

**Plus (PMEs):**
- Tudo do Starter
- Formulários avançados
- Segmentação básica
- Site messages
- Landing pages
- Generative AI para conteúdo

**Professional (Crescimento):**
- Tudo do Plus
- Conteúdo condicional em emails
- A/B testing em automações
- Segmentação avançada
- Relatórios avançados
- Rastreamento de atribuição e conversão
- Suporte prioritário

**Enterprise (Escala):**
- Tudo do Professional
- Acesso completo a todas funcionalidades
- Suporte dedicado com SLA
- Customizações avançadas
- Onboarding personalizado

---

## 3. EMAIL MARKETING

### Tipos de Campanhas

| Tipo | Descrição | Quando Usar |
|------|-----------|-------------|
| **Standard** | Envio único para lista/segmento | Newsletter, anúncios, promoções |
| **Automated** | Acionadas por triggers | Onboarding, pós-compra, nurture |
| **Split Test** | A/B testing de versões | Otimizar assunto, conteúdo, CTA |
| **RSS** | Agrega feed RSS como email | Blogs, conteúdo regular |

### Email Designer (Editor Drag-and-Drop)

- Interface intuitiva arrastar e soltar
- Importação fácil de imagens por arrastar
- Componentes pré-construídos ajustáveis
- Editor HTML para usuários avançados
- **Mobile-responsive**: Todos templates otimizados para mobile
- Timers dinâmicos com contagem regressiva em tempo real
- Vídeos promocionais embarcados

### Tipos de Templates

1. **Por Layout**: Estruturas pré-formatadas
2. **Por Objetivo de Negócio**:
   - Promoção de novos produtos
   - Atualizações e notícias da empresa
   - Convites para eventos
   - Pedidos de avaliação/review
   - Curadoria de conteúdo
3. **Blank**: Começar do zero

### Personalização com Merge Tags

```
%FIRSTNAME% → Nome do contato
%LASTNAME% → Sobrenome
%EMAIL% → Email
%PHONE% → Telefone
%CUSTOMFIELD:nome_do_campo% → Valor de campo customizado
```

**Conteúdo Condicional** (Professional+):
```
{% if contact.tags contains "cliente_vip" %}
  Aqui está seu desconto VIP de 20%!
{% else %}
  Aqui está nossa oferta especial.
{% endif %}
```

### Segmentação de Envio

- **Por Lista**: Enviar para lista específica
- **Por Tag**: Contatos com tags específicas
- **Por Segmento**: Critérios dinâmicos combinados
- **Por Exclusão**: Excluir listas/tags específicas

---

## 4. AUTOMAÇÕES (AUTOMATION BUILDER)

### O que são Automações

Cadeia de eventos que executa automaticamente quando condições iniciais são atendidas. Combina triggers + ações + lógica condicional.

### Interface

- Drag-and-drop visual
- Fluxos visuais mostrando caminho de cada contato
- Suporte a automações simples e complexas
- Relatórios integrados de desempenho
- AI Automation Builder para criação por linguagem natural

### TRIGGERS (Disparadores)

#### Contact-Based
| Trigger | Descrição |
|---------|-----------|
| Adicionado à lista | Contato entra em lista específica |
| Preencheu formulário | Formulário específico ou qualquer |
| Abriu email | Campanha ou automação específica |
| Clicou em link | Link específico em email |
| Visitou página | URL específica do site |
| Tag adicionada | Tag específica aplicada ao contato |
| Tag removida | Tag removida do contato |
| Campo atualizado | Valor de custom field mudou |
| Deal criado/atualizado | Atividade no CRM |

#### Time-Based
| Trigger | Descrição |
|---------|-----------|
| Data/hora específica | Dispara em momento exato |
| Aniversário | Baseado em campo de data |
| Intervalos | X dias após evento |

#### Engagement Triggers
| Trigger | Descrição |
|---------|-----------|
| Inatividade | 14+ dias sem abrir email |
| Inatividade no site | X dias sem visitar |
| Lead score atingiu | Score passou de threshold |

### AÇÕES

#### Comunicação
| Ação | Descrição |
|------|-----------|
| Enviar email | Template ou campanha específica |
| Enviar SMS | Mensagem texto |
| Enviar WhatsApp | Mensagem pelo WhatsApp Business |
| Notificação interna | Alertar usuário da conta |

#### Gestão de Contato
| Ação | Descrição |
|------|-----------|
| Adicionar tag | Aplicar tag ao contato |
| Remover tag | Remover tag do contato |
| Adicionar à lista | Inscrever em lista |
| Remover da lista | Desinscrever de lista |
| Atualizar campo | Alterar valor de custom field |
| Atualizar score | Incrementar/decrementar lead score |

#### Lógica de Fluxo
| Ação | Descrição |
|------|-----------|
| Wait | Aguardar tempo (min, h, dias, semanas) |
| If/Else | Bifurcação condicional |
| Split | Dividir em múltiplos caminhos (A/B) |
| Go to | Saltar para outro ponto |
| Goal | Definir objetivo e rastrear conversão |

#### CRM
| Ação | Descrição |
|------|-----------|
| Criar deal | Nova oportunidade de venda |
| Atualizar deal | Modificar deal existente |
| Mover deal | Trocar de stage no pipeline |
| Reatribuir deal | Mudar vendedor responsável |

#### Integrações
| Ação | Descrição |
|------|-----------|
| Webhook | Chamar URL externa com dados |
| Notificar Slack | Enviar mensagem para canal |
| Atualizar Shopify | Sincronizar dados de cliente |

### CONDIÇÕES (If/Else Logic)

**Tipos de Condições:**

```
CAMPO DO CONTATO
  ├── email → é igual a / contém / não contém
  ├── nome → é / não é / contém / começa com
  └── custom field → =, ≠, >, <, contém, antes de, depois de

COMPORTAMENTO
  ├── tags → possui / não possui
  ├── listas → membro / não membro
  ├── emails → abriu / não abriu / clicou / não clicou
  └── páginas → visitou / não visitou nos últimos X dias

SCORE
  ├── lead score → > / < / = / entre
  └── deal score → > / < / = / entre

DEAL
  ├── pipeline → em qual pipeline
  ├── stage → em qual estágio
  ├── valor → > / < / entre
  └── owner → é / não é
```

**Operadores Booleanos:** AND / OR para lógica complexa

### Automation Goals

- Definir objetivo para a automação (ex: "Fazer compra", "Agendar demo")
- Rastrear % de contatos que atingem o objetivo
- Medir ROI da automação
- Contatos que atingem o goal saem da automação automaticamente

### Relatórios de Automação

- **Overview Report**: Visão geral de todas automações ativas
  - Contatos inscritos / completados
  - Taxa de conversão
  - Tempo médio na automação
- **Performance Report**: Análise por email na automação
  - Open rate, click rate, unsubscribe rate
  - Caminho dos contatos nas bifurcações
- **Sales Engagement Report**: Para emails 1:1
  - Abertura, click-through, taxa de resposta

---

## 5. SEGMENTAÇÃO E CONTATOS

### Listas de Contatos

**O que são**: Containers que agrupam contatos. Um contato pode estar em várias listas.

**Tipos de uso:**
- `Newsletter` — inscritos na newsletter
- `Clientes` — quem já comprou
- `Prospects` — leads em qualificação
- `VIP` — clientes de alto valor

**Opt-in:**
- **Single opt-in**: Adiciona diretamente (risco de reclamação)
- **Double opt-in**: Email de confirmação obrigatório (recomendado)

### Tags — Estratégia Completa

Tags são **marcadores dinâmicos** que indicam comportamento ou interesse. Diferente de listas (permanentes), tags são flexíveis.

**Nomenclatura sugerida:**

```
Interesse:     interesse_produtoX, webinar_assistido
Comportamento: abriu_5_emails, visitou_pricing, clicou_desconto
Status:        cliente_novo, cliente_ativo, cliente_inativo
Segmentação:   industria_tech, empresa_pequena, regiao_sul
Funil:         lead_frio, lead_quente, demo_agendada, proposta_enviada
```

**Boas práticas:**
- Usar snake_case nos nomes
- Criar convenção clara e documentar
- Tags = comportamental / temporário
- Custom fields = dados permanentes

### Custom Fields (Campos Personalizados)

**Tipos disponíveis:**

| Tipo | Uso |
|------|-----|
| `text` | Texto livre (empresa, cargo) |
| `textarea` | Texto longo (observações) |
| `number` | Números (funcionários, receita) |
| `date` | Data (contrato, nascimento) |
| `datetime` | Data e hora com timezone |
| `dropdown` | Seleção única (país, setor, plano) |
| `multiselect` | Múltiplas seleções |
| `radio` | Seleção única visual |
| `checkbox` | Múltiplas caixas |
| `hidden` | Campo oculto (tracking interno) |

### Lead Scoring (Pontuação de Leads)

Sistema de pontuação numérica que indica qualidade/interesse do lead.

**Modelo de Scoring Sugerido:**

| Ação | Pontos |
|------|--------|
| Preencheu formulário | +15 |
| Visitou pricing page | +10 |
| Assistiu vídeo demo | +20 |
| Agendou demo | +50 |
| Abriu email | +2 |
| Clicou link em email | +5 |
| Visitou case studies | +8 |
| Visitou site (retornou) | +3 |
| 30 dias sem abrir email | -5 |
| Marcou como spam | -30 |
| Cancelou inscrição | -50 |

**Uso em Automações:**
- Score > 50 → Mover para "Sales Ready", notificar vendedor
- Score > 100 → Criar deal automaticamente
- Score < 0 → Pausar comunicações, mover para lista "inativo"

### Segmentos Dinâmicos

Grupos criados por **condições avaliadas em tempo real**. Contatos entram/saem automaticamente.

**Exemplos:**

```
"Leads Quentes":
  tag = "visitou_pricing" AND abertura_email > 3 nos últimos 14 dias

"Clientes em Risco":
  tag = "cliente" AND última_compra > 90 dias atrás

"Prontos para Upsell":
  deal.stage = "Ganho" AND score > 80 AND não possui tag "oferta_upsell_enviada"
```

### Contact Profile (Histórico Completo)

Visão 360º de cada contato:
- Histórico de emails (enviados, abertos, clicados)
- Histórico de visitas ao site com páginas/duração
- Tags aplicadas com data/hora
- Notas internas adicionadas por usuários
- Deals associados e status
- Lead score atual e histórico
- Automações em que está inscrito
- Timeline de toda interação

---

## 6. CRM E DEALS (VENDAS)

### Estrutura do CRM

```
Account (Empresa)
  └── Contact (Contato)
       └── Deal (Oportunidade)
            ├── Pipeline (processo de vendas)
            │    └── Stages (etapas)
            ├── Value (valor)
            ├── Owner (vendedor)
            └── Activities (notas, tarefas, reuniões)
```

### Pipelines e Stages

**Pipeline**: Representa o processo de vendas da empresa.

**Exemplo de Pipeline:**
```
Prospecção → Qualificado → Proposta → Negociando → Ganho / Perdido
```

**Campos de um Deal:**
- Título (nome da oportunidade)
- Valor ($)
- Valor do Ciclo de Vida (LTV)
- Stage atual
- Pipeline
- Owner (vendedor)
- Data de fechamento prevista
- Custom fields do deal
- Contatos associados
- Notas e histórico de atividades

### Automação de CRM

**Criar deal automaticamente quando:**
- Contato preenche formulário de proposta
- Contato recebe tag `pronto_para_vendas` (lead score > 50)
- Contato faz primeira compra
- Contato clica link de agendamento

**Mover deal automaticamente:**
- Para "Proposta Enviada" quando email com proposta é aberto
- Para "Negociando" quando contato responde email
- Para "Ganho" quando pagamento recebido (via webhook Stripe/PayPal)

**Notificações automáticas:**
- Avisar vendedor quando deal em stage por mais de X dias
- Alertar quando lead quente (score alto) não tem deal associado

### Relatórios de Vendas

- **Pipeline View**: Kanban visual de deals por stage
- **Sales Performance**: Análise por vendedor (deals fechados, valor, conversão)
- **Stage Analytics**: Tempo médio por stage, taxa de conversão stage a stage
- **Revenue Forecast**: Projeção baseada em deals abertos e probabilidade
- **Activity Report**: Cadência de contato com leads

---

## 7. SITE TRACKING

### O que é

Rastreamento em tempo real de visitantes identificados no site:
- **Quem** visitou (email do contato, se conhecido)
- **Quais páginas** visitou
- **Quanto tempo** passou
- **Quando** visitou

### Implementação

```html
<!-- Adicionar em TODAS as páginas (head ou footer) -->
<script type="text/javascript">
  (function(e,t,o,n,p,r,i){
    e.visitorGlobalObjectAlias=n;
    e[e.visitorGlobalObjectAlias]=e[e.visitorGlobalObjectAlias]||function(){(e[e.visitorGlobalObjectAlias].q=e[e.visitorGlobalObjectAlias].q||[]).push(arguments)};
    e[e.visitorGlobalObjectAlias].l=(new Date).getTime();
    r=t.createElement("script");
    r.src=o;r.async=true;
    i=t.getElementsByTagName("script")[0];
    i.parentNode.insertBefore(r,i)
  })(window,document,"https://diffuser-cdn.app-us1.com/diffuser/diffuser.js","vgo");
  vgo('setAccount', 'SEU_ACCOUNT_ID');
  vgo('setTrackByDefault', true);
  vgo('process');
</script>
```

**Encontrar Account ID:** Settings > Tracking > Site Tracking

### Dados Coletados

- URL da página visitada
- Referrer (como chegou)
- Tempo na página (segundos)
- Data/hora da visita
- Dispositivo (mobile/desktop/tablet)
- Navegador e SO

### Uso em Automações

```
Trigger: Visitou página "/pricing"
  → Adicionar tag "interessado_pricing"
  → Enviar email "Quer saber mais sobre nossos preços?"
  → Criar deal com status "Prospecção"

Trigger: Visitou "/demo" E não possui tag "demo_agendada"
  → Enviar email de convite para agendar demo

Trigger: Inatividade no site > 30 dias E possui tag "cliente"
  → Enviar campanha de re-engagement
```

---

## 8. EVENT TRACKING

### O que é

API para rastrear eventos customizados além de visitas de página.

**Estrutura de um Evento:**
- **Quem**: email do contato
- **O quê**: nome do evento customizado
- **Valor**: dado associado (opcional)
- **Quando**: timestamp automático

### Implementação via API

**Endpoint:** `POST https://trackcmp.net/event`

```javascript
// Rastrear evento customizado
const trackEvent = async (email, eventName, eventValue) => {
  const params = new URLSearchParams({
    email: email,
    event: eventName,
    eventdata: eventValue || '',
    actid: 'SEU_ACCOUNT_ID',
    key: 'SUA_API_KEY'
  });

  await fetch('https://trackcmp.net/event', {
    method: 'POST',
    body: params
  });
};

// Exemplos de uso
trackEvent('joao@empresa.com', 'purchase_completed', '299.99');
trackEvent('joao@empresa.com', 'video_watched', 'demo_produto');
trackEvent('joao@empresa.com', 'file_downloaded', 'ebook_vendas');
trackEvent('joao@empresa.com', 'trial_started', '2026-03-02');
```

### Eventos Comuns

| Evento | Valor | Uso |
|--------|-------|-----|
| `purchase_completed` | Valor da compra | Trigger pós-venda |
| `video_watched` | Nome do vídeo | Engajamento com conteúdo |
| `file_downloaded` | Nome do arquivo | Lead qualificado |
| `demo_scheduled` | Data | CRM automation |
| `trial_started` | Data | Onboarding sequence |
| `feature_used` | Nome da feature | Adoção do produto |
| `webinar_registered` | Título | Nurture pré-webinar |

### Uso em Automações

```
Trigger: event:purchase_completed (qualquer valor)
  → Adicionar tag "comprador"
  → Iniciar sequência pós-venda
  → Criar nota no deal com valor da compra

Trigger: event:purchase_completed (valor > 500)
  → Adicionar tag "high_spender"
  → Mover para pipeline VIP
  → Notificar equipe de customer success
```

---

## 9. FORMULÁRIOS

### Tipos de Formulários

| Tipo | Posição | Melhor Para |
|------|---------|-------------|
| **Inline** | Dentro do conteúdo | Captura detalhada, integrado ao design |
| **Modal** | Overlay/pop-up | Exit-intent, ofertas especiais |
| **Floating Box** | Canto flutuante | Newsletter simples, não-intrusivo |
| **Floating Bar** | Barra horizontal | Email único, CTA horizontal |

### Campos Disponíveis

- Text input (nome, empresa, cargo)
- Email input (validação automática)
- Phone input (máscaras por país)
- Dropdown (seleção única)
- Checkbox (múltiplas seleções)
- Radio buttons (seleção única)
- Date picker
- Textarea (mensagem longa)
- Hidden fields (passar valores via URL params)

### Configuração de Display

```
Quando mostrar:
  ├── Após X segundos na página
  ├── Quando scroll atinge X%
  ├── Exit-intent (cursor vai para fora da janela)
  └── Após X páginas visitadas

Para quem mostrar:
  ├── Visitantes não identificados
  ├── Visitantes que nunca converteram
  └── Todos os visitantes

Em quais páginas:
  ├── Todas as páginas
  ├── Apenas em URLs específicas
  └── Excluir URLs específicas

Frequência:
  ├── 1x por visita
  ├── 1x por dia
  ├── 1x por semana
  └── Sempre
```

### Ações ao Preencher

1. Adicionar a lista (com opt-in configurável)
2. Aplicar tag automaticamente (`tag = "lead_formulario_site"`)
3. Iniciar automação específica
4. Criar deal no CRM
5. Redirecionar para página de obrigado / conteúdo premium

### Integração no Site

```html
<!-- Código embed gerado pelo ActiveCampaign -->
<script src="https://youraccountname.ck.page/embed.js" charset="utf-8"></script>
<div data-formid="FORM_ID">
  <!-- Formulário renderiza aqui -->
</div>
```

---

## 10. WHATSAPP BUSINESS (DIFERENCIAL BR)

### Por que é Diferencial no Brasil

- **96%** da população brasileira usa WhatsApp
- Única plataforma de marketing automation com WhatsApp integrado nativamente
- Permite criar automações que combinam Email + WhatsApp na mesma sequência

### Casos de Uso

```
Sequência Multicanal:
  Trigger: Lead preencheu formulário
    → Imediatamente: Enviar email de boas-vindas
    → Após 30min sem abertura: Enviar WhatsApp de follow-up
    → Após 24h: Enviar email com mais conteúdo
    → Após 48h sem resposta: Notificar vendedor no Slack
```

### Tipos de Mensagem WhatsApp

- **Template Messages**: Aprovadas pelo Meta para marketing (campanhas)
- **Session Messages**: Respostas em conversas iniciadas pelo usuário (24h após última interação)

### Configuração

Disponível nos planos Professional e Enterprise. Requer conta WhatsApp Business API verificada pelo Meta.

---

## 11. INTEGRAÇÕES POPULARES

### E-commerce

**Shopify (Nativa):**
```
Dados sincronizados automaticamente:
  ├── Novos clientes → contato no AC
  ├── Pedidos → deal + update de campos
  ├── Produtos abandonados → trigger automação
  └── Histórico de compras → segmentação

Automações nativas:
  ├── Carrinho abandonado
  ├── Pós-compra
  ├── Recomendação de produtos
  └── VIP customers
```

**WooCommerce (Deep Data):**
- Dados diretos WooCommerce → ActiveCampaign
- Carrinho abandonado, pedidos, info de cliente
- Automações baseadas em comportamento de compra

### Produtividade e Vendas

| Integração | O que sincroniza |
|-----------|-----------------|
| Calendly | Lead quando agendamento feito |
| Stripe/PayPal | Pagamentos, criar/fechar deal |
| Zoom/Teams | Registros de webinar |
| Slack | Notificações de events |
| Google Workspace | Contatos e calendário |
| Pipedrive | Deals bidirecionais |

### Automação (Sem Código)

**Zapier / Make (anteriormente Integromat):**
```
Triggers do AC disponíveis:
  ├── Novo contato criado
  ├── Tag adicionada/removida
  ├── Email aberto/clicado
  ├── Deal criado/atualizado
  └── Formulário preenchido

Ações no AC disponíveis:
  ├── Criar/atualizar contato
  ├── Adicionar/remover tag
  ├── Inscrever em lista
  ├── Iniciar automação
  └── Criar deal
```

**Exemplo de Fluxo Zapier:**
```
Google Form preenchido
  → [Zapier] →
Criar contato no AC + Adicionar tag "lead_google_form" + Iniciar automação "Nurture Inbound"
```

### CMS / Site

| Plataforma | Integração | Recurso |
|-----------|-----------|---------|
| WordPress | Plugin nativo | Formulários, sync contatos |
| Shopify | Nativa | E-commerce completo |
| Squarespace | Zapier | Básico |
| Webflow | Zapier / Webhook | Formulários |

---

## 12. RELATÓRIOS E MÉTRICAS

### Métricas de Email

| Métrica | Descrição | Benchmark |
|---------|-----------|-----------|
| **Open Rate** | % que abriu | 20-25% (média) |
| **Click Rate** | % que clicou | 2-5% (média) |
| **CTOA** | % de quem abriu E clicou | 15-25% |
| **Bounce Rate** | % que não foi entregue | <2% (saudável) |
| **Unsubscribe Rate** | % que cancelou | <0.5% |
| **Spam Rate** | % que marcou como spam | <0.1% |

### Relatórios Disponíveis

**Campanhas:**
- Número de envios, aberturas, cliques por campanha
- Mapa de cliques (heatmap de onde clicaram no email)
- Comparação entre campanhas

**Automações:**
- Total de contatos inscritos, completados, ativos
- Taxa de conversão por automação
- Distribuição nos caminhos If/Else

**Deals/Vendas:**
- Pipeline view (kanban com valores por stage)
- Performance por vendedor
- Tempo médio por stage
- Forecast de receita

**Attribution:**
- Qual email/automação levou à conversão
- Rastreamento de conversão no site após click

### Dashboard

- Customizável com widgets de KPIs
- Filtros por data, campanha, lista, tag
- Export em PDF/CSV
- Agendamento de relatórios por email

---

## 13. IA E FUNCIONALIDADES PREDITIVAS

### Predictive Sending

**O que é:** IA que analisa quando cada contato individual está mais propenso a abrir emails.

**Como funciona:**
1. Analisa histórico de abertura de emails do contato
2. Identifica horários e dias com maior taxa de abertura
3. Agenda o envio para o momento ideal (janela de até 24h)

**Resultado esperado:** Aumento de 5-15% no open rate.

**Quando NÃO usar:** Campanhas time-sensitive (promoção termina amanhã).

### AI Automation Builder

Construa automações descrevendo em linguagem natural:

```
"Crie uma automação que, quando um contato visitar a
página de pricing mais de 2 vezes em 7 dias sem comprar,
envie um email com desconto de 10% e adicione a tag
'oferta-especial-enviada'"
```

→ IA gera os passos da automação automaticamente.

### AI Content Generation

- Geração de linhas de assunto de email
- Criação de corpo do email
- Sugestão de CTAs
- A/B test de variações

### Predictive Scoring

- IA prevê probabilidade de conversão de cada lead
- Score ajustado dinamicamente baseado em comportamento
- Priorizar contatos com maior probabilidade de compra

---

## 14. BOAS PRÁTICAS E CASOS DE USO

### Estratégia de Tags vs Custom Fields

```
USE TAGS quando:
  ✓ Comportamento ou interesse temporário
  ✓ Status que pode mudar (ex: "em_trial", "proposta_pendente")
  ✓ Eventos únicos (ex: "assistiu_webinar_jan2026")
  ✓ Segmentação granular e dinâmica

USE CUSTOM FIELDS quando:
  ✓ Dados permanentes do contato (cargo, empresa, cidade)
  ✓ Dados numéricos para filtragem (receita, funcionários)
  ✓ Datas importantes (data de contrato, renovação)
  ✓ Informações que vêm de sistema externo (ID cliente)
```

### Higiene da Lista

```
Rotina mensal recomendada:
  1. Identificar contatos com 0 aberturas nos últimos 90 dias
  2. Enviar campanha de re-engagement
     - Assunto: "Ainda quer receber nossos conteúdos?"
     - 2 emails em 7 dias
  3. Quem não interagiu → remover da lista ativa
     - NÃO deletar (mantém histórico)
     - Mover para lista "Inativos"
  4. Quem interagiu → adicionar tag "reengajado"
```

### Entregabilidade

**Fatores que afetam:**
- Sender reputation (reputação do domínio e IP)
- Bounce rate (manter < 2%)
- Spam complaints (manter < 0.1%)
- Lista de qualidade (opt-in legítimo)

**Boas práticas:**
- Usar email com domínio próprio (não @gmail.com)
- Configurar SPF, DKIM e DMARC
- Aquecer IPs novos gradualmente
- Nunca comprar listas de email

### Frequência de Envio

```
Diário: Para e-commerce com promoções frequentes (com muita personalização)
Semanal: Newsletter de conteúdo (recomendado para maioria)
Quinzenal: B2B e SaaS (menos é mais)
Mensal: Re-engagement e updates de produto
```

---

## 15. AUTOMAÇÕES PRONTAS (TEMPLATES)

### 1. Welcome Series (Boas-Vindas)

**Trigger:** Contato adicionado à lista "Newsletter"

```
Imediatamente:
  → Email: "Bem-vindo(a)! Aqui está o que você receberá"
  → Adicionar tag: "boas_vindas_enviado"

Após 2 dias:
  → Email: "Conheça nossos principais produtos/serviços"

Após 5 dias:
  → Email: "Case de sucesso de um cliente similar a você"

Após 7 dias:
  → Email: "Oferta especial para novos inscritos (expira em 48h)"
  → Adicionar tag: "oferta_novo_lead"

If/Else: Clicou na oferta?
  → SIM: Adicionar tag "converteu_oferta" + Notificar vendedor
  → NÃO: Adicionar tag "lead_frio" + Continue nurture
```

### 2. Abandoned Cart (Carrinho Abandonado)

**Trigger:** Produto adicionado ao carrinho (via Shopify) sem compra

```
Aguardar 1 hora:
  → Verificar: Ainda não comprou?
    → SIM: Email "Você esqueceu algo no carrinho!"
           (com imagem e link do produto)

Aguardar 24 horas:
  → Verificar: Ainda não comprou?
    → SIM: Email "Desconto de 10% por tempo limitado!"
           Adicionar tag: "desconto_carrinho_enviado"

Aguardar 48 horas:
  → Verificar: Ainda não comprou?
    → SIM: Email "Última chance — produto pode esgotar"
           + Notificar vendedor se produto premium (> R$500)

Comprou em qualquer ponto:
  → Remover da automação
  → Iniciar automação "Pós-Compra"
```

### 3. Lead Nurture B2B (5 semanas)

**Trigger:** Tag "lead_inbound" adicionada

```
Semana 1: Email educativo (topo de funil)
  "O guia definitivo para [problema que você resolve]"

Semana 2: Email comparativo
  "Como empresas como a sua resolveram [problema]"

Semana 3: Case study
  "[Nome empresa similar] aumentou [métrica] em X% com [sua solução]"

Semana 4: Social proof + pricing
  "Veja por que 500+ empresas escolheram [sua empresa]"
  → Incluir link para pricing

Semana 5: CTA direto
  "Pronto para começar? Agende uma demo de 30 minutos"

If/Else: Clicou em link de pricing em qualquer semana?
  → Adicionar tag "interessado_pricing"
  → Acelerar: Pular para email da Semana 4
  → Notificar vendedor
```

### 4. Re-engagement (Reconexão)

**Trigger:** 30 dias sem abrir email E possui tag "cliente" ou "lead"

```
Email 1: "Sentimos sua falta! Aqui está o que perdeu"
  Assunto A: "Onde você foi?"
  Assunto B: "Você ainda quer receber nossos conteúdos?" [teste A/B]

Aguardar 7 dias:
  If/Else: Abriu email?
    → SIM: Remover tag "inativo", adicionar tag "reengajado" — FIM
    → NÃO: Continuar

Email 2: "Oferta especial para voltarmos a nos falar"
  → Cupom de desconto ou conteúdo premium

Aguardar 7 dias:
  If/Else: Abriu email?
    → SIM: Remover tag "inativo", adicionar tag "reengajado" — FIM
    → NÃO: Desinscrever da lista ativa + mover para "Inativos"
            Adicionar nota: "Desengajado em [data]"
```

### 5. Onboarding SaaS

**Trigger:** Evento `trial_started`

```
Dia 0 (imediato): Email de boas-vindas + guia rápido
  → Adicionar tag "em_trial"

Dia 1: Email "Como configurar sua conta em 5 minutos"
  → Incluir vídeo tutorial

Dia 3: If/Else: Usou feature principal?
  → SIM: Email avançado "Explore recursos premium"
  → NÃO: Email "Precisando de ajuda? Veja nosso suporte"
          + Notificar CS team

Dia 7: Email "Você está no meio do caminho do trial"
  → Mostrar features não utilizadas
  → CTA para agendar sessão de onboarding

Dia 12: Email "Seu trial termina em 2 dias"
  → Destaque ROI calculado baseado no uso
  → Oferta especial de upgrade

Dia 14: Trial expira
  → If/Else: Converteu?
    → SIM: Iniciar automação "Novo Cliente"
    → NÃO: Iniciar automação "Trial Expirado"
```

---

## 16. CONFIGURAÇÃO INICIAL

### Checklist de Setup

```
1. CONTA
   ☐ Criar conta / escolher plano
   ☐ Verificar email de domínio
   ☐ Configurar SPF, DKIM, DMARC no DNS
   ☐ Obter API Key e URL (Settings > Developer)
   ☐ Salvar no credential vault

2. LISTAS
   ☐ Criar lista principal (Newsletter/Leads)
   ☐ Criar lista de Clientes
   ☐ Definir opt-in (double/single)
   ☐ Configurar mensagem de confirmação

3. FORMULÁRIOS
   ☐ Criar formulário de inscrição
   ☐ Instalar tracking no site
   ☐ Testar submissão

4. SITE TRACKING
   ☐ Adicionar script em todas as páginas
   ☐ Verificar no painel que está coletando dados

5. AUTOMAÇÕES BASE
   ☐ Criar Welcome Series
   ☐ Criar automação de re-engagement
   ☐ Criar sequência de nutrição

6. CRM
   ☐ Criar pipeline principal
   ☐ Definir stages do processo de vendas
   ☐ Configurar campos customizados de deal

7. INTEGRAÇÕES
   ☐ Conectar Shopify/WooCommerce (se aplicável)
   ☐ Configurar Zapier/Make (se necessário)
   ☐ Testar sync de dados
```

### Encontrar Credenciais da API

1. Acesse sua conta ActiveCampaign
2. Vá para **Settings** (ícone de engrenagem)
3. Clique em **Developer**
4. Copie o **API Key** e a **API URL**

```bash
# Salvar no credential vault
node "~/.claude/task-scheduler/credential-cli.js" set ACTIVECAMPAIGN_API_KEY "sua_key"
node "~/.claude/task-scheduler/credential-cli.js" set ACTIVECAMPAIGN_API_URL "https://suaconta.api-us1.com"
```

### Teste Rápido da API

```bash
# Listar contatos para validar credenciais
curl -X GET "https://SUACONTA.api-us1.com/api/3/contacts?limit=5" \
  -H "Api-Token: SUA_API_KEY" \
  -H "Accept: application/json"
```

---

## REFERÊNCIAS

- **Documentação da API:** `ACTIVECAMPAIGN-API-DOCUMENTACAO-COMPLETA.md`
- **Quick Reference API:** `ACTIVECAMPAIGN-API-V3-QUICK-REFERENCE.md`
- **Site oficial:** https://www.activecampaign.com
- **Help Center:** https://help.activecampaign.com
- **API Reference:** https://developers.activecampaign.com/reference
- **Status da API:** https://status.activecampaign.com

---

*Documentação criada em 2026-03-02 | Versão 1.0 | Próxima revisão: 2026-06-02*
