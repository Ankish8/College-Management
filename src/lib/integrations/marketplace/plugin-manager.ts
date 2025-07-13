/**
 * Plugin Manager for Integration Marketplace
 * Handles third-party extensions, plugins, and custom integrations
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: PluginCategory
  type: PluginType
  status: PluginStatus
  config: PluginConfig
  manifest: PluginManifest
  permissions: Permission[]
  dependencies: Dependency[]
  installPath?: string
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  lastUsed?: Date
}

export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  license: string
  keywords: string[]
  main: string
  engines: {
    node: string
    cms?: string
  }
  scripts?: Record<string, string>
  hooks?: Hook[]
  apiRoutes?: APIRoute[]
  webComponents?: WebComponent[]
  settings?: SettingDefinition[]
}

export interface PluginConfig {
  enabled: boolean
  autoUpdate: boolean
  settings: Record<string, unknown>
  environment: 'development' | 'staging' | 'production'
  sandbox: boolean
  resourceLimits: ResourceLimits
}

export interface ResourceLimits {
  maxMemory: number // MB
  maxCPU: number // percentage
  maxStorage: number // MB
  maxRequests: number // per minute
  maxConnections: number
}

export interface Permission {
  name: string
  description: string
  scope: 'system' | 'user' | 'integration' | 'data'
  level: 'read' | 'write' | 'admin'
  resources: string[]
}

export interface Dependency {
  name: string
  version: string
  type: 'plugin' | 'npm' | 'system'
  required: boolean
}

export interface Hook {
  name: string
  event: string
  handler: string
  priority: number
  async: boolean
}

export interface APIRoute {
  path: string
  method: string
  handler: string
  middleware?: string[]
  permissions: string[]
}

export interface WebComponent {
  name: string
  component: string
  props?: Record<string, unknown>
  slot?: string
}

export interface SettingDefinition {
  key: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  label: string
  description?: string
  required: boolean
  default?: unknown
  validation?: unknown
  group?: string
}

export enum PluginCategory {
  INTEGRATION = 'INTEGRATION',
  COMMUNICATION = 'COMMUNICATION',
  ANALYTICS = 'ANALYTICS',
  SECURITY = 'SECURITY',
  UI_ENHANCEMENT = 'UI_ENHANCEMENT',
  WORKFLOW = 'WORKFLOW',
  REPORTING = 'REPORTING',
  UTILITY = 'UTILITY',
  CUSTOM = 'CUSTOM'
}

export enum PluginType {
  INTEGRATION_PROVIDER = 'INTEGRATION_PROVIDER',
  WEBHOOK_HANDLER = 'WEBHOOK_HANDLER',
  MIDDLEWARE = 'MIDDLEWARE',
  UI_COMPONENT = 'UI_COMPONENT',
  SCHEDULED_TASK = 'SCHEDULED_TASK',
  EVENT_LISTENER = 'EVENT_LISTENER',
  API_EXTENSION = 'API_EXTENSION',
  THEME = 'THEME',
  CUSTOM = 'CUSTOM'
}

export enum PluginStatus {
  INSTALLED = 'INSTALLED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UPDATING = 'UPDATING',
  ERROR = 'ERROR',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  DEPRECATED = 'DEPRECATED'
}

export interface PluginStore {
  id: string
  name: string
  description: string
  icon?: string
  screenshots: string[]
  price: number
  currency: string
  downloads: number
  rating: number
  reviews: number
  verified: boolean
  featured: boolean
  plugin: Plugin
  publishedAt: Date
}

export interface PluginInstallOptions {
  version?: string
  environment?: 'development' | 'staging' | 'production'
  autoStart?: boolean
  customConfig?: Record<string, unknown>
}

export interface PluginExecutionContext {
  plugin: Plugin
  userId?: string
  integrationId?: string
  requestId: string
  permissions: string[]
  limits: ResourceLimits
  environment: Record<string, unknown>
}

const PluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  author: z.string().min(1),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().min(1),
  keywords: z.array(z.string()),
  main: z.string().min(1),
  engines: z.object({
    node: z.string(),
    cms: z.string().optional()
  }),
  scripts: z.record(z.string()).optional(),
  hooks: z.array(z.object({
    name: z.string(),
    event: z.string(),
    handler: z.string(),
    priority: z.number().default(0),
    async: z.boolean().default(false)
  })).optional(),
  apiRoutes: z.array(z.object({
    path: z.string(),
    method: z.string(),
    handler: z.string(),
    middleware: z.array(z.string()).optional(),
    permissions: z.array(z.string())
  })).optional(),
  webComponents: z.array(z.object({
    name: z.string(),
    component: z.string(),
    props: z.record(z.unknown()).optional(),
    slot: z.string().optional()
  })).optional(),
  settings: z.array(z.object({
    key: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    label: z.string(),
    description: z.string().optional(),
    required: z.boolean(),
    default: z.unknown().optional(),
    validation: z.unknown().optional(),
    group: z.string().optional()
  })).optional()
})

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map()
  private activePlugins: Set<string> = new Set()
  private pluginStore: Map<string, PluginStore> = new Map()
  private executionContexts: Map<string, PluginExecutionContext> = new Map()
  private resourceMonitor: NodeJS.Timeout
  private sandboxes: Map<string, any> = new Map()

  constructor() {
    super()
    this.loadInstalledPlugins()
    this.startResourceMonitoring()
  }

  /**
   * Install a plugin
   */
  async installPlugin(
    source: string | PluginManifest, 
    options: PluginInstallOptions = {}
  ): Promise<{ success: boolean; plugin?: Plugin; error?: string }> {
    try {
      let manifest: PluginManifest

      if (typeof source === 'string') {
        // Install from URL or plugin store
        manifest = await this.downloadPlugin(source, options.version)
      } else {
        // Install from manifest
        manifest = source
      }

      // Validate manifest
      const validatedManifest = PluginManifestSchema.parse(manifest)

      // Check dependencies
      const dependencyCheck = await this.checkDependencies(validatedManifest.hooks || [])
      if (!dependencyCheck.satisfied) {
        return {
          success: false,
          error: `Missing dependencies: ${dependencyCheck.missing.join(', ')}`
        }
      }

      // Validate permissions
      const permissions = await this.extractPermissions(validatedManifest)
      const permissionCheck = await this.validatePermissions(permissions)
      if (!permissionCheck.valid) {
        return {
          success: false,
          error: `Invalid permissions: ${permissionCheck.errors.join(', ')}`
        }
      }

      // Create plugin
      const plugin: Plugin = {
        id: this.generatePluginId(),
        name: validatedManifest.name,
        version: validatedManifest.version,
        description: validatedManifest.description,
        author: validatedManifest.author,
        category: this.inferCategory(validatedManifest),
        type: this.inferType(validatedManifest),
        status: PluginStatus.INSTALLED,
        config: {
          enabled: false,
          autoUpdate: true,
          settings: options.customConfig || {},
          environment: options.environment || 'production',
          sandbox: true,
          resourceLimits: this.getDefaultResourceLimits()
        },
        manifest: validatedManifest,
        permissions,
        dependencies: this.extractDependencies(validatedManifest),
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Install plugin files
      const installResult = await this.installPluginFiles(plugin, source as string)
      if (!installResult.success) {
        return {
          success: false,
          error: installResult.error
        }
      }

      plugin.installPath = installResult.path
      this.plugins.set(plugin.id, plugin)

      // Save to database
      await this.savePlugin(plugin)

      // Auto-start if requested
      if (options.autoStart) {
        await this.startPlugin(plugin.id)
      }

      this.emit('pluginInstalled', plugin)

      return {
        success: true,
        plugin
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: 'Plugin not found'
        }
      }

      if (plugin.isSystem) {
        return {
          success: false,
          error: 'Cannot uninstall system plugin'
        }
      }

      // Stop plugin if active
      if (this.activePlugins.has(pluginId)) {
        await this.stopPlugin(pluginId)
      }

      // Check if other plugins depend on this one
      const dependents = this.findDependentPlugins(pluginId)
      if (dependents.length > 0) {
        return {
          success: false,
          error: `Cannot uninstall. The following plugins depend on it: ${dependents.map(p => p.name).join(', ')}`
        }
      }

      // Remove plugin files
      if (plugin.installPath) {
        await this.removePluginFiles(plugin.installPath)
      }

      // Remove from database
      await this.removePlugin(pluginId)

      this.plugins.delete(pluginId)
      this.emit('pluginUninstalled', plugin)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uninstallation failed'
      }
    }
  }

  /**
   * Start a plugin
   */
  async startPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: 'Plugin not found'
        }
      }

      if (this.activePlugins.has(pluginId)) {
        return {
          success: false,
          error: 'Plugin already active'
        }
      }

      // Check dependencies
      const dependencyCheck = await this.checkDependencies(plugin.dependencies)
      if (!dependencyCheck.satisfied) {
        return {
          success: false,
          error: `Missing dependencies: ${dependencyCheck.missing.join(', ')}`
        }
      }

      // Create execution context
      const context = await this.createExecutionContext(plugin)
      this.executionContexts.set(pluginId, context)

      // Load plugin code
      const pluginModule = await this.loadPluginModule(plugin)
      if (!pluginModule) {
        return {
          success: false,
          error: 'Failed to load plugin module'
        }
      }

      // Initialize plugin
      if (pluginModule.initialize) {
        await pluginModule.initialize(context)
      }

      // Register hooks
      if (plugin.manifest.hooks) {
        for (const hook of plugin.manifest.hooks) {
          this.registerHook(pluginId, hook)
        }
      }

      // Register API routes
      if (plugin.manifest.apiRoutes) {
        for (const route of plugin.manifest.apiRoutes) {
          this.registerAPIRoute(pluginId, route)
        }
      }

      plugin.status = PluginStatus.ACTIVE
      plugin.config.enabled = true
      plugin.lastUsed = new Date()
      plugin.updatedAt = new Date()
      
      this.activePlugins.add(pluginId)
      await this.savePlugin(plugin)

      this.emit('pluginStarted', plugin)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start plugin'
      }
    }
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: 'Plugin not found'
        }
      }

      if (!this.activePlugins.has(pluginId)) {
        return {
          success: false,
          error: 'Plugin not active'
        }
      }

      // Unregister hooks and routes
      this.unregisterPluginHooks(pluginId)
      this.unregisterPluginRoutes(pluginId)

      // Get plugin module and cleanup
      const pluginModule = await this.loadPluginModule(plugin)
      if (pluginModule && pluginModule.cleanup) {
        const context = this.executionContexts.get(pluginId)
        if (context) {
          await pluginModule.cleanup(context)
        }
      }

      // Remove execution context
      this.executionContexts.delete(pluginId)

      plugin.status = PluginStatus.INACTIVE
      plugin.config.enabled = false
      plugin.updatedAt = new Date()
      
      this.activePlugins.delete(pluginId)
      await this.savePlugin(plugin)

      this.emit('pluginStopped', plugin)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop plugin'
      }
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string, version?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: 'Plugin not found'
        }
      }

      plugin.status = PluginStatus.UPDATING

      // Stop plugin if active
      const wasActive = this.activePlugins.has(pluginId)
      if (wasActive) {
        await this.stopPlugin(pluginId)
      }

      // Download and install new version
      const updateSource = await this.getUpdateSource(plugin, version)
      const installResult = await this.installPlugin(updateSource, {
        version,
        environment: plugin.config.environment
      })

      if (!installResult.success) {
        plugin.status = PluginStatus.ERROR
        return {
          success: false,
          error: installResult.error
        }
      }

      // Remove old plugin
      this.plugins.delete(pluginId)
      await this.removePlugin(pluginId)

      // Restart if was active
      if (wasActive) {
        await this.startPlugin(installResult.plugin!.id)
      }

      this.emit('pluginUpdated', installResult.plugin)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }
    }
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): Plugin[] {
    return this.getAllPlugins().filter(plugin => this.activePlugins.has(plugin.id))
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * Search plugin store
   */
  searchPluginStore(query: {
    category?: PluginCategory
    type?: PluginType
    search?: string
    verified?: boolean
    featured?: boolean
  }): PluginStore[] {
    let results = Array.from(this.pluginStore.values())

    if (query.category) {
      results = results.filter(store => store.plugin.category === query.category)
    }

    if (query.type) {
      results = results.filter(store => store.plugin.type === query.type)
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase()
      results = results.filter(store => 
        store.name.toLowerCase().includes(searchLower) ||
        store.description.toLowerCase().includes(searchLower) ||
        store.plugin.manifest.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchLower)
        )
      )
    }

    if (query.verified !== undefined) {
      results = results.filter(store => store.verified === query.verified)
    }

    if (query.featured !== undefined) {
      results = results.filter(store => store.featured === query.featured)
    }

    return results.sort((a, b) => b.rating - a.rating)
  }

  /**
   * Execute plugin hook
   */
  async executeHook(eventName: string, data: any): Promise<any> {
    const results: any[] = []
    
    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId)
      if (!plugin || !plugin.manifest.hooks) continue

      const hooks = plugin.manifest.hooks.filter(hook => hook.event === eventName)
      
      for (const hook of hooks) {
        try {
          const context = this.executionContexts.get(pluginId)
          if (!context) continue

          const pluginModule = await this.loadPluginModule(plugin)
          if (pluginModule && pluginModule[hook.handler]) {
            const result = await pluginModule[hook.handler](data, context)
            results.push(result)
          }
        } catch (error) {
          console.error(`Error executing hook ${hook.name} in plugin ${plugin.name}:`, error)
        }
      }
    }

    return results
  }

  // Private methods
  private async loadInstalledPlugins(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('Loading installed plugins...')
  }

  private startResourceMonitoring(): void {
    this.resourceMonitor = setInterval(() => {
      this.monitorPluginResources()
    }, 30000) // Monitor every 30 seconds
  }

  private async monitorPluginResources(): Promise<void> {
    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId)
      if (!plugin) continue

      // Monitor memory, CPU, etc.
      // This would use actual system monitoring in production
      const usage = {
        memory: 0, // MB
        cpu: 0, // percentage
        requests: 0 // per minute
      }

      // Check against limits
      if (usage.memory > plugin.config.resourceLimits.maxMemory) {
        console.warn(`Plugin ${plugin.name} exceeded memory limit`)
        await this.stopPlugin(pluginId)
      }
    }
  }

  private async downloadPlugin(source: string, version?: string): Promise<PluginManifest> {
    // In a real implementation, this would download from URL or plugin store
    throw new Error('Plugin download not implemented')
  }

  private async checkDependencies(dependencies: Dependency[]): Promise<{
    satisfied: boolean
    missing: string[]
  }> {
    const missing: string[] = []
    
    for (const dep of dependencies) {
      if (dep.type === 'plugin') {
        const plugin = Array.from(this.plugins.values()).find(p => p.name === dep.name)
        if (!plugin || !this.versionSatisfies(plugin.version, dep.version)) {
          missing.push(`${dep.name}@${dep.version}`)
        }
      }
      // Check npm and system dependencies would go here
    }

    return {
      satisfied: missing.length === 0,
      missing
    }
  }

  private versionSatisfies(installed: string, required: string): boolean {
    // Simple version comparison - in production, use semver
    return installed >= required
  }

  private async extractPermissions(manifest: PluginManifest): Promise<Permission[]> {
    const permissions: Permission[] = []
    
    // Extract permissions from API routes
    if (manifest.apiRoutes) {
      for (const route of manifest.apiRoutes) {
        for (const permission of route.permissions) {
          permissions.push({
            name: permission,
            description: `Access to ${route.method} ${route.path}`,
            scope: 'system',
            level: 'read',
            resources: [route.path]
          })
        }
      }
    }

    return permissions
  }

  private async validatePermissions(permissions: Permission[]): Promise<{
    valid: boolean
    errors: string[]
  }> {
    // In a real implementation, this would validate against system permissions
    return { valid: true, errors: [] }
  }

  private inferCategory(manifest: PluginManifest): PluginCategory {
    const keywords = manifest.keywords.map(k => k.toLowerCase())
    
    if (keywords.some(k => ['integration', 'api', 'sync'].includes(k))) {
      return PluginCategory.INTEGRATION
    }
    if (keywords.some(k => ['communication', 'email', 'sms', 'notification'].includes(k))) {
      return PluginCategory.COMMUNICATION
    }
    if (keywords.some(k => ['analytics', 'reporting', 'dashboard'].includes(k))) {
      return PluginCategory.ANALYTICS
    }
    if (keywords.some(k => ['security', 'auth', 'encryption'].includes(k))) {
      return PluginCategory.SECURITY
    }
    
    return PluginCategory.CUSTOM
  }

  private inferType(manifest: PluginManifest): PluginType {
    if (manifest.hooks?.some(h => h.event.includes('integration'))) {
      return PluginType.INTEGRATION_PROVIDER
    }
    if (manifest.hooks?.some(h => h.event.includes('webhook'))) {
      return PluginType.WEBHOOK_HANDLER
    }
    if (manifest.webComponents && manifest.webComponents.length > 0) {
      return PluginType.UI_COMPONENT
    }
    if (manifest.apiRoutes && manifest.apiRoutes.length > 0) {
      return PluginType.API_EXTENSION
    }
    
    return PluginType.CUSTOM
  }

  private extractDependencies(manifest: PluginManifest): Dependency[] {
    // In a real implementation, this would parse package.json or similar
    return []
  }

  private getDefaultResourceLimits(): ResourceLimits {
    return {
      maxMemory: 128, // MB
      maxCPU: 10, // percentage
      maxStorage: 50, // MB
      maxRequests: 1000, // per minute
      maxConnections: 10
    }
  }

  private async installPluginFiles(plugin: Plugin, source: string): Promise<{
    success: boolean
    path?: string
    error?: string
  }> {
    // In a real implementation, this would extract and install plugin files
    return {
      success: true,
      path: `/plugins/${plugin.id}`
    }
  }

  private async removePluginFiles(path: string): Promise<void> {
    // In a real implementation, this would remove plugin files
    console.log('Removing plugin files from:', path)
  }

  private findDependentPlugins(pluginId: string): Plugin[] {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return []

    return Array.from(this.plugins.values()).filter(p =>
      p.dependencies.some(dep => dep.name === plugin.name)
    )
  }

  private async createExecutionContext(plugin: Plugin): Promise<PluginExecutionContext> {
    return {
      plugin,
      requestId: this.generateRequestId(),
      permissions: plugin.permissions.map(p => p.name),
      limits: plugin.config.resourceLimits,
      environment: {
        NODE_ENV: plugin.config.environment,
        PLUGIN_ID: plugin.id,
        PLUGIN_PATH: plugin.installPath
      }
    }
  }

  private async loadPluginModule(plugin: Plugin): Promise<any> {
    // In a real implementation, this would dynamically import the plugin module
    // with proper sandboxing and security measures
    try {
      if (plugin.config.sandbox) {
        return this.loadInSandbox(plugin)
      } else {
        // Direct import - less secure but faster
        return await import(plugin.installPath + '/' + plugin.manifest.main)
      }
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.name}:`, error)
      return null
    }
  }

  private loadInSandbox(plugin: Plugin): any {
    // In a real implementation, this would use vm2 or similar for sandboxing
    console.log('Loading plugin in sandbox:', plugin.name)
    return {}
  }

  private registerHook(pluginId: string, hook: Hook): void {
    // In a real implementation, this would register the hook with the event system
    console.log(`Registering hook ${hook.name} for plugin ${pluginId}`)
  }

  private registerAPIRoute(pluginId: string, route: APIRoute): void {
    // In a real implementation, this would register the route with the API router
    console.log(`Registering API route ${route.method} ${route.path} for plugin ${pluginId}`)
  }

  private unregisterPluginHooks(pluginId: string): void {
    // In a real implementation, this would unregister all hooks for the plugin
    console.log('Unregistering hooks for plugin:', pluginId)
  }

  private unregisterPluginRoutes(pluginId: string): void {
    // In a real implementation, this would unregister all routes for the plugin
    console.log('Unregistering routes for plugin:', pluginId)
  }

  private async getUpdateSource(plugin: Plugin, version?: string): Promise<string> {
    // In a real implementation, this would get the update source URL
    return `https://plugins.cms.com/${plugin.name}/${version || 'latest'}`
  }

  private generatePluginId(): string {
    return `plugin_${randomBytes(16).toString('hex')}`
  }

  private generateRequestId(): string {
    return `req_${randomBytes(16).toString('hex')}`
  }

  private async savePlugin(plugin: Plugin): Promise<void> {
    // In a real implementation, this would save to database
    console.log('Saving plugin:', plugin.id)
  }

  private async removePlugin(pluginId: string): Promise<void> {
    // In a real implementation, this would remove from database
    console.log('Removing plugin:', pluginId)
  }

  // Cleanup
  destroy(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor)
    }
    this.removeAllListeners()
  }
}

// Singleton instance
export const pluginManager = new PluginManager()

// Educational system specific plugin utilities
export const EducationPluginUtils = {
  createLMSPlugin: (name: string, provider: string): Partial<PluginManifest> => ({
    name,
    version: '1.0.0',
    description: `${provider} LMS integration plugin`,
    author: 'College Management System',
    license: 'MIT',
    keywords: ['lms', 'integration', provider.toLowerCase()],
    main: 'index.js',
    engines: { node: '>=16.0.0' },
    hooks: [{
      name: 'sync-courses',
      event: 'course.sync',
      handler: 'syncCourses',
      priority: 0,
      async: true
    }]
  }),

  createNotificationPlugin: (name: string, channel: string): Partial<PluginManifest> => ({
    name,
    version: '1.0.0',
    description: `${channel} notification plugin`,
    author: 'College Management System',
    license: 'MIT',
    keywords: ['notification', 'communication', channel.toLowerCase()],
    main: 'index.js',
    engines: { node: '>=16.0.0' },
    hooks: [{
      name: 'send-notification',
      event: 'notification.send',
      handler: 'sendNotification',
      priority: 0,
      async: true
    }]
  })
}