/**
 * Error Handler — Captura erros não tratados nas rotas.
 */
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[ErrorHandler][${new Date().toISOString()}] ${req.method} ${req.path}:`, message);

  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
