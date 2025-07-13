/**
 * Moodle LMS Integration
 * Handles synchronization with Moodle Learning Management System
 */

import { BaseIntegration, IntegrationResult, SyncResult, SyncOperation, SyncStatus, IntegrationType } from '../../core/integration-manager'
import { z } from 'zod'

export interface MoodleConfig {
  baseUrl: string
  token: string
  webserviceFunction?: string
  timeout?: number
}

export interface MoodleUser {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  department?: string
  institution?: string
  idnumber?: string
  lastaccess?: number
}

export interface MoodleCourse {
  id: number
  shortname: string
  fullname: string
  categoryid: number
  summary?: string
  startdate: number
  enddate?: number
  visible: boolean
  enrolledusers?: MoodleUser[]
}

export interface MoodleEnrollment {
  roleid: number
  userid: number
  courseid: number
  timestart?: number
  timeend?: number
  status: number
}

export interface MoodleGrade {
  userid: number
  courseid: number
  itemname: string
  grade: number
  grademax: number
  gradepass?: number
  feedback?: string
  dategraded?: number
}

const MoodleConfigSchema = z.object({
  baseUrl: z.string().url(),
  token: z.string().min(1),
  webserviceFunction: z.string().optional(),
  timeout: z.number().positive().optional().default(30000)
})

export class MoodleIntegration extends BaseIntegration {
  private moodleConfig: MoodleConfig
  private baseApiUrl: string

  constructor(config: any) {
    super(config)
    this.moodleConfig = MoodleConfigSchema.parse(config.credentials)
    this.baseApiUrl = `${this.moodleConfig.baseUrl}/webservice/rest/server.php`
  }

  async connect(): Promise<IntegrationResult<void>> {
    try {
      // Test connection by getting site info
      const result = await this.makeRequest('core_webservice_get_site_info', {})
      
      if (result.success) {
        this.updateConfig({ status: 'ACTIVE' as any })
        this.emit('connected')
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to connect to Moodle instance'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  async disconnect(): Promise<IntegrationResult<void>> {
    this.updateConfig({ status: 'INACTIVE' as any })
    this.emit('disconnected')
    return { success: true }
  }

  async validateCredentials(): Promise<IntegrationResult<boolean>> {
    try {
      const result = await this.makeRequest('core_webservice_get_site_info', {})
      return {
        success: true,
        data: result.success
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid credentials or connection failed',
        data: false
      }
    }
  }

  async healthCheck(): Promise<IntegrationResult<any>> {
    try {
      const result = await this.makeRequest('core_webservice_get_site_info', {})
      
      if (result.success) {
        return {
          success: true,
          data: {
            status: 'healthy',
            sitename: result.data?.sitename,
            release: result.data?.release,
            version: result.data?.version
          }
        }
      } else {
        return {
          success: false,
          error: 'Health check failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      }
    }
  }

  async sync(operation: SyncOperation, options?: any): Promise<SyncResult> {
    const syncId = `moodle-${Date.now()}`
    const startTime = new Date()
    
    try {
      switch (operation) {
        case SyncOperation.IMPORT:
          return await this.importFromMoodle(syncId, startTime, options)
        case SyncOperation.EXPORT:
          return await this.exportToMoodle(syncId, startTime, options)
        case SyncOperation.SYNC:
          return await this.bidirectionalSync(syncId, startTime, options)
        default:
          throw new Error(`Unsupported sync operation: ${operation}`)
      }
    } catch (error) {
      return {
        syncId,
        integrationId: this.getId(),
        operation,
        status: SyncStatus.FAILED,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        errors: [{
          message: error instanceof Error ? error.message : 'Sync failed',
          severity: 'ERROR'
        }],
        startTime,
        endTime: new Date()
      }
    }
  }

  // Moodle-specific methods
  async getUsers(criteria?: any): Promise<IntegrationResult<MoodleUser[]>> {
    try {
      const params = {
        criteria: criteria || []
      }
      
      const result = await this.makeRequest('core_user_get_users', params)
      
      if (result.success) {
        return {
          success: true,
          data: result.data?.users || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch users from Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      }
    }
  }

  async getCourses(): Promise<IntegrationResult<MoodleCourse[]>> {
    try {
      const result = await this.makeRequest('core_course_get_courses', {})
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch courses from Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch courses'
      }
    }
  }

  async getEnrollments(courseid: number): Promise<IntegrationResult<MoodleEnrollment[]>> {
    try {
      const params = { courseid }
      const result = await this.makeRequest('core_enrol_get_enrolled_users', params)
      
      if (result.success) {
        return {
          success: true,
          data: result.data || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch enrollments from Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch enrollments'
      }
    }
  }

  async getGrades(courseid: number, userid?: number): Promise<IntegrationResult<MoodleGrade[]>> {
    try {
      const params = { courseid, userid }
      const result = await this.makeRequest('gradereport_user_get_grade_items', params)
      
      if (result.success) {
        return {
          success: true,
          data: result.data?.usergrades || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch grades from Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch grades'
      }
    }
  }

  async createUser(user: Partial<MoodleUser>): Promise<IntegrationResult<MoodleUser>> {
    try {
      const params = {
        users: [user]
      }
      
      const result = await this.makeRequest('core_user_create_users', params)
      
      if (result.success && result.data?.length > 0) {
        return {
          success: true,
          data: result.data[0]
        }
      } else {
        return {
          success: false,
          error: 'Failed to create user in Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      }
    }
  }

  async enrollUser(userid: number, courseid: number, roleid: number = 5): Promise<IntegrationResult<void>> {
    try {
      const params = {
        enrolments: [{
          roleid,
          userid,
          courseid
        }]
      }
      
      const result = await this.makeRequest('enrol_manual_enrol_users', params)
      
      if (result.success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to enroll user in Moodle'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enroll user'
      }
    }
  }

  // Private sync methods
  private async importFromMoodle(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    let recordsProcessed = 0
    let recordsSucceeded = 0
    let recordsFailed = 0
    const errors: any[] = []

    try {
      // Import users
      if (!options?.excludeUsers) {
        const usersResult = await this.getUsers()
        if (usersResult.success && usersResult.data) {
          for (const moodleUser of usersResult.data) {
            recordsProcessed++
            try {
              await this.importUser(moodleUser)
              recordsSucceeded++
            } catch (error) {
              recordsFailed++
              errors.push({
                recordId: moodleUser.id.toString(),
                message: error instanceof Error ? error.message : 'Failed to import user',
                severity: 'ERROR'
              })
            }
          }
        }
      }

      // Import courses
      if (!options?.excludeCourses) {
        const coursesResult = await this.getCourses()
        if (coursesResult.success && coursesResult.data) {
          for (const moodleCourse of coursesResult.data) {
            recordsProcessed++
            try {
              await this.importCourse(moodleCourse)
              recordsSucceeded++
            } catch (error) {
              recordsFailed++
              errors.push({
                recordId: moodleCourse.id.toString(),
                message: error instanceof Error ? error.message : 'Failed to import course',
                severity: 'ERROR'
              })
            }
          }
        }
      }

      return {
        syncId,
        integrationId: this.getId(),
        operation: SyncOperation.IMPORT,
        status: errors.length === 0 ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        recordsProcessed,
        recordsSucceeded,
        recordsFailed,
        errors,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      }
    } catch (error) {
      return {
        syncId,
        integrationId: this.getId(),
        operation: SyncOperation.IMPORT,
        status: SyncStatus.FAILED,
        recordsProcessed,
        recordsSucceeded,
        recordsFailed,
        errors: [{
          message: error instanceof Error ? error.message : 'Import failed',
          severity: 'ERROR'
        }],
        startTime,
        endTime: new Date()
      }
    }
  }

  private async exportToMoodle(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    // Implementation for exporting data to Moodle
    return {
      syncId,
      integrationId: this.getId(),
      operation: SyncOperation.EXPORT,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      startTime,
      endTime: new Date()
    }
  }

  private async bidirectionalSync(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    // Implementation for bidirectional sync
    const importResult = await this.importFromMoodle(syncId + '-import', startTime, options)
    const exportResult = await this.exportToMoodle(syncId + '-export', startTime, options)

    return {
      syncId,
      integrationId: this.getId(),
      operation: SyncOperation.SYNC,
      status: importResult.status === SyncStatus.COMPLETED && exportResult.status === SyncStatus.COMPLETED 
        ? SyncStatus.COMPLETED : SyncStatus.FAILED,
      recordsProcessed: importResult.recordsProcessed + exportResult.recordsProcessed,
      recordsSucceeded: importResult.recordsSucceeded + exportResult.recordsSucceeded,
      recordsFailed: importResult.recordsFailed + exportResult.recordsFailed,
      errors: [...importResult.errors, ...exportResult.errors],
      startTime,
      endTime: new Date()
    }
  }

  private async importUser(moodleUser: MoodleUser): Promise<void> {
    // Logic to import user into college management system
    console.log('Importing user:', moodleUser.username)
    // This would integrate with the actual user creation logic
  }

  private async importCourse(moodleCourse: MoodleCourse): Promise<void> {
    // Logic to import course into college management system
    console.log('Importing course:', moodleCourse.shortname)
    // This would integrate with the actual course/subject creation logic
  }

  private async makeRequest(wsfunction: string, params: any): Promise<IntegrationResult<any>> {
    try {
      const url = new URL(this.baseApiUrl)
      url.searchParams.append('wstoken', this.moodleConfig.token)
      url.searchParams.append('wsfunction', wsfunction)
      url.searchParams.append('moodlewsrestformat', 'json')

      // Add parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          if (Array.isArray(params[key])) {
            params[key].forEach((item: any, index: number) => {
              if (typeof item === 'object') {
                Object.keys(item).forEach(subKey => {
                  url.searchParams.append(`${key}[${index}][${subKey}]`, item[subKey])
                })
              } else {
                url.searchParams.append(`${key}[${index}]`, item)
              }
            })
          } else if (typeof params[key] === 'object') {
            Object.keys(params[key]).forEach(subKey => {
              url.searchParams.append(`${key}[${subKey}]`, params[key][subKey])
            })
          } else {
            url.searchParams.append(key, params[key])
          }
        }
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.moodleConfig.timeout)

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'College-Management-System/1.0'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.exception) {
        throw new Error(`Moodle Error: ${data.message}`)
      }

      return {
        success: true,
        data
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      
      throw error
    }
  }
}