const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importBDesStudents() {
  try {
    console.log('🚀 Starting B-Des UX Student Import Process...\n');

    // Read the final student data
    const studentData = JSON.parse(fs.readFileSync('bdes-final-students.json', 'utf8'));

    // Check existing database structure
    console.log('🔍 Checking existing database structure...');

    // Get existing university
    const university = await prisma.university.findFirst();
    if (!university) {
      throw new Error('No university found in database. Please run seed script first.');
    }
    console.log(`✅ Using university: ${university.name}`);

    // Get or find the Design Department (likely already exists)
    let department = await prisma.department.findFirst({
      where: { 
        OR: [
          { name: { contains: 'Design' } },
          { shortName: { contains: 'Design' } }
        ]
      }
    });

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'Jagran School of Design',
          shortName: 'JSD',
          description: 'School of Design offering UX, Animation, and Graphics programs',
          universityId: university.id
        }
      });
      console.log('✅ Created Design Department');
    } else {
      console.log(`✅ Using existing department: ${department.name}`);
    }

    // Get or create Bachelor of Design UX Program
    let program = await prisma.program.findFirst({
      where: { 
        AND: [
          { name: { contains: 'Bachelor' } },
          { name: { contains: 'Design' } },
          { departmentId: department.id }
        ]
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
    } else {
      console.log(`✅ Using existing program: ${program.name}`);
    }

    // Get or create UX Specialization
    let specialization = await prisma.specialization.findFirst({
      where: { 
        AND: [
          { shortName: { contains: 'UX' } },
          { programId: program.id }
        ]
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
    } else {
      console.log(`✅ Using existing specialization: ${specialization.name}`);
    }

    console.log('\n📋 Setting up Batches...');

    // Create/get batches for each semester
    const batchMapping = {};

    for (const [sheetLabel, data] of Object.entries(studentData)) {
      const semester = data.semester;
      let batchName, startYear, endYear;

      // Calculate batch years based on semester
      if (semester === 7) {
        // 4th year students (2022 batch)
        startYear = 2022;
        endYear = 2026;
        batchName = `B-Des UX 2022-26 Sem-${semester}`;
      } else if (semester === 5) {
        // 3rd year students (2023 batch)  
        startYear = 2023;
        endYear = 2027;
        batchName = `B-Des UX 2023-27 Sem-${semester}`;
      } else if (semester === 3) {
        // 2nd year students (2024 batch)
        startYear = 2024;
        endYear = 2028;
        batchName = `B-Des UX 2024-28 Sem-${semester}`;
      }

      let batch = await prisma.batch.findFirst({
        where: { 
          name: batchName,
          programId: program.id
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
        console.log(`✅ Created batch: ${batchName} (${data.students.length} students)`);
      } else {
        console.log(`✅ Using existing batch: ${batchName}`);
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
          // Check if student already exists by email or student ID
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
            },
            include: { student: true }
          });

          if (existingUser) {
            console.log(`⚠️  Skipping ${studentInfo.name} - already exists (${studentInfo.studentId})`);
            skipped++;
            continue;
          }

          // Create user first (NextAuth handles authentication)
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
          skipped++;
        }
      }

      importResults[sheetLabel] = { imported, skipped, total: data.students.length };
      totalImported += imported;
      totalSkipped += skipped;

      console.log(`📊 ${sheetLabel}: ${imported} imported, ${skipped} skipped`);
    }

    console.log('\n🎉 B-DES UX STUDENT IMPORT COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`✅ Total Imported: ${totalImported} students`);
    console.log(`⚠️  Total Skipped: ${totalSkipped} students`);
    console.log(`📋 Total Processed: ${totalImported + totalSkipped} students`);

    console.log('\n📋 Detailed Results:');
    Object.entries(importResults).forEach(([label, result]) => {
      console.log(`  • ${label}: ${result.imported}/${result.total} imported (${result.skipped} skipped)`);
    });

    console.log('\n🔐 Authentication Information:');
    console.log('- Students will use NextAuth.js authentication system');
    console.log('- Login with their JLU Official Email via NextAuth providers');
    console.log('\n⚠️  NOTE: System uses NextAuth.js - no default passwords set');

    console.log('\n🎯 Students can now:');
    console.log('  • Sign in to the college management system');
    console.log('  • View their batch and program information');
    console.log('  • Access timetables and attendance records');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBDesStudents().catch(console.error);