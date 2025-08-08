const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function setupAuthentication() {
  const prisma = new PrismaClient();

  try {
    console.log('🔐 Setting up authentication...\n');

    // Hash passwords
    const adminPassword = await bcrypt.hash('JLU@2025admin', 12);
    const facultyPassword = await bcrypt.hash('JLU@2025faculty', 12);

    console.log('🔑 Updating admin password...');
    const admin = await prisma.user.update({
      where: { email: 'admin@jlu.edu.in' },
      data: { password: adminPassword }
    });
    console.log('✅ Admin password set');

    console.log('🔑 Updating faculty passwords...');
    const facultyEmails = [
      'ankish.khatri@jlu.edu.in',
      'bhawana.jain@jlu.edu.in', 
      'madhu.toppo@jlu.edu.in',
      'priyal.gautam@jlu.edu.in',
      'sushmita.shahi@jlu.edu.in',
      'priyanshi.rungta@jlu.edu.in'
    ];

    for (const email of facultyEmails) {
      try {
        await prisma.user.update({
          where: { email },
          data: { password: facultyPassword }
        });
        console.log(`✅ Password set for ${email}`);
      } catch (error) {
        console.log(`⚠️  Warning: Could not set password for ${email} (user may not exist)`);
      }
    }

    console.log('\n✅ Authentication setup complete!');
    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@jlu.edu.in / JLU@2025admin');
    console.log('Faculty: [faculty-email] / JLU@2025faculty');

  } catch (error) {
    console.error('❌ Error setting up authentication:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupAuthentication()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });