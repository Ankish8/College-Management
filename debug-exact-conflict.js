// Debug the EXACT conflict that's causing the 409 error
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugExactConflict() {
  try {
    console.log('🔍 DEBUG: Finding the exact cause of the 409 conflict\n');
    
    // The exact data being sent to the API (from console logs)
    const requestData = {
      batchId: 'cmdyt7d8f0005ng6fegxwrq4b',
      timeSlotId: 'cmdyszmry0005ngir7acqjxg8', // 09:30-10:30
      dayOfWeek: 'TUESDAY',
      entryType: 'REGULAR',
      date: '2025-08-05',
      subjectId: 'cmdyt7jx00001ngafc1tsur2g', // Design Thinking
      facultyId: 'cmdyt1cay0005ngf5btnuvo18'  // Priyal Gautam
    };
    
    console.log('📨 Request Data (from frontend logs):');
    console.log(JSON.stringify(requestData, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 1: Check for exact duplicates\n');
    
    // Simulate the exact conflict query from checkConflicts function
    const whereClause = {
      timeSlotId: requestData.timeSlotId,
      dayOfWeek: requestData.dayOfWeek,
      isActive: true,
    };
    
    if (requestData.date) {
      whereClause.OR = [
        { date: null }, // Recurring entries always conflict
        { date: new Date(requestData.date) } // Same specific date conflicts
      ];
    }
    
    console.log('🔍 WHERE clause for conflict check:');
    console.log(JSON.stringify(whereClause, null, 2));
    
    const allConflicts = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } },
      }
    });
    
    console.log(`\n📊 Found ${allConflicts.length} potential conflicts:`);
    allConflicts.forEach((entry, i) => {
      console.log(`\n--- Entry ${i+1} ---`);
      console.log(`📚 Subject: ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`👨‍🏫 Faculty: ${entry.faculty?.name}`);
      console.log(`🎓 Batch: ${entry.batch.name}`);
      console.log(`⏰ Time: ${entry.timeSlot.name}`);
      console.log(`📅 Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`🆔 Entry ID: ${entry.id}`);
      console.log(`   Batch ID: ${entry.batchId}`);
      console.log(`   Subject ID: ${entry.subjectId}`);
      console.log(`   Faculty ID: ${entry.facultyId}`);
      
      // Check if this matches our request exactly
      const isExactMatch = entry.batchId === requestData.batchId && 
        entry.subjectId === requestData.subjectId && 
        entry.facultyId === requestData.facultyId;
      
      if (isExactMatch) {
        const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : null;
        const requestDateStr = requestData.date;
        const dateMatches = entryDateStr === requestDateStr;
        
        console.log(`   🔥 BASIC MATCH: YES (same batch + subject + faculty)`);
        console.log(`   📅 DATE MATCH: ${dateMatches ? 'YES' : 'NO'}`);
        console.log(`      Entry date: ${entryDateStr}`);
        console.log(`      Request date: ${requestDateStr}`);
        
        if (dateMatches) {
          console.log(`   ❌ EXACT DUPLICATE DETECTED! This causes 409 error`);
        }
      } else {
        console.log(`   ✅ Not an exact match`);
      }
    });
    
    // Check for the specific exact duplicate logic
    const exactDuplicate = allConflicts.find(entry => {
      const sameBasicInfo = entry.batchId === requestData.batchId && 
        entry.subjectId === requestData.subjectId && 
        entry.facultyId === requestData.facultyId;
      
      if (!sameBasicInfo) return false;
      
      // If this is a date-specific entry, check the date too
      if (requestData.date) {
        const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : null;
        const dataDateStr = requestData.date;
        return entryDateStr === dataDateStr;
      }
      
      // For recurring entries, any match is a duplicate
      return entry.date === null;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 EXACT DUPLICATE ANALYSIS\n');
    
    if (exactDuplicate) {
      console.log('❌ EXACT DUPLICATE FOUND!');
      console.log(`   Entry ID: ${exactDuplicate.id}`);
      console.log(`   Subject: ${exactDuplicate.subject?.name} (${exactDuplicate.subject?.code})`);
      console.log(`   Faculty: ${exactDuplicate.faculty?.name}`);
      console.log(`   Batch: ${exactDuplicate.batch.name}`);
      console.log(`   Date: ${exactDuplicate.date ? exactDuplicate.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`   Time: ${exactDuplicate.timeSlot.name}`);
      console.log('\n🔧 SOLUTION:');
      console.log(`   This entry already exists! You need to either:`);
      console.log(`   1. Delete the existing entry first`);
      console.log(`   2. Use a different time slot`);
      console.log(`   3. Check if this entry should be there`);
      
      console.log('\n💡 DELETE COMMAND:');
      console.log(`   DELETE FROM timetable_entry WHERE id = '${exactDuplicate.id}';`);
    } else {
      console.log('✅ No exact duplicate found');
      console.log('   This suggests the 409 error is coming from a different conflict type');
      console.log('   or there\'s an issue with the API conflict detection logic');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 2: Check all Design Thinking entries\n');
    
    const allDesignThinkingEntries = await prisma.timetableEntry.findMany({
      where: {
        subjectId: requestData.subjectId,
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } },
        batch: { select: { name: true } }
      },
      orderBy: [
        { date: 'asc' },
        { dayOfWeek: 'asc' },
        { timeSlot: { sortOrder: 'asc' } }
      ]
    });
    
    console.log(`🔍 All Design Thinking entries (${allDesignThinkingEntries.length}):`);
    allDesignThinkingEntries.forEach((entry, i) => {
      const isTargetEntry = entry.date && 
        entry.date.toISOString().split('T')[0] === requestData.date &&
        entry.dayOfWeek === requestData.dayOfWeek &&
        entry.timeSlotId === requestData.timeSlotId;
        
      console.log(`  ${i+1}. ${entry.dayOfWeek} ${entry.timeSlot.name} - ${entry.batch.name}${isTargetEntry ? ' ⚠️ TARGET' : ''}`);
      console.log(`     Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`     Entry ID: ${entry.id}`);
      if (isTargetEntry) {
        console.log(`     ❌ THIS IS THE CONFLICTING ENTRY!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugExactConflict();