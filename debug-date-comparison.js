const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDateComparison() {
  try {
    const testDate = '2025-08-01';
    const jsDate = new Date(testDate);
    
    console.log('🗓️ Date comparison debug:');
    console.log('Input date string:', testDate);
    console.log('JavaScript Date object:', jsDate);
    console.log('ISO string:', jsDate.toISOString());
    console.log('Timestamp:', jsDate.getTime());
    
    // Check the actual stored dates
    console.log('\n📊 Checking stored dates in database...');
    const entries = await prisma.timetableEntry.findMany({
      where: {
        facultyId: 'cmdyt1cav0001ngf50c26nouu',
        timeSlotId: 'cmdyszmrz0007ngir9j72o99x',
        dayOfWeek: 'FRIDAY'
      },
      select: {
        id: true,
        date: true
      }
    });
    
    entries.forEach((entry, i) => {
      console.log(`Entry ${i + 1}:`);
      console.log(`  Database date: ${entry.date}`);
      console.log(`  Date type: ${typeof entry.date}`);
      console.log(`  Equals jsDate: ${entry.date?.getTime() === jsDate.getTime()}`);
      console.log(`  ISO comparison: ${entry.date?.toISOString()} vs ${jsDate.toISOString()}`);
    });
    
    // Test the NOT query directly
    console.log('\n🔧 Testing NOT query...');
    const notResults = await prisma.timetableEntry.findMany({
      where: {
        facultyId: 'cmdyt1cav0001ngf50c26nouu',
        timeSlotId: 'cmdyszmrz0007ngir9j72o99x',
        dayOfWeek: 'FRIDAY',
        date: { not: jsDate }
      },
      select: {
        id: true,
        date: true
      }
    });
    
    console.log(`NOT query results: ${notResults.length} entries`);
    notResults.forEach((entry, i) => {
      console.log(`  Entry ${i + 1}: ${entry.date}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDateComparison();