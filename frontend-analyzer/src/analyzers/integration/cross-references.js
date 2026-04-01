/**
 * Analisador de Referências Cruzadas HTML+CSS
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeCrossReferences(htmlFiles, cssFiles) {
  console.log(`[CrossReferencesAnalyzer] INÍCIO`);
  const issues = [];

  // Detectar se há CSS externo ou inline (<style> tags)
  const hasExternalCSS = cssFiles.some(f => f.type === 'external');
  const hasInlineCSS = cssFiles.some(f => f.type === 'inline');
  const hasCSSFiles = cssFiles.length > 0;

  console.log(`[CrossReferencesAnalyzer] CSS externo: ${hasExternalCSS}, CSS inline: ${hasInlineCSS}, Total CSS files: ${cssFiles.length}`);

  // Se não houver CSS externo nem inline, assumir que estilos podem estar em:
  // - Atributos style="" inline
  // - CSS externo não incluído no projeto
  // - Framework CSS via CDN
  // Não reportar como erro neste caso
  if (!hasCSSFiles) {
    console.log(`[CrossReferencesAnalyzer] ⚠️ Nenhum arquivo CSS encontrado (externo ou inline).`);
    console.log(`[CrossReferencesAnalyzer] ℹ️ Assumindo CSS via CDN, style attributes, ou framework externo.`);
    console.log(`[CrossReferencesAnalyzer] FIM - Pulando análise de cross-references`);
    return issues;
  }

  // Extrair todas as classes do CSS
  const cssClasses = new Set();
  cssFiles.forEach(file => {
    if (file.parsed && file.parsed.selectors) {
      // Extrair classes dos seletores
      file.parsed.selectors.forEach(sel => {
        const matches = sel.full.match(/\.([a-zA-Z0-9_-]+)/g);
        if (matches) {
          matches.forEach(match => {
            cssClasses.add(match.substring(1)); // Remove o ponto
          });
        }
      });
    }
  });

  // Extrair todas as classes do HTML
  const htmlClasses = new Set();
  htmlFiles.forEach(file => {
    if (file.parsed) {
      file.parsed.classes.forEach(cls => htmlClasses.add(cls));
    }
  });

  console.log(`[CrossReferencesAnalyzer] CSS: ${cssClasses.size} classes, HTML: ${htmlClasses.size} classes`);

  // Classes no HTML sem CSS (apenas reportar se houver CSS para comparar)
  // Ignorar classes de frameworks conhecidos (Bootstrap, Tailwind, etc.)
  const frameworkPrefixes = ['btn', 'col-', 'row', 'container', 'flex', 'grid', 'text-', 'bg-', 'm-', 'p-', 'w-', 'h-'];
  const isFrameworkClass = (cls) => frameworkPrefixes.some(prefix => cls.startsWith(prefix));

  let unmatchedCount = 0;
  htmlClasses.forEach(cls => {
    if (!cssClasses.has(cls) && !isFrameworkClass(cls)) {
      unmatchedCount++;
      // Apenas reportar se não parecer classe de framework
      if (unmatchedCount <= 20) { // Limitar a 20 issues para não poluir relatório
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.INTEGRATION,
          subcategory: 'cross-references',
          title: 'Classe HTML sem CSS',
          description: `Classe "${cls}" usada no HTML mas não encontrada no CSS ${hasInlineCSS ? 'inline' : 'externo'}.`,
          file: 'HTML',
          line: 0,
          column: 0,
          code: `class="${cls}"`,
          evidence: `Classe "${cls}" não estilizada`,
          suggestion: hasInlineCSS
            ? 'Adicione estilo na tag <style>, remova classe não usada, ou está em atributo style="".'
            : 'Adicione estilo no CSS externo, remova classe não usada, ou está em framework CDN.',
          impact: 'Classe sem efeito visual, pode ser código morto ou de framework externo.'
        }));
      }
    }
  });

  if (unmatchedCount > 20) {
    console.log(`[CrossReferencesAnalyzer] ⚠️ ${unmatchedCount} classes HTML sem CSS (mostrando apenas 20 no relatório)`);
  }

  // Classes no CSS sem HTML (dead code)
  const deadClasses = [];
  cssClasses.forEach(cls => {
    if (!htmlClasses.has(cls)) {
      deadClasses.push(cls);
    }
  });

  if (deadClasses.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.INTEGRATION,
      subcategory: 'cross-references',
      title: 'CSS não usado (dead code)',
      description: `${deadClasses.length} classes CSS não usadas no HTML.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: deadClasses.slice(0, 10).join(', ') + (deadClasses.length > 10 ? '...' : ''),
      evidence: `${deadClasses.length} classes órfãs`,
      suggestion: 'Remova classes CSS não utilizadas para reduzir tamanho do arquivo.',
      impact: 'Aumenta tamanho do CSS desnecessariamente.'
    }));
  }

  // 1. ID in CSS but not in HTML (dead ID selectors)
  const cssIds = new Set();
  const htmlIds = new Set();

  cssFiles.forEach(file => {
    if (file.parsed && file.parsed.selectors) {
      file.parsed.selectors.forEach(sel => {
        const matches = sel.full.match(/#([a-zA-Z0-9_-]+)/g);
        if (matches) {
          matches.forEach(match => {
            cssIds.add(match.substring(1)); // Remove the #
          });
        }
      });
    }
  });

  htmlFiles.forEach(file => {
    if (file.parsed && file.parsed.ids) {
      file.parsed.ids.forEach(id => htmlIds.add(id));
    }
  });

  console.log(`[CrossReferencesAnalyzer] CSS: ${cssIds.size} IDs, HTML: ${htmlIds.size} IDs`);

  const deadIds = [];
  cssIds.forEach(id => {
    if (!htmlIds.has(id)) {
      deadIds.push(id);
    }
  });

  if (deadIds.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.INTEGRATION,
      subcategory: 'id-in-css-no-html',
      title: 'IDs CSS não usados no HTML',
      description: `${deadIds.length} IDs CSS não encontrados no HTML.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: deadIds.slice(0, 10).map(id => `#${id}`).join(', ') + (deadIds.length > 10 ? '...' : ''),
      evidence: `${deadIds.length} IDs órfãos`,
      suggestion: 'Remova seletores de ID não utilizados no CSS.',
      impact: 'Código CSS morto, aumenta tamanho do arquivo.'
    }));
  }

  // 2. Unused @keyframes
  const keyframesNames = new Set();
  const animationNames = new Set();

  cssFiles.forEach(file => {
    if (file.parsed && file.parsed.atRules) {
      file.parsed.atRules.forEach(atRule => {
        if (atRule.type === 'keyframes' && atRule.name) {
          keyframesNames.add(atRule.name);
        }
      });
    }

    if (file.parsed && file.parsed.rules) {
      file.parsed.rules.forEach(rule => {
        rule.declarations.forEach(decl => {
          if (decl.property === 'animation-name') {
            animationNames.add(decl.value.trim());
          }
          if (decl.property === 'animation') {
            // Extract animation name from shorthand (first value)
            const parts = decl.value.trim().split(/\s+/);
            if (parts.length > 0) {
              animationNames.add(parts[0]);
            }
          }
        });
      });
    }
  });

  console.log(`[CrossReferencesAnalyzer] @keyframes: ${keyframesNames.size}, animation-name: ${animationNames.size}`);

  const unusedKeyframes = [];
  keyframesNames.forEach(name => {
    if (!animationNames.has(name)) {
      unusedKeyframes.push(name);
    }
  });

  if (unusedKeyframes.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.INTEGRATION,
      subcategory: 'keyframes-unused-integration',
      title: '@keyframes não usados',
      description: `${unusedKeyframes.length} @keyframes declarados mas não referenciados.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: unusedKeyframes.slice(0, 5).map(name => `@keyframes ${name}`).join(', ') + (unusedKeyframes.length > 5 ? '...' : ''),
      evidence: `${unusedKeyframes.length} animações órfãs`,
      suggestion: 'Remova @keyframes não utilizados.',
      impact: 'Código CSS morto.'
    }));
  }

  // 3. Unused @font-face
  const fontFaceNames = new Set();
  const fontFamilyUsages = new Set();

  cssFiles.forEach(file => {
    if (file.parsed && file.parsed.atRules) {
      file.parsed.atRules.forEach(atRule => {
        if (atRule.type === 'font-face' && atRule.params) {
          // Extract font-family from params
          const match = atRule.params.match(/font-family\s*:\s*['"]?([^'";\s]+)['"]?/i);
          if (match) {
            fontFaceNames.add(match[1]);
          }
        }
      });
    }

    if (file.parsed && file.parsed.rules) {
      file.parsed.rules.forEach(rule => {
        rule.declarations.forEach(decl => {
          if (decl.property === 'font-family') {
            // Extract all font names from font-family value
            const fonts = decl.value.split(',').map(f => f.trim().replace(/['"]/g, ''));
            fonts.forEach(font => fontFamilyUsages.add(font));
          }
        });
      });
    }
  });

  console.log(`[CrossReferencesAnalyzer] @font-face: ${fontFaceNames.size}, font-family usages: ${fontFamilyUsages.size}`);

  const unusedFontFaces = [];
  fontFaceNames.forEach(name => {
    if (!fontFamilyUsages.has(name)) {
      unusedFontFaces.push(name);
    }
  });

  if (unusedFontFaces.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.INTEGRATION,
      subcategory: 'font-face-unused-integration',
      title: '@font-face não usado',
      description: `${unusedFontFaces.length} @font-face declarados mas não referenciados.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: unusedFontFaces.slice(0, 5).join(', ') + (unusedFontFaces.length > 5 ? '...' : ''),
      evidence: `${unusedFontFaces.length} fonts órfãs`,
      suggestion: 'Remova @font-face não utilizados para reduzir tamanho.',
      impact: 'Fonts desnecessárias aumentam tempo de carregamento.'
    }));
  }

  // 4. CSS custom properties declared but unused
  const customPropsDecl = new Set();
  const customPropsUsed = new Set();

  cssFiles.forEach(file => {
    if (file.parsed && file.parsed.rules) {
      file.parsed.rules.forEach(rule => {
        rule.declarations.forEach(decl => {
          // Custom property declaration
          if (decl.property.startsWith('--')) {
            customPropsDecl.add(decl.property);
          }
          // Custom property usage
          const varMatches = decl.value.match(/var\(--[a-zA-Z0-9_-]+\)/g);
          if (varMatches) {
            varMatches.forEach(match => {
              const propName = match.match(/--[a-zA-Z0-9_-]+/);
              if (propName) {
                customPropsUsed.add(propName[0]);
              }
            });
          }
        });
      });
    }
  });

  console.log(`[CrossReferencesAnalyzer] Custom props declared: ${customPropsDecl.size}, used: ${customPropsUsed.size}`);

  const unusedCustomProps = [];
  customPropsDecl.forEach(prop => {
    if (!customPropsUsed.has(prop)) {
      unusedCustomProps.push(prop);
    }
  });

  if (unusedCustomProps.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.INTEGRATION,
      subcategory: 'var-declared-unused',
      title: 'CSS custom properties não usadas',
      description: `${unusedCustomProps.length} variáveis CSS declaradas mas não referenciadas.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: unusedCustomProps.slice(0, 10).join(', ') + (unusedCustomProps.length > 10 ? '...' : ''),
      evidence: `${unusedCustomProps.length} variáveis órfãs`,
      suggestion: 'Remova variáveis CSS não utilizadas.',
      impact: 'Código CSS morto.'
    }));
  }

  // 5. var() used but custom property undeclared
  const undeclaredCustomProps = [];
  customPropsUsed.forEach(prop => {
    if (!customPropsDecl.has(prop)) {
      undeclaredCustomProps.push(prop);
    }
  });

  if (undeclaredCustomProps.length > 0) {
    issues.push(new Issue({
      severity: SEVERITY.HIGH,
      category: CATEGORY.INTEGRATION,
      subcategory: 'var-used-undeclared',
      title: 'CSS custom properties não declaradas',
      description: `${undeclaredCustomProps.length} variáveis CSS usadas mas não declaradas.`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: undeclaredCustomProps.slice(0, 10).map(p => `var(${p})`).join(', ') + (undeclaredCustomProps.length > 10 ? '...' : ''),
      evidence: `${undeclaredCustomProps.length} variáveis não declaradas`,
      suggestion: 'Declare variáveis CSS antes de usar, ou remova referências.',
      impact: 'Valores ficarão vazios, causando estilos quebrados.'
    }));
  }

  // 6. Broken stylesheet references
  htmlFiles.forEach(file => {
    if (!file.parsed) return;

    const linkElements = file.parsed.elements.filter(el =>
      el.tagName === 'link' &&
      el.attrs.some(a => a.name === 'rel' && a.value === 'stylesheet')
    );

    linkElements.forEach(link => {
      const hrefAttr = link.attrs.find(a => a.name === 'href');
      if (!hrefAttr || !hrefAttr.value) return;

      const href = hrefAttr.value.trim();

      // Skip external URLs (CDN)
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return;
      }

      // Check if this relative path matches any CSS file
      const basename = href.split('/').pop();
      const matchedCSS = cssFiles.some(cssFile => {
        const cssBasename = cssFile.path.split(/[/\\]/).pop();
        return cssBasename === basename;
      });

      if (!matchedCSS) {
        issues.push(new Issue({
          severity: SEVERITY.CRITICAL,
          category: CATEGORY.INTEGRATION,
          subcategory: 'broken-stylesheet-ref',
          title: 'Referência de stylesheet quebrada',
          description: `<link href="${href}"> não corresponde a nenhum arquivo CSS encontrado.`,
          file: file.path,
          line: link.line,
          column: link.col,
          code: `<link rel="stylesheet" href="${href}">`,
          evidence: 'Arquivo CSS não encontrado',
          suggestion: 'Verifique se o arquivo CSS existe e o caminho está correto.',
          impact: 'CRÍTICO: Estilos não serão carregados.'
        }));
      }
    });
  });

  // 7. Broken script references (info only)
  htmlFiles.forEach(file => {
    if (!file.parsed) return;

    const scriptElements = file.parsed.elements.filter(el => el.tagName === 'script');

    scriptElements.forEach(script => {
      const srcAttr = script.attrs.find(a => a.name === 'src');
      if (!srcAttr || !srcAttr.value) return;

      const src = srcAttr.value.trim();

      // Skip known CDNs
      const cdnDomains = ['cdn.', 'unpkg.', 'jsdelivr.', 'cdnjs.', 'googleapis.com', 'gstatic.com'];
      const isCDN = cdnDomains.some(domain => src.includes(domain));

      if (!isCDN && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
        issues.push(new Issue({
          severity: SEVERITY.INFO,
          category: CATEGORY.INTEGRATION,
          subcategory: 'broken-script-ref',
          title: 'Referência de script local',
          description: `<script src="${src}"> aponta para arquivo local.`,
          file: file.path,
          line: script.line,
          column: script.col,
          code: `<script src="${src}">`,
          evidence: 'Script local referenciado',
          suggestion: 'Verifique se o arquivo JS existe no caminho correto.',
          impact: 'Script pode não carregar se caminho incorreto.'
        }));
      }
    });
  });

  console.log(`[CrossReferencesAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
