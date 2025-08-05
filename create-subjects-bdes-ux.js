const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createBDesUXSubjects() {
  try {
    console.log('📚 Creating Subjects for B-Des UX Sem 5 & 7...\n');

    // Get required data
    const department = await prisma.department.findFirst();
    const sem5Batch = await prisma.batch.findFirst({
      where: { name: 'B-Des UX Sem-5' }
    });
    const sem7Batch = await prisma.batch.findFirst({
      where: { name: 'B-Des UX Sem-7' }
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
    console.log(`✅ Found Sem 5 batch: ${sem5Batch?.name}`);
    console.log(`✅ Found Sem 7 batch: ${sem7Batch?.name}`);
    console.log(`✅ Available faculty: ${faculty.length}`);

    // Subject data for Semester 5
    const sem5Subjects = [
      {
        name: 'Design Thinking',
        code: 'BDES5-DT',
        credits: 4,
        totalHours: 60, // 4 credits * 15 hours per credit
        primaryFaculty: 'Priyal',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem5Batch.id
      },
      {
        name: 'Service Design',
        code: 'BDES5-SD',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Bhawana',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem5Batch.id
      },
      {
        name: 'UI Development',
        code: 'BDES5-UID',
        credits: 2,
        totalHours: 30,
        primaryFaculty: 'Priyanshi',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem5Batch.id
      },
      {
        name: 'Summer Internship',
        code: 'BDES5-SI',
        credits: 6,
        totalHours: 90,
        primaryFaculty: 'Priyal',
        examType: 'PRACTICAL',
        subjectType: 'INTERNSHIP',
        batchId: sem5Batch.id
      }
    ];

    // Subject data for Semester 7
    const sem7Subjects = [
      {
        name: 'Design for Social Innovation',
        code: 'BDES7-DSI',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Sushmita',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem7Batch.id
      },
      {
        name: 'Futuristic Technologies for UX Design',
        code: 'BDES7-FTUX',
        credits: 4,
        totalHours: 60,
        primaryFaculty: 'Priyanshi',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem7Batch.id
      },
      {
        name: 'Seminar & Research Writing',
        code: 'BDES7-SRW',
        credits: 2,
        totalHours: 30,
        primaryFaculty: 'Madhu',
        examType: 'THEORY',
        subjectType: 'CORE',
        batchId: sem7Batch.id
      },
      {
        name: 'Field Research Project',
        code: 'BDES7-FRP',
        credits: 8,
        totalHours: 120,
        primaryFaculty: 'Bhawana',
        coFaculty: 'Priyal',
        examType: 'PRACTICAL',
        subjectType: 'PROJECT',
        batchId: sem7Batch.id
      }
    ];

    console.log('\n📝 Creating Semester 5 Subjects...');
    
    let created = 0;
    let skipped = 0;

    for (const subject of sem5Subjects) {
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

    console.log('\n📝 Creating Semester 7 Subjects...');

    for (const subject of sem7Subjects) {
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
          console.log(`❌ Primary faculty ${subject.primaryFaculty} not found for ${subject.name}`);
          skipped++;
          continue;
        }

        // Find co-faculty if exists
        let coFacultyId = null;
        if (subject.coFaculty) {
          const coFaculty = getFacultyByName(subject.coFaculty);
          if (coFaculty) {
            coFacultyId = coFaculty.id;
          } else {
            console.log(`⚠️  Co-faculty ${subject.coFaculty} not found for ${subject.name}`);
          }
        }

        // Create subject
        const newSubject = await prisma.subject.create({
          data: {
            name: subject.name,
            code: subject.code,
            credits: subject.credits,
            totalHours: subject.totalHours,
            primaryFacultyId: primaryFaculty.id,
            coFacultyId: coFacultyId,
            examType: subject.examType,
            subjectType: subject.subjectType,
            batchId: subject.batchId,
            isActive: true
          }
        });

        const coFacultyText = coFacultyId ? ` + Co-faculty: ${subject.coFaculty}` : '';
        console.log(`✅ Created: ${subject.name} (${subject.credits} credits) - ${primaryFaculty.name}${coFacultyText}`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating ${subject.name}:`, error.message);
        skipped++;
      }
    }

    console.log('\n🎉 SUBJECT CREATION COMPLETED!');
    console.log('==============================');
    console.log(`✅ Total Created: ${created} subjects`);
    console.log(`⚠️  Total Skipped: ${skipped} subjects`);
    console.log(`📋 Total Processed: ${created + skipped} subjects`);

    console.log('\n📚 Subject Summary:');
    console.log('\n📖 Semester 5 (Teaching Subjects):');
    sem5Subjects.filter(s => !s.subjectType.includes('INTERNSHIP')).forEach((subject, index) => {
      console.log(`  ${index + 1}. ${subject.name} (${subject.credits} credits) - ${subject.primaryFaculty}`);
    });
    
    console.log('\n📖 Semester 7 (Teaching Subjects):');
    sem7Subjects.filter(s => !s.subjectType.includes('PROJECT')).forEach((subject, index) => {
      console.log(`  ${index + 1}. ${subject.name} (${subject.credits} credits) - ${subject.primaryFaculty}`);
    });

    console.log('\n🎯 Non-Teaching Subjects:');
    console.log('  • Summer Internship (Sem 5) - Non-teaching');
    console.log('  • Field Research Project (Sem 7) - Non-teaching');

  } catch (error) {
    console.error('❌ Subject creation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the subject creation
createBDesUXSubjects().catch(console.error);