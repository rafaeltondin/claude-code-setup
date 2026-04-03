# TINY ERP API v2 - Documentacao Completa (Fiber)

> **Empresa:** Fiber (Olist Tiny ERP)
> **Base URL:** `https://api.tiny.com.br/api2/`
> **Metodo:** Todos os endpoints usam POST
> **Formato:** JSON (`formato=json`)
> **Content-Type:** application/x-www-form-urlencoded
> **Status:** API V2 funcional sem data de descontinuacao (V3 disponivel para novos desenvolvimentos)
> **Documentacao oficial:** https://tiny.com.br/api-docs/api
> **Ultima atualizacao:** 2026-03-26

---

## SUMARIO

1. [Autenticacao](#1-autenticacao)
2. [Limites da API](#2-limites-da-api)
3. [Codigos de Processamento e Erros](#3-codigos-de-processamento-e-erros)
4. [Produtos](#4-produtos)
5. [Estoque](#5-estoque)
6. [Pedidos](#6-pedidos)
7. [Notas Fiscais](#7-notas-fiscais)
8. [Contatos](#8-contatos)
9. [Contas a Receber](#9-contas-a-receber)
10. [Contas a Pagar](#10-contas-a-pagar)
11. [Webhooks](#11-webhooks)
12. [Outros Endpoints](#12-outros-endpoints)
13. [Credenciais Vault](#13-credenciais-vault)

---

## 1. AUTENTICACAO

Todas as requisicoes exigem o parametro `token` no body do POST.

```
POST https://api.tiny.com.br/api2/{endpoint}.php
Content-Type: application/x-www-form-urlencoded

token=SEU_TOKEN&formato=json&...
```

**Tokens Fiber (Vault):**

| Unidade | CNPJ | Vault Key |
|---------|------|-----------|
| Matriz (Campo Bom RS) | 26.153.970/0001-10 | `TINY_ERP_TOKEN_MATRIZ` |
| Filial B2C (Extrema MG) | 26.153.970/0004-63 | `TINY_ERP_TOKEN_B2C` |
| Filial B2B (Extrema MG) | 26.153.970/0010-01 | `TINY_ERP_TOKEN_B2B` |

**Header de resposta:** `x-limit-api` retorna a quantidade de chamadas permitidas por minuto.

---

## 2. LIMITES DA API

### Rate Limits por Plano

| Plano | Requisicoes/min | Servicos em Lote/min |
|-------|-----------------|---------------------|
| Comecar | 0 | 0 |
| Crescer | 30 | 5 |
| Evoluir | 60 | 5 |
| Potencializar | 120 | 5 |
| Planos legados (Free/Teen/Premium/Profissional) | 20 | 5 |

### Regras Importantes

- **Concorrencia:** Limite concorrente = 1/4 do limite total (ex: 60/min -> max 15 concorrentes)
- **Lote:** Maximo 20 registros por envio
- **Resposta:** Maximo 100 registros por chamada (paginacao automatica)
- **Endpoints de lote:** Contatos (incluir/alterar), Grupos de tags (incluir/alterar), Tags (incluir/alterar), Produtos (incluir/alterar) SEMPRE contam como chamada de lote
- **Erro 6:** API bloqueada momentaneamente por muitos acessos no ultimo minuto
- **Erro 11:** API bloqueada por muitos acessos concorrentes

---

## 3. CODIGOS DE PROCESSAMENTO E ERROS

### Status de Processamento

| Codigo | Descricao |
|--------|-----------|
| 1 | Solicitacao nao processada |
| 2 | Processada com erros de validacao |
| 3 | Processada corretamente |
| 4 | Parcialmente processada |

### Codigos de Erro

| Codigo | Descricao |
|--------|-----------|
| 1 | Token nao informado |
| 2 | Token invalido ou nao encontrado |
| 3 | XML/JSON malformado |
| 4 | Erro ao processar XML/JSON |
| 5 | API bloqueada / acesso negado |
| 6 | Bloqueada - muitos acessos no ultimo minuto |
| 7 | Espaco de armazenamento esgotado |
| 8 | Empresa bloqueada |
| 9 | Numeros de sequencia duplicados |
| 10 | Parametro nao informado |
| 11 | Bloqueada - muitos acessos concorrentes |
| 20 | Consulta nao retornou registros |
| 21 | Consulta retornou registros demais |
| 22 | XML/JSON excede tamanho de lote |
| 23 | Pagina solicitada nao existe |
| 30 | Erro de duplicidade |
| 31 | Erros de validacao |
| 32 | Registro nao encontrado |
| 33 | Registro duplicado encontrado |
| 34 | Nota fiscal nao autorizada |
| 35 | Erro inesperado, tente novamente |
| 99 | Sistema em manutencao |

### Resposta Padrao

```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "codigo_erro": null,
    "erros": []
  }
}
```

---

## 4. PRODUTOS

### 4.1 Pesquisar Produtos

**URL:** `https://api.tiny.com.br/api2/produtos.pesquisa.php`

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| token | string | Sim | Token da API |
| formato | string | Sim | "json" |
| pesquisa | string | Sim | Nome, codigo ou parcial |
| idTag | int | Nao | ID da tag |
| idListaPreco | int | Nao | ID da lista de preco |
| pagina | int | Nao | Pagina (default 1, 100/pag) |
| gtin | string | Nao | Codigo GTIN/EAN |
| situacao | string | Nao | "A" (Ativo), "I" (Inativo), "E" (Excluido) |
| dataCriacao | string | Nao | dd/mm/aaaa hh:mm:ss |

**Resposta:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "pagina": "1",
    "numero_paginas": "1",
    "produtos": [
      {
        "produto": {
          "id": 46829062,
          "codigo": "123",
          "nome": "produto teste",
          "preco": "1.20",
          "preco_promocional": "1.10",
          "preco_custo": "0.80",
          "preco_custo_medio": "0.85",
          "unidade": "UN",
          "gtin": "7891234567890",
          "tipoVariacao": "P",
          "localizacao": "A1-01",
          "situacao": "A",
          "data_criacao": "2024-01-15 10:30:00"
        }
      }
    ]
  }
}
```

**tipoVariacao:** "N" (Normal), "P" (Pai/Parent), "V" (Variacao)

### 4.2 Obter Produto

**URL:** `https://api.tiny.com.br/api2/produto.obter.php`

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| token | string | Sim |
| id | int | Sim |
| formato | string | Sim |

**Campos de resposta:** id, codigo, nome, unidade, preco, preco_promocional, ncm, gtin, gtin_embalagem, peso_liquido, peso_bruto, estoque_minimo, estoque_maximo, situacao ("A"/"I"), tipo ("P"=Produto/"S"=Servico), marca, categoria, tipoVariacao, variacoes[], anexos[], imagens_externas[], classe_produto ("S"=Simples/"K"=Kit/"V"=Variacoes/"F"=Fabricado/"M"=Materia-prima), mapeamentos[] (requer header Developer-Id)

**Exemplo com variacoes:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "produto": {
      "id": "349112581",
      "codigo": "123",
      "nome": "produto teste",
      "preco": 0,
      "tipoVariacao": "P",
      "variacoes": [
        {
          "variacao": {
            "id": "323221231",
            "codigo": "123-1",
            "preco": "36.32",
            "grade": {"Tamanho": "GG", "Cor": "Branco"}
          }
        }
      ]
    }
  }
}
```

### 4.3 Incluir Produto

**URL:** `https://api.tiny.com.br/api2/produto.incluir.php`

**Campos do produto:**

| Campo | Tipo | Tam | Obrig | Descricao |
|-------|------|-----|-------|-----------|
| sequencia | int | - | Sim | Numero sequencial |
| nome | string | 120 | Sim | Nome do produto |
| codigo | string | 30 | Nao | Codigo interno |
| unidade | string | 3 | Sim | UN, CX, KG, etc |
| preco | decimal | - | Sim | Preco de venda |
| preco_promocional | decimal | - | Nao | Preco promocional |
| situacao | string | 1 | Sim | "A" ou "I" |
| tipo | string | 1 | Sim | "P" (Produto) ou "S" (Servico) |
| origem | string | 1 | Sim | Origem fiscal |
| ncm | string | 10 | Nao | Codigo NCM |
| gtin | string | 14 | Nao | Codigo GTIN/EAN |
| gtin_embalagem | string | 14 | Nao | GTIN da embalagem |
| marca | string | - | Nao | Marca |
| classe_produto | string | 1 | Nao | S/K/V/F/M |
| estoque_minimo | decimal | - | Nao | Estoque minimo |
| estoque_maximo | decimal | - | Nao | Estoque maximo |
| estoque_atual | decimal | - | Nao | Estoque inicial |
| localizacao | string | 50 | Nao | Local no deposito |
| preco_custo | decimal | - | Nao | Preco de custo |
| id_fornecedor | int | - | Nao | ID do fornecedor |
| codigo_fornecedor | string | 15 | Nao | Codigo no fornecedor |
| codigo_pelo_fornecedor | string | 20 | Nao | Codigo pelo fornecedor |
| descricao_complementar | text | - | Nao | Descricao longa |
| obs | text | - | Nao | Observacoes |
| garantia | text | - | Nao | Texto de garantia |
| cest | text | 9 | Nao | Codigo CEST |
| codigo_anvisa | text | 13 | Cond. | Codigo ANVISA (medicamentos) |
| motivo_isencao | text | 255 | Nao | Motivo isencao ANVISA |
| classe_ipi | string | 5 | Nao | Classe IPI (bebidas/cigarros) |
| valor_ipi_fixo | decimal | - | Nao | Valor fixo IPI |
| cod_lista_servicos | string | 5 | Nao | Codigo lista servicos |
| categoria | string | - | Nao | Categoria |
| tags | array | - | Nao | Tags do produto |
| dias_preparacao | int | 9 | Nao | Dias para preparacao |

**Campos SEO:** seo_title (120), seo_keywords (255), seo_description (255), link_video (100), slug

**Campos embalagem:** tipo_embalagem (int), altura_embalagem, largura_embalagem, comprimento_embalagem, diametro_embalagem (decimais)

**Estruturas complexas:** estrutura[] (composicao), etapas[] (producao), kit[] (itens do kit), variacoes[], anexos[], imagens_externas[], mapeamentos[]

### 4.4 Alterar Produto

**URL:** `https://api.tiny.com.br/api2/produto.alterar.php`

Mesma estrutura do incluir, com campo `id` obrigatorio para identificar o produto.

---

## 5. ESTOQUE

### 5.1 Obter Estoque do Produto

**URL:** `https://api.tiny.com.br/api2/produto.obter.estoque.php`

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| token | string | Sim |
| id | int | Sim |
| formato | string | Sim |

**Resposta:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "produto": {
      "id": 123,
      "nome": "Produto X",
      "codigo": "SKU-001",
      "unidade": "UN",
      "saldo": "150.00",
      "saldoReservado": "10.00",
      "depositos": [
        {
          "deposito": {
            "nome": "Deposito Principal",
            "desconsiderar": "N",
            "saldo": "150.00",
            "empresa": "Fiber Matriz"
          }
        }
      ]
    }
  }
}
```

### 5.2 Atualizar Estoque

**URL:** `https://api.tiny.com.br/api2/produto.atualizar.estoque.php`

| Campo | Tipo | Obrig | Descricao |
|-------|------|-------|-----------|
| token | string | Sim | Token API |
| formato | string | Sim | "json" |
| estoque.idProduto | int | Sim | ID do produto |
| estoque.tipo | string | Nao | "E" (entrada), "S" (saida), "B" (balanco) |
| estoque.data | datetime | Nao | Y-m-d H:i:s (default: agora) |
| estoque.quantidade | decimal | Sim | Quantidade movimentada |
| estoque.precoUnitario | decimal | Nao | Preco unitario |
| estoque.observacoes | string | Nao | Observacoes (max 100 chars) |
| estoque.deposito | string | Nao | Nome do deposito |

**Resposta:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "registros": [{
      "registro": {
        "id": 123,
        "saldoEstoque": "160.00",
        "registroCriado": true
      }
    }]
  }
}
```

### 5.3 Lista de Atualizacoes de Estoque

**URL:** `https://api.tiny.com.br/api2/lista.atualizacoes.estoque`

Retorna historico de movimentacoes de estoque com filtros por data.

---

## 6. PEDIDOS

### Status de Pedidos

| Status | Codigo |
|--------|--------|
| Em aberto | `aberto` |
| Aprovado | `aprovado` |
| Preparando envio | `preparando_envio` |
| Faturado (atendido) | `faturado` |
| Pronto para envio | `pronto_envio` |
| Enviado | `enviado` |
| Entregue | `entregue` |
| Nao Entregue | `nao_entregue` |
| Cancelado | `cancelado` |

### 6.1 Pesquisar Pedidos

**URL:** `https://api.tiny.com.br/api2/pedidos.pesquisa.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| formato | string | Sim | "json" |
| numero | string | Cond. | Numero do pedido* |
| cliente | string | Cond. | Nome ou codigo do cliente* |
| cpf_cnpj | string | Cond. | CPF ou CNPJ* |
| dataInicial | string | Nao | dd/mm/yyyy |
| dataFinal | string | Nao | dd/mm/yyyy |
| dataAtualizacao | string | Nao | dd/mm/yyyy hh:mm:ss |
| situacao | string | Nao | Status do pedido |
| numeroEcommerce | string | Nao | Numero no e-commerce |
| idVendedor | string | Nao | ID do vendedor |
| nomeVendedor | string | Nao | Nome do vendedor |
| marcador | string | Nao | Descricao do marcador |
| dataInicialOcorrencia | string | Nao | dd/mm/yyyy |
| dataFinalOcorrencia | string | Nao | dd/mm/yyyy |
| situacaoOcorrencia | string | Nao | Status da ocorrencia |
| pagina | int | Nao | Pagina (default 1, 100/pag) |
| sort | string | Nao | ASC ou DESC |

*Pelo menos um dos campos marcados deve ser informado.

**Resposta:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "pagina": "1",
    "numero_paginas": "3",
    "pedidos": [
      {
        "pedido": {
          "id": 123456,
          "numero": "1001",
          "numero_ecommerce": "SHP-5001",
          "data_pedido": "15/03/2026",
          "data_prevista": "20/03/2026",
          "nome": "Cliente Teste",
          "valor": "350.00",
          "id_vendedor": 1,
          "nome_vendedor": "Vendedor 1",
          "situacao": "aprovado",
          "codigo_rastreamento": "BR123456789"
        }
      }
    ]
  }
}
```

### 6.2 Obter Pedido

**URL:** `https://api.tiny.com.br/api2/pedido.obter.php`

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| token | string | Sim |
| id | int | Sim |
| formato | string | Sim |

**Campos de resposta completos:**

- **Basico:** id, numero, numero_ecommerce, data_pedido, data_prevista, data_faturamento, data_envio, data_entrega, situacao
- **Cliente:** cliente.nome, cpf_cnpj, email, fone, endereco, numero, complemento, bairro, cep, cidade, uf
- **Endereco entrega:** endereco_entrega (mesma estrutura do cliente + nome_destinatario)
- **Itens:** itens[].item.codigo, descricao, quantidade, valor_unitario, informacao_adicional
- **Pagamento:** forma_pagamento, meio_pagamento, parcelas[].dias/data/valor/obs/destino/forma_pagamento
- **Frete:** nome_transportador, frete_por_conta, forma_frete, valor_frete, codigo_rastreamento, url_rastreamento
- **Totais:** total_produtos, total_pedido, valor_desconto, valor_frete
- **Outros:** deposito, id_vendedor, obs, obs_internas, id_nota_fiscal, ecommerce, marcadores[]
- **Pagamentos integrados:** pagamentos_integrados[].tipo_pagamento/valor/cnpj_intermediador/codigo_autorizacao/codigo_bandeira
- **Intermediador:** intermediador.nome/cnpj/cnpjPagamento

### 6.3 Incluir Pedido

**URL:** `https://api.tiny.com.br/api2/pedido.incluir.php`

**Estrutura completa:**
```json
{
  "pedido": {
    "data_pedido": "20/10/2024",
    "data_prevista": "22/10/2024",
    "id_lista_preco": 0,
    "cliente": {
      "codigo": "1235",
      "nome": "Contato Teste",
      "nome_fantasia": "Fantasia",
      "tipo_pessoa": "F",
      "cpf_cnpj": "22755777850",
      "ie": "",
      "rg": "1234567890",
      "endereco": "Rua Teste",
      "numero": "123",
      "complemento": "sala 2",
      "bairro": "Teste",
      "cep": "95700000",
      "cidade": "Bento Goncalves",
      "uf": "RS",
      "pais": "Brasil",
      "fone": "5430553808",
      "email": "teste@email.com",
      "atualizar_cliente": "S",
      "cpfConsumidorFinal": "22755777850"
    },
    "endereco_entrega": {
      "tipo_pessoa": "F",
      "cpf_cnpj": "22755777850",
      "endereco": "Rua Entrega",
      "numero": "456",
      "complemento": "apto 10",
      "bairro": "Bairro Entrega",
      "cep": "95700000",
      "cidade": "Bento Goncalves",
      "uf": "RS",
      "fone": "5430553808",
      "nome_destinatario": "Destinatario Teste"
    },
    "itens": [
      {
        "item": {
          "id_produto": 0,
          "codigo": "1234",
          "descricao": "Produto Teste 1",
          "unidade": "UN",
          "quantidade": "2",
          "valor_unitario": "50.25",
          "aliquota_comissao": "0",
          "informacao_adicional": "Info adicional"
        }
      }
    ],
    "marcadores": [{"marcador": {"id": 0, "descricao": "tag"}}],
    "forma_pagamento": "multiplas",
    "meio_pagamento": "Cartao Credito",
    "parcelas": [
      {
        "parcela": {
          "dias": "30",
          "data": "29/11/2024",
          "valor": "53.84",
          "obs": "Obs Parcela 1",
          "destino": "Contas a Receber",
          "forma_pagamento": "boleto",
          "meio_pagamento": "Bradesco"
        }
      }
    ],
    "nome_transportador": "transportador teste",
    "frete_por_conta": "E",
    "valor_frete": "35.00",
    "forma_envio": "c",
    "forma_frete": "PAC",
    "valor_desconto": "35.00",
    "outras_despesas": "0",
    "numero_ordem_compra": "ORD123",
    "id_vendedor": 0,
    "nome_vendedor": "Vendedor Teste",
    "obs": "Observacoes do Pedido",
    "obs_internas": "Obs internas",
    "situacao": "Aberto",
    "numero_pedido_ecommerce": "123",
    "id_ecommerce": 0,
    "ecommerce": "Plataforma",
    "id_natureza_operacao": "1",
    "nome_natureza_operacao": "Venda",
    "nome_deposito": "Deposito Principal",
    "intermediador": {
      "nome": "Intermediador",
      "cnpj": "00.000.000/0000-00",
      "cnpjPagamento": "00.000.000/0000-00"
    },
    "pagamentos_integrados": [
      {
        "pagamento_integrado": {
          "tipo_pagamento": "17",
          "valor": "29.99",
          "cnpj_intermediador": "21018182000106",
          "codigo_autorizacao": "AUTH123",
          "codigo_bandeira": "2"
        }
      }
    ]
  }
}
```

### 6.4 Alterar Situacao do Pedido

**URL:** `https://api.tiny.com.br/api2/pedido.alterar.situacao`

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| token | string | Sim |
| id | int | Sim |
| situacao | string | Sim |
| formato | string | Sim |

Situacoes: aberto, aprovado, preparando_envio, faturado, pronto_envio, enviado, entregue, nao_entregue, cancelado

### 6.5 Gerar Nota Fiscal do Pedido

**URL:** `https://api.tiny.com.br/api2/pedido.gerar.nota.fiscal.php`

Gera automaticamente uma NF-e a partir do pedido.

### 6.6 Alterar Pedido

**URL:** `https://api.tiny.com.br/api2/pedido.alterar.php`

Mesma estrutura do incluir, com `id` obrigatorio.

---

## 7. NOTAS FISCAIS

### 7.1 Pesquisar Notas Fiscais

**URL:** `https://api.tiny.com.br/api2/notas.fiscais.pesquisa.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| formato | string | Sim | "json" |
| tipoNota | string | Cond. | "E" (entrada) ou "S" (saida)* |
| numero | string | Cond. | Numero da nota* |
| cliente | string | Cond. | Nome ou codigo* |
| cpf_cnpj | string | Cond. | CPF ou CNPJ* |
| dataInicial | string | Nao | dd/mm/yyyy |
| dataFinal | string | Nao | dd/mm/yyyy |
| situacao | string | Nao | Status da NF |
| numeroEcommerce | string | Nao | Numero e-commerce |
| idVendedor | string | Nao | ID vendedor |
| idFormaEnvio | string | Nao | ID forma de envio |
| nomeVendedor | string | Nao | Nome vendedor |
| pagina | int | Nao | Pagina (100/pag) |

*Pelo menos um dos campos marcados deve ser informado.

**Campos resposta:** id, tipo, serie, numero, numero_ecommerce, data_emissao, cliente, endereco_entrega, transportador, valor, valor_produtos, valor_frete, id_vendedor, nome_vendedor, situacao, chave_acesso, id_forma_envio, codigo_rastreamento, url_rastreamento

### 7.2 Obter Nota Fiscal

**URL:** `https://api.tiny.com.br/api2/nota.fiscal.obter.php`

| Parametro | Tipo | Obrigatorio |
|-----------|------|-------------|
| token | string | Sim |
| id | int | Sim |
| formato | string | Sim |

**Campos de resposta completos:**

- **Basico:** id, tipo_nota, natureza_operacao, regime_tributario, finalidade, serie, numero, numero_ecommerce
- **Datas:** data_emissao, data_saida, hora_saida (dd/mm/yyyy / hh:mm:ss)
- **Cliente:** nome, tipo_pessoa (F/J/E), cpf_cnpj, ie, endereco completo, fone, email
- **Endereco entrega:** nome_destinatario + endereco completo
- **Itens:** id_produto, codigo, descricao, unidade, ncm, quantidade, valor_unitario, valor_total, cfop, natureza
- **Impostos:** base_icms, valor_icms, base_icms_st, valor_icms_st, valor_ipi, valor_issqn
- **Valores:** valor_servicos, valor_produtos, valor_frete, valor_seguro, valor_outras, valor_nota, valor_desconto, valor_faturado
- **Frete:** frete_por_conta (R/D/T/3/4/S), transportador (nome, cpf_cnpj, ie, endereco), placa, uf_placa
- **Volumes:** quantidade_volumes, especie_volumes, marca_volumes, peso_bruto, peso_liquido
- **Envio:** forma_envio, forma_frete, codigo_rastreamento, url_rastreamento
- **Pagamento:** forma_pagamento, meio_pagamento, condicao_pagamento, parcelas[]
- **Integrado:** pagamentos_integrados[].valor/tipo_pagamento/cnpj_intermediador/codigo_autorizacao/codigo_bandeira
- **Outros:** id_venda, id_vendedor, nome_vendedor, situacao, descricao_situacao, obs, chave_acesso, marcadores[], intermediador

### 7.3 Incluir Nota Fiscal

**URL:** `https://api.tiny.com.br/api2/nota.fiscal.incluir.php`

**Estrutura completa:**
```json
{
  "nota_fiscal": {
    "tipo": "S",
    "id_natureza_operacao": 0,
    "natureza_operacao": "Venda",
    "data_emissao": "dd/mm/yyyy",
    "hora_emissao": "hh:mm:ss",
    "data_entrada_saida": "dd/mm/yyyy",
    "hora_entrada_saida": "hh:mm:ss",
    "cliente": {
      "codigo": "", "nome": "", "tipo_pessoa": "F|J|E",
      "cpf_cnpj": "", "ie": "", "rg": "",
      "endereco": "", "numero": "", "complemento": "",
      "bairro": "", "cep": "", "cidade": "", "uf": "",
      "pais": "", "fone": "", "email": "",
      "atualizar_cliente": "S|N"
    },
    "endereco_entrega": {
      "tipo_pessoa": "", "cpf_cnpj": "",
      "endereco": "", "numero": "", "complemento": "",
      "bairro": "", "cep": "", "cidade": "", "uf": "",
      "fone": "", "nome_destinatario": "", "ie": ""
    },
    "itens": [{
      "item": {
        "id_produto": 0, "codigo": "", "descricao": "",
        "unidade": "", "quantidade": 0, "valor_unitario": 0,
        "tipo": "P|S", "origem": "", "numero_fci": "",
        "ncm": "", "peso_bruto": 0, "peso_liquido": 0,
        "gtin_ean": "", "gtin_ean_embalagem": "",
        "codigo_lista_servicos": "", "aliquota_comissao": 0,
        "cest": "", "numero_pedido_compra": "",
        "numero_item_pedido_compra": 0,
        "descricao_complementar": "",
        "codigo_anvisa": "", "valor_max": 0,
        "motivo_isencao": ""
      }
    }],
    "marcadores": [{"marcador": {"descricao": ""}}],
    "forma_pagamento": "",
    "meio_pagamento": "",
    "parcelas": [{
      "parcela": {
        "dias": 0, "data": "dd/mm/yyyy", "valor": 0,
        "obs": "", "destino": "",
        "forma_pagamento": "", "meio_pagamento": "",
        "meio_pagamento_nfe": 0
      }
    }],
    "transportador": {
      "codigo": "", "nome": "", "tipo_pessoa": "F|J|E",
      "cpf_cnpj": "", "ie": "", "endereco": "", "cidade": "", "uf": ""
    },
    "forma_envio": "", "forma_frete": "",
    "frete_por_conta": "R|D",
    "placa_veiculo": "", "uf_veiculo": "",
    "quantidade_volumes": 0, "especie_volumes": "",
    "marca_volumes": "", "numero_volumes": "",
    "valor_desconto": 0, "valor_frete": 0,
    "valor_seguro": 0, "valor_despesas": 0,
    "nf_produtor_rural": {"serie": "", "numero": "", "ano_mes_emissao": ""},
    "id_vendedor": 0, "nome_vendedor": "",
    "numero_pedido_ecommerce": "",
    "finalidade": 0, "refNFe": "", "obs": "",
    "ecommerce": "",
    "intermediador": {"nome": "", "cnpj": "", "cnpjPagamento": ""},
    "pagamentos_integrados": [{
      "pagamento_integrado": {
        "tipo_pagamento": 0, "valor": 0,
        "cnpj_intermediador": "",
        "codigo_autorizacao": "", "codigo_bandeira": 0
      }
    }]
  }
}
```

### 7.4 Emitir Nota Fiscal

**URL:** `https://api.tiny.com.br/api2/nota.fiscal.emitir.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| id | int | Cond. | ID da nota (ou serie+numero) |
| serie | string | Cond. | Serie da nota (com numero) |
| numero | string | Cond. | Numero da nota (com serie) |
| enviarEmail | string | Nao | "S" ou "N" |
| formato | string | Sim | "json" |

**Resposta:**
```json
{
  "retorno": {
    "status_processamento": 3,
    "status": "OK",
    "nota_fiscal": {
      "id": 123,
      "chave_acesso": "43210...",
      "link_acesso": "https://...",
      "situacao": 6,
      "descricao_situacao": "Autorizada",
      "xml": "<nfeProc>...</nfeProc>"
    }
  }
}
```

### 7.5 Incluir Nota via XML

**URL:** `https://api.tiny.com.br/api2/nota.fiscal.incluir.xml.php`

Importa NF-e diretamente do XML.

### 7.6 Atualizar Dados de Despacho

**URL:** `https://api.tiny.com.br/api2/nota.fiscal.cadastrar.codigo.rastreamento.php`

Atualiza codigo de rastreamento e dados de envio da nota.

---

## 8. CONTATOS

### 8.1 Pesquisar Contatos

**URL:** `https://api.tiny.com.br/api2/contatos.pesquisa.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| pesquisa | string | Sim | Nome ou codigo (parcial) |
| formato | string | Sim | "json" |
| cpf_cnpj | string | Nao | CPF ou CNPJ |
| idVendedor | int | Nao | ID do vendedor |
| nomeVendedor | string | Nao | Nome vendedor |
| situacao | string | Nao | "Ativo" ou "Excluido" |
| pagina | int | Nao | Pagina (100/pag) |
| dataCriacao | string | Nao | dd/mm/aaaa hh:mm:ss |
| dataMinimaAtualizacao | string | Nao | dd/mm/aaaa hh:mm:ss |

**Campos resposta:** id, codigo, nome, tipo_pessoa, cpf_cnpj, endereco, email, situacao, dados de vendedor

### 8.2 Obter Contato

**URL:** `https://api.tiny.com.br/api2/contato.obter.php`

Retorna todos os dados do contato por ID.

### 8.3 Incluir Contato

**URL:** `https://api.tiny.com.br/api2/contato.incluir.php`

**Estrutura completa:**
```json
{
  "contatos": [{
    "contato": {
      "sequencia": "1",
      "codigo": "string (30)",
      "nome": "string (50, obrigatorio)",
      "fantasia": "string (60)",
      "tipo_pessoa": "F|J|E",
      "cpf_cnpj": "string (18)",
      "ie": "string (18)",
      "rg": "string (10)",
      "im": "string (18)",
      "endereco": "string (50)",
      "numero": "string (10)",
      "complemento": "string (50)",
      "bairro": "string (30)",
      "cep": "string (10)",
      "cidade": "string (30)",
      "uf": "string (30)",
      "pais": "string (50)",
      "endereco_cobranca": "string (50)",
      "numero_cobranca": "string (10)",
      "complemento_cobranca": "string (50)",
      "bairro_cobranca": "string (30)",
      "cep_cobranca": "string (10)",
      "cidade_cobranca": "string (30)",
      "uf_cobranca": "string (30)",
      "contatos": "string (100)",
      "fone": "string (40)",
      "fax": "string (40)",
      "celular": "string (40)",
      "email": "string (50)",
      "email_nfe": "string (50)",
      "site": "string (40)",
      "crt": "0|1|3",
      "estadoCivil": "int",
      "profissao": "string (50)",
      "sexo": "masculino|feminino",
      "data_nascimento": "dd/mm/yyyy",
      "naturalidade": "string (40)",
      "nome_pai": "string (100)",
      "cpf_pai": "string (18)",
      "nome_mae": "string (100)",
      "cpf_mae": "string (18)",
      "limite_credito": "decimal",
      "id_vendedor": "int",
      "nome_vendedor": "string (50)",
      "tipos_contato": [{"tipo": "string (30)"}],
      "pessoas_contato": [{
        "pessoa_contato": {
          "nome": "string (50)",
          "telefone": "string (30)",
          "ramal": "string (20)",
          "email": "string (50)",
          "departamento": "string (50)"
        }
      }],
      "situacao": "A|I|S (obrigatorio)",
      "obs": "string (200)",
      "contribuinte": "0|1|2|9"
    }
  }]
}
```

### 8.4 Alterar Contato

**URL:** `https://api.tiny.com.br/api2/contato.alterar.php`

Mesma estrutura com `id` obrigatorio.

---

## 9. CONTAS A RECEBER

### 9.1 Pesquisar Contas a Receber

**URL:** `https://api.tiny.com.br/api2/contas.receber.pesquisa.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| formato | string | Sim | "json" |
| nome_cliente | string | Cond. | Nome do cliente* |
| numero_doc | string | Cond. | Numero do documento* |
| numero_banco | string | Cond. | Numero bancario* |
| data_ini_emissao | string | Nao | dd/mm/yyyy |
| data_fim_emissao | string | Nao | dd/mm/yyyy |
| data_ini_vencimento | string | Nao | dd/mm/yyyy |
| data_fim_vencimento | string | Nao | dd/mm/yyyy |
| situacao | string | Nao | aberto, pago, cancelada, parcial |
| id_origem | string | Nao | ID do documento origem |
| pagina | int | Nao | Pagina (100/pag) |

*Pelo menos um filtro deve ser informado.

**Campos resposta:** id, nome_cliente, numero_doc, serie_doc, data_vencimento, data_emissao, valor, saldo, situacao

### 9.2 Obter Conta a Receber

**URL:** `https://api.tiny.com.br/api2/conta.receber.obter.php`

### 9.3 Incluir Conta a Receber

**URL:** `https://api.tiny.com.br/api2/conta.receber.incluir.php`

### 9.4 Alterar Conta a Receber

**URL:** `https://api.tiny.com.br/api2/conta.receber.alterar.php`

### 9.5 Baixar Conta a Receber (Liquidacao)

**URL:** `https://api.tiny.com.br/api2/conta.receber.baixar.php`

---

## 10. CONTAS A PAGAR

### 10.1 Pesquisar Contas a Pagar

**URL:** `https://api.tiny.com.br/api2/contas.pagar.pesquisa.php`

| Parametro | Tipo | Obrig | Descricao |
|-----------|------|-------|-----------|
| token | string | Sim | Token API |
| formato | string | Sim | "json" |
| nome_cliente | string | Cond. | Nome do fornecedor |
| numero_doc | string | Cond. | Numero do documento |
| data_ini_emissao | string | Nao | dd/mm/yyyy |
| data_fim_emissao | string | Nao | dd/mm/yyyy |
| data_ini_vencimento | string | Nao | dd/mm/yyyy |
| data_fim_vencimento | string | Nao | dd/mm/yyyy |
| situacao | string | Nao | aberto, pago, cancelada, parcial |
| pagina | int | Nao | Pagina (100/pag) |

**Campos resposta:** id, nome_cliente, historico, numero_doc, data_vencimento, data_emissao, valor, saldo, situacao

### 10.2 Obter Conta a Pagar

**URL:** `https://api.tiny.com.br/api2/conta.pagar.obter.php`

### 10.3 Baixar Conta a Pagar (Liquidacao)

**URL:** `https://api.tiny.com.br/api2/conta.pagar.baixar.php`

---

## 11. WEBHOOKS

### Eventos Disponiveis

| Evento | Descricao |
|--------|-----------|
| Atualizacao de estoque | Mudancas no saldo de estoque |
| Despacho de produto | Notificacao de envio |
| Envio de codigo de rastreamento | Atualizacao de tracking |
| Envio de nota fiscal | Transmissao de NF-e |
| Atualizacao de preco de produto | Mudanca de preco |
| Alteracao de status do pedido | Mudanca de situacao |
| Pesquisa de frete | Cotacao de frete |

Webhooks sao configurados no painel do Tiny ERP e enviam notificacoes HTTP para a URL cadastrada.

---

## 12. OUTROS ENDPOINTS

### CRM
- `crm.ocorrencias.pesquisar.php` - Pesquisar ocorrencias
- `crm.ocorrencia.obter.php` - Obter ocorrencia
- `crm.ocorrencia.incluir.php` - Incluir ocorrencia
- `crm.etapas.pesquisar.php` - Pesquisar etapas

### Expedicao
- `expedicoes.pesquisar.php` - Pesquisar expedicoes
- `expedicao.obter.php` - Obter expedicao
- `expedicao.alterar.php` - Alterar expedicao
- `expedicao.agrupar.php` - Agrupar expedicoes

### Contratos
- `contratos.pesquisar.php` - Pesquisar contratos
- `contrato.obter.php` - Obter contrato
- `contrato.incluir.php` - Incluir contrato

### Listas de Preco
- `listas.precos.pesquisar.php` - Pesquisar listas
- `lista.precos.excecoes.php` - Gerenciar excecoes

### Tags de Produto
- `produto.tags.pesquisar.php` - Pesquisar tags
- `produto.tags.incluir.php` - Incluir tags
- `produto.tags.grupos.pesquisar.php` - Pesquisar grupos

### Notas de Servico (NFS-e)
- `notas.servico.pesquisa.php` - Pesquisar NFS-e
- `nota.servico.obter.php` - Obter NFS-e
- `nota.servico.incluir.php` - Incluir NFS-e
- `nota.servico.enviar.php` - Transmitir NFS-e

### Vendedores
- `vendedores.pesquisa.php` - Pesquisar vendedores

### Frete
- `frete.cotacao.php` - Solicitar cotacao de frete

### Tabelas de Referencia
- `tabelas.paises.php` - Paises
- `tabelas.municipios.php` - Municipios
- `tabelas.contatos.php` - Auxiliar de contatos
- `tabelas.produtos.php` - Auxiliar de produtos
- `tabelas.pedidos.php` - Auxiliar de pedidos (status)
- `tabelas.notas.fiscais.php` - Auxiliar de NFs
- `tabelas.servicos.php` - Auxiliar de servicos
- `tabelas.contratos.php` - Auxiliar de contratos
- `tabelas.formas.pagamento.php` - Formas de pagamento
- `tabelas.regime.tributario.php` - Regime tributario
- `tabelas.processamento.php` - Codigos de processamento/erro

---

## 13. CREDENCIAIS VAULT

| Vault Key | Descricao |
|-----------|-----------|
| `TINY_ERP_API_URL` | Base URL: https://api.tiny.com.br/api2/ |
| `TINY_ERP_TOKEN_MATRIZ` | Fiber Matriz - Campo Bom RS (26.153.970/0001-10) |
| `TINY_ERP_TOKEN_B2C` | Fiber Filial B2C - Extrema MG (26.153.970/0004-63) |
| `TINY_ERP_TOKEN_B2B` | Fiber Filial B2B - Extrema MG (26.153.970/0010-01) |

### Exemplo de uso via Node.js

```javascript
const vault = require(require('os').homedir() + '/.claude/task-scheduler/credential-vault.js');
const token = vault.reveal('TINY_ERP_TOKEN_MATRIZ').value;

const https = require('https');
const querystring = require('querystring');

const postData = querystring.stringify({
  token: token,
  formato: 'json',
  pesquisa: 'camiseta'
});

const options = {
  hostname: 'api.tiny.com.br',
  path: '/api2/produtos.pesquisa.php',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
});
req.write(postData);
req.end();
```

---

## CONVENCOES GERAIS

- **Metodo HTTP:** Sempre POST
- **Content-Type:** application/x-www-form-urlencoded
- **Formato de data:** dd/mm/yyyy (resposta e envio)
- **Formato de hora:** hh:mm:ss
- **Separador decimal:** Ponto (.) ex: "5.25"
- **Paginacao:** 100 registros por pagina, parametro `pagina`
- **Resposta HTTP:** Sempre 200 (erros sao no body JSON)
- **Encoding:** UTF-8
- **Lote maximo:** 20 registros por envio
- **Concorrencia:** 1/4 do limite de req/min
