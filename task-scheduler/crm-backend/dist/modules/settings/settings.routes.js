"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
router.get('/setup-status', settings_controller_1.getSetupStatus);
router.get('/', settings_controller_1.getSettings);
router.put('/', settings_controller_1.putSettings);
//# sourceMappingURL=settings.routes.js.map