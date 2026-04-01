import { Router } from 'express';
import { postRegister, postLogin, postLogout, getMe } from './auth.controller';
import { authMiddleware } from './auth.middleware';

const router = Router();

// POST /api/auth/register — cadastro de novo usuario
router.post('/register', postRegister);

// POST /api/auth/login — autenticacao
router.post('/login', postLogin);

// POST /api/auth/logout — revoga o token atual via blacklist
router.post('/logout', authMiddleware, postLogout);

// GET /api/auth/me — dados do usuario autenticado (protegida)
router.get('/me', authMiddleware, getMe);

export { router as authRoutes };
