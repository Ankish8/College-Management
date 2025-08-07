'use client'

import { useState } from 'react'
import { OptimizedImage, useImagePerformance } from '@/components/ui/optimized-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * Demo component showcasing OptimizedImage features
 * This demonstrates various optimization scenarios
 */
export function ImageOptimizationDemo() {
  const [showDemo, setShowDemo] = useState(false)
  const { stats, metrics, refresh } = useImagePerformance()

  const demoImages = [
    {
      name: 'Hero Image',
      src: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
      width: 400,
      height: 200,
      priority: true,
      lazy: false
    },
    {
      name: 'Student Profile',
      src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      width: 100,
      height: 100,
      lazy: true,
      fallbackSrc: '/images/default-avatar.png'
    },
    {
      name: 'Campus Image',
      src: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
      width: 300,
      height: 180,
      lazy: true,
      quality: 70
    },
    {
      name: 'Faculty Photo',
      src: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
      width: 75,
      height: 75,
      lazy: true,
      placeholder: 'skeleton' as const
    }
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Image Optimization Demo
          <Button onClick={() => setShowDemo(!showDemo)} variant="outline">
            {showDemo ? 'Hide Demo' : 'Show Demo'}
          </Button>
        </CardTitle>
      </CardHeader>

      {showDemo && (
        <CardContent className="space-y-6">
          {/* Performance Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
                <div className="text-sm text-gray-600">Total Images</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.averageLoadTime}ms</div>
                <div className="text-sm text-gray-600">Avg Load Time</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.slowLoads}</div>
                <div className="text-sm text-gray-600">Slow Loads (&gt;2s)</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.fastLoads}</div>
                <div className="text-sm text-gray-600">Fast Loads (&lt;500ms)</div>
              </div>
            </div>
          )}

          {/* Demo Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Demo Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {demoImages.map((image, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">{image.name}</h4>
                    <Badge variant="outline">
                      {image.lazy ? 'Lazy' : 'Priority'}
                    </Badge>
                    {image.quality && (
                      <Badge variant="secondary">
                        Q{image.quality}
                      </Badge>
                    )}
                  </div>
                  
                  <OptimizedImage
                    src={image.src}
                    alt={image.name}
                    width={image.width}
                    height={image.height}
                    priority={image.priority}
                    lazy={image.lazy}
                    quality={image.quality}
                    fallbackSrc={image.fallbackSrc}
                    placeholder={image.placeholder}
                    name={image.name.toLowerCase().replace(' ', '-')}
                    trackPerformance={true}
                    className="rounded-md border"
                  />
                  
                  <div className="mt-2 text-sm text-gray-600">
                    {image.width}x{image.height} • {image.quality || 85}% quality
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Metrics */}
          {metrics.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Load Metrics</h3>
                <Button onClick={refresh} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {metrics.slice(-10).reverse().map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={metric.success ? 'default' : 'destructive'}>
                        {metric.success ? '✓' : '✗'}
                      </Badge>
                      <span className="font-medium">{metric.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>{metric.loadTime}ms</span>
                      {metric.size && (
                        <span className="text-xs">
                          {metric.size.width}x{metric.size.height}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Examples */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Usage Examples</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto">
{`// Basic usage with lazy loading
<OptimizedImage
  src="/images/student.jpg"
  alt="Student Photo"
  width={200}
  height={200}
  lazy={true}
  trackPerformance={true}
/>

// Priority image with fallback
<OptimizedImage
  src="/images/hero.jpg"
  alt="Campus Hero"
  width={800}
  height={400}
  priority={true}
  lazy={false}
  fallbackSrc="/images/placeholder.jpg"
  quality={90}
/>

// Custom placeholder and error handling
<OptimizedImage
  src="/images/profile.jpg"
  alt="Faculty Profile"
  width={150}
  height={150}
  placeholder="skeleton"
  onImageLoad={() => console.log('Image loaded!')}
  onImageError={(error) => console.error(error)}
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Simple optimized image component for production use
 */
export function StudentAvatar({ 
  student, 
  size = 40 
}: { 
  student: { name: string; avatar?: string }; 
  size?: number 
}) {
  return (
    <OptimizedImage
      src={student.avatar || '/images/default-avatar.png'}
      alt={`${student.name} avatar`}
      width={size}
      height={size}
      lazy={true}
      quality={80}
      fallbackSrc="/images/default-avatar.png"
      name={`student-avatar-${student.name}`}
      className="rounded-full border-2 border-white shadow-sm"
      placeholder="skeleton"
    />
  )
}

/**
 * Campus image component with responsive loading
 */
export function CampusImage({ 
  src, 
  alt, 
  priority = false 
}: { 
  src: string; 
  alt: string; 
  priority?: boolean 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={800}
      height={500}
      priority={priority}
      lazy={!priority}
      quality={85}
      name={`campus-${alt.toLowerCase().replace(/\s+/g, '-')}`}
      className="w-full h-auto rounded-lg shadow-md"
      loadingClassName="animate-pulse bg-gray-200"
      errorClassName="bg-red-50 border-red-200"
    />
  )
}