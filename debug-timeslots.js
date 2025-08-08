// Debug timeslots and actual API calls
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTimeslots() {
  try {
    console.log('🔍 DEBUG: Investigating timeslot data and actual API calls\n');
    
    // Get all timeslots
    const allTimeSlots = await prisma.timeSlot.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log('⏰ All TimeSlots:');
    allTimeSlots.forEach((slot, i) => {
      console.log(`  ${i+1}. ${slot.name} (${slot.startTime}-${slot.endTime})`);
      console.log(`     ID: ${slot.id}`);
      console.log(`     Active: ${slot.isActive}`);
      console.log(`     Sort Order: ${slot.sortOrder}`);
      console.log('');
    });
    
    // Find the 9:30 slot specifically
    const slot930 = allTimeSlots.find(s => 
      s.name.includes('9:30') || 
      s.name.includes('09:30') || 
      s.startTime === '09:30:00' ||
      s.startTime === '9:30:00'
    );
    
    console.log('🎯 9:30 AM Slot Detection:');
    if (slot930) {
      console.log(`✅ Found: ${slot930.name} (ID: ${slot930.id})`);
      console.log(`   Start: ${slot930.startTime}`);
      console.log(`   End: ${slot930.endTime}`);
    } else {
      console.log('❌ No 9:30 AM slot found in database');
      console.log('   Available times:', allTimeSlots.map(s => s.name).join(', '));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Checking actual timetable entries for Tuesday Aug 5\n');
    
    // Check what's actually scheduled on Tuesday Aug 5
    const aug5Entries = await prisma.timetableEntry.findMany({
      where: {
        date: new Date('2025-08-05'),
        isActive: true
      },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true, startTime: true, endTime: true } }
      },
      orderBy: [
        { timeSlot: { sortOrder: 'asc' } }
      ]
    });
    
    console.log(`📅 Entries scheduled for Tuesday Aug 5: ${aug5Entries.length}`);
    aug5Entries.forEach((entry, i) => {
      console.log(`  ${i+1}. ${entry.timeSlot.name}: ${entry.subject?.name}`);
      console.log(`     Faculty: ${entry.faculty?.name}`);
      console.log(`     Batch: ${entry.batch.name}`);
      console.log(`     TimeSlot ID: ${entry.timeSlotId}`);
      console.log(`     Entry ID: ${entry.id}`);
      console.log('');
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Testing with correct TimeSlot ID\n');
    
    // Use the correct timeslot ID for 9:30 AM
    const correctTimeSlotId = slot930?.id;
    
    if (correctTimeSlotId) {
      console.log(`🎯 Using TimeSlot ID: ${correctTimeSlotId}\n`);
      
      // Test Design Thinking with correct timeslot ID
      const designThinkingData = {
        batchId: 'cmdyt7d8f0005ng6fegxwrq4b',
        subjectId: 'cmdyt7jx00001ngafc1tsur2g', // Design Thinking
        facultyId: 'cmdyt1cay0005ngf5btnuvo18', // Priyal Gautam
        timeSlotId: correctTimeSlotId,
        dayOfWeek: 'TUESDAY',
        date: '2025-08-05',
        entryType: 'REGULAR'
      };
      
      console.log('🔴 Design Thinking test data (with correct TimeSlot):');
      console.log(JSON.stringify(designThinkingData, null, 2));
      
      // Run the exact conflict check query
      const whereClause = {
        timeSlotId: correctTimeSlotId,
        dayOfWeek: 'TUESDAY',
        isActive: true,
        OR: [
          { date: null }, // Recurring entries
          { date: new Date('2025-08-05') } // Specific date
        ]
      };
      
      const conflictingEntries = await prisma.timetableEntry.findMany({
        where: whereClause,
        include: {
          subject: { select: { name: true, code: true } },
          faculty: { select: { name: true } },
          batch: { select: { name: true } },
          timeSlot: { select: { name: true } }
        }
      });
      
      console.log(`\n🔍 Conflict check results: ${conflictingEntries.length} entries found`);
      conflictingEntries.forEach((entry, i) => {
        console.log(`  ${i+1}. ${entry.subject?.name} (${entry.subject?.code})`);
        console.log(`     Faculty: ${entry.faculty?.name}`);
        console.log(`     Batch: ${entry.batch.name}`);
        console.log(`     Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
        console.log(`     Batch ID: ${entry.batchId}`);
        console.log(`     Subject ID: ${entry.subjectId}`);
        console.log(`     Faculty ID: ${entry.facultyId}`);
        console.log('');
      });
      
      // Check for exact duplicate
      const exactDuplicate = conflictingEntries.find(entry => {
        const sameBasicInfo = entry.batchId === designThinkingData.batchId && 
          entry.subjectId === designThinkingData.subjectId && 
          entry.facultyId === designThinkingData.facultyId;
        
        if (!sameBasicInfo) return false;
        
        // Check date match for date-specific entries
        const entryDateStr = entry.date ? entry.date.toISOString().split('T')[0] : null;
        const dataDateStr = designThinkingData.date;
        return entryDateStr === dataDateStr;
      });
      
      if (exactDuplicate) {
        console.log('❌ EXACT DUPLICATE FOUND - This explains the 409 error!');
        console.log(`   Entry ID: ${exactDuplicate.id}`);
        console.log(`   Subject: ${exactDuplicate.subject?.name}`);
        console.log(`   Date: ${exactDuplicate.date ? exactDuplicate.date.toISOString().split('T')[0] : 'Recurring'}`);
        
        console.log('\n🔧 SOLUTION:');
        console.log(`   Delete the existing entry with ID: ${exactDuplicate.id}`);
        console.log('   OR use a different time slot');
      } else {
        console.log('✅ No exact duplicate found - 409 error should not occur');
      }
    } else {
      console.log('❌ Cannot test - no 9:30 AM timeslot found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔧 FRONTEND DEBUG INFO');
    console.log('\nTo debug the frontend, check these in browser console:');
    console.log('1. What timeSlot string is being passed to handleQuickCreate?');
    console.log('2. What timeSlotId is being resolved in the API call?');
    console.log('3. Add this to timetable-client.tsx in handleQuickCreate:');
    console.log('   console.log("DEBUG - Creating with:", { subjectId, facultyId, timeSlot, date });');
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTimeslots();