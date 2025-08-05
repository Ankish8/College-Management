const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createBDesUXSem3Subjects() {
  try {
    console.log('📚 Creating Subjects for B-Des UX Sem 3...\n');

    // Get required data
    const department = await prisma.department.findFirst();
    const sem3Batch = await prisma.batch.findFirst({
      where: { name: 'B-Des UX Sem-3' }
    });

    // Get faculty by email
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, name: true, email: true }
    });

    const getFacultyByName = (name) => {
      return faculty.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
    };

    console.log(`✅ Using department: ${department.name}`);
    console.log(`✅ Found Sem 3 batch: ${sem3Batch?.name}`);
    console.log(`✅ Available faculty: ${faculty.length}`);

    // Subject data for Semester 3
    const sem3Subjects = [
      {
        name: 'Introduction To UX design',
        code: 'BDES3-IUXD',
        credits: 4,
        totalHours: 60, // 4 credits * 15 hours per credit
        primaryFaculty: 'Bhawana',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem3Batch.id
      },
      {
        name: 'Introduction to Semiotics',
        code: 'BDES3-IS',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Madhu',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem3Batch.id
      },
      {
        name: 'Visual Design Tools',
        code: 'BDES3-VDT',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Priyal',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem3Batch.id
      },
      {
        name: 'Design Thinking Application',
        code: 'BDES3-DTA',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Sushmita',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem3Batch.id
      }
    ];

    console.log('\n📝 Creating Semester 3 Subjects...');
    
    let created = 0;
    let skipped = 0;

    for (const subject of sem3Subjects) {
      try {
        // Check if subject already exists
        const existingSubject = await prisma.subject.findUnique({
          where: { code: subject.code }
        });

        if (existingSubject) {
          console.log(`⚠️  Skipping ${subject.name} - already exists`);
          skipped++;
          continue;
        }

        // Find primary faculty
        const primaryFaculty = getFacultyByName(subject.primaryFaculty);
        if (!primaryFaculty) {
          console.log(`❌ Faculty ${subject.primaryFaculty} not found for ${subject.name}`);
          skipped++;
          continue;
        }

        // Create subject
        const newSubject = await prisma.subject.create({
          data: {
            name: subject.name,
            code: subject.code,
            credits: subject.credits,
            totalHours: subject.totalHours,
            primaryFacultyId: primaryFaculty.id,
            examType: subject.examType,
            subjectType: subject.subjectType,
            batchId: subject.batchId,
            isActive: true
          }
        });

        console.log(`✅ Created: ${subject.name} (${subject.credits} credits) - ${primaryFaculty.name}`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating ${subject.name}:`, error.message);
        skipped++;
      }
    }

    console.log('\n🎉 SEMESTER 3 SUBJECTS CREATION COMPLETED!');
    console.log('==========================================');
    console.log(`✅ Total Created: ${created} subjects`);
    console.log(`⚠️  Total Skipped: ${skipped} subjects`);
    console.log(`📋 Total Processed: ${created + skipped} subjects`);

    console.log('\n📚 Semester 3 Subject Summary:');
    sem3Subjects.forEach((subject, index) => {
      console.log(`  ${index + 1}. ${subject.name} (${subject.credits} credits) - ${subject.primaryFaculty}`);
    });

    console.log('\n🎯 All Semester 3 subjects are Teaching subjects');
    console.log('⚠️  Open Elective excluded as requested');

    // Show total subjects across all semesters
    const totalSubjects = await prisma.subject.count();
    console.log(`\n📊 Total subjects in system: ${totalSubjects}`);

  } catch (error) {
    console.error('❌ Subject creation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the subject creation
createBDesUXSem3Subjects().catch(console.error);