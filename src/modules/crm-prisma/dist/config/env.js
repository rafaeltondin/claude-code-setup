"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    APP_SECRET: zod_1.z.string().min(16, 'APP_SECRET deve ter no minimo 16 caracteres'),
    PORT: zod_1.z.coerce.number().default(3000),
    DATABASE_URL: zod_1.z.string().default('file:../data/crm.db'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    ALLOWED_ORIGINS: zod_1.z.string().optional().default('http://localhost:5173,http://localhost:3000,http://localhost:5000,http://localhost:3847'),
    EVOLUTION_WEBHOOK_SECRET: zod_1.z.string().optional(),
});
function loadEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('Variaveis de ambiente invalidas:');
        console.error(result.error.format());
        process.exit(1);
    }
    return result.data;
}
exports.env = loadEnv();
//# sourceMappingURL=env.js.map