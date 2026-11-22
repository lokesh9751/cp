import { PrismaClient } from '@prisma/client';

let prisma;

// Reuse a single PrismaClient instance across all requests
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global to prevent multiple instances during hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

export { prisma };