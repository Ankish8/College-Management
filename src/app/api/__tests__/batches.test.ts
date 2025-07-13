import { NextRequest } from 'next/server'
import { GET, POST } from '../batches/route'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    batch: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

describe('/api/batches API Tests', () => {
  const mockAdminSession = {
    user: {
      id: 'admin-1',
      email: 'admin@jlu.edu.in',
      role: 'ADMIN',
      department: { id: 'dept-1' },
    },
  }

  const mockFacultySession = {
    user: {
      id: 'faculty-1',
      email: 'faculty@jlu.edu.in',
      role: 'FACULTY',
      department: { id: 'dept-1' },
    },
  }

  const mockStudentSession = {
    user: {
      id: 'student-1',
      email: 'student@jlu.edu.in',
      role: 'STUDENT',
      department: { id: 'dept-1' },
    },
  }

  const mockBatchData = {
    id: 'batch-1',
    name: 'B.Des UX Semester 5',
    semester: 5,
    startYear: 2023,
    endYear: 2027,
    isActive: true,
    programId: 'prog-1',
    specializationId: 'spec-1',
    program: {
      id: 'prog-1',
      name: 'Bachelor of Design',
      shortName: 'B.Des',
    },
    specialization: {
      id: 'spec-1',
      name: 'User Experience Design',
      shortName: 'UX',
    },
    _count: {
      students: 25,
      subjects: 8,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/batches', () => {
    it('should return batches for authenticated admin user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([mockBatchData])

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([mockBatchData])
      expect(db.batch.findMany).toHaveBeenCalledWith({
        include: {
          program: true,
          specialization: true,
          _count: {
            select: {
              students: true,
              subjects: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return batches for authenticated faculty user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockFacultySession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([mockBatchData])

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalled()
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(db.batch.findMany).not.toHaveBeenCalled()
    })

    it('should return 403 for student users', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockStudentSession)

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)

      expect(response.status).toBe(403)
      expect(db.batch.findMany).not.toHaveBeenCalled()
    })

    it('should handle pagination parameters', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([mockBatchData])
      ;(db.batch.count as jest.Mock).mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/batches?page=2&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
    })

    it('should handle search parameters', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([mockBatchData])

      const request = new NextRequest('http://localhost:3000/api/batches?search=UX')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'UX', mode: 'insensitive' } },
              { program: { name: { contains: 'UX', mode: 'insensitive' } } },
              { specialization: { name: { contains: 'UX', mode: 'insensitive' } } },
            ],
          },
        })
      )
    })

    it('should handle filter parameters', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([mockBatchData])

      const request = new NextRequest('http://localhost:3000/api/batches?program=prog-1&isActive=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            programId: 'prog-1',
            isActive: true,
          },
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch batches')
    })
  })

  describe('POST /api/batches', () => {
    const validBatchData = {
      name: 'B.Des UX Semester 5',
      programId: 'prog-1',
      specializationId: 'spec-1',
      semester: 5,
      startYear: 2023,
      endYear: 2027,
      maxCapacity: 30,
    }

    it('should create batch for admin user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.create as jest.Mock).mockResolvedValue({
        ...validBatchData,
        id: 'new-batch-1',
        isActive: true,
        program: mockBatchData.program,
        specialization: mockBatchData.specialization,
      })

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(validBatchData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-batch-1')
      expect(db.batch.create).toHaveBeenCalledWith({
        data: validBatchData,
        include: {
          program: true,
          specialization: true,
          _count: {
            select: {
              students: true,
              subjects: true,
            },
          },
        },
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(validBatchData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(db.batch.create).not.toHaveBeenCalled()
    })

    it('should return 403 for non-admin users', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockFacultySession)

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(validBatchData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      expect(db.batch.create).not.toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)

      const invalidData = { name: 'Test Batch' } // Missing required fields

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(db.batch.create).not.toHaveBeenCalled()
    })

    it('should validate data types', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)

      const invalidData = {
        ...validBatchData,
        semester: 'invalid', // Should be number
        startYear: 'invalid', // Should be number
      }

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(db.batch.create).not.toHaveBeenCalled()
    })

    it('should validate business rules', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)

      const invalidData = {
        ...validBatchData,
        startYear: 2027,
        endYear: 2023, // End year before start year
      }

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('End year must be after start year')
    })

    it('should handle duplicate batch names', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
      })

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(validBatchData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })

    it('should handle malformed JSON', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(db.batch.create).not.toHaveBeenCalled()
    })

    it('should handle database constraint violations', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.create as jest.Mock).mockRejectedValue({
        code: 'P2003',
        meta: { field_name: 'programId' },
      })

      const request = new NextRequest('http://localhost:3000/api/batches', {
        method: 'POST',
        body: JSON.stringify(validBatchData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid program reference')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle session retrieval errors', async () => {
      ;(getServerSession as jest.Mock).mockRejectedValue(new Error('Session error'))

      const request = new NextRequest('http://localhost:3000/api/batches')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle large dataset pagination', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([])
      ;(db.batch.count as jest.Mock).mockResolvedValue(10000)

      const request = new NextRequest('http://localhost:3000/api/batches?page=100&limit=100')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 9900,
          take: 100,
        })
      )
    })

    it('should sanitize search input to prevent injection', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockAdminSession)
      ;(db.batch.findMany as jest.Mock).mockResolvedValue([])

      const maliciousSearch = `'; DROP TABLE batches; --`
      const request = new NextRequest(`http://localhost:3000/api/batches?search=${encodeURIComponent(maliciousSearch)}`)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: maliciousSearch, mode: 'insensitive' } },
              { program: { name: { contains: maliciousSearch, mode: 'insensitive' } } },
              { specialization: { name: { contains: maliciousSearch, mode: 'insensitive' } } },
            ],
          },
        })
      )
    })
  })
})