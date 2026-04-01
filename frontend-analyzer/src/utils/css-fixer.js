/**
 * CSS Fixer - Utilitários para Manipulação de CSS
 *
 * Fornece funções seguras para modificar CSS programaticamente
 * sem quebrar regras existentes.
 */

/**
 * Adiciona uma regra CSS após um seletor específico
 *
 * @param {string} css - CSS original
 * @param {RegExp} selectorRegex - Regex para encontrar o seletor
 * @param {string} newRule - Nova regra CSS a adicionar
 * @returns {string} CSS modificado
 */
export function addRuleAfter(css, selectorRegex, newRule) {
  console.log(`[CSSFixer] addRuleAfter: Adicionando regra após seletor`);
  console.log(`[CSSFixer] Nova regra: ${newRule.substring(0, 100)}...`);

  // Encontrar o fechamento do bloco do seletor
  return css.replace(selectorRegex, (match, offset) => {
    // Encontrar o fechamento } do bloco
    let braceCount = 0;
    let foundOpen = false;
    let closeIndex = offset + match.length;

    for (let i = offset; i < css.length; i++) {
      if (css[i] === '{') {
        braceCount++;
        foundOpen = true;
      } else if (css[i] === '}') {
        braceCount--;
        if (foundOpen && braceCount === 0) {
          closeIndex = i;
          break;
        }
      }
    }

    // Adicionar nova regra após o fechamento
    const before = css.substring(0, closeIndex + 1);
    const after = css.substring(closeIndex + 1);

    console.log(`[CSSFixer] Regra adicionada com sucesso`);
    return before + '\n\n' + newRule + after;
  });
}

/**
 * Adiciona uma regra CSS no início do arquivo
 *
 * @param {string} css - CSS original
 * @param {string} rule - Regra CSS a adicionar
 * @returns {string} CSS modificado
 */
export function prependRule(css, rule) {
  console.log(`[CSSFixer] prependRule: Adicionando regra no início`);
  console.log(`[CSSFixer] Regra: ${rule.substring(0, 100)}...`);

  // Verificar se regra já existe
  const ruleStart = rule.substring(0, 50).trim();
  if (css.includes(ruleStart)) {
    console.log(`[CSSFixer] Regra similar já existe, pulando...`);
    return css;
  }

  return `${rule}\n\n${css}`;
}

/**
 * Adiciona regra :focus para cada regra :hover que não tem par
 *
 * @param {string} css - CSS original
 * @returns {string} CSS modificado
 */
export function addFocusForHover(css) {
  console.log(`[CSSFixer] addFocusForHover: Adicionando :focus para :hover sem par`);

  let modified = css;
  let addedCount = 0;

  // Encontrar todos os :hover
  const hoverRegex = /([^{}\s]+):hover\s*(\{[^}]*\})/g;
  const matches = [...css.matchAll(hoverRegex)];

  console.log(`[CSSFixer] Encontrados ${matches.length} seletores :hover`);

  matches.forEach((match) => {
    const selector = match[1].trim();
    const declarations = match[2];

    // Verificar se já existe regra :focus correspondente
    const focusRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:focus\\s*\\{`, 'i');

    if (!focusRegex.test(css)) {
      // Não existe :focus, adicionar
      const hoverRule = `${selector}:hover ${declarations}`;
      const focusRule = `${selector}:focus ${declarations}`;

      // Encontrar posição do :hover e adicionar :focus logo após
      const hoverRuleEscaped = hoverRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const insertRegex = new RegExp(hoverRuleEscaped);

      modified = modified.replace(insertRegex, (m) => {
        console.log(`[CSSFixer] Adicionando :focus para ${selector}`);
        addedCount++;
        return `${m}\n\n${focusRule}`;
      });
    }
  });

  console.log(`[CSSFixer] Total de regras :focus adicionadas: ${addedCount}`);
  return modified;
}

/**
 * Adiciona prefixos vendor (-webkit-) para propriedades que precisam
 *
 * @param {string} css - CSS original
 * @returns {string} CSS modificado
 */
export function addVendorPrefixes(css) {
  console.log(`[CSSFixer] addVendorPrefixes: Adicionando prefixos vendor`);

  let modified = css;
  let addedCount = 0;

  // Propriedades que precisam de -webkit- prefix
  const needsPrefixRegex = {
    'display:\\s*flex': '-webkit-flex',
    'display:\\s*inline-flex': '-webkit-inline-flex',
    'display:\\s*grid': '-webkit-grid',
    'display:\\s*inline-grid': '-webkit-inline-grid',
    'user-select:\\s*none': '-webkit-user-select: none',
    'appearance:\\s*none': '-webkit-appearance: none',
    'backdrop-filter:': '-webkit-backdrop-filter:',
    'clip-path:': '-webkit-clip-path:',
    'mask:': '-webkit-mask:',
    'mask-image:': '-webkit-mask-image:'
  };

  Object.entries(needsPrefixRegex).forEach(([pattern, prefixed]) => {
    const regex = new RegExp(`(\\s|^)${pattern}`, 'gi');

    modified = modified.replace(regex, (match, whitespace, offset) => {
      // Verificar se já existe versão prefixada antes desta linha
      const before = modified.substring(Math.max(0, offset - 200), offset);

      if (before.includes(`-webkit-${match.trim()}`)) {
        console.log(`[CSSFixer] Prefixo já existe para: ${match.trim()}`);
        return match;
      }

      // Adicionar versão prefixada antes da não-prefixada
      const prefixedLine = whitespace + prefixed;
      console.log(`[CSSFixer] Adicionando prefixo: ${prefixedLine}`);
      addedCount++;

      return `${prefixedLine};\n${match}`;
    });
  });

  console.log(`[CSSFixer] Total de prefixos adicionados: ${addedCount}`);
  return modified;
}

/**
 * Adiciona reset universal de box-sizing no início do CSS
 *
 * @param {string} css - CSS original
 * @returns {string} CSS modificado
 */
export function addBoxSizingReset(css) {
  console.log(`[CSSFixer] addBoxSizingReset: Adicionando reset de box-sizing`);

  // Verificar se já existe regra de box-sizing universal
  if (/\*\s*\{[^}]*box-sizing:/i.test(css)) {
    console.log(`[CSSFixer] Reset de box-sizing já existe, pulando...`);
    return css;
  }

  const resetRule = `/* Box-sizing reset for better layout control */
*, *::before, *::after {
  box-sizing: border-box;
}`;

  return prependRule(css, resetRule);
}

/**
 * Corrige propriedades CSS com valores inválidos ou suspeitos
 *
 * @param {string} css - CSS original
 * @returns {object} { css: string, fixes: array }
 */
export function fixCommonCSSIssues(css) {
  console.log(`[CSSFixer] fixCommonCSSIssues: Corrigindo problemas comuns`);

  const fixes = [];
  let modified = css;

  // 1. Remover !important desnecessários em seletores de ID
  const importantRegex = /#[a-zA-Z0-9_-]+\s*\{[^}]*!important[^}]*\}/g;
  const importantMatches = css.match(importantRegex);

  if (importantMatches) {
    console.log(`[CSSFixer] Encontrados ${importantMatches.length} usos de !important em IDs`);
    // Nota: não removemos automaticamente, apenas reportamos
    fixes.push({
      type: 'warning',
      message: `Encontrados ${importantMatches.length} usos de !important em seletores de ID (considere remover)`
    });
  }

  // 2. Adicionar fallback para propriedades modernas
  // Ex: adicionar background-color antes de background com gradient
  modified = modified.replace(
    /(background:\s*linear-gradient[^;]+;)/gi,
    (match) => {
      // Verificar se já tem fallback na linha anterior
      const lines = modified.split('\n');
      const lineIndex = modified.substring(0, modified.indexOf(match)).split('\n').length - 1;

      if (lineIndex > 0) {
        const prevLine = lines[lineIndex - 1];
        if (prevLine.includes('background-color:') || prevLine.includes('background:')) {
          return match;
        }
      }

      console.log(`[CSSFixer] Adicionando fallback para gradient`);
      fixes.push({
        type: 'fix',
        message: 'Adicionado fallback de cor antes de linear-gradient'
      });

      return `background-color: #f0f0f0; /* fallback */\n  ${match}`;
    }
  );

  console.log(`[CSSFixer] Total de correções aplicadas: ${fixes.length}`);
  return { css: modified, fixes };
}

/**
 * Normaliza espaçamento e formatação do CSS
 *
 * @param {string} css - CSS original
 * @returns {string} CSS formatado
 */
export function normalizeCSS(css) {
  console.log(`[CSSFixer] normalizeCSS: Normalizando formatação`);

  let normalized = css;

  // Remover múltiplas linhas vazias consecutivas
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // Garantir espaço após vírgula em listas de valores
  normalized = normalized.replace(/,(?!\s)/g, ', ');

  // Garantir espaço após dois-pontos em propriedades
  normalized = normalized.replace(/:(?!\s)/g, ': ');

  console.log(`[CSSFixer] CSS normalizado`);
  return normalized;
}

/**
 * Adiciona comentários de seção para organizar CSS
 *
 * @param {string} css - CSS original
 * @param {array} sections - Array de { pattern: RegExp, label: string }
 * @returns {string} CSS com comentários
 */
export function addSectionComments(css, sections) {
  console.log(`[CSSFixer] addSectionComments: Adicionando comentários de seção`);

  let modified = css;

  sections.forEach(({ pattern, label }) => {
    modified = modified.replace(pattern, (match) => {
      // Verificar se já tem comentário antes
      const before = modified.substring(Math.max(0, modified.indexOf(match) - 100), modified.indexOf(match));

      if (before.includes(`/* ${label} */`)) {
        return match;
      }

      console.log(`[CSSFixer] Adicionando comentário: /* ${label} */`);
      return `\n/* ========================================\n   ${label}\n   ======================================== */\n${match}`;
    });
  });

  return modified;
}

/**
 * Adds font-display: swap to @font-face rules
 */
export function addFontDisplay(css) {
  console.log(`[CSSFixer] addFontDisplay: Adding font-display: swap to @font-face`);

  // Find @font-face blocks without font-display
  const fontFaceRegex = /@font-face\s*\{([^}]*)\}/gi;

  return css.replace(fontFaceRegex, (match, declarations) => {
    if (declarations.includes('font-display')) {
      return match;
    }
    // Add font-display before closing brace
    return match.replace(/\}$/, '  font-display: swap;\n}');
  });
}

/**
 * Adds prefers-reduced-motion media query wrapper for animations
 */
export function addReducedMotion(css) {
  console.log(`[CSSFixer] addReducedMotion: Adding prefers-reduced-motion`);

  // Check if already has prefers-reduced-motion
  if (css.includes('prefers-reduced-motion')) {
    console.log(`[CSSFixer] prefers-reduced-motion already exists`);
    return css;
  }

  // Check if file has animations
  if (!css.includes('animation') && !css.includes('transition')) {
    return css;
  }

  // Append reduced motion media query
  const motionQuery = `\n\n/* Respect user motion preferences */\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}`;

  return css + motionQuery;
}

/**
 * Removes units from zero values (0px → 0)
 */
export function removeZeroUnits(css) {
  console.log(`[CSSFixer] removeZeroUnits: Removing unnecessary units from zero values`);

  // Match 0px, 0em, 0rem, 0% but not 0s (timing) or 0.5px etc
  return css.replace(/:\s*0(px|em|rem|%|vh|vw|vmin|vmax)\b/gi, ': 0');
}
