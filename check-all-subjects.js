const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function checkAllSubjects() {
  try {
    console.log('🔍 Checking ALL subjects in database...\n')
    
    const subjects = await db.subject.findMany({
      include: {
        batch: true,
        primaryFaculty: true
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${subjects.length} subjects total:`)
    subjects.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.name} (${subject.code})`)
      console.log(`   Batch: ${subject.batch.name}`)
      console.log(`   Faculty: ${subject.primaryFaculty?.name || 'No Faculty'}`)
      console.log(`   Active: ${subject.isActive}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkAllSubjects()