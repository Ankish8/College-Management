import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetFacultyPasswords() {
  console.log('Resetting faculty passwords to default...')
  
  try {
    // Get all faculty users
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: {
        id: true,
        name: true,
        email: true,
        password: true
      }
    })

    console.log(`Found ${faculty.length} faculty members`)
    
    // Clear passwords so they use default authentication
    for (const member of faculty) {
      await prisma.user.update({
        where: { id: member.id },
        data: { password: null }
      })
      console.log(`Reset password for ${member.name} (${member.email})`)
    }
    
    console.log('\n✅ Password reset completed!')
    console.log('\nFaculty can now login with:')
    console.log('Password: JLU@2025faculty')
    console.log('\nThey can change their password from Profile Settings after logging in.')
    
  } catch (error) {
    console.error('Error resetting passwords:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetFacultyPasswords()