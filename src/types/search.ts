export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  description?: string
  type: SearchResultType
  url: string
  metadata?: Record<string, any>
  relevanceScore?: number
}

export type SearchResultType = 
  | "student" 
  | "faculty" 
  | "subject" 
  | "batch" 
  | "timetable"
  | "program"
  | "specialization"

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  categories: {
    [K in SearchResultType]?: {
      count: number
      results: SearchResult[]
    }
  }
  query: string
  searchTime: number
}

export interface SearchFilters {
  types?: SearchResultType[]
  limit?: number
  offset?: number
}

// Internal types for building search results
export interface StudentSearchData {
  id: string
  studentId: string
  rollNumber: string
  user: {
    name: string | null
    email: string
    status: string
  }
  batch: {
    name: string
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    } | null
  }
}

export interface FacultySearchData {
  id: string
  name: string | null
  email: string
  employeeId?: string | null
  status: string
  department: {
    name: string
    shortName: string
  } | null
  primarySubjects: Array<{
    name: string
    code: string
  }>
}

export interface SubjectSearchData {
  id: string
  name: string
  code: string
  credits: number
  examType: string
  subjectType: string
  batch: {
    name: string
    program: {
      name: string
      shortName: string
    }
  }
  primaryFaculty: {
    name: string | null
  } | null
}

export interface BatchSearchData {
  id: string
  name: string
  semester: number
  startYear: number
  endYear: number
  isActive: boolean
  program: {
    name: string
    shortName: string
  }
  specialization?: {
    name: string
    shortName: string
  } | null
  _count: {
    students: number
  }
}