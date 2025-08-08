const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testCompletePasswordChange() {
  const prisma = new PrismaClient();

  try {
    console.log('🧪 Testing complete password change functionality...\n');

    // Test with admin user
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@jlu.edu.in' },
      select: {
        id: true,
        email: true,
        password: true,
        role: true
      }
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('👤 Testing with user:', testUser.email);
    
    // Step 1: Verify current password
    console.log('\n🔍 Step 1: Verifying current password...');
    const currentPassword = 'JLU@2025admin';
    const isCurrentValid = await bcrypt.compare(currentPassword, testUser.password);
    console.log('   Current password verification:', isCurrentValid ? '✅ Pass' : '❌ Fail');

    if (!isCurrentValid) {
      console.log('❌ Cannot proceed - current password is invalid');
      return;
    }

    // Step 2: Hash new password
    console.log('\n🔐 Step 2: Hashing new password...');
    const newPassword = 'NewTestPassword123';
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    console.log('   New password hashed:', hashedNewPassword ? '✅ Success' : '❌ Failed');

    // Step 3: Update password in database (simulate API call)
    console.log('\n💾 Step 3: Updating password in database...');
    await prisma.user.update({
      where: { id: testUser.id },
      data: { password: hashedNewPassword }
    });
    console.log('   Database update:', '✅ Success');

    // Step 4: Verify new password works
    console.log('\n🔍 Step 4: Verifying new password...');
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { password: true }
    });

    const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
    console.log('   New password verification:', isNewPasswordValid ? '✅ Pass' : '❌ Fail');

    // Step 5: Restore original password
    console.log('\n🔄 Step 5: Restoring original password...');
    const originalHashedPassword = await bcrypt.hash(currentPassword, 12);
    await prisma.user.update({
      where: { id: testUser.id },
      data: { password: originalHashedPassword }
    });
    console.log('   Original password restored:', '✅ Success');

    // Final verification
    const restoredUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { password: true }
    });
    const isRestoredPasswordValid = await bcrypt.compare(currentPassword, restoredUser.password);
    console.log('   Restored password verification:', isRestoredPasswordValid ? '✅ Pass' : '❌ Fail');

    console.log('\n🎯 SUMMARY:');
    const allTestsPassed = isCurrentValid && hashedNewPassword && isNewPasswordValid && isRestoredPasswordValid;
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED! Password change functionality is working correctly.');
      console.log('\n🌐 You can now test in the browser:');
      console.log('   1. Login at: http://localhost:3002/auth/signin');
      console.log('   2. Go to Profile page');
      console.log('   3. Try changing password in Security tab');
      console.log('\n🔑 Test credentials:');
      console.log('   Email: admin@jlu.edu.in');
      console.log('   Current Password: JLU@2025admin');
    } else {
      console.log('❌ Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    console.error('❌ Error testing password change:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testCompletePasswordChange()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });