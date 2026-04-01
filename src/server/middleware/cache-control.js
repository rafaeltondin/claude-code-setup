/**
 * Cache Control — HTML nunca cacheia, assets com hash podem.
 */
function cacheControl(req, res, next) {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
}

module.exports = cacheControl;
