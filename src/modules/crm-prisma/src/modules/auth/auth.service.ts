import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
  };
  token: string;
}

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  logger.info('[auth.service] register INICIO', { email, name });

  logger.debug('[auth.service] register verificando se email ja existe', { email });
  const existente = await prisma.user.findUnique({ where: { email } });

  if (existente) {
    logger.warn('[auth.service] register email ja cadastrado', { email });
    throw new AppError(409, 'Email ja cadastrado', 'EMAIL_TAKEN');
  }

  logger.debug('[auth.service] register gerando hash de senha...');
  const senhaHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  logger.debug('[auth.service] register hash gerado com sucesso');

  logger.info('[auth.service] register criando usuario no banco...', { email });
  const user = await prisma.user.create({
    data: { name, email, password: senhaHash },
  });

  logger.info('[auth.service] register usuario criado', { userId: user.id, email });

  const token = gerarToken(user.id);

  logger.info('[auth.service] register FIM - sucesso', { userId: user.id });

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

export async function login(email: string, password: string): Promise<AuthResult> {
  logger.info('[auth.service] login INICIO', { email });

  logger.debug('[auth.service] login buscando usuario...', { email });
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    logger.warn('[auth.service] login usuario nao encontrado', { email });
    // Mensagem generica para nao revelar se email existe
    throw new AppError(401, 'Email ou senha invalidos', 'INVALID_CREDENTIALS');
  }

  logger.debug('[auth.service] login verificando senha...');
  const senhaCorreta = await bcrypt.compare(password, user.password);

  if (!senhaCorreta) {
    logger.warn('[auth.service] login senha incorreta', { userId: user.id });
    throw new AppError(401, 'Email ou senha invalidos', 'INVALID_CREDENTIALS');
  }

  logger.info('[auth.service] login credenciais validas', { userId: user.id });

  const token = gerarToken(user.id);

  logger.info('[auth.service] login FIM - sucesso', { userId: user.id });

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

export async function getUserById(id: string) {
  logger.info('[auth.service] getUserById INICIO', { userId: id });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    logger.warn('[auth.service] getUserById usuario nao encontrado', { userId: id });
    throw new AppError(404, 'Usuario nao encontrado', 'USER_NOT_FOUND');
  }

  logger.info('[auth.service] getUserById FIM - sucesso', { userId: id });

  return user;
}

// ---------------------------------------------------------------------------
// logout — invalida o token via blacklist no Redis
// ---------------------------------------------------------------------------

export async function logout(token: string): Promise<void> {
  logger.info('[auth.service] logout INICIO');

  const payload = jwt.decode(token) as any;

  if (!payload?.exp) {
    logger.warn('[auth.service] logout token sem campo exp — nao pode ser invalidado');
    return;
  }

  const ttl = payload.exp - Math.floor(Date.now() / 1000);

  if (ttl > 0) {
    logger.debug('[auth.service] logout adicionando token a blacklist', { ttl });
    await redis.setex(`jwt:blacklist:${token}`, ttl, '1');
    logger.info('[auth.service] logout token invalidado com sucesso', { ttl });
  } else {
    logger.debug('[auth.service] logout token ja expirado — blacklist desnecessaria');
  }
}

// ---------------------------------------------------------------------------
// Helper interno
// ---------------------------------------------------------------------------

function gerarToken(userId: string): string {
  logger.debug('[auth.service] gerarToken', { userId });

  const payload: TokenPayload = { userId };
  const token = jwt.sign(payload, env.APP_SECRET, { expiresIn: JWT_EXPIRES_IN });

  logger.debug('[auth.service] token gerado', { userId, expiresIn: JWT_EXPIRES_IN });

  return token;
}
