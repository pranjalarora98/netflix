import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/client/client';

  function createPrismaClient() {
    const envUrl = process.env.DATABASE_URL;
    if(!envUrl)
        throw new Error('DATABASE_URL is not set');
    const adapter = new PrismaPg({ connectionString:envUrl });
    return new PrismaClient({adapter}); 
    
  }
     

export const prisma = createPrismaClient();
