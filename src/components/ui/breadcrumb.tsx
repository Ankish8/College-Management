"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          )}
          {item.current ? (
            <span className="font-medium text-foreground">
              {item.label}
            </span>
          ) : item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}