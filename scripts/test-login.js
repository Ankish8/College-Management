const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing login credentials...\n');

    // Test admin login
    console.log('🔐 Testing admin login...');
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@jlu.edu.in' },
      select: { email: true, name: true, role: true, password: true }
    });

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    if (!admin.password) {
      console.log('❌ Admin user has no password');
      return;
    }

    const isAdminPasswordValid = await bcrypt.compare('JLU@2025admin', admin.password);
    console.log(`✅ Admin login test: ${isAdminPasswordValid ? 'PASS' : 'FAIL'}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);

    // Test faculty login
    console.log('\n🔐 Testing faculty login...');
    const faculty = await prisma.user.findUnique({
      where: { email: 'ankish.khatri@jlu.edu.in' },
      select: { email: true, name: true, role: true, password: true }
    });

    if (!faculty) {
      console.log('❌ Faculty user not found');
      return;
    }

    if (!faculty.password) {
      console.log('❌ Faculty user has no password');
      return;
    }

    const isFacultyPasswordValid = await bcrypt.compare('JLU@2025faculty', faculty.password);
    console.log(`✅ Faculty login test: ${isFacultyPasswordValid ? 'PASS' : 'FAIL'}`);
    console.log(`   Email: ${faculty.email}`);
    console.log(`   Name: ${faculty.name}`);
    console.log(`   Role: ${faculty.role}`);

    console.log('\n🎯 SUMMARY:');
    if (isAdminPasswordValid && isFacultyPasswordValid) {
      console.log('✅ All login tests PASSED! Authentication is working.');
      console.log('\n🌐 You can now access the application at: http://localhost:3002/auth/signin');
      console.log('\n🔑 Login Credentials:');
      console.log('   Admin: admin@jlu.edu.in / JLU@2025admin');
      console.log('   Faculty: ankish.khatri@jlu.edu.in / JLU@2025faculty');
    } else {
      console.log('❌ Some login tests FAILED! Please check the setup.');
    }

  } catch (error) {
    console.error('❌ Error testing login:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testLogin()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });