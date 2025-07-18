// Student Filter Types and Interfaces

export type FilterFieldType = 
  | 'name' 
  | 'studentId' 
  | 'rollNumber' 
  | 'email' 
  | 'phone'
  | 'batch' 
  | 'program' 
  | 'specialization' 
  | 'semester'
  | 'status' 
  | 'attendancePercentage' 
  | 'totalAttendanceRecords'
  | 'guardianName' 
  | 'guardianPhone'
  | 'createdAt' 
  | 'dateOfBirth'

export type TextOperator = 'is' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty'
export type NumberOperator = 'equals' | 'greaterThan' | 'lessThan' | 'between' | 'isEmpty' | 'isNotEmpty'
export type SelectOperator = 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty'
export type DateOperator = 'before' | 'after' | 'between' | 'isEmpty' | 'isNotEmpty'
export type MultiSelectOperator = 'includes' | 'excludes' | 'isEmpty' | 'isNotEmpty'

export type FilterOperator = TextOperator | NumberOperator | SelectOperator | DateOperator | MultiSelectOperator

export type FilterValueType = 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'percentage' | 'boolean'

export interface FilterFieldConfig {
  label: string
  type: FilterValueType
  operators: FilterOperator[]
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  multiple?: boolean
  min?: number
  max?: number
}

export interface FilterCriteria {
  id: string
  field: FilterFieldType
  operator: FilterOperator
  value: string | string[] | number | boolean | { from: string | number; to: string | number }
}

export type LogicalOperator = 'AND' | 'OR'

export interface StudentFilterState {
  criteria: FilterCriteria[]
  searchQuery: string
  selectedBatch: string
  appliedFilters: FilterCriteria[]
  logicalOperator: LogicalOperator
}

// Field configuration mapping
export const FILTER_FIELD_CONFIG: Record<FilterFieldType, FilterFieldConfig> = {
  name: {
    label: 'Student Name',
    type: 'text',
    operators: ['is', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter student name'
  },
  studentId: {
    label: 'Student ID',
    type: 'text',
    operators: ['is', 'contains', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter student ID'
  },
  rollNumber: {
    label: 'Roll Number',
    type: 'text',
    operators: ['is', 'contains', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter roll number'
  },
  email: {
    label: 'Email',
    type: 'text',
    operators: ['is', 'contains', 'endsWith', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter email address'
  },
  phone: {
    label: 'Phone Number',
    type: 'text',
    operators: ['is', 'contains', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter phone number'
  },
  batch: {
    label: 'Batch',
    type: 'select',
    operators: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
    options: [] // Will be populated dynamically
  },
  program: {
    label: 'Program',
    type: 'select',
    operators: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
    options: [] // Will be populated dynamically
  },
  specialization: {
    label: 'Specialization',
    type: 'select',
    operators: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
    options: [] // Will be populated dynamically
  },
  semester: {
    label: 'Semester',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'between'],
    min: 1,
    max: 8
  },
  status: {
    label: 'Status',
    type: 'select',
    operators: ['is', 'isNot'],
    options: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'SUSPENDED', label: 'Suspended' }
    ]
  },
  attendancePercentage: {
    label: 'Attendance Percentage',
    type: 'percentage',
    operators: ['equals', 'greaterThan', 'lessThan', 'between'],
    min: 0,
    max: 100
  },
  totalAttendanceRecords: {
    label: 'Total Sessions',
    type: 'number',
    operators: ['equals', 'greaterThan', 'lessThan', 'between'],
    min: 0
  },
  guardianName: {
    label: 'Guardian Name',
    type: 'text',
    operators: ['is', 'contains', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter guardian name'
  },
  guardianPhone: {
    label: 'Guardian Phone',
    type: 'text',
    operators: ['is', 'contains', 'isEmpty', 'isNotEmpty'],
    placeholder: 'Enter guardian phone'
  },
  createdAt: {
    label: 'Enrolled Date',
    type: 'date',
    operators: ['before', 'after', 'between']
  },
  dateOfBirth: {
    label: 'Date of Birth',
    type: 'date',
    operators: ['before', 'after', 'between', 'isEmpty', 'isNotEmpty']
  }
}

// Operator labels for UI display
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  // Text operators
  'is': 'is',
  'contains': 'contains',
  'startsWith': 'starts with',
  'endsWith': 'ends with',
  'isEmpty': 'is empty',
  'isNotEmpty': 'is not empty',
  
  // Number operators
  'equals': 'equals',
  'greaterThan': 'greater than',
  'lessThan': 'less than',
  'between': 'between',
  
  // Select operators
  'isNot': 'is not',
  
  // Date operators
  'before': 'before',
  'after': 'after',
  
  // Multi-select operators
  'includes': 'includes',
  'excludes': 'excludes'
}

// Helper functions for filter validation
export function getValidOperators(fieldType: FilterFieldType): FilterOperator[] {
  return FILTER_FIELD_CONFIG[fieldType]?.operators || []
}

export function isValidOperator(fieldType: FilterFieldType, operator: FilterOperator): boolean {
  return getValidOperators(fieldType).includes(operator)
}

export function getFieldConfig(fieldType: FilterFieldType): FilterFieldConfig | undefined {
  return FILTER_FIELD_CONFIG[fieldType]
}

export function requiresValue(operator: FilterOperator): boolean {
  return !['isEmpty', 'isNotEmpty'].includes(operator)
}

export function requiresRangeValue(operator: FilterOperator): boolean {
  return operator === 'between'
}

// Default filter criteria
export function createEmptyFilterCriteria(): FilterCriteria {
  return {
    id: crypto.randomUUID(),
    field: 'name',
    operator: 'contains',
    value: ''
  }
}