import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import type { Role, UserStatus } from "@prisma/client"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("Auth attempt:", credentials?.email)
          console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set")
          
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials")
            return null
          }

          console.log("Attempting to find user in database...")
          const user = await db.user.findUnique({
            where: {
              email: credentials.email as string
            }
          })

          if (!user) {
            console.log("User not found:", credentials.email)
            // Let's check if database connection works
            const userCount = await db.user.count()
            console.log("Total users in database:", userCount)
            return null
          }

          console.log("User found:", user.email, user.role)

          // For development, we'll create a simple password check
          // In production, you should hash passwords properly
          const isPasswordValid = credentials.password === "password123" || 
            (user.email === "admin@jlu.edu.in" && credentials.password === "admin123")

          console.log("Password valid:", isPasswordValid, "Password provided:", credentials.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("Auth authorize error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.id) {
        // Use cached token data instead of DB query on every session check
        (session.user as any) = {
          ...session.user,
          id: token.id as string,
          role: token.role as Role,
          phone: token.phone as string | null,
          employeeId: token.employeeId as string | null,
          departmentId: token.departmentId as string | null,
          status: token.status as UserStatus,
          department: token.department as any,
          student: token.student as any,
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        // Only fetch user details during initial login
        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            include: {
              department: true,
              student: {
                include: {
                  batch: true
                }
              }
            }
          })

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.phone = dbUser.phone
            token.employeeId = dbUser.employeeId
            token.departmentId = dbUser.departmentId
            token.status = dbUser.status
            token.department = dbUser.department ? {
              id: dbUser.department.id,
              name: dbUser.department.name,
              shortName: dbUser.department.shortName,
            } : undefined
            token.student = dbUser.student ? {
              id: dbUser.student.id,
              studentId: dbUser.student.studentId,
              rollNumber: dbUser.student.rollNumber,
              batchId: dbUser.student.batchId,
            } : undefined
          }
        } catch (error) {
          console.error("JWT callback error:", error)
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 2 * 60 * 60, // 2 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

