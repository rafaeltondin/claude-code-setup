/**
 * Rotas da API para analise frontend
 *
 * Endpoints:
 *   POST /api/analysis/project - Analisar projeto local
 *   POST /api/analysis/url     - Analisar URL remota
 */

import { Router } from 'express';
import { analyzeProject, analyzeURL } from '../../api.js';

const router = Router();

/**
 * POST /api/analysis/project
 * Analisa um projeto local
 *
 * Body: { path: "C:/caminho/projeto" }
 */
router.post('/project', async (req, res) => {
  const startTime = Date.now();
  const { path: projectPath } = req.body;

  console.log(`[AnalysisRoutes] POST /project - Path: ${projectPath}`);

  if (!projectPath) {
    return res.status(400).json({
      success: false,
      error: 'path e obrigatorio'
    });
  }

  try {
    const result = await analyzeProject(projectPath, { silent: true });

    res.json({
      success: result.success,
      data: result,
      duration: Date.now() - startTime
    });
  } catch (error) {
    console.error(`[AnalysisRoutes] Erro: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analysis/url
 * Analisa uma URL remota
 *
 * Body: { url: "https://exemplo.com" }
 */
router.post('/url', async (req, res) => {
  const startTime = Date.now();
  const { url } = req.body;

  console.log(`[AnalysisRoutes] POST /url - URL: ${url}`);

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'url e obrigatorio'
    });
  }

  try {
    const result = await analyzeURL(url, { silent: true });

    res.json({
      success: result.success,
      data: result,
      duration: Date.now() - startTime
    });
  } catch (error) {
    console.error(`[AnalysisRoutes] Erro: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
