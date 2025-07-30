"use client"

import { cn } from "@/lib/utils"

interface StudentAvatarProps {
  name: string
  photo?: string
  className?: string
}

export function StudentAvatar({ name, photo, className }: StudentAvatarProps) {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={cn(
          "w-8 h-8 rounded-md object-cover",
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground",
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}