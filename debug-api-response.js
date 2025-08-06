const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApiResponse() {
  console.log('🔍 Debug: What should the API return vs what it actually returns');
  
  // This simulates the API query that the frontend makes
  const entries = await prisma.timetableEntry.findMany({
    where: { 
      isActive: true,
      batchId: 'cmdyt7d8e0003ng6fopxswmfo'  // B-Des UX Sem-7
    },
    select: {
      id: true,
      date: true,
      dayOfWeek: true,
      subject: { select: { name: true } },
      faculty: { select: { name: true } },
      timeSlot: { select: { name: true } }
    },
    orderBy: [
      { date: 'asc' },
      { dayOfWeek: 'asc' },
      { timeSlot: { sortOrder: 'asc' } }
    ]
  });
  
  console.log(`📊 Total entries returned by API: ${entries.length}`);
  
  // Group by date to see what's missing
  const byDate = entries.reduce((acc, entry) => {
    if (!entry.date) {
      acc['recurring'] = (acc['recurring'] || 0) + 1;
      return acc;
    }
    const dateStr = entry.date.toISOString().split('T')[0];
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});
  
  console.log('📅 Entries by date:');
  Object.entries(byDate).forEach(([date, count]) => {
    console.log(`  ${date}: ${count} entries`);
  });
  
  // Specifically check for Friday Aug 1st
  const fridayAug1 = entries.filter(e => {
    if (!e.date) return false;
    const dateStr = e.date.toISOString().split('T')[0];
    return dateStr === '2025-08-01';
  });
  
  console.log(`\n🔍 Friday Aug 1st entries in API response: ${fridayAug1.length}`);
  fridayAug1.forEach((entry, i) => {
    console.log(`  ${i+1}. ${entry.timeSlot.name}: ${entry.subject?.name || 'No subject'} - ${entry.faculty?.name || 'No faculty'}`);
  });
  
  await prisma.$disconnect();
}

debugApiResponse();