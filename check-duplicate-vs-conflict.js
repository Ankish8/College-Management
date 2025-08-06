const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicateVsConflict() {
  try {
    const testData = {
      batchId: 'cmdyt7d8e0003ng6fopxswmfo', // B-Des UX Sem-7
      subjectId: 'cmdyt7jx6000fngaff16gwcrs', // Field Research Project
      facultyId: 'cmdyt1cav0001ngf50c26nouu', // Bhawana Jain
      timeSlotId: 'cmdyszmrz0007ngir9j72o99x', // 11:30-12:30
      dayOfWeek: 'FRIDAY',
      date: '2025-08-01'
    };
    
    console.log('🔍 Checking if this is duplicate vs conflict detection...');
    
    // Check if this exact entry already exists
    const exactDuplicate = await prisma.timetableEntry.findFirst({
      where: {
        batchId: testData.batchId,
        subjectId: testData.subjectId,
        facultyId: testData.facultyId,
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        date: new Date(testData.date),
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    if (exactDuplicate) {
      console.log('🎯 FOUND EXACT DUPLICATE:');
      console.log(`  ID: ${exactDuplicate.id}`);
      console.log(`  Subject: ${exactDuplicate.subject?.name}`);
      console.log(`  Faculty: ${exactDuplicate.faculty?.name}`);
      console.log(`  Batch: ${exactDuplicate.batch.name}`);
      console.log(`  Date: ${exactDuplicate.date}`);
      console.log('');
      console.log('❌ PROBLEM: You are trying to create an entry that already exists!');
      console.log('💡 SOLUTION: The entry is already in the database. This is duplicate prevention, not conflict detection.');
    } else {
      console.log('✅ No exact duplicate found. This would be a valid new entry.');
      
      // Now check for actual conflicts (different subjects/faculty at same time)
      const actualConflicts = await prisma.timetableEntry.findMany({
        where: {
          batchId: testData.batchId,
          timeSlotId: testData.timeSlotId,
          dayOfWeek: testData.dayOfWeek,
          date: new Date(testData.date),
          isActive: true,
          NOT: {
            AND: [
              { subjectId: testData.subjectId },
              { facultyId: testData.facultyId }
            ]
          }
        },
        include: {
          subject: { select: { name: true } },
          faculty: { select: { name: true } }
        }
      });
      
      if (actualConflicts.length > 0) {
        console.log('⚠️ ACTUAL CONFLICTS (different subject/faculty at same time):');
        actualConflicts.forEach(conflict => {
          console.log(`  - ${conflict.subject?.name} with ${conflict.faculty?.name}`);
        });
      } else {
        console.log('✅ No conflicts. This entry should be allowed.');
      }
    }
    
    // Check what entries exist at this slot
    console.log('\n📊 All entries at this time slot:');
    const allAtSlot = await prisma.timetableEntry.findMany({
      where: {
        batchId: testData.batchId,
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        date: new Date(testData.date),
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } }
      }
    });
    
    allAtSlot.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.subject?.name} with ${entry.faculty?.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateVsConflict();