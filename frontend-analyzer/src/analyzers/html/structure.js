/**
 * Analisador de Estrutura e Sintaxe HTML
 */

import { Issue, SEVERITY, CATEGORY } from '../../utils/severity.js';

export function analyzeStructure(htmlFiles) {
  console.log(`[StructureAnalyzer] INÍCIO`);
  const issues = [];
  const globalIds = new Map();

  htmlFiles.forEach(file => {
    const parsed = file.parsed;
    if (!parsed) return;

    // Detectar IDs duplicados no arquivo
    const fileIds = new Map();
    parsed.elements.forEach(el => {
      const idAttr = el.attrs.find(a => a.name === 'id');
      if (idAttr) {
        const id = idAttr.value;
        if (fileIds.has(id)) {
          issues.push(new Issue({
            severity: SEVERITY.CRITICAL,
            category: CATEGORY.HTML,
            subcategory: 'structure',
            title: 'ID duplicado',
            description: `ID "${id}" usado múltiplas vezes no mesmo arquivo.`,
            file: file.path,
            line: el.line,
            column: el.col,
            code: `<${el.tagName} id="${id}">`,
            evidence: `ID "${id}" duplicado`,
            suggestion: 'IDs devem ser únicos. Use classes para estilização repetida.',
            impact: 'CRÍTICO: Quebra JavaScript (document.getElementById), CSS e acessibilidade.'
          }));
        }
        fileIds.set(id, el);
        globalIds.set(id, file.path);
      }
    });

    // Verificar charset
    const metaCharset = parsed.elements.find(el =>
      el.tagName === 'meta' &&
      el.attrs.some(a => a.name === 'charset')
    );
    if (!metaCharset) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'Charset não definido',
        description: 'Tag <meta charset> ausente.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem <meta charset="UTF-8">',
        suggestion: 'Adicione <meta charset="UTF-8"> no <head>.',
        impact: 'Caracteres especiais podem não ser exibidos corretamente.'
      }));
    }

    // Verificar viewport
    const metaViewport = parsed.elements.find(el =>
      el.tagName === 'meta' &&
      el.attrs.some(a => a.name === 'name' && a.value === 'viewport')
    );
    if (!metaViewport) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'Viewport não definido',
        description: 'Tag <meta name="viewport"> ausente.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem meta viewport',
        suggestion: 'Adicione <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        impact: 'Site não será responsivo em dispositivos móveis.'
      }));
    }

    // Verificar title
    const title = parsed.elements.find(el => el.tagName === 'title');
    if (!title) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'Título ausente',
        description: 'Tag <title> não encontrada.',
        file: file.path,
        line: 1,
        column: 0,
        code: '<head>',
        evidence: 'Sem <title>',
        suggestion: 'Adicione <title> descritivo no <head>.',
        impact: 'Péssimo para SEO e experiência do usuário.'
      }));
    }

    // Verificar DOCTYPE
    console.log('[StructureAnalyzer] Verificando DOCTYPE');
    if (!/^\s*<!DOCTYPE/i.test(file.content)) {
      issues.push(new Issue({
        severity: SEVERITY.HIGH,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'DOCTYPE ausente',
        description: 'Arquivo não começa com <!DOCTYPE html>.',
        file: file.path,
        line: 1,
        column: 0,
        code: file.content.substring(0, 50) + '...',
        evidence: 'Sem DOCTYPE',
        suggestion: 'Adicione <!DOCTYPE html> como primeira linha do arquivo.',
        impact: 'Navegadores podem renderizar em modo quirks, causando comportamento inconsistente.'
      }));
    }

    // Verificar tag HTML
    console.log('[StructureAnalyzer] Verificando tag <html>');
    const htmlElements = parsed.elements.filter(el => el.tagName === 'html');
    if (htmlElements.length === 0) {
      issues.push(new Issue({
        severity: SEVERITY.MEDIUM,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'Tag <html> ausente',
        description: 'Elemento <html> não encontrado.',
        file: file.path,
        line: 1,
        column: 0,
        code: file.content.substring(0, 100) + '...',
        evidence: 'Sem <html>',
        suggestion: 'Estrutura básica deve ter <html>, <head> e <body>.',
        impact: 'Estrutura de documento inválida.'
      }));
    }

    // Tags deprecadas
    console.log('[StructureAnalyzer] Verificando tags deprecadas');
    const deprecatedTags = ['center', 'font', 'marquee', 'blink', 'big', 'strike', 'tt', 'frame', 'frameset', 'noframes', 'acronym', 'applet', 'basefont', 'dir', 'isindex'];
    parsed.elements.forEach(el => {
      if (deprecatedTags.includes(el.tagName)) {
        issues.push(new Issue({
          severity: SEVERITY.MEDIUM,
          category: CATEGORY.HTML,
          subcategory: 'deprecated',
          title: `Tag <${el.tagName}> deprecada`,
          description: `Uso de tag HTML deprecada: <${el.tagName}>.`,
          file: file.path,
          line: el.line,
          column: el.col,
          code: `<${el.tagName}>`,
          evidence: `Tag <${el.tagName}> não é mais suportada`,
          suggestion: el.tagName === 'center' ? 'Use CSS text-align: center'
            : el.tagName === 'font' ? 'Use CSS para estilização de texto'
            : el.tagName === 'marquee' ? 'Use CSS animations'
            : el.tagName === 'strike' ? 'Use <del> ou CSS text-decoration'
            : 'Remova ou substitua por tag HTML5 equivalente.',
          impact: 'Tags deprecadas podem não funcionar em navegadores modernos.'
        }));
      }
    });

    // Atributos deprecados
    console.log('[StructureAnalyzer] Verificando atributos deprecados');
    const deprecatedAttrs = ['align', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'valign'];
    parsed.elements.forEach(el => {
      el.attrs.forEach(attr => {
        // Border é válido em tables, img (para acessibilidade)
        if (attr.name === 'border' && ['table', 'img'].includes(el.tagName)) {
          return;
        }

        if (deprecatedAttrs.includes(attr.name)) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.HTML,
            subcategory: 'deprecated',
            title: `Atributo ${attr.name} deprecado`,
            description: `Atributo HTML deprecado: ${attr.name}="${attr.value}".`,
            file: file.path,
            line: el.line,
            column: el.col,
            code: `<${el.tagName} ${attr.name}="${attr.value}">`,
            evidence: `${attr.name}="${attr.value}"`,
            suggestion: attr.name === 'align' ? 'Use CSS text-align ou flexbox'
              : attr.name === 'bgcolor' ? 'Use CSS background-color'
              : attr.name === 'border' ? 'Use CSS border'
              : (attr.name === 'cellpadding' || attr.name === 'cellspacing') ? 'Use CSS padding e border-collapse'
              : attr.name === 'valign' ? 'Use CSS vertical-align'
              : 'Substitua por propriedade CSS equivalente.',
            impact: 'Atributos deprecados devem ser substituídos por CSS moderno.'
          }));
        }
      });
    });

    // Event handlers inline
    console.log('[StructureAnalyzer] Verificando event handlers inline');
    const inlineEvents = ['onclick', 'onload', 'onchange', 'onsubmit', 'onmouseover', 'onfocus', 'onblur', 'onerror', 'onkeydown', 'onkeyup'];
    parsed.elements.forEach(el => {
      el.attrs.forEach(attr => {
        if (inlineEvents.includes(attr.name)) {
          issues.push(new Issue({
            severity: SEVERITY.MEDIUM,
            category: CATEGORY.HTML,
            subcategory: 'best-practices',
            title: `Event handler inline: ${attr.name}`,
            description: `Uso de ${attr.name} inline no HTML.`,
            file: file.path,
            line: el.line,
            column: el.col,
            code: `<${el.tagName} ${attr.name}="${attr.value}">`,
            evidence: `${attr.name}="${attr.value}"`,
            suggestion: 'Use addEventListener() em arquivo JavaScript separado para melhor manutenção e CSP.',
            impact: 'Viola Content Security Policy (CSP), dificulta manutenção, mistura HTML com JavaScript.'
          }));
        }
      });
    });

    // Atributo style inline
    console.log('[StructureAnalyzer] Verificando atributo style inline');
    parsed.elements.forEach(el => {
      const styleAttr = el.attrs.find(a => a.name === 'style');
      if (styleAttr) {
        issues.push(new Issue({
          severity: SEVERITY.LOW,
          category: CATEGORY.HTML,
          subcategory: 'best-practices',
          title: 'Style inline',
          description: `Elemento com atributo style="${styleAttr.value}".`,
          file: file.path,
          line: el.line,
          column: el.col,
          code: `<${el.tagName} style="${styleAttr.value}">`,
          evidence: 'Style inline',
          suggestion: 'Mova estilos para arquivo CSS externo ou use classes CSS.',
          impact: 'Dificulta manutenção, reutilização e consistência visual.'
        }));
      }
    });

    // Links aninhados
    console.log('[StructureAnalyzer] Verificando links aninhados');
    const nestedLinksRegex = /<a(?:\s[^>]*)?>(?:(?!<\/a>).|\n)*<a(?:\s|>)/gi;
    const nestedLinkMatches = [...file.content.matchAll(nestedLinksRegex)];
    nestedLinkMatches.forEach(match => {
      const position = match.index;
      const textBefore = file.content.substring(0, position);
      const line = (textBefore.match(/\n/g) || []).length + 1;

      issues.push(new Issue({
        severity: SEVERITY.CRITICAL,
        category: CATEGORY.HTML,
        subcategory: 'structure',
        title: 'Link dentro de link',
        description: 'Elemento <a> aninhado dentro de outro <a>.',
        file: file.path,
        line: line,
        column: 0,
        code: match[0].substring(0, 100) + '...',
        evidence: '<a> dentro de <a>',
        suggestion: 'Remova aninhamento. Links não podem conter outros links.',
        impact: 'CRÍTICO: HTML inválido, comportamento imprevisível, quebra navegação.'
      }));
    });

    // Elementos interativos aninhados
    console.log('[StructureAnalyzer] Verificando elementos interativos aninhados');
    parsed.elements.forEach(el => {
      if (el.tagName === 'button') {
        // Verificar se tem <a> como ancestral
        let current = el.parent;
        while (current) {
          if (current.tagName === 'a') {
            issues.push(new Issue({
              severity: SEVERITY.CRITICAL,
              category: CATEGORY.HTML,
              subcategory: 'structure',
              title: 'Button dentro de link',
              description: 'Elemento <button> dentro de <a>.',
              file: file.path,
              line: el.line,
              column: el.col,
              code: `<a><button>`,
              evidence: '<button> dentro de <a>',
              suggestion: 'Remova aninhamento. Use apenas <a> ou <button>, não ambos.',
              impact: 'CRÍTICO: HTML inválido, conflito de comportamento interativo.'
            }));
            break;
          }
          current = current.parent;
        }
      }

      if (el.tagName === 'a') {
        // Verificar se tem <button> como ancestral
        let current = el.parent;
        while (current) {
          if (current.tagName === 'button') {
            issues.push(new Issue({
              severity: SEVERITY.CRITICAL,
              category: CATEGORY.HTML,
              subcategory: 'structure',
              title: 'Link dentro de button',
              description: 'Elemento <a> dentro de <button>.',
              file: file.path,
              line: el.line,
              column: el.col,
              code: `<button><a>`,
              evidence: '<a> dentro de <button>',
              suggestion: 'Remova aninhamento. Use apenas <button> ou <a>, não ambos.',
              impact: 'CRÍTICO: HTML inválido, conflito de comportamento interativo.'
            }));
            break;
          }
          current = current.parent;
        }
      }
    });
  });

  console.log(`[StructureAnalyzer] FIM - Total: ${issues.length}`);
  return issues;
}
