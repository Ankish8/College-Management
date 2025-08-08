const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking current users in database...\n');

    // Get all users without password field first
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true
      },
      orderBy: { role: 'asc' }
    });

    console.log(`📊 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No Name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
    });

    // Check if admin exists
    const admin = users.find(u => u.email === 'admin@jlu.edu.in');
    console.log(`\n🔑 Admin account (admin@jlu.edu.in): ${admin ? 'EXISTS' : 'NOT FOUND'}`);

  } catch (error) {
    console.error('❌ Error checking users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });