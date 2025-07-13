/**
 * Webhook Manager for Educational System Integrations
 * Handles real-time event notifications and data synchronization
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { createHash, createHmac, randomBytes } from 'crypto'

export interface WebhookConfig {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  integrationId?: string
  isActive: boolean
  retryConfig: RetryConfig
  headers?: Record<string, string>
  timeout?: number
  metadata?: Record<string, unknown>
}

export interface RetryConfig {
  maxAttempts: number
  backoffMultiplier: number
  initialDelay: number
  maxDelay: number
}

export interface WebhookEvent {
  id: string
  type: string
  source: string
  timestamp: Date
  data: any
  version?: string
  correlationId?: string
  metadata?: Record<string, unknown>
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  eventId: string
  url: string
  attempt: number
  status: DeliveryStatus
  httpStatus?: number
  requestHeaders: Record<string, string>
  requestBody: string
  responseHeaders?: Record<string, string>
  responseBody?: string
  error?: string
  sentAt: Date
  acknowledgedAt?: Date
  duration?: number
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  ABANDONED = 'ABANDONED'
}

export interface WebhookFilter {
  eventTypes?: string[]
  sourceFilters?: string[]
  dataFilters?: Record<string, any>
  customFilter?: (event: WebhookEvent) => boolean
}

export interface WebhookStats {
  totalWebhooks: number
  activeWebhooks: number
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  averageDeliveryTime: number
  deliveryRate: number
}

const WebhookConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  secret: z.string().min(1),
  events: z.array(z.string()).min(1),
  integrationId: z.string().optional(),
  isActive: z.boolean().default(true),
  retryConfig: z.object({
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffMultiplier: z.number().min(1).default(2),
    initialDelay: z.number().min(100).default(1000),
    maxDelay: z.number().min(1000).default(60000)
  }),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(60000).optional().default(30000),
  metadata: z.record(z.unknown()).optional()
})

export class WebhookManager extends EventEmitter {
  private webhooks: Map<string, WebhookConfig> = new Map()
  private deliveryQueue: WebhookDelivery[] = []
  private isProcessing = false
  private processingInterval?: NodeJS.Timeout

  constructor() {
    super()
    this.startDeliveryProcessor()
  }

  /**
   * Register a webhook endpoint
   */
  async registerWebhook(config: Partial<WebhookConfig>): Promise<{ success: boolean; webhookId?: string; error?: string }> {
    try {
      const webhookId = config.id || this.generateWebhookId()
      const secret = config.secret || this.generateSecret()
      
      const validatedConfig = WebhookConfigSchema.parse({
        ...config,
        id: webhookId,
        secret
      })

      // Test webhook endpoint
      const testResult = await this.testWebhookEndpoint(validatedConfig.url, validatedConfig.timeout)
      if (!testResult.success) {
        return {
          success: false,
          error: `Webhook endpoint test failed: ${testResult.error}`
        }
      }

      this.webhooks.set(webhookId, validatedConfig)
      
      // Save to database
      await this.saveWebhookConfig(validatedConfig)
      
      this.emit('webhookRegistered', validatedConfig)
      
      return {
        success: true,
        webhookId
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register webhook'
      }
    }
  }

  /**
   * Unregister a webhook
   */
  async unregisterWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const webhook = this.webhooks.get(webhookId)
      if (!webhook) {
        return {
          success: false,
          error: 'Webhook not found'
        }
      }

      this.webhooks.delete(webhookId)
      
      // Remove from database
      await this.removeWebhookConfig(webhookId)
      
      this.emit('webhookUnregistered', webhookId)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister webhook'
      }
    }
  }

  /**
   * Send webhook event to all matching endpoints
   */
  async sendEvent(event: Omit<WebhookEvent, 'id' | 'timestamp'>): Promise<{ success: boolean; deliveryIds: string[] }> {
    const webhookEvent: WebhookEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    const deliveryIds: string[] = []
    const matchingWebhooks = this.findMatchingWebhooks(webhookEvent)

    for (const webhook of matchingWebhooks) {
      if (!webhook.isActive) continue

      const delivery = this.createDelivery(webhook, webhookEvent)
      deliveryIds.push(delivery.id)
      
      this.deliveryQueue.push(delivery)
    }

    // Save event to database
    await this.saveWebhookEvent(webhookEvent)
    
    this.emit('eventQueued', { event: webhookEvent, deliveryCount: deliveryIds.length })
    
    return {
      success: true,
      deliveryIds
    }
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId: string): WebhookConfig | undefined {
    return this.webhooks.get(webhookId)
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values())
  }

  /**
   * Get webhooks by integration
   */
  getWebhooksByIntegration(integrationId: string): WebhookConfig[] {
    return this.getAllWebhooks().filter(webhook => webhook.integrationId === integrationId)
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      const webhook = this.webhooks.get(webhookId)
      if (!webhook) {
        return {
          success: false,
          error: 'Webhook not found'
        }
      }

      const updatedConfig = WebhookConfigSchema.parse({
        ...webhook,
        ...updates,
        id: webhookId // Ensure ID doesn't change
      })

      this.webhooks.set(webhookId, updatedConfig)
      
      // Update in database
      await this.saveWebhookConfig(updatedConfig)
      
      this.emit('webhookUpdated', updatedConfig)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update webhook'
      }
    }
  }

  /**
   * Get delivery status
   */
  async getDeliveryStatus(deliveryId: string): Promise<WebhookDelivery | undefined> {
    // In a real implementation, this would query the database
    return this.deliveryQueue.find(d => d.id === deliveryId)
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId?: string): Promise<WebhookStats> {
    // In a real implementation, this would query the database
    const totalWebhooks = this.webhooks.size
    const activeWebhooks = Array.from(this.webhooks.values()).filter(w => w.isActive).length
    
    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries: 0, // Would be calculated from database
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0,
      deliveryRate: 0
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret)
      return this.secureCompare(signature, expectedSignature)
    } catch {
      return false
    }
  }

  /**
   * Generate webhook signature
   */
  generateSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    return `sha256=${hmac.digest('hex')}`
  }

  // Educational system specific events
  async sendStudentEnrollmentEvent(studentId: string, batchId: string, action: 'enrolled' | 'withdrawn'): Promise<void> {
    await this.sendEvent({
      type: 'student.enrollment',
      source: 'college-management-system',
      data: {
        studentId,
        batchId,
        action,
        timestamp: new Date().toISOString()
      }
    })
  }

  async sendAttendanceEvent(sessionId: string, studentId: string, status: string): Promise<void> {
    await this.sendEvent({
      type: 'attendance.marked',
      source: 'college-management-system',
      data: {
        sessionId,
        studentId,
        status,
        timestamp: new Date().toISOString()
      }
    })
  }

  async sendGradeEvent(studentId: string, subjectId: string, grade: number, maxGrade: number): Promise<void> {
    await this.sendEvent({
      type: 'grade.updated',
      source: 'college-management-system',
      data: {
        studentId,
        subjectId,
        grade,
        maxGrade,
        percentage: (grade / maxGrade) * 100,
        timestamp: new Date().toISOString()
      }
    })
  }

  async sendPaymentEvent(paymentId: string, studentId: string, amount: number, status: string): Promise<void> {
    await this.sendEvent({
      type: 'payment.processed',
      source: 'college-management-system',
      data: {
        paymentId,
        studentId,
        amount,
        status,
        timestamp: new Date().toISOString()
      }
    })
  }

  async sendTimetableEvent(batchId: string, action: 'created' | 'updated' | 'deleted', entryId?: string): Promise<void> {
    await this.sendEvent({
      type: 'timetable.changed',
      source: 'college-management-system',
      data: {
        batchId,
        action,
        entryId,
        timestamp: new Date().toISOString()
      }
    })
  }

  // Private methods
  private startDeliveryProcessor(): void {
    this.processingInterval = setInterval(() => {
      if (!this.isProcessing && this.deliveryQueue.length > 0) {
        this.processDeliveryQueue()
      }
    }, 1000) // Process every second
  }

  private async processDeliveryQueue(): Promise<void> {
    this.isProcessing = true
    
    try {
      const delivery = this.deliveryQueue.shift()
      if (delivery) {
        await this.attemptDelivery(delivery)
      }
    } catch (error) {
      console.error('Error processing delivery queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async attemptDelivery(delivery: WebhookDelivery): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId)
    if (!webhook) {
      delivery.status = DeliveryStatus.FAILED
      delivery.error = 'Webhook configuration not found'
      await this.saveDelivery(delivery)
      return
    }

    delivery.status = DeliveryStatus.SENDING
    delivery.sentAt = new Date()

    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout)

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': this.generateSignature(delivery.requestBody, webhook.secret),
        'X-Webhook-ID': delivery.id,
        'X-Webhook-Event': delivery.eventId,
        'User-Agent': 'College-Management-System-Webhook/1.0',
        ...webhook.headers
      }

      const response = await fetch(delivery.url, {
        method: 'POST',
        headers,
        body: delivery.requestBody,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      delivery.httpStatus = response.status
      delivery.responseHeaders = Object.fromEntries(response.headers.entries())
      delivery.responseBody = await response.text()
      delivery.duration = Date.now() - startTime
      delivery.acknowledgedAt = new Date()

      if (response.ok) {
        delivery.status = DeliveryStatus.DELIVERED
        this.emit('deliverySucceeded', delivery)
      } else {
        delivery.status = DeliveryStatus.FAILED
        delivery.error = `HTTP ${response.status}: ${response.statusText}`
        await this.scheduleRetry(delivery, webhook.retryConfig)
        this.emit('deliveryFailed', delivery)
      }
    } catch (error) {
      delivery.status = DeliveryStatus.FAILED
      delivery.error = error instanceof Error ? error.message : 'Unknown error'
      delivery.duration = Date.now() - startTime
      
      await this.scheduleRetry(delivery, webhook.retryConfig)
      this.emit('deliveryFailed', delivery)
    }

    await this.saveDelivery(delivery)
  }

  private async scheduleRetry(delivery: WebhookDelivery, retryConfig: RetryConfig): Promise<void> {
    if (delivery.attempt >= retryConfig.maxAttempts) {
      delivery.status = DeliveryStatus.ABANDONED
      this.emit('deliveryAbandoned', delivery)
      return
    }

    const delay = Math.min(
      retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, delivery.attempt - 1),
      retryConfig.maxDelay
    )

    setTimeout(() => {
      const retryDelivery: WebhookDelivery = {
        ...delivery,
        id: this.generateDeliveryId(),
        attempt: delivery.attempt + 1,
        status: DeliveryStatus.PENDING,
        sentAt: new Date()
      }
      
      this.deliveryQueue.push(retryDelivery)
      this.emit('deliveryRetrying', retryDelivery)
    }, delay)
  }

  private findMatchingWebhooks(event: WebhookEvent): WebhookConfig[] {
    return Array.from(this.webhooks.values()).filter(webhook => {
      if (!webhook.isActive) return false
      if (!webhook.events.includes(event.type) && !webhook.events.includes('*')) return false
      
      // Additional filtering could be added here
      return true
    })
  }

  private createDelivery(webhook: WebhookConfig, event: WebhookEvent): WebhookDelivery {
    return {
      id: this.generateDeliveryId(),
      webhookId: webhook.id,
      eventId: event.id,
      url: webhook.url,
      attempt: 1,
      status: DeliveryStatus.PENDING,
      requestHeaders: {},
      requestBody: JSON.stringify(event),
      sentAt: new Date()
    }
  }

  private async testWebhookEndpoint(url: string, timeout = 5000): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true'
        },
        body: JSON.stringify({ test: true }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      return { success: response.status < 500 } // Accept any non-server error
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Endpoint test failed'
      }
    }
  }

  private generateWebhookId(): string {
    return `wh_${randomBytes(16).toString('hex')}`
  }

  private generateEventId(): string {
    return `evt_${randomBytes(16).toString('hex')}`
  }

  private generateDeliveryId(): string {
    return `del_${randomBytes(16).toString('hex')}`
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex')
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }

  private async saveWebhookConfig(config: WebhookConfig): Promise<void> {
    // This would save to the actual database when implemented
    console.log('Saving webhook config:', config.id)
  }

  private async removeWebhookConfig(webhookId: string): Promise<void> {
    // This would remove from the actual database when implemented
    console.log('Removing webhook config:', webhookId)
  }

  private async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    // This would save to the actual database when implemented
    console.log('Saving webhook event:', event.id)
  }

  private async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    // This would save to the actual database when implemented
    console.log('Saving delivery:', delivery.id)
  }

  // Cleanup method
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    this.removeAllListeners()
  }
}

// Singleton instance
export const webhookManager = new WebhookManager()

// Export utility functions
export const WebhookUtils = {
  generateSignature: (payload: string, secret: string): string => {
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    return `sha256=${hmac.digest('hex')}`
  },
  
  verifySignature: (payload: string, signature: string, secret: string): boolean => {
    const expectedSignature = WebhookUtils.generateSignature(payload, secret)
    return webhookManager.verifySignature(payload, signature, secret)
  }
}