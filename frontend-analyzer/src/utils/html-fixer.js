/**
 * HTML Fixer - Utilitários para Manipulação de HTML
 *
 * Fornece funções seguras para modificar HTML programaticamente
 * sem quebrar a estrutura existente.
 */

/**
 * Adiciona um atributo a uma tag HTML
 *
 * @param {string} html - HTML original
 * @param {RegExp} tagRegex - Regex para encontrar a tag
 * @param {string} attribute - Nome do atributo
 * @param {string} value - Valor do atributo
 * @returns {string} HTML modificado
 */
export function addAttribute(html, tagRegex, attribute, value) {
  console.log(`[HTMLFixer] addAttribute: ${attribute}="${value}"`);

  return html.replace(tagRegex, (match) => {
    // Verificar se o atributo já existe
    const attrRegex = new RegExp(`\\s${attribute}\\s*=`, 'i');
    if (attrRegex.test(match)) {
      console.log(`[HTMLFixer] Atributo ${attribute} já existe, pulando...`);
      return match;
    }

    // Adicionar atributo antes do fechamento da tag
    const closeRegex = /(\s*\/?>)$/;
    const modified = match.replace(closeRegex, ` ${attribute}="${value}"$1`);
    console.log(`[HTMLFixer] Atributo adicionado com sucesso`);
    return modified;
  });
}

/**
 * Adiciona uma meta tag no head
 *
 * @param {string} html - HTML original
 * @param {string} name - Nome da meta tag (ou charset)
 * @param {string} content - Conteúdo da meta tag
 * @returns {string} HTML modificado
 */
export function addMetaTag(html, name, content = null) {
  console.log(`[HTMLFixer] addMetaTag: ${name}${content ? `="${content}"` : ''}`);

  // Verificar se meta tag já existe
  const existingRegex = content
    ? new RegExp(`<meta\\s+name=["']${name}["']`, 'i')
    : new RegExp(`<meta\\s+${name}`, 'i');

  if (existingRegex.test(html)) {
    console.log(`[HTMLFixer] Meta tag ${name} já existe, pulando...`);
    return html;
  }

  // Criar meta tag
  const metaTag = content
    ? `<meta name="${name}" content="${content}">`
    : `<meta ${name}>`;

  return addInsideHead(html, metaTag);
}

/**
 * Adiciona conteúdo dentro do <head>
 *
 * @param {string} html - HTML original
 * @param {string} content - Conteúdo a adicionar
 * @returns {string} HTML modificado
 */
export function addInsideHead(html, content) {
  console.log(`[HTMLFixer] addInsideHead: ${content.substring(0, 50)}...`);

  // Procurar tag <head>
  const headRegex = /<head[^>]*>/i;

  if (!headRegex.test(html)) {
    console.warn(`[HTMLFixer] Tag <head> não encontrada, criando...`);
    // Se não houver head, adicionar após <html>
    const htmlTagRegex = /<html[^>]*>/i;
    if (htmlTagRegex.test(html)) {
      return html.replace(htmlTagRegex, (match) => {
        return `${match}\n<head>\n  ${content}\n</head>`;
      });
    }
    // Se não houver nem <html>, adicionar no início
    return `<head>\n  ${content}\n</head>\n${html}`;
  }

  // Adicionar logo após a abertura do <head>
  return html.replace(headRegex, (match) => {
    return `${match}\n  ${content}`;
  });
}

/**
 * Garante que um atributo existe em uma tag
 * Se não existir, adiciona. Se existir, mantém o valor original.
 *
 * @param {string} html - HTML original
 * @param {string} tag - Nome da tag
 * @param {string} attribute - Nome do atributo
 * @param {string} value - Valor padrão do atributo
 * @returns {string} HTML modificado
 */
export function ensureAttribute(html, tag, attribute, value) {
  console.log(`[HTMLFixer] ensureAttribute: <${tag} ${attribute}="${value}">`);

  const tagRegex = new RegExp(`<${tag}(?!\\w)[^>]*>`, 'gi');
  return addAttribute(html, tagRegex, attribute, value);
}

/**
 * Adiciona aria-label a um elemento específico
 *
 * @param {string} html - HTML original
 * @param {RegExp} elementRegex - Regex para encontrar o elemento
 * @param {string} label - Valor do aria-label
 * @returns {string} HTML modificado
 */
export function addAriaLabel(html, elementRegex, label) {
  console.log(`[HTMLFixer] addAriaLabel: "${label}"`);
  return addAttribute(html, elementRegex, 'aria-label', label);
}

/**
 * Adiciona title ao documento se não existir
 *
 * @param {string} html - HTML original
 * @param {string} title - Título padrão
 * @returns {string} HTML modificado
 */
export function ensureTitle(html, title = 'Page Title') {
  console.log(`[HTMLFixer] ensureTitle: "${title}"`);

  // Verificar se <title> já existe
  if (/<title[^>]*>.*?<\/title>/is.test(html)) {
    console.log(`[HTMLFixer] Tag <title> já existe, pulando...`);
    return html;
  }

  // Adicionar <title> no <head>
  return addInsideHead(html, `<title>${title}</title>`);
}

/**
 * Adiciona comentário de aviso (não modifica estrutura)
 *
 * @param {string} html - HTML original
 * @param {RegExp} locationRegex - Onde adicionar o comentário
 * @param {string} warning - Mensagem de aviso
 * @returns {string} HTML modificado
 */
export function addWarningComment(html, locationRegex, warning) {
  console.log(`[HTMLFixer] addWarningComment: ${warning}`);

  return html.replace(locationRegex, (match) => {
    return `<!-- ⚠️ WARNING: ${warning} -->\n${match}`;
  });
}

/**
 * Adiciona type="button" a botões sem type
 *
 * @param {string} html - HTML original
 * @returns {string} HTML modificado
 */
export function addButtonTypes(html) {
  console.log(`[HTMLFixer] addButtonTypes: Adicionando type='button' em botões sem type`);

  // Encontrar <button> sem atributo type
  const buttonRegex = /<button(?![^>]*\stype\s*=)[^>]*>/gi;

  return html.replace(buttonRegex, (match) => {
    // Adicionar type="button" antes do fechamento
    return match.replace(/>$/, ' type="button">');
  });
}

/**
 * Extrai texto do nome de arquivo para criar alt text descritivo
 *
 * @param {string} filename - Nome do arquivo (ex: "logo-empresa.png")
 * @returns {string} Alt text sugerido (ex: "logo empresa")
 */
export function generateAltFromFilename(filename) {
  if (!filename) return '';

  // Remover extensão
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Substituir separadores por espaços
  const readable = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();

  console.log(`[HTMLFixer] generateAltFromFilename: "${filename}" → "${readable}"`);
  return readable;
}

/**
 * Adiciona alt="" a imagens sem alt
 * Se o nome do arquivo for descritivo, usa-o como base
 *
 * @param {string} html - HTML original
 * @returns {string} HTML modificado
 */
export function addImageAlts(html) {
  console.log(`[HTMLFixer] addImageAlts: Adicionando alt em imagens sem alt`);

  // Encontrar <img> sem atributo alt
  const imgRegex = /<img(?![^>]*\salt\s*=)[^>]*>/gi;

  return html.replace(imgRegex, (match) => {
    // Tentar extrair src para gerar alt descritivo
    const srcMatch = match.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
    let altValue = '';

    if (srcMatch && srcMatch[1]) {
      const src = srcMatch[1];
      const filename = src.split('/').pop().split('?')[0];

      // Se filename parece descritivo (não é hash), usar como base
      if (filename && !/^[a-f0-9]{8,}/.test(filename)) {
        altValue = generateAltFromFilename(filename);
      }
    }

    // Adicionar alt (vazio ou com valor gerado)
    const fixed = match.replace(/>$/, ` alt="${altValue}">`);
    console.log(`[HTMLFixer] Alt adicionado: alt="${altValue}"`);
    return fixed;
  });
}

/**
 * Adiciona label associado a input via aria-label
 * (quando não é possível adicionar <label> sem quebrar estrutura)
 *
 * @param {string} html - HTML original
 * @returns {string} HTML modificado
 */
export function addAriaLabelsToInputs(html) {
  console.log(`[HTMLFixer] addAriaLabelsToInputs: Adicionando aria-label em inputs sem label`);

  // Encontrar inputs sem aria-label e sem id referenciado por label
  const inputRegex = /<input(?![^>]*\saria-label\s*=)[^>]*>/gi;

  return html.replace(inputRegex, (match) => {
    // Tentar extrair type, name ou placeholder para gerar label
    const typeMatch = match.match(/\stype\s*=\s*["']([^"']+)["']/i);
    const nameMatch = match.match(/\sname\s*=\s*["']([^"']+)["']/i);
    const placeholderMatch = match.match(/\splaceholder\s*=\s*["']([^"']+)["']/i);

    let labelValue = '';

    if (placeholderMatch && placeholderMatch[1]) {
      labelValue = placeholderMatch[1];
    } else if (nameMatch && nameMatch[1]) {
      labelValue = nameMatch[1].replace(/[-_]/g, ' ');
    } else if (typeMatch && typeMatch[1]) {
      labelValue = typeMatch[1].replace(/[-_]/g, ' ');
    }

    if (labelValue) {
      const fixed = match.replace(/>$/, ` aria-label="${labelValue}">`);
      console.log(`[HTMLFixer] aria-label adicionado: "${labelValue}"`);
      return fixed;
    }

    return match;
  });
}

/**
 * Adiciona aria-label a links sem texto
 *
 * @param {string} html - HTML original
 * @returns {string} HTML modificado
 */
export function addAriaLabelsToLinks(html) {
  console.log(`[HTMLFixer] addAriaLabelsToLinks: Adicionando aria-label em links sem texto`);

  // Encontrar <a> sem aria-label que parecem vazios ou só com imagem
  const linkRegex = /<a\s+(?![^>]*\saria-label\s*=)[^>]*>.*?<\/a>/gis;

  return html.replace(linkRegex, (match) => {
    // Verificar se link tem texto visível (não apenas whitespace ou imagens)
    const contentWithoutTags = match.replace(/<[^>]+>/g, '').trim();

    if (contentWithoutTags.length > 0) {
      // Link tem texto, não precisa de aria-label
      return match;
    }

    // Link sem texto, tentar extrair href para gerar label
    const hrefMatch = match.match(/\shref\s*=\s*["']([^"']+)["']/i);

    if (hrefMatch && hrefMatch[1]) {
      const href = hrefMatch[1];
      let labelValue = '';

      // Gerar label baseado no href
      if (href === '#') {
        labelValue = 'Link';
      } else if (href.startsWith('mailto:')) {
        labelValue = `Email ${href.replace('mailto:', '')}`;
      } else if (href.startsWith('tel:')) {
        labelValue = `Phone ${href.replace('tel:', '')}`;
      } else {
        const filename = href.split('/').pop().split('?')[0];
        labelValue = generateAltFromFilename(filename) || href;
      }

      // Adicionar aria-label na tag <a>
      const fixed = match.replace(/<a\s+/, `<a aria-label="${labelValue}" `);
      console.log(`[HTMLFixer] aria-label adicionado ao link: "${labelValue}"`);
      return fixed;
    }

    return match;
  });
}

/**
 * Adds rel="noopener noreferrer" to <a target="_blank"> links
 */
export function addNoopenerToBlankLinks(html) {
  console.log(`[HTMLFixer] addNoopenerToBlankLinks: Securing target="_blank" links`);

  // Find <a target="_blank"> without rel="noopener"
  const regex = /<a\s+(?=[^>]*target=["']_blank["'])(?![^>]*rel=["'][^"']*noopener[^"']*["'])[^>]*>/gi;

  return html.replace(regex, (match) => {
    // Check if rel attribute exists
    if (/\srel\s*=\s*["']/i.test(match)) {
      // Add noopener to existing rel
      return match.replace(/rel\s*=\s*["']([^"']*)["']/i, 'rel="$1 noopener noreferrer"');
    }
    // Add new rel attribute
    return match.replace(/>$/, ' rel="noopener noreferrer">');
  });
}

/**
 * Adds decoding="async" to images
 */
export function addDecodingAsync(html) {
  console.log(`[HTMLFixer] addDecodingAsync: Adding decoding="async" to images`);

  const imgRegex = /<img(?![^>]*\sdecoding\s*=)[^>]*>/gi;

  return html.replace(imgRegex, (match) => {
    return match.replace(/>$/, ' decoding="async">');
  });
}

/**
 * Adds defer to external scripts without async/defer
 */
export function addDeferToScripts(html) {
  console.log(`[HTMLFixer] addDeferToScripts: Adding defer to blocking scripts`);

  const scriptRegex = /<script\s+(?=[^>]*src\s*=)(?![^>]*\s(?:async|defer)\s*(?:=|>|\s))[^>]*>/gi;

  return html.replace(scriptRegex, (match) => {
    return match.replace(/>$/, ' defer>');
  });
}

/**
 * Replaces deprecated HTML tags with modern equivalents
 */
export function replaceDeprecatedTags(html) {
  console.log(`[HTMLFixer] replaceDeprecatedTags: Replacing deprecated tags`);

  let modified = html;

  // <center> → <div style="text-align: center">
  modified = modified.replace(/<center>/gi, '<div style="text-align: center">');
  modified = modified.replace(/<\/center>/gi, '</div>');

  // <font> → <span>
  modified = modified.replace(/<font[^>]*>/gi, '<span>');
  modified = modified.replace(/<\/font>/gi, '</span>');

  // <b> is not deprecated but <big> is
  modified = modified.replace(/<big>/gi, '<span style="font-size: larger">');
  modified = modified.replace(/<\/big>/gi, '</span>');

  // <strike> → <del>
  modified = modified.replace(/<strike>/gi, '<del>');
  modified = modified.replace(/<\/strike>/gi, '</del>');

  // <tt> → <code>
  modified = modified.replace(/<tt>/gi, '<code>');
  modified = modified.replace(/<\/tt>/gi, '</code>');

  return modified;
}

/**
 * Adds <link rel="preconnect"> for detected CDN domains
 */
export function addPreconnectForCDNs(html) {
  console.log(`[HTMLFixer] addPreconnectForCDNs: Adding preconnect for external domains`);

  // Detect external domains
  const domainRegex = /(?:src|href)\s*=\s*["'](https?:\/\/[^/"']+)/gi;
  const domains = new Set();
  let match;

  while ((match = domainRegex.exec(html)) !== null) {
    const domain = match[1];
    // Skip same-origin and localhost
    if (!domain.includes('localhost') && !domain.includes('127.0.0.1')) {
      domains.add(domain);
    }
  }

  if (domains.size === 0) return html;

  // Check which preconnects already exist
  const existingPreconnects = new Set();
  const preconnectRegex = /<link[^>]*rel=["']preconnect["'][^>]*href=["']([^"']+)["']/gi;
  while ((match = preconnectRegex.exec(html)) !== null) {
    existingPreconnects.add(match[1]);
  }

  // Add missing preconnects
  const newPreconnects = [];
  domains.forEach(domain => {
    if (!existingPreconnects.has(domain)) {
      newPreconnects.push(`<link rel="preconnect" href="${domain}" crossorigin>`);
    }
  });

  if (newPreconnects.length === 0) return html;

  // Add after <head> tag
  const headRegex = /<head[^>]*>/i;
  if (headRegex.test(html)) {
    return html.replace(headRegex, (m) => `${m}\n  ${newPreconnects.join('\n  ')}`);
  }

  return html;
}

/**
 * Adds fetchpriority="high" to first image (likely LCP)
 */
export function addFetchPriorityToHeroImage(html) {
  console.log(`[HTMLFixer] addFetchPriorityToHeroImage: Adding fetchpriority to first image`);

  let firstImgFound = false;
  return html.replace(/<img(?![^>]*\sfetchpriority\s*=)[^>]*>/gi, (match) => {
    if (!firstImgFound) {
      firstImgFound = true;
      return match.replace(/>$/, ' fetchpriority="high">');
    }
    return match;
  });
}
