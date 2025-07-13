import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/lib/test-utils'
import { BatchCard } from '../batch-card'
import type { BatchWithDetails } from '@/types'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/batches',
}))

describe('BatchCard Component', () => {
  const mockBatch: BatchWithDetails = {
    id: 'batch-1',
    name: 'B.Des UX Semester 5',
    semester: 5,
    startYear: 2023,
    endYear: 2027,
    isActive: true,
    semType: 'ODD',
    maxCapacity: 30,
    currentStrength: 25,
    programId: 'prog-1',
    specializationId: 'spec-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    program: {
      id: 'prog-1',
      name: 'Bachelor of Design',
      shortName: 'B.Des',
      duration: 4,
      totalSems: 8,
      programType: 'UNDERGRADUATE',
      departmentId: 'dept-1',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    specialization: {
      id: 'spec-1',
      name: 'User Experience Design',
      shortName: 'UX',
      programId: 'prog-1',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    _count: {
      students: 25,
      subjects: 8,
    },
  }

  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render batch information correctly', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('B.Des UX Semester 5')).toBeInTheDocument()
      expect(screen.getByText('User Experience Design')).toBeInTheDocument()
      expect(screen.getByText('Semester 5')).toBeInTheDocument()
      expect(screen.getByText('2023-2027')).toBeInTheDocument()
      expect(screen.getByText('25/30 Students')).toBeInTheDocument()
      expect(screen.getByText('8 Subjects')).toBeInTheDocument()
    })

    it('should display active status badge', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should display inactive status for inactive batch', () => {
      const inactiveBatch = { ...mockBatch, isActive: false }
      render(
        <BatchCard 
          batch={inactiveBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  describe('Specialization Display', () => {
    it('should display specialization when available', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('User Experience Design')).toBeInTheDocument()
    })

    it('should handle batch without specialization', () => {
      const batchWithoutSpec = { ...mockBatch, specialization: null, specializationId: null }
      render(
        <BatchCard 
          batch={batchWithoutSpec} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('B.Des UX Semester 5')).toBeInTheDocument()
      expect(screen.queryByText('User Experience Design')).not.toBeInTheDocument()
    })
  })

  describe('Student Count Display', () => {
    it('should show current strength when below capacity', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('25/30 Students')).toBeInTheDocument()
    })

    it('should handle batch at full capacity', () => {
      const fullBatch = { ...mockBatch, currentStrength: 30 }
      render(
        <BatchCard 
          batch={fullBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('30/30 Students')).toBeInTheDocument()
    })

    it('should handle batch without capacity limit', () => {
      const batchNoLimit = { ...mockBatch, maxCapacity: null }
      render(
        <BatchCard 
          batch={batchNoLimit} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('25 Students')).toBeInTheDocument()
    })

    it('should handle over-capacity scenario', () => {
      const overCapacityBatch = { ...mockBatch, currentStrength: 35 }
      render(
        <BatchCard 
          batch={overCapacityBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('35/30 Students')).toBeInTheDocument()
    })
  })

  describe('Subject Count Display', () => {
    it('should display correct subject count', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('8 Subjects')).toBeInTheDocument()
    })

    it('should handle batch with no subjects', () => {
      const batchNoSubjects = { 
        ...mockBatch, 
        _count: { ...mockBatch._count, subjects: 0 } 
      }
      render(
        <BatchCard 
          batch={batchNoSubjects} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('0 Subjects')).toBeInTheDocument()
    })

    it('should handle singular subject count', () => {
      const batchOneSubject = { 
        ...mockBatch, 
        _count: { ...mockBatch._count, subjects: 1 } 
      }
      render(
        <BatchCard 
          batch={batchOneSubject} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByText('1 Subject')).toBeInTheDocument()
    })
  })

  describe('Actions Menu', () => {
    it('should open actions menu when dropdown trigger is clicked', async () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const menuTrigger = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuTrigger)

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })
    })

    it('should call onEdit when edit action is clicked', async () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const menuTrigger = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuTrigger)

      await waitFor(() => {
        const editButton = screen.getByText('Edit')
        fireEvent.click(editButton)
      })

      expect(mockOnEdit).toHaveBeenCalledWith(mockBatch)
    })

    it('should call onDelete when delete action is clicked', async () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const menuTrigger = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuTrigger)

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)
      })

      expect(mockOnDelete).toHaveBeenCalledWith(mockBatch)
    })
  })

  describe('Navigation', () => {
    it('should navigate to batch details when card is clicked', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const card = screen.getByRole('article')
      fireEvent.click(card)

      expect(mockPush).toHaveBeenCalledWith('/batches/batch-1')
    })

    it('should not navigate when action menu is clicked', async () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const menuTrigger = screen.getByRole('button', { name: /open menu/i })
      fireEvent.click(menuTrigger)

      // Navigation should not be triggered when clicking menu
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Batch B.Des UX Semester 5')
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('tabIndex', '0')

      // Test keyboard navigation
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(mockPush).toHaveBeenCalledWith('/batches/batch-1')

      jest.clearAllMocks()

      fireEvent.keyDown(card, { key: ' ' })
      expect(mockPush).toHaveBeenCalledWith('/batches/batch-1')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing batch data gracefully', () => {
      const incompleteBatch = {
        ...mockBatch,
        program: null,
        specialization: null,
        _count: null,
      } as any

      expect(() => 
        render(
          <BatchCard 
            batch={incompleteBatch} 
            onEdit={mockOnEdit} 
            onDelete={mockOnDelete} 
          />
        )
      ).not.toThrow()
    })

    it('should handle missing callback functions', () => {
      expect(() => 
        render(
          <BatchCard 
            batch={mockBatch} 
            onEdit={undefined as any} 
            onDelete={undefined as any} 
          />
        )
      ).not.toThrow()
    })
  })

  describe('Visual Styling', () => {
    it('should apply correct CSS classes for active batch', () => {
      render(
        <BatchCard 
          batch={mockBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const statusBadge = screen.getByText('Active')
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
    })

    it('should apply correct CSS classes for inactive batch', () => {
      const inactiveBatch = { ...mockBatch, isActive: false }
      render(
        <BatchCard 
          batch={inactiveBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const statusBadge = screen.getByText('Inactive')
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800')
    })

    it('should show warning styling when over capacity', () => {
      const overCapacityBatch = { ...mockBatch, currentStrength: 35 }
      render(
        <BatchCard 
          batch={overCapacityBatch} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      const studentCount = screen.getByText('35/30 Students')
      expect(studentCount.closest('div')).toHaveClass('text-amber-600')
    })
  })
})