/**
 * Parser de CSS usando PostCSS e CSS-Tree
 *
 * Logs:
 * - Parse de arquivos CSS
 * - Extração de seletores, propriedades e valores
 */

import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { parse as cssTreeParse } from 'css-tree';

export class CSSParser {
  constructor(content, filePath) {
    console.log(`[CSSParser] INÍCIO - Parsing CSS: ${filePath}`);
    this.content = content;
    this.filePath = filePath;
    this.ast = null;
    this.cssTreeAST = null;
    this.selectors = [];
    this.rules = [];
    this.atRules = [];
    this.errors = [];
  }

  parse() {
    console.log(`[CSSParser] Iniciando parse do arquivo ${this.filePath}`);

    try {
      // Parse com PostCSS
      console.log(`[CSSParser] Usando PostCSS para parse...`);
      this.ast = postcss.parse(this.content, { from: this.filePath });
      console.log(`[CSSParser] PostCSS parse concluído com sucesso`);

      // Parse com CSS-Tree para análise adicional
      try {
        console.log(`[CSSParser] Usando CSS-Tree para parse adicional...`);
        this.cssTreeAST = cssTreeParse(this.content, {
          parseValue: true,
          parseCustomProperty: true
        });
        console.log(`[CSSParser] CSS-Tree parse concluído com sucesso`);
      } catch (error) {
        console.error(`[CSSParser] Erro no CSS-Tree parse (continuando apenas com PostCSS):`, error.message);
      }

      // Extrair informações
      this.extractSelectors();
      this.extractRules();
      this.extractAtRules();

      console.log(`[CSSParser] FIM - Parse concluído`);
      console.log(`[CSSParser] Estatísticas: ${this.selectors.length} seletores, ${this.rules.length} regras, ${this.atRules.length} at-rules`);

      return {
        ast: this.ast,
        cssTreeAST: this.cssTreeAST,
        selectors: this.selectors,
        rules: this.rules,
        atRules: this.atRules,
        errors: this.errors
      };
    } catch (error) {
      console.error(`[CSSParser] ERRO durante parse:`, error.message);
      console.error(`[CSSParser] Stack:`, error.stack);
      this.errors.push(error);
      return null;
    }
  }

  extractSelectors() {
    console.log(`[CSSParser] Extraindo seletores...`);
    let count = 0;

    this.ast.walkRules(rule => {
      const selector = rule.selector;
      const line = rule.source?.start?.line || 0;

      try {
        selectorParser(selectors => {
          selectors.each(sel => {
            this.selectors.push({
              selector: sel.toString(),
              full: selector,
              line: line,
              rule: rule
            });
            count++;
          });
        }).processSync(selector);
      } catch (error) {
        console.error(`[CSSParser] Erro ao processar seletor "${selector}":`, error.message);
      }
    });

    console.log(`[CSSParser] Extraídos ${count} seletores`);
  }

  extractRules() {
    console.log(`[CSSParser] Extraindo regras CSS...`);
    let count = 0;

    this.ast.walkRules(rule => {
      const ruleData = {
        selector: rule.selector,
        line: rule.source?.start?.line || 0,
        declarations: []
      };

      rule.walkDecls(decl => {
        ruleData.declarations.push({
          property: decl.prop,
          value: decl.value,
          important: decl.important,
          line: decl.source?.start?.line || 0
        });
      });

      this.rules.push(ruleData);
      count++;
    });

    console.log(`[CSSParser] Extraídas ${count} regras`);
  }

  extractAtRules() {
    console.log(`[CSSParser] Extraindo at-rules (@media, @keyframes, etc.)...`);
    let count = 0;

    this.ast.walkAtRules(atRule => {
      this.atRules.push({
        name: atRule.name,
        params: atRule.params,
        line: atRule.source?.start?.line || 0,
        type: atRule.name
      });
      count++;
    });

    console.log(`[CSSParser] Extraídas ${count} at-rules`);
  }

  getAllClasses() {
    console.log(`[CSSParser] Extraindo todas as classes CSS...`);
    const classes = new Set();

    this.selectors.forEach(sel => {
      const matches = sel.full.match(/\.([a-zA-Z0-9_-]+)/g);
      if (matches) {
        matches.forEach(match => {
          classes.add(match.substring(1)); // Remove o ponto
        });
      }
    });

    console.log(`[CSSParser] Encontradas ${classes.size} classes únicas`);
    return Array.from(classes);
  }

  getAllIds() {
    console.log(`[CSSParser] Extraindo todos os IDs CSS...`);
    const ids = new Set();

    this.selectors.forEach(sel => {
      const matches = sel.full.match(/#([a-zA-Z0-9_-]+)/g);
      if (matches) {
        matches.forEach(match => {
          ids.add(match.substring(1)); // Remove o #
        });
      }
    });

    console.log(`[CSSParser] Encontrados ${ids.size} IDs únicos`);
    return Array.from(ids);
  }
}

export function parseCSS(content, filePath) {
  const parser = new CSSParser(content, filePath);
  return parser.parse();
}
