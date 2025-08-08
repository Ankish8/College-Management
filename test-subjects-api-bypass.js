// Test bypassing authentication to check the subjects API directly
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

// Simulate the exact API route handler logic
async function testAPI() {
  console.log('=== Testing /api/subjects API Logic ===')
  
  // Simulate request parameters
  const batchId = 'cmdyt7d8e0003ng6fopxswmfo' // B-Des UX Sem-7
  const search = null
  const fields = null // Not 'minimal'
  
  console.log('Request params:')
  console.log('  batchId:', batchId)
  console.log('  search:', search)
  console.log('  fields:', fields)
  
  // Build where clause exactly like API
  const whereClause = {}
  
  if (batchId) {
    whereClause.batchId = batchId
  }

  if (search) {
    whereClause.OR = [
      {
        name: {
          contains: search
        }
      },
      {
        code: {
          contains: search
        }
      }
    ]
  }

  console.log('Where clause:', JSON.stringify(whereClause, null, 2))

  // Check if minimal mode
  const isMinimal = fields === 'minimal'
  console.log('Is minimal mode?', isMinimal)

  try {
    // Execute exact query from API
    const subjects = await db.subject.findMany({
      where: whereClause,
      select: isMinimal ? {
        id: true,
        name: true,
        code: true,
        credits: true,
        primaryFaculty: {
          select: {
            name: true,
          }
        }
      } : {
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

    console.log('\n=== API Query Results ===')
    console.log('Found', subjects.length, 'subjects')
    
    // Check for any isActive filtering that might be hidden
    console.log('\nChecking isActive status:')
    for (let subject of subjects) {
      const fullSubject = await db.subject.findUnique({
        where: { id: subject.id },
        select: { isActive: true, name: true }
      })
      console.log(`  ${subject.name}: isActive = ${fullSubject.isActive}`)
    }
    
    // Return the same way API does
    const apiResponse = subjects
    
    console.log('\n=== Final API Response ===')
    console.log('Would return:', apiResponse.length, 'subjects')
    console.log('Subject names:')
    apiResponse.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (${s.code})`)
      console.log(`      Faculty: ${s.primaryFaculty?.name || 'No faculty'}`)
      console.log(`      Faculty ID: ${s.primaryFacultyId || 'No faculty ID'}`)
    })

    return apiResponse
    
  } catch (error) {
    console.error('Database query error:', error)
    return { error: 'Internal server error' }
  } finally {
    await db.$disconnect()
  }
}

testAPI().catch(console.error)