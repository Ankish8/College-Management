// Fix Summer Internship schedule entries
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSummerInternshipSchedule() {
  try {
    console.log('🔧 FIXING: Summer Internship schedule entries\n');
    
    // Get Summer Internship subject info
    const summerInternship = await prisma.subject.findFirst({
      where: { code: 'BDES5-SI' },
      include: {
        batch: { select: { id: true, name: true } },
        primaryFaculty: { select: { id: true, name: true } }
      }
    });
    
    if (!summerInternship) {
      console.log('❌ Summer Internship subject not found');
      return;
    }
    
    // Get 9:30 AM time slot
    const timeSlot = await prisma.timeSlot.findFirst({
      where: { name: '09:30-10:30' }
    });
    
    if (!timeSlot) {
      console.log('❌ 9:30 AM time slot not found');
      return;
    }
    
    console.log('📚 Subject Info:');
    console.log(`  Name: ${summerInternship.name}`);
    console.log(`  Code: ${summerInternship.code}`);
    console.log(`  Subject ID: ${summerInternship.id}`);
    console.log(`  Batch: ${summerInternship.batch.name} (${summerInternship.batchId})`);
    console.log(`  Faculty: ${summerInternship.primaryFaculty?.name} (${summerInternship.primaryFacultyId})`);
    console.log(`  Time Slot: ${timeSlot.name} (${timeSlot.id})`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🗑️  STEP 1: Delete incorrect entries\n');
    
    // Delete the two incorrect entries
    const entriesToDelete = [
      'cme1rjxa8007bngi5723qj9w8', // TUESDAY 2025-08-04 (should be MONDAY)
      'cme1qw1yl0073ngi53djo6p6w'  // THURSDAY 2025-08-06 (should be WEDNESDAY) 
    ];
    
    for (const entryId of entriesToDelete) {
      console.log(`🗑️  Deleting entry: ${entryId}`);
      
      const deletedEntry = await prisma.timetableEntry.delete({
        where: { id: entryId },
        include: {
          timeSlot: { select: { name: true } }
        }
      });
      
      const dateStr = deletedEntry.date ? deletedEntry.date.toISOString().split('T')[0] : 'recurring';
      console.log(`   ✅ Deleted: ${deletedEntry.dayOfWeek} ${dateStr} ${deletedEntry.timeSlot.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('➕ STEP 2: Create missing Monday entry\n');
    
    // Create the missing Monday Aug 4 entry
    const mondayEntry = await prisma.timetableEntry.create({
      data: {
        batchId: summerInternship.batchId,
        subjectId: summerInternship.id,
        facultyId: summerInternship.primaryFacultyId,
        timeSlotId: timeSlot.id,
        dayOfWeek: 'MONDAY',
        date: new Date('2025-08-04'),
        entryType: 'REGULAR',
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } }
      }
    });
    
    console.log(`✅ Created Monday entry: ${mondayEntry.id}`);
    console.log(`   Date: 2025-08-04 (MONDAY)`);
    console.log(`   Time: ${mondayEntry.timeSlot.name}`);
    console.log(`   Subject: Summer Internship`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ STEP 3: Verify final schedule\n');
    
    // Get all Summer Internship entries to verify
    const finalEntries = await prisma.timetableEntry.findMany({
      where: {
        subjectId: summerInternship.id,
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } }
      },
      orderBy: [
        { date: 'asc' }
      ]
    });
    
    console.log(`📋 Final Summer Internship schedule (${finalEntries.length} entries):`);
    finalEntries.forEach((entry, i) => {
      const dateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'recurring';
      const actualDay = entry.date ? 
        ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][entry.date.getDay()] :
        'N/A';
      
      console.log(`\n  ${i+1}. ${entry.dayOfWeek} ${dateStr}`);
      console.log(`     Time: ${entry.timeSlot.name}`);
      console.log(`     Entry ID: ${entry.id}`);
      
      if (entry.date && entry.dayOfWeek === actualDay) {
        console.log(`     ✅ Correct day match`);
      } else if (entry.date) {
        console.log(`     ❌ Day mismatch: stored=${entry.dayOfWeek}, actual=${actualDay}`);
      }
    });
    
    console.log('\n🎉 Summer Internship schedule has been fixed!');
    console.log('\n📋 Expected Attendance History:');
    console.log('  M: 🟡 YELLOW (Monday Aug 4 - class scheduled but not marked)');
    console.log('  T: ⚪ GREY (Tuesday Aug 5 - no Summer Internship, has Design Thinking)');
    console.log('  W: 🟢 GREEN (Wednesday Aug 6 - present, marked as 16/25)');
    console.log('  T: 🟡 YELLOW (Thursday Aug 7 - class scheduled but not marked)');
    console.log('  F: ⚪ GREY (Friday Aug 8 - no classes)');
    
    console.log('\n🔄 Please refresh your attendance page to see the corrected history!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSummerInternshipSchedule();