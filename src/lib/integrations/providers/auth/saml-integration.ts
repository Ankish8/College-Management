/**
 * SAML SSO Integration
 * Handles SAML-based Single Sign-On for educational institutions
 */

import { BaseIntegration, IntegrationResult, SyncResult, SyncOperation, SyncStatus } from '../../core/integration-manager'
import { z } from 'zod'
import { createHash, createVerify } from 'crypto'

export interface SAMLConfig {
  entityId: string
  ssoUrl: string
  sloUrl?: string
  certificate: string
  privateKey?: string
  signatureAlgorithm?: 'rsa-sha1' | 'rsa-sha256'
  digestAlgorithm?: 'sha1' | 'sha256'
  authnRequestsSigned?: boolean
  wantAssertionsSigned?: boolean
  wantResponseSigned?: boolean
  attributeMapping?: Record<string, string>
  nameIdFormat?: string
  clockTolerance?: number
}

export interface SAMLUser {
  nameId: string
  sessionIndex?: string
  attributes: Record<string, string | string[]>
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  department?: string
  studentId?: string
  employeeId?: string
}

export interface SAMLResponse {
  nameId: string
  sessionIndex?: string
  attributes: Record<string, string | string[]>
  issuer: string
  inResponseTo?: string
  notBefore?: Date
  notOnOrAfter?: Date
  audienceRestriction?: string[]
}

export interface SAMLRequest {
  id: string
  issueInstant: string
  destination: string
  assertionConsumerServiceURL: string
  nameIdPolicy?: {
    format: string
    allowCreate: boolean
  }
}

const SAMLConfigSchema = z.object({
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  sloUrl: z.string().url().optional(),
  certificate: z.string().min(1),
  privateKey: z.string().optional(),
  signatureAlgorithm: z.enum(['rsa-sha1', 'rsa-sha256']).optional().default('rsa-sha256'),
  digestAlgorithm: z.enum(['sha1', 'sha256']).optional().default('sha256'),
  authnRequestsSigned: z.boolean().optional().default(false),
  wantAssertionsSigned: z.boolean().optional().default(true),
  wantResponseSigned: z.boolean().optional().default(true),
  attributeMapping: z.record(z.string()).optional().default({
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
    department: 'http://schemas.xmlsoap.org/claims/Department',
    studentId: 'http://schemas.xmlsoap.org/claims/StudentID',
    employeeId: 'http://schemas.xmlsoap.org/claims/EmployeeID'
  }),
  nameIdFormat: z.string().optional().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
  clockTolerance: z.number().optional().default(5000) // 5 seconds
})

export class SAMLIntegration extends BaseIntegration {
  private samlConfig: SAMLConfig

  constructor(config: any) {
    super(config)
    this.samlConfig = SAMLConfigSchema.parse(config.credentials)
  }

  async connect(): Promise<IntegrationResult<void>> {
    try {
      // Validate SAML configuration
      const validationResult = await this.validateSAMLConfig()
      
      if (validationResult.success) {
        this.updateConfig({ status: 'ACTIVE' as any })
        this.emit('connected')
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Invalid SAML configuration'
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
      const isValid = await this.validateSAMLConfig()
      return {
        success: true,
        data: isValid.success
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid SAML credentials',
        data: false
      }
    }
  }

  async healthCheck(): Promise<IntegrationResult<any>> {
    try {
      // Check if SSO URL is reachable
      const response = await fetch(this.samlConfig.ssoUrl, {
        method: 'GET',
        timeout: 10000
      })

      return {
        success: true,
        data: {
          status: 'healthy',
          ssoUrlReachable: response.ok,
          entityId: this.samlConfig.entityId,
          certificateValid: this.isCertificateValid()
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
    const syncId = `saml-${Date.now()}`
    const startTime = new Date()
    
    // SAML integrations typically don't sync data in the traditional sense
    // They provide authentication, so we'll return a successful sync
    return {
      syncId,
      integrationId: this.getId(),
      operation,
      status: SyncStatus.COMPLETED,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: Date.now() - startTime.getTime()
    }
  }

  // SAML-specific methods
  generateAuthRequest(relayState?: string): IntegrationResult<{ url: string; id: string }> {
    try {
      const id = this.generateUniqueId()
      const issueInstant = new Date().toISOString()
      
      const authRequest: SAMLRequest = {
        id,
        issueInstant,
        destination: this.samlConfig.ssoUrl,
        assertionConsumerServiceURL: this.getAssertionConsumerServiceURL(),
        nameIdPolicy: {
          format: this.samlConfig.nameIdFormat!,
          allowCreate: true
        }
      }

      const xml = this.buildAuthRequestXML(authRequest)
      const encodedRequest = Buffer.from(xml).toString('base64')
      
      const params = new URLSearchParams({
        SAMLRequest: encodedRequest
      })

      if (relayState) {
        params.append('RelayState', relayState)
      }

      if (this.samlConfig.authnRequestsSigned && this.samlConfig.privateKey) {
        const signature = this.signRequest(encodedRequest, relayState)
        params.append('SigAlg', `http://www.w3.org/2001/04/xmldsig-more#${this.samlConfig.signatureAlgorithm}`)
        params.append('Signature', signature)
      }

      const url = `${this.samlConfig.ssoUrl}?${params.toString()}`

      return {
        success: true,
        data: { url, id }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth request'
      }
    }
  }

  async processResponse(samlResponse: string, relayState?: string): Promise<IntegrationResult<SAMLUser>> {
    try {
      // Decode the SAML response
      const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8')
      
      // Parse and validate the response
      const parsedResponse = await this.parseSAMLResponse(decodedResponse)
      
      if (!parsedResponse.success || !parsedResponse.data) {
        return {
          success: false,
          error: 'Invalid SAML response'
        }
      }

      // Map attributes to user object
      const user = this.mapResponseToUser(parsedResponse.data)

      return {
        success: true,
        data: user
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process SAML response'
      }
    }
  }

  generateLogoutRequest(nameId: string, sessionIndex?: string): IntegrationResult<{ url: string; id: string }> {
    try {
      if (!this.samlConfig.sloUrl) {
        return {
          success: false,
          error: 'Single Logout URL not configured'
        }
      }

      const id = this.generateUniqueId()
      const issueInstant = new Date().toISOString()
      
      const logoutRequest = {
        id,
        issueInstant,
        destination: this.samlConfig.sloUrl,
        nameId,
        sessionIndex
      }

      const xml = this.buildLogoutRequestXML(logoutRequest)
      const encodedRequest = Buffer.from(xml).toString('base64')
      
      const params = new URLSearchParams({
        SAMLRequest: encodedRequest
      })

      if (this.samlConfig.authnRequestsSigned && this.samlConfig.privateKey) {
        const signature = this.signRequest(encodedRequest)
        params.append('SigAlg', `http://www.w3.org/2001/04/xmldsig-more#${this.samlConfig.signatureAlgorithm}`)
        params.append('Signature', signature)
      }

      const url = `${this.samlConfig.sloUrl}?${params.toString()}`

      return {
        success: true,
        data: { url, id }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate logout request'
      }
    }
  }

  getMetadata(): string {
    const entityId = this.samlConfig.entityId
    const acsUrl = this.getAssertionConsumerServiceURL()
    const sloUrl = this.samlConfig.sloUrl
    const certificate = this.cleanCertificate(this.samlConfig.certificate)

    let metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" 
                     entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="${this.samlConfig.authnRequestsSigned}" 
                      WantAssertionsSigned="${this.samlConfig.wantAssertionsSigned}" 
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${certificate}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>${this.samlConfig.nameIdFormat}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" 
                                Location="${acsUrl}" 
                                index="0" />`;

    if (sloUrl) {
      metadata += `
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" 
                           Location="${sloUrl}" />`;
    }

    metadata += `
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    return metadata
  }

  // Private methods
  private async validateSAMLConfig(): Promise<IntegrationResult<boolean>> {
    try {
      // Validate certificate format
      if (!this.isCertificateValid()) {
        return {
          success: false,
          error: 'Invalid certificate format'
        }
      }

      // Validate URLs
      try {
        new URL(this.samlConfig.ssoUrl)
        if (this.samlConfig.sloUrl) {
          new URL(this.samlConfig.sloUrl)
        }
      } catch {
        return {
          success: false,
          error: 'Invalid SSO or SLO URL'
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      }
    }
  }

  private isCertificateValid(): boolean {
    try {
      const cert = this.cleanCertificate(this.samlConfig.certificate)
      // Basic validation - check if it's base64 and has reasonable length
      const decoded = Buffer.from(cert, 'base64')
      return decoded.length > 100 && decoded.length < 10000
    } catch {
      return false
    }
  }

  private cleanCertificate(cert: string): string {
    return cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .trim()
  }

  private generateUniqueId(): string {
    return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  private getAssertionConsumerServiceURL(): string {
    // This would be the actual ACS URL for your application
    return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/saml/acs`
  }

  private buildAuthRequestXML(request: SAMLRequest): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${request.id}"
                    Version="2.0"
                    IssueInstant="${request.issueInstant}"
                    Destination="${request.destination}"
                    AssertionConsumerServiceURL="${request.assertionConsumerServiceURL}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${this.samlConfig.entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="${request.nameIdPolicy?.format}"
                      AllowCreate="${request.nameIdPolicy?.allowCreate}" />
</samlp:AuthnRequest>`
  }

  private buildLogoutRequestXML(request: any): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                     xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                     ID="${request.id}"
                     Version="2.0"
                     IssueInstant="${request.issueInstant}"
                     Destination="${request.destination}">
  <saml:Issuer>${this.samlConfig.entityId}</saml:Issuer>
  <saml:NameID Format="${this.samlConfig.nameIdFormat}">${request.nameId}</saml:NameID>`

    if (request.sessionIndex) {
      xml += `
  <samlp:SessionIndex>${request.sessionIndex}</samlp:SessionIndex>`
    }

    xml += `
</samlp:LogoutRequest>`

    return xml
  }

  private signRequest(samlRequest: string, relayState?: string): string {
    if (!this.samlConfig.privateKey) {
      throw new Error('Private key not configured for signing')
    }

    const sigAlg = `http://www.w3.org/2001/04/xmldsig-more#${this.samlConfig.signatureAlgorithm}`
    let queryString = `SAMLRequest=${encodeURIComponent(samlRequest)}`
    
    if (relayState) {
      queryString += `&RelayState=${encodeURIComponent(relayState)}`
    }
    
    queryString += `&SigAlg=${encodeURIComponent(sigAlg)}`

    const sign = createHash(this.samlConfig.digestAlgorithm!)
    sign.update(queryString)
    
    // In a real implementation, you'd use the private key to sign
    // This is a simplified version
    return Buffer.from(sign.digest()).toString('base64')
  }

  private async parseSAMLResponse(xml: string): Promise<IntegrationResult<SAMLResponse>> {
    try {
      // In a real implementation, you'd use a proper XML parser like xmldom or xml2js
      // This is a simplified version for demonstration
      
      // Basic XML parsing simulation
      const nameIdMatch = xml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/)
      const sessionIndexMatch = xml.match(/<saml:AuthnStatement[^>]*SessionIndex="([^"]+)"/)
      
      if (!nameIdMatch) {
        throw new Error('NameID not found in SAML response')
      }

      const response: SAMLResponse = {
        nameId: nameIdMatch[1],
        sessionIndex: sessionIndexMatch?.[1],
        attributes: this.extractAttributes(xml),
        issuer: this.extractIssuer(xml),
        inResponseTo: this.extractInResponseTo(xml),
        notBefore: this.extractNotBefore(xml),
        notOnOrAfter: this.extractNotOnOrAfter(xml)
      }

      // Validate response
      const validationResult = this.validateResponse(response, xml)
      if (!validationResult.success) {
        return validationResult
      }

      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse SAML response'
      }
    }
  }

  private extractAttributes(xml: string): Record<string, string | string[]> {
    const attributes: Record<string, string | string[]> = {}
    
    // Simple attribute extraction (in real implementation, use proper XML parser)
    const attributePattern = /<saml:Attribute[^>]*Name="([^"]+)"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>.*?<\/saml:Attribute>/gs
    let match
    
    while ((match = attributePattern.exec(xml)) !== null) {
      const [, name, value] = match
      attributes[name] = value
    }
    
    return attributes
  }

  private extractIssuer(xml: string): string {
    const issuerMatch = xml.match(/<saml:Issuer[^>]*>([^<]+)<\/saml:Issuer>/)
    return issuerMatch?.[1] || ''
  }

  private extractInResponseTo(xml: string): string | undefined {
    const match = xml.match(/InResponseTo="([^"]+)"/)
    return match?.[1]
  }

  private extractNotBefore(xml: string): Date | undefined {
    const match = xml.match(/NotBefore="([^"]+)"/)
    return match ? new Date(match[1]) : undefined
  }

  private extractNotOnOrAfter(xml: string): Date | undefined {
    const match = xml.match(/NotOnOrAfter="([^"]+)"/)
    return match ? new Date(match[1]) : undefined
  }

  private validateResponse(response: SAMLResponse, xml: string): IntegrationResult<boolean> {
    try {
      const now = new Date()
      const clockTolerance = this.samlConfig.clockTolerance!

      // Check time bounds
      if (response.notBefore && response.notBefore.getTime() > (now.getTime() + clockTolerance)) {
        return {
          success: false,
          error: 'SAML response not yet valid'
        }
      }

      if (response.notOnOrAfter && response.notOnOrAfter.getTime() < (now.getTime() - clockTolerance)) {
        return {
          success: false,
          error: 'SAML response has expired'
        }
      }

      // Validate signature if required
      if (this.samlConfig.wantResponseSigned || this.samlConfig.wantAssertionsSigned) {
        const signatureValid = this.validateSignature(xml)
        if (!signatureValid) {
          return {
            success: false,
            error: 'Invalid SAML response signature'
          }
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Response validation failed'
      }
    }
  }

  private validateSignature(xml: string): boolean {
    // In a real implementation, you'd validate the XML signature
    // This is a simplified version
    try {
      return xml.includes('<ds:Signature')
    } catch {
      return false
    }
  }

  private mapResponseToUser(response: SAMLResponse): SAMLUser {
    const user: SAMLUser = {
      nameId: response.nameId,
      sessionIndex: response.sessionIndex,
      attributes: response.attributes
    }

    // Map standard attributes
    const mapping = this.samlConfig.attributeMapping!
    
    for (const [key, attributeName] of Object.entries(mapping)) {
      const value = response.attributes[attributeName]
      if (value) {
        (user as any)[key] = Array.isArray(value) ? value[0] : value
      }
    }

    return user
  }
}