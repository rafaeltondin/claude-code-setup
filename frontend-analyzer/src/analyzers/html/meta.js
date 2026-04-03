/**
 * Analisador de Meta Tags e Head
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeMeta(htmlFiles) {
  console.log(`[MetaAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    const metas = parsed.elements.filter(el => el.tagName === 'meta');

    // Meta description
    const description = metas.find(m =>
      m.attrs.some(a => a.name === 'name' && a.value === 'description')
    );
    if (!description) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'meta',
        title: 'Meta description ausente',
        description: 'Tag <meta name="description"> não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem meta description',
        suggestion: 'Adicione <meta name="description" content="Descrição da página (max 155 chars)">',
        impact: 'CRÍTICO para SEO: Google não terá descrição para exibir nos resultados.'
      }));
    }

    // Open Graph (og:title, og:description)
    const ogTitle = metas.find(m =>
      m.attrs.some(a => a.name === 'property' && a.value === 'og:title')
    );
    if (!ogTitle) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.HTML,
        subcategory: 'meta',
        title: 'Open Graph title ausente',
        description: 'Meta tag og:title não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem og:title',
        suggestion: 'Adicione <meta property="og:title" content="Título"> para redes sociais.',
        impact: 'Compartilhamento em redes sociais sem preview adequado.'
      }));
    }

    // Title length
    console.log('[MetaAnalyzer] Verificando comprimento do title');
    const titleMatch = file.content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      const titleText = titleMatch[1].trim();
      if (titleText.length < 30 || titleText.length > 60) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.SEO,
          subcategory: 'meta',
          title: 'Comprimento inadequado do title',
          description: `Title tem ${titleText.length} caracteres (ideal: 30-60).`,
          file: file.path,
          line: 1,
          column: 0,
          code: `<title>${titleText}</title>`,
          evidence: `${titleText.length} caracteres`,
          suggestion: titleText.length < 30
            ? 'Expanda o title para 30-60 caracteres para melhor SEO.'
            : 'Reduza o title para max 60 caracteres para não ser cortado no Google.',
          impact: 'Title muito curto ou longo prejudica SEO e exibição nos resultados de busca.'
        }));
      }
    }

    // Description length
    console.log('[MetaAnalyzer] Verificando comprimento do description');
    if (description) {
      const contentAttr = description.attrs.find(a => a.name === 'content');
      if (contentAttr) {
        const descText = contentAttr.value.trim();
        if (descText.length < 70 || descText.length > 160) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.SEO,
            subcategory: 'meta',
            title: 'Comprimento inadequado da description',
            description: `Meta description tem ${descText.length} caracteres (ideal: 70-160).`,
            file: file.path,
            line: description.line,
            column: description.col,
            code: `<meta name="description" content="${descText.substring(0, 50)}...">`,
            evidence: `${descText.length} caracteres`,
            suggestion: descText.length < 70
              ? 'Expanda a description para 70-160 caracteres.'
              : 'Reduza a description para max 160 caracteres para não ser cortada.',
            impact: 'Description inadequada prejudica CTR nos resultados de busca.'
          }));
        }
      }
    }

    // Canonical link
    console.log('[MetaAnalyzer] Verificando canonical link');
    const links = parsed.elements.filter(el => el.tagName === 'link');
    const canonical = links.find(l =>
      l.attrs.some(a => a.name === 'rel' && a.value === 'canonical')
    );
    if (!canonical) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'Canonical link ausente',
        description: 'Tag <link rel="canonical"> não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem canonical',
        suggestion: 'Adicione <link rel="canonical" href="URL-principal"> para evitar conteúdo duplicado.',
        impact: 'Google pode indexar múltiplas versões da mesma página, prejudicando SEO.'
      }));
    }

    // Open Graph tags
    console.log('[MetaAnalyzer] Verificando Open Graph tags');
    const ogDescription = metas.find(m =>
      m.attrs.some(a => a.name === 'property' && a.value === 'og:description')
    );
    if (!ogDescription) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'og:description ausente',
        description: 'Meta tag og:description não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem og:description',
        suggestion: 'Adicione <meta property="og:description" content="Descrição">.',
        impact: 'Compartilhamento em redes sociais sem descrição adequada.'
      }));
    }

    const ogImage = metas.find(m =>
      m.attrs.some(a => a.name === 'property' && a.value === 'og:image')
    );
    if (!ogImage) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'og:image ausente',
        description: 'Meta tag og:image não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem og:image',
        suggestion: 'Adicione <meta property="og:image" content="URL-da-imagem">.',
        impact: 'Compartilhamento em redes sociais sem preview de imagem.'
      }));
    }

    const ogUrl = metas.find(m =>
      m.attrs.some(a => a.name === 'property' && a.value === 'og:url')
    );
    if (!ogUrl) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'og:url ausente',
        description: 'Meta tag og:url não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem og:url',
        suggestion: 'Adicione <meta property="og:url" content="URL-canonica">.',
        impact: 'Redes sociais podem usar URL errada para compartilhamento.'
      }));
    }

    const ogType = metas.find(m =>
      m.attrs.some(a => a.name === 'property' && a.value === 'og:type')
    );
    if (!ogType) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'og:type ausente',
        description: 'Meta tag og:type não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem og:type',
        suggestion: 'Adicione <meta property="og:type" content="website"> (ou article, etc).',
        impact: 'Redes sociais podem não categorizar corretamente o conteúdo.'
      }));
    }

    // Twitter Card
    console.log('[MetaAnalyzer] Verificando Twitter Card');
    const twitterCard = metas.find(m =>
      m.attrs.some(a => a.name === 'name' && a.value === 'twitter:card')
    );
    if (!twitterCard) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'Twitter Card ausente',
        description: 'Meta tag twitter:card não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem twitter:card',
        suggestion: 'Adicione <meta name="twitter:card" content="summary_large_image">.',
        impact: 'Compartilhamento no Twitter sem card visual adequado.'
      }));
    }

    // Favicon
    console.log('[MetaAnalyzer] Verificando favicon');
    const favicon = links.find(l =>
      l.attrs.some(a => a.name === 'rel' && (a.value === 'icon' || a.value === 'shortcut icon'))
    );
    if (!favicon) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'meta',
        title: 'Favicon ausente',
        description: 'Tag <link rel="icon"> não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem favicon',
        suggestion: 'Adicione <link rel="icon" href="/favicon.ico">.',
        impact: 'Navegadores exibirão ícone genérico na aba.'
      }));
    }

    // Theme color
    console.log('[MetaAnalyzer] Verificando theme-color');
    const themeColor = metas.find(m =>
      m.attrs.some(a => a.name === 'name' && a.value === 'theme-color')
    );
    if (!themeColor) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.HTML,
        subcategory: 'meta',
        title: 'Theme color ausente',
        description: 'Meta tag theme-color não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem theme-color',
        suggestion: 'Adicione <meta name="theme-color" content="#cor"> para PWA e mobile.',
        impact: 'Navegadores mobile não personalizarão barra de endereço com cor da marca.'
      }));
    }

    // Apple touch icon
    console.log('[MetaAnalyzer] Verificando apple-touch-icon');
    const appleIcon = links.find(l =>
      l.attrs.some(a => a.name === 'rel' && a.value === 'apple-touch-icon')
    );
    if (!appleIcon) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.HTML,
        subcategory: 'meta',
        title: 'Apple touch icon ausente',
        description: 'Tag <link rel="apple-touch-icon"> não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem apple-touch-icon',
        suggestion: 'Adicione <link rel="apple-touch-icon" href="/apple-icon-180x180.png">.',
        impact: 'Ícone de baixa qualidade quando usuário adicionar site à tela inicial no iOS.'
      }));
    }

    // Robots noindex
    console.log('[MetaAnalyzer] Verificando robots noindex');
    const robots = metas.find(m =>
      m.attrs.some(a => a.name === 'name' && a.value === 'robots')
    );
    if (robots) {
      const contentAttr = robots.attrs.find(a => a.name === 'content');
      if (contentAttr && /noindex/i.test(contentAttr.value)) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.SEO,
          subcategory: 'meta',
          title: 'Robots noindex detectado',
          description: `Meta robots com content="${contentAttr.value}".`,
          file: file.path,
          line: robots.line,
          column: robots.col,
          code: `<meta name="robots" content="${contentAttr.value}">`,
          evidence: 'noindex detectado',
          suggestion: 'ATENÇÃO: Esta página NÃO aparecerá no Google. Remova noindex se não for intencional.',
          impact: 'CRÍTICO: Página não será indexada por motores de busca.'
        }));
      }
    }

    // Structured data
    console.log('[MetaAnalyzer] Verificando structured data (JSON-LD)');
    const scripts = parsed.elements.filter(el => el.tagName === 'script');
    const hasJsonLd = scripts.some(script =>
      script.attrs.some(a => a.name === 'type' && a.value === 'application/ld+json')
    );
    if (!hasJsonLd) {
      issues.push(new Issue({
        severity: SEVERITY.LOW,
        category: CATEGORY.SEO,
        subcategory: 'meta',
        title: 'Structured data ausente',
        description: 'Nenhum <script type="application/ld+json"> encontrado.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem JSON-LD',
        suggestion: 'Adicione structured data (Schema.org) para rich snippets no Google.',
        impact: 'Página não terá rich snippets (estrelas, breadcrumbs, FAQ, etc) nos resultados de busca.'
      }));
    }
  });

  console.log(`[MetaAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
