// Debug script to investigate Aug 5 Design Thinking conflicts
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAug5Conflicts() {
  try {
    console.log('🔍 Investigating Aug 5 conflicts for Design Thinking...');
    
    // First, let's see all timetable entries for Aug 5
    const aug5Entries = await prisma.timetableEntry.findMany({
      where: {
        date: new Date('2025-08-05')
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
            name: true,
            email: true
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

    console.log(`\n📅 Found ${aug5Entries.length} entries for Aug 5, 2025:`);
    aug5Entries.forEach((entry, index) => {
      console.log(`\n--- Entry ${index + 1} ---`);
      console.log(`📚 Subject: ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`👨‍🏫 Faculty: ${entry.faculty?.name}`);
      console.log(`🎓 Batch: ${entry.batch.name}`);
      console.log(`⏰ Time: ${entry.timeSlot.name} (${entry.timeSlot.startTime} - ${entry.timeSlot.endTime})`);
      console.log(`📍 Day: ${entry.dayOfWeek}`);
      console.log(`🆔 Entry ID: ${entry.id}`);
      console.log(`✅ Active: ${entry.isActive}`);
      console.log(`🗓️ Entry Type: ${entry.entryType}`);
    });

    // Now let's check if there are any Design Thinking entries at all (any date)
    console.log('\n🔍 Checking for Design Thinking entries (all dates)...');
    const designThinkingEntries = await prisma.timetableEntry.findMany({
      where: {
        subject: {
          code: 'BDES5-DT'
        }
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
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`\n📚 Found ${designThinkingEntries.length} Design Thinking entries (all dates):`);
    designThinkingEntries.forEach((entry, index) => {
      console.log(`\n--- DT Entry ${index + 1} ---`);
      console.log(`📅 Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`👨‍🏫 Faculty: ${entry.faculty?.name}`);
      console.log(`🎓 Batch: ${entry.batch.name}`);
      console.log(`⏰ Time: ${entry.timeSlot.name}`);
      console.log(`📍 Day: ${entry.dayOfWeek}`);
      console.log(`✅ Active: ${entry.isActive}`);
      console.log(`🆔 Entry ID: ${entry.id}`);
    });

    // Check faculty availability for Priya Gautam on TUESDAY
    console.log('\n👨‍🏫 Checking Priya Gautam availability on TUESDAY...');
    const priyaEntries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: 'TUESDAY',
        faculty: {
          name: 'Priya Gautam'
        },
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
            name: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: {
        timeSlot: {
          sortOrder: 'asc'
        }
      }
    });

    console.log(`\n📋 Priya Gautam's TUESDAY schedule (${priyaEntries.length} entries):`);
    priyaEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.timeSlot.name}: ${entry.subject?.name} (${entry.subject?.code})`);
      console.log(`   📅 Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
    });

    // Check if there are time slot conflicts for 9:30 AM slot on TUESDAY
    console.log('\n🕘 Checking 9:30 AM slot conflicts on TUESDAY...');
    const morningSlotEntries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: 'TUESDAY',
        timeSlot: {
          name: '9:30 AM - 10:30 AM'
        },
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
        }
      }
    });

    console.log(`\n📋 9:30 AM Tuesday slot entries (${morningSlotEntries.length} entries):`);
    morningSlotEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.subject?.name} - ${entry.faculty?.name} (${entry.batch.name})`);
      console.log(`   📅 Date: ${entry.date ? entry.date.toISOString().split('T')[0] : 'Recurring'}`);
      console.log(`   🆔 ID: ${entry.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAug5Conflicts();