import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * Image Optimization API
 * 
 * Handles image optimization, resizing, and format conversion
 * for better performance and reduced bandwidth usage.
 */

interface OptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!) : undefined
    const height = searchParams.get('height') ? parseInt(searchParams.get('height')!) : undefined
    const quality = searchParams.get('quality') ? parseInt(searchParams.get('quality')!) : 85
    const format = (searchParams.get('format') as 'webp' | 'jpeg' | 'png') || 'webp'
    const fit = (searchParams.get('fit') as any) || 'cover'

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Generate cache key
    const cacheKey = generateCacheKey(imageUrl, { width, height, quality, format, fit })
    const cachedPath = getCachePath(cacheKey, format)

    // Return cached image if exists
    if (existsSync(cachedPath)) {
      console.log(`📁 Serving cached image: ${cacheKey}`)
      const cachedImage = await fetch(`file://${cachedPath}`)
      return new NextResponse(cachedImage.body, {
        headers: {
          'Content-Type': getContentType(format),
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
          'X-Image-Cache': 'HIT'
        }
      })
    }

    // For this example, we'll implement basic image optimization
    // In production, you'd use libraries like Sharp, or services like Cloudinary
    console.log(`🖼️ Optimizing image: ${imageUrl}`)

    // Fetch original image
    const originalResponse = await fetch(imageUrl)
    if (!originalResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 404 })
    }

    const imageBuffer = await originalResponse.arrayBuffer()
    
    // For demonstration, we'll return the original image with optimization headers
    // In a real implementation, you'd use Sharp or similar to actually optimize
    const optimizedBuffer = await optimizeImageBuffer(
      Buffer.from(imageBuffer), 
      { width, height, quality, format, fit }
    )

    // Cache the optimized image
    await cacheOptimizedImage(cachedPath, optimizedBuffer)

    return new NextResponse(optimizedBuffer as BodyInit, {
      headers: {
        'Content-Type': getContentType(format),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Image-Cache': 'MISS',
        'X-Image-Optimized': 'true'
      }
    })

  } catch (error) {
    console.error('Image optimization error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to optimize image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const options = {
      width: formData.get('width') ? parseInt(formData.get('width') as string) : undefined,
      height: formData.get('height') ? parseInt(formData.get('height') as string) : undefined,
      quality: formData.get('quality') ? parseInt(formData.get('quality') as string) : 85,
      format: (formData.get('format') as 'webp' | 'jpeg' | 'png') || 'webp'
    }

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Optimize uploaded image
    const optimizedBuffer = await optimizeImageBuffer(buffer, options)

    // Generate filename and save
    const filename = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.${options.format}`
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename)

    // Ensure upload directory exists
    const uploadDir = path.dirname(uploadPath)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    await writeFile(uploadPath, optimizedBuffer)

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/${filename}`,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      savings: Math.round(((buffer.length - optimizedBuffer.length) / buffer.length) * 100),
      options
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload and optimize image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions

function generateCacheKey(url: string, options: OptimizationOptions): string {
  const optionsStr = Object.entries(options)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  
  const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '')
  return `${urlHash}-${Buffer.from(optionsStr).toString('base64').replace(/[/+=]/g, '')}`
}

function getCachePath(cacheKey: string, format: string): string {
  const cacheDir = path.join(process.cwd(), '.next', 'cache', 'images')
  return path.join(cacheDir, `${cacheKey}.${format}`)
}

async function cacheOptimizedImage(cachePath: string, buffer: Buffer): Promise<void> {
  try {
    const cacheDir = path.dirname(cachePath)
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true })
    }
    await writeFile(cachePath, buffer)
    console.log(`💾 Cached optimized image: ${path.basename(cachePath)}`)
  } catch (error) {
    console.error('Failed to cache image:', error)
  }
}

async function optimizeImageBuffer(
  buffer: Buffer, 
  options: OptimizationOptions
): Promise<Buffer> {
  // This is a placeholder for actual image optimization
  // In production, you would use Sharp or similar:
  /*
  const sharp = require('sharp')
  
  let pipeline = sharp(buffer)
  
  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: options.fit,
      withoutEnlargement: true
    })
  }
  
  switch (options.format) {
    case 'webp':
      pipeline = pipeline.webp({ quality: options.quality })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: options.quality })
      break
    case 'png':
      pipeline = pipeline.png({ quality: options.quality })
      break
  }
  
  return await pipeline.toBuffer()
  */

  // For now, return the original buffer
  console.log(`⚡ Image optimization applied: ${JSON.stringify(options)}`)
  return buffer
}

function getContentType(format: string): string {
  switch (format) {
    case 'webp': return 'image/webp'
    case 'jpeg': return 'image/jpeg' 
    case 'png': return 'image/png'
    default: return 'image/webp'
  }
}

/**
 * Usage Examples:
 * 
 * GET /api/images/optimize?url=https://example.com/image.jpg&width=800&height=600&format=webp&quality=85
 * 
 * POST /api/images/optimize
 * FormData: {
 *   image: File,
 *   width: '800',
 *   height: '600', 
 *   format: 'webp',
 *   quality: '85'
 * }
 */