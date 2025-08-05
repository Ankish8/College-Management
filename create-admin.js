const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    // Get the department
    const department = await prisma.department.findFirst();
    
    if (!department) {
      throw new Error('No department found. Please run import first.');
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@jlu.edu.in',
        role: 'ADMIN',
        status: 'ACTIVE',
        departmentId: department.id,
        employeeId: 'ADMIN001'
      }
    });

    console.log('✅ Admin user created:');
    console.log(`   Email: admin@jlu.edu.in`);
    console.log(`   Role: ADMIN`);
    console.log(`   ID: ${admin.id}`);
    
    console.log('\n🔐 You can now log in with:');
    console.log('   Email: admin@jlu.edu.in');
    console.log('   (NextAuth will handle authentication)');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin().catch(console.error);