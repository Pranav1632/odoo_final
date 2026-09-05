import { generatePayslipPdf } from '../../src/lib/payroll/generatePdf';

describe('generatePayslipPdf — smoke tests', () => {
  const samplePayslip = {
    employee: { name: 'Test Employee', department: 'Engineering' },
    payrun: {
      name: 'July 2026 Payrun',
      periodStart: '2026-07-01T00:00:00.000Z',
      periodEnd: '2026-07-31T23:59:59.000Z',
    },
    workedDays: 28,
    lines: [
      { code: 'BASIC', name: 'Basic Salary', category: 'Basic', amount: 30000 },
      { code: 'HRA', name: 'House Rent Allowance', category: 'Allowance', amount: 6000 },
      { code: 'GROSS', name: 'Gross Salary', category: 'Gross', amount: 36000 },
      { code: 'PF', name: 'Provident Fund', category: 'Deduction', amount: 3600 },
      { code: 'NET', name: 'Net Salary', category: 'Net', amount: 32400 },
    ],
    netSalary: 32400,
  };

  test('returns a non-empty Buffer', async () => {
    const buffer = await generatePayslipPdf(samplePayslip);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 30000);

  test('buffer starts with %PDF (valid PDF magic bytes)', async () => {
    const buffer = await generatePayslipPdf(samplePayslip);
    const magic = buffer.slice(0, 4).toString('utf8');
    expect(magic).toBe('%PDF');
  }, 30000);

  test('works with null netSalary (defaults to 0)', async () => {
    const buffer = await generatePayslipPdf({ ...samplePayslip, netSalary: null });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 30000);

  test('works with empty lines array', async () => {
    const buffer = await generatePayslipPdf({ ...samplePayslip, lines: [] });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  }, 30000);
});
