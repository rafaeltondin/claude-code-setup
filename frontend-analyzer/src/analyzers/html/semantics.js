/**
 * Analisador de Semântica HTML
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

const SEMANTIC_TAGS = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer'];

export function analyzeSemantics(htmlFiles) {
  console.log(`[SemanticsAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    const parser = file.parsedObj;

    // Verificar estrutura de headings
    const headings = parser.getHeadingStructure();
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];

      if (current.level - previous.level > 1) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: 'Nível de heading pulado',
          description: `Pulou de <${previous.tag}> para <${current.tag}> (pulou ${current.level - previous.level - 1} nível).`,
          file: file.path,
          line: current.line,
          column: 0,
          code: `<${previous.tag}> ... <${current.tag}>`,
          evidence: `${previous.tag} → ${current.tag}`,
          suggestion: 'Use hierarquia sequencial: h1 → h2 → h3. Não pule níveis.',
          impact: 'Dificulta acessibilidade e compreensão da estrutura do documento.'
        }));
      }
    }

    // Verificar múltiplos h1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count > 1) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'semantics',
        title: 'Múltiplos <h1>',
        description: `Página possui ${h1Count} tags <h1>.`,
        file: file.path,
        line: headings.find(h => h.level === 1).line,
        column: 0,
        code: `${h1Count}x <h1>`,
        evidence: `${h1Count} headings h1`,
        suggestion: 'Use apenas um <h1> por página (título principal).',
        impact: 'Confunde estrutura de documento e prejudica SEO.'
      }));
    }

    // Verificar uso de divs onde deveria usar tags semânticas
    const divs = parsed.elements.filter(el => el.tagName === 'div');
    divs.forEach(div => {
      const classAttr = div.attrs.find(a => a.name === 'class');
      const className = classAttr?.value.toLowerCase() || '';

      SEMANTIC_TAGS.forEach(semantic => {
        if (className.includes(semantic)) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.HTML,
            subcategory: 'semantics',
            title: `Usar <${semantic}> ao invés de <div>`,
            description: `<div class="${classAttr.value}"> deveria ser <${semantic}>.`,
            file: file.path,
            line: div.line,
            column: div.col,
            code: `<div class="${classAttr.value}">`,
            evidence: `Classe sugere uso de <${semantic}>`,
            suggestion: `Troque <div class="${classAttr.value}"> por <${semantic}>.`,
            impact: 'Melhora semântica, acessibilidade e SEO.'
          }));
        }
      });
    });

    // Página sem H1
    console.log('[SemanticsAnalyzer] Verificando presença de H1');
    if (h1Count === 0) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'semantics',
        title: 'Página sem <h1>',
        description: 'Página não possui elemento <h1>.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<body>',
        evidence: 'Zero headings h1',
        suggestion: 'Adicione <h1> com o título principal da página.',
        impact: 'Péssimo para SEO e acessibilidade. H1 define o tópico principal da página.'
      }));
    }

    // Section sem heading
    console.log('[SemanticsAnalyzer] Verificando sections sem headings');
    const sections = parsed.elements.filter(el => el.tagName === 'section');
    const totalHeadings = headings.length;
    const totalSections = sections.length;

    if (totalSections > 0 && totalHeadings < totalSections) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'semantics',
        title: 'Sections sem headings',
        description: `${totalSections} elementos <section>, mas apenas ${totalHeadings} headings.`,
        file: file.path,
        line: sections[0].line,
        column: sections[0].col,
        code: '<section>',
        evidence: `${totalSections} sections, ${totalHeadings} headings`,
        suggestion: 'Cada <section> deveria ter um heading (h1-h6) descrevendo seu conteúdo.',
        impact: 'Sections sem heading prejudicam navegação por leitores de tela.'
      }));
    }

    // Nav sem links
    console.log('[SemanticsAnalyzer] Verificando <nav> sem links');
    const navs = parsed.elements.filter(el => el.tagName === 'nav');
    const allLinks = parsed.elements.filter(el => el.tagName === 'a');

    navs.forEach(nav => {
      const linksInNav = allLinks.filter(link => {
        let current = link.parent;
        while (current) {
          if (current === nav) return true;
          current = current.parent;
        }
        return false;
      });

      if (linksInNav.length === 0) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: 'Nav sem links',
          description: 'Elemento <nav> sem elementos <a> descendentes.',
          file: file.path,
          line: nav.line,
          column: nav.col,
          code: '<nav>',
          evidence: 'Nav sem links',
          suggestion: '<nav> deveria conter links de navegação (<a>).',
          impact: 'Nav vazio não tem propósito semântico.'
        }));
      }
    });

    // Figure sem figcaption
    console.log('[SemanticsAnalyzer] Verificando <figure> sem <figcaption>');
    const figures = parsed.elements.filter(el => el.tagName === 'figure');
    figures.forEach(figure => {
      const hasFigcaption = figure.children && figure.children.some(child => child.tagName === 'figcaption');

      if (!hasFigcaption) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: 'Figure sem figcaption',
          description: 'Elemento <figure> sem <figcaption>.',
          file: file.path,
          line: figure.line,
          column: figure.col,
          code: '<figure>',
          evidence: 'Sem <figcaption>',
          suggestion: 'Adicione <figcaption> com descrição da figura.',
          impact: 'Figure sem caption perde contexto semântico.'
        }));
      }
    });

    // UL/OL com filhos inválidos
    console.log('[SemanticsAnalyzer] Verificando filhos diretos de <ul>/<ol>');
    const lists = parsed.elements.filter(el => el.tagName === 'ul' || el.tagName === 'ol');
    lists.forEach(list => {
      const invalidChildren = parsed.elements.filter(el => {
        return el.parent === list && el.tagName !== 'li';
      });

      invalidChildren.forEach(child => {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: `<${list.tagName}> com filho inválido`,
          description: `Elemento <${list.tagName}> tem filho direto <${child.tagName}> (deveria ser <li>).`,
          file: file.path,
          line: child.line,
          column: child.col,
          code: `<${list.tagName}><${child.tagName}>`,
          evidence: `<${child.tagName}> como filho direto de <${list.tagName}>`,
          suggestion: `Envolva <${child.tagName}> em <li>.`,
          impact: 'HTML inválido, quebra semântica de listas.'
        }));
      });
    });

    // Tabela para layout
    console.log('[SemanticsAnalyzer] Verificando tabelas usadas para layout');
    const tables = parsed.elements.filter(el => el.tagName === 'table');
    tables.forEach(table => {
      const hasTh = parsed.elements.some(el => el.tagName === 'th');
      const hasThead = parsed.elements.some(el => el.tagName === 'thead');
      const classAttr = table.attrs.find(a => a.name === 'class');
      const className = classAttr?.value.toLowerCase() || '';

      const layoutClasses = ['layout', 'grid', 'container', 'wrapper'];
      const hasLayoutClass = layoutClasses.some(cls => className.includes(cls));

      if (!hasTh && !hasThead && hasLayoutClass) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: 'Tabela usada para layout',
          description: `<table class="${classAttr?.value}"> parece ser usada para layout, não dados.`,
          file: file.path,
          line: table.line,
          column: table.col,
          code: `<table class="${classAttr?.value}">`,
          evidence: 'Table sem th/thead com classe de layout',
          suggestion: 'Use CSS Grid ou Flexbox para layout. Tabelas são para dados tabulares.',
          impact: 'Tabelas para layout prejudicam acessibilidade e SEO.'
        }));
      } else if (!hasTh && !hasThead) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'semantics',
          title: 'Tabela sem cabeçalhos',
          description: 'Tabela sem <th> ou <thead>. Pode ser layout ou dados sem estrutura adequada.',
          file: file.path,
          line: table.line,
          column: table.col,
          code: '<table>',
          evidence: 'Sem th/thead',
          suggestion: 'Se for tabela de dados, adicione <th>. Se for layout, use CSS Grid/Flexbox.',
          impact: 'Tabelas sem estrutura adequada prejudicam acessibilidade.'
        }));
      }
    });

    // Main element
    console.log('[SemanticsAnalyzer] Verificando elemento <main>');
    const mainElements = parsed.elements.filter(el => el.tagName === 'main');
    if (mainElements.length === 0) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'semantics',
        title: 'Ausência de elemento <main>',
        description: 'Página sem elemento <main>.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<body>',
        evidence: 'Sem <main>',
        suggestion: 'Envolva o conteúdo principal da página em <main>.',
        impact: 'Dificulta navegação por leitores de tela e SEO.'
      }));
    }
  });

  console.log(`[SemanticsAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
