import { computeSalaryRules, RuleInput } from '../../src/lib/payroll/computeRules';

describe('computeSalaryRules — formula rule tests', () => {
  test('pro-rated salary: CONTRACT_WAGE * WORKED_DAYS / 30', () => {
    const rules: RuleInput[] = [
      {
        code: 'BASIC',
        name: 'Basic',
        category: 'Basic',
        sequence: 1,
        computationMethod: 'formula',
        formula: 'CONTRACT_WAGE * WORKED_DAYS / 30',
      },
    ];
    const baseContext = { CONTRACT_WAGE: 36000, WORKED_DAYS: 25 };
    const { lines, warnings } = computeSalaryRules(rules, baseContext);

    expect(warnings).toHaveLength(0);
    expect(lines[0].amount).toBe(30000);
  });

  test('conditional formula: GROSS > 50000 ? GROSS * 0.1 : 0 — high GROSS triggers tax', () => {
    const rules: RuleInput[] = [
      {
        code: 'GROSS',
        name: 'Gross',
        category: 'Gross',
        sequence: 1,
        computationMethod: 'fixed',
        amount: 60000,
      },
      {
        code: 'TAX',
        name: 'Income Tax',
        category: 'Deduction',
        sequence: 2,
        computationMethod: 'formula',
        formula: 'GROSS > 50000 ? GROSS * 0.1 : 0',
      },
    ];
    const { lines, warnings } = computeSalaryRules(rules);

    expect(warnings).toHaveLength(0);
    const tax = lines.find((l) => l.code === 'TAX');
    expect(tax?.amount).toBe(6000);
  });

  test('conditional formula: GROSS > 50000 ? GROSS * 0.1 : 0 — low GROSS returns 0', () => {
    const rules: RuleInput[] = [
      {
        code: 'GROSS',
        name: 'Gross',
        category: 'Gross',
        sequence: 1,
        computationMethod: 'fixed',
        amount: 40000,
      },
      {
        code: 'TAX',
        name: 'Income Tax',
        category: 'Deduction',
        sequence: 2,
        computationMethod: 'formula',
        formula: 'GROSS > 50000 ? GROSS * 0.1 : 0',
      },
    ];
    const { lines, warnings } = computeSalaryRules(rules);

    expect(warnings).toHaveLength(0);
    const tax = lines.find((l) => l.code === 'TAX');
    expect(tax?.amount).toBe(0);
  });

  test('formula using base context values directly', () => {
    const rules: RuleInput[] = [
      {
        code: 'NET',
        name: 'Net',
        category: 'Net',
        sequence: 1,
        computationMethod: 'formula',
        formula: 'CONTRACT_WAGE * 0.9',
      },
    ];
    const { lines } = computeSalaryRules(rules, { CONTRACT_WAGE: 50000, WORKED_DAYS: 30 });
    expect(lines[0].amount).toBe(45000);
  });

  test('formulas can chain: later rules reference earlier rule codes', () => {
    const rules: RuleInput[] = [
      {
        code: 'A',
        name: 'A',
        category: 'Basic',
        sequence: 1,
        computationMethod: 'fixed',
        amount: 10000,
      },
      {
        code: 'B',
        name: 'B',
        category: 'Allowance',
        sequence: 2,
        computationMethod: 'formula',
        formula: 'A * 2',
      },
      {
        code: 'C',
        name: 'C',
        category: 'Gross',
        sequence: 3,
        computationMethod: 'formula',
        formula: 'A + B',
      },
    ];
    const { lines } = computeSalaryRules(rules);
    const byCode = Object.fromEntries(lines.map((l) => [l.code, l.amount]));
    expect(byCode['A']).toBe(10000);
    expect(byCode['B']).toBe(20000);
    expect(byCode['C']).toBe(30000);
  });
});
