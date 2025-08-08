// Check for duplicate Summer Internship entries
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDuplicates() {
  try {
    console.log('🔍 DEBUG: Checking for duplicate Summer Internship entries\n');
    
    // Get Summer Internship subject ID
    const summerInternship = await prisma.subject.findFirst({
      where: { code: 'BDES5-SI' },
      select: { id: true, name: true }
    });
    
    if (!summerInternship) {
      console.log('❌ Summer Internship not found');
      return;
    }
    
    // Get all entries for Summer Internship
    const entries = await prisma.timetableEntry.findMany({
      where: {
        subjectId: summerInternship.id,
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } },
        batch: { select: { name: true } }
      },
      orderBy: [
        { date: 'asc' },
        { dayOfWeek: 'asc' }
      ]
    });
    
    console.log(`📋 All Summer Internship entries (${entries.length}):`);
    entries.forEach((entry, i) => {
      const dateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'recurring';
      const actualDay = entry.date ? 
        ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][entry.date.getDay()] :
        'N/A';
        
      console.log(`\n  ${i+1}. Entry ID: ${entry.id}`);
      console.log(`     Date: ${dateStr}`);
      console.log(`     Stored Day: ${entry.dayOfWeek}`);
      console.log(`     Actual Day: ${actualDay}`);
      console.log(`     Time: ${entry.timeSlot.name}`);
      console.log(`     Batch: ${entry.batch.name}`);
      
      if (entry.date && entry.dayOfWeek !== actualDay) {
        console.log(`     ⚠️  DAY MISMATCH!`);
      }
    });
    
    // Check for what should be the correct schedule
    console.log('\n' + '='.repeat(60));
    console.log('🎯 EXPECTED SUMMER INTERNSHIP SCHEDULE:\n');
    
    console.log('Based on your timetable UI, Summer Internship should be on:');
    console.log('  • Monday Aug 4, 2025 at 9:30 AM');
    console.log('  • Wednesday Aug 6, 2025 at 9:30 AM'); 
    console.log('  • Thursday Aug 7, 2025 at 9:30 AM');
    
    console.log('\n🔧 RECOMMENDED ACTION:');
    console.log('1. Delete the incorrect entries (wrong days)');
    console.log('2. Keep/create the correct entries for the actual schedule');
    
    // Identify which entries to delete/keep
    const correctEntries = [];
    const incorrectEntries = [];
    
    entries.forEach(entry => {
      if (!entry.date) {
        correctEntries.push(entry);
        return;
      }
      
      const actualDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][entry.date.getDay()];
      if (entry.dayOfWeek === actualDay) {
        correctEntries.push(entry);
      } else {
        incorrectEntries.push(entry);
      }
    });
    
    console.log('\n✅ CORRECT ENTRIES TO KEEP:');
    correctEntries.forEach((entry, i) => {
      const dateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'recurring';
      console.log(`  ${i+1}. ${entry.dayOfWeek} ${dateStr} - Keep (ID: ${entry.id})`);
    });
    
    console.log('\n❌ INCORRECT ENTRIES TO DELETE:');
    incorrectEntries.forEach((entry, i) => {
      const dateStr = entry.date ? entry.date.toISOString().split('T')[0] : 'recurring';
      const actualDay = entry.date ? 
        ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][entry.date.getDay()] :
        'N/A';
      console.log(`  ${i+1}. ${entry.dayOfWeek} ${dateStr} (should be ${actualDay}) - DELETE (ID: ${entry.id})`);
    });
    
    if (incorrectEntries.length > 0) {
      console.log('\n🔧 DELETION COMMANDS:');
      incorrectEntries.forEach(entry => {
        console.log(`DELETE FROM timetable_entry WHERE id = '${entry.id}';`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDuplicates();