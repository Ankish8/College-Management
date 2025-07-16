const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function insertDataDirectly() {
  try {
    console.log('Starting direct database insertion...');

    // 1. Get or create university
    let university = await db.university.findFirst({ where: { shortName: "JLU" } });
    if (!university) {
      university = await db.university.create({
        data: {
          name: "Jagran Lakecity University",
          shortName: "JLU",
        },
      });
    }
    console.log('✓ University created/found:', university.id);

    // 2. Get or create department
    let department = await db.department.findFirst({ where: { shortName: "DESIGN" } });
    if (!department) {
      department = await db.department.create({
        data: {
          name: "Design Department",
          shortName: "DESIGN",
          universityId: university.id,
        },
      });
    }
    console.log('✓ Department created/found:', department.id);

    // 3. Create department settings
    await db.departmentSettings.upsert({
      where: { departmentId: department.id },
      update: {},
      create: {
        departmentId: department.id,
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
        schedulingMode: "MODULE_BASED",
        autoCreateAttendance: true,
      },
    });
    console.log('✓ Department settings created');

    // 4. Create B.Des program
    let bdesProgram = await db.program.findFirst({ where: { shortName: "B.Des" } });
    if (!bdesProgram) {
      bdesProgram = await db.program.create({
        data: {
          name: "Bachelor of Design",
          shortName: "B.Des",
          duration: 4,
          totalSems: 8,
          programType: "UNDERGRADUATE",
          departmentId: department.id,
        },
      });
    }
    console.log('✓ B.Des program created/found:', bdesProgram.id);

    // 5. Create sample batch
    let batch5 = await db.batch.findFirst({ where: { name: "B.Des Semester 5" } });
    if (!batch5) {
      batch5 = await db.batch.create({
        data: {
          name: "B.Des Semester 5",
          programId: bdesProgram.id,
          semester: 5,
          startYear: 2022,
          endYear: 2025,
          semType: "ODD",
        },
      });
    }
    console.log('✓ Batch created/found:', batch5.id);

    // 6. Update admin user with department ID
    const adminUser = await db.user.upsert({
      where: { email: "admin@jlu.edu.in" },
      update: {
        departmentId: department.id,
      },
      create: {
        email: "admin@jlu.edu.in",
        name: "System Admin",
        role: "ADMIN",
        employeeId: "ADMIN001",
        departmentId: department.id,
      },
    });
    console.log('✓ Admin user updated:', adminUser.id);

    // 7. Create faculty members
    const facultyUsers = [
      {
        email: "ankish.khatri@jlu.edu.in",
        name: "Ankish Khatri",
        employeeId: "JLU618",
      },
      {
        email: "dr.neha.gupta@jlu.edu.in",
        name: "Dr. Neha Gupta",
        employeeId: "JLU501",
      },
      {
        email: "dr.priya.sharma@jlu.edu.in",
        name: "Dr. Priya Sharma",
        employeeId: "JLU502",
      },
      {
        email: "prof.amit.patel@jlu.edu.in",
        name: "Prof. Amit Patel",
        employeeId: "JLU503",
      },
      {
        email: "prof.rajesh.kumar@jlu.edu.in",
        name: "Prof. Rajesh Kumar",
        employeeId: "JLU504",
      },
      {
        email: "dr.kavita.singh@jlu.edu.in",
        name: "Dr. Kavita Singh",
        employeeId: "JLU505",
      },
      {
        email: "prof.rahul.verma@jlu.edu.in",
        name: "Prof. Rahul Verma",
        employeeId: "JLU506",
      },
      {
        email: "dr.anjali.mehta@jlu.edu.in",
        name: "Dr. Anjali Mehta",
        employeeId: "JLU507",
      },
      {
        email: "prof.sanjay.joshi@jlu.edu.in",
        name: "Prof. Sanjay Joshi",
        employeeId: "JLU508",
      },
      {
        email: "dr.pooja.agarwal@jlu.edu.in",
        name: "Dr. Pooja Agarwal",
        employeeId: "JLU509",
      },
      {
        email: "prof.vikram.singh@jlu.edu.in",
        name: "Prof. Vikram Singh",
        employeeId: "JLU510",
      },
      {
        email: "dr.ritu.sharma@jlu.edu.in",
        name: "Dr. Ritu Sharma",
        employeeId: "JLU511",
      },
    ];

    const createdFaculty = [];
    for (const faculty of facultyUsers) {
      const facultyUser = await db.user.upsert({
        where: { email: faculty.email },
        update: {
          departmentId: department.id,
        },
        create: {
          email: faculty.email,
          name: faculty.name,
          role: "FACULTY",
          employeeId: faculty.employeeId,
          departmentId: department.id,
        },
      });
      createdFaculty.push(facultyUser);
    }
    console.log('✓ Faculty members created:', createdFaculty.length);

    // 8. Create subjects and assign to faculty
    const subjects = [
      {
        name: "Digital Prototyping",
        code: "DPR501",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[1].id, // Dr. Neha Gupta
        examType: "THEORY",
        subjectType: "CORE",
        description: "Advanced digital prototyping techniques"
      },
      {
        name: "User Experience Design",
        code: "UXD501",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[2].id, // Dr. Priya Sharma
        examType: "THEORY",
        subjectType: "CORE",
        description: "Comprehensive UX design principles"
      },
      {
        name: "Design Thinking",
        code: "DTH301",
        credits: 2,
        totalHours: 30,
        primaryFacultyId: createdFaculty[3].id, // Prof. Amit Patel
        examType: "THEORY",
        subjectType: "CORE",
        description: "Design thinking methodology"
      },
      {
        name: "Design Research Methods",
        code: "DRM501",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[4].id, // Prof. Rajesh Kumar
        examType: "THEORY",
        subjectType: "CORE",
        description: "Research methodologies in design"
      },
      {
        name: "Visual Communication",
        code: "VCD301",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[5].id, // Dr. Kavita Singh
        examType: "THEORY",
        subjectType: "CORE",
        description: "Visual communication principles"
      },
      {
        name: "UX Portfolio Development",
        code: "UXP701",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[6].id, // Prof. Rahul Verma
        examType: "THEORY",
        subjectType: "CORE",
        description: "Building professional UX portfolios"
      },
      {
        name: "Advanced Interaction Design",
        code: "AID701",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[7].id, // Dr. Anjali Mehta
        examType: "THEORY",
        subjectType: "CORE",
        description: "Advanced interaction design techniques"
      },
      {
        name: "Typography & Layout",
        code: "TYP301",
        credits: 3,
        totalHours: 45,
        primaryFacultyId: createdFaculty[8].id, // Prof. Sanjay Joshi
        examType: "THEORY",
        subjectType: "CORE",
        description: "Typography and layout design"
      },
      {
        name: "Gamification & UX",
        code: "JSD012",
        credits: 4,
        totalHours: 60,
        primaryFacultyId: createdFaculty[0].id, // Ankish Khatri
        examType: "THEORY",
        subjectType: "CORE",
        description: "Understanding gamification principles and UX design"
      }
    ];

    // Create all subjects
    for (const subject of subjects) {
      await db.subject.upsert({
        where: { code: subject.code },
        update: {
          primaryFacultyId: subject.primaryFacultyId,
        },
        create: {
          name: subject.name,
          code: subject.code,
          credits: subject.credits,
          totalHours: subject.totalHours,
          batchId: batch5.id,
          primaryFacultyId: subject.primaryFacultyId,
          examType: subject.examType,
          subjectType: subject.subjectType,
          description: subject.description,
        },
      });
    }
    console.log('✓ Subjects created:', subjects.length);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('Admin login: admin@jlu.edu.in / admin123');
    console.log('Faculty login: ankish.khatri@jlu.edu.in / password123');
    console.log('\nPlease refresh your browser page.');

  } catch (error) {
    console.error('❌ Error during database setup:', error);
  } finally {
    await db.$disconnect();
  }
}

insertDataDirectly();