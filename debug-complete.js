const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function debugComplete() {
  try {
    console.log('=== COMPLETE DEBUG INFO ===\n');
    
    // 1. Check admin user
    console.log('1. ADMIN USER CHECK:');
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
    console.log('Admin User:', JSON.stringify(adminUser, null, 2));
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    if (!adminUser.departmentId) {
      console.log('❌ Admin user has no departmentId!');
      return;
    }
    
    // 2. Check all faculty
    console.log('\n2. ALL FACULTY CHECK:');
    const allFaculty = await db.user.findMany({
      where: { role: 'FACULTY' },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        departmentId: true,
        status: true
      }
    });
    console.log('All Faculty:', JSON.stringify(allFaculty, null, 2));
    console.log('Total Faculty Count:', allFaculty.length);
    
    // 3. Check faculty in admin's department
    console.log('\n3. FACULTY IN ADMIN DEPARTMENT:');
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
        status: true
      }
    });
    console.log('Faculty in Admin Department:', JSON.stringify(deptFaculty, null, 2));
    console.log('Count:', deptFaculty.length);
    
    // 4. Check subjects
    console.log('\n4. SUBJECTS CHECK:');
    const subjects = await db.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        credits: true,
        primaryFacultyId: true,
        primaryFaculty: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    console.log('Subjects:', JSON.stringify(subjects, null, 2));
    console.log('Subject Count:', subjects.length);
    
    // 5. Test the exact API query
    console.log('\n5. SIMULATING API QUERY:');
    try {
      const apiResult = await db.user.findMany({
        where: {
          role: "FACULTY",
          departmentId: adminUser.departmentId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          phone: true,
          status: true,
          department: {
            select: {
              id: true,
              name: true,
              shortName: true,
            }
          },
          primarySubjects: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              code: true,
              credits: true,
              batch: {
                select: {
                  id: true,
                  name: true,
                  program: {
                    select: {
                      name: true,
                      shortName: true
                    }
                  }
                }
              }
            }
          },
          coFacultySubjects: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              name: true,
              code: true,
              credits: true,
              batch: {
                select: {
                  id: true,
                  name: true,
                  program: {
                    select: {
                      name: true,
                      shortName: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { name: "asc" }
      });
      
      console.log('API Query Result:', JSON.stringify(apiResult, null, 2));
      console.log('API Query Count:', apiResult.length);
      
      if (apiResult.length > 0) {
        console.log('✅ API query would return faculty!');
      } else {
        console.log('❌ API query returns empty result!');
      }
      
    } catch (error) {
      console.log('❌ API query failed:', error.message);
    }
    
    // 6. Check if there are any authentication issues
    console.log('\n6. AUTHENTICATION CHECK:');
    console.log('Admin user ID:', adminUser.id);
    console.log('Admin department ID:', adminUser.departmentId);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await db.$disconnect();
  }
}

debugComplete();