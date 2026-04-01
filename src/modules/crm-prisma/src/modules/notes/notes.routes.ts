import { Router } from 'express';
import * as ctrl from './notes.controller';

export const notesRoutes = Router();

// Note Categories — DEVE ficar antes das rotas com /:id para evitar conflito
notesRoutes.get('/categories', ctrl.listCategories);
notesRoutes.post('/categories', ctrl.createCategory);
notesRoutes.put('/categories/:id', ctrl.updateCategory);
notesRoutes.delete('/categories/:id', ctrl.deleteCategory);

// Notes
notesRoutes.get('/', ctrl.list);
notesRoutes.post('/', ctrl.create);
notesRoutes.get('/:id', ctrl.getById);
notesRoutes.put('/:id', ctrl.update);
notesRoutes.put('/:id/pin', ctrl.pin);
notesRoutes.put('/:id/archive', ctrl.archive);
notesRoutes.delete('/:id', ctrl.remove);
