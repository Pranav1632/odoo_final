/// <reference types="node" />
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helper: compute salary rules (inline version for seed) ─────────────────
function computeSalaryRules(
  rules: {
    code: string;
    name: string;
    category: string;
    computationMethod: string;
    amount: number | null;
    percentageOf: string | null;
    percentageValue: number | null;
    formula: string | null;
  }[],
  contractWage: number,
  workedDays: number
): { code: string; name: string; category: string; amount: number }[] {
  const ctx: Record<string, number> = {
    CONTRACT_WAGE: contractWage,
    WORKED_DAYS: workedDays,
  };
  const results: { code: string; name: string; category: string; amount: number }[] = [];

  for (const rule of rules) {
    let amount = 0;

    if (rule.computationMethod === 'fixed') {
      amount = rule.amount ?? 0;
    } else if (rule.computationMethod === 'percentage') {
      const baseVal = ctx[rule.percentageOf ?? ''] ?? 0;
      amount = baseVal * ((rule.percentageValue ?? 0) / 100);
    } else if (rule.computationMethod === 'formula' && rule.formula) {
      // Simple formula evaluator for seed — handles basic arithmetic + ternary
      try {
        amount = evalFormula(rule.formula, ctx);
      } catch {
        amount = 0;
      }
    }

    amount = Math.round(amount * 100) / 100;
    ctx[rule.code] = amount;
    results.push({ code: rule.code, name: rule.name, category: rule.category, amount });
  }

  return results;
}

// Simple formula evaluator for the seed — covers BASIC + HRA + TA style and ternary
function evalFormula(formula: string, ctx: Record<string, number>): number {
  // Replace variable names with their values
  let expr = formula;
  // Sort keys by length descending so longer matches take precedence
  const keys = Object.keys(ctx).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(ctx[key]));
  }
  // Evaluate using Function (safe in seed context)
  return new Function(`return (${expr})`)() as number;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (order matters due to FK constraints)
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.scheduleLine.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ─── 1. Working Schedules ──────────────────────────────────────────────────
  const scheduleData = [
    {
      name: 'Standard 9-5',
      type: 'Fixed',
      lines: [
        { day: 'Monday', startTime: '09:00', endTime: '17:00', breakMins: 60 },
        { day: 'Tuesday', startTime: '09:00', endTime: '17:00', breakMins: 60 },
        { day: 'Wednesday', startTime: '09:00', endTime: '17:00', breakMins: 60 },
        { day: 'Thursday', startTime: '09:00', endTime: '17:00', breakMins: 60 },
        { day: 'Friday', startTime: '09:00', endTime: '17:00', breakMins: 60 },
      ],
    },
    {
      name: 'Flexible 8-4',
      type: 'Flexible',
      lines: [
        { day: 'Monday', startTime: '08:00', endTime: '16:00', breakMins: 45 },
        { day: 'Tuesday', startTime: '08:00', endTime: '16:00', breakMins: 45 },
        { day: 'Wednesday', startTime: '08:00', endTime: '16:00', breakMins: 45 },
        { day: 'Thursday', startTime: '08:00', endTime: '16:00', breakMins: 45 },
        { day: 'Friday', startTime: '08:00', endTime: '16:00', breakMins: 45 },
      ],
    },
    {
      name: 'Shift A',
      type: 'Shift',
      lines: [
        { day: 'Monday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
        { day: 'Tuesday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
        { day: 'Wednesday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
        { day: 'Thursday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
        { day: 'Friday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
        { day: 'Saturday', startTime: '07:00', endTime: '15:00', breakMins: 30 },
      ],
    },
  ];

  const schedules = [];
  for (const s of scheduleData) {
    const schedule = await prisma.workingSchedule.create({
      data: {
        name: s.name,
        type: s.type,
        lines: { create: s.lines },
      },
    });
    schedules.push(schedule);
  }
  console.log(`  ✓ Created ${schedules.length} working schedules`);

  // ─── 2. Salary Structures ──────────────────────────────────────────────────
  const structure1 = await prisma.salaryStructure.create({
    data: {
      name: 'Regular Salary',
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'Basic', sequence: 1, computationMethod: 'formula', formula: 'CONTRACT_WAGE' },
          { name: 'House Rent Allowance', code: 'HRA', category: 'Allowance', sequence: 2, computationMethod: 'percentage', percentageOf: 'BASIC', percentageValue: 20 },
          { name: 'Transport Allowance', code: 'TA', category: 'Allowance', sequence: 3, computationMethod: 'fixed', amount: 1500 },
          { name: 'Gross Salary', code: 'GROSS', category: 'Gross', sequence: 4, computationMethod: 'formula', formula: 'BASIC + HRA + TA' },
          { name: 'Provident Fund', code: 'PF', category: 'Deduction', sequence: 5, computationMethod: 'percentage', percentageOf: 'BASIC', percentageValue: 12 },
          { name: 'Tax', code: 'TAX', category: 'Deduction', sequence: 6, computationMethod: 'formula', formula: 'GROSS > 50000 ? GROSS * 0.1 : 0' },
          { name: 'Net Salary', code: 'NET', category: 'Net', sequence: 7, computationMethod: 'formula', formula: 'GROSS - PF - TAX' },
        ],
      },
    },
    include: { rules: { orderBy: { sequence: 'asc' } } },
  });

  const structure2 = await prisma.salaryStructure.create({
    data: {
      name: 'Contract Staff Salary',
      rules: {
        create: [
          { name: 'Basic Salary', code: 'BASIC', category: 'Basic', sequence: 1, computationMethod: 'formula', formula: 'CONTRACT_WAGE * WORKED_DAYS / 30' },
          { name: 'Bonus', code: 'BONUS', category: 'Allowance', sequence: 2, computationMethod: 'fixed', amount: 2000 },
          { name: 'Gross Salary', code: 'GROSS', category: 'Gross', sequence: 3, computationMethod: 'formula', formula: 'BASIC + BONUS' },
          { name: 'Provident Fund', code: 'PF', category: 'Deduction', sequence: 4, computationMethod: 'percentage', percentageOf: 'GROSS', percentageValue: 8 },
          { name: 'Net Salary', code: 'NET', category: 'Net', sequence: 5, computationMethod: 'formula', formula: 'GROSS - PF' },
        ],
      },
    },
    include: { rules: { orderBy: { sequence: 'asc' } } },
  });

  console.log('  ✓ Created 2 salary structures with rules');

  // ─── 3. Users + Employees ──────────────────────────────────────────────────
  const hashedAdmin = await bcrypt.hash('Admin@123', 10);
  const hashedEmp = await bcrypt.hash('Emp@123', 10);

  const departments = ['Engineering', 'Marketing', 'HR', 'Operations', 'Finance', 'Sales', 'Support', 'Product'];
  const positions = ['Junior Developer', 'Senior Developer', 'Team Lead', 'Manager', 'Analyst', 'Designer', 'QA Engineer', 'DevOps Engineer', 'Consultant', 'Coordinator'];

  // List to track all generated credentials for CSV export
  const userCredentials: { name: string; email: string; role: string; password: string; employeeId?: string }[] = [];

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@peoplepay360.com',
      password: hashedAdmin,
      role: Role.ADMIN,
      status: 'active',
      employee: {
        create: {
          name: 'Admin User',
          department: 'Administration',
          jobPosition: 'System Administrator',
          scheduleId: schedules[0].id,
          status: 'active',
        },
      },
    },
    include: { employee: true },
  });
  userCredentials.push({ name: 'Admin User', email: 'admin@peoplepay360.com', role: 'ADMIN', password: 'Admin@123', employeeId: adminUser.employee?.id });

  // HR Managers (5)
  const hrManagers = [];
  for (let i = 1; i <= 5; i++) {
    const u = await prisma.user.create({
      data: {
        email: `hr.manager${i}@peoplepay360.com`,
        password: hashedAdmin,
        role: Role.HR_MANAGER,
        status: 'active',
        employee: {
          create: {
            name: `HR Manager ${i}`,
            department: 'HR',
            jobPosition: 'HR Manager',
            scheduleId: schedules[0].id,
            status: 'active',
          },
        },
      },
      include: { employee: true },
    });
    hrManagers.push(u);
    userCredentials.push({ name: `HR Manager ${i}`, email: `hr.manager${i}@peoplepay360.com`, role: 'HR_MANAGER', password: 'Admin@123', employeeId: u.employee?.id });
  }

  // HR Payroll Managers (2)
  const payrollManager1 = await prisma.user.create({
    data: {
      email: 'payroll.manager@peoplepay360.com',
      password: hashedAdmin,
      role: Role.HR_PAYROLL_MANAGER,
      status: 'active',
      employee: {
        create: {
          name: 'Payroll Manager',
          department: 'Finance',
          jobPosition: 'Payroll Manager',
          scheduleId: schedules[0].id,
          status: 'active',
        },
      },
    },
    include: { employee: true },
  });
  userCredentials.push({ name: 'Payroll Manager', email: 'payroll.manager@peoplepay360.com', role: 'HR_PAYROLL_MANAGER', password: 'Admin@123', employeeId: payrollManager1.employee?.id });

  const payrollManager2 = await prisma.user.create({
    data: {
      email: 'payroll.manager2@peoplepay360.com',
      password: hashedAdmin,
      role: Role.HR_PAYROLL_MANAGER,
      status: 'active',
      employee: {
        create: {
          name: 'Lead Payroll Manager',
          department: 'Finance',
          jobPosition: 'Senior Payroll Manager',
          scheduleId: schedules[0].id,
          status: 'active',
        },
      },
    },
    include: { employee: true },
  });
  userCredentials.push({ name: 'Lead Payroll Manager', email: 'payroll.manager2@peoplepay360.com', role: 'HR_PAYROLL_MANAGER', password: 'Admin@123', employeeId: payrollManager2.employee?.id });

  // HR Payroll Users (2)
  for (let i = 1; i <= 2; i++) {
    const u = await prisma.user.create({
      data: {
        email: i === 1 ? 'payroll.user@peoplepay360.com' : `payroll.user${i}@peoplepay360.com`,
        password: hashedAdmin,
        role: Role.HR_PAYROLL_USER,
        status: 'active',
        employee: {
          create: {
            name: `Payroll Specialist ${i}`,
            department: 'Finance',
            jobPosition: 'Payroll Specialist',
            scheduleId: schedules[0].id,
            status: 'active',
          },
        },
      },
      include: { employee: true },
    });
    userCredentials.push({ name: `Payroll Specialist ${i}`, email: u.email, role: 'HR_PAYROLL_USER', password: 'Admin@123', employeeId: u.employee?.id });
  }

  // 300 Employee users
  const employees = [];
  for (let i = 1; i <= 300; i++) {
    const dept = departments[i % departments.length];
    const pos = positions[i % positions.length];
    const scheduleIdx = i % 3;
    const employmentType = i % 7 === 0 ? 'Contract' : i % 5 === 0 ? 'Part-time' : 'Full-time';
    const hireDate = new Date(2021, 0, 1);
    hireDate.setDate(hireDate.getDate() + i * 5); // spread hire dates

    const empName = `Employee ${i}`;
    const empEmail = `emp${i}@peoplepay360.com`;

    const u = await prisma.user.create({
      data: {
        email: empEmail,
        password: hashedEmp,
        role: Role.EMPLOYEE,
        status: 'active',
        employee: {
          create: {
            name: empName,
            department: dept,
            jobPosition: pos,
            scheduleId: schedules[scheduleIdx].id,
            status: 'active',
            employmentType,
            hireDate,
            bankAccountNumber: `${1000000000 + i}`,
            managerId: hrManagers[i % 5]?.employee?.id,
          },
        },
      },
      include: { employee: true },
    });
    employees.push(u);
    userCredentials.push({ name: empName, email: empEmail, role: 'EMPLOYEE', password: 'Emp@123', employeeId: u.employee?.id });
  }

  console.log(`  ✓ Created 310 users (1 admin + 5 HR + 2 payroll mgr + 2 payroll user + 300 employees)`);

  // ─── 4. Contracts ──────────────────────────────────────────────────────────
  const now = new Date();
  let contractCount = 0;

  for (let i = 0; i < 300; i++) {
    const empId = employees[i].employee!.id;
    const baseWage = 30000 + Math.floor(Math.random() * 50000); // 30000-80000
    const raise = 1 + (5 + Math.floor(Math.random() * 11)) / 100;

    let structureId: string;
    if (i < 30) structureId = structure1.id;
    else if (i < 60) structureId = structure2.id;
    else structureId = i % 2 === 0 ? structure1.id : structure2.id;

    // Contract 1: expired
    const expiredEnd = new Date(now);
    expiredEnd.setMonth(expiredEnd.getMonth() - 6);
    const expiredStart = new Date(expiredEnd);
    expiredStart.setFullYear(expiredStart.getFullYear() - 1);

    await prisma.contract.create({
      data: {
        employeeId: empId,
        startDate: expiredStart,
        endDate: expiredEnd,
        wage: baseWage,
        department: employees[i].employee!.department,
        position: employees[i].employee!.jobPosition,
        salaryStructureId: structureId,
        status: 'expired',
      },
    });

    // Contract 2: active
    const activeStart = new Date(now);
    activeStart.setMonth(activeStart.getMonth() - 5);

    await prisma.contract.create({
      data: {
        employeeId: empId,
        startDate: activeStart,
        endDate: null,
        wage: Math.round(baseWage * raise),
        department: employees[i].employee!.department,
        position: employees[i].employee!.jobPosition,
        salaryStructureId: structureId,
        status: 'active',
      },
    });

    contractCount += 2;
  }

  console.log(`  ✓ Created ${contractCount} contracts (2 per employee)`);

  // ─── 5. Time Off Types ─────────────────────────────────────────────────────
  const annualLeave = await prisma.timeOffType.create({
    data: { name: 'Annual Leave', unit: 'days', requiresAllocation: true, payrollIntegrated: false },
  });
  const sickLeave = await prisma.timeOffType.create({
    data: { name: 'Sick Leave', unit: 'days', requiresAllocation: true, payrollIntegrated: false },
  });
  await prisma.timeOffType.create({
    data: { name: 'Unpaid Leave', unit: 'days', requiresAllocation: false, payrollIntegrated: true },
  });

  console.log('  ✓ Created 3 time off types');

  // ─── 6. Allocations ────────────────────────────────────────────────────────
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);

  for (let i = 0; i < 300; i++) {
    const empId = employees[i].employee!.id;
    const annualTaken = Math.floor(Math.random() * 9);
    const sickTaken = Math.floor(Math.random() * 5);

    await prisma.allocation.create({
      data: {
        employeeId: empId,
        typeId: annualLeave.id,
        allocated: 20,
        taken: annualTaken,
        validFrom: yearStart,
        validTo: yearEnd,
        approved: true,
      },
    });

    await prisma.allocation.create({
      data: {
        employeeId: empId,
        typeId: sickLeave.id,
        allocated: 10,
        taken: sickTaken,
        validFrom: yearStart,
        validTo: yearEnd,
        approved: true,
      },
    });
  }

  console.log('  ✓ Created 600 allocations (Annual + Sick per employee)');

  // ─── 6b. Time Off Requests ──────────────────────────────────────────────────
  let requestCount = 0;
  const statuses = ['approved', 'pending', 'refused'];

  for (let i = 0; i < 300; i++) {
    const empId = employees[i].employee!.id;
    // Create 1-2 leave requests per employee
    const reqsPerEmp = 1 + (i % 2);

    for (let r = 0; r < reqsPerEmp; r++) {
      const daysAgo = 10 + (r * 15) + (i % 30);
      const reqStart = new Date(now);
      reqStart.setDate(reqStart.getDate() - daysAgo);
      const reqEnd = new Date(reqStart);
      const duration = 1 + (i % 4); // 1-4 days
      reqEnd.setDate(reqEnd.getDate() + (duration - 1));

      const status = statuses[(i + r) % statuses.length];
      const typeId = (i + r) % 2 === 0 ? annualLeave.id : sickLeave.id;

      await prisma.timeOffRequest.create({
        data: {
          employeeId: empId,
          typeId,
          startDate: reqStart,
          endDate: reqEnd,
          duration,
          status,
        },
      });
      requestCount++;
    }
  }

  console.log(`  ✓ Created ${requestCount} time off requests`);

  // ─── 7. Attendance ─────────────────────────────────────────────────────────
  let attendanceCount = 0;

  for (let i = 0; i < 300; i++) {
    const empId = employees[i].employee!.id;
    // 10 attendance records per employee to create ~3000 total attendance rows
    const recordCount = 10;

    for (let r = 0; r < recordCount; r++) {
      const daysAgo = r * 3;
      const checkInDate = new Date(now);
      checkInDate.setDate(checkInDate.getDate() - daysAgo);
      checkInDate.setHours(7 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);

      const hoursWorked = 8 + Math.random();
      const checkOutDate = new Date(checkInDate.getTime() + hoursWorked * 3600000);

      const isException = r === 0 && i % 10 === 0;
      const status = isException ? 'exception' : 'normal';

      await prisma.attendance.create({
        data: {
          employeeId: empId,
          checkIn: checkInDate,
          checkOut: isException ? null : checkOutDate,
          workedHours: isException ? null : Math.round(hoursWorked * 100) / 100,
          status,
        },
      });
      attendanceCount++;
    }
  }

  console.log(`  ✓ Created ${attendanceCount} attendance records`);

  // ─── 8. Historical Payruns ─────────────────────────────────────────────────
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'active' },
    include: { salaryStructure: { include: { rules: { orderBy: { sequence: 'asc' } } } } },
  });

  const contractByEmployee = new Map<string, typeof activeContracts[0]>();
  for (const c of activeContracts) {
    contractByEmployee.set(c.employeeId, c);
  }

  // Payrun 1: June 2026 — Paid
  const june2026Start = new Date(2026, 5, 1);
  const june2026End = new Date(2026, 5, 30);
  const payrun1 = await prisma.payrun.create({
    data: {
      name: 'June 2026 Payroll',
      periodStart: june2026Start,
      periodEnd: june2026End,
      salaryStructureId: structure1.id,
      status: 'paid',
    },
  });

  // Payrun 2: July 2026 — Paid
  const july2026Start = new Date(2026, 6, 1);
  const july2026End = new Date(2026, 6, 31);
  const payrun2 = await prisma.payrun.create({
    data: {
      name: 'July 2026 Payroll',
      periodStart: july2026Start,
      periodEnd: july2026End,
      salaryStructureId: structure1.id,
      status: 'paid',
    },
  });

  // Payrun 3: August 2026 — Validated
  const aug2026Start = new Date(2026, 7, 1);
  const aug2026End = new Date(2026, 7, 31);
  const payrun3 = await prisma.payrun.create({
    data: {
      name: 'August 2026 Payroll',
      periodStart: aug2026Start,
      periodEnd: aug2026End,
      salaryStructureId: structure1.id,
      status: 'validated',
    },
  });

  const payruns = [payrun1, payrun2, payrun3];
  let payslipCount = 0;

  for (const payrun of payruns) {
    for (let i = 0; i < 300; i++) {
      const empId = employees[i].employee!.id;
      const contract = contractByEmployee.get(empId);
      if (!contract) continue;

      const workedDays = 20 + Math.floor(Math.random() * 4);
      const ruleResults = computeSalaryRules(contract.salaryStructure.rules, contract.wage, workedDays);
      const netLine = ruleResults.find((r) => r.code === 'NET');

      await prisma.payslip.create({
        data: {
          payrunId: payrun.id,
          employeeId: empId,
          contractId: contract.id,
          workedDays,
          status: payrun.status,
          netSalary: netLine?.amount ?? 0,
          warnings: [],
          lines: {
            create: ruleResults.map((r) => ({
              code: r.code,
              name: r.name,
              category: r.category,
              amount: r.amount,
            })),
          },
        },
      });
      payslipCount++;
    }
  }

  console.log(`  ✓ Created 3 historical payruns (June=paid, July=paid, August=validated) with ${payslipCount} payslips`);

  // ─── 9. Export Credentials CSV ─────────────────────────────────────────────
  const fs = require('fs');
  const path = require('path');
  const csvLines = ['Name,Email,Role,Password,EmployeeID'];
  for (const cred of userCredentials) {
    csvLines.push(`"${cred.name}","${cred.email}","${cred.role}","${cred.password}","${cred.employeeId || ''}"`);
  }
  const csvPath = path.join(__dirname, 'user_credentials.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  console.log(`  ✓ Exported ${userCredentials.length} user credentials to ${csvPath}`);

  console.log('\n✅ Seed complete! Total Database Rows generated: 4,000+');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
