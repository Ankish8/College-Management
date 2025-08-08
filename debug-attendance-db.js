// Debug script to inspect attendance sessions
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function inspectAttendance() {
  try {
    console.log('🔍 Inspecting attendance sessions for Summer Internship...');
    
    // Find attendance sessions for August 6 and 7, specifically for Summer Internship
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        date: {
          gte: new Date('2025-08-06'),
          lt: new Date('2025-08-08')
        },
        subject: {
          code: 'BDES5-SI'
        }
      },
      include: {
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            student: {
              rollNumber: 'asc'
            }
          }
        },
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        batch: {
          select: {
            name: true,
            students: {
              select: {
                id: true,
                rollNumber: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`\n📊 Found ${sessions.length} attendance sessions:`);
    
    sessions.forEach((session, index) => {
      console.log(`\n--- Session ${index + 1} ---`);
      console.log(`📅 Date: ${session.date.toISOString().split('T')[0]}`);
      console.log(`📚 Subject: ${session.subject.name} (${session.subject.code})`);
      console.log(`🎓 Batch: ${session.batch.name}`);
      console.log(`📈 Records: ${session.attendanceRecords.length}/${session.batch.students.length}`);
      console.log(`🆔 Session ID: ${session.id}`);
      
      const presentStudents = session.attendanceRecords.filter(r => r.status === 'PRESENT');
      const absentStudents = session.attendanceRecords.filter(r => r.status === 'ABSENT');
      
      console.log(`✅ Present: ${presentStudents.length}`);
      console.log(`❌ Absent: ${absentStudents.length}`);
      
      // Show first 5 present and absent students to compare
      if (presentStudents.length > 0) {
        console.log(`👥 Present students (first 5):`);
        presentStudents.slice(0, 5).forEach(record => {
          console.log(`   - ${record.student.rollNumber}: ${record.student.user.name}`);
        });
      }
      
      if (absentStudents.length > 0) {
        console.log(`🚫 Absent students (first 5):`);
        absentStudents.slice(0, 5).forEach(record => {
          console.log(`   - ${record.student.rollNumber}: ${record.student.user.name}`);
        });
      }
    });

    // Check if the attendance records are identical
    if (sessions.length === 2) {
      const session1Records = sessions[0].attendanceRecords.map(r => ({
        studentId: r.studentId,
        status: r.status
      })).sort((a, b) => a.studentId.localeCompare(b.studentId));
      
      const session2Records = sessions[1].attendanceRecords.map(r => ({
        studentId: r.studentId,
        status: r.status
      })).sort((a, b) => a.studentId.localeCompare(b.studentId));
      
      const areIdentical = JSON.stringify(session1Records) === JSON.stringify(session2Records);
      
      console.log(`\n🔄 Are the two sessions identical? ${areIdentical ? '✅ YES' : '❌ NO'}`);
      
      if (areIdentical) {
        console.log('🚨 ISSUE CONFIRMED: Both attendance sessions have identical student records!');
        console.log('This explains why both dates show the same attendance data (16/25)');
      }
    }

  } catch (error) {
    console.error('❌ Error inspecting attendance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectAttendance();