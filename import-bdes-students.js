const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function importBDesStudents() {
  try {
    console.log('🚀 Starting B-Des UX Student Import Process...\n');

    // Read the final student data
    const studentData = JSON.parse(fs.readFileSync('bdes-final-students.json', 'utf8'));

    // First, let's check/create the required program and batches
    console.log('📋 Setting up Programs and Batches...');

    // Get or create the Design Department
    let department = await prisma.department.findFirst({
      where: { name: { contains: 'Design' } }
    });

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'Jagran School of Design',
          shortName: 'JSD',
          description: 'School of Design offering UX, Animation, and Graphics programs'
        }
      });
      console.log('✅ Created Design Department');
    }

    // Get or create Bachelor of Design UX Program
    let program = await prisma.program.findFirst({
      where: { 
        name: { contains: 'Bachelor of Design' },
        shortName: { contains: 'B-Des' }
      }
    });

    if (!program) {
      program = await prisma.program.create({
        data: {
          name: 'Bachelor of Design',
          shortName: 'B-Des',
          duration: 4,
          departmentId: department.id
        }
      });
      console.log('✅ Created B-Des Program');
    }

    // Get or create UX Specialization
    let specialization = await prisma.specialization.findFirst({
      where: { 
        name: { contains: 'UX' },
        programId: program.id
      }
    });

    if (!specialization) {
      specialization = await prisma.specialization.create({
        data: {
          name: 'User Experience Design',
          shortName: 'UX',
          programId: program.id
        }
      });
      console.log('✅ Created UX Specialization');
    }

    // Create/get batches for each semester
    const batchMapping = {};
    const currentYear = new Date().getFullYear();

    for (const [sheetLabel, data] of Object.entries(studentData)) {
      const semester = data.semester;
      let batchName, startYear, endYear;

      // Calculate batch years based on semester
      if (semester === 7) {
        // 4th year students (2022 batch)
        startYear = 2022;
        endYear = 2026;
        batchName = `B-Des UX Batch 2022-2026 (Sem ${semester})`;
      } else if (semester === 5) {
        // 3rd year students (2023 batch)  
        startYear = 2023;
        endYear = 2027;
        batchName = `B-Des UX Batch 2023-2027 (Sem ${semester})`;
      } else if (semester === 3) {
        // 2nd year students (2024 batch)
        startYear = 2024;
        endYear = 2028;
        batchName = `B-Des UX Batch 2024-2028 (Sem ${semester})`;
      }

      let batch = await prisma.batch.findFirst({
        where: { 
          name: batchName,
          programId: program.id,
          specializationId: specialization.id
        }
      });

      if (!batch) {
        batch = await prisma.batch.create({
          data: {
            name: batchName,
            semester: semester,
            startYear: startYear,
            endYear: endYear,
            isActive: true,
            maxCapacity: data.students.length + 10, // Add buffer
            programId: program.id,
            specializationId: specialization.id
          }
        });
        console.log(`✅ Created batch: ${batchName}`);
      }

      batchMapping[sheetLabel] = batch;
    }

    console.log('\n📥 Starting Student Import...');

    let totalImported = 0;
    let totalSkipped = 0;
    const importResults = {};

    for (const [sheetLabel, data] of Object.entries(studentData)) {
      console.log(`\n🔄 Processing ${sheetLabel} (${data.students.length} students)...`);
      
      const batch = batchMapping[sheetLabel];
      let imported = 0;
      let skipped = 0;

      for (const studentInfo of data.students) {
        try {
          // Check if student already exists
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: studentInfo.officialEmail },
                { 
                  student: {
                    studentId: studentInfo.studentId
                  }
                }
              ]
            }
          });

          if (existingUser) {
            console.log(`⚠️  Skipping ${studentInfo.name} - already exists`);
            skipped++;
            continue;
          }

          // Generate default password
          const defaultPassword = 'password123';
          const hashedPassword = await bcrypt.hash(defaultPassword, 12);

          // Create user
          const user = await prisma.user.create({
            data: {
              name: studentInfo.name,
              email: studentInfo.officialEmail,
              password: hashedPassword,
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
              batchId: batch.id,
              guardianName: '', // Not provided in Excel
              guardianPhone: '', // Not provided in Excel
              address: '', // Not provided in Excel
              dateOfBirth: null // Not provided in Excel
            }
          });

          console.log(`✅ Imported: ${studentInfo.name} (${studentInfo.studentId})`);
          imported++;

        } catch (error) {
          console.error(`❌ Error importing ${studentInfo.name}:`, error.message);
          skipped++;
        }
      }

      importResults[sheetLabel] = { imported, skipped, total: data.students.length };
      totalImported += imported;
      totalSkipped += skipped;

      console.log(`📊 ${sheetLabel}: ${imported} imported, ${skipped} skipped`);
    }

    console.log('\n🎉 IMPORT COMPLETED!');
    console.log('='.repeat(50));
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`✅ Total Imported: ${totalImported} students`);
    console.log(`⚠️  Total Skipped: ${totalSkipped} students`);
    console.log(`📋 Total Processed: ${totalImported + totalSkipped} students`);

    console.log('\n📋 Per-Batch Summary:');
    Object.entries(importResults).forEach(([label, result]) => {
      console.log(`  ${label}: ${result.imported}/${result.total} imported`);
    });

    console.log('\n🔐 Default Login Credentials:');
    console.log('- Email: [Student Official Email]');
    console.log('- Password: password123');
    console.log('\n⚠️  Students should change their passwords on first login!');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBDesStudents();