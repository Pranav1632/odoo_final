import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Odoo's own brand purple — used the same way Odoo's own PDF reports (invoices,
// payslips) use it: as the accent for the document divider, table headers, and
// the highlighted total, against an otherwise plain white/gray business-document
// layout (not a themed app screen).
const BRAND = '#714B67';
const BRAND_LIGHT = '#F3EFF2';
const GRAY_BORDER = '#E4E0E3';
const TEXT_MUTED = '#6B6570';

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', fontSize: 9, color: '#1F1B22' },

  // ── Header: company block (left) + document title block (right) ──────────
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 30,
    height: 30,
    backgroundColor: BRAND,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  companyName: { fontSize: 14, fontWeight: 'bold', color: '#1F1B22' },
  companyAddress: { fontSize: 8, color: TEXT_MUTED, marginTop: 1 },
  docTitleBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: BRAND },
  docRef: { fontSize: 8, color: TEXT_MUTED, marginTop: 2 },

  divider: { borderBottomWidth: 2, borderBottomColor: BRAND, marginTop: 10, marginBottom: 14 },

  // ── Info grid: two columns of label/value pairs ────────────────────────────
  infoGrid: { flexDirection: 'row', marginBottom: 14 },
  infoCol: { flex: 1 },
  infoItem: { flexDirection: 'row', marginBottom: 5 },
  infoLabel: { width: 90, fontSize: 8, color: TEXT_MUTED, textTransform: 'uppercase' },
  infoValue: { flex: 1, fontSize: 9, fontWeight: 'bold' },

  // ── Salary computation table ───────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderLabel: { flex: 3, fontSize: 8, fontWeight: 'bold', color: '#FFFFFF', textTransform: 'uppercase' },
  tableHeaderAmount: { flex: 1, fontSize: 8, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'right', textTransform: 'uppercase' },

  categoryRow: {
    flexDirection: 'row',
    backgroundColor: BRAND_LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  categoryLabel: { fontSize: 8, fontWeight: 'bold', color: BRAND, textTransform: 'uppercase' },

  lineRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  lineRowAlt: { backgroundColor: '#FAFAFA' },
  lineLabel: { flex: 3, fontSize: 9 },
  lineCode: { fontSize: 7, color: TEXT_MUTED },
  lineAmount: { flex: 1, fontSize: 9, textAlign: 'right' },

  // ── Net salary highlight ────────────────────────────────────────────────────
  netBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BRAND,
    padding: 10,
    marginTop: 12,
    borderRadius: 3,
  },
  netLabel: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textTransform: 'uppercase' },
  netAmount: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 7,
    color: TEXT_MUTED,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    paddingTop: 6,
  },
});

export interface PayslipForPdf {
  employee: { name: string; department: string };
  payrun: { name: string; periodStart: string; periodEnd: string };
  workedDays: number;
  lines: Array<{ code: string; name: string; category: string; amount: number }>;
  netSalary: number | null;
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generates a PDF payslip as a Buffer using @react-pdf/renderer, styled after
 * Odoo's own business-document layout conventions (brand-purple header/table
 * accents, a clean label/value info grid, a bordered line-item table grouped
 * by category, and a highlighted net-pay total) rather than a plain list.
 */
export async function generatePayslipPdf(payslip: PayslipForPdf): Promise<Buffer> {
  // Preferred display order for the well-known categories; any other category a
  // salary rule is configured with still gets its own group instead of being
  // silently dropped from the printed payslip.
  const preferredOrder = ['Basic', 'Allowance', 'Gross', 'Deduction', 'Net'];
  const presentCategories = [...new Set(payslip.lines.map((l) => l.category))];
  const categories = [
    ...preferredOrder.filter((cat) => presentCategories.includes(cat)),
    ...presentCategories.filter((cat) => !preferredOrder.includes(cat)),
  ];

  const grouped = categories
    .map((cat) => ({
      category: cat,
      lines: payslip.lines.filter((l) => l.category === cat && l.category !== 'Net'),
    }))
    .filter((g) => g.lines.length > 0);

  const periodLabel = new Date(payslip.payrun.periodStart).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const periodRange = `${new Date(payslip.payrun.periodStart).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} – ${new Date(payslip.payrun.periodEnd).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;

  let rowIndex = 0;

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // ── Header ──────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          View,
          { style: styles.companyBlock },
          React.createElement(View, { style: styles.logoBox }, React.createElement(Text, { style: styles.logoText }, 'P')),
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.companyName }, 'PeoplePay360'),
            React.createElement(Text, { style: styles.companyAddress }, 'Enterprise HR, Contracts & Payroll SaaS Platform')
          )
        ),
        React.createElement(
          View,
          { style: styles.docTitleBlock },
          React.createElement(Text, { style: styles.docTitle }, 'PAYSLIP'),
          React.createElement(Text, { style: styles.docRef }, `Period: ${periodLabel}`)
        )
      ),
      React.createElement(View, { style: styles.divider }),

      // ── Info grid ───────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.infoGrid },
        React.createElement(
          View,
          { style: styles.infoCol },
          React.createElement(
            View,
            { style: styles.infoItem },
            React.createElement(Text, { style: styles.infoLabel }, 'Employee'),
            React.createElement(Text, { style: styles.infoValue }, payslip.employee.name)
          ),
          React.createElement(
            View,
            { style: styles.infoItem },
            React.createElement(Text, { style: styles.infoLabel }, 'Department'),
            React.createElement(Text, { style: styles.infoValue }, payslip.employee.department)
          )
        ),
        React.createElement(
          View,
          { style: styles.infoCol },
          React.createElement(
            View,
            { style: styles.infoItem },
            React.createElement(Text, { style: styles.infoLabel }, 'Pay Run'),
            React.createElement(Text, { style: styles.infoValue }, payslip.payrun.name)
          ),
          React.createElement(
            View,
            { style: styles.infoItem },
            React.createElement(Text, { style: styles.infoLabel }, 'Period Dates'),
            React.createElement(Text, { style: styles.infoValue }, periodRange)
          ),
          React.createElement(
            View,
            { style: styles.infoItem },
            React.createElement(Text, { style: styles.infoLabel }, 'Worked Days'),
            React.createElement(Text, { style: styles.infoValue }, String(payslip.workedDays))
          )
        )
      ),

      // ── Salary computation table ────────────────────────────────────────
      React.createElement(
        View,
        {},
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: styles.tableHeaderLabel }, 'Description'),
          React.createElement(Text, { style: styles.tableHeaderAmount }, 'Amount (INR)')
        ),
        ...grouped.flatMap((group) => [
          React.createElement(
            View,
            { key: `cat-${group.category}`, style: styles.categoryRow },
            React.createElement(Text, { style: styles.categoryLabel }, group.category)
          ),
          ...group.lines.map((line) => {
            const isAlt = rowIndex++ % 2 === 1;
            return React.createElement(
              View,
              { key: line.code, style: isAlt ? [styles.lineRow, styles.lineRowAlt] : styles.lineRow },
              React.createElement(
                View,
                { style: styles.lineLabel },
                React.createElement(Text, {}, line.name),
                React.createElement(Text, { style: styles.lineCode }, line.code)
              ),
              React.createElement(Text, { style: styles.lineAmount }, formatAmount(line.amount))
            );
          }),
        ])
      ),

      // ── Net salary ───────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.netBox },
        React.createElement(Text, { style: styles.netLabel }, 'Net Salary'),
        React.createElement(Text, { style: styles.netAmount }, `INR ${formatAmount(payslip.netSalary ?? 0)}`)
      ),

      // ── Footer ───────────────────────────────────────────────────────────
      React.createElement(
        Text,
        { style: styles.footer, fixed: true },
        'This is a computer-generated payslip and does not require a signature. — PeoplePay360'
      )
    )
  );

  return (await renderToBuffer(doc)) as Buffer;
}
