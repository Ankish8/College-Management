const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function createUnassignedSubjects() {
  try {
    console.log('Creating unassigned subjects...');

    // Get some subjects to make unassigned
    const subjectsToUnassign = await db.subject.findMany({
      where: {
        code: {
          in: ['VCD301', 'TYP301', 'AID701', 'DRM501'] // 4 subjects to unassign
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        primaryFaculty: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('Found subjects to unassign:', subjectsToUnassign.length);

    // Remove faculty assignments from these subjects
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

    console.log('✅ Unassigned subjects:', unassignedSubjects.count);

    // Verify the changes
    const verifyUnassigned = await db.subject.findMany({
      where: {
        primaryFacultyId: null,
        coFacultyId: null
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

    console.log('\n🎉 Successfully created unassigned subjects!');
    console.log('Now refresh the subject allotment page to see them.');

  } catch (error) {
    console.error('❌ Error creating unassigned subjects:', error);
  } finally {
    await db.$disconnect();
  }
}

createUnassignedSubjects();