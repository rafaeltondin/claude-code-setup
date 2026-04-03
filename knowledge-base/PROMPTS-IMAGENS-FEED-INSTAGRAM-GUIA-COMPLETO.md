# Guia Completo: Prompts para Imagens de Feed Instagram Orgânico

> Documentação baseada na análise de 100+ prompts reais de dois projetos distintos com resultados comprovados.
> Padrão genérico — ajustar cores, tipografia e identidade visual para cada empresa.

---

## 1. VISÃO GERAL DO SISTEMA

### O Que É
Um sistema estruturado para gerar prompts de imagens para posts de feed Instagram orgânico via IA generativa (Midjourney, DALL-E, Stable Diffusion, GPT-4o, Gemini Image Gen, etc.).

### Princípio Central
Cada prompt é um **brief visual completo** que combina:
- **Conceito visual** (metáfora do tema do post)
- **Paleta de cores** (identidade da marca)
- **Tipografia overlay** (headline do post)
- **Direção de arte** (iluminação, atmosfera, composição)
- **Especificações técnicas** (resolução, aspect ratio)

### Resultado
Imagens consistentes, profissionais e alinhadas à identidade visual da marca — prontas para publicação direta no Instagram.

---

## 2. ESTRUTURA DO JSON (Formato de Batch)

Para geração em lote, cada prompt é armazenado em JSON:

```json
{
  "prompt": "descrição visual completa em inglês...",
  "filename": "post-01-tema-descritivo.png",
  "resolution": "2K",
  "aspectRatio": "4:5"
}
```

### Campos

| Campo | Valor | Descrição |
|-------|-------|-----------|
| `prompt` | string (2.000-4.500 chars) | Descrição visual completa |
| `filename` | `post-XX-nome-kebab.png` | Nome descritivo do arquivo |
| `resolution` | `2K` | Resolução mínima para qualidade |
| `aspectRatio` | `4:5` | Padrão Instagram feed vertical |

### Arquivo de Batch
Cada batch contém 10 prompts em um array JSON:
```json
[
  { "prompt": "...", "filename": "post-01-tema.png", "resolution": "2K", "aspectRatio": "4:5" },
  { "prompt": "...", "filename": "post-02-tema.png", "resolution": "2K", "aspectRatio": "4:5" },
  ...
]
```

Nomenclatura do arquivo batch: `batch-01-10.json`, `batch-11-20.json`, etc.

---

## 3. ANATOMIA DO PROMPT — 7 BLOCOS OBRIGATÓRIOS

Todo prompt segue esta estrutura sequencial de 7 blocos:

```
[1. CONCEITO VISUAL] + [2. CORES E ELEMENTOS] + [3. FUNDO E ATMOSFERA] +
[4. DETALHES DE FUNDO] + [5. TIPOGRAFIA OVERLAY] + [6. DIREÇÃO DE ARTE] +
[7. INSTRUÇÕES FINAIS]
```

### Bloco 1: Conceito Visual (Abertura)
A primeira frase define o **tema e estilo** da imagem.

**Fórmula:**
```
[Estilo/atmosfera] + [conceito do tema] + [elemento visual principal]
```

**Exemplos:**
```
"Dark moody e-commerce concept, a sleek laptop displaying an online store..."
"Futuristic automation and AI concept, robotic arms and gears..."
"Sales funnel visualization in dark tech style, a glowing 3D funnel..."
"Split screen comparison concept on dark background, left side showing..."
"Sports data analytics visualization showing streak patterns..."
"Abstract mathematical universe scene with luminous equations..."
```

**Boas Práticas:**
- Comece com o estilo visual ("Dark moody", "Futuristic", "Dramatic", "Split screen")
- Nomeie o conceito ("e-commerce concept", "AI concept", "financial growth chart")
- Descreva o elemento visual principal logo na primeira frase
- Use verbos visuais ("showing", "displaying", "floating", "emerging")

### Bloco 2: Cores e Elementos Visuais
Aplique as **3 cores funcionais** da marca aos elementos descritos.

**Fórmula:**
```
[elemento] in [cor principal] (#hex), [elemento secundário] in [cor secundária] (#hex),
[elemento de destaque] in [cor terciária] (#hex)
```

**Exemplo (genérico):**
```
"...neon green (#XXXXXX) profit indicators and growth arrows,
electric blue (#XXXXXX) data streams flowing between elements,
amber (#XXXXXX) alert markers at key decision points..."
```

**Regra das 3 Cores Funcionais:**

| Função | Uso | Associação |
|--------|-----|------------|
| **Cor Principal** | Números positivos, sucesso, destaque hero | Crescimento, vitória, solução |
| **Cor Secundária** | Alertas, contrastes, CTAs, destaques | Atenção, urgência, diferenciação |
| **Cor Terciária** | Dados, grids, linhas, infraestrutura técnica | Background ativo, estrutura |

**IMPORTANTE:** Sempre incluir o código HEX entre parênteses — ex: `neon green (#D0FF59)`. IAs generativas interpretam melhor com o hex explícito.

### Bloco 3: Fundo e Atmosfera
Define o background e clima visual da imagem.

**Fórmula:**
```
"dark [variação] background (#hex) [com gradiente opcional]"
```

**Exemplos:**
```
"dark gradient background from deep midnight navy (#0A0A1A) to black (#0D0D0D)"
"dark deep navy background (#0a0e1a) with secondary dark panels (#111827)"
"dark radial gradient background from deep purple-black (#0D0A12) center to black (#0D0D0D) edges"
"dark celebratory atmosphere background (#0D0D0D)"
```

**Variações de Fundo Escuro (recomendado):**
- Preto puro: `#0D0D0D`
- Navy profundo: `#0A0A1A`, `#0A0E1A`
- Verde-escuro: `#0A0D0A`
- Roxo-escuro: `#0D0A12`
- Azul-escuro: `#0A0C1E`

**Por que fundo escuro?**
- Destaca cores neon e elementos luminosos
- Premium/sofisticado no feed
- Contraste máximo com texto branco
- Funciona em dark mode (maioria dos usuários)
- Se diferencia do feed saturado de fotos claras

### Bloco 4: Detalhes de Fundo (Textura)
Adiciona textura sutil ao fundo para evitar "vazio digital".

**Fórmula:**
```
"with [textura sutil] and [elementos atmosféricos]"
```

**Catálogo de Texturas:**

| Textura | Quando Usar | Exemplo |
|---------|-------------|---------|
| Hexagonal mesh grid | Tech/IA/dados | `"subtle geometric hexagonal mesh grid fading in dark tones"` |
| Glowing particles | Celebração/premium | `"faint glowing data constellation particles scattered across"` |
| Circuit board traces | Automação/IA | `"subtle glowing circuit board traces and neural network lines"` |
| Binary rain | Dados/analytics | `"subtle binary rain in background"` |
| Scanline overlay | Sports/tech | `"subtle scanline overlay"` |
| Bokeh particles | Financeiro/luxo | `"subtle ascending golden-tinted bokeh particles"` |
| Concentric rings | Funil/processo | `"faint concentric funnel ring patterns"` |
| Star field | Futuro/visão | `"subtle star field depth"` |
| Smoke/fog wisps | Drama/problema | `"stagnant smoke wisps and heavy atmospheric haze"` |
| Data grid lines | Analytics | `"scattered blue data grid lines"` |
| Pulse ripples | Alerta/urgência | `"faint warning pulse ripples"` |

### Bloco 5: Tipografia Overlay (CRÍTICO)
O bloco mais padronizado — define o texto que aparece sobre a imagem.

**Template Fixo (copiar e ajustar):**
```
Compact bold uppercase text overlay positioned at the top center of the image,
occupying no more than 20% of the image height,
in [FONTE] Extra Bold font at a fixed moderate size
(approximately 48pt equivalent, never oversized),
maximum 2-3 lines tightly spaced,
reading "[TEXTO EM PT-BR AQUI]"
where "[PALAVRA1]" is in [cor principal] (#hex)
and "[PALAVRA2]" is in [cor secundária] (#hex),
remaining words in white,
all caps, consistent heavy weight.
```

**Regras da Tipografia:**

| Regra | Valor | Por Quê |
|-------|-------|---------|
| Posição | Top center | Área segura, não compete com visual |
| Altura máxima | 20% da imagem | Legibilidade sem obstruir arte |
| Fonte | Extra Bold (Poppins, Montserrat, etc.) | Impacto visual + legibilidade mobile |
| Tamanho | ~48pt equivalente | Grande o suficiente, sem exagero |
| Linhas | 2-3 máximo | Mais que isso = ilegível no feed |
| Espaçamento | Tightly spaced | Bloco compacto e coeso |
| Caixa | ALL CAPS | Impacto + uniformidade visual |

**Regra de Colorização do Texto:**
- **1 palavra-chave em cor principal** (número, tópico hero, substantivo principal)
- **1 palavra-chave em cor secundária** (ação, adjetivo qualificador, contraste)
- **Restante em branco** (#ffffff ou #f3f4f6)

**Exemplos de Copy com Colorização:**
```
"SUA LOJA TEM ALGUM DESSES 7 ERROS?"
  → "7 ERROS" = cor secundária, "LOJA" = cor principal

"VOCÊ SABE QUAIS PÚBLICOS MAIS CONVERTEM?"
  → "PÚBLICOS" = cor principal, "CONVERTEM" = cor secundária

"78% DE ACERTO É VERIFICÁVEL E REAL?"
  → "78%" = cor principal, "VERIFICÁVEL" = cor secundária

"IA OU TIPSTER — QUEM ACERTA MAIS?"
  → "IA" = cor principal, "TIPSTER" = cor secundária
```

### Bloco 6: Direção de Arte
Define o estilo fotográfico/artístico.

**Fórmula:**
```
"[Estilo] [técnica], [iluminação], 4:5 aspect ratio for Instagram."
```

**Estilos Comuns:**

| Estilo | Quando Usar |
|--------|-------------|
| `Professional tech photography, cinematic lighting` | Default para tech/business |
| `Professional digital marketing visualization, cinematic` | Marketing/ads |
| `Professional business visualization` | Negócios/finanças |
| `Ultra-detailed photorealistic 3D render` | Objetos complexos/3D |
| `Professional minimalist tech design` | Comparações simples |
| `Cinematic tension atmosphere` | Urgência/FOMO |
| `Premium European football intelligence aesthetic` | Sports |
| `Professional tech case study aesthetic` | Cases/resultados |

### Bloco 7: Instruções Finais
Fechamento padrão que garante consistência.

**Template:**
```
"No logo, no brand name."
```

**Por que "No logo, no brand name"?**
- Evita que a IA invente logos aleatórios
- Mantém a imagem limpa para adicionar logo depois (se desejado)
- Evita conflitos de marca registrada

---

## 4. PADRÕES DE COPY (HEADLINE DO POST)

### Fórmula da Pergunta Provocadora

**100% dos prompts usam perguntas retóricas.** Este é o padrão que mais gera engajamento orgânico.

**Fórmulas Comprovadas:**

| Fórmula | Exemplo |
|---------|---------|
| `VOCÊ [AÇÃO] [ERRO]?` | "VOCÊ AINDA FAZ ESSAS 6 TAREFAS MANUAL?" |
| `SEU [ATIVO] [RESULTADO NEGATIVO]?` | "SEU FUNIL GERA 85% DE LUCRO?" |
| `[NÚMERO] [RESULTADO] — COMO?` | "O QUE R$50M ENSINAM SOBRE CRESCER?" |
| `[A] OU [B]: QUAL [DECISÃO]?` | "SHOPIFY OU WOOCOMMERCE: QUAL É O SEU?" |
| `[MÉTRICA] É [ADJETIVO SURPREENDENTE]?` | "78% DE ACERTO É VERIFICÁVEL E REAL?" |
| `[TÓPICO] [VERBO AÇÃO] — VOCÊ [ACOMPANHA]?` | "LESÕES MUDAM AS ODDS — VOCÊ ACOMPANHA?" |
| `[RESULTADO] É [MÉTODO] OU [SORTE]?` | "GREEN CONSISTENTE É SORTE OU MÉTODO?" |
| `VOCÊ PODE [AÇÃO] SEM [FERRAMENTA] EM [ANO]?` | "VOCÊ PODE APOSTAR SEM IA EM 2026?" |

### Regras do Copy

1. **Sempre em português brasileiro** com acentuação completa
2. **Sempre termina com `?`** (pergunta, nunca afirmação)
3. **Máximo 12 palavras** (legibilidade no feed mobile)
4. **Sempre ALL CAPS** (uniformidade + impacto)
5. **Inclui número ou dado** quando possível (gatilho de curiosidade)
6. **Duas palavras-chave coloridas** (contraste visual)
7. **Termos técnicos em inglês** são aceitos se o público usa (IA, ROI, KPI, SEO)

### Categorias de Copy por Pilar

**Autoridade Técnica (educação):**
```
"VOCÊ SABE QUAIS PÚBLICOS MAIS CONVERTEM?"
"SUA CONTA GOOGLE ADS ESTÁ CONFIGURADA CERTO?"
"VOCÊ DECIDE PELO FEELING OU PELOS DADOS?"
```

**Cases & Números (prova social):**
```
"O QUE R$50M ENSINAM SOBRE CRESCER?"
"SUA LOJA PODERIA TER +40% DE CONVERSÃO?"
"O QUE R$12M EM ANÚNCIOS ENSINARAM?"
```

**Dor do Empresário (conexão):**
```
"SEU NEGÓCIO CRESCE OU APENAS SOBREVIVE?"
"SEU ATENDIMENTO ROUBA 90% DO SEU TEMPO?"
"SUA LOJA BONITA, MAS POR QUE NÃO VENDE?"
```

**Oferta & CTA (conversão):**
```
"SUA PRIMEIRA PREVISÃO GRÁTIS ESTÁ AQUI?"
"TUDO QUE SEU NEGÓCIO PRECISA EM UM SÓ LUGAR?"
```

---

## 5. CATÁLOGO DE CONCEITOS VISUAIS

### Metáforas Visuais por Tema

| Tema do Post | Conceito Visual | Elementos |
|--------------|----------------|-----------|
| **Erros/Problemas** | Tela com ícones de alerta | Warning icons, error symbols, glitch effects |
| **Comparação A vs B** | Split screen vertical | VS divider, duas metades contrastantes |
| **Automação/IA** | Robôs, engrenagens, circuitos | Robotic arms, gears, neural networks |
| **Funil de Vendas** | Funil 3D luminoso | 3D funnel, flowing particles, percentage indicators |
| **Dados/Analytics** | Dashboard com gráficos | Multiple screens, charts, KPIs, data streams |
| **Resultado $$** | Números gigantes + moedas | Giant glowing number, coins, growth arrows |
| **Velocidade/Urgência** | Relógio, motion blur | Countdown clock, rapidly changing numbers |
| **Comunidade** | Rede de conexões | Interconnected silhouettes, network nodes |
| **Crescimento** | Gráfico ascendente 3D | Ascending curve, upward trajectory, milestones |
| **Proteção/Marca** | Escudo luminoso | Shield glow, defensive barriers, brand fortress |
| **Busca/Análise** | Lupa com dados | Magnifying glass, scanning beams, spotlight |
| **Chatbot/Atendimento** | Smartphone com chat | Chat interface, AI brain, message bubbles |
| **Comparação Temporal** | Before/After split | Left=antes, Right=depois, transformation glow |
| **Oferta/CTA** | Botão pulsante 3D | Glowing button, cursor, starburst effects |

### Elementos Visuais Recorrentes (Toolkit)

**Efeitos de Luz:**
- Neon glow / halo effect
- Volumetric light rays
- Light beams connecting elements
- Pulse waves / ripple effects
- Particle streams / data flow

**Objetos Flutuantes:**
- Holographic screens/panels
- Floating metrics/numbers
- Orbiting icons/symbols
- Data constellation points
- 3D geometric shapes

**Efeitos de Profundidade:**
- Floating in dark space
- Multiple depth layers (foreground/midground/background)
- Depth of field blur
- Reflection on dark surface below
- Atmospheric haze/fog

---

## 6. CONFIGURAÇÃO POR EMPRESA (TEMPLATE)

### Antes de Começar — Definir:

```yaml
empresa:
  nome: "[Nome da Empresa]"
  nicho: "[Nicho de atuação]"

cores:
  principal: "#XXXXXX"    # Cor da marca (destaque positivo)
  secundaria: "#XXXXXX"   # Cor complementar (alertas, contraste)
  terciaria: "#XXXXXX"    # Cor de apoio (dados, grid, infraestrutura)
  fundo: "#XXXXXX"        # Background escuro (recomendado: #0A-#0D range)
  fundo_variacao: "#XXXXXX"  # Variação sutil para painéis secundários
  texto_neutro: "#XXXXXX"    # Branco/off-white para texto restante

tipografia:
  fonte: "[Poppins | Montserrat | Inter | Space Grotesk]"
  peso: "Extra Bold"
  tamanho: "~48pt equivalent"

estetica:
  tema: "[dark tech | dark luxury | dark medical | dark sports | dark minimal]"
  atmosfera: "[cinematic | professional | futuristic | dramatic | premium]"

pilares_conteudo:
  - nome: "[Autoridade]"
    percentual: 30
    temas: ["tema1", "tema2", "tema3"]
  - nome: "[Cases]"
    percentual: 25
    temas: ["tema1", "tema2"]
  - nome: "[Dor]"
    percentual: 25
    temas: ["tema1", "tema2"]
  - nome: "[CTA]"
    percentual: 20
    temas: ["tema1", "tema2"]
```

### Exemplo de Configuração — Clínica Odontológica

```yaml
empresa:
  nome: "DentalPro"
  nicho: "Odontologia estética"

cores:
  principal: "#00D4AA"    # Verde-água (saúde, confiança)
  secundaria: "#FF6B6B"   # Coral (urgência, atenção)
  terciaria: "#4A9EFF"    # Azul claro (ciência, tecnologia)
  fundo: "#0A0E1A"
  fundo_variacao: "#111827"
  texto_neutro: "#F3F4F6"

tipografia:
  fonte: "Montserrat"
  peso: "Extra Bold"

estetica:
  tema: "dark medical tech"
  atmosfera: "professional cinematic"
```

**Prompt gerado com essa config:**
```
Dark medical tech concept, a futuristic dental chair with holographic smile
preview floating above it, tooth cross-section displayed as 3D scan in
teal green (#00D4AA) glow, patient satisfaction metrics in electric blue
(#4A9EFF) data overlay, coral (#FF6B6B) accent highlighting before/after
transformation zones, dark deep navy background (#0A0E1A) with secondary
dark panels (#111827), subtle molecular structure patterns and faint dental
instrument silhouettes in very dark gray. Compact bold uppercase text overlay
positioned at the top center of the image, occupying no more than 20% of the
image height, in Montserrat Extra Bold font at a fixed moderate size
(approximately 48pt equivalent, never oversized), maximum 2-3 lines tightly
spaced, reading "SEU SORRISO PODERIA ESTAR 10X MELHOR?" where "SORRISO" is
in teal green (#00D4AA) and "10X" is in coral (#FF6B6B), remaining words in
white (#F3F4F6), all caps, consistent heavy weight. Professional medical tech
photography, cinematic lighting, 4:5 aspect ratio for Instagram. No logo, no
brand name.
```

---

## 7. TEMPLATES PRONTOS PARA COPIAR

### Template A: Post Educativo (Autoridade)

```
[ESTILO] [CONCEITO DO TEMA], [ELEMENTO VISUAL PRINCIPAL DESCRITO COM DETALHES],
[COR_PRINCIPAL] (#hex) [ELEMENTOS POSITIVOS], [COR_TERCIARIA] (#hex) [DADOS/GRID],
[COR_SECUNDARIA] (#hex) [DESTAQUES DE ALERTA], dark [VARIAÇÃO] background (#hex)
with [TEXTURA SUTIL] and [ATMOSFERA DE FUNDO]. Compact bold uppercase text overlay
positioned at the top center of the image, occupying no more than 20% of the image
height, in [FONTE] Extra Bold font at a fixed moderate size (approximately 48pt
equivalent, never oversized), maximum 2-3 lines tightly spaced, reading
"[PERGUNTA PROVOCADORA EM PT-BR]" where "[PALAVRA1]" is in [COR_PRINCIPAL] (#hex)
and "[PALAVRA2]" is in [COR_SECUNDARIA] (#hex), remaining words in white, all caps,
consistent heavy weight. Professional [ESTILO] visualization, cinematic lighting,
4:5 aspect ratio for Instagram. No logo, no brand name.
```

### Template B: Post de Case/Resultado

```
[TIPO] success visualization, [ELEMENTO DE RESULTADO DESCRITO] with [INDICADOR]
arrow pointing up in [COR_PRINCIPAL] (#hex), [COR_TERCIARIA] (#hex) data overlay,
[COR_SECUNDARIA] (#hex) highlight on key metrics, [ELEMENTO BEFORE/AFTER OU PROVA],
dark gradient background with [TEXTURA SUTIL]. Compact bold uppercase text overlay
positioned at the top center of the image, occupying no more than 20% of the image
height, in [FONTE] Extra Bold font at a fixed moderate size (approximately 48pt
equivalent, never oversized), maximum 2-3 lines tightly spaced, reading
"[PERGUNTA COM NÚMERO IMPACTANTE]" where "[NÚMERO]" is in [COR_PRINCIPAL] (#hex)
and "[AÇÃO]" is in [COR_SECUNDARIA] (#hex), remaining words in white, all caps,
consistent heavy weight. Professional [ESTILO] case study aesthetic, 4:5 aspect
ratio for Instagram. No logo, no brand name.
```

### Template C: Post de Dor/Problema

```
[ESTILO DRAMÁTICO] concept, [CENÁRIO DO PROBLEMA], [ELEMENTOS NEGATIVOS] in dull gray
while [SOLUÇÃO] trails in [COR_PRINCIPAL] (#hex), warning signs in [COR_TERCIARIA] (#hex),
[COR_SECUNDARIA] (#hex) danger indicators, dark moody [ATMOSFERA] (#hex) with
[TEXTURA PESADA/NEBULOSA]. Compact bold uppercase text overlay positioned at the top
center of the image, occupying no more than 20% of the image height, in [FONTE] Extra
Bold font at a fixed moderate size (approximately 48pt equivalent, never oversized),
maximum 2-3 lines tightly spaced, reading "[PERGUNTA QUE EXPÕE A DOR]" where
"[POSITIVO]" is in [COR_PRINCIPAL] (#hex) and "[NEGATIVO]" is in [COR_SECUNDARIA] (#hex),
remaining words in white, all caps, consistent heavy weight. Professional [ESTILO]
metaphor, cinematic, 4:5 aspect ratio for Instagram. No logo, no brand name.
```

### Template D: Post de CTA/Oferta

```
Dark tech CTA scene with a dramatic glowing call-to-action [ELEMENTO] rendered in
three dimensions, pulsing with [COR_PRINCIPAL] (#hex) energy and radiating light beams,
[OFERTA/BENEFÍCIO] materializing from [COR_SECUNDARIA] (#hex) particles, [COR_TERCIARIA]
(#hex) [ELEMENTOS DE PROCESSO/PASSOS], dark background (#hex) with starburst glow
emanating from center, electric arc effects, urgent and inviting energy. Compact bold
uppercase text overlay positioned at the top center of the image, occupying no more than
20% of the image height, in [FONTE] Extra Bold font at a fixed moderate size
(approximately 48pt equivalent, never oversized), maximum 2-3 lines tightly spaced,
reading "[CTA EM FORMA DE PERGUNTA]" where "[BENEFÍCIO]" is in [COR_PRINCIPAL] (#hex)
and "[URGÊNCIA]" is in [COR_SECUNDARIA] (#hex), remaining words in white, all caps,
consistent heavy weight. Dark tech CTA aesthetic, 4:5 aspect ratio for Instagram.
No logo, no brand name.
```

---

## 8. CHECKLIST DE QUALIDADE DO PROMPT

Antes de finalizar cada prompt, verificar:

### Estrutura
- [ ] Começa com conceito visual claro (estilo + tema + elemento principal)
- [ ] 3 cores funcionais com HEX entre parênteses
- [ ] Fundo escuro especificado com HEX
- [ ] Textura de fundo sutil incluída
- [ ] Bloco de tipografia completo (posição, fonte, tamanho, linhas)
- [ ] Copy em PT-BR com acentuação correta
- [ ] 2 palavras-chave coloridas + restante branco
- [ ] Direção de arte (estilo + iluminação)
- [ ] "No logo, no brand name" no final
- [ ] Aspect ratio 4:5 mencionado

### Copy
- [ ] Pergunta retórica (termina com ?)
- [ ] Máximo 12 palavras
- [ ] ALL CAPS
- [ ] Inclui número ou dado (quando possível)
- [ ] Palavra-chave 1 = cor principal (tópico hero)
- [ ] Palavra-chave 2 = cor secundária (ação/contraste)

### Técnico
- [ ] Resolution: 2K
- [ ] Aspect ratio: 4:5
- [ ] Filename descritivo em kebab-case
- [ ] Prompt entre 2.000-4.500 caracteres
- [ ] Sem URLs, logos ou marcas inventadas

---

## 9. FLUXO DE PRODUÇÃO EM LOTE

### Passo 1: Planejamento
1. Definir pilares de conteúdo e percentuais
2. Listar 50 temas distribuídos pelos pilares
3. Escrever headlines (perguntas provocadoras) para cada tema
4. Validar acentuação e número de palavras

### Passo 2: Geração de Prompts
1. Criar config YAML da empresa (seção 6)
2. Para cada tema, escolher template (A/B/C/D)
3. Preencher os blocos com conceito visual + cores + copy
4. Organizar em batches de 10 (JSON)

### Passo 3: Geração de Imagens
1. Enviar batch para IA generativa
2. Revisar resultados (texto legível? cores corretas? composição?)
3. Re-gerar prompts com ajustes se necessário (batch-retry)

### Passo 4: Publicação
1. Associar imagens às legendas correspondentes
2. Agendar no calendário editorial
3. Monitorar métricas de engajamento

### Dicas de Otimização
- **Batch-retry:** Se a IA errar o texto overlay, criar `batch-retry-N.json` com prompt ajustado
- **Variação de fundo:** Usar tons de fundo ligeiramente diferentes entre posts para evitar monotonia
- **Consistência:** Manter EXATAMENTE a mesma estrutura de tipografia em todos os prompts
- **Diversidade visual:** Variar conceitos visuais mesmo dentro do mesmo pilar

---

## 10. ERROS COMUNS E COMO EVITAR

| Erro | Consequência | Solução |
|------|-------------|---------|
| Texto muito longo no overlay | Ilegível no feed mobile | Máximo 12 palavras, 2-3 linhas |
| Não especificar HEX das cores | IA escolhe cores aleatórias | Sempre incluir (#XXXXXX) |
| Fundo claro | Perde contraste, visual amador | Fundo escuro (#0A-#0D range) |
| Copy afirmativa (sem ?) | Menos engajamento | Sempre pergunta retórica |
| Prompt muito curto (<1.500 chars) | Resultado genérico e impreciso | Mínimo 2.000 chars com detalhes |
| Sem textura de fundo | Imagem "vazia" e digital demais | Adicionar subtle patterns |
| Mais de 3 cores neon | Visual poluído e confuso | Máximo 3 cores funcionais |
| Logo/marca no prompt | IA inventa logos feios | "No logo, no brand name" |
| Misturar idiomas no copy | Confunde o público | Copy 100% PT-BR (termos técnicos OK) |
| Fonte não especificada | IA usa fonte aleatória | Sempre nomear a fonte Extra Bold |

---

## 11. VARIAÇÕES DE ESTÉTICA POR NICHO

O padrão "dark tech" é o mais versátil, mas pode ser adaptado:

| Nicho | Estética Sugerida | Texturas de Fundo |
|-------|-------------------|-------------------|
| **Tech/SaaS** | Dark tech futurism | Hex grid, circuit traces, data rain |
| **Saúde/Médico** | Dark medical tech | Molecular patterns, DNA helix, scan lines |
| **Finanças** | Dark wealth/premium | Gold bokeh, stock charts, currency symbols |
| **Sports/Betting** | Dark sports analytics | Stadium silhouettes, ball icons, scoreboards |
| **E-commerce** | Dark retail tech | Shopping cart icons, product grids, conversion arrows |
| **Gastronomia** | Dark culinary premium | Smoke wisps, ingredient particles, flame effects |
| **Educação** | Dark academic tech | Book silhouettes, neural networks, graduation caps |
| **Imobiliário** | Dark luxury real estate | Blueprint lines, city skylines, glass reflections |
| **Fitness** | Dark performance sports | Muscle fibers, heartbeat monitors, energy pulses |
| **Jurídico** | Dark corporate authority | Gavel silhouettes, document stacks, scale of justice |

---

## 12. GLOSSÁRIO DE TERMOS PARA PROMPTS

Termos em inglês frequentemente usados nos prompts e seus significados:

| Termo | Significado | Quando Usar |
|-------|-------------|-------------|
| `cinematic lighting` | Iluminação cinematográfica | Default para qualquer prompt |
| `volumetric light rays` | Raios de luz 3D visíveis | Cenas dramáticas |
| `depth of field` | Profundidade de campo (foco) | Separar planos |
| `holographic` | Efeito holograma translúcido | Dados/telas flutuantes |
| `neon glow` | Brilho neon ao redor | Destacar elementos |
| `floating` | Flutuando sem gravidade | Objetos em espaço escuro |
| `subtle` | Sutil, não dominante | Texturas de fundo |
| `faint` | Muito tênue | Padrões quase invisíveis |
| `particle effects` | Partículas luminosas | Atmosfera premium |
| `motion blur` | Desfoque de movimento | Velocidade/urgência |
| `bloom effect` | Brilho estourado | Luzes intensas |
| `data streams` | Fluxos de dados | Conexões entre elementos |
| `split screen` | Tela dividida | Comparações A vs B |
| `gradient background` | Fundo gradiente | Transição de cores |
| `3D render` | Renderização 3D | Objetos complexos |
| `photorealistic` | Fotorrealista | Máxima qualidade |
| `mesh grid` | Grade de malha | Texturas tech |
| `constellation` | Pontos como estrelas | Dados dispersos |
| `scanline overlay` | Linhas de escaneamento | TV/monitor retro-tech |
| `starburst` | Explosão radial de luz | CTAs, momentos impactantes |

---

## 13. PROMPT MASTER TEMPLATE (COPIAR E USAR)

```
[ESTILO_VISUAL] [CONCEITO_TEMA], [ELEMENTO_PRINCIPAL_DETALHADO],
[COR_PRINCIPAL] (#hex) [ELEMENTOS_POSITIVOS_DESCRITOS],
[COR_TERCIARIA] (#hex) [ELEMENTOS_DADOS_GRID],
[COR_SECUNDARIA] (#hex) [ELEMENTOS_DESTAQUE_ALERTA],
dark [VARIACAO_FUNDO] background (#hex_fundo)
[with secondary dark panels (#hex_paineis) SE APLICAVEL]
with [TEXTURA_SUTIL_1] and [TEXTURA_SUTIL_2_OU_ATMOSFERA].
Compact bold uppercase text overlay positioned at the top center
of the image, occupying no more than 20% of the image height,
in [FONTE] Extra Bold font at a fixed moderate size
(approximately 48pt equivalent, never oversized),
maximum 2-3 lines tightly spaced,
reading "[COPY_PTBR_PERGUNTA_RETORICA]"
where "[PALAVRA_KEY1]" is in [COR_PRINCIPAL_NOME] (#hex)
and "[PALAVRA_KEY2]" is in [COR_SECUNDARIA_NOME] (#hex),
remaining words in white (#hex_branco),
all caps, consistent heavy weight.
[ESTILO_FOTOGRAFIA], [ILUMINACAO], 4:5 aspect ratio for Instagram.
No logo, no brand name.
```

---

> **Versão:** 1.0
> **Baseado em:** Análise de 100+ prompts reais (Riwer Labs + BetPredict)
> **Uso:** Geração de imagens para feed Instagram orgânico via IA generativa
> **Regra:** Ajustar cores, fonte e estética para cada empresa antes de usar
