"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
    >
      Sign out
    </Button>
  )
}