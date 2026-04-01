"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesRoutes = void 0;
const express_1 = require("express");
const ctrl = __importStar(require("./notes.controller"));
exports.notesRoutes = (0, express_1.Router)();
// Note Categories — DEVE ficar antes das rotas com /:id para evitar conflito
exports.notesRoutes.get('/categories', ctrl.listCategories);
exports.notesRoutes.post('/categories', ctrl.createCategory);
exports.notesRoutes.put('/categories/:id', ctrl.updateCategory);
exports.notesRoutes.delete('/categories/:id', ctrl.deleteCategory);
// Notes
exports.notesRoutes.get('/', ctrl.list);
exports.notesRoutes.post('/', ctrl.create);
exports.notesRoutes.get('/:id', ctrl.getById);
exports.notesRoutes.put('/:id', ctrl.update);
exports.notesRoutes.put('/:id/pin', ctrl.pin);
exports.notesRoutes.put('/:id/archive', ctrl.archive);
exports.notesRoutes.delete('/:id', ctrl.remove);
//# sourceMappingURL=notes.routes.js.map