import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFaculty() {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        status: true,
        primarySubjects: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        coFacultySubjects: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    })

    console.log('Current Faculty in Database:')
    console.log('============================')
    faculty.forEach((f, index) => {
      console.log(`\n${index + 1}. ${f.name}`)
      console.log(`   Email: ${f.email}`)
      console.log(`   Employee ID: ${f.employeeId}`)
      console.log(`   Status: ${f.status}`)
      console.log(`   User ID: ${f.id}`)
      
      if (f.primarySubjects.length > 0) {
        console.log(`   Primary Subjects:`)
        f.primarySubjects.forEach(s => {
          console.log(`     - ${s.name} (${s.code})`)
        })
      }
      
      if (f.coFacultySubjects.length > 0) {
        console.log(`   Co-Faculty Subjects:`)
        f.coFacultySubjects.forEach(s => {
          console.log(`     - ${s.name} (${s.code})`)
        })
      }
    })
    
    console.log(`\nTotal Faculty: ${faculty.length}`)
    
  } catch (error) {
    console.error('Error checking faculty:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFaculty()