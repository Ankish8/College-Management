// Fix incorrect dayOfWeek values in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDayOfWeek() {
  try {
    console.log('🔧 FIXING: Incorrect dayOfWeek values in timetable entries\n');
    
    // Get all timetable entries with dates
    const entriesWithDates = await prisma.timetableEntry.findMany({
      where: {
        date: { not: null },
        isActive: true
      },
      include: {
        subject: { select: { name: true, code: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } }
      }
    });
    
    console.log(`📋 Found ${entriesWithDates.length} date-specific entries to check:`);
    
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const toUpdate = [];
    
    for (const entry of entriesWithDates) {
      const entryDate = new Date(entry.date);
      const actualDayOfWeek = dayNames[entryDate.getDay()];
      const storedDayOfWeek = entry.dayOfWeek;
      
      console.log(`\n📅 Entry: ${entry.subject?.name} on ${entryDate.toISOString().split('T')[0]}`);
      console.log(`   Stored dayOfWeek: ${storedDayOfWeek}`);
      console.log(`   Actual dayOfWeek: ${actualDayOfWeek}`);
      
      if (storedDayOfWeek !== actualDayOfWeek) {
        console.log(`   ⚠️  MISMATCH! Need to update ${storedDayOfWeek} → ${actualDayOfWeek}`);
        toUpdate.push({
          id: entry.id,
          subject: entry.subject?.name,
          date: entryDate.toISOString().split('T')[0],
          oldDayOfWeek: storedDayOfWeek,
          newDayOfWeek: actualDayOfWeek
        });
      } else {
        console.log(`   ✅ Correct`);
      }
    }
    
    if (toUpdate.length === 0) {
      console.log('\n🎉 All entries have correct dayOfWeek values!');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`🔧 UPDATING ${toUpdate.length} entries with incorrect dayOfWeek:\n`);
    
    for (const update of toUpdate) {
      console.log(`📝 Updating: ${update.subject} on ${update.date}`);
      console.log(`   ${update.oldDayOfWeek} → ${update.newDayOfWeek}`);
      
      await prisma.timetableEntry.update({
        where: { id: update.id },
        data: { dayOfWeek: update.newDayOfWeek }
      });
      
      console.log(`   ✅ Updated successfully`);
    }
    
    console.log('\n🎉 All dayOfWeek values have been corrected!');
    
    console.log('\n📋 SUMMARY OF CHANGES:');
    toUpdate.forEach(update => {
      console.log(`  • ${update.subject} (${update.date}): ${update.oldDayOfWeek} → ${update.newDayOfWeek}`);
    });
    
    console.log('\n🔄 Please refresh your attendance page to see the corrected schedule!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDayOfWeek();