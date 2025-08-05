const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function checkCurrentData() {
  try {
    console.log('🔍 Checking current database state...\n')
    
    // Check batches
    const batches = await db.batch.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      }
    })
    
    console.log('📚 BATCHES:')
    batches.forEach(batch => {
      console.log(`- ${batch.name} (ID: ${batch.id}) - ${batch._count.students} students`)
    })
    
    // Check subjects
    const subjects = await db.subject.findMany({
      include: {
        batch: true,
        primaryFaculty: true
      }
    })
    
    console.log('\n📖 SUBJECTS:')
    subjects.forEach(subject => {
      console.log(`- ${subject.name} (${subject.code}) - ${subject.batch.name} - ${subject.primaryFaculty?.name || 'No Faculty'}`)
    })
    
    // Check faculty
    const faculty = await db.user.findMany({
      where: { role: 'FACULTY' }
    })
    
    console.log('\n👥 FACULTY:')
    faculty.forEach(f => {
      console.log(`- ${f.name} (${f.email})`)
    })
    
    // Check students by batch
    console.log('\n🎓 STUDENTS BY BATCH:')
    for (const batch of batches) {
      const students = await db.student.findMany({
        where: { batchId: batch.id },
        include: { user: true },
        take: 5 // Just show first 5
      })
      
      console.log(`\n${batch.name}:`)
      if (students.length === 0) {
        console.log('  NO STUDENTS FOUND')
      } else {
        students.forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.user.name} (${student.studentId})`)
        })
        if (students.length === 5) {
          console.log(`  ... and ${batch._count.students - 5} more`)
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.$disconnect()
  }
}

checkCurrentData()