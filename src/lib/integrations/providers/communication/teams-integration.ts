/**
 * Microsoft Teams Integration
 * Handles communication with Microsoft Teams for educational collaboration
 */

import { BaseIntegration, IntegrationResult, SyncResult, SyncOperation, SyncStatus } from '../../core/integration-manager'
import { z } from 'zod'

export interface TeamsConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  scope?: string[]
  redirectUri?: string
}

export interface TeamsChannel {
  id: string
  displayName: string
  description?: string
  email?: string
  webUrl: string
  membershipType: 'standard' | 'private'
}

export interface TeamsMessage {
  id: string
  messageType: 'message' | 'chatMessage'
  createdDateTime: string
  from: {
    user?: {
      id: string
      displayName: string
      userIdentityType: string
    }
  }
  body: {
    contentType: 'text' | 'html'
    content: string
  }
  attachments?: TeamsAttachment[]
}

export interface TeamsAttachment {
  id: string
  contentType: string
  contentUrl?: string
  content?: string
  name?: string
  thumbnailUrl?: string
}

export interface TeamsMeeting {
  id: string
  subject: string
  startTime: string
  endTime: string
  joinWebUrl: string
  organizer: {
    emailAddress: {
      name: string
      address: string
    }
  }
  attendees: TeamsAttendee[]
}

export interface TeamsAttendee {
  emailAddress: {
    name: string
    address: string
  }
  type: 'required' | 'optional' | 'resource'
  status: {
    response: 'none' | 'accepted' | 'declined' | 'tentativelyAccepted'
    time: string
  }
}

export interface TeamsNotification {
  type: 'announcement' | 'reminder' | 'assignment' | 'grade'
  title: string
  message: string
  recipients: string[]
  channel?: string
  urgency?: 'low' | 'normal' | 'high'
  actionUrl?: string
}

const TeamsConfigSchema = z.object({
  tenantId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scope: z.array(z.string()).optional().default([
    'https://graph.microsoft.com/Channel.ReadWrite.All',
    'https://graph.microsoft.com/Team.ReadWrite.All',
    'https://graph.microsoft.com/OnlineMeetings.ReadWrite'
  ]),
  redirectUri: z.string().url().optional()
})

export class TeamsIntegration extends BaseIntegration {
  private teamsConfig: TeamsConfig
  private accessToken?: string
  private tokenExpiry?: Date
  private baseUrl = 'https://graph.microsoft.com/v1.0'

  constructor(config: any) {
    super(config)
    this.teamsConfig = TeamsConfigSchema.parse(config.credentials)
  }

  async connect(): Promise<IntegrationResult<void>> {
    try {
      const tokenResult = await this.getAccessToken()
      
      if (tokenResult.success) {
        this.updateConfig({ status: 'ACTIVE' as any })
        this.emit('connected')
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to authenticate with Microsoft Teams'
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
    this.accessToken = undefined
    this.tokenExpiry = undefined
    this.updateConfig({ status: 'INACTIVE' as any })
    this.emit('disconnected')
    return { success: true }
  }

  async validateCredentials(): Promise<IntegrationResult<boolean>> {
    try {
      const tokenResult = await this.getAccessToken()
      return {
        success: true,
        data: tokenResult.success
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid credentials',
        data: false
      }
    }
  }

  async healthCheck(): Promise<IntegrationResult<any>> {
    try {
      await this.ensureAuthenticated()
      
      const response = await this.makeRequest('GET', '/me')
      
      if (response.success) {
        return {
          success: true,
          data: {
            status: 'healthy',
            user: response.data?.displayName,
            tenantId: this.teamsConfig.tenantId
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
    const syncId = `teams-${Date.now()}`
    const startTime = new Date()
    
    try {
      switch (operation) {
        case SyncOperation.IMPORT:
          return await this.importFromTeams(syncId, startTime, options)
        case SyncOperation.EXPORT:
          return await this.exportToTeams(syncId, startTime, options)
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

  // Teams-specific methods
  async getTeams(): Promise<IntegrationResult<any[]>> {
    try {
      await this.ensureAuthenticated()
      
      const response = await this.makeRequest('GET', '/me/joinedTeams')
      
      if (response.success) {
        return {
          success: true,
          data: response.data?.value || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch teams'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch teams'
      }
    }
  }

  async getChannels(teamId: string): Promise<IntegrationResult<TeamsChannel[]>> {
    try {
      await this.ensureAuthenticated()
      
      const response = await this.makeRequest('GET', `/teams/${teamId}/channels`)
      
      if (response.success) {
        return {
          success: true,
          data: response.data?.value || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to fetch channels'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch channels'
      }
    }
  }

  async sendMessage(teamId: string, channelId: string, message: string, messageType: 'text' | 'html' = 'text'): Promise<IntegrationResult<TeamsMessage>> {
    try {
      await this.ensureAuthenticated()
      
      const body = {
        body: {
          contentType: messageType,
          content: message
        }
      }
      
      const response = await this.makeRequest('POST', `/teams/${teamId}/channels/${channelId}/messages`, body)
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to send message'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }
    }
  }

  async createMeeting(meeting: Partial<TeamsMeeting>): Promise<IntegrationResult<TeamsMeeting>> {
    try {
      await this.ensureAuthenticated()
      
      const body = {
        subject: meeting.subject,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        attendees: meeting.attendees || []
      }
      
      const response = await this.makeRequest('POST', '/me/onlineMeetings', body)
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create meeting'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create meeting'
      }
    }
  }

  async sendNotification(notification: TeamsNotification): Promise<IntegrationResult<void>> {
    try {
      await this.ensureAuthenticated()
      
      const results: boolean[] = []
      
      for (const recipient of notification.recipients) {
        try {
          if (notification.channel) {
            // Send to channel
            const messageResult = await this.sendMessage(
              notification.channel,
              'general', // Default to general channel
              this.formatNotificationMessage(notification),
              'html'
            )
            results.push(messageResult.success)
          } else {
            // Send direct message
            const chatResult = await this.sendDirectMessage(recipient, notification.message)
            results.push(chatResult.success)
          }
        } catch (error) {
          results.push(false)
        }
      }
      
      const successCount = results.filter(r => r).length
      
      if (successCount > 0) {
        return {
          success: true,
          metadata: {
            sent: successCount,
            failed: results.length - successCount
          }
        }
      } else {
        return {
          success: false,
          error: 'Failed to send notifications'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }
    }
  }

  async sendDirectMessage(userId: string, message: string): Promise<IntegrationResult<void>> {
    try {
      await this.ensureAuthenticated()
      
      // First create a chat
      const chatBody = {
        chatType: 'oneOnOne',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
          }
        ]
      }
      
      const chatResponse = await this.makeRequest('POST', '/chats', chatBody)
      
      if (chatResponse.success) {
        const chatId = chatResponse.data.id
        
        // Send message to chat
        const messageBody = {
          body: {
            contentType: 'text',
            content: message
          }
        }
        
        const messageResponse = await this.makeRequest('POST', `/chats/${chatId}/messages`, messageBody)
        
        return {
          success: messageResponse.success,
          error: messageResponse.success ? undefined : 'Failed to send direct message'
        }
      } else {
        return {
          success: false,
          error: 'Failed to create chat'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send direct message'
      }
    }
  }

  async createClassTeam(className: string, description: string, teacherEmails: string[], studentEmails: string[]): Promise<IntegrationResult<any>> {
    try {
      await this.ensureAuthenticated()
      
      // Create team
      const teamBody = {
        'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('educationClass')",
        displayName: className,
        description: description
      }
      
      const teamResponse = await this.makeRequest('POST', '/teams', teamBody)
      
      if (teamResponse.success) {
        const teamId = teamResponse.data.id
        
        // Add members
        await this.addTeamMembers(teamId, teacherEmails, 'owner')
        await this.addTeamMembers(teamId, studentEmails, 'member')
        
        return {
          success: true,
          data: teamResponse.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create class team'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create class team'
      }
    }
  }

  // Private methods
  private async getAccessToken(): Promise<IntegrationResult<string>> {
    try {
      if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return { success: true, data: this.accessToken }
      }

      const tokenUrl = `https://login.microsoftonline.com/${this.teamsConfig.tenantId}/oauth2/v2.0/token`
      
      const body = new URLSearchParams({
        client_id: this.teamsConfig.clientId,
        client_secret: this.teamsConfig.clientSecret,
        scope: this.teamsConfig.scope?.join(' ') || 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`Authentication error: ${data.error_description}`)
      }

      this.accessToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))

      return { success: true, data: this.accessToken }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get access token'
      }
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      const tokenResult = await this.getAccessToken()
      if (!tokenResult.success) {
        throw new Error('Failed to authenticate')
      }
    }
  }

  private async makeRequest(method: string, endpoint: string, body?: any): Promise<IntegrationResult<any>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = response.status === 204 ? null : await response.json()

      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      }
    }
  }

  private async addTeamMembers(teamId: string, emails: string[], role: 'owner' | 'member'): Promise<void> {
    for (const email of emails) {
      try {
        const memberBody = {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: role === 'owner' ? ['owner'] : [],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${email}')`
        }
        
        await this.makeRequest('POST', `/teams/${teamId}/members`, memberBody)
      } catch (error) {
        console.warn(`Failed to add member ${email} to team ${teamId}:`, error)
      }
    }
  }

  private formatNotificationMessage(notification: TeamsNotification): string {
    const urgencyEmoji = {
      low: '🔵',
      normal: '🟡',
      high: '🔴'
    }

    const emoji = urgencyEmoji[notification.urgency || 'normal']
    
    let message = `${emoji} **${notification.title}**\n\n${notification.message}`
    
    if (notification.actionUrl) {
      message += `\n\n[Click here for more information](${notification.actionUrl})`
    }
    
    return message
  }

  private async importFromTeams(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    // Implementation for importing data from Teams
    return {
      syncId,
      integrationId: this.getId(),
      operation: SyncOperation.IMPORT,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      startTime,
      endTime: new Date()
    }
  }

  private async exportToTeams(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    // Implementation for exporting data to Teams
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
    return {
      syncId,
      integrationId: this.getId(),
      operation: SyncOperation.SYNC,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      startTime,
      endTime: new Date()
    }
  }
}