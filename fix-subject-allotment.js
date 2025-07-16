const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function fixSubjectAllotment() {
  try {
    console.log('🔧 Fixing subject allotment...');

    // Step 1: Create unassigned subjects
    console.log('Step 1: Creating unassigned subjects...');
    
    const unassignedSubjects = await db.subject.updateMany({
      where: {
        code: {
          in: ['VCD301', 'TYP301', 'AID701', 'DRM501']
        }
      },
      data: {
        primaryFacultyId: null,
        coFacultyId: null
      }
    });

    console.log('✅ Unassigned subjects count:', unassignedSubjects.count);

    // Step 2: Verify unassigned subjects
    const verifyUnassigned = await db.subject.findMany({
      where: {
        primaryFacultyId: null,
        coFacultyId: null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        credits: true
      }
    });

    console.log('✅ Verified unassigned subjects:', verifyUnassigned.length);
    verifyUnassigned.forEach(subject => {
      console.log(`  - ${subject.name} (${subject.code}) - ${subject.credits} credits`);
    });

    // Step 3: Verify faculty with assigned subjects
    const facultyWithSubjects = await db.user.findMany({
      where: {
        role: 'FACULTY'
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        primarySubjects: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true,
            credits: true
          }
        }
      }
    });

    console.log('✅ Faculty with assigned subjects:');
    facultyWithSubjects.forEach(faculty => {
      console.log(`  - ${faculty.name}: ${faculty.primarySubjects.length} subjects`);
    });

    // Step 4: Create department settings if missing
    console.log('Step 4: Ensuring department settings exist...');
    
    const department = await db.department.findFirst({
      where: { shortName: 'DESIGN' }
    });

    if (department) {
      try {
        await db.departmentSettings.upsert({
          where: { departmentId: department.id },
          update: {},
          create: {
            departmentId: department.id,
            creditHoursRatio: 15,
            maxFacultyCredits: 30,
            coFacultyWeight: 0.5,
            schedulingMode: "MODULE_BASED",
            autoCreateAttendance: true,
          },
        });
        console.log('✅ Department settings created/updated');
      } catch (error) {
        console.log('⚠️  Department settings table might not exist, using defaults');
      }
    }

    console.log('\n🎉 Subject allotment fix completed!');
    console.log('Now refresh the subject allotment page.');

  } catch (error) {
    console.error('❌ Error fixing subject allotment:', error);
  } finally {
    await db.$disconnect();
  }
}

fixSubjectAllotment();