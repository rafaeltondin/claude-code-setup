/**
 * Analisador de Acessibilidade HTML
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeAccessibility(htmlFiles) {
  console.log(`[AccessibilityAnalyzer] INÍCIO`);
  const issues = [];

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    const parser = file.parsedObj;

    // Imagens sem alt
    const imagesWithoutAlt = parser.getImagesWithoutAlt();
    imagesWithoutAlt.forEach(img => {
      const srcAttr = img.attrs.find(a => a.name === 'src');
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'images',
        title: 'Imagem sem atributo alt',
        description: 'Tag <img> sem atributo alt ou com alt vazio.',
        file: file.path,
        line: img.line,
        column: img.col,
        code: `<img src="${srcAttr?.value || ''}">`,
        evidence: 'Sem alt',
        suggestion: 'Adicione alt descritivo. Use alt="" apenas se imagem for puramente decorativa.',
        impact: 'Leitores de tela não conseguem descrever a imagem.',
        wcagLevel: 'A'
      }));
    });

    // Inputs sem labels
    const inputsWithoutLabels = parser.getInputsWithoutLabels();
    inputsWithoutLabels.forEach(input => {
      const typeAttr = input.attrs.find(a => a.name === 'type');
      const idAttr = input.attrs.find(a => a.name === 'id');
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'forms',
        title: 'Input sem label associado',
        description: 'Campo de formulário sem <label> associado.',
        file: file.path,
        line: input.line,
        column: input.col,
        code: `<input type="${typeAttr?.value || 'text'}"${idAttr ? ` id="${idAttr.value}"` : ''}>`,
        evidence: 'Sem <label for="">',
        suggestion: idAttr
          ? `Adicione <label for="${idAttr.value}">Texto</label>`
          : 'Adicione id ao input e <label for="id">Texto</label>',
        impact: 'Usuários com leitores de tela não sabem qual é o propósito do campo.',
        wcagLevel: 'A'
      }));
    });

    // Links vazios ou genéricos
    const links = parsed.elements.filter(el => el.tagName === 'a');
    links.forEach(link => {
      const hrefAttr = link.attrs.find(a => a.name === 'href');
      const ariaLabelAttr = link.attrs.find(a => a.name === 'aria-label');

      if (!hrefAttr || !hrefAttr.value || hrefAttr.value === '#') {
        // Links para "#" são mais graves que links vazios (geralmente placeholders esquecidos)
        const isBrokenPlaceholder = hrefAttr?.value === '#';

        issues.push(new Issue({
          severity: isBrokenPlaceholder ? SEVERITY.HIGH : SEVERITY.MEDIUM,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'links',
          title: isBrokenPlaceholder ? 'Link quebrado (href="#")' : 'Link vazio ou inválido',
          description: isBrokenPlaceholder
            ? 'Link com href="#" (placeholder não implementado).'
            : 'Link sem href válido.',
          file: file.path,
          line: link.line,
          column: link.col,
          code: `<a href="${hrefAttr?.value || ''}"${ariaLabelAttr ? ` aria-label="${ariaLabelAttr.value}"` : ''}>`,
          evidence: `href="${hrefAttr?.value || ''}"`,
          suggestion: isBrokenPlaceholder
            ? 'Substitua "#" por URL real, use href="javascript:void(0)" com onClick, ou <button> se for ação JS.'
            : 'Adicione href válido ou use <button> se for ação JavaScript.',
          impact: isBrokenPlaceholder
            ? '🟠 Link QUEBRADO: Leva usuário ao topo da página (comportamento inesperado), confunde navegação e screen readers.'
            : 'Link não funcional, confunde usuários e leitores de tela.',
          wcagLevel: 'A',
          wcagViolation: '2.4.4 Link Purpose (In Context)'
        }));
      }
    });

    // Botões sem texto/aria-label
    const buttons = parsed.elements.filter(el => el.tagName === 'button');
    buttons.forEach(button => {
      const ariaLabel = button.attrs.find(a => a.name === 'aria-label');
      const title = button.attrs.find(a => a.name === 'title');

      if (!ariaLabel && !title) {
        issues.push(new Issue({
          severity: SEVERITY.INFO,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'buttons',
          title: 'Botão sem aria-label',
          description: 'Botão sem aria-label. Verifique se possui texto visível.',
          file: file.path,
          line: button.line,
          column: button.col,
          code: `<button>`,
          evidence: 'Sem aria-label ou title',
          suggestion: 'Se botão só tem ícone, adicione aria-label="Descrição".',
          impact: 'Leitores de tela podem não conseguir descrever a função do botão.',
          wcagLevel: 'A'
        }));
      }
    });

    // HTML sem lang
    console.log('[AccessibilityAnalyzer] Verificando atributo lang no <html>');
    const htmlElements = parsed.elements.filter(el => el.tagName === 'html');
    htmlElements.forEach(htmlEl => {
      const langAttr = htmlEl.attrs.find(a => a.name === 'lang');
      if (!langAttr) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'structure',
          title: 'HTML sem atributo lang',
          description: 'Tag <html> sem atributo lang.',
          file: file.path,
          line: htmlEl.line,
          column: htmlEl.col,
          code: '<html>',
          evidence: 'Sem lang',
          suggestion: 'Adicione lang="pt-BR" ou lang="en" na tag <html>.',
          impact: 'Leitores de tela não sabem qual idioma usar para pronunciar o conteúdo.',
          wcagLevel: 'A',
          wcagViolation: '3.1.1 Language of Page'
        }));
      }
    });

    // Tabindex positivo
    console.log('[AccessibilityAnalyzer] Verificando tabindex positivo');
    parsed.elements.forEach(el => {
      const tabindexAttr = el.attrs.find(a => a.name === 'tabindex');
      if (tabindexAttr && parseInt(tabindexAttr.value) > 0) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'navigation',
          title: 'Tabindex positivo (anti-pattern)',
          description: `Elemento com tabindex="${tabindexAttr.value}" (valor positivo).`,
          file: file.path,
          line: el.line,
          column: el.col,
          code: `<${el.tagName} tabindex="${tabindexAttr.value}">`,
          evidence: `tabindex="${tabindexAttr.value}"`,
          suggestion: 'Use tabindex="0" (focável na ordem natural) ou tabindex="-1" (focável apenas via JS). Valores positivos alteram ordem natural de navegação.',
          impact: 'Usuários de teclado terão ordem de navegação confusa e imprevisível.',
          wcagLevel: 'A',
          wcagViolation: '2.4.3 Focus Order'
        }));
      }
    });

    // Outline:none sem alternativa
    console.log('[AccessibilityAnalyzer] Verificando outline:none inline');
    parsed.elements.forEach(el => {
      const styleAttr = el.attrs.find(a => a.name === 'style');
      if (styleAttr && /outline\s*:\s*(none|0)/i.test(styleAttr.value)) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'focus',
          title: 'Outline:none sem alternativa de foco',
          description: 'Elemento com outline:none no atributo style.',
          file: file.path,
          line: el.line,
          column: el.col,
          code: `<${el.tagName} style="${styleAttr.value}">`,
          evidence: 'outline:none detectado',
          suggestion: 'Remova outline:none ou forneça indicador de foco alternativo visível (ex: borda, sombra, mudança de cor).',
          impact: 'Usuários de teclado não conseguem ver qual elemento está focado.',
          wcagLevel: 'AA',
          wcagViolation: '2.4.7 Focus Visible'
        }));
      }
    });

    // Iframe sem title
    console.log('[AccessibilityAnalyzer] Verificando iframes sem title');
    const iframes = parsed.elements.filter(el => el.tagName === 'iframe');
    iframes.forEach(iframe => {
      const titleAttr = iframe.attrs.find(a => a.name === 'title');
      if (!titleAttr) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'media',
          title: 'Iframe sem title',
          description: 'Tag <iframe> sem atributo title.',
          file: file.path,
          line: iframe.line,
          column: iframe.col,
          code: `<iframe src="${iframe.attrs.find(a => a.name === 'src')?.value || ''}">`,
          evidence: 'Sem title',
          suggestion: 'Adicione title="Descrição do conteúdo do iframe" para indicar o propósito.',
          impact: 'Leitores de tela não conseguem descrever o conteúdo incorporado.',
          wcagLevel: 'A',
          wcagViolation: '4.1.2 Name, Role, Value'
        }));
      }
    });

    // Video sem captions
    console.log('[AccessibilityAnalyzer] Verificando vídeos sem captions');
    const videos = parsed.elements.filter(el => el.tagName === 'video');
    videos.forEach(video => {
      const hasTrack = video.children && video.children.some(child =>
        child.tagName === 'track' && child.attrs.some(a => a.name === 'kind' && a.value === 'captions')
      );

      if (!hasTrack) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'media',
          title: 'Vídeo sem legendas',
          description: 'Tag <video> sem elemento <track kind="captions">.',
          file: file.path,
          line: video.line,
          column: video.col,
          code: '<video>',
          evidence: 'Sem <track kind="captions">',
          suggestion: 'Adicione <track kind="captions" src="captions.vtt" srclang="pt-BR" label="Português">.',
          impact: 'Usuários surdos ou com deficiência auditiva não conseguem acompanhar o conteúdo.',
          wcagLevel: 'A',
          wcagViolation: '1.2.2 Captions (Prerecorded)'
        }));
      }
    });

    // Audio sem transcrição
    console.log('[AccessibilityAnalyzer] Verificando elementos <audio>');
    const audios = parsed.elements.filter(el => el.tagName === 'audio');
    audios.forEach(audio => {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'media',
        title: 'Áudio requer transcrição',
        description: 'Elemento <audio> detectado. Forneça transcrição textual do conteúdo.',
        file: file.path,
        line: audio.line,
        column: audio.col,
        code: '<audio>',
        evidence: 'Áudio presente',
        suggestion: 'Forneça link ou texto com transcrição completa do áudio próximo ao player.',
        impact: 'Usuários surdos não conseguem acessar o conteúdo em áudio.',
        wcagLevel: 'A',
        wcagViolation: '1.2.1 Audio-only and Video-only'
      }));
    });

    // Video com autoplay e áudio
    console.log('[AccessibilityAnalyzer] Verificando autoplay em vídeos');
    videos.forEach(video => {
      const autoplayAttr = video.attrs.find(a => a.name === 'autoplay');
      const mutedAttr = video.attrs.find(a => a.name === 'muted');

      if (autoplayAttr && !mutedAttr) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'media',
          title: 'Vídeo com autoplay e áudio',
          description: 'Vídeo com autoplay sem atributo muted.',
          file: file.path,
          line: video.line,
          column: video.col,
          code: '<video autoplay>',
          evidence: 'autoplay sem muted',
          suggestion: 'Adicione muted ou remova autoplay. Vídeos com áudio não devem iniciar automaticamente.',
          impact: 'Áudio inesperado pode desorientar usuários, especialmente com leitores de tela.',
          wcagLevel: 'A',
          wcagViolation: '1.4.2 Audio Control'
        }));
      }
    });

    // Links com texto genérico
    console.log('[AccessibilityAnalyzer] Verificando links com texto genérico');
    const genericTexts = ['clique aqui', 'click here', 'saiba mais', 'learn more', 'leia mais', 'read more', 'here', 'aqui'];
    const linkRegex = /<a[^>]*>(.*?)<\/a>/gi;
    const matches = [...file.content.matchAll(linkRegex)];

    matches.forEach(match => {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      if (genericTexts.includes(linkText)) {
        // Encontrar linha aproximada
        const position = match.index;
        const textBefore = file.content.substring(0, position);
        const line = (textBefore.match(/\n/g) || []).length + 1;

        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'links',
          title: 'Link com texto genérico',
          description: `Link com texto "${match[1].trim()}" não é descritivo.`,
          file: file.path,
          line: line,
          column: 0,
          code: match[0],
          evidence: `Texto: "${match[1].trim()}"`,
          suggestion: 'Use texto descritivo que indique o destino do link (ex: "Baixar relatório PDF", "Ver produtos disponíveis").',
          impact: 'Usuários de leitores de tela que navegam por links não conseguem entender o propósito.',
          wcagLevel: 'A',
          wcagViolation: '2.4.4 Link Purpose (In Context)'
        }));
      }
    });

    // Skip navigation link
    console.log('[AccessibilityAnalyzer] Verificando skip navigation link');
    const allLinks = parsed.elements.filter(el => el.tagName === 'a');
    if (allLinks.length > 0) {
      const firstLink = allLinks[0];
      const hrefAttr = firstLink.attrs.find(a => a.name === 'href');

      if (!hrefAttr || !hrefAttr.value.startsWith('#')) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'navigation',
          title: 'Ausência de skip navigation link',
          description: 'Primeiro link da página deveria ser "Pular para conteúdo principal" (#main).',
          file: file.path,
          line: 1,
          column: 0,
          code: '<body>',
          evidence: 'Sem skip link',
          suggestion: 'Adicione como primeiro elemento: <a href="#main" class="skip-link">Pular para conteúdo</a>.',
          impact: 'Usuários de teclado precisam passar por toda navegação para chegar ao conteúdo.',
          wcagLevel: 'A',
          wcagViolation: '2.4.1 Bypass Blocks'
        }));
      }
    }

    // Aria-hidden com tabindex
    console.log('[AccessibilityAnalyzer] Verificando aria-hidden em elementos focáveis');
    parsed.elements.forEach(el => {
      const ariaHidden = el.attrs.find(a => a.name === 'aria-hidden' && a.value === 'true');
      const tabindexAttr = el.attrs.find(a => a.name === 'tabindex');

      if (ariaHidden && tabindexAttr && parseInt(tabindexAttr.value) >= 0) {
        issues.push(new Issue({
          severity: SEVERITY.CRITICAL,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'aria',
          title: 'Aria-hidden em elemento focável',
          description: `Elemento com aria-hidden="true" e tabindex="${tabindexAttr.value}".`,
          file: file.path,
          line: el.line,
          column: el.col,
          code: `<${el.tagName} aria-hidden="true" tabindex="${tabindexAttr.value}">`,
          evidence: 'aria-hidden="true" com tabindex >= 0',
          suggestion: 'Remova tabindex ou aria-hidden. Elementos invisíveis para screen readers não devem ser focáveis.',
          impact: 'CRÍTICO: Elemento focável mas invisível para leitores de tela causa confusão total.',
          wcagLevel: 'A',
          wcagViolation: '4.1.2 Name, Role, Value'
        }));
      }
    });

    // Main landmark
    console.log('[AccessibilityAnalyzer] Verificando landmark <main>');
    const mainElements = parsed.elements.filter(el => el.tagName === 'main');
    if (mainElements.length === 0) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'structure',
        title: 'Ausência de <main> landmark',
        description: 'Página sem elemento <main>.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<body>',
        evidence: 'Sem <main>',
        suggestion: 'Envolva o conteúdo principal da página em <main>.',
        impact: 'Leitores de tela não conseguem navegar diretamente para o conteúdo principal.',
        wcagLevel: 'A',
        wcagViolation: '1.3.1 Info and Relationships'
      }));
    } else if (mainElements.length > 1) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'structure',
        title: 'Múltiplos <main> landmarks',
        description: `Página possui ${mainElements.length} elementos <main>.`,
        file: file.path,
        line: mainElements[1].line,
        column: mainElements[1].col,
        code: '<main>',
        evidence: `${mainElements.length} elementos <main>`,
        suggestion: 'Use apenas um <main> por página.',
        impact: 'Múltiplos main landmarks confundem leitores de tela.',
        wcagLevel: 'A'
      }));
    }

    // Tabelas sem headers
    console.log('[AccessibilityAnalyzer] Verificando tabelas de dados');
    const tables = parsed.elements.filter(el => el.tagName === 'table');
    tables.forEach(table => {
      const hasTd = parsed.elements.some(el => el.tagName === 'td' && el.parent === table);
      const hasTh = parsed.elements.some(el => el.tagName === 'th');

      if (hasTd && !hasTh) {
        issues.push(new Issue({
          severity: SEVERITY.HIGH,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'tables',
          title: 'Tabela sem headers',
          description: 'Tabela com <td> mas sem elementos <th>.',
          file: file.path,
          line: table.line,
          column: table.col,
          code: '<table>',
          evidence: 'Sem <th>',
          suggestion: 'Use <th> para células de cabeçalho em tabelas de dados.',
          impact: 'Leitores de tela não conseguem associar células com seus cabeçalhos.',
          wcagLevel: 'A',
          wcagViolation: '1.3.1 Info and Relationships'
        }));
      }
    });

    // TH sem scope
    console.log('[AccessibilityAnalyzer] Verificando scope em <th>');
    const thElements = parsed.elements.filter(el => el.tagName === 'th');
    thElements.forEach(th => {
      const scopeAttr = th.attrs.find(a => a.name === 'scope');
      if (!scopeAttr) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.ACCESSIBILITY,
          subcategory: 'tables',
          title: 'TH sem atributo scope',
          description: 'Elemento <th> sem atributo scope.',
          file: file.path,
          line: th.line,
          column: th.col,
          code: '<th>',
          evidence: 'Sem scope',
          suggestion: 'Adicione scope="col" para colunas ou scope="row" para linhas.',
          impact: 'Leitores de tela podem não associar corretamente headers com células de dados.',
          wcagLevel: 'A'
        }));
      }
    });

    // Font-size muito pequeno
    console.log('[AccessibilityAnalyzer] Verificando font-size pequeno');
    parsed.elements.forEach(el => {
      const styleAttr = el.attrs.find(a => a.name === 'style');
      if (styleAttr) {
        const fontSizeMatch = styleAttr.value.match(/font-size\s*:\s*(\d+)px/i);
        if (fontSizeMatch && parseInt(fontSizeMatch[1]) < 12) {
          issues.push(new Issue({
            severity: SEVERITY.LOW,
            category: CATEGORY.ACCESSIBILITY,
            subcategory: 'readability',
            title: 'Font-size muito pequeno',
            description: `Elemento com font-size: ${fontSizeMatch[1]}px (menor que 12px).`,
            file: file.path,
            line: el.line,
            column: el.col,
            code: `<${el.tagName} style="${styleAttr.value}">`,
            evidence: `font-size: ${fontSizeMatch[1]}px`,
            suggestion: 'Use font-size >= 12px para melhor legibilidade. Ideal: 16px ou maior.',
            impact: 'Texto difícil de ler, especialmente para usuários com baixa visão.',
            wcagLevel: 'AA',
            wcagViolation: '1.4.4 Resize text'
          }));
        }
      }
    });

    // Auto-refresh meta
    console.log('[AccessibilityAnalyzer] Verificando meta refresh');
    const metas = parsed.elements.filter(el => el.tagName === 'meta');
    const metaRefresh = metas.find(m =>
      m.attrs.some(a => a.name === 'http-equiv' && a.value.toLowerCase() === 'refresh')
    );
    if (metaRefresh) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.ACCESSIBILITY,
        subcategory: 'navigation',
        title: 'Meta refresh detectado',
        description: 'Tag <meta http-equiv="refresh"> detectada.',
        file: file.path,
        line: metaRefresh.line,
        column: metaRefresh.col,
        code: `<meta http-equiv="refresh" content="${metaRefresh.attrs.find(a => a.name === 'content')?.value || ''}">`,
        evidence: 'Auto-refresh presente',
        suggestion: 'Remova auto-refresh ou use tempo muito longo (> 20h). Deixe usuário controlar navegação.',
        impact: 'Auto-refresh pode desorientar usuários, especialmente com leitores de tela ou dificuldades cognitivas.',
        wcagLevel: 'A',
        wcagViolation: '2.2.1 Timing Adjustable, 3.2.5 Change on Request'
      }));
    }
  });

  console.log(`[AccessibilityAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
