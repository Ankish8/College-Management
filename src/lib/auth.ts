import NextAuth from "next-auth"
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
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string
          }
        })

        if (!user) {
          return null
        }

        // For development, we'll create a simple password check
        // In production, you should hash passwords properly
        const isPasswordValid = credentials.password === "password123" || 
          (user.email === "admin@jlu.edu.in" && credentials.password === "admin123")

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // Fetch full user details including relationships
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
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
          session.user = {
            ...session.user,
            id: dbUser.id,
            role: dbUser.role as Role,
            phone: dbUser.phone,
            employeeId: dbUser.employeeId,
            departmentId: dbUser.departmentId,
            status: dbUser.status as UserStatus,
            department: dbUser.department ? {
              id: dbUser.department.id,
              name: dbUser.department.name,
              shortName: dbUser.department.shortName,
            } : undefined,
            student: dbUser.student ? {
              id: dbUser.student.id,
              studentId: dbUser.student.studentId,
              rollNumber: dbUser.student.rollNumber,
              batchId: dbUser.student.batchId,
            } : undefined,
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
  },
}

export default NextAuth(authOptions)