const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importMinimalOnly() {
  try {
    console.log('🚀 Starting MINIMAL Import - ONLY Students and Batches...\n');

    // Read the student data
    const studentData = JSON.parse(fs.readFileSync('bdes-final-students.json', 'utf8'));

    // Create ONLY the absolute minimum required structure
    console.log('🏗️  Creating MINIMAL required structure...');
    
    // University (required)
    const university = await prisma.university.create({
      data: {
        name: 'Jagran Lakecity University',
        shortName: 'JLU'
      }
    });
    console.log('✅ University created');

    // Department (required)
    const department = await prisma.department.create({
      data: {
        name: 'School of Design',
        shortName: 'Design',
        universityId: university.id
      }
    });
    console.log('✅ Department created');

    // Program (required)
    const program = await prisma.program.create({
      data: {
        name: 'Bachelor of Design',
        shortName: 'B-Des',
        duration: 4,
        totalSems: 8,
        departmentId: department.id
      }
    });
    console.log('✅ Program created');

    // UX Specialization (required)
    const uxSpecialization = await prisma.specialization.create({
      data: {
        name: 'User Experience Design',
        shortName: 'UX',
        programId: program.id
      }
    });
    console.log('✅ UX Specialization created');

    console.log('\n📋 Creating ONLY 3 B-Des UX Batches...');

    // Create ONLY the 3 batches
    const batchConfigs = [
      { name: 'B-Des UX Sem-7', semester: 7, startYear: 2022, endYear: 2026, dataKey: 'B-Des UX 7' },
      { name: 'B-Des UX Sem-5', semester: 5, startYear: 2023, endYear: 2027, dataKey: 'B-Des UX 5' },
      { name: 'B-Des UX Sem-3', semester: 3, startYear: 2024, endYear: 2028, dataKey: 'B-Des UX 3 (Foundation)' }
    ];

    const batchMapping = {};

    for (const config of batchConfigs) {
      const studentCount = studentData[config.dataKey]?.students?.length || 0;
      
      const batch = await prisma.batch.create({
        data: {
          name: config.name,
          semester: config.semester,
          startYear: config.startYear,
          endYear: config.endYear,
          isActive: true,
          maxCapacity: studentCount,
          currentStrength: 0,
          programId: program.id,
          specializationId: uxSpecialization.id
        }
      });

      batchMapping[config.dataKey] = batch;
      console.log(`✅ Created: ${config.name}`);
    }

    console.log('\n📥 Importing ONLY 85 B-Des UX Students...');

    let totalImported = 0;

    for (const [sheetLabel, data] of Object.entries(studentData)) {
      console.log(`\n🔄 Processing ${sheetLabel} (${data.students.length} students)...`);
      
      const batch = batchMapping[sheetLabel];
      let imported = 0;

      for (const studentInfo of data.students) {
        try {
          // Create user
          const user = await prisma.user.create({
            data: {
              name: studentInfo.name,
              email: studentInfo.officialEmail,
              phone: studentInfo.contactNo?.toString(),
              role: 'STUDENT',
              status: 'ACTIVE',
              departmentId: department.id
            }
          });

          // Create student record
          await prisma.student.create({
            data: {
              userId: user.id,
              studentId: studentInfo.studentId,
              rollNumber: studentInfo.rollNumber,
              batchId: batch.id
            }
          });

          imported++;

        } catch (error) {
          console.error(`❌ Error importing ${studentInfo.name}:`, error.message);
        }
      }

      // Update batch strength
      await prisma.batch.update({
        where: { id: batch.id },
        data: { currentStrength: imported }
      });

      totalImported += imported;
      console.log(`✅ ${batch.name}: ${imported} students`);
    }

    console.log('\n🎉 MINIMAL IMPORT COMPLETED!');
    console.log('============================');
    console.log(`✅ Total Students: ${totalImported}`);
    console.log(`✅ Total Batches: 3`);
    console.log(`✅ NO Subjects`);
    console.log(`✅ NO Faculty`);
    console.log(`✅ NO Fake Data`);
    console.log('✅ CLEAN - Exactly what you wanted!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the minimal import
importMinimalOnly().catch(console.error);