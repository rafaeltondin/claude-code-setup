import { Router } from 'express';
import { handleGetStats } from './dashboard.controller';

export const dashboardRoutes = Router();

// GET /api/dashboard/stats — resumo financeiro e contadores
dashboardRoutes.get('/stats', handleGetStats);
