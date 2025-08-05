const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function importWeek1Data() {
  try {
    console.log('🚀 Starting Week 1 timetable import...')
    
    // Get the B.Des Semester 7 batch
    const batch = await db.batch.findFirst({
      where: {
        name: 'B.Des Semester 7',
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
      console.error('❌ B.Des Semester 7 batch not found')
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

    // Week 1 Schedule Data (July 21-25, 2025)
    const week1Schedule = [
      {
        date: '2025-07-21', // Monday
        dayOfWeek: 'MONDAY',
        events: [
          {
            title: 'ORIENTATION',
            color: '#3b82f6', // Blue
            allSlots: true
          }
        ]
      },
      {
        date: '2025-07-22', // Tuesday  
        dayOfWeek: 'TUESDAY',
        events: [
          {
            title: 'ORIENTATION',
            color: '#3b82f6', // Blue
            allSlots: true
          }
        ]
      },
      {
        date: '2025-07-23', // Wednesday
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
        date: '2025-07-24', // Thursday
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
        date: '2025-07-25', // Friday
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

    // Clear existing entries for Week 1 dates
    console.log('🧹 Clearing existing Week 1 entries...')
    const week1Dates = week1Schedule.map(day => new Date(day.date))
    
    await db.timetableEntry.deleteMany({
      where: {
        batchId: batch.id,
        date: {
          in: week1Dates
        }
      }
    })

    let totalCreated = 0

    // Create entries for each day
    for (const daySchedule of week1Schedule) {
      console.log(`📅 Processing ${daySchedule.dayOfWeek} (${daySchedule.date})...`)
      
      for (const event of daySchedule.events) {
        if (event.allSlots) {
          // Create entry for all time slots
          for (const timeSlot of timeSlots) {
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

    console.log(`\n🎉 Week 1 import completed successfully!`)
    console.log(`📊 Summary:`)
    console.log(`   • Batch: ${batch.name}`)
    console.log(`   • Days processed: ${week1Schedule.length}`)
    console.log(`   • Total entries created: ${totalCreated}`)
    console.log(`   • Time slots per day: ${timeSlots.length}`)
    console.log(`\n📋 Schedule Overview:`)
    console.log(`   • July 21-22 (Mon-Tue): ORIENTATION`)
    console.log(`   • July 23-25 (Wed-Fri): Field Research Project`)

  } catch (error) {
    console.error('❌ Error importing Week 1 data:', error)
  } finally {
    await db.$disconnect()
  }
}

importWeek1Data()