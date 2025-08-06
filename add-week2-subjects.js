const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addWeek2AsSubjects() {
  try {
    console.log('🎯 Adding Week 2 as real subject entries...');
    
    // Data from database
    const batchId = 'cmdyt7d8e0003ng6fopxswmfo'; // B-Des UX Sem-7
    const subjectId = 'cmdyt7jx6000fngaff16gwcrs'; // Field Research Project
    const facultyId = 'cmdyt1cav0001ngf50c26nouu'; // Bhawana Jain
    
    // Get all time slots
    const timeSlots = await prisma.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`✅ Found ${timeSlots.length} time slots`);
    
    // Week 2 dates: July 28 - August 1, 2025
    const week2Dates = [
      { date: '2025-07-28', dayOfWeek: 'MONDAY' },
      { date: '2025-07-29', dayOfWeek: 'TUESDAY' },
      { date: '2025-07-30', dayOfWeek: 'WEDNESDAY' },
      { date: '2025-07-31', dayOfWeek: 'THURSDAY' },
      { date: '2025-08-01', dayOfWeek: 'FRIDAY' },
    ];
    
    let totalCreated = 0;
    
    // Create entries for each day
    for (const dayInfo of week2Dates) {
      console.log(`📅 Processing ${dayInfo.dayOfWeek} (${dayInfo.date})...`);
      
      // Create entries for all time slots
      for (const timeSlot of timeSlots) {
        const entry = await prisma.timetableEntry.create({
          data: {
            batchId: batchId,
            subjectId: subjectId,
            facultyId: facultyId,
            timeSlotId: timeSlot.id,
            dayOfWeek: dayInfo.dayOfWeek,
            date: new Date(dayInfo.date),
            entryType: 'REGULAR',
            isActive: true,
            notes: 'Week 2 - Field Research Project',
            // NO custom event fields - this makes it a real subject
          }
        });
        
        console.log(`   ✅ Created: ${timeSlot.name}`);
        totalCreated++;
      }
    }
    
    console.log(`\n🎉 Week 2 added successfully as real subjects!`);
    console.log(`📊 Total entries created: ${totalCreated}`);
    console.log(`👩‍🏫 Faculty: Bhawana Jain`);
    console.log(`📚 Subject: Field Research Project (BDES7-FRP)`);
    console.log(`📅 Dates: July 28 - August 1, 2025`);
    console.log(`\n✅ These will show with faculty name + icon and subject code!`);
    
  } catch (error) {
    console.error('❌ Error adding Week 2:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addWeek2AsSubjects();