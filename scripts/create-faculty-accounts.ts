import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createFacultyAccounts() {
  console.log('Creating faculty accounts...')
  
  try {
    // Check if Design department exists
    const department = await prisma.department.findFirst({
      where: { shortName: 'Design' }
    })

    if (!department) {
      console.error('Design department not found. Please run seed first.')
      return
    }

    // List of faculty members for JLU Design Department
    const facultyMembers = [
      { name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@jlu.edu.in', employeeId: 'FAC001' },
      { name: 'Prof. Priya Sharma', email: 'priya.sharma@jlu.edu.in', employeeId: 'FAC002' },
      { name: 'Dr. Amit Singh', email: 'amit.singh@jlu.edu.in', employeeId: 'FAC003' },
      { name: 'Ms. Neha Gupta', email: 'neha.gupta@jlu.edu.in', employeeId: 'FAC004' },
      { name: 'Mr. Vikram Patel', email: 'vikram.patel@jlu.edu.in', employeeId: 'FAC005' },
      { name: 'Dr. Anjali Verma', email: 'anjali.verma@jlu.edu.in', employeeId: 'FAC006' },
      { name: 'Prof. Suresh Reddy', email: 'suresh.reddy@jlu.edu.in', employeeId: 'FAC007' },
      { name: 'Ms. Deepa Nair', email: 'deepa.nair@jlu.edu.in', employeeId: 'FAC008' },
      { name: 'Mr. Arjun Mehta', email: 'arjun.mehta@jlu.edu.in', employeeId: 'FAC009' },
      { name: 'Dr. Kavita Joshi', email: 'kavita.joshi@jlu.edu.in', employeeId: 'FAC010' },
      { name: 'Prof. Ravi Chandran', email: 'ravi.chandran@jlu.edu.in', employeeId: 'FAC011' },
      { name: 'Ms. Sonal Agarwal', email: 'sonal.agarwal@jlu.edu.in', employeeId: 'FAC012' },
      { name: 'Mr. Nikhil Das', email: 'nikhil.das@jlu.edu.in', employeeId: 'FAC013' },
      { name: 'Dr. Meera Iyer', email: 'meera.iyer@jlu.edu.in', employeeId: 'FAC014' },
      { name: 'Prof. Ankish Khatri', email: 'ankish.khatri@jlu.edu.in', employeeId: 'FAC015' },
    ]

    // Default password for all faculty
    const defaultPassword = 'JLU@2025faculty'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    for (const faculty of facultyMembers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: faculty.email }
        })

        if (existingUser) {
          console.log(`Faculty ${faculty.name} already exists`)
          continue
        }

        // Create new faculty user
        await prisma.user.create({
          data: {
            name: faculty.name,
            email: faculty.email,
            password: hashedPassword,
            employeeId: faculty.employeeId,
            role: 'FACULTY',
            status: 'ACTIVE',
            departmentId: department.id,
          }
        })

        console.log(`Created faculty account for ${faculty.name}`)
      } catch (error) {
        console.error(`Error creating account for ${faculty.name}:`, error)
      }
    }

    // Ensure admin account exists
    const adminEmail = 'admin@jlu.edu.in'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      const adminPassword = 'JLU@2025admin'
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10)
      
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: adminEmail,
          password: hashedAdminPassword,
          employeeId: 'ADMIN001',
          role: 'ADMIN',
          status: 'ACTIVE',
          departmentId: department.id,
        }
      })
      console.log('Created admin account')
    }

    console.log('Faculty account creation completed!')
    
  } catch (error) {
    console.error('Error creating faculty accounts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createFacultyAccounts()