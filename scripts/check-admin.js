const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: {
        department: true
      }
    });
    
    console.log('Admin user:', admin);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();