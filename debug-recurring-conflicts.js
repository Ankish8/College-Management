// Debug script to check for recurring entries that might cause conflicts
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRecurringConflicts() {
  try {
    console.log('🔍 Investigating recurring entries that might conflict with Tuesday Design Thinking...\n');
    
    // Check for any recurring TUESDAY entries
    const recurringTuesdayEntries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: 'TUESDAY',
        date: null, // Recurring entries have null date
        isActive: true
      },
      include: {
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        faculty: {
          select: {
            name: true
          }
        },
        batch: {
          select: {
            name: true
          }
        },
        timeSlot: {
          select: {
            name: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    console.log(`📋 Found ${recurringTuesdayEntries.length} recurring TUESDAY entries:`);
    recurringTuesdayEntries.forEach((entry, index) => {
      console.log(`\n--- Recurring Entry ${index + 1} ---`);
      console.log(`📚 Subject: ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`👨‍🏫 Faculty: ${entry.faculty?.name}`);
      console.log(`🎓 Batch: ${entry.batch.name}`);
      console.log(`⏰ Time: ${entry.timeSlot.name}`);
      console.log(`🆔 Entry ID: ${entry.id}`);
      console.log(`📅 Date: ${entry.date} (recurring)`);
    });

    // Check for Design Thinking subject details
    console.log('\n🔍 Checking Design Thinking subject details...');
    const designThinkingSubject = await prisma.subject.findFirst({
      where: {
        code: 'BDES5-DT'
      },
      include: {
        batch: {
          select: {
            name: true,
            id: true
          }
        },
        primaryFaculty: {
          select: {
            name: true,
            id: true
          }
        }
      }
    });

    if (designThinkingSubject) {
      console.log('\n📚 Design Thinking Subject:');
      console.log(`  Name: ${designThinkingSubject.name}`);
      console.log(`  Code: ${designThinkingSubject.code}`);
      console.log(`  Batch: ${designThinkingSubject.batch.name}`);
      console.log(`  Batch ID: ${designThinkingSubject.batchId}`);
      console.log(`  Primary Faculty: ${designThinkingSubject.primaryFaculty?.name}`);
      console.log(`  Faculty ID: ${designThinkingSubject.primaryFacultyId}`);
      console.log(`  Subject ID: ${designThinkingSubject.id}`);
    }

    // Check what would conflict for batch at 9:30 AM on TUESDAY
    console.log('\n🔍 Checking potential conflicts for B-Des UX Sem-5 at 9:30 AM on TUESDAY...');
    
    const batchId = designThinkingSubject?.batchId || 'cmdyt7d8f0005ng6fegxwrq4b';
    const facultyId = designThinkingSubject?.primaryFacultyId || 'cmdyt13z30004ng6fe9zqvdtq';
    
    // Simulate the exact conflict check
    const potentialConflicts = await prisma.timetableEntry.findMany({
      where: {
        timeSlotId: 'cmdyt0mfs0002ngirqisjdayp', // 9:30 AM slot
        dayOfWeek: 'TUESDAY',
        isActive: true,
        OR: [
          { date: null }, // Recurring entries
          { date: new Date('2025-08-05') } // Specific date
        ]
      },
      include: {
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        faculty: {
          select: {
            name: true
          }
        },
        batch: {
          select: {
            name: true
          }
        },
        timeSlot: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`\n📊 Potential conflicts at 9:30 AM TUESDAY: ${potentialConflicts.length}`);
    potentialConflicts.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`   Faculty: ${entry.faculty?.name}`);
      console.log(`   Batch: ${entry.batch.name}`);
      console.log(`   Batch ID: ${entry.batchId}`);
      console.log(`   Faculty ID: ${entry.facultyId}`);
      console.log(`   Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`   Entry ID: ${entry.id}`);
      
      // Check if this would conflict
      const batchConflict = entry.batchId === batchId;
      const facultyConflict = entry.facultyId === facultyId;
      
      if (batchConflict) {
        console.log(`   ⚠️ BATCH CONFLICT - Same batch!`);
      }
      if (facultyConflict) {
        console.log(`   ⚠️ FACULTY CONFLICT - Same faculty!`);
      }
    });

    // Check all entries for the specific batch to see their schedule
    console.log('\n📅 Full schedule for B-Des UX Sem-5:');
    const batchSchedule = await prisma.timetableEntry.findMany({
      where: {
        batchId: batchId,
        isActive: true
      },
      include: {
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        timeSlot: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlot: { sortOrder: 'asc' } }
      ]
    });

    const groupedByDay = {};
    batchSchedule.forEach(entry => {
      const key = `${entry.dayOfWeek} - ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`;
      if (!groupedByDay[key]) {
        groupedByDay[key] = [];
      }
      groupedByDay[key].push(entry);
    });

    Object.entries(groupedByDay).forEach(([day, entries]) => {
      console.log(`\n${day}:`);
      entries.forEach(entry => {
        console.log(`  ${entry.timeSlot.name}: ${entry.subject?.name} (${entry.subject?.code})`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRecurringConflicts();