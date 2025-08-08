import { PrismaClient } from '@prisma/client'
import { getDatabaseAdapter } from '../src/lib/utils/database-adapter'

const prisma = new PrismaClient()
const dbAdapter = getDatabaseAdapter(prisma)

async function setupProduction() {
  console.log('Setting up production database...')
  console.log(`Database Provider: ${dbAdapter.getProvider()}`)
  
  try {
    // Check database health first
    const health = await dbAdapter.getConnectionStatus()
    if (!health.healthy) {
      throw new Error('Database connection is not healthy')
    }
    console.log(`✅ Database connection healthy (${health.provider} ${health.version || 'unknown version'})`)

    // PostgreSQL-specific initialization
    if (dbAdapter.isPostgreSQL()) {
      console.log('🐘 Setting up PostgreSQL-specific configurations...')
      
      // Enable required extensions
      try {
        await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
        await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
        console.log('✅ PostgreSQL extensions enabled')
      } catch (error) {
        console.warn('⚠️ Could not create extensions (may already exist):', error)
      }
    }
    // 1. Create University
    let university = await prisma.university.findFirst({
      where: { shortName: 'JLU' }
    })

    if (!university) {
      university = await prisma.university.create({
        data: {
          name: 'Jagran Lakecity University',
          shortName: 'JLU'
        }
      })
      console.log('Created university: JLU')
    }

    // 2. Create Design Department
    let department = await prisma.department.findFirst({
      where: { shortName: 'Design', universityId: university.id }
    })

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'School of Design',
          shortName: 'Design',
          universityId: university.id
        }
      })
      console.log('Created department: Design')
    }

    // 3. Create Programs
    const programs = [
      { name: 'Bachelor of Design', shortName: 'B.Des', duration: 4, totalSems: 8 },
      { name: 'Master of Design', shortName: 'M.Des', duration: 2, totalSems: 4 }
    ]

    for (const prog of programs) {
      const existing = await prisma.program.findFirst({
        where: { shortName: prog.shortName, departmentId: department.id }
      })

      if (!existing) {
        await prisma.program.create({
          data: {
            ...prog,
            departmentId: department.id
          }
        })
        console.log(`Created program: ${prog.name}`)
      }
    }

    // 4. Create Admin Account
    const adminEmail = 'admin@jlu.edu.in'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: adminEmail,
          employeeId: 'ADMIN001',
          role: 'ADMIN',
          status: 'ACTIVE',
          departmentId: department.id,
        }
      })
      console.log('Created admin account')
    }

    // 5. Create Faculty Accounts
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

    for (const faculty of facultyMembers) {
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: faculty.email },
              { employeeId: faculty.employeeId }
            ]
          }
        })

        if (!existingUser) {
          await prisma.user.create({
            data: {
              name: faculty.name,
              email: faculty.email,
              employeeId: faculty.employeeId,
              role: 'FACULTY',
              status: 'ACTIVE',
              departmentId: department.id,
            }
          })
          console.log(`Created faculty account for ${faculty.name}`)
        } else {
          console.log(`Faculty ${faculty.name} already exists`)
        }
      } catch (error) {
        console.error(`Error creating faculty ${faculty.name}:`, error)
      }
    }

    // 6. Create Time Slots
    const timeSlotData = [
      { name: '9:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', duration: 60, sortOrder: 1 },
      { name: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', duration: 60, sortOrder: 2 },
      { name: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', duration: 60, sortOrder: 3 },
      { name: '12:00 PM - 1:00 PM', startTime: '12:00', endTime: '13:00', duration: 60, sortOrder: 4 },
      { name: '2:00 PM - 3:00 PM', startTime: '14:00', endTime: '15:00', duration: 60, sortOrder: 5 },
      { name: '3:00 PM - 4:00 PM', startTime: '15:00', endTime: '16:00', duration: 60, sortOrder: 6 },
      { name: '4:00 PM - 5:00 PM', startTime: '16:00', endTime: '17:00', duration: 60, sortOrder: 7 },
    ]

    for (const slot of timeSlotData) {
      const existing = await prisma.timeSlot.findFirst({
        where: { name: slot.name }
      })

      if (!existing) {
        await prisma.timeSlot.create({
          data: slot
        })
        console.log(`Created time slot: ${slot.name}`)
      }
    }

    // Final database optimization
    console.log('\n🔧 Optimizing database performance...')
    await dbAdapter.optimizeDatabase()
    
    // Get database size info
    const sizeInfo = await dbAdapter.getDatabaseSize()
    console.log(`📊 Database size: ${sizeInfo.unit}`)
    
    // Show performance recommendations
    if (process.env.NODE_ENV === 'production') {
      console.log('\n💡 Performance tuning recommendations:')
      const recommendations = dbAdapter.getPerformanceTuning()
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }

    console.log('\n✅ Production setup completed successfully!')
    console.log(`\n🗄️  Database: ${dbAdapter.getProvider().toUpperCase()}`)
    console.log('\n📋 Login Credentials:')
    console.log('Admin: admin@jlu.edu.in / JLU@2025admin')
    console.log('Faculty: [email]@jlu.edu.in / JLU@2025faculty')
    console.log('\nRefer to CREDENTIALS.md for full list of accounts.')
    
    // Database-specific backup instructions
    console.log('\n📦 Backup Command:')
    console.log(dbAdapter.getBackupCommand())
    
  } catch (error) {
    console.error('Error setting up production:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupProduction()