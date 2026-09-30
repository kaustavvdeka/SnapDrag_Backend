import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.INTERNAL_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL;

if (!process.env.DATABASE_URL && databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

if (!databaseUrl) {
  console.error('❌ WARNING: Neither DATABASE_URL nor INTERNAL_DATABASE_URL is set in environment! Prisma will attempt default localhost connection.');
} else {
  const masked = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Initializing Prisma Client with DATABASE_URL: ${masked}`);
}

export const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;

