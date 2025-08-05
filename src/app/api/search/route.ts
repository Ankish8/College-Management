import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, isStudent } from "@/lib/utils/permissions"
import { 
  SearchResponse, 
  SearchResult, 
  SearchFilters,
  StudentSearchData,
  FacultySearchData,
  SubjectSearchData,
  BatchSearchData
} from "@/types/search"

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()
    const types = searchParams.get("types")?.split(",") as SearchFilters["types"]
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        categories: {},
        query: query || "",
        searchTime: Date.now() - startTime
      } as SearchResponse)
    }

    const user = session.user as any
    const userRole = user.role
    const userDepartmentId = user.departmentId

    // Get user's department for scoping results
    const userWithDept = await db.user.findUnique({
      where: { id: user.id },
      select: { departmentId: true, role: true }
    })

    // Admin users can search across all departments
    const departmentId = userWithDept?.departmentId;
    if (!departmentId && userWithDept?.role !== "ADMIN") {
      return NextResponse.json({ error: "User department not found" }, { status: 400 })
    }

    const searchResults: SearchResult[] = []
    const categories: SearchResponse["categories"] = {}

    // Search Students (Admin and Faculty can see all students, Students can see batch-mates)
    if ((!types || types.includes("student")) && (isAdmin(user) || isFaculty(user))) {
      const studentResults = await searchStudents(query, departmentId, limit)
      const transformedStudents = studentResults.map(transformStudentToSearchResult)
      searchResults.push(...transformedStudents)
      if (transformedStudents.length > 0) {
        categories.student = {
          count: transformedStudents.length,
          results: transformedStudents
        }
      }
    }

    // Search Faculty (Admin can see all, Faculty can see colleagues)
    if ((!types || types.includes("faculty")) && (isAdmin(user) || isFaculty(user))) {
      const facultyResults = await searchFaculty(query, departmentId, limit)
      const transformedFaculty = facultyResults.map(transformFacultyToSearchResult)
      searchResults.push(...transformedFaculty)
      if (transformedFaculty.length > 0) {
        categories.faculty = {
          count: transformedFaculty.length,
          results: transformedFaculty
        }
      }
    }

    // Search Subjects (All roles can search subjects)
    if (!types || types.includes("subject")) {
      const subjectResults = await searchSubjects(query, departmentId, userRole, limit)
      const transformedSubjects = subjectResults.map(transformSubjectToSearchResult)
      searchResults.push(...transformedSubjects)
      if (transformedSubjects.length > 0) {
        categories.subject = {
          count: transformedSubjects.length,
          results: transformedSubjects
        }
      }
    }

    // Search Batches (Admin and Faculty can see all)
    if ((!types || types.includes("batch")) && (isAdmin(user) || isFaculty(user))) {
      const batchResults = await searchBatches(query, departmentId, limit)
      const transformedBatches = batchResults.map(transformBatchToSearchResult)
      searchResults.push(...transformedBatches)
      if (transformedBatches.length > 0) {
        categories.batch = {
          count: transformedBatches.length,
          results: transformedBatches
        }
      }
    }

    // Calculate relevance scores and sort results
    const scoredResults = searchResults
      .map(result => ({
        ...result,
        relevanceScore: calculateRelevanceScore(result, query)
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

    // Apply pagination
    const paginatedResults = scoredResults.slice(offset, offset + limit)

    const response: SearchResponse = {
      results: paginatedResults,
      totalCount: searchResults.length,
      categories,
      query,
      searchTime: Date.now() - startTime
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in universal search:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Search helper functions
async function searchStudents(query: string, departmentId: string | null, limit: number): Promise<StudentSearchData[]> {
  const whereClause: any = {};
  
  if (departmentId) {
    whereClause.user = {
      departmentId: departmentId
    };
  }
  
  const results = await db.student.findMany({
    where: {
      ...whereClause,
      OR: [
        { studentId: { contains: query } },
        { rollNumber: { contains: query } },
        { user: { name: { contains: query } } },
        { user: { email: { contains: query } } },
        { guardianName: { contains: query } },
      ]
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          status: true,
        }
      },
      batch: {
        include: {
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
          }
        }
      }
    },
    take: limit,
    orderBy: [
      { user: { status: "desc" } },
      { user: { name: "asc" } },
    ]
  })
  
  return results
}

async function searchFaculty(query: string, departmentId: string | null, limit: number): Promise<FacultySearchData[]> {
  const whereClause: any = {
    role: "FACULTY",
  };
  
  if (departmentId) {
    whereClause.departmentId = departmentId;
  }
  
  const results = await db.user.findMany({
    where: {
      ...whereClause,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { employeeId: { contains: query } },
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      status: true,
      department: {
        select: {
          name: true,
          shortName: true,
        }
      },
      primarySubjects: {
        where: { isActive: true },
        select: {
          name: true,
          code: true,
        },
        take: 3, // Limit for performance
      }
    },
    take: limit,
    orderBy: [
      { status: "desc" },
      { name: "asc" },
    ]
  })
  
  return results
}

async function searchSubjects(query: string, departmentId: string | null, userRole: string, limit: number): Promise<SubjectSearchData[]> {
  const whereClause: any = {};
  
  if (departmentId) {
    whereClause.batch = {
      program: {
        departmentId: departmentId
      }
    };
  }
  
  whereClause.OR = [
    { name: { contains: query } },
    { code: { contains: query } },
    { primaryFaculty: { name: { contains: query } } },
  ]

  const results = await db.subject.findMany({
    where: whereClause,
    include: {
      batch: {
        select: {
          name: true,
          program: {
            select: {
              name: true,
              shortName: true,
            }
          }
        }
      },
      primaryFaculty: {
        select: {
          name: true,
        }
      }
    },
    take: limit,
    orderBy: { createdAt: "desc" }
  })
  
  return results
}

async function searchBatches(query: string, departmentId: string | null, limit: number): Promise<BatchSearchData[]> {
  const whereClause: any = {};
  
  if (departmentId) {
    whereClause.program = {
      departmentId: departmentId
    };
  }
  
  const results = await db.batch.findMany({
    where: {
      ...whereClause,
      OR: [
        { name: { contains: query } },
        { program: { name: { contains: query } } },
        { program: { shortName: { contains: query } } },
        { specialization: { name: { contains: query } } },
      ]
    },
    include: {
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
    },
    take: limit,
    orderBy: [
      { isActive: "desc" },
      { startYear: "desc" },
    ]
  })
  
  return results
}

// Transform functions
function transformStudentToSearchResult(student: StudentSearchData): SearchResult {
  const batchInfo = student.batch.specialization 
    ? `${student.batch.program.shortName} ${student.batch.specialization.shortName}`
    : student.batch.program.shortName

  return {
    id: student.id,
    title: student.user.name || "Unknown Student",
    subtitle: `${student.studentId} • ${student.rollNumber}`,
    description: `${batchInfo} • ${student.batch.name}`,
    type: "student",
    url: `/students`,
    metadata: {
      email: student.user.email,
      status: student.user.status,
      batchName: student.batch.name
    }
  }
}

function transformFacultyToSearchResult(faculty: FacultySearchData): SearchResult {
  const subjectCount = faculty.primarySubjects.length
  const subjectInfo = subjectCount > 0 
    ? faculty.primarySubjects.slice(0, 2).map(s => s.code).join(", ") + (subjectCount > 2 ? "..." : "")
    : "No assigned subjects"

  return {
    id: faculty.id,
    title: faculty.name || "Unknown Faculty",
    subtitle: faculty.employeeId || faculty.email,
    description: `${faculty.department?.shortName || "Unknown Dept"} • ${subjectInfo}`,
    type: "faculty",
    url: `/faculty`,
    metadata: {
      email: faculty.email,
      status: faculty.status,
      subjectCount: subjectCount
    }
  }
}

function transformSubjectToSearchResult(subject: SubjectSearchData): SearchResult {
  return {
    id: subject.id,
    title: subject.name,
    subtitle: `${subject.code} • ${subject.credits} Credits`,
    description: `${subject.batch.program.shortName} • ${subject.primaryFaculty?.name || "No Faculty"}`,
    type: "subject",
    url: `/subjects`,
    metadata: {
      examType: subject.examType,
      subjectType: subject.subjectType,
      batchName: subject.batch.name
    }
  }
}

function transformBatchToSearchResult(batch: BatchSearchData): SearchResult {
  const specializationInfo = batch.specialization ? ` ${batch.specialization.shortName}` : ""
  const activeStatus = batch.isActive ? "Active" : "Inactive"

  return {
    id: batch.id,
    title: batch.name,
    subtitle: `${batch.program.shortName}${specializationInfo} • Semester ${batch.semester}`,
    description: `${batch._count.students} students • ${activeStatus}`,
    type: "batch",
    url: `/batches`,
    metadata: {
      semester: batch.semester,
      year: `${batch.startYear}-${batch.endYear}`,
      isActive: batch.isActive,
      studentCount: batch._count.students
    }
  }
}

// Simple relevance scoring function
function calculateRelevanceScore(result: SearchResult, query: string): number {
  const queryLower = query.toLowerCase()
  let score = 0

  // Exact matches get highest score
  if (result.title.toLowerCase() === queryLower) score += 100
  else if (result.title.toLowerCase().includes(queryLower)) score += 50

  // Subtitle matches
  if (result.subtitle?.toLowerCase().includes(queryLower)) score += 30

  // Description matches
  if (result.description?.toLowerCase().includes(queryLower)) score += 20

  // Title starts with query
  if (result.title.toLowerCase().startsWith(queryLower)) score += 40

  // Boost active/recent items
  if (result.metadata?.status === "ACTIVE") score += 10
  if (result.metadata?.isActive === true) score += 10

  return score
}