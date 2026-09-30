import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ WARNING: DATABASE_URL is not set in environment! Prisma will attempt default connection.');
} else {
  const masked = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Initializing Prisma Client with DATABASE_URL: ${masked}`);
}

export const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;

