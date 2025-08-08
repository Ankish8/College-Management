// Test script to simulate exact conflict check for Tuesday Aug 5
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTuesdayConflict() {
  try {
    console.log('🔍 Testing exact conflict detection for Tuesday Aug 5...\n');
    
    // Data that would be sent for Design Thinking on Tuesday Aug 5
    const testData = {
      batchId: 'cmdyt7d8f0005ng6fegxwrq4b',
      subjectId: 'cmdyt7jx00001ngafc1tsur2g',
      facultyId: 'cmdyt1cay0005ngf5btnuvo18',
      timeSlotId: 'cmdyt0mfs0002ngirqisjdayp', // 9:30 AM
      dayOfWeek: 'TUESDAY',
      date: '2025-08-05'
    };

    console.log('📋 Test Data:');
    console.log('  Batch ID:', testData.batchId);
    console.log('  Subject ID:', testData.subjectId);
    console.log('  Faculty ID:', testData.facultyId);
    console.log('  Time Slot ID:', testData.timeSlotId);
    console.log('  Day:', testData.dayOfWeek);
    console.log('  Date:', testData.date);
    
    // Build the exact same query as checkConflicts function
    const whereClause = {
      timeSlotId: testData.timeSlotId,
      dayOfWeek: testData.dayOfWeek,
      isActive: true,
      OR: [
        { date: null }, // Recurring entries always conflict
        { date: new Date(testData.date) } // Same specific date conflicts
      ]
    };

    console.log('\n🔍 Running conflict query with WHERE clause:');
    console.log(JSON.stringify(whereClause, null, 2));

    // First, check what the query would return
    const allConflicts = await prisma.timetableEntry.findMany({
      where: {
        ...whereClause,
        OR: [
          { batchId: testData.batchId },
          { facultyId: testData.facultyId }
        ]
      },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } },
      }
    });

    console.log(`\n📊 Query returned ${allConflicts.length} potential conflicts:`);
    allConflicts.forEach((entry, index) => {
      console.log(`\n--- Entry ${index + 1} ---`);
      console.log(`  Subject: ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`  Faculty: ${entry.faculty?.name}`);
      console.log(`  Batch: ${entry.batch.name}`);
      console.log(`  Time: ${entry.timeSlot.name}`);
      console.log(`  Day: ${entry.dayOfWeek}`);
      console.log(`  Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`  Entry ID: ${entry.id}`);
      console.log(`  Batch ID: ${entry.batchId}`);
      console.log(`  Faculty ID: ${entry.facultyId}`);
    });

    // Check for exact duplicate
    console.log('\n🔍 Checking for exact duplicates...');
    const exactDuplicate = allConflicts.find(entry => {
      const sameBasicInfo = entry.batchId === testData.batchId && 
        entry.subjectId === testData.subjectId && 
        entry.facultyId === testData.facultyId;
      
      if (!sameBasicInfo) return false;
      
      // If this is a date-specific entry, check the date too
      if (testData.date) {
        const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : null;
        const dataDateStr = testData.date;
        return entryDateStr === dataDateStr;
      }
      
      // For recurring entries, any match is a duplicate
      return entry.date === null;
    });

    if (exactDuplicate) {
      console.log('❌ EXACT DUPLICATE FOUND:', {
        id: exactDuplicate.id,
        subject: exactDuplicate.subject?.name,
        date: exactDuplicate.date ? exactDuplicate.date.toISOString().split('T')[0] : 'Recurring'
      });
    } else {
      console.log('✅ No exact duplicate found');
    }

    // Check for batch conflicts
    const batchConflicts = allConflicts.filter(entry => 
      entry.batchId === testData.batchId && 
      !(entry.subjectId === testData.subjectId && entry.facultyId === testData.facultyId)
    );

    if (batchConflicts.length > 0) {
      console.log(`\n❌ BATCH CONFLICTS (${batchConflicts.length}):`);
      batchConflicts.forEach(c => {
        console.log(`  - ${c.subject?.name} with ${c.faculty?.name}`);
      });
    } else {
      console.log('\n✅ No batch conflicts');
    }

    // Check for faculty conflicts  
    const facultyConflicts = allConflicts.filter(entry => 
      entry.facultyId === testData.facultyId &&
      !(entry.batchId === testData.batchId && entry.subjectId === testData.subjectId)
    );

    if (facultyConflicts.length > 0) {
      console.log(`\n❌ FACULTY CONFLICTS (${facultyConflicts.length}):`);
      facultyConflicts.forEach(c => {
        console.log(`  - ${c.subject?.name} for ${c.batch.name}`);
      });
    } else {
      console.log('\n✅ No faculty conflicts');
    }

    // Now let's check if Aug 5 is actually Tuesday
    const aug5 = new Date('2025-08-05');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`\n📅 Date verification:`);
    console.log(`  Aug 5, 2025 is a ${dayNames[aug5.getDay()]}`);
    console.log(`  Expected: Tuesday`);
    console.log(`  Match: ${dayNames[aug5.getDay()] === 'Tuesday' ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTuesdayConflict();