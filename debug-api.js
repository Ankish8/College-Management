const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('=== Database Debug Info ===');
    
    // Check admin user
    const adminUser = await db.user.findUnique({
      where: { email: 'admin@jlu.edu.in' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        }
      }
    });
    
    console.log('Admin User:', adminUser);
    
    // Check department settings
    if (adminUser?.departmentId) {
      const depSettings = await db.departmentSettings.findUnique({
        where: { departmentId: adminUser.departmentId }
      });
      console.log('Department Settings:', depSettings);
    }
    
    // Check faculty count
    const facultyCount = await db.user.count({
      where: { role: 'FACULTY' }
    });
    console.log('Total Faculty Count:', facultyCount);
    
    // Check faculty in admin's department
    if (adminUser?.departmentId) {
      const deptFaculty = await db.user.findMany({
        where: {
          role: 'FACULTY',
          departmentId: adminUser.departmentId
        },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          departmentId: true
        }
      });
      console.log('Faculty in Admin Department:', deptFaculty);
    }
    
    // Check subjects count
    const subjectCount = await db.subject.count();
    console.log('Total Subjects:', subjectCount);
    
  } catch (error) {
    console.error('Database Error:', error);
  } finally {
    await db.$disconnect();
  }
}

debugDatabase();