const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkUsers() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking current users in database...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
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
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
    });

    // Check if admin exists
    const admin = users.find(u => u.email === 'admin@jlu.edu.in');
    console.log(`\n🔑 Admin account (admin@jlu.edu.in): ${admin ? 'EXISTS' : 'NOT FOUND'}`);
    
    if (admin) {
      console.log(`   Admin has password: ${admin.password ? 'Yes' : 'No'}`);
      if (admin.password) {
        // Test password
        const isValidPassword = await bcrypt.compare('JLU@2025admin', admin.password);
        console.log(`   Password 'JLU@2025admin' is valid: ${isValidPassword ? 'Yes' : 'No'}`);
      }
    }

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