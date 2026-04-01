import { Router } from 'express';
import { getSettings, putSettings, getSetupStatus } from './settings.controller';

const router = Router();

router.get('/setup-status', getSetupStatus);
router.get('/', getSettings);
router.put('/', putSettings);

export { router as settingsRoutes };
