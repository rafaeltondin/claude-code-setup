/**
 * Request Logger Middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    // Só loga se não for static asset
    if (!req.path.match(/\.(js|css|png|jpg|svg|ico|woff|woff2|ttf|map)$/)) {
      console.log(`[HTTP][${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
}

module.exports = requestLogger;
