import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Convert relative SQLite path to absolute path if needed
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  
  // Check if it's a relative SQLite file path
  if (url.startsWith('file:./') || url.startsWith('file:../')) {
    const relativePath = url.replace('file:', '')
    const absolutePath = path.resolve(process.cwd(), relativePath)
    return `file:${absolutePath}`
  }
  
  return url
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Remove query logging in development for performance
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db