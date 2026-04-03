# Validation Protocol - Validacao Obrigatoria

## FRONTEND (HTML/CSS/JS)

### Camada 1 - Frontend Analyzer (estatico)

```bash
cd ~/.claude/frontend-analyzer && node src/index.js --path "[CAMINHO]" --format json
```

**Criterios:**
- Score >= 70/100
- Acessibilidade >= 80/100
- Critical = 0

### Camada 2 - Chrome DevTools (runtime)

```
1. navigate_page → abrir pagina
2. list_console_messages → ZERO erros
3. list_network_requests → ZERO 4xx/5xx
4. take_screenshot → evidencia visual
5. performance traces → LCP<2.5s, CLS<0.1, FCP<1.8s
6. resize_page 375x812 → mobile OK
```

### Camada 3 - Testes Automatizados

```bash
npx tsc --noEmit && npm run lint && npm test
```

---

## BACKEND Node.js

```bash
npx tsc --noEmit && npm run lint && npm test
```

---

## CRITERIOS DE APROVACAO

| Camada | Requisito | Acao se Falhar |
|--------|-----------|----------------|
| Frontend Analyzer | Score >= 70 | Corrigir e re-validar |
| Frontend Analyzer | A11y >= 80 | Corrigir e re-validar |
| Frontend Analyzer | Critical = 0 | CORRIGIR OBRIGATORIAMENTE |
| Chrome Console | ZERO erros | Debugar e corrigir |
| Chrome Network | ZERO 4xx/5xx | Verificar APIs |
| Performance | LCP < 2.5s | Otimizar |
| Performance | CLS < 0.1 | Otimizar layout |
| TypeScript | Zero erros | Corrigir tipos |
| Lint | Zero erros | Corrigir estilo |
| Tests | 100% pass | Corrigir testes |

---

## WORKFLOW AUTOMATICO

```
APOS criar/modificar frontend:

1. EXECUTAR Frontend Analyzer
   +-- Score OK? → Continuar
   +-- Score BAIXO? → Delegar correcoes:
       +-- html5-guru: Problemas HTML, acessibilidade
       +-- css-master: Problemas CSS, responsividade
       +-- performance-optimizer: Problemas performance

2. EXECUTAR Chrome DevTools
   +-- Console OK? → Continuar
   +-- Erros? → debug-master analisar

3. EXECUTAR Testes
   +-- Passou? → Entregar
   +-- Falhou? → Corrigir e re-testar
```

---

## CRIACAO DE PAGINAS HTML/CSS/JS

**OBRIGATORIO ao criar qualquer pagina HTML, landing page, componente:**

### 1. Consultar KB ANTES de codar
- `FREEFRONTEND-EFEITOS-CATALOGOS.md` → efeitos, animacoes, componentes
- `LANDING-PAGE-GUIA-DESENVOLVIMENTO-COMPLETO.md` → estrutura, secoes
- `TEMPLATES-CODIGO-PADRAO.md` → tokens CSS, padroes

### 2. Paleta padrao Riwer Labs
- Fundo: `#0A0F1E`
- Azul: `#2563EB`
- Ciano: `#00D4FF`
- Cinza: `#94A3B8`
- Gradiente: `linear-gradient(135deg, #00D4FF 0%, #2563EB 100%)`
- Fonte: `Inter` (Google Fonts)

### 3. Regra arquivo unico
Landing pages = 1 `index.html`. NUNCA arquivos separados.

### 4. Apos criar
Rodar Frontend Analyzer — Score>=70, A11y>=80.

---

## REPORT FORMAT

```json
{
  "tarefaId": "T001",
  "status": "SUCESSO|FALHA|PARCIAL",
  "resumo": "...",
  "artefatos": [],
  "problemas": [],
  "validacao": {
    "frontend_analyzer": {"score": 85},
    "chrome_devtools": {"console_errors": 0}
  }
}
```

---

## DOCUMENTACAO COMPLETA

Ver: `~/.claude/knowledge-base/FRONTEND-ANALYZER-DOCUMENTACAO-COMPLETA.md`