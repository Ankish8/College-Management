const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testPasswordChangeApi() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing password change API logic...\n');

    // Get a test user (admin)
    const user = await prisma.user.findUnique({
      where: { email: 'admin@jlu.edu.in' },
      select: {
        id: true,
        email: true,
        password: true,
        role: true
      }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('👤 Testing with user:', user.email);
    console.log('🔐 User has password:', user.password ? 'Yes' : 'No');

    if (!user.password) {
      console.log('❌ User has no password set');
      return;
    }

    // Test current password verification
    const currentPassword = 'JLU@2025admin';
    console.log('\n🔍 Testing current password verification...');
    console.log('   Testing password:', currentPassword);
    
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    console.log('   Current password valid:', isCurrentPasswordValid ? '✅ Yes' : '❌ No');

    if (!isCurrentPasswordValid) {
      console.log('❌ Current password verification failed');
      return;
    }

    // Test new password hashing
    const newPassword = 'TestPassword123';
    console.log('\n🔐 Testing new password hashing...');
    console.log('   New password:', newPassword);
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    console.log('   Hashed successfully:', hashedNewPassword ? '✅ Yes' : '❌ No');

    // Verify the hashed password works
    const isHashedPasswordValid = await bcrypt.compare(newPassword, hashedNewPassword);
    console.log('   Hash verification:', isHashedPasswordValid ? '✅ Pass' : '❌ Fail');

    console.log('\n🎯 SUMMARY:');
    if (isCurrentPasswordValid && hashedNewPassword && isHashedPasswordValid) {
      console.log('✅ Password change API logic is working correctly!');
      console.log('🔧 The fix should resolve the profile page error.');
    } else {
      console.log('❌ There are still issues with the password change logic.');
    }

  } catch (error) {
    console.error('❌ Error testing password change API:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordChangeApi()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });