import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

/**
 * GET /api/dashboard
 * Aggregated metrics for the Payroll Dashboard.
 * Roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN, HR_MANAGER
 */
router.get(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'HR_MANAGER']),
  asyncHandler(async (req, res) => {
    const department = req.query.department as string | undefined;
    const period = req.query.period as string | undefined;
    const employmentType = req.query.employmentType as string | undefined;
    const employeeFilter: Record<string, unknown> =
      employmentType && employmentType !== 'all' ? { employmentType } : {};

    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    if (req.query.periodStart && req.query.periodEnd) {
      periodStart = new Date(req.query.periodStart as string);
      periodEnd = new Date(req.query.periodEnd as string);
    } else if (period && period !== 'all') {
      const [year, month] = period.split('-').map(Number);
      if (year && month) {
        periodStart = new Date(year, month - 1, 1);
        periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
      }
    }

    const payslipWhere: Record<string, unknown> = {
      status: { in: ['paid', 'validated'] },
    };

    if (periodStart && periodEnd) {
      payslipWhere.payrun = {
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      };
    }

    if ((department && department !== 'all') || Object.keys(employeeFilter).length > 0) {
      payslipWhere.employee = {
        ...(department && department !== 'all' ? { department } : {}),
        ...employeeFilter,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      netPaidAgg,
      payslipCount,
      approvedTimeOff,
      departmentCost,
      pendingPayruns,
      missingBankCount,
      warnedPayslips,
      attendanceToday,
      pendingTimeOff,
      recentPayruns,
      attendancesByStatus,
      timeOffTypesWithReqs,
    ] = await Promise.all([
      // Total net paid
      prisma.payslip.aggregate({
        where: payslipWhere,
        _sum: { netSalary: true },
      }),
      // Payslip count
      prisma.payslip.count({ where: payslipWhere }),
      // Approved time off within period or all time
      prisma.timeOffRequest.count({
        where: {
          status: 'approved',
          ...(periodStart && periodEnd ? {
            startDate: { gte: periodStart },
            endDate: { lte: periodEnd },
          } : {}),
          ...(Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : {}),
        },
      }),
      // Department cost grouping
      prisma.payslip.groupBy({
        by: ['employeeId'],
        where: payslipWhere,
        _sum: { netSalary: true },
      }),
      // Payruns needing validation
      prisma.payrun.count({ where: { status: 'computed' } }),
      // Active employees with missing bank details
      prisma.employee.count({ where: { bankAccountNumber: null, status: 'active', ...employeeFilter } }),
      // Payslips with warnings (array length > 0)
      prisma.payslip.count({
        where: {
          ...payslipWhere,
          warnings: { isEmpty: false },
        },
      }),
      // Attendance checked in today with no checkOut
      prisma.attendance.count({
        where: {
          checkIn: { gte: todayStart },
          checkOut: null,
          ...(Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : {}),
        },
      }),
      // Pending time off requests
      prisma.timeOffRequest.count({
        where: {
          status: 'pending',
          ...(Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : {}),
        },
      }),
      // Recent payruns for trend chart
      prisma.payrun.findMany({
        where: { status: { in: ['paid', 'validated'] } },
        orderBy: { periodStart: 'asc' },
        take: 6,
        include: {
          payslips: {
            where: Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : undefined,
            select: { netSalary: true },
          },
        },
      }),
      // Attendance distribution by status
      prisma.attendance.groupBy({
        by: ['status'],
        _count: { _all: true },
        ...(Object.keys(employeeFilter).length > 0 ? { where: { employee: employeeFilter } } : {}),
      }),
      // Time off types and requests
      prisma.timeOffType.findMany({
        include: {
          requests: {
            where: {
              status: 'approved',
              ...(Object.keys(employeeFilter).length > 0 ? { employee: employeeFilter } : {}),
            },
            select: { duration: true },
          },
        },
      }),
    ]);

    // Build department cost map from employee records
    const empIds = departmentCost.map((d) => d.employeeId);
    let deptCostList: Array<{ dept: string; total: number; count: number }> = [];

    if (empIds.length > 0) {
      const emps = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        select: { id: true, department: true },
      });
      const empMap = Object.fromEntries(emps.map((e) => [e.id, e.department]));
      const deptCostMap: Record<string, { total: number; count: number }> = {};

      for (const row of departmentCost) {
        const dept = empMap[row.employeeId] ?? 'General';
        if (!deptCostMap[dept]) {
          deptCostMap[dept] = { total: 0, count: 0 };
        }
        deptCostMap[dept].total += row._sum.netSalary ?? 0;
        deptCostMap[dept].count += 1;
      }

      deptCostList = Object.entries(deptCostMap).map(([dept, data]) => ({
        dept,
        total: Math.round(data.total),
        count: data.count,
      }));
    }

    const totalNet = Math.round(netPaidAgg._sum.netSalary ?? 0);

    // Monthly net salary trend
    const monthlyTrend = recentPayruns.map((p) => {
      const monthName = p.periodStart.toLocaleDateString('en-US', { month: 'short' });
      const payrunTotalNet = p.payslips.reduce((sum, s) => sum + (s.netSalary || 0), 0);
      return {
        month: monthName,
        totalNet: Math.round(payrunTotalNet),
        payslipCount: p.payslips.length,
      };
    });

    // Attendance breakdown
    const totalAtt = attendancesByStatus.reduce((sum, a) => sum + a._count._all, 0) || 1;
    const attendanceOverview = attendancesByStatus.map((a) => {
      const label = a.status === 'normal' ? 'Present' : a.status === 'exception' ? 'Late' : (a.status.charAt(0).toUpperCase() + a.status.slice(1));
      return {
        status: label,
        count: a._count._all,
        percentage: Math.round((a._count._all / totalAtt) * 100),
      };
    });

    // Time off by type
    const colors = ['#16a34a', '#2563eb', '#d97706', '#9333ea', '#ec4899'];
    const timeOffByType = timeOffTypesWithReqs.map((t, idx) => ({
      type: t.name,
      days: t.requests.reduce((sum, r) => sum + (r.duration || 0), 0),
      color: colors[idx % colors.length],
    }));

    res.json({
      totalNetPaid: totalNet,
      payslipCount,
      averageSalary: payslipCount > 0 ? Math.round(totalNet / payslipCount) : 0,
      approvedTimeOff,
      departmentCost: deptCostList,
      // Live data only — an empty period/department renders as an explicit empty
      // state on the frontend rather than being masked by fabricated numbers.
      monthlyTrend,
      attendanceOverview,
      timeOffByType,
      alerts: {
        pendingPayruns,
        missingBankCount,
        warnedPayslips,
      },
      attendance: {
        presentToday: attendanceToday,
        pendingTimeOff,
      },
    });
  })
);

export default router;
