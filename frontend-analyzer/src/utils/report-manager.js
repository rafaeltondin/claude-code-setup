/**
 * Report Manager - Gerenciamento robusto de relatórios
 *
 * Funcionalidades:
 * - Pasta fixa e organizada para relatórios
 * - Validação de salvamento
 * - Tratamento de erros robusto
 * - Feedback detalhado
 * - Compatibilidade com URLs e paths locais
 * - Organização por data/projeto
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuração do Report Manager
 */
const CONFIG = {
  // Pasta raiz de relatórios (fixa)
  reportsDir: path.join(__dirname, '..', '..', 'reports'),

  // Estrutura de subpastas
  structure: {
    organized: true,        // Organizar por data
    byProject: true,        // Organizar por projeto
    keepOriginal: true      // Manter HTML original baixado
  },

  // Validação
  validation: {
    checkFileSize: true,    // Verificar se arquivo foi salvo com conteúdo
    minSize: 100,           // Tamanho mínimo em bytes
    retryOnFail: true,      // Tentar novamente em caso de falha
    maxRetries: 3           // Máximo de tentativas
  }
};

/**
 * Gera timestamp formatado para nomes de arquivo
 * @returns {string} Timestamp no formato YYYYMMDD_HHMMSS
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Sanitiza nome de projeto para uso em path de arquivo
 * @param {string} projectName Nome do projeto
 * @returns {string} Nome sanitizado
 */
function sanitizeProjectName(projectName) {
  // Remove caracteres inválidos para nome de arquivo/pasta
  return projectName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Cria estrutura de diretórios para relatórios
 * @param {string} projectName Nome do projeto
 * @returns {Object} Paths criados
 */
function createReportStructure(projectName) {
  console.log(`[ReportManager] Criando estrutura de diretórios...`);

  // Criar pasta raiz de reports se não existir
  if (!existsSync(CONFIG.reportsDir)) {
    mkdirSync(CONFIG.reportsDir, { recursive: true });
    console.log(`[ReportManager] ✅ Criada pasta raiz: ${CONFIG.reportsDir}`);
  }

  // Gerar timestamp e sanitizar nome do projeto
  const timestamp = getTimestamp();
  const sanitizedProject = sanitizeProjectName(projectName);

  // Estrutura organizada: reports/YYYYMMDD/project-name_HHMMSS/
  const dateFolder = timestamp.substring(0, 8); // YYYYMMDD
  const sessionFolder = `${sanitizedProject}_${timestamp.substring(9)}`; // project_HHMMSS

  const reportPath = path.join(CONFIG.reportsDir, dateFolder, sessionFolder);

  // Criar toda a estrutura
  if (!existsSync(reportPath)) {
    mkdirSync(reportPath, { recursive: true });
    console.log(`[ReportManager] ✅ Criada pasta do relatório: ${reportPath}`);
  }

  return {
    root: CONFIG.reportsDir,
    date: path.join(CONFIG.reportsDir, dateFolder),
    session: reportPath,
    timestamp,
    projectName: sanitizedProject
  };
}

/**
 * Valida que arquivo foi salvo corretamente
 * @param {string} filePath Caminho do arquivo
 * @param {number} expectedMinSize Tamanho mínimo esperado
 * @returns {Object} Resultado da validação
 */
function validateFileSave(filePath, expectedMinSize = CONFIG.validation.minSize) {
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: 'Arquivo não foi criado',
        path: filePath
      };
    }

    const stats = statSync(filePath);

    if (stats.size < expectedMinSize) {
      return {
        success: false,
        error: `Arquivo muito pequeno (${stats.size} bytes, esperado min ${expectedMinSize})`,
        path: filePath,
        size: stats.size
      };
    }

    return {
      success: true,
      path: filePath,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size)
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath
    };
  }
}

/**
 * Formata tamanho de arquivo em formato legível
 * @param {number} bytes Tamanho em bytes
 * @returns {string} Tamanho formatado
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Salva relatório com validação e retry
 * @param {string} content Conteúdo do relatório
 * @param {string} filePath Caminho completo do arquivo
 * @param {string} format Formato do arquivo (txt, json, html)
 * @returns {Object} Resultado do salvamento
 */
function saveReportWithValidation(content, filePath, format) {
  console.log(`[ReportManager] Salvando relatório ${format.toUpperCase()}...`);

  let attempts = 0;
  const maxAttempts = CONFIG.validation.retryOnFail ? CONFIG.validation.maxRetries : 1;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      // Salvar arquivo
      writeFileSync(filePath, content, 'utf-8');

      // Validar salvamento
      const validation = validateFileSave(filePath);

      if (validation.success) {
        console.log(`[ReportManager] ✅ Relatório ${format.toUpperCase()} salvo com sucesso!`);
        console.log(`[ReportManager]    Path: ${validation.path}`);
        console.log(`[ReportManager]    Tamanho: ${validation.sizeFormatted}`);

        return {
          success: true,
          format,
          path: validation.path,
          size: validation.size,
          sizeFormatted: validation.sizeFormatted,
          attempts
        };
      } else {
        console.warn(`[ReportManager] ⚠️ Tentativa ${attempts} falhou: ${validation.error}`);

        if (attempts >= maxAttempts) {
          return {
            success: false,
            format,
            error: validation.error,
            path: filePath,
            attempts
          };
        }

        // Aguardar antes de tentar novamente
        const delay = attempts * 100;
        console.log(`[ReportManager] ⏳ Aguardando ${delay}ms antes de tentar novamente...`);
        // Sync delay (não ideal, mas funcional para retry)
        const start = Date.now();
        while (Date.now() - start < delay) {}
      }

    } catch (error) {
      console.error(`[ReportManager] ❌ Erro ao salvar (tentativa ${attempts}): ${error.message}`);

      if (attempts >= maxAttempts) {
        return {
          success: false,
          format,
          error: error.message,
          path: filePath,
          attempts
        };
      }
    }
  }

  return {
    success: false,
    format,
    error: 'Máximo de tentativas atingido',
    path: filePath,
    attempts
  };
}

/**
 * Salva todos os relatórios de forma organizada e validada
 * @param {Object} options Opções de salvamento
 * @returns {Object} Resultado do salvamento
 */
export function saveReports(options) {
  const {
    projectName,
    reports,           // { txt: string, json: string, html: string }
    originalHTML = null,  // HTML original (se baixado de URL)
    originalURL = null    // URL original
  } = options;

  console.log(`\n[ReportManager] ═══════════════════════════════════════`);
  console.log(`[ReportManager] SALVANDO RELATÓRIOS - ${projectName}`);
  console.log(`[ReportManager] ═══════════════════════════════════════\n`);

  try {
    // Criar estrutura de diretórios
    const structure = createReportStructure(projectName);

    const results = {
      success: true,
      projectName,
      timestamp: structure.timestamp,
      basePath: structure.session,
      saved: [],
      failed: [],
      summary: {}
    };

    // Salvar relatórios solicitados
    if (reports.txt) {
      const txtPath = path.join(structure.session, 'report.txt');
      const result = saveReportWithValidation(reports.txt, txtPath, 'txt');

      if (result.success) {
        results.saved.push(result);
      } else {
        results.failed.push(result);
        results.success = false;
      }
    }

    if (reports.json) {
      const jsonPath = path.join(structure.session, 'report.json');
      const result = saveReportWithValidation(reports.json, jsonPath, 'json');

      if (result.success) {
        results.saved.push(result);
      } else {
        results.failed.push(result);
        results.success = false;
      }
    }

    if (reports.html) {
      const htmlPath = path.join(structure.session, 'report.html');
      const result = saveReportWithValidation(reports.html, htmlPath, 'html');

      if (result.success) {
        results.saved.push(result);
      } else {
        results.failed.push(result);
        results.success = false;
      }
    }

    // Relatório para agentes (sempre gerar)
    if (reports.agent) {
      const agentPath = path.join(structure.session, 'agent-action-plan.json');
      const result = saveReportWithValidation(reports.agent, agentPath, 'agent-action-plan');

      if (result.success) {
        results.saved.push(result);
      } else {
        results.failed.push(result);
        results.success = false;
      }
    }

    // Salvar HTML original (se disponível)
    if (originalHTML) {
      const originalPath = path.join(structure.session, 'original.html');
      const result = saveReportWithValidation(originalHTML, originalPath, 'original-html');

      if (result.success) {
        results.saved.push(result);
      }
    }

    // Salvar metadados da análise
    const metadata = {
      projectName,
      timestamp: structure.timestamp,
      date: new Date().toISOString(),
      originalURL: originalURL || null,
      reports: results.saved.map(r => ({
        format: r.format,
        path: r.path,
        size: r.sizeFormatted
      }))
    };

    const metadataPath = path.join(structure.session, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Gerar sumário
    results.summary = {
      totalSaved: results.saved.length,
      totalFailed: results.failed.length,
      totalSize: results.saved.reduce((sum, r) => sum + r.size, 0),
      totalSizeFormatted: formatFileSize(results.saved.reduce((sum, r) => sum + r.size, 0))
    };

    // Log final
    console.log(`\n[ReportManager] ═══════════════════════════════════════`);
    console.log(`[ReportManager] RESUMO DO SALVAMENTO`);
    console.log(`[ReportManager] ═══════════════════════════════════════`);
    console.log(`[ReportManager] ✅ Salvos com sucesso: ${results.summary.totalSaved}`);
    console.log(`[ReportManager] ❌ Falhas: ${results.summary.totalFailed}`);
    console.log(`[ReportManager] 📦 Tamanho total: ${results.summary.totalSizeFormatted}`);
    console.log(`[ReportManager] 📂 Pasta: ${structure.session}`);
    console.log(`[ReportManager] ═══════════════════════════════════════\n`);

    if (results.failed.length > 0) {
      console.warn(`[ReportManager] ⚠️ ATENÇÃO: Alguns relatórios falharam:`);
      results.failed.forEach(f => {
        console.warn(`[ReportManager]    - ${f.format}: ${f.error}`);
      });
    }

    return results;

  } catch (error) {
    console.error(`[ReportManager] ❌ ERRO FATAL ao salvar relatórios: ${error.message}`);
    console.error(`[ReportManager] Stack:`, error.stack);

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Obtém informações sobre a pasta de relatórios
 * @returns {Object} Informações da pasta
 */
export function getReportsInfo() {
  return {
    reportsDir: CONFIG.reportsDir,
    exists: existsSync(CONFIG.reportsDir),
    config: CONFIG
  };
}
