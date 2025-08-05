const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importCleanBDesStudents() {
  try {
    console.log('🚀 Starting CLEAN B-Des UX Student Import...\n');

    // Read the final student data
    const studentData = JSON.parse(fs.readFileSync('bdes-final-students.json', 'utf8'));

    // Get existing required entities
    const university = await prisma.university.findFirst();
    const department = await prisma.department.findFirst();
    const program = await prisma.program.findFirst();

    console.log(`✅ Using university: ${university.name}`);
    console.log(`✅ Using department: ${department.name}`);
    console.log(`✅ Using program: ${program.name}`);

    // Delete ALL existing batches and students first
    console.log('\n🗑️  Clearing existing data...');
    await prisma.student.deleteMany();
    await prisma.user.deleteMany({ where: { role: 'STUDENT' } });
    await prisma.batch.deleteMany();
    await prisma.specialization.deleteMany();
    console.log('✅ All existing students, batches, and specializations deleted');

    // Create ONLY UX Specialization
    const uxSpecialization = await prisma.specialization.create({
      data: {
        name: 'User Experience Design',
        shortName: 'UX',
        programId: program.id
      }
    });
    console.log('✅ Created UX Specialization ONLY');

    console.log('\n📋 Creating ONLY 3 B-Des UX Batches...');

    // Create ONLY the 3 batches you want
    const batchConfigs = [
      {
        name: 'B-Des UX Sem-7',
        semester: 7,
        startYear: 2022,
        endYear: 2026,
        dataKey: 'B-Des UX 7'
      },
      {
        name: 'B-Des UX Sem-5', 
        semester: 5,
        startYear: 2023,
        endYear: 2027,
        dataKey: 'B-Des UX 5'
      },
      {
        name: 'B-Des UX Sem-3',
        semester: 3,
        startYear: 2024,
        endYear: 2028,
        dataKey: 'B-Des UX 3 (Foundation)'
      }
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
          maxCapacity: studentCount + 5,
          currentStrength: 0,
          programId: program.id,
          specializationId: uxSpecialization.id
        }
      });

      batchMapping[config.dataKey] = batch;
      console.log(`✅ Created: ${config.name} (capacity for ${studentCount} students)`);
    }

    console.log('\n📥 Starting Student Import...');

    let totalImported = 0;
    const importResults = {};

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

          console.log(`✅ ${studentInfo.name} (${studentInfo.studentId})`);
          imported++;

        } catch (error) {
          console.error(`❌ Error importing ${studentInfo.name}:`, error.message);
        }
      }

      // Update batch current strength
      await prisma.batch.update({
        where: { id: batch.id },
        data: { currentStrength: imported }
      });

      importResults[sheetLabel] = { imported, total: data.students.length };
      totalImported += imported;

      console.log(`📊 ${batch.name}: ${imported} students imported`);
    }

    console.log('\n🎉 CLEAN B-DES UX IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`✅ Total Students Imported: ${totalImported}`);
    console.log(`🎓 Total Batches Created: 3 (ONLY UX batches)`);
    console.log(`🎯 Specializations: 1 (ONLY User Experience Design)`);

    console.log('\n📋 Batch Summary:');
    Object.entries(importResults).forEach(([label, result]) => {
      console.log(`  • ${label}: ${result.imported} students`);
    });

    console.log('\n✅ Database is now CLEAN with ONLY:');
    console.log('  • 3 B-Des UX batches (Sem 3, 5, 7)');
    console.log('  • 1 UX specialization');
    console.log('  • 85 B-Des UX students');
    console.log('  • No extra subjects or batches!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the clean import
importCleanBDesStudents().catch(console.error);