import { FilterCriteria, FilterFieldType, FilterOperator, LogicalOperator } from "@/types/student-filters"
import { Student } from "@/types/student"

// Extract field value from student object
function getFieldValue(student: Student, field: FilterFieldType): any {
  switch (field) {
    case 'name':
      return student.user.name
    case 'studentId':
      return student.studentId
    case 'rollNumber':
      return student.rollNumber
    case 'email':
      return student.user.email
    case 'phone':
      return student.user.phone
    case 'batch':
      return student.batch.id // Using ID for exact matching
    case 'program':
      return student.batch.program.shortName
    case 'specialization':
      return student.batch.specialization?.shortName
    case 'semester':
      return student.batch.semester
    case 'status':
      return student.user.status
    case 'attendancePercentage':
      return student.attendancePercentage
    case 'totalAttendanceRecords':
      return student.totalAttendanceRecords
    case 'guardianName':
      return student.guardianName
    case 'guardianPhone':
      return student.guardianPhone
    case 'createdAt':
      return student.user.createdAt
    case 'dateOfBirth':
      return student.dateOfBirth
    default:
      return null
  }
}

// Apply a single filter criteria to a student
function matchesCriteria(student: Student, criteria: FilterCriteria): boolean {
  const fieldValue = getFieldValue(student, criteria.field)
  const { operator, value } = criteria

  // Handle empty/null checks first
  if (operator === 'isEmpty') {
    return fieldValue === null || fieldValue === undefined || fieldValue === ''
  }
  
  if (operator === 'isNotEmpty') {
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
  }

  // If field value is empty/null and operator requires a value, it doesn't match
  if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
    return false
  }

  // Convert values to appropriate types for comparison
  const fieldValueStr = String(fieldValue).toLowerCase()
  const searchValue = String(value).toLowerCase()

  switch (operator) {
    // Text operators
    case 'is':
      return fieldValueStr === searchValue
    
    case 'contains':
      return fieldValueStr.includes(searchValue)
    
    case 'startsWith':
      return fieldValueStr.startsWith(searchValue)
    
    case 'endsWith':
      return fieldValueStr.endsWith(searchValue)

    // Select operators  
    case 'isNot':
      return fieldValueStr !== searchValue

    // Number operators
    case 'equals':
      return Number(fieldValue) === Number(value)
    
    case 'greaterThan':
      return Number(fieldValue) > Number(value)
    
    case 'lessThan':
      return Number(fieldValue) < Number(value)
    
    case 'between':
      if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
        const rangeValue = value as { from: string | number; to: string | number }
        const numFieldValue = Number(fieldValue)
        const fromValue = Number(rangeValue.from)
        const toValue = Number(rangeValue.to)
        return numFieldValue >= fromValue && numFieldValue <= toValue
      }
      return false

    // Date operators
    case 'before':
      return new Date(fieldValue) < new Date(value as string)
    
    case 'after':
      return new Date(fieldValue) > new Date(value as string)

    // Multi-select operators
    case 'includes':
      if (Array.isArray(value)) {
        return value.some(v => fieldValueStr.includes(String(v).toLowerCase()))
      }
      return false
    
    case 'excludes':
      if (Array.isArray(value)) {
        return !value.some(v => fieldValueStr.includes(String(v).toLowerCase()))
      }
      return true

    default:
      return false
  }
}

// Apply all filter criteria to students with logical operator
export function applyFilters(students: Student[], criteria: FilterCriteria[], logicalOperator: LogicalOperator = 'AND'): Student[] {
  if (criteria.length === 0) {
    return students
  }

  return students.filter(student => {
    if (logicalOperator === 'AND') {
      // Student must match ALL criteria (AND logic)
      return criteria.every(criteriaItem => matchesCriteria(student, criteriaItem))
    } else {
      // Student must match at least ONE criteria (OR logic)
      return criteria.some(criteriaItem => matchesCriteria(student, criteriaItem))
    }
  })
}

// Apply search query separately (can be combined with filters)
export function applySearchQuery(students: Student[], searchQuery: string): Student[] {
  if (!searchQuery.trim()) {
    return students
  }

  const query = searchQuery.toLowerCase()
  
  return students.filter(student => {
    return (
      student.user.name.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query) ||
      student.rollNumber.toLowerCase().includes(query) ||
      student.user.email.toLowerCase().includes(query) ||
      student.batch.name.toLowerCase().includes(query) ||
      student.batch.program.name.toLowerCase().includes(query) ||
      student.batch.program.shortName.toLowerCase().includes(query) ||
      (student.batch.specialization?.name.toLowerCase().includes(query)) ||
      (student.batch.specialization?.shortName.toLowerCase().includes(query)) ||
      (student.guardianName?.toLowerCase().includes(query)) ||
      (student.user.phone?.toLowerCase().includes(query)) ||
      (student.guardianPhone?.toLowerCase().includes(query))
    )
  })
}

// Combined filtering function
export function filterStudents(
  students: Student[], 
  criteria: FilterCriteria[], 
  searchQuery: string = '',
  logicalOperator: LogicalOperator = 'AND'
): Student[] {
  let filtered = students

  // Apply search query first (broader filter)
  if (searchQuery.trim()) {
    filtered = applySearchQuery(filtered, searchQuery)
  }

  // Then apply specific filter criteria with logical operator
  if (criteria.length > 0) {
    filtered = applyFilters(filtered, criteria, logicalOperator)
  }

  return filtered
}

// Helper function to validate filter criteria
export function validateFilterCriteria(criteria: FilterCriteria): string[] {
  const errors: string[] = []
  
  if (!criteria.field) {
    errors.push('Field is required')
  }
  
  if (!criteria.operator) {
    errors.push('Operator is required')
  }
  
  // Check if value is required for this operator
  const requiresValue = !['isEmpty', 'isNotEmpty'].includes(criteria.operator)
  
  if (requiresValue) {
    if (criteria.operator === 'between') {
      const value = criteria.value as { from: string | number; to: string | number }
      if (!value || value.from === '' || value.to === '') {
        errors.push('Both from and to values are required for between operator')
      }
    } else if (
      criteria.value === '' || 
      criteria.value === null || 
      criteria.value === undefined
    ) {
      errors.push('Value is required for this operator')
    }
  }
  
  return errors
}

// Helper function to get human-readable filter description
export function getFilterDescription(criteria: FilterCriteria): string {
  const fieldLabels: Record<FilterFieldType, string> = {
    name: 'Student Name',
    studentId: 'Student ID',
    rollNumber: 'Roll Number',
    email: 'Email',
    phone: 'Phone',
    batch: 'Batch',
    program: 'Program',
    specialization: 'Specialization',
    semester: 'Semester',
    status: 'Status',
    attendancePercentage: 'Attendance %',
    totalAttendanceRecords: 'Total Sessions',
    guardianName: 'Guardian Name',
    guardianPhone: 'Guardian Phone',
    createdAt: 'Enrolled Date',
    dateOfBirth: 'Date of Birth'
  }

  const operatorLabels: Record<FilterOperator, string> = {
    is: 'is',
    contains: 'contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
    equals: 'equals',
    greaterThan: 'greater than',
    lessThan: 'less than',
    between: 'between',
    isNot: 'is not',
    before: 'before',
    after: 'after',
    includes: 'includes',
    excludes: 'excludes'
  }

  const field = fieldLabels[criteria.field] || criteria.field
  const operator = operatorLabels[criteria.operator] || criteria.operator

  if (criteria.operator === 'isEmpty' || criteria.operator === 'isNotEmpty') {
    return `${field} ${operator}`
  }

  if (criteria.operator === 'between') {
    const value = criteria.value as { from: string | number; to: string | number }
    return `${field} ${operator} ${value.from} and ${value.to}`
  }

  return `${field} ${operator} "${criteria.value}"`
}