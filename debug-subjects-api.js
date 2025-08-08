const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

async function debugSubjectsAPI() {
  console.log('=== Debugging Subjects API for B.Des Semester 7 ===')
  
  const batchId = 'cmdyt7d8e0003ng6fopxswmfo' // B-Des UX Sem-7
  
  console.log('\n1. Testing Batch exists:')
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      program: true,
      specialization: true,
    }
  })
  console.log('Batch found:', batch ? `${batch.name} (${batch.program.name})` : 'NOT FOUND')
  
  console.log('\n2. Testing raw subjects query:')
  const whereClause = { batchId }
  
  const subjects = await db.subject.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      code: true,
      credits: true,
      totalHours: true,
      examType: true,
      subjectType: true,
      description: true,
      batchId: true,
      primaryFacultyId: true,
      coFacultyId: true,
      isActive: true,
      createdAt: true,
      batch: {
        select: {
          id: true,
          name: true,
          semester: true,
          program: {
            select: {
              name: true,
              shortName: true,
            }
          },
          specialization: {
            select: {
              name: true,
              shortName: true,
            }
          },
          _count: {
            select: {
              students: true
            }
          }
        }
      },
      primaryFaculty: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      coFaculty: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      _count: {
        select: {
          attendanceSessions: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  console.log('Raw query result:', subjects.length, 'subjects found')
  subjects.forEach((subject, i) => {
    console.log(`  ${i+1}. ${subject.name} (${subject.code}) - Faculty: ${subject.primaryFaculty?.name || 'NO FACULTY'} - Active: ${subject.isActive}`)
  })
  
  console.log('\n3. Testing active filter:')
  const activeSubjects = subjects.filter(s => s.isActive !== false)
  console.log('Active subjects:', activeSubjects.length)
  
  console.log('\n4. Testing API transformation:')
  const transformed = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    credits: subject.credits,
    facultyId: subject.primaryFacultyId || subject.primaryFaculty?.id,
    facultyName: subject.primaryFaculty?.name || 'No Faculty Assigned'
  }))
  
  console.log('Transformed subjects:')
  transformed.forEach((subject, i) => {
    console.log(`  ${i+1}. ${subject.name} (${subject.code}) - Faculty: ${subject.facultyName} - FacultyId: ${subject.facultyId}`)
  })
  
  await db.$disconnect()
}

debugSubjectsAPI().catch(console.error)