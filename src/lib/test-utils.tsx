import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

// Mock session data for different user roles
export const mockAdminSession: Session = {
  user: {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@jlu.edu.in',
    role: 'ADMIN',
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    }
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

export const mockFacultySession: Session = {
  user: {
    id: 'faculty-1',
    name: 'Faculty User',
    email: 'faculty@jlu.edu.in',
    role: 'FACULTY',
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    }
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

export const mockStudentSession: Session = {
  user: {
    id: 'student-1',
    name: 'Student User',
    email: 'student@jlu.edu.in',
    role: 'STUDENT',
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    },
    student: {
      id: 'stud-1',
      studentId: 'JLU2024001',
      rollNumber: '24001',
      batchId: 'batch-1'
    }
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

// Create a new QueryClient for each test to ensure isolation
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs in tests
  },
})

// Test wrapper with all necessary providers
interface AllTheProvidersProps {
  children: React.ReactNode
  session?: Session | null
  queryClient?: QueryClient
}

const AllTheProviders = ({ 
  children, 
  session = null,
  queryClient = createTestQueryClient()
}: AllTheProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
  queryClient?: QueryClient
}

const customRender = (
  ui: ReactElement,
  {
    session = null,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session} queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Mock API handlers for testing
export const mockApiHandlers = {
  // Batch API mocks
  getBatches: () => Promise.resolve([
    {
      id: 'batch-1',
      name: 'B.Des Semester 5',
      semester: 5,
      startYear: 2024,
      endYear: 2028,
      isActive: true,
      program: {
        id: 'prog-1',
        name: 'Bachelor of Design',
        shortName: 'B.Des',
        duration: 4
      },
      specialization: {
        id: 'spec-1',
        name: 'Graphic Design',
        shortName: 'GD'
      },
      _count: {
        students: 25,
        subjects: 8
      }
    }
  ]),

  // Student API mocks
  getStudents: () => Promise.resolve([
    {
      id: 'stud-1',
      studentId: 'JLU2024001',
      rollNumber: '24001',
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@jlu.edu.in',
        phone: '+91-9876543210'
      },
      batch: {
        id: 'batch-1',
        name: 'B.Des Semester 5'
      }
    }
  ]),

  // Subject API mocks
  getSubjects: () => Promise.resolve([
    {
      id: 'subj-1',
      name: 'Typography',
      code: 'TYP101',
      credits: 4,
      batchId: 'batch-1',
      primaryFaculty: {
        id: 'fac-1',
        name: 'Dr. Smith',
        email: 'smith@jlu.edu.in'
      }
    }
  ]),

  // Timetable API mocks
  getTimetableEntries: () => Promise.resolve([
    {
      id: 'tt-1',
      dayOfWeek: 'MONDAY',
      date: '2024-01-15',
      entryType: 'REGULAR',
      batch: { id: 'batch-1', name: 'B.Des Semester 5' },
      subject: { id: 'subj-1', name: 'Typography', code: 'TYP101' },
      faculty: { id: 'fac-1', name: 'Dr. Smith' },
      timeSlot: {
        id: 'ts-1',
        name: 'Period 1',
        startTime: '09:15',
        endTime: '10:05',
        duration: 50
      }
    }
  ])
}

// Custom hooks for testing
export const renderHook = <T,>(hook: () => T, options: CustomRenderOptions = {}) => {
  const { session = null, queryClient = createTestQueryClient() } = options
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders session={session} queryClient={queryClient}>
      {children}
    </AllTheProviders>
  )

  return { wrapper }
}

// Mock localStorage for testing
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key])
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
}

// Mock IntersectionObserver for testing
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  })
  
  global.IntersectionObserver = mockIntersectionObserver
}

// Mock ResizeObserver for testing
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn()
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  })
  
  global.ResizeObserver = mockResizeObserver
}

// User event utilities
export { userEvent } from '@testing-library/user-event'

// Re-export everything from testing-library/react
export * from '@testing-library/react'

// Override the default render with our custom render
export { customRender as render }

// Test data generators
export const generateBatchData = (overrides: any = {}) => ({
  id: 'batch-' + Math.random().toString(36).substring(7),
  name: 'Test Batch',
  semester: 5,
  startYear: 2024,
  endYear: 2028,
  isActive: true,
  program: {
    id: 'prog-1',
    name: 'Bachelor of Design',
    shortName: 'B.Des',
    duration: 4
  },
  _count: {
    students: 25,
    subjects: 8
  },
  ...overrides
})

export const generateStudentData = (overrides: any = {}) => ({
  id: 'stud-' + Math.random().toString(36).substring(7),
  studentId: 'JLU2024' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
  rollNumber: '24' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
  user: {
    id: 'user-' + Math.random().toString(36).substring(7),
    name: 'Test Student',
    email: 'test@jlu.edu.in',
    phone: '+91-9876543210'
  },
  batch: {
    id: 'batch-1',
    name: 'B.Des Semester 5'
  },
  ...overrides
})

export const generateSubjectData = (overrides: any = {}) => ({
  id: 'subj-' + Math.random().toString(36).substring(7),
  name: 'Test Subject',
  code: 'TST101',
  credits: 4,
  batchId: 'batch-1',
  primaryFaculty: {
    id: 'fac-1',
    name: 'Test Faculty',
    email: 'faculty@jlu.edu.in'
  },
  ...overrides
})

// Async testing utilities
export const waitForQueryToLoad = async (queryClient: QueryClient, queryKey: any[]) => {
  await queryClient.getQueryCache().find(queryKey)?.promise
}

export const waitForMutationToComplete = async (queryClient: QueryClient) => {
  const mutations = queryClient.getMutationCache().getAll()
  await Promise.all(mutations.map(mutation => mutation.promise))
}