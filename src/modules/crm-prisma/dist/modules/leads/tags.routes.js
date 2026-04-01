"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsRoutes = void 0;
const express_1 = require("express");
const tags_controller_1 = require("./tags.controller");
exports.tagsRoutes = (0, express_1.Router)();
// POST /api/tags/analyze — analisar NLP e atualizar tags/temperatura de lead(s)
exports.tagsRoutes.post('/analyze', tags_controller_1.handleAnalyzeTags);
//# sourceMappingURL=tags.routes.js.map