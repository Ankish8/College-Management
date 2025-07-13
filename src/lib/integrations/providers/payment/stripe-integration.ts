/**
 * Stripe Payment Integration
 * Handles payment processing for tuition fees, course fees, and other educational payments
 */

import { BaseIntegration, IntegrationResult, SyncResult, SyncOperation, SyncStatus } from '../../core/integration-manager'
import { z } from 'zod'

export interface StripeConfig {
  secretKey: string
  publishableKey: string
  webhookSecret: string
  apiVersion?: string
  timeout?: number
}

export interface StripeCustomer {
  id: string
  email: string
  name?: string
  phone?: string
  description?: string
  metadata?: Record<string, string>
  created: number
  defaultSource?: string
}

export interface StripePaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded'
  description?: string
  customer?: string
  metadata?: Record<string, string>
  paymentMethod?: string
  receiptEmail?: string
  created: number
}

export interface StripeSubscription {
  id: string
  customer: string
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing'
  currentPeriodStart: number
  currentPeriodEnd: number
  items: StripeSubscriptionItem[]
  metadata?: Record<string, string>
}

export interface StripeSubscriptionItem {
  id: string
  price: StripePrice
  quantity: number
}

export interface StripePrice {
  id: string
  currency: string
  unitAmount: number
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year'
    intervalCount: number
  }
  nickname?: string
  metadata?: Record<string, string>
}

export interface StripeInvoice {
  id: string
  customer: string
  amountDue: number
  amountPaid: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  dueDate?: number
  description?: string
  lines: StripeInvoiceLineItem[]
  metadata?: Record<string, string>
}

export interface StripeInvoiceLineItem {
  id: string
  amount: number
  currency: string
  description?: string
  quantity: number
  metadata?: Record<string, string>
}

export interface PaymentRequest {
  amount: number
  currency: string
  description: string
  studentId: string
  feeType: 'tuition' | 'library' | 'lab' | 'hostel' | 'transport' | 'exam' | 'application' | 'other'
  dueDate?: Date
  metadata?: Record<string, string>
}

export interface FeeStructure {
  id: string
  name: string
  amount: number
  currency: string
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'semester' | 'annual'
  feeType: string
  programId?: string
  batchId?: string
  description?: string
  isActive: boolean
}

const StripeConfigSchema = z.object({
  secretKey: z.string().min(1),
  publishableKey: z.string().min(1),
  webhookSecret: z.string().min(1),
  apiVersion: z.string().optional().default('2023-10-16'),
  timeout: z.number().positive().optional().default(30000)
})

export class StripeIntegration extends BaseIntegration {
  private stripeConfig: StripeConfig
  private baseUrl = 'https://api.stripe.com/v1'

  constructor(config: any) {
    super(config)
    this.stripeConfig = StripeConfigSchema.parse(config.credentials)
  }

  async connect(): Promise<IntegrationResult<void>> {
    try {
      // Test connection by retrieving account information
      const result = await this.makeRequest('GET', '/account')
      
      if (result.success) {
        this.updateConfig({ status: 'ACTIVE' as any })
        this.emit('connected')
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Failed to connect to Stripe'
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
      const result = await this.makeRequest('GET', '/account')
      return {
        success: true,
        data: result.success
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid Stripe credentials',
        data: false
      }
    }
  }

  async healthCheck(): Promise<IntegrationResult<any>> {
    try {
      const result = await this.makeRequest('GET', '/account')
      
      if (result.success) {
        return {
          success: true,
          data: {
            status: 'healthy',
            accountId: result.data?.id,
            businessType: result.data?.business_type,
            country: result.data?.country,
            payoutsEnabled: result.data?.payouts_enabled,
            chargesEnabled: result.data?.charges_enabled
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
    const syncId = `stripe-${Date.now()}`
    const startTime = new Date()
    
    try {
      switch (operation) {
        case SyncOperation.IMPORT:
          return await this.importPaymentData(syncId, startTime, options)
        case SyncOperation.EXPORT:
          return await this.exportToStripe(syncId, startTime, options)
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

  // Payment-specific methods
  async createCustomer(customer: Partial<StripeCustomer>): Promise<IntegrationResult<StripeCustomer>> {
    try {
      const body = new URLSearchParams()
      
      if (customer.email) body.append('email', customer.email)
      if (customer.name) body.append('name', customer.name)
      if (customer.phone) body.append('phone', customer.phone)
      if (customer.description) body.append('description', customer.description)
      
      if (customer.metadata) {
        Object.entries(customer.metadata).forEach(([key, value]) => {
          body.append(`metadata[${key}]`, value)
        })
      }

      const result = await this.makeRequest('POST', '/customers', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create customer'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer'
      }
    }
  }

  async createPaymentIntent(payment: PaymentRequest): Promise<IntegrationResult<StripePaymentIntent>> {
    try {
      const body = new URLSearchParams()
      body.append('amount', payment.amount.toString())
      body.append('currency', payment.currency)
      body.append('description', payment.description)
      
      if (payment.metadata) {
        Object.entries(payment.metadata).forEach(([key, value]) => {
          body.append(`metadata[${key}]`, value)
        })
      }

      // Add educational payment metadata
      body.append('metadata[student_id]', payment.studentId)
      body.append('metadata[fee_type]', payment.feeType)
      if (payment.dueDate) {
        body.append('metadata[due_date]', payment.dueDate.toISOString())
      }

      const result = await this.makeRequest('POST', '/payment_intents', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create payment intent'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent'
      }
    }
  }

  async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<IntegrationResult<StripeSubscription>> {
    try {
      const body = new URLSearchParams()
      body.append('customer', customerId)
      body.append('items[0][price]', priceId)
      
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          body.append(`metadata[${key}]`, value)
        })
      }

      const result = await this.makeRequest('POST', '/subscriptions', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create subscription'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      }
    }
  }

  async createPrice(feeStructure: FeeStructure): Promise<IntegrationResult<StripePrice>> {
    try {
      const body = new URLSearchParams()
      body.append('currency', feeStructure.currency)
      body.append('unit_amount', feeStructure.amount.toString())
      
      if (feeStructure.frequency !== 'one_time') {
        body.append('recurring[interval]', this.mapFrequencyToInterval(feeStructure.frequency))
        if (feeStructure.frequency === 'quarterly') {
          body.append('recurring[interval_count]', '3')
        } else if (feeStructure.frequency === 'semester') {
          body.append('recurring[interval]', 'month')
          body.append('recurring[interval_count]', '6')
        }
      }
      
      if (feeStructure.name) body.append('nickname', feeStructure.name)
      
      // Add metadata
      body.append('metadata[fee_type]', feeStructure.feeType)
      if (feeStructure.programId) body.append('metadata[program_id]', feeStructure.programId)
      if (feeStructure.batchId) body.append('metadata[batch_id]', feeStructure.batchId)

      const result = await this.makeRequest('POST', '/prices', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create price'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create price'
      }
    }
  }

  async createInvoice(customerId: string, lineItems: Partial<StripeInvoiceLineItem>[], dueDate?: Date): Promise<IntegrationResult<StripeInvoice>> {
    try {
      const body = new URLSearchParams()
      body.append('customer', customerId)
      
      if (dueDate) {
        body.append('due_date', Math.floor(dueDate.getTime() / 1000).toString())
      }

      // Add line items
      lineItems.forEach((item, index) => {
        if (item.amount) body.append(`invoice_items[${index}][amount]`, item.amount.toString())
        if (item.currency) body.append(`invoice_items[${index}][currency]`, item.currency)
        if (item.description) body.append(`invoice_items[${index}][description]`, item.description)
        if (item.quantity) body.append(`invoice_items[${index}][quantity]`, item.quantity.toString())
      })

      const result = await this.makeRequest('POST', '/invoices', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to create invoice'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice'
      }
    }
  }

  async getPaymentHistory(customerId: string, limit: number = 100): Promise<IntegrationResult<StripePaymentIntent[]>> {
    try {
      const params = new URLSearchParams()
      params.append('customer', customerId)
      params.append('limit', limit.toString())
      
      const result = await this.makeRequest('GET', `/payment_intents?${params.toString()}`)
      
      if (result.success) {
        return {
          success: true,
          data: result.data?.data || []
        }
      } else {
        return {
          success: false,
          error: 'Failed to get payment history'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment history'
      }
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<IntegrationResult<any>> {
    try {
      const body = new URLSearchParams()
      body.append('payment_intent', paymentIntentId)
      
      if (amount) body.append('amount', amount.toString())
      if (reason) body.append('reason', reason)

      const result = await this.makeRequest('POST', '/refunds', body)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        return {
          success: false,
          error: 'Failed to process refund'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund'
      }
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<IntegrationResult<any>> {
    try {
      // In a real implementation, you'd verify the webhook signature
      const isValid = this.verifyWebhookSignature(payload, signature)
      
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid webhook signature'
        }
      }

      const event = JSON.parse(payload)
      
      // Handle different webhook events
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object)
          break
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object)
          break
        case 'invoice.payment_succeeded':
          await this.handleInvoicePayment(event.data.object)
          break
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object)
          break
        default:
          console.log(`Unhandled webhook event: ${event.type}`)
      }

      return {
        success: true,
        data: { received: true }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle webhook'
      }
    }
  }

  // Private methods
  private async makeRequest(method: string, endpoint: string, body?: URLSearchParams): Promise<IntegrationResult<any>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.stripeConfig.secretKey}`,
        'Stripe-Version': this.stripeConfig.apiVersion!
      }

      if (method === 'POST' && body) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.stripeConfig.timeout)

      const response = await fetch(url, {
        method,
        headers,
        body: body?.toString(),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Stripe API Error: ${data.error?.message || response.statusText}`)
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

  private mapFrequencyToInterval(frequency: string): string {
    switch (frequency) {
      case 'monthly': return 'month'
      case 'quarterly': return 'month'
      case 'semester': return 'month'
      case 'annual': return 'year'
      default: return 'month'
    }
  }

  private verifyWebhookSignature(payload: string, signature: string): boolean {
    // In a real implementation, you'd use Stripe's webhook signature verification
    // This is a simplified version
    try {
      const expectedSignature = `v1=${signature.split('=')[1]}`
      return signature === expectedSignature
    } catch {
      return false
    }
  }

  private async handlePaymentSuccess(paymentIntent: StripePaymentIntent): Promise<void> {
    console.log('Payment succeeded:', paymentIntent.id)
    
    // Update payment status in database
    // Send confirmation email to student
    // Update student account balance
    
    this.emit('paymentSucceeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      studentId: paymentIntent.metadata?.student_id,
      feeType: paymentIntent.metadata?.fee_type
    })
  }

  private async handlePaymentFailure(paymentIntent: StripePaymentIntent): Promise<void> {
    console.log('Payment failed:', paymentIntent.id)
    
    // Update payment status in database
    // Send failure notification to student
    // Create follow-up task for finance team
    
    this.emit('paymentFailed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      studentId: paymentIntent.metadata?.student_id,
      feeType: paymentIntent.metadata?.fee_type
    })
  }

  private async handleInvoicePayment(invoice: StripeInvoice): Promise<void> {
    console.log('Invoice paid:', invoice.id)
    
    // Update invoice status in database
    // Send receipt to student
    
    this.emit('invoicePaid', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amountPaid
    })
  }

  private async handleSubscriptionUpdate(subscription: StripeSubscription): Promise<void> {
    console.log('Subscription updated:', subscription.id)
    
    // Update subscription status in database
    // Notify student of subscription changes
    
    this.emit('subscriptionUpdated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    })
  }

  private async importPaymentData(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    let recordsProcessed = 0
    let recordsSucceeded = 0
    let recordsFailed = 0
    const errors: any[] = []

    try {
      // Import customers
      const customersResult = await this.makeRequest('GET', '/customers?limit=100')
      if (customersResult.success && customersResult.data?.data) {
        for (const customer of customersResult.data.data) {
          recordsProcessed++
          try {
            await this.importCustomer(customer)
            recordsSucceeded++
          } catch (error) {
            recordsFailed++
            errors.push({
              recordId: customer.id,
              message: error instanceof Error ? error.message : 'Failed to import customer',
              severity: 'ERROR'
            })
          }
        }
      }

      // Import payment intents
      const paymentsResult = await this.makeRequest('GET', '/payment_intents?limit=100')
      if (paymentsResult.success && paymentsResult.data?.data) {
        for (const payment of paymentsResult.data.data) {
          recordsProcessed++
          try {
            await this.importPayment(payment)
            recordsSucceeded++
          } catch (error) {
            recordsFailed++
            errors.push({
              recordId: payment.id,
              message: error instanceof Error ? error.message : 'Failed to import payment',
              severity: 'ERROR'
            })
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

  private async exportToStripe(syncId: string, startTime: Date, options?: any): Promise<SyncResult> {
    // Implementation for exporting data to Stripe
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
    const importResult = await this.importPaymentData(syncId + '-import', startTime, options)
    const exportResult = await this.exportToStripe(syncId + '-export', startTime, options)

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

  private async importCustomer(stripeCustomer: StripeCustomer): Promise<void> {
    // Logic to import customer into college management system
    console.log('Importing customer:', stripeCustomer.email)
  }

  private async importPayment(stripePayment: StripePaymentIntent): Promise<void> {
    // Logic to import payment into college management system
    console.log('Importing payment:', stripePayment.id)
  }
}