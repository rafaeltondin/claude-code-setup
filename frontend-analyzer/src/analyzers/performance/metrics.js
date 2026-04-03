/**
 * Analisador de Métricas de Performance
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzePerformanceMetrics(htmlFiles, cssFiles) {
  console.log(`[PerformanceMetricsAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    // CSS/JS bloqueantes no <head>
    const links = parsed.elements.filter(el =>
      el.tagName === 'link' &&
      el.attrs.some(a => a.name === 'rel' && a.value === 'stylesheet')
    );

    links.forEach(link => {
      const parent = link.parent;
      if (parent && parent.tagName === 'head') {
        issues.push(new Issue({
          severity: SEVERITY.INFO,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'blocking-resources',
          title: 'CSS bloqueante no <head>',
          description: 'Stylesheet no <head> bloqueia renderização.',
          file: file.path,
          line: link.line,
          column: link.col,
          code: '<link rel="stylesheet">',
          evidence: 'CSS bloqueante',
          suggestion: 'Use media="print" para CSS não-crítico ou carregue async. CSS crítico inline.',
          impact: 'Aumenta tempo de First Contentful Paint (FCP).',
          performanceImpact: 'MEDIUM'
        }));
      }
    });

    // Scripts síncronos
    const scripts = parsed.elements.filter(el => el.tagName === 'script');
    scripts.forEach(script => {
      const async = script.attrs.find(a => a.name === 'async');
      const defer = script.attrs.find(a => a.name === 'defer');
      const src = script.attrs.find(a => a.name === 'src');

      if (src && !async && !defer) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.PERFORMANCE,
          subcategory: 'blocking-resources',
          title: 'Script síncrono bloqueante',
          description: 'Script sem async/defer bloqueia parsing HTML.',
          file: file.path,
          line: script.line,
          column: script.col,
          code: '<script src="">',
          evidence: 'Sem async/defer',
          suggestion: 'Adicione defer ou async. Use defer se ordem importa.',
          impact: 'Bloqueia renderização até script carregar e executar.',
          performanceImpact: 'HIGH'
        }));
      }
    });
  });

  // Extract external domains from HTML
  const externalDomains = new Set();
  const externalFonts = [];
  let hasGoogleFonts = false;
  let hasPreconnect = false;
  let hasDnsPrefetch = false;

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    // Check for preconnect and dns-prefetch
    parsed.elements
      .filter(el => el.tagName === 'link')
      .forEach(link => {
        const rel = link.attrs.find(a => a.name === 'rel');
        if (rel && rel.value === 'preconnect') {
          hasPreconnect = true;
        }
        if (rel && rel.value === 'dns-prefetch') {
          hasDnsPrefetch = true;
        }
      });

    // Extract external resources
    parsed.elements.forEach(el => {
      let src = null;

      if (el.tagName === 'script') {
        const srcAttr = el.attrs.find(a => a.name === 'src');
        src = srcAttr?.value;
      } else if (el.tagName === 'link') {
        const rel = el.attrs.find(a => a.name === 'rel');
        const hrefAttr = el.attrs.find(a => a.name === 'href');
        if (rel && (rel.value === 'stylesheet' || rel.value === 'preload')) {
          src = hrefAttr?.value;
        }
      } else if (el.tagName === 'iframe') {
        const srcAttr = el.attrs.find(a => a.name === 'src');
        const loading = el.attrs.find(a => a.name === 'loading');
        src = srcAttr?.value;

        // Check for missing loading="lazy" on iframe
        if (src && !loading) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.PERFORMANCE,
            subcategory: 'iframe-missing-lazy',
            title: '<iframe> sem loading="lazy"',
            description: 'iframe pode ser carregado com lazy loading.',
            file: file.path,
            line: el.line,
            column: el.col,
            code: `<iframe src="${src}">`,
            evidence: 'Sem loading="lazy"',
            suggestion: 'Adicione loading="lazy" ao iframe.',
            impact: 'iframe carrega imediatamente, afetando performance inicial.'
          }));
        }
      }

      if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//'))) {
        try {
          const url = new URL(src.startsWith('//') ? 'https:' + src : src);
          const domain = url.hostname;
          externalDomains.add(domain);

          // Check for Google Fonts
          if (domain.includes('fonts.googleapis.com')) {
            hasGoogleFonts = true;
          }

          // Check for font files
          if (src.match(/\.(woff2?|ttf|otf|eot)$/i)) {
            externalFonts.push(src);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
  });

  console.log(`[PerformanceMetricsAnalyzer] External domains: ${externalDomains.size}, Google Fonts: ${hasGoogleFonts}, Preconnect: ${hasPreconnect}`);

  // 1. Missing preconnect for external resources
  if (externalDomains.size > 0 && !hasPreconnect) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'missing-preconnect',
      title: 'Recursos externos sem preconnect',
      description: `${externalDomains.size} domínios externos detectados sem <link rel="preconnect">.`,
      file: 'HTML',
      line: 0,
      column: 0,
      code: Array.from(externalDomains).slice(0, 3).join(', '),
      evidence: 'Sem preconnect',
      suggestion: `Adicione <link rel="preconnect" href="https://domain.com"> no <head> para: ${Array.from(externalDomains).slice(0, 3).join(', ')}`,
      impact: 'Conexões DNS/TCP atrasadas, aumentando tempo de carregamento.'
    }));
  }

  // 2. Missing dns-prefetch
  if (externalDomains.size > 0 && !hasDnsPrefetch && !hasPreconnect) {
    issues.push(new Issue({
      severity: SEVERITY.LOW,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'missing-dns-prefetch',
      title: 'Sem dns-prefetch para recursos externos',
      description: `${externalDomains.size} domínios externos sem dns-prefetch.`,
      file: 'HTML',
      line: 0,
      column: 0,
      code: Array.from(externalDomains).slice(0, 3).join(', '),
      evidence: 'Sem dns-prefetch',
      suggestion: 'Adicione <link rel="dns-prefetch" href="//domain.com"> para resolver DNS mais cedo.',
      impact: 'DNS lookup atrasado.'
    }));
  }

  // 3. Too many external domains
  if (externalDomains.size > 10) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'too-many-external-domains',
      title: 'Excesso de domínios externos',
      description: `${externalDomains.size} domínios externos detectados (recomendado: ≤ 10).`,
      file: 'HTML',
      line: 0,
      column: 0,
      code: Array.from(externalDomains).slice(0, 5).join(', ') + '...',
      evidence: `${externalDomains.size} domínios`,
      suggestion: 'Reduza número de domínios externos. Cada domínio requer nova conexão.',
      impact: 'Overhead de múltiplas conexões DNS/TCP/TLS.'
    }));
  }

  // 4. @font-face without font-display
  cssFiles.forEach(file => {
    if (!file.parsed?.atRules) return;

    file.parsed.atRules.forEach(atRule => {
      if (atRule.type === 'font-face') {
        // Check if file.content contains 'font-display' near this @font-face
        const hasFontDisplay = file.content.includes('font-display');

        if (!hasFontDisplay) {
          issues.push(new Issue({
            severity: SEVERITY.HIGH,
            category: CATEGORY.PERFORMANCE,
            subcategory: 'font-display-missing',
            title: '@font-face sem font-display',
            description: '@font-face não especifica font-display.',
            file: file.path,
            line: atRule.line || 0,
            column: 0,
            code: '@font-face { ... }',
            evidence: 'Sem font-display',
            suggestion: 'Adicione font-display: swap; ao @font-face para evitar FOIT (Flash of Invisible Text).',
            impact: 'Texto invisível durante carregamento da fonte (FOIT).'
          }));
        }
      }
    });
  });

  // 5. No font preload
  if (externalFonts.length > 0) {
    const hasPreload = htmlFiles.some(file =>
      file.parsed?.elements.some(el => {
        if (el.tagName !== 'link') return false;
        const rel = el.attrs.find(a => a.name === 'rel');
        const as = el.attrs.find(a => a.name === 'as');
        return rel?.value === 'preload' && as?.value === 'font';
      })
    );

    if (!hasPreload) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.PERFORMANCE,
        subcategory: 'no-font-preload',
        title: 'Fontes externas sem preload',
        description: `${externalFonts.length} arquivos de fonte detectados sem <link rel="preload" as="font">.`,
        file: 'HTML',
        line: 0,
        column: 0,
        code: externalFonts.slice(0, 2).join(', '),
        evidence: 'Sem preload de fontes',
        suggestion: 'Adicione <link rel="preload" as="font" href="font.woff2" crossorigin> no <head>.',
        impact: 'Fontes carregam tarde, causando FOUT (Flash of Unstyled Text).'
      }));
    }
  }

  // 6. Too many font-weight variations
  const fontWeights = new Set();
  cssFiles.forEach(file => {
    if (!file.parsed?.rules) return;

    file.parsed.rules.forEach(rule => {
      rule.declarations.forEach(decl => {
        if (decl.property === 'font-weight') {
          fontWeights.add(decl.value);
        }
      });
    });
  });

  if (fontWeights.size > 4) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'too-many-font-weights',
      title: 'Excesso de variações de font-weight',
      description: `${fontWeights.size} valores diferentes de font-weight (recomendado: ≤ 4).`,
      file: 'CSS',
      line: 0,
      column: 0,
      code: Array.from(fontWeights).join(', '),
      evidence: `${fontWeights.size} font-weights`,
      suggestion: 'Limite font-weight a 3-4 valores (ex: 400, 600, 700).',
      impact: 'Múltiplos arquivos de fonte, aumentando tempo de carregamento.'
    }));
  }

  // 7. Google Fonts without preconnect to fonts.gstatic.com
  if (hasGoogleFonts) {
    const hasGstaticPreconnect = htmlFiles.some(file =>
      file.parsed?.elements.some(el => {
        if (el.tagName !== 'link') return false;
        const rel = el.attrs.find(a => a.name === 'rel');
        const href = el.attrs.find(a => a.name === 'href');
        return rel?.value === 'preconnect' && href?.value?.includes('fonts.gstatic.com');
      })
    );

    if (!hasGstaticPreconnect) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.PERFORMANCE,
        subcategory: 'google-fonts-no-preconnect',
        title: 'Google Fonts sem preconnect para fonts.gstatic.com',
        description: 'Google Fonts detectado mas sem preconnect para fonts.gstatic.com.',
        file: 'HTML',
        line: 0,
        column: 0,
        code: '<link rel="stylesheet" href="https://fonts.googleapis.com/...">',
        evidence: 'Sem preconnect gstatic',
        suggestion: 'Adicione <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>.',
        impact: 'Atraso no carregamento de arquivos de fonte do Google Fonts.'
      }));
    }
  }

  // 8. @font-face with url() - warn about size
  cssFiles.forEach(file => {
    if (!file.parsed?.atRules) return;

    file.parsed.atRules.forEach(atRule => {
      if (atRule.type === 'font-face' && file.content.includes('url(')) {
        const hasWoff2 = file.content.match(/\.woff2/);

        if (!hasWoff2) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.PERFORMANCE,
            subcategory: 'web-font-too-large',
            title: '@font-face sem formato woff2',
            description: '@font-face não usa formato woff2 (mais eficiente).',
            file: file.path,
            line: atRule.line || 0,
            column: 0,
            code: '@font-face { src: url(...) }',
            evidence: 'Sem woff2',
            suggestion: 'Use formato woff2 (compressão melhor). Garanta arquivos < 100KB.',
            impact: 'Fontes maiores, tempo de carregamento aumentado.'
          }));
        }
      }
    });
  });

  // 10. Too many third-party scripts
  let thirdPartyScripts = 0;
  htmlFiles.forEach(file => {
    if (!file.parsed) return;

    file.parsed.elements
      .filter(el => el.tagName === 'script')
      .forEach(script => {
        const src = script.attrs.find(a => a.name === 'src')?.value;
        if (src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//'))) {
          thirdPartyScripts++;
        }
      });
  });

  if (thirdPartyScripts > 5) {
    issues.push(new Issue({
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      subcategory: 'third-party-scripts',
      title: 'Excesso de scripts de terceiros',
      description: `${thirdPartyScripts} scripts externos detectados (recomendado: ≤ 5).`,
      file: 'HTML',
      line: 0,
      column: 0,
      code: `${thirdPartyScripts} external scripts`,
      evidence: 'Muitos scripts externos',
      suggestion: 'Reduza scripts de terceiros. Cada script adiciona overhead.',
      impact: 'Scripts de terceiros bloqueiam renderização e podem afetar performance.'
    }));
  }

  console.log(`[PerformanceMetricsAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
