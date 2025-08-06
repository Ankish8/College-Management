const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function importWeek2Data() {
  try {
    console.log('🚀 Starting Week 2 timetable import...')
    console.log('📋 Note: Week 1 data will be preserved exactly as it is')
    
    // Get the B-Des UX Sem-7 batch (real batch name)
    const batch = await db.batch.findFirst({
      where: {
        name: 'B-Des UX Sem-7',
        program: {
          shortName: 'B.Des'
        }
      },
      include: {
        program: {
          include: {
            department: true
          }
        }
      }
    })

    if (!batch) {
      console.error('❌ B-Des UX Sem-7 batch not found')
      return
    }

    console.log(`✅ Found batch: ${batch.name} (ID: ${batch.id})`)

    // Get all time slots
    const timeSlots = await db.timeSlot.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    console.log(`✅ Found ${timeSlots.length} time slots`)
    timeSlots.forEach(slot => {
      console.log(`   - ${slot.name} (${slot.startTime} - ${slot.endTime})`)
    })

    // Verify Week 1 data exists and will be preserved
    const week1Count = await db.timetableEntry.count({
      where: {
        batchId: batch.id,
        date: {
          gte: new Date('2025-07-21'),
          lte: new Date('2025-07-25')
        }
      }
    })

    console.log(`📊 Week 1 entries found: ${week1Count} (will be preserved)`)

    // Week 2 Schedule Data (July 28 - August 1, 2025)
    // Based on the Excel data analysis, Week 2 continues with Field Research Project
    const week2Schedule = [
      {
        date: '2025-07-28', // Monday - Week 2 starts
        dayOfWeek: 'MONDAY',
        events: [
          {
            title: 'Field Research Project',
            color: '#10b981', // Green (same as Week 1 Wed-Fri)
            allSlots: true
          }
        ]
      },
      {
        date: '2025-07-29', // Tuesday
        dayOfWeek: 'TUESDAY',
        events: [
          {
            title: 'Field Research Project',
            color: '#10b981', // Green
            allSlots: true
          }
        ]
      },
      {
        date: '2025-07-30', // Wednesday
        dayOfWeek: 'WEDNESDAY', 
        events: [
          {
            title: 'Field Research Project',
            color: '#10b981', // Green
            allSlots: true
          }
        ]
      },
      {
        date: '2025-07-31', // Thursday
        dayOfWeek: 'THURSDAY',
        events: [
          {
            title: 'Field Research Project', 
            color: '#10b981', // Green
            allSlots: true
          }
        ]
      },
      {
        date: '2025-08-01', // Friday
        dayOfWeek: 'FRIDAY',
        events: [
          {
            title: 'Field Research Project',
            color: '#10b981', // Green
            allSlots: true
          }
        ]
      }
    ]

    // Check if Week 2 data already exists
    const existingWeek2Count = await db.timetableEntry.count({
      where: {
        batchId: batch.id,
        date: {
          gte: new Date('2025-07-28'),
          lte: new Date('2025-08-01')
        }
      }
    })

    if (existingWeek2Count > 0) {
      console.log(`⚠️  Found ${existingWeek2Count} existing Week 2 entries`)
      console.log('🧹 Clearing existing Week 2 entries to avoid duplicates...')
      
      // Clear only Week 2 entries (Week 1 remains untouched)
      const week2Dates = week2Schedule.map(day => new Date(day.date))
      
      await db.timetableEntry.deleteMany({
        where: {
          batchId: batch.id,
          date: {
            in: week2Dates
          }
        }
      })

      console.log('✅ Cleared existing Week 2 entries')
    }

    let totalCreated = 0

    // Create entries for each day in Week 2
    for (const daySchedule of week2Schedule) {
      console.log(`📅 Processing Week 2 - ${daySchedule.dayOfWeek} (${daySchedule.date})...`)
      
      for (const event of daySchedule.events) {
        if (event.allSlots) {
          // Create entry for all time slots (excluding lunch break)
          for (const timeSlot of timeSlots) {
            // Skip lunch breaks or break periods
            if (timeSlot.name.toLowerCase().includes('lunch') || 
                timeSlot.name.toLowerCase().includes('break')) {
              continue
            }

            const entry = await db.timetableEntry.create({
              data: {
                batchId: batch.id,
                timeSlotId: timeSlot.id,
                dayOfWeek: daySchedule.dayOfWeek,
                date: new Date(daySchedule.date),
                entryType: 'REGULAR',
                customEventTitle: event.title,
                customEventColor: event.color,
                isActive: true
              }
            })

            totalCreated++
            console.log(`   ✅ Created: ${event.title} at ${timeSlot.name}`)
          }
        }
      }
    }

    // Final verification
    const finalWeek1Count = await db.timetableEntry.count({
      where: {
        batchId: batch.id,
        date: {
          gte: new Date('2025-07-21'),
          lte: new Date('2025-07-25')
        }
      }
    })

    const finalWeek2Count = await db.timetableEntry.count({
      where: {
        batchId: batch.id,
        date: {
          gte: new Date('2025-07-28'),
          lte: new Date('2025-08-01')
        }
      }
    })

    console.log(`\n🎉 Week 2 import completed successfully!`)
    console.log(`📊 Final Summary:`)
    console.log(`   • Batch: ${batch.name}`)
    console.log(`   • Week 1 entries (preserved): ${finalWeek1Count}`)
    console.log(`   • Week 2 entries (newly created): ${finalWeek2Count}`)
    console.log(`   • Total entries created: ${totalCreated}`)
    console.log(`   • Active time slots per day: ${timeSlots.filter(slot => !slot.name.toLowerCase().includes('lunch') && !slot.name.toLowerCase().includes('break')).length}`)
    
    console.log(`\n📋 Complete Schedule Overview:`)
    console.log(`   🟦 Week 1 (July 21-25):`)
    console.log(`      • July 21-22 (Mon-Tue): ORIENTATION`)
    console.log(`      • July 23-25 (Wed-Fri): Field Research Project`)
    console.log(`   🟢 Week 2 (July 28 - Aug 1):`)
    console.log(`      • July 28 - Aug 1 (Mon-Fri): Field Research Project`)
    console.log(`\n✅ Both weeks are now available in the timetable system`)

  } catch (error) {
    console.error('❌ Error importing Week 2 data:', error)
  } finally {
    await db.$disconnect()
  }
}

importWeek2Data()