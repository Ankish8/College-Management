import type { Command, CommandCategory, CommandContext, AppContext } from '@/types/command-palette'
import type { CommandActions } from './command-actions'

export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private categories: Map<CommandCategory, Command[]> = new Map()
  private actions: CommandActions | null = null

  constructor(actions?: CommandActions) {
    this.actions = actions || null
    this.initializeCategories()
    this.registerDefaultCommands()
  }

  setActions(actions: CommandActions) {
    this.actions = actions
    this.registerDefaultCommands() // Re-register with new actions
  }

  private initializeCategories() {
    const categories: CommandCategory[] = ['navigation', 'attendance', 'analytics', 'system', 'student', 'session']
    categories.forEach(category => {
      this.categories.set(category, [])
    })
  }

  register(command: Command): void {
    this.commands.set(command.id, command)
    
    const categoryCommands = this.categories.get(command.category) || []
    categoryCommands.push(command)
    this.categories.set(command.category, categoryCommands)
  }

  unregister(commandId: string): void {
    const command = this.commands.get(commandId)
    if (command) {
      this.commands.delete(commandId)
      
      const categoryCommands = this.categories.get(command.category) || []
      const filteredCommands = categoryCommands.filter(cmd => cmd.id !== commandId)
      this.categories.set(command.category, filteredCommands)
    }
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id)
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  getCommandsByCategory(category: CommandCategory): Command[] {
    return this.categories.get(category) || []
  }

  getContextualCommands(context: AppContext): Command[] {
    return this.getAllCommands().filter(command => 
      this.isCommandRelevant(command, context)
    )
  }

  private isCommandRelevant(command: Command, context: AppContext): boolean {
    if (!command.context || command.context.length === 0) {
      return true // Commands without context are always relevant
    }

    return command.context.some(ctx => {
      switch (ctx) {
        case 'detailed-mode':
          return context.currentMode === 'detailed'
        case 'fast-mode':
          return context.currentMode === 'fast'
        case 'predictive-mode':
          return context.currentMode === 'predictive'
        case 'students-selected':
          return context.selectedStudents.length > 0
        case 'cell-focused':
          return context.focusedCell !== null
        case 'unsaved-changes':
          return context.hasUnsavedChanges
        default:
          return true
      }
    })
  }

  private registerDefaultCommands(): void {
    // Clear existing commands
    this.commands.clear()
    this.initializeCategories()

    if (!this.actions) {
      return // No actions available yet
    }

    // Navigation Commands
    this.register({
      id: 'nav-today',
      label: 'Go to Today',
      description: 'Navigate to current date',
      category: 'navigation',
      keywords: ['today', 'current', 'now'],
      action: this.actions.navigateToToday
    })

    this.register({
      id: 'nav-yesterday',
      label: 'Go to Yesterday',
      description: 'Navigate to previous day',
      category: 'navigation',
      keywords: ['yesterday', 'previous', 'back', 'last day'],
      action: this.actions.navigateToYesterday
    })

    this.register({
      id: 'nav-tomorrow',
      label: 'Go to Tomorrow',
      description: 'Navigate to next day',
      category: 'navigation',
      keywords: ['tomorrow', 'next', 'forward', 'next day'],
      action: this.actions.navigateToTomorrow
    })

    this.register({
      id: 'nav-last-monday',
      label: 'Go to Last Monday',
      description: 'Navigate to Monday of previous week',
      category: 'navigation',
      keywords: ['last monday', 'previous week', 'monday'],
      action: this.actions.navigateToLastMonday
    })

    this.register({
      id: 'nav-this-week',
      label: 'Go to This Week',
      description: 'Navigate to start of current week',
      category: 'navigation',
      keywords: ['this week', 'week start', 'monday'],
      action: this.actions.navigateToThisWeekStart
    })

    this.register({
      id: 'nav-last-week',
      label: 'Go to Last Week',
      description: 'Navigate to start of previous week',
      category: 'navigation',
      keywords: ['last week', 'previous week', 'week start'],
      action: this.actions.navigateToLastWeekStart
    })

    this.register({
      id: 'nav-this-month',
      label: 'Go to This Month',
      description: 'Navigate to start of current month',
      category: 'navigation',
      keywords: ['this month', 'month start', 'beginning'],
      action: this.actions.navigateToThisMonth
    })

    this.register({
      id: 'nav-last-month',
      label: 'Go to Last Month',
      description: 'Navigate to start of previous month',
      category: 'navigation',
      keywords: ['last month', 'previous month', 'month start'],
      action: this.actions.navigateToLastMonth
    })

    // Attendance Commands
    this.register({
      id: 'attendance-mark-all-present',
      label: 'Mark All Present',
      description: 'Mark all students as present for current session',
      category: 'attendance',
      keywords: ['mark', 'all', 'present', 'bulk', 'everyone'],
      action: () => this.actions?.markAllStudents('present')
    })

    this.register({
      id: 'attendance-mark-all-absent',
      label: 'Mark All Absent',
      description: 'Mark all students as absent for current session',
      category: 'attendance',
      keywords: ['mark', 'all', 'absent', 'bulk', 'everyone'],
      action: () => this.actions?.markAllStudents('absent')
    })

    this.register({
      id: 'attendance-copy-yesterday',
      label: 'Copy Yesterday',
      description: 'Copy attendance from previous day',
      category: 'attendance',
      keywords: ['copy', 'yesterday', 'previous', 'duplicate'],
      action: this.actions.copyPreviousDay
    })

    // Mode switching
    this.register({
      id: 'mode-detailed',
      label: 'Switch to Detailed Mode',
      description: 'Switch to detailed attendance mode',
      category: 'system',
      keywords: ['detailed', 'mode', 'switch'],
      action: () => this.actions?.setAttendanceMode('detailed')
    })

    this.register({
      id: 'mode-fast',
      label: 'Switch to Fast Mode',
      description: 'Switch to fast attendance mode',
      category: 'system',
      keywords: ['fast', 'mode', 'switch', 'quick'],
      action: () => this.actions?.setAttendanceMode('fast')
    })

    this.register({
      id: 'mode-predictive',
      label: 'Switch to Predictive Mode',
      description: 'Switch to AI-powered predictive mode',
      category: 'system',
      keywords: ['predictive', 'mode', 'switch', 'ai', 'predict', 'smart'],
      action: () => this.actions?.setAttendanceMode('predictive')
    })

    // Analytics Commands
    this.register({
      id: 'analytics-show-absent',
      label: 'Show Absent Students',
      description: 'Filter to show only absent students',
      category: 'analytics',
      keywords: ['show', 'absent', 'filter', 'missing'],
      action: this.actions.showAbsentStudents
    })

    this.register({
      id: 'analytics-attendance-summary',
      label: 'Attendance Summary',
      description: 'Show overall attendance statistics',
      category: 'analytics',
      keywords: ['summary', 'stats', 'statistics', 'overview', 'total'],
      action: this.actions.showAttendanceSummary
    })

    // Student-specific Commands
    this.register({
      id: 'student-find-aarav',
      label: 'Find Aarav Patel',
      description: 'Focus on Aarav Patel (UX23001)',
      category: 'student',
      keywords: ['aarav', 'patel', 'ux23001', 'student-1'],
      action: () => this.actions?.focusStudent('student-1')
    })

    this.register({
      id: 'student-find-diya',
      label: 'Find Diya Sharma',
      description: 'Focus on Diya Sharma (UX23002)',
      category: 'student',
      keywords: ['diya', 'sharma', 'ux23002', 'student-2'],
      action: () => this.actions?.focusStudent('student-2')
    })

    this.register({
      id: 'student-find-arjun',
      label: 'Find Arjun Singh',
      description: 'Focus on Arjun Singh (UX23003)',
      category: 'student',
      keywords: ['arjun', 'singh', 'ux23003', 'student-3'],
      action: () => this.actions?.focusStudent('student-3')
    })

    this.register({
      id: 'student-find-ananya',
      label: 'Find Ananya Gupta',
      description: 'Focus on Ananya Gupta (UX23004)',
      category: 'student',
      keywords: ['ananya', 'gupta', 'ux23004', 'student-4'],
      action: () => this.actions?.focusStudent('student-4')
    })

    this.register({
      id: 'student-find-vivaan',
      label: 'Find Vivaan Verma',
      description: 'Focus on Vivaan Verma (UX23005)',
      category: 'student',
      keywords: ['vivaan', 'verma', 'ux23005', 'student-5'],
      action: () => this.actions?.focusStudent('student-5')
    })

    this.register({
      id: 'student-find-ishika',
      label: 'Find Ishika Reddy',
      description: 'Focus on Ishika Reddy (UX23006)',
      category: 'student',
      keywords: ['ishika', 'reddy', 'ux23006', 'student-6'],
      action: () => this.actions?.focusStudent('student-6')
    })

    this.register({
      id: 'student-find-advait',
      label: 'Find Advait Kumar',
      description: 'Focus on Advait Kumar (UX23007)',
      category: 'student',
      keywords: ['advait', 'kumar', 'ux23007', 'student-7'],
      action: () => this.actions?.focusStudent('student-7')
    })

    // Filter Commands
    this.register({
      id: 'filter-present-students',
      label: 'Filter Present Students',
      description: 'Show only students marked as present',
      category: 'analytics',
      keywords: ['filter', 'present', 'attending', 'here'],
      action: () => this.actions?.filterByAttendance('present')
    })

    this.register({
      id: 'filter-absent-students',
      label: 'Filter Absent Students',
      description: 'Show only students marked as absent',
      category: 'analytics',
      keywords: ['filter', 'absent', 'missing', 'not here'],
      action: () => this.actions?.filterByAttendance('absent')
    })

    this.register({
      id: 'filter-medical-students',
      label: 'Filter Medical Leave Students',
      description: 'Show only students on medical leave',
      category: 'analytics',
      keywords: ['filter', 'medical', 'leave', 'sick'],
      action: () => this.actions?.filterByAttendance('medical')
    })

    // System Commands
    this.register({
      id: 'system-save',
      label: 'Save Changes',
      description: 'Save current attendance data',
      category: 'system',
      keywords: ['save', 'commit'],
      action: this.actions.saveChanges,
      shortcut: 'Cmd+S',
      context: ['unsaved-changes']
    })

    this.register({
      id: 'system-undo',
      label: 'Undo Last Action',
      description: 'Undo the most recent action',
      category: 'system',
      keywords: ['undo', 'revert', 'back'],
      action: this.actions.undoLastAction,
      shortcut: 'Cmd+Z'
    })

    this.register({
      id: 'system-export',
      label: 'Export Attendance',
      description: 'Export attendance data to CSV',
      category: 'system',
      keywords: ['export', 'download', 'csv', 'data'],
      action: this.actions.exportData
    })
  }
}