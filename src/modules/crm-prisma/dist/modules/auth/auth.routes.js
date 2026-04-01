"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("./auth.middleware");
const router = (0, express_1.Router)();
exports.authRoutes = router;
// POST /api/auth/register — cadastro de novo usuario
router.post('/register', auth_controller_1.postRegister);
// POST /api/auth/login — autenticacao
router.post('/login', auth_controller_1.postLogin);
// POST /api/auth/logout — revoga o token atual via blacklist
router.post('/logout', auth_middleware_1.authMiddleware, auth_controller_1.postLogout);
// GET /api/auth/me — dados do usuario autenticado (protegida)
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.getMe);
//# sourceMappingURL=auth.routes.js.map