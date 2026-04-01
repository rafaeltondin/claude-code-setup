"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getUserById = getUserById;
exports.logout = logout;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const env_1 = require("../../config/env");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
async function register(name, email, password) {
    logger_1.logger.info('[auth.service] register INICIO', { email, name });
    logger_1.logger.debug('[auth.service] register verificando se email ja existe', { email });
    const existente = await database_1.prisma.user.findUnique({ where: { email } });
    if (existente) {
        logger_1.logger.warn('[auth.service] register email ja cadastrado', { email });
        throw new errors_1.AppError(409, 'Email ja cadastrado', 'EMAIL_TAKEN');
    }
    logger_1.logger.debug('[auth.service] register gerando hash de senha...');
    const senhaHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
    logger_1.logger.debug('[auth.service] register hash gerado com sucesso');
    logger_1.logger.info('[auth.service] register criando usuario no banco...', { email });
    const user = await database_1.prisma.user.create({
        data: { name, email, password: senhaHash },
    });
    logger_1.logger.info('[auth.service] register usuario criado', { userId: user.id, email });
    const token = gerarToken(user.id);
    logger_1.logger.info('[auth.service] register FIM - sucesso', { userId: user.id });
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        },
        token,
    };
}
// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
async function login(email, password) {
    logger_1.logger.info('[auth.service] login INICIO', { email });
    logger_1.logger.debug('[auth.service] login buscando usuario...', { email });
    const user = await database_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        logger_1.logger.warn('[auth.service] login usuario nao encontrado', { email });
        // Mensagem generica para nao revelar se email existe
        throw new errors_1.AppError(401, 'Email ou senha invalidos', 'INVALID_CREDENTIALS');
    }
    logger_1.logger.debug('[auth.service] login verificando senha...');
    const senhaCorreta = await bcryptjs_1.default.compare(password, user.password);
    if (!senhaCorreta) {
        logger_1.logger.warn('[auth.service] login senha incorreta', { userId: user.id });
        throw new errors_1.AppError(401, 'Email ou senha invalidos', 'INVALID_CREDENTIALS');
    }
    logger_1.logger.info('[auth.service] login credenciais validas', { userId: user.id });
    const token = gerarToken(user.id);
    logger_1.logger.info('[auth.service] login FIM - sucesso', { userId: user.id });
    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        },
        token,
    };
}
// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------
async function getUserById(id) {
    logger_1.logger.info('[auth.service] getUserById INICIO', { userId: id });
    const user = await database_1.prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) {
        logger_1.logger.warn('[auth.service] getUserById usuario nao encontrado', { userId: id });
        throw new errors_1.AppError(404, 'Usuario nao encontrado', 'USER_NOT_FOUND');
    }
    logger_1.logger.info('[auth.service] getUserById FIM - sucesso', { userId: id });
    return user;
}
// ---------------------------------------------------------------------------
// logout — invalida o token via blacklist no Redis
// ---------------------------------------------------------------------------
async function logout(token) {
    logger_1.logger.info('[auth.service] logout INICIO');
    const payload = jsonwebtoken_1.default.decode(token);
    if (!payload?.exp) {
        logger_1.logger.warn('[auth.service] logout token sem campo exp — nao pode ser invalidado');
        return;
    }
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
        logger_1.logger.debug('[auth.service] logout adicionando token a blacklist', { ttl });
        await redis_1.redis.setex(`jwt:blacklist:${token}`, ttl, '1');
        logger_1.logger.info('[auth.service] logout token invalidado com sucesso', { ttl });
    }
    else {
        logger_1.logger.debug('[auth.service] logout token ja expirado — blacklist desnecessaria');
    }
}
// ---------------------------------------------------------------------------
// Helper interno
// ---------------------------------------------------------------------------
function gerarToken(userId) {
    logger_1.logger.debug('[auth.service] gerarToken', { userId });
    const payload = { userId };
    const token = jsonwebtoken_1.default.sign(payload, env_1.env.APP_SECRET, { expiresIn: JWT_EXPIRES_IN });
    logger_1.logger.debug('[auth.service] token gerado', { userId, expiresIn: JWT_EXPIRES_IN });
    return token;
}
//# sourceMappingURL=auth.service.js.map