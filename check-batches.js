const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function checkBatches() {
  try {
    const batches = await db.batch.findMany({
      include: {
        program: true
      }
    })
    
    console.log('Current batches:')
    batches.forEach(batch => {
      console.log(`- ${batch.name} (ID: ${batch.id})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkBatches()