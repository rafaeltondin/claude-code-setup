#!/usr/bin/env node
/**
 * CSS Overlap Detector para Temas Shopify
 *
 * Detecta regras CSS que sobrescrevem propriedades do mesmo elemento:
 * - Mesmo seletor em arquivos diferentes (cross-file overlap)
 * - Seletores que atingem o mesmo elemento com especificidade diferente
 * - Propriedades sobrescritas na cascata (última vence)
 * - !important wars
 * - Media queries conflitantes
 *
 * Uso: node css-overlap.js <diretorio-ou-arquivo> [--json] [--verbose] [--fix-suggestions]
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const SHOPIFY_LOAD_ORDER = [
  'base.css',
  'reset.css',
  'normalize.css',
  'global.css',
  'component-',
  'section-',
  'template-',
  'custom.css',
  'custom-',
  'theme.css',
];

// --- CSS PARSER ---

function parseCSSFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const rules = [];

  // Remove comments
  const cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');

  let currentMedia = null;
  let braceDepth = 0;
  let buffer = '';
  let inRule = false;
  let currentSelector = '';
  let ruleStart = 0;

  const lines = cleaned.split('\n');
  let lineNum = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    // Track line number
    if (char === '\n') lineNum++;

    if (char === '{') {
      braceDepth++;
      if (braceDepth === 1) {
        const selector = buffer.trim();
        if (selector.startsWith('@media')) {
          currentMedia = selector;
          buffer = '';
          continue;
        } else if (selector.startsWith('@')) {
          // @keyframes, @font-face, etc — skip
          buffer = '';
          continue;
        }
        currentSelector = selector;
        ruleStart = lineNum + 1;
        buffer = '';
        inRule = true;
        continue;
      } else if (braceDepth === 2 && currentMedia) {
        currentSelector = buffer.trim();
        ruleStart = lineNum + 1;
        buffer = '';
        inRule = true;
        continue;
      }
    }

    if (char === '}') {
      braceDepth--;
      if (inRule && ((braceDepth === 0 && !currentMedia) || (braceDepth === 1 && currentMedia))) {
        const properties = parseProperties(buffer);
        if (currentSelector && properties.length > 0) {
          // Split comma-separated selectors
          const selectors = currentSelector.split(',').map(s => s.trim()).filter(Boolean);
          for (const sel of selectors) {
            rules.push({
              selector: normalizeSelector(sel),
              originalSelector: sel.trim(),
              properties,
              file: fileName,
              filePath,
              line: ruleStart,
              media: currentMedia,
              specificity: calculateSpecificity(sel),
            });
          }
        }
        buffer = '';
        inRule = false;
        currentSelector = '';
        continue;
      }
      if (braceDepth === 0 && currentMedia) {
        currentMedia = null;
        buffer = '';
        continue;
      }
    }

    buffer += char;
  }

  return rules;
}

function parseProperties(block) {
  const props = [];
  const declarations = block.split(';');

  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed || trimmed.includes('{') || trimmed.includes('}')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const property = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();
    const isImportant = value.includes('!important');
    const cleanValue = value.replace(/!important/g, '').trim();

    if (property && cleanValue) {
      props.push({ property, value: cleanValue, isImportant, raw: trimmed });
    }
  }

  return props;
}

function normalizeSelector(sel) {
  return sel
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*>\s*/g, ' > ')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*~\s*/g, ' ~ ')
    .toLowerCase();
}

function calculateSpecificity(selector) {
  let ids = 0, classes = 0, elements = 0;
  const clean = selector
    .replace(/::[\w-]+/g, () => { elements++; return ''; })
    .replace(/:[\w-]+(\([^)]*\))?/g, (m) => {
      if (m.startsWith(':not') || m.startsWith(':is') || m.startsWith(':where')) return '';
      classes++;
      return '';
    })
    .replace(/\[[\s\S]*?\]/g, () => { classes++; return ''; });

  ids += (clean.match(/#[\w-]+/g) || []).length;
  classes += (clean.match(/\.[\w-]+/g) || []).length;
  const tagMatches = clean.replace(/#[\w-]+/g, '').replace(/\.[\w-]+/g, '').match(/(?:^|[\s>+~])[\w-]+/g);
  elements += (tagMatches || []).length;

  return { ids, classes, elements, score: ids * 100 + classes * 10 + elements };
}

// --- OVERLAP DETECTION ---

// Propriedades que são shorthand e suas sub-propriedades
const SHORTHAND_MAP = {
  'margin': ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'padding': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'border': ['border-width', 'border-style', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left'],
  'background': ['background-color', 'background-image', 'background-repeat', 'background-position', 'background-size'],
  'font': ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height'],
  'flex': ['flex-grow', 'flex-shrink', 'flex-basis'],
  'grid': ['grid-template-rows', 'grid-template-columns', 'grid-template-areas'],
  'transition': ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
  'animation': ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
  'overflow': ['overflow-x', 'overflow-y'],
  'gap': ['row-gap', 'column-gap'],
  'inset': ['top', 'right', 'bottom', 'left'],
  'place-items': ['align-items', 'justify-items'],
  'place-content': ['align-content', 'justify-content'],
  'place-self': ['align-self', 'justify-self'],
};

function propertiesConflict(propA, propB) {
  if (propA === propB) return 'exact';

  // shorthand vs longhand
  if (SHORTHAND_MAP[propA] && SHORTHAND_MAP[propA].includes(propB)) return 'shorthand-overrides-longhand';
  if (SHORTHAND_MAP[propB] && SHORTHAND_MAP[propB].includes(propA)) return 'longhand-overrides-shorthand';

  return null;
}

function selectorsOverlap(selA, selB) {
  // Exato
  if (selA === selB) return { type: 'exact', confidence: 100 };

  // Um contém o outro (ancestral)
  // ex: ".product" e ".product .title"
  if (selB.startsWith(selA + ' ') || selB.startsWith(selA + ' > ')) {
    return null; // hierarquia, não sobreposição
  }
  if (selA.startsWith(selB + ' ') || selA.startsWith(selB + ' > ')) {
    return null;
  }

  // Mesmo elemento-base com classes/pseudo diferentes
  // ex: ".product-card" vs ".product-card:hover" — ambos atingem o mesmo elemento
  const baseA = selA.replace(/:[\w-]+(\([^)]*\))?/g, '').replace(/::[\w-]+/g, '').trim();
  const baseB = selB.replace(/:[\w-]+(\([^)]*\))?/g, '').replace(/::[\w-]+/g, '').trim();

  if (baseA === baseB && baseA.length > 0) {
    return { type: 'same-element-different-state', confidence: 70 };
  }

  // Seletores que provavelmente atingem o mesmo: tag vs .classe do mesmo tipo
  // ex: "h1" e ".product h1"
  const lastPartA = selA.split(/[\s>+~]/).pop().trim();
  const lastPartB = selB.split(/[\s>+~]/).pop().trim();

  if (lastPartA === lastPartB && !lastPartA.includes('.') && lastPartA.match(/^[a-z]/)) {
    return { type: 'same-tag-different-context', confidence: 50 };
  }

  return null;
}

function getFileLoadOrder(fileName) {
  for (let i = 0; i < SHOPIFY_LOAD_ORDER.length; i++) {
    if (fileName.startsWith(SHOPIFY_LOAD_ORDER[i]) || fileName === SHOPIFY_LOAD_ORDER[i]) {
      return i;
    }
  }
  return SHOPIFY_LOAD_ORDER.length; // unknown = loaded last
}

function detectOverlaps(allRules) {
  const overlaps = [];

  for (let i = 0; i < allRules.length; i++) {
    for (let j = i + 1; j < allRules.length; j++) {
      const ruleA = allRules[i];
      const ruleB = allRules[j];

      // Verificar se media queries são compatíveis
      if (ruleA.media !== ruleB.media) {
        // Media queries diferentes — podem ou não sobrepor
        if (ruleA.media && ruleB.media) continue; // ambas com media diferentes = sem overlap
        // Uma sem media, outra com = potencial overlap
      }

      // Verificar se seletores se sobrepõem
      const selectorOverlap = selectorsOverlap(ruleA.selector, ruleB.selector);
      if (!selectorOverlap) continue;

      // Verificar propriedades conflitantes
      for (const propA of ruleA.properties) {
        for (const propB of ruleB.properties) {
          const conflict = propertiesConflict(propA.property, propB.property);
          if (!conflict) continue;

          // Determinar qual vence
          const orderA = getFileLoadOrder(ruleA.file);
          const orderB = getFileLoadOrder(ruleB.file);

          let winner, loser;
          if (propB.isImportant && !propA.isImportant) {
            winner = ruleB; loser = ruleA;
          } else if (propA.isImportant && !propB.isImportant) {
            winner = ruleA; loser = ruleB;
          } else if (ruleB.specificity.score > ruleA.specificity.score) {
            winner = ruleB; loser = ruleA;
          } else if (ruleA.specificity.score > ruleB.specificity.score) {
            winner = ruleA; loser = ruleB;
          } else {
            // Mesma especificidade — última na cascata vence
            winner = orderB >= orderA ? ruleB : ruleA;
            loser = winner === ruleB ? ruleA : ruleB;
          }

          const severity = classifySeverity(propA, propB, ruleA, ruleB, selectorOverlap, conflict);

          overlaps.push({
            severity,
            selectorOverlapType: selectorOverlap.type,
            confidence: selectorOverlap.confidence,
            conflictType: conflict,
            property: propA.property === propB.property ? propA.property : `${propA.property} vs ${propB.property}`,
            winner: {
              selector: winner.originalSelector,
              file: winner.file,
              line: winner.line,
              value: (winner === ruleA ? propA : propB).value,
              isImportant: (winner === ruleA ? propA : propB).isImportant,
              specificity: winner.specificity.score,
            },
            loser: {
              selector: loser.originalSelector,
              file: loser.file,
              line: loser.line,
              value: (loser === ruleA ? propA : propB).value,
              isImportant: (loser === ruleA ? propA : propB).isImportant,
              specificity: loser.specificity.score,
            },
            media: ruleA.media || ruleB.media || null,
          });
        }
      }
    }
  }

  return overlaps;
}

function classifySeverity(propA, propB, ruleA, ruleB, selectorOverlap, conflictType) {
  // CRITICAL: !important war
  if (propA.isImportant && propB.isImportant) return 'critical';

  // CRITICAL: mesmo seletor exato, mesmo arquivo, valores diferentes
  if (selectorOverlap.type === 'exact' && ruleA.file === ruleB.file && propA.value !== propB.value) return 'critical';

  // HIGH: mesmo seletor exato, arquivos diferentes, valores diferentes
  if (selectorOverlap.type === 'exact' && propA.value !== propB.value) return 'high';

  // HIGH: shorthand sobrescrevendo longhand inadvertidamente
  if (conflictType === 'shorthand-overrides-longhand') return 'high';

  // MEDIUM: valores diferentes com confiança >= 70
  if (propA.value !== propB.value && selectorOverlap.confidence >= 70) return 'medium';

  // LOW: mesmo valor (redundante mas inofensivo)
  if (propA.value === propB.value) return 'low';

  return 'medium';
}

// --- SUGGESTIONS ---

function generateSuggestions(overlaps) {
  const suggestions = [];

  const criticals = overlaps.filter(o => o.severity === 'critical');
  const highs = overlaps.filter(o => o.severity === 'high');

  // !important wars
  const importantWars = criticals.filter(o => o.winner.isImportant && o.loser.isImportant);
  if (importantWars.length > 0) {
    suggestions.push({
      type: 'refactor',
      priority: 'P0',
      message: `${importantWars.length} !important war(s) detectada(s). Remova !important e use especificidade adequada.`,
      affected: [...new Set(importantWars.map(o => o.winner.file).concat(importantWars.map(o => o.loser.file)))],
    });
  }

  // Regras duplicadas no mesmo arquivo
  const sameFileDups = criticals.filter(o => o.winner.file === o.loser.file);
  if (sameFileDups.length > 0) {
    const files = [...new Set(sameFileDups.map(o => o.winner.file))];
    suggestions.push({
      type: 'consolidate',
      priority: 'P1',
      message: `${sameFileDups.length} propriedade(s) sobreposta(s) no mesmo arquivo. Consolidar em uma unica regra.`,
      affected: files,
    });
  }

  // Cross-file overlaps
  const crossFile = highs.filter(o => o.winner.file !== o.loser.file);
  if (crossFile.length > 0) {
    suggestions.push({
      type: 'reorganize',
      priority: 'P2',
      message: `${crossFile.length} sobreposicao(oes) entre arquivos. Considere mover regras para o arquivo correto na hierarquia (base > component > section > template).`,
      affected: [...new Set(crossFile.flatMap(o => [o.winner.file, o.loser.file]))],
    });
  }

  // Redundancias (mesmo valor)
  const redundant = overlaps.filter(o => o.severity === 'low');
  if (redundant.length > 0) {
    suggestions.push({
      type: 'cleanup',
      priority: 'P3',
      message: `${redundant.length} regra(s) redundante(s) (mesmo valor aplicado). Remova a duplicata com menor especificidade.`,
      affected: [...new Set(redundant.map(o => o.loser.file))],
    });
  }

  return suggestions;
}

// --- REPORT ---

function generateReport(overlaps, suggestions, totalFiles, totalRules, verbose) {
  const critical = overlaps.filter(o => o.severity === 'critical');
  const high = overlaps.filter(o => o.severity === 'high');
  const medium = overlaps.filter(o => o.severity === 'medium');
  const low = overlaps.filter(o => o.severity === 'low');

  let score = 100;
  score -= critical.length * 15;
  score -= high.length * 8;
  score -= medium.length * 3;
  score -= low.length * 1;
  score = Math.max(0, score);

  const lines = [];
  lines.push('CSS OVERLAP REPORT');
  lines.push('=' .repeat(60));
  lines.push(`Arquivos analisados: ${totalFiles}`);
  lines.push(`Regras CSS parseadas: ${totalRules}`);
  lines.push(`Sobreposicoes encontradas: ${overlaps.length}`);
  lines.push('');
  lines.push(`  CRITICAL: ${critical.length}`);
  lines.push(`  HIGH:     ${high.length}`);
  lines.push(`  MEDIUM:   ${medium.length}`);
  lines.push(`  LOW:      ${low.length}`);
  lines.push('');

  const showList = (title, items, maxShow) => {
    if (items.length === 0) return;
    lines.push(`--- ${title} ---`);
    const toShow = verbose ? items : items.slice(0, maxShow);
    for (const o of toShow) {
      const imp = (prop) => prop.isImportant ? ' !important' : '';
      lines.push('');
      lines.push(`  ${o.property} (${o.conflictType})`);
      lines.push(`    VENCE:  ${o.winner.file}:${o.winner.line}  ${o.winner.selector}`);
      lines.push(`            ${o.property}: ${o.winner.value}${imp(o.winner)}  (specificity: ${o.winner.specificity})`);
      lines.push(`    PERDE:  ${o.loser.file}:${o.loser.line}  ${o.loser.selector}`);
      lines.push(`            ${o.property}: ${o.loser.value}${imp(o.loser)}  (specificity: ${o.loser.specificity})`);
      if (o.media) lines.push(`    MEDIA:  ${o.media}`);
    }
    if (!verbose && items.length > maxShow) {
      lines.push(`  ... +${items.length - maxShow} mais (use --verbose para ver todos)`);
    }
    lines.push('');
  };

  showList('CRITICAL', critical, 10);
  showList('HIGH', high, 10);
  showList('MEDIUM', medium, 5);
  showList('LOW', low, 3);

  if (suggestions.length > 0) {
    lines.push('--- SUGESTOES ---');
    for (const s of suggestions) {
      lines.push(`  [${s.priority}] ${s.message}`);
      lines.push(`        Arquivos: ${s.affected.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('=' .repeat(60));
  lines.push(`SCORE: ${score}/100`);
  if (score >= 90) lines.push('STATUS: CSS limpo');
  else if (score >= 70) lines.push('STATUS: Ajustes recomendados');
  else if (score >= 50) lines.push('STATUS: Sobreposicoes significativas — refatorar');
  else lines.push('STATUS: CSS problematico — refatoracao urgente');
  lines.push('=' .repeat(60));

  return { report: lines.join('\n'), score, stats: { critical: critical.length, high: high.length, medium: medium.length, low: low.length } };
}

// --- MAIN ---

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const verbose = args.includes('--verbose');
  const target = args.find(a => !a.startsWith('--'));

  if (!target) {
    console.error('Uso: node css-overlap.js <diretorio-ou-arquivo> [--json] [--verbose]');
    process.exit(1);
  }

  const targetPath = path.resolve(target);

  if (!fs.existsSync(targetPath)) {
    console.error(`Nao encontrado: ${targetPath}`);
    process.exit(1);
  }

  // Coletar arquivos CSS
  let cssFiles = [];
  const stat = fs.statSync(targetPath);

  if (stat.isDirectory()) {
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
          cssFiles.push(full);
        }
      }
    };
    walk(targetPath);
  } else if (stat.isFile() && targetPath.endsWith('.css')) {
    cssFiles.push(targetPath);
  }

  // Ordenar por load order do Shopify
  cssFiles.sort((a, b) => {
    const nameA = path.basename(a);
    const nameB = path.basename(b);
    return getFileLoadOrder(nameA) - getFileLoadOrder(nameB);
  });

  if (cssFiles.length === 0) {
    console.error('Nenhum arquivo CSS encontrado.');
    process.exit(1);
  }

  // Parsear todos
  let allRules = [];
  for (const file of cssFiles) {
    try {
      const rules = parseCSSFile(file);
      allRules = allRules.concat(rules);
    } catch (err) {
      console.error(`Erro ao parsear ${file}: ${err.message}`);
    }
  }

  // Detectar overlaps
  const overlaps = detectOverlaps(allRules);

  // Ordenar por severidade
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  overlaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const suggestions = generateSuggestions(overlaps);

  if (jsonMode) {
    console.log(JSON.stringify({
      files: cssFiles.map(f => path.basename(f)),
      totalRules: allRules.length,
      overlaps,
      suggestions,
      score: Math.max(0, 100 - overlaps.filter(o => o.severity === 'critical').length * 15
        - overlaps.filter(o => o.severity === 'high').length * 8
        - overlaps.filter(o => o.severity === 'medium').length * 3
        - overlaps.filter(o => o.severity === 'low').length * 1),
    }, null, 2));
  } else {
    const { report } = generateReport(overlaps, suggestions, cssFiles.length, allRules.length, verbose);
    console.log(report);
  }
}

main();
