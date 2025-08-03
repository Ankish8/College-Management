#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findConflicts() {
  console.log('🔍 Checking for timetable conflicts...')
  
  // Find duplicate entries for the same batch, time slot, and day
  const batchConflicts = await prisma.timetableEntry.groupBy({
    by: ['batchId', 'timeSlotId', 'dayOfWeek', 'date'],
    where: {
      isActive: true
    },
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  })

  console.log(`📊 Found ${batchConflicts.length} batch conflicts`)

  // Find faculty conflicts (same faculty teaching multiple classes at same time)
  const facultyConflicts = await prisma.timetableEntry.groupBy({
    by: ['facultyId', 'timeSlotId', 'dayOfWeek', 'date'],
    where: {
      isActive: true
    },
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  })

  console.log(`👨‍🏫 Found ${facultyConflicts.length} faculty conflicts`)

  return { batchConflicts, facultyConflicts }
}

async function fixConflicts() {
  const { batchConflicts, facultyConflicts } = await findConflicts()
  
  console.log('\n🔧 Starting conflict resolution...')

  // Fix batch conflicts by keeping the most recent entry
  for (const conflict of batchConflicts) {
    const entries = await prisma.timetableEntry.findMany({
      where: {
        batchId: conflict.batchId,
        timeSlotId: conflict.timeSlotId,
        dayOfWeek: conflict.dayOfWeek,
        date: conflict.date,
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (entries.length > 1) {
      const keepEntry = entries[0] // Keep the most recent
      const deleteEntries = entries.slice(1) // Delete the rest

      console.log(`\n📅 Resolving batch conflict:`)
      console.log(`   Batch: ${keepEntry.batch.name}`)
      console.log(`   Time: ${keepEntry.timeSlot.name} on ${keepEntry.dayOfWeek}`)
      console.log(`   Keeping: ${keepEntry.subject.name}`)
      console.log(`   Removing: ${deleteEntries.map(e => e.subject.name).join(', ')}`)

      // Deactivate duplicate entries instead of deleting
      await prisma.timetableEntry.updateMany({
        where: {
          id: {
            in: deleteEntries.map(e => e.id)
          }
        },
        data: {
          isActive: false
        }
      })
    }
  }

  // Fix faculty conflicts similarly
  for (const conflict of facultyConflicts) {
    const entries = await prisma.timetableEntry.findMany({
      where: {
        facultyId: conflict.facultyId,
        timeSlotId: conflict.timeSlotId,
        dayOfWeek: conflict.dayOfWeek,
        date: conflict.date,
        isActive: true
      },
      include: {
        subject: { select: { name: true } },
        faculty: { select: { name: true } },
        batch: { select: { name: true } },
        timeSlot: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (entries.length > 1) {
      const keepEntry = entries[0] // Keep the most recent
      const deleteEntries = entries.slice(1) // Delete the rest

      console.log(`\n👨‍🏫 Resolving faculty conflict:`)
      console.log(`   Faculty: ${keepEntry.faculty.name}`)
      console.log(`   Time: ${keepEntry.timeSlot.name} on ${keepEntry.dayOfWeek}`)
      console.log(`   Keeping: ${keepEntry.subject.name} (${keepEntry.batch.name})`)
      console.log(`   Removing: ${deleteEntries.map(e => `${e.subject.name} (${e.batch.name})`).join(', ')}`)

      // Deactivate duplicate entries
      await prisma.timetableEntry.updateMany({
        where: {
          id: {
            in: deleteEntries.map(e => e.id)
          }
        },
        data: {
          isActive: false
        }
      })
    }
  }

  console.log('\n✅ Conflict resolution completed!')
}

async function main() {
  try {
    await fixConflicts()
  } catch (error) {
    console.error('❌ Error fixing conflicts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()