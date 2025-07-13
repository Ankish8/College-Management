"use client"

import { useSession } from "next-auth/react"

export function SessionDebug() {
  const { data: session, status } = useSession()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm z-50">
      <strong className="font-bold">Session Debug:</strong>
      <span className="block sm:inline">
        <br />Status: {status}
        <br />User: {session?.user?.name || 'None'}
        <br />Email: {session?.user?.email || 'None'}
        <br />Role: {(session?.user as any)?.role || 'None'}
        <br />ID: {(session?.user as any)?.id || 'None'}
      </span>
    </div>
  )
}