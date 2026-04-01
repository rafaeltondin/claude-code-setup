import { Router } from 'express';
import * as ctrl from './personal-tasks.controller';

export const personalTasksRoutes = Router();

personalTasksRoutes.get('/', ctrl.list);
personalTasksRoutes.get('/stats', ctrl.stats);
personalTasksRoutes.get('/:id', ctrl.getById);
personalTasksRoutes.post('/', ctrl.create);
personalTasksRoutes.put('/:id', ctrl.update);
personalTasksRoutes.put('/:id/status', ctrl.updateStatus);
personalTasksRoutes.delete('/:id', ctrl.remove);
