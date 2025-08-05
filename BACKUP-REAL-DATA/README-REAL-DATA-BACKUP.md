# 🚨 REAL DATA BACKUP - DO NOT DELETE

This folder contains the **PRECIOUS REAL DATA** that should NEVER be lost.

## ⚠️ IMPORTANT WARNING
- **NEVER run `npm run db:seed`** - It has been disabled
- **NEVER reset the database without backing up first**
- **ALL DATA IN DATABASE IS REAL** - Students, Faculty, Subjects are real

## 📊 Current Real Data (as of latest backup):

### 👥 Real Faculty (6 total):
- Ankish Khatri (ankish.khatri@jlu.edu.in)
- Bhawana Jain (bhawana.jain@jlu.edu.in) 
- Madhu Toppo (madhu.toppo@jlu.edu.in)
- Priyal Gautam (priyal.gautam@jlu.edu.in)
- Sushmita Shahi (sushmita.shahi@jlu.edu.in)
- Priyanshi Rungta (priyanshi.rungta@jlu.edu.in)

### 🎓 Real Students (85 total):
- **B-Des UX Sem-3**: 25 students (Pratistha Sharma, Ana Khan, Akriti Soni, etc.)
- **B-Des UX Sem-5**: 25 students (Aadhya Mangal, Aksheev Lawrence, Anmol Kothari, etc.)
- **B-Des UX Sem-7**: 35 students (Aditi Soni, Anish Deshmukh, Anna Christina, etc.)

### 📚 Real Subjects (12 total):

**Semester 3 (4 subjects):**
- Introduction To UX design (4 credits) - Bhawana Jain
- Introduction to Semiotics (4 credits) - Madhu Toppo
- Visual Design Tools (4 credits) - Priyal Gautam  
- Design Thinking Application (4 credits) - Sushmita Shahi

**Semester 5 (4 subjects):**
- Design Thinking (4 credits) - Priyal Gautam
- Service Design (4 credits) - Bhawana Jain
- UI Development (2 credits) - Priyanshi Rungta
- Summer Internship (6 credits) - Priyal Gautam

**Semester 7 (4 subjects):**
- Design for Social Innovation (4 credits) - Sushmita Shahi
- Futuristic Technologies for UX Design (4 credits) - Priyanshi Rungta
- Seminar & Research Writing (2 credits) - Madhu Toppo
- Field Research Project (8 credits) - Bhawana Jain

## 🔄 Recovery Scripts (if data is lost):
1. `create-faculty-bdes-ux7.js` - Restores all 6 faculty members
2. `create-subjects-bdes-ux.js` - Restores Semester 5 & 7 subjects
3. `create-subjects-bdes-ux-sem3.js` - Restores Semester 3 subjects  
4. `import-clean-bdes-ux.js` - Restores all 85 students across 3 batches

## 🚨 NEVER DELETE:
- `bdes-final-students.json` - Contains all real student data
- Any `.js` files starting with `create-` or `import-clean-`
- This backup folder

## 💾 Database Backup Command:
```bash
cp prisma/dev.db BACKUP-REAL-DATA/dev.db.backup-$(date +%Y%m%d-%H%M%S)
```

**REMEMBER: This is REAL DATA from Jagran Lakecity University - NEVER use fake data again!**