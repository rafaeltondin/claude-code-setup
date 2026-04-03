/**
 * Scanner de Arquivos do Projeto
 *
 * Logs:
 * - Busca de arquivos CSS e HTML
 * - Leitura de conteúdo
 * - Extração de CSS inline
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Extrai CSS inline de tags <style>
 */
function extractInlineStyles(htmlContent, htmlFilePath) {
  console.log(`[FileScanner] Extraindo CSS inline de <style> tags...`);
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const inlineStyles = [];
  let match;
  let count = 0;

  while ((match = styleRegex.exec(htmlContent)) !== null) {
    const css = match[1].trim();
    if (css.length > 0) {
      // Calcular linha aproximada
      const beforeMatch = htmlContent.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      inlineStyles.push({
        css: css,
        startLine: lineNumber,
        source: htmlFilePath,
        type: 'style-tag'
      });
      count++;
    }
  }

  console.log(`[FileScanner] Encontradas ${count} tags <style> com CSS inline`);
  return inlineStyles;
}

/**
 * Extrai atributos style="" inline
 */
function extractStyleAttributes(htmlContent, htmlFilePath) {
  console.log(`[FileScanner] Extraindo atributos style="" inline...`);
  const styleAttrRegex = /style\s*=\s*["']([^"']+)["']/gi;
  const styleAttributes = [];
  let match;
  let count = 0;

  while ((match = styleAttrRegex.exec(htmlContent)) !== null) {
    const css = match[1].trim();
    if (css.length > 0) {
      // Calcular linha aproximada
      const beforeMatch = htmlContent.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      styleAttributes.push({
        css: css,
        line: lineNumber,
        source: htmlFilePath,
        type: 'style-attribute'
      });
      count++;
    }
  }

  console.log(`[FileScanner] Encontrados ${count} atributos style="" inline`);
  return styleAttributes;
}

export async function scanProject(projectPath) {
  console.log(`[FileScanner] INÍCIO - Scanning projeto: ${projectPath}`);

  try {
    // Buscar arquivos CSS
    console.log(`[FileScanner] Buscando arquivos CSS...`);
    const cssFiles = await glob('**/*.css', {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    });
    console.log(`[FileScanner] Encontrados ${cssFiles.length} arquivos CSS externos`);

    // Buscar arquivos HTML
    console.log(`[FileScanner] Buscando arquivos HTML...`);
    const htmlFiles = await glob('**/*.html', {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    });
    console.log(`[FileScanner] Encontrados ${htmlFiles.length} arquivos HTML`);

    const files = {
      css: [],
      html: [],
      inlineStyles: [], // CSS de tags <style>
      styleAttributes: [] // CSS de atributos style=""
    };

    // Ler conteúdo dos arquivos CSS
    console.log(`[FileScanner] Lendo conteúdo dos arquivos CSS...`);
    for (const file of cssFiles) {
      const fullPath = path.join(projectPath, file);
      try {
        const content = readFileSync(fullPath, 'utf-8');
        files.css.push({
          path: file,
          fullPath: fullPath,
          content: content,
          lines: content.split('\n').length,
          type: 'external'
        });
        console.log(`[FileScanner]   ✓ ${file} (${content.split('\n').length} linhas)`);
      } catch (error) {
        console.error(`[FileScanner]   ✗ Erro ao ler ${file}:`, error.message);
      }
    }

    // Ler conteúdo dos arquivos HTML + extrair CSS inline
    console.log(`[FileScanner] Lendo conteúdo dos arquivos HTML...`);
    for (const file of htmlFiles) {
      const fullPath = path.join(projectPath, file);
      try {
        const content = readFileSync(fullPath, 'utf-8');
        files.html.push({
          path: file,
          fullPath: fullPath,
          content: content,
          lines: content.split('\n').length
        });
        console.log(`[FileScanner]   ✓ ${file} (${content.split('\n').length} linhas)`);

        // Extrair CSS inline deste arquivo HTML
        const inlineStyles = extractInlineStyles(content, file);
        const styleAttrs = extractStyleAttributes(content, file);

        files.inlineStyles.push(...inlineStyles);
        files.styleAttributes.push(...styleAttrs);

        // Criar "arquivo CSS virtual" para cada bloco <style> inline
        inlineStyles.forEach((styleBlock, index) => {
          files.css.push({
            path: `${file}:<style>#${index + 1}`,
            fullPath: fullPath,
            content: styleBlock.css,
            lines: styleBlock.css.split('\n').length,
            type: 'inline',
            sourceFile: file,
            startLine: styleBlock.startLine
          });
        });

      } catch (error) {
        console.error(`[FileScanner]   ✗ Erro ao ler ${file}:`, error.message);
      }
    }

    console.log(`[FileScanner] FIM - Scan concluído`);
    console.log(`[FileScanner] Total: ${files.css.length} CSS (${cssFiles.length} externos + ${files.inlineStyles.length} inline), ${files.html.length} HTML`);
    console.log(`[FileScanner] CSS Inline: ${files.inlineStyles.length} <style> tags, ${files.styleAttributes.length} style="" attributes`);

    return files;
  } catch (error) {
    console.error(`[FileScanner] ERRO ao fazer scan:`, error.message);
    console.error(`[FileScanner] Stack:`, error.stack);
    throw error;
  }
}

export function getFileLineContent(content, lineNumber) {
  const lines = content.split('\n');
  if (lineNumber < 1 || lineNumber > lines.length) {
    return '';
  }
  return lines[lineNumber - 1];
}
