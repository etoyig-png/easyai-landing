import { PrismaClient } from '@prisma/client';
import { assertPreviewDatabaseIsolation } from './previewIsolation';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

prisma.$use(async (params, next) => { assertPreviewDatabaseIsolation(); return next(params); });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
