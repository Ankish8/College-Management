const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createBDesUXFaculty() {
  try {
    console.log('👨‍🏫 Creating Faculty for B-Des UX Sem 7...\n');

    // Get the department
    const department = await prisma.department.findFirst();
    
    if (!department) {
      throw new Error('No department found. Please ensure department exists.');
    }

    console.log(`✅ Using department: ${department.name}`);

    // Faculty data from B-Des UX Sem 7 timetable
    const facultyData = [
      {
        name: 'Bhawana Jain',
        email: 'bhawana.jain@jlu.edu.in',
        subject: 'Introduction To UX design'
      },
      {
        name: 'Madhu Toppo',
        email: 'madhu.toppo@jlu.edu.in',
        subject: 'Introduction to Semiotics'
      },
      {
        name: 'Priyal Gautam',
        email: 'priyal.gautam@jlu.edu.in',
        subject: 'Visual Design Tools'
      },
      {
        name: 'Sushmita Shahi',
        email: 'sushmita.shahi@jlu.edu.in',
        subject: 'Design Thinking Application'
      },
      {
        name: 'Priyanshi Rungta',
        email: 'priyanshi.rungta@jlu.edu.in',
        subject: 'Additional Faculty' // Since not mentioned in timetable but you specified
      }
    ];

    console.log('\n📝 Creating Faculty Records...');

    let created = 0;
    let skipped = 0;

    for (const faculty of facultyData) {
      try {
        // Check if faculty already exists
        const existingFaculty = await prisma.user.findUnique({
          where: { email: faculty.email }
        });

        if (existingFaculty) {
          console.log(`⚠️  Skipping ${faculty.name} - already exists`);
          skipped++;
          continue;
        }

        // Create faculty user
        const newFaculty = await prisma.user.create({
          data: {
            name: faculty.name,
            email: faculty.email,
            role: 'FACULTY',
            status: 'ACTIVE',
            departmentId: department.id,
            employeeId: `FAC${String(created + 1).padStart(3, '0')}` // Generate employee ID
          }
        });

        console.log(`✅ Created: ${faculty.name} (${faculty.email}) - ${faculty.subject}`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating ${faculty.name}:`, error.message);
        skipped++;
      }
    }

    console.log('\n🎉 FACULTY CREATION COMPLETED!');
    console.log('===============================');
    console.log(`✅ Total Created: ${created} faculty`);
    console.log(`⚠️  Total Skipped: ${skipped} faculty`);
    console.log(`📋 Total Processed: ${created + skipped} faculty`);

    console.log('\n📋 Faculty Summary:');
    facultyData.forEach((faculty, index) => {
      console.log(`  ${index + 1}. ${faculty.name} - ${faculty.subject}`);
    });

    console.log('\n🔐 Faculty Login Information:');
    console.log('- Emails: [Faculty JLU Email]');
    console.log('- Authentication: NextAuth.js system');
    console.log('\n🎯 Faculty can now:');
    console.log('  • Sign in to the college management system');
    console.log('  • Access faculty-specific features');
    console.log('  • Manage their subjects and timetables');

  } catch (error) {
    console.error('❌ Faculty creation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the faculty creation
createBDesUXFaculty().catch(console.error);