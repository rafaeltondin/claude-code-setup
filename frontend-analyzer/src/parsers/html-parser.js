/**
 * Parser de HTML usando Parse5 e HTMLParser2
 *
 * Logs:
 * - Parse de arquivos HTML
 * - Extração de elementos, atributos e estrutura
 */

import { parse } from 'parse5';
import { parseDocument } from 'htmlparser2';

export class HTMLParser {
  constructor(content, filePath) {
    console.log(`[HTMLParser] INÍCIO - Parsing HTML: ${filePath}`);
    this.content = content;
    this.filePath = filePath;
    this.ast = null;
    this.htmlparser2AST = null;
    this.elements = [];
    this.classes = new Set();
    this.ids = new Set();
    this.errors = [];
  }

  parse() {
    console.log(`[HTMLParser] Iniciando parse do arquivo ${this.filePath}`);

    try {
      // Parse com Parse5
      console.log(`[HTMLParser] Usando Parse5 para parse...`);
      this.ast = parse(this.content, {
        sourceCodeLocationInfo: true
      });
      console.log(`[HTMLParser] Parse5 parse concluído com sucesso`);

      // Parse com HTMLParser2 para análise adicional
      try {
        console.log(`[HTMLParser] Usando HTMLParser2 para parse adicional...`);
        this.htmlparser2AST = parseDocument(this.content, {
          withStartIndices: true,
          withEndIndices: true
        });
        console.log(`[HTMLParser] HTMLParser2 parse concluído com sucesso`);
      } catch (error) {
        console.error(`[HTMLParser] Erro no HTMLParser2 (continuando apenas com Parse5):`, error.message);
      }

      // Extrair informações
      this.extractElements(this.ast);

      console.log(`[HTMLParser] FIM - Parse concluído`);
      console.log(`[HTMLParser] Estatísticas: ${this.elements.length} elementos, ${this.classes.size} classes, ${this.ids.size} IDs`);

      return {
        ast: this.ast,
        htmlparser2AST: this.htmlparser2AST,
        elements: this.elements,
        classes: Array.from(this.classes),
        ids: Array.from(this.ids),
        errors: this.errors
      };
    } catch (error) {
      console.error(`[HTMLParser] ERRO durante parse:`, error.message);
      console.error(`[HTMLParser] Stack:`, error.stack);
      this.errors.push(error);
      return null;
    }
  }

  extractElements(node, parent = null) {
    if (!node) return;

    if (node.nodeName && node.nodeName !== '#document' && node.nodeName !== '#text' && node.nodeName !== '#comment') {
      const element = {
        tagName: node.nodeName,
        attrs: this.getAttributes(node),
        line: node.sourceCodeLocation?.startLine || 0,
        col: node.sourceCodeLocation?.startCol || 0,
        parent: parent,
        children: []
      };

      // Extrair classes
      const classAttr = element.attrs.find(a => a.name === 'class');
      if (classAttr) {
        classAttr.value.split(/\s+/).forEach(cls => {
          if (cls) this.classes.add(cls);
        });
      }

      // Extrair IDs
      const idAttr = element.attrs.find(a => a.name === 'id');
      if (idAttr) {
        this.ids.add(idAttr.value);
      }

      this.elements.push(element);

      // Processar filhos
      if (node.childNodes) {
        node.childNodes.forEach(child => {
          this.extractElements(child, element);
        });
      }
    } else if (node.childNodes) {
      // Para nós que não são elementos, continuar processando filhos
      node.childNodes.forEach(child => {
        this.extractElements(child, parent);
      });
    }
  }

  getAttributes(node) {
    if (!node.attrs) return [];
    return node.attrs.map(attr => ({
      name: attr.name,
      value: attr.value
    }));
  }

  getAllClasses() {
    return Array.from(this.classes);
  }

  getAllIds() {
    return Array.from(this.ids);
  }

  getElementsByTagName(tagName) {
    console.log(`[HTMLParser] Buscando elementos com tag: ${tagName}`);
    const elements = this.elements.filter(el => el.tagName.toLowerCase() === tagName.toLowerCase());
    console.log(`[HTMLParser] Encontrados ${elements.length} elementos <${tagName}>`);
    return elements;
  }

  getElementsByAttribute(attrName, attrValue = null) {
    console.log(`[HTMLParser] Buscando elementos com atributo: ${attrName}${attrValue ? `="${attrValue}"` : ''}`);
    const elements = this.elements.filter(el => {
      const attr = el.attrs.find(a => a.name === attrName);
      if (!attr) return false;
      if (attrValue === null) return true;
      return attr.value === attrValue;
    });
    console.log(`[HTMLParser] Encontrados ${elements.length} elementos`);
    return elements;
  }

  getImagesWithoutAlt() {
    console.log(`[HTMLParser] Buscando imagens sem atributo alt...`);
    const images = this.getElementsByTagName('img');
    const withoutAlt = images.filter(img => {
      const altAttr = img.attrs.find(a => a.name === 'alt');
      return !altAttr || altAttr.value.trim() === '';
    });
    console.log(`[HTMLParser] Encontradas ${withoutAlt.length} imagens sem alt`);
    return withoutAlt;
  }

  getInputsWithoutLabels() {
    console.log(`[HTMLParser] Buscando inputs sem labels associados...`);
    const inputs = this.getElementsByTagName('input');
    const labels = this.getElementsByTagName('label');

    const withoutLabels = inputs.filter(input => {
      const inputId = input.attrs.find(a => a.name === 'id')?.value;
      if (!inputId) return true; // Sem ID, difícil associar label

      // Verificar se existe label com for="inputId"
      const hasLabel = labels.some(label => {
        const forAttr = label.attrs.find(a => a.name === 'for');
        return forAttr && forAttr.value === inputId;
      });

      return !hasLabel;
    });

    console.log(`[HTMLParser] Encontrados ${withoutLabels.length} inputs sem labels`);
    return withoutLabels;
  }

  getHeadingStructure() {
    console.log(`[HTMLParser] Analisando estrutura de headings...`);
    const headings = [];

    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const elements = this.getElementsByTagName(tag);
      elements.forEach(el => {
        headings.push({
          level: parseInt(tag.substring(1)),
          tag: tag,
          line: el.line,
          element: el
        });
      });
    });

    // Ordenar por linha
    headings.sort((a, b) => a.line - b.line);

    console.log(`[HTMLParser] Estrutura de headings: ${headings.map(h => h.tag).join(', ')}`);
    return headings;
  }
}

export function parseHTML(content, filePath) {
  const parser = new HTMLParser(content, filePath);
  return parser.parse();
}
