# JLU College Management System - Login Credentials

## Production Credentials
**Status**: ✅ WORKING - Passwords have been set and tested

### Administrator Account
- **Email**: admin@jlu.edu.in
- **Password**: JLU@2025admin
- **Role**: System Administrator
- **Access**: Full system access

### Faculty Accounts
All faculty accounts use the following default password:
- **Default Password**: JLU@2025faculty

| Name | Email | Employee ID | Subjects |
|------|-------|-------------|----------|
| Ankish Khatri | ankish.khatri@jlu.edu.in | JLU618 | - |
| Bhawana Jain | bhawana.jain@jlu.edu.in | FAC001 | Service Design, Field Research Project, Introduction To UX design |
| Madhu Toppo | madhu.toppo@jlu.edu.in | FAC002 | Seminar & Research Writing, Introduction to Semiotics |
| Priyal Gautam | priyal.gautam@jlu.edu.in | FAC003 | Design Thinking, Summer Internship, Visual Design Tools |
| Sushmita Shahi | sushmita.shahi@jlu.edu.in | FAC004 | Design for Social Innovation, Design Thinking Application |
| Priyanshi Rungta | priyanshi.rungta@jlu.edu.in | FAC005 | UI Development, Futuristic Technologies for UX Design |

### Faculty Permissions
- Mark attendance for subjects they teach
- View their assigned timetable
- View student lists for their subjects
- Update their availability preferences

### Security Notes
1. All users must change their password on first login
2. Passwords must be at least 8 characters with mixed case and numbers
3. Faculty can only mark attendance for subjects they are assigned to teach
4. Session expires after 24 hours of inactivity

### Running Account Creation Script
To create all faculty accounts, run:
```bash
npx tsx scripts/create-faculty-accounts.ts
```

This will create all faculty accounts with the default passwords listed above.