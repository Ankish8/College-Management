const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function debugWorkloadAPI() {
  try {
    console.log('🔍 Debugging workload API...');

    // Test the exact query that the API uses
    const adminUser = await db.user.findUnique({
      where: { email: 'admin@jlu.edu.in' },
      select: { departmentId: true, role: true }
    });

    console.log('Admin user:', adminUser);

    if (!adminUser?.departmentId) {
      console.log('❌ Admin user has no department ID');
      return;
    }

    // Test the faculty query
    const facultyList = await db.user.findMany({
      where: {
        role: 'FACULTY',
        departmentId: adminUser.departmentId
      },
      include: {
        primarySubjects: {
          where: { isActive: true },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                semester: true,
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
          where: { isActive: true },
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                semester: true,
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
        facultyPreferences: true
      },
      orderBy: { name: 'asc' }
    });

    console.log('✅ Faculty query successful!');
    console.log('Faculty count:', facultyList.length);

    facultyList.forEach(faculty => {
      console.log(`- ${faculty.name}: ${faculty.primarySubjects.length} primary subjects, ${faculty.coFacultySubjects.length} co-faculty subjects`);
    });

    // Test a simple workload calculation
    const processedFaculty = facultyList.map(faculty => {
      const primaryCredits = faculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0);
      const coFacultyCredits = faculty.coFacultySubjects.reduce((sum, s) => sum + (s.credits * 0.5), 0);
      const totalCredits = primaryCredits + coFacultyCredits;
      
      return {
        id: faculty.id,
        name: faculty.name || 'Unknown',
        email: faculty.email,
        employeeId: faculty.employeeId || '',
        status: faculty.status,
        currentWorkload: {
          totalCredits: Math.round(totalCredits * 100) / 100,
          teachingCredits: primaryCredits,
          nonTeachingCredits: coFacultyCredits,
          maxCredits: 30,
          utilization: Math.round((totalCredits / 30) * 100 * 100) / 100,
          status: totalCredits > 30 ? 'overloaded' : totalCredits >= 24 ? 'balanced' : 'underutilized',
          hoursPerWeek: Math.round(totalCredits * 15 / 15 * 100) / 100
        },
        assignedSubjects: faculty.primarySubjects.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          totalHours: subject.totalHours,
          examType: subject.examType,
          subjectType: subject.subjectType,
          isTeaching: subject.subjectType === 'CORE',
          batch: subject.batch
        })),
        preferences: {
          maxDailyHours: faculty.facultyPreferences?.maxDailyHours || 8,
          maxWeeklyHours: faculty.facultyPreferences?.maxWeeklyHours || 30,
          preferredTimeSlots: []
        },
        analytics: {
          subjectCount: faculty.primarySubjects.length,
          batchCount: 1,
          averageCreditsPerSubject: faculty.primarySubjects.length > 0 ? 
            faculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) / faculty.primarySubjects.length : 0,
          workloadTrend: 'stable'
        }
      };
    });

    console.log('✅ Processed faculty data successfully!');
    console.log('Sample faculty:', JSON.stringify(processedFaculty[0], null, 2));

    // Test the summary calculation
    const summary = {
      totalFaculty: processedFaculty.length,
      activeFaculty: processedFaculty.filter(f => f.status === 'ACTIVE').length,
      totalSubjects: processedFaculty.reduce((sum, f) => sum + f.assignedSubjects.length, 0),
      totalCredits: processedFaculty.reduce((sum, f) => sum + f.currentWorkload.totalCredits, 0),
      averageWorkload: processedFaculty.length > 0 ? 
        processedFaculty.reduce((sum, f) => sum + f.currentWorkload.totalCredits, 0) / processedFaculty.length : 0,
      facultyDistribution: {
        overloaded: processedFaculty.filter(f => f.currentWorkload.status === 'overloaded').length,
        balanced: processedFaculty.filter(f => f.currentWorkload.status === 'balanced').length,
        underutilized: processedFaculty.filter(f => f.currentWorkload.status === 'underutilized').length
      }
    };

    console.log('✅ Summary:', summary);

    console.log('\n🎉 All queries successful! The API should work now.');

  } catch (error) {
    console.error('❌ Error in debug:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

debugWorkloadAPI();