/**
 * Auth Middleware — Autenticação por Bearer token (local-dev-token).
 * Usado pelas rotas CRM e outras rotas protegidas.
 */
const TOKEN = process.env.CRM_TOKEN || 'local-dev-token';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== TOKEN) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  next();
}

module.exports = authMiddleware;
