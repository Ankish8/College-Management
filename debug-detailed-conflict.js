const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDetailedConflict() {
  try {
    // Test trying to add Field Research Project on Friday Aug 1st, 11:30-12:30
    const testData = {
      batchId: 'cmdyt7d8e0003ng6fopxswmfo', // B-Des UX Sem-7
      subjectId: 'cmdyt7jx6000fngaff16gwcrs', // Field Research Project
      facultyId: 'cmdyt1cav0001ngf50c26nouu', // Bhawana Jain
      timeSlotId: 'cmdyszmrz0007ngir9j72o99x', // 11:30-12:30
      dayOfWeek: 'FRIDAY',
      date: '2025-08-01'
    };
    
    console.log('🔍 Testing conflict for Friday Aug 1st, 11:30-12:30');
    console.log('📋 Test data:', testData);
    
    // Step 1: Check what exists at this exact time slot
    console.log('\n📊 Step 1: Checking existing entries at this exact slot...');
    const exactMatch = await prisma.timetableEntry.findMany({
      where: {
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
    
    console.log(`Found ${exactMatch.length} entries at this exact slot:`);
    exactMatch.forEach(entry => {
      console.log(`  - ${entry.subject?.name} with ${entry.faculty?.name} for ${entry.batch.name}`);
    });
    
    // Step 2: Check batch conflicts (same batch, same time, any date)
    console.log('\n🎯 Step 2: Checking batch conflicts...');
    const batchConflicts = await prisma.timetableEntry.findMany({
      where: {
        batchId: testData.batchId,
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    console.log(`Found ${batchConflicts.length} batch conflicts:`);
    batchConflicts.forEach(entry => {
      const date = entry.date ? entry.date.toDateString() : 'Recurring';
      console.log(`  - ${entry.subject?.name} with ${entry.faculty?.name} on ${date}`);
    });
    
    // Step 3: Check faculty conflicts (same faculty, same time, any date)
    console.log('\n👩‍🏫 Step 3: Checking faculty conflicts...');
    const facultyConflicts = await prisma.timetableEntry.findMany({
      where: {
        facultyId: testData.facultyId,
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    console.log(`Found ${facultyConflicts.length} faculty conflicts:`);
    facultyConflicts.forEach(entry => {
      const date = entry.date ? entry.date.toDateString() : 'Recurring';
      console.log(`  - ${entry.subject?.name} for ${entry.batch.name} on ${date}`);
    });
    
    // Step 4: Apply the date filter logic
    console.log('\n🔧 Step 4: Testing with date filter logic...');
    
    const dateFilter = {
      OR: [
        { date: null }, // Recurring entries always conflict
        { 
          AND: [
            { date: { not: null } }, // Date-specific entries
            { date: { not: new Date(testData.date) } } // But not the same date
          ]
        }
      ]
    };
    
    const orConditions = [
      { batchId: testData.batchId },
      { facultyId: testData.facultyId }
    ];
    
    const filteredConflicts = await prisma.timetableEntry.findMany({
      where: {
        timeSlotId: testData.timeSlotId,
        dayOfWeek: testData.dayOfWeek,
        isActive: true,
        ...dateFilter,
        OR: orConditions
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    console.log(`\n✅ After applying date filter: ${filteredConflicts.length} conflicts`);
    filteredConflicts.forEach(entry => {
      const date = entry.date ? entry.date.toDateString() : 'Recurring';
      const conflictType = entry.batchId === testData.batchId ? 'BATCH' : 'FACULTY';
      console.log(`  - ${conflictType}: ${entry.subject?.name} for ${entry.batch.name} on ${date}`);
    });
    
    if (filteredConflicts.length === 0) {
      console.log('\n🎉 SUCCESS: No conflicts detected! This should work.');
    } else {
      console.log('\n❌ PROBLEM: Conflicts still detected.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDetailedConflict();