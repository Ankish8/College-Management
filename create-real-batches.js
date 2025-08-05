const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function createRealBatches() {
  try {
    console.log('🎓 Creating real B-Des batches...')
    
    // Get program
    const program = await db.program.findFirst({
      where: { shortName: 'B.Des' }
    })
    
    if (!program) {
      throw new Error('B.Des program not found')
    }
    
    // Create Sem 5 batch
    const sem5Batch = await db.batch.upsert({
      where: { id: 'fake-id-to-trigger-create' },
      update: {},
      create: {
        name: 'B-Des UX Sem-5',
        programId: program.id,
        semester: 5,
        startYear: 2024,
        endYear: 2025,
        isActive: true,
        semType: 'ODD',
        maxCapacity: 30,
        currentStrength: 0,
      }
    }).catch(() => {
      // If it fails due to unique constraint, try to find existing
      return db.batch.findFirst({
        where: { name: 'B-Des UX Sem-5' }
      })
    })
    
    // Create Sem 7 batch (but keep the current name mapping)
    const sem7Batch = await db.batch.upsert({
      where: { id: 'fake-id-to-trigger-create-2' },
      update: {},
      create: {
        name: 'B-Des UX Sem-7',
        programId: program.id,
        semester: 7,
        startYear: 2024,
        endYear: 2025,
        isActive: true,
        semType: 'ODD',
        maxCapacity: 30,
        currentStrength: 0,
      }
    }).catch(() => {
      // If it fails, use the existing Semester 7 batch
      return db.batch.findFirst({
        where: { name: 'B.Des Semester 7' }
      })
    })
    
    console.log('✅ Batches ready for subjects')
    console.log(`   - Sem 5: ${sem5Batch?.name || 'Not created'}`)
    console.log(`   - Sem 7: ${sem7Batch?.name || 'Existing B.Des Semester 7'}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

createRealBatches()