/**
 * Web Fetcher - Download de HTML de URLs
 *
 * Permite analisar sites remotos diretamente
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Baixa HTML de uma URL usando fetch (Node.js 18+)
 */
export async function fetchHTML(url) {
  console.log(`[WebFetcher] INÍCIO - Baixando HTML de: ${url}`);

  try {
    // Validar URL
    const urlObj = new URL(url);
    console.log(`[WebFetcher] URL válida: ${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);

    // Fazer fetch
    console.log(`[WebFetcher] Fazendo requisição HTTP...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`[WebFetcher] Resposta recebida: ${response.status} ${response.statusText}`);
    console.log(`[WebFetcher] Content-Type: ${response.headers.get('content-type')}`);

    const html = await response.text();
    console.log(`[WebFetcher] HTML baixado: ${html.length} caracteres`);

    console.log(`[WebFetcher] FIM - Download concluído`);

    return {
      url: url,
      html: html,
      size: html.length,
      contentType: response.headers.get('content-type'),
      status: response.status
    };

  } catch (error) {
    console.error(`[WebFetcher] ERRO ao baixar HTML:`, error.message);
    throw error;
  }
}

/**
 * Baixa HTML e salva em arquivo temporário para análise
 */
export async function fetchAndSave(url, outputDir = null) {
  console.log(`[WebFetcher] INÍCIO - Fetch and Save: ${url}`);

  try {
    // Baixar HTML
    const result = await fetchHTML(url);

    // Definir diretório de saída
    if (!outputDir) {
      const tempDir = path.join(__dirname, '../../temp');
      outputDir = path.join(tempDir, 'web-fetch');
    }

    // Criar diretório se não existir
    if (!existsSync(outputDir)) {
      console.log(`[WebFetcher] Criando diretório: ${outputDir}`);
      mkdirSync(outputDir, { recursive: true });
    }

    // Salvar HTML
    const filename = new URL(url).hostname.replace(/\./g, '-') + '.html';
    const filepath = path.join(outputDir, filename);

    console.log(`[WebFetcher] Salvando HTML em: ${filepath}`);
    writeFileSync(filepath, result.html, 'utf-8');
    console.log(`[WebFetcher] Arquivo salvo com sucesso`);

    console.log(`[WebFetcher] FIM - Fetch and Save concluído`);

    return {
      ...result,
      savedPath: filepath,
      savedDir: outputDir,
      filename: filename
    };

  } catch (error) {
    console.error(`[WebFetcher] ERRO em Fetch and Save:`, error.message);
    throw error;
  }
}

/**
 * Valida se uma string é uma URL válida
 */
export function isURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
