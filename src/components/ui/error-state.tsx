import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/attendance'

interface ErrorStateProps {
  error: ApiError
  onRetry?: () => void
  className?: string
  variant?: 'inline' | 'card' | 'page'
}

export function ErrorState({ 
  error, 
  onRetry, 
  className,
  variant = 'card' 
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message}
        </p>
        {error.code && (
          <p className="text-xs text-muted-foreground mt-1">
            Error Code: {error.code}
          </p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={cn('p-4', className)}>
        {content}
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
        {content}
      </div>
    )
  }

  // Default card variant
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  )
}

interface NetworkErrorProps {
  onRetry?: () => void
  className?: string
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorState
      error={{
        message: 'Unable to connect. Please check your internet connection.',
        code: 'NETWORK_ERROR'
      }}
      onRetry={onRetry}
      className={className}
    />
  )
}

interface NoDataStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function NoDataState({ 
  title = 'No data available',
  description = 'There is no data to display at the moment.',
  action,
  className 
}: NoDataStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center p-6', className)}>
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}