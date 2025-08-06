const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyWeeks3to7Data() {
  console.log('🔍 Verifying Weeks 3-7 data...');
  
  // Check total entries now
  const totalEntries = await prisma.timetableEntry.count({
    where: { batchId: 'cmdyt7d8e0003ng6fopxswmfo' }
  });
  console.log(`📊 Total timetable entries: ${totalEntries}`);
  
  // Check date range
  const entries = await prisma.timetableEntry.findMany({
    where: {
      batchId: 'cmdyt7d8e0003ng6fopxswmfo',
      date: {
        gte: new Date('2025-08-04'),
        lte: new Date('2025-09-05')
      }
    },
    select: {
      date: true,
      subject: { select: { name: true } },
      faculty: { select: { name: true } },
      customEventTitle: true,
      customEventColor: true
    }
  });
  
  console.log(`📅 Entries for Weeks 3-7: ${entries.length}`);
  
  // Group by date
  const byDate = entries.reduce((acc, entry) => {
    const date = entry.date.toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});
  
  // Show sample data for each week
  const weeks = [
    { name: 'Week 3', dates: ['2025-08-04', '2025-08-08'] },
    { name: 'Week 4', dates: ['2025-08-11', '2025-08-14'] },
    { name: 'Week 5', dates: ['2025-08-18', '2025-08-22'] },
    { name: 'Week 6', dates: ['2025-08-25', '2025-08-29'] },
    { name: 'Week 7', dates: ['2025-09-01', '2025-09-05'] }
  ];
  
  weeks.forEach(week => {
    console.log(`\n📆 ${week.name}:`);
    week.dates.forEach(date => {
      if (byDate[date]) {
        console.log(`  ${date}: ${byDate[date].length} entries`);
        const sampleEntry = byDate[date][0];
        if (sampleEntry.subject) {
          console.log(`    Example: ${sampleEntry.subject.name} - ${sampleEntry.faculty.name}`);
        } else if (sampleEntry.customEventTitle) {
          console.log(`    Example: ${sampleEntry.customEventTitle} (Custom Event)`);
        }
      }
    });
  });
  
  // Check holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date('2025-08-15'),
        lte: new Date('2025-08-27')
      }
    }
  });
  
  console.log(`\n🎊 Holidays added:`);
  holidays.forEach(h => {
    console.log(`  ${h.name} - ${h.date.toISOString().split('T')[0]} (${h.type})`);
  });
  
  // Check custom events
  const customEvents = entries.filter(e => e.customEventTitle);
  console.log(`\n🎨 Custom events summary:`);
  const eventTypes = [...new Set(customEvents.map(e => e.customEventTitle))];
  eventTypes.forEach(type => {
    const count = customEvents.filter(e => e.customEventTitle === type).length;
    console.log(`  ${type}: ${count} sessions`);
  });
  
  await prisma.$disconnect();
}

verifyWeeks3to7Data();