/**
 * Módulo: Status — Health check e informações do servidor
 */
const { Router } = require('express');
const path = require('path');
const router = Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Claude Ecosystem',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

module.exports = { prefix: '/api/status', router };
