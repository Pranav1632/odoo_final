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

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@peoplepay360.com',
      password: hashedAdmin,
      role: Role.ADMIN,
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

  // HR Managers (2)
  const hrManagers = [];
  for (let i = 1; i <= 2; i++) {
    const u = await prisma.user.create({
      data: {
        email: `hr.manager${i}@peoplepay360.com`,
        password: hashedAdmin,
        role: Role.HR_MANAGER,
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
  }

  // HR Payroll Manager (1)
  const payrollManager = await prisma.user.create({
    data: {
      email: 'payroll.manager@peoplepay360.com',
      password: hashedAdmin,
      role: Role.HR_PAYROLL_MANAGER,
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

  // HR Payroll User (1)
  const payrollUser = await prisma.user.create({
    data: {
      email: 'payroll.user@peoplepay360.com',
      password: hashedAdmin,
      role: Role.HR_PAYROLL_USER,
      employee: {
        create: {
          name: 'Payroll User',
          department: 'Finance',
          jobPosition: 'Payroll Specialist',
          scheduleId: schedules[0].id,
          status: 'active',
        },
      },
    },
    include: { employee: true },
  });

  // 50 Employee users
  const employees = [];
  for (let i = 1; i <= 50; i++) {
    const dept = departments[i % departments.length];
    const pos = positions[i % positions.length];
    const scheduleIdx = i % 3;

    const u = await prisma.user.create({
      data: {
        email: `emp${i}@peoplepay360.com`,
        password: hashedEmp,
        role: Role.EMPLOYEE,
        employee: {
          create: {
            name: `Employee ${i}`,
            department: dept,
            jobPosition: pos,
            scheduleId: schedules[scheduleIdx].id,
            status: 'active',
            bankAccountNumber: `${1000000000 + i}`,
            managerId: hrManagers[i % 2]?.employee?.id,
          },
        },
      },
      include: { employee: true },
    });
    employees.push(u);
  }

  console.log(`  ✓ Created 55 users (1 admin + 2 HR + 1 payroll mgr + 1 payroll user + 50 employees)`);

  // ─── 4. Contracts ──────────────────────────────────────────────────────────
  const now = new Date();
  let contractCount = 0;

  for (let i = 0; i < 50; i++) {
    const empId = employees[i].employee!.id;
    const baseWage = 25000 + Math.floor(Math.random() * 35000); // 25000-60000
    const raise = 1 + (5 + Math.floor(Math.random() * 11)) / 100; // 5-15% raise

    // Determine structure: employees 1-5 use structure1, 6-10 use structure2, rest alternate
    let structureId: string;
    if (i < 5) structureId = structure1.id;
    else if (i < 10) structureId = structure2.id;
    else structureId = i % 2 === 0 ? structure1.id : structure2.id;

    // Contract 1: expired (ended 6 months ago)
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

    // Contract 2: active (started 5 months ago, no end)
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

  for (let i = 0; i < 50; i++) {
    const empId = employees[i].employee!.id;
    const annualTaken = Math.floor(Math.random() * 9); // 0-8
    const sickTaken = Math.floor(Math.random() * 5); // 0-4

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

  console.log('  ✓ Created 100 allocations (Annual + Sick per employee)');

  // ─── 7. Attendance ─────────────────────────────────────────────────────────
  let attendanceCount = 0;

  for (let i = 0; i < 50; i++) {
    const empId = employees[i].employee!.id;
    const recordCount = 25 + Math.floor(Math.random() * 6); // 25-30

    for (let r = 0; r < recordCount; r++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const checkInDate = new Date(now);
      checkInDate.setDate(checkInDate.getDate() - daysAgo);
      checkInDate.setHours(7 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0); // 7-9 AM

      const hoursWorked = 8 + Math.random(); // 8-9 hours
      const checkOutDate = new Date(checkInDate.getTime() + hoursWorked * 3600000);

      const isException = r < 2; // ~2 per employee
      const status = isException ? 'exception' : 'normal';

      await prisma.attendance.create({
        data: {
          employeeId: empId,
          checkIn: checkInDate,
          checkOut: isException && r === 0 ? null : checkOutDate, // first exception has no checkout
          workedHours: isException && r === 0 ? null : Math.round(hoursWorked * 100) / 100,
          status,
        },
      });
      attendanceCount++;
    }
  }

  console.log(`  ✓ Created ${attendanceCount} attendance records`);

  // ─── 8. Historical Payruns ─────────────────────────────────────────────────
  // Fetch all active contracts with their salary structures + rules
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'active' },
    include: { salaryStructure: { include: { rules: { orderBy: { sequence: 'asc' } } } } },
  });

  const contractByEmployee = new Map<string, typeof activeContracts[0]>();
  for (const c of activeContracts) {
    contractByEmployee.set(c.employeeId, c);
  }

  // Payrun 1: July 2026 — Paid
  const july2026Start = new Date(2026, 6, 1);
  const july2026End = new Date(2026, 6, 31);

  // Use structure1 for payrun (majority of employees)
  const payrun1 = await prisma.payrun.create({
    data: {
      name: 'July 2026 Payroll',
      periodStart: july2026Start,
      periodEnd: july2026End,
      salaryStructureId: structure1.id,
      status: 'paid',
    },
  });

  for (let i = 0; i < 50; i++) {
    const empId = employees[i].employee!.id;
    const contract = contractByEmployee.get(empId);
    if (!contract) continue;

    const workedDays = 20 + Math.floor(Math.random() * 4); // 20-23
    const ruleResults = computeSalaryRules(contract.salaryStructure.rules, contract.wage, workedDays);
    const netLine = ruleResults.find((r) => r.code === 'NET');

    const payslip = await prisma.payslip.create({
      data: {
        payrunId: payrun1.id,
        employeeId: empId,
        contractId: contract.id,
        workedDays,
        status: 'paid',
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
  }

  // Payrun 2: August 2026 — Validated
  const aug2026Start = new Date(2026, 7, 1);
  const aug2026End = new Date(2026, 7, 31);

  const payrun2 = await prisma.payrun.create({
    data: {
      name: 'August 2026 Payroll',
      periodStart: aug2026Start,
      periodEnd: aug2026End,
      salaryStructureId: structure1.id,
      status: 'validated',
    },
  });

  for (let i = 0; i < 50; i++) {
    const empId = employees[i].employee!.id;
    const contract = contractByEmployee.get(empId);
    if (!contract) continue;

    const workedDays = 20 + Math.floor(Math.random() * 4);
    const ruleResults = computeSalaryRules(contract.salaryStructure.rules, contract.wage, workedDays);
    const netLine = ruleResults.find((r) => r.code === 'NET');

    await prisma.payslip.create({
      data: {
        payrunId: payrun2.id,
        employeeId: empId,
        contractId: contract.id,
        workedDays,
        status: 'validated',
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
  }

  console.log('  ✓ Created 2 historical payruns (July=paid, August=validated) with 100 payslips');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
