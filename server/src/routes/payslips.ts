import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { generatePayslipPdf } from '../lib/payroll/generatePdf';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/payslips — list with optional filters
// Roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN: read all
//        EMPLOYEE: read own only
// ---------------------------------------------------------------------------
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;

    // Build where clause
    const where: Record<string, unknown> = {};

    // EMPLOYEE role — force filter to own employeeId only
    if (session.role === 'EMPLOYEE') {
      if (!session.employeeId) {
        return res.json([]); // employee with no linked employee record
      }
      where.employeeId = session.employeeId;
    } else if (!['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Optional filters from query params
    if (req.query.payrunId) where.payrunId = String(req.query.payrunId);
    if (req.query.employeeId && session.role !== 'EMPLOYEE') {
      where.employeeId = String(req.query.employeeId);
    }
    if (req.query.status) where.status = String(req.query.status);

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        payrun: { select: { id: true, name: true } },
      },
      orderBy: { payrun: { periodStart: 'desc' } },
    });

    res.json(payslips);
  })
);

// ---------------------------------------------------------------------------
// GET /api/payslips/export-excel?payrunId=... — Excel export for a payrun
// Roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN
// Must come BEFORE /:id route so express matches it first
// ---------------------------------------------------------------------------
router.get(
  '/export-excel',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const payrunId = req.query.payrunId ? String(req.query.payrunId) : null;
    if (!payrunId) throw new ApiError(400, 'payrunId query parameter is required');

    const payrun = await prisma.payrun.findUnique({ where: { id: payrunId } });
    if (!payrun) throw new ApiError(404, 'Payrun not found');

    const payslips = await prisma.payslip.findMany({
      where: { payrunId },
      include: {
        employee: { select: { name: true, department: true } },
        lines: { orderBy: { category: 'asc' } },
      },
      orderBy: { employee: { name: 'asc' } },
    });

    // Collect all unique rule codes in sequence order
    const allCodes = [
      ...new Set(
        payslips.flatMap((p) =>
          p.lines.map((l) => l.code)
        )
      ),
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payslips');

    // Build columns — ExcelJS accepts Partial<Column>[] as the setter input
    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Department', key: 'department', width: 16 },
      { header: 'Worked Days', key: 'workedDays', width: 14 },
      ...allCodes.map((code) => ({ header: code, key: code, width: Math.max(code.length, 10) + 2 })),
      { header: 'Net Salary', key: 'netSalary', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Warnings', key: 'warnings', width: 40 },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet.columns = columns as any;

    // Bold header row
    sheet.getRow(1).font = { bold: true };

    // Add data rows
    for (const payslip of payslips) {
      const lineMap: Record<string, number> = {};
      for (const line of payslip.lines) {
        lineMap[line.code] = line.amount;
      }

      const row: Record<string, unknown> = {
        name: payslip.employee.name,
        department: payslip.employee.department,
        workedDays: payslip.workedDays,
        netSalary: payslip.netSalary ?? 0,
        status: payslip.status,
        warnings: payslip.warnings.join('; '),
      };

      for (const code of allCodes) {
        row[code] = lineMap[code] ?? 0;
      }

      sheet.addRow(row);
    }

    // Auto-fit columns
    sheet.columns.forEach((col) => {
      if (col && col.header) {
        const headerLen = col.header.toString().length;
        col.width = Math.max(headerLen, (col.width as number) ?? 10) + 2;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payrun-${payrunId}-payslips.xlsx"`
    );
    res.send(buffer);
  })
);

// ---------------------------------------------------------------------------
// GET /api/payslips/:id — single payslip with lines
// Response shape matches Contract 4 in INTEGRATION.md exactly
// EMPLOYEE role: own payslip only
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;

    // Allow roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN, EMPLOYEE (own only)
    if (!['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'EMPLOYEE'].includes(session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const id = req.params.id as string;
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true } },
        payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
        lines: { orderBy: { category: 'asc' } },
      },
    });

    if (!payslip) throw new ApiError(404, 'Payslip not found');

    // EMPLOYEE ownership check
    if (session.role === 'EMPLOYEE' && payslip.employeeId !== session.employeeId) {
      throw new ApiError(403, 'Forbidden');
    }

    res.json(payslip);
  })
);

// ---------------------------------------------------------------------------
// GET /api/payslips/:id/pdf — generate and stream PDF
// EMPLOYEE role: own payslip only
// ---------------------------------------------------------------------------
router.get(
  '/:id/pdf',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;

    if (!['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'EMPLOYEE'].includes(session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const id = req.params.id as string;
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true } },
        payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
        lines: { orderBy: { category: 'asc' } },
      },
    });

    if (!payslip) throw new ApiError(404, 'Payslip not found');

    // EMPLOYEE ownership check
    if (session.role === 'EMPLOYEE' && payslip.employeeId !== session.employeeId) {
      throw new ApiError(403, 'Forbidden');
    }

    const p = payslip as any;
    const pdfBuffer = await generatePayslipPdf({
      employee: p.employee,
      payrun: {
        name: p.payrun.name,
        periodStart: p.payrun.periodStart.toISOString(),
        periodEnd: p.payrun.periodEnd.toISOString(),
      },
      workedDays: p.workedDays,
      lines: p.lines,
      netSalary: p.netSalary,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${payslip.id}.pdf"`
    );
    res.send(pdfBuffer);
  })
);

export default router;
