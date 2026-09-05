import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subheader: { fontSize: 11, marginBottom: 20, color: '#555' },
  meta: { marginBottom: 4, fontSize: 10 },
  table: { display: 'flex', flexDirection: 'column', marginTop: 12 },
  row: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: 4 },
  label: { flex: 2, color: '#444' },
  amount: { flex: 1, textAlign: 'right' },
  netRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginTop: 4,
    borderTop: '2px solid #000',
  },
  netLabel: { flex: 2, fontWeight: 'bold', fontSize: 11 },
  netAmount: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 11 },
  sectionHeader: {
    fontSize: 9,
    color: '#888',
    marginTop: 10,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
});

export interface PayslipForPdf {
  employee: { name: string; department: string };
  payrun: { name: string; periodStart: string; periodEnd: string };
  workedDays: number;
  lines: Array<{ code: string; name: string; category: string; amount: number }>;
  netSalary: number | null;
}

/**
 * Generates a PDF payslip as a Buffer using @react-pdf/renderer.
 * Content: header, employee/payrun meta, grouped salary lines, net salary.
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

  const grouped = categories.map((cat) => ({
    category: cat,
    lines: payslip.lines.filter((l) => l.category === cat),
  }));

  const period = new Date(payslip.payrun.periodStart).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, {},
        React.createElement(Text, { style: styles.header }, 'PeoplePay360'),
        React.createElement(Text, { style: styles.subheader }, `Payslip — ${period}`),
        React.createElement(Text, { style: styles.meta }, `Employee: ${payslip.employee.name}`),
        React.createElement(Text, { style: styles.meta }, `Department: ${payslip.employee.department}`),
        React.createElement(Text, { style: styles.meta }, `Pay Run: ${payslip.payrun.name}`),
        React.createElement(Text, { style: styles.meta }, `Worked Days: ${payslip.workedDays}`)
      ),
      // Grouped salary lines (exclude Net from the per-category rows — shown separately below)
      ...grouped.map((group) =>
        React.createElement(
          View,
          { key: group.category, style: styles.table },
          React.createElement(Text, { style: styles.sectionHeader }, group.category),
          ...group.lines
            .filter((l) => l.category !== 'Net')
            .map((line) =>
              React.createElement(
                View,
                { key: line.code, style: styles.row },
                React.createElement(Text, { style: styles.label }, line.name),
                React.createElement(
                  Text,
                  { style: styles.amount },
                  line.amount.toLocaleString('en-IN')
                )
              )
            )
        )
      ),
      // Net salary row — always shown at the bottom
      React.createElement(
        View,
        { style: styles.netRow },
        React.createElement(Text, { style: styles.netLabel }, 'Net Salary'),
        React.createElement(
          Text,
          { style: styles.netAmount },
          (payslip.netSalary ?? 0).toLocaleString('en-IN')
        )
      )
    )
  );

  return (await renderToBuffer(doc)) as Buffer;
}
