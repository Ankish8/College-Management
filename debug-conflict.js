const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugConflict() {
  try {
    // Test data for Thursday 31st July, 11:30-12:30
    const testData = {
      batchId: 'cmdyt7d8e0003ng6fopxswmfo', // B-Des UX Sem-7
      subjectId: 'cmdyt7jx6000fngaff16gwcrs', // Field Research Project
      facultyId: 'cmdyt1cav0001ngf50c26nouu', // Bhawana Jain
      timeSlotId: 'cmdyszmrz0007ngir9j72o99x', // 11:30-12:30
      dayOfWeek: 'THURSDAY',
      date: '2025-07-31'
    };
    
    console.log('🔍 Testing conflict detection for:', testData);
    
    // Build where clause like the API does
    const whereClause = {
      timeSlotId: testData.timeSlotId,
      dayOfWeek: testData.dayOfWeek,
      isActive: true,
      date: new Date(testData.date)
    };
    
    console.log('📋 Where clause:', whereClause);
    
    // Check what entries exist
    const existingEntries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } }
      }
    });
    
    console.log(`\n📊 Found ${existingEntries.length} existing entries:`);
    existingEntries.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.subject?.name} - ${entry.faculty?.name} (${entry.batch.name})`);
      console.log(`     Date: ${entry.date}, Slot: ${entry.timeSlot.name}`);
    });
    
    // Now test with the fixed logic (exact same as API)
    let dateFilter = {}
    if (testData.date) {
      // For date-specific entries, only conflict with recurring entries or different dates
      dateFilter = {
        OR: [
          { date: null }, // Recurring entries always conflict
          { 
            AND: [
              { date: { not: null } }, // Date-specific entries
              { date: { not: new Date(testData.date) } } // But not the same date
            ]
          }
        ]
      }
    } else {
      // For recurring entries, conflict with all entries
      dateFilter = {}
    }
    
    console.log('\n🔧 Testing with fixed date filter...');
    
    const orConditions = [
      { batchId: testData.batchId }, // Batch conflicts
      { facultyId: testData.facultyId } // Faculty conflicts
    ];
    
    const conflictEntries = await prisma.timetableEntry.findMany({
      where: {
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        isActive: true,
        ...dateFilter,
        OR: orConditions
      },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } }
      }
    });
    
    console.log(`\n✅ Conflicts found with fixed logic: ${conflictEntries.length}`);
    conflictEntries.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.subject?.name || entry.customEventTitle} - ${entry.faculty?.name} (${entry.batch.name})`);
      console.log(`     Date: ${entry.date}, Slot: ${entry.timeSlot.name}`);
    });
    
    if (conflictEntries.length === 0) {
      console.log('\n🎉 No conflicts! This should work now.');
    } else {
      console.log('\n❌ Still conflicts detected.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConflict();