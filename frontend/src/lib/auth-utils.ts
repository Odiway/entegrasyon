import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod');
const ALG = 'HS256';

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compareSync(plain, hashed);
}

export async function createToken(userId: number) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub as unknown as number;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const userId = await verifyToken(auth.slice(7));
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

export function json(data: any, status = 200) {
  return Response.json(data, { status });
}

export function err(message: string, status = 400) {
  return Response.json({ detail: message }, { status });
}
