// Test script to debug the frontend API call issue for B.Des Semester 7 subjects

const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

// Simulate the exact API behavior
async function testSubjectsAPI() {
  console.log('=== Simulating /api/subjects API call ===')
  
  // Simulate request URL: /api/subjects?batchId=cmdyt7d8e0003ng6fopxswmfo&include=primaryFaculty
  const batchId = 'cmdyt7d8e0003ng6fopxswmfo'
  const includeParam = 'primaryFaculty'
  
  console.log('Request parameters:')
  console.log('  batchId:', batchId)
  console.log('  include:', includeParam)
  
  // Build whereClause like API does
  const whereClause = {}
  if (batchId) {
    whereClause.batchId = batchId
  }
  
  console.log('\nWhereClause:', whereClause)
  
  // Check if this is minimal (it should NOT be since include=primaryFaculty)
  const fields = null // API gets this from searchParams.get("fields")
  const isMinimal = fields === 'minimal'
  
  console.log('Is minimal?', isMinimal)
  
  // Execute the exact query from the API
  try {
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

    console.log('\nQuery Results:')
    console.log('Found subjects:', subjects.length)
    
    subjects.forEach((subject, i) => {
      console.log(`\n  Subject ${i+1}:`)
      console.log(`    Name: ${subject.name}`)
      console.log(`    Code: ${subject.code}`)
      console.log(`    Credits: ${subject.credits}`)
      console.log(`    Faculty: ${subject.primaryFaculty?.name || 'No faculty'}`)
      console.log(`    Faculty ID: ${subject.primaryFacultyId || 'No faculty ID'}`)
      console.log(`    Active: ${subject.isActive !== false ? 'Yes' : 'No'}`)
    })

    // Simulate frontend transformation
    console.log('\n=== Frontend Transformation ===')
    const transformed = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      facultyId: subject.primaryFacultyId || subject.primaryFaculty?.id,
      facultyName: subject.primaryFaculty?.name || 'No Faculty Assigned'
    }))
    
    console.log('Transformed data for QuickCreatePopup:')
    console.log(JSON.stringify(transformed, null, 2))
    
  } catch (error) {
    console.error('Query Error:', error)
  }
  
  await db.$disconnect()
}

testSubjectsAPI().catch(console.error)