import { computeSalaryRules, RuleInput } from '../../src/lib/payroll/computeRules';

/**
 * Standard payslip rules used in the main acceptance test:
 * BASIC=30000 (fixed)
 * HRA=20% of BASIC → 6000
 * GROSS=BASIC+HRA (formula) → 36000
 * PF=12% of BASIC → 3600
 * NET=GROSS-PF (formula) → 32400
 */
const standardRules: RuleInput[] = [
  {
    code: 'BASIC',
    name: 'Basic Salary',
    category: 'Basic',
    sequence: 1,
    computationMethod: 'fixed',
    amount: 30000,
  },
  {
    code: 'HRA',
    name: 'House Rent Allowance',
    category: 'Allowance',
    sequence: 2,
    computationMethod: 'percentage',
    percentageOf: 'BASIC',
    percentageValue: 20,
  },
  {
    code: 'GROSS',
    name: 'Gross Salary',
    category: 'Gross',
    sequence: 3,
    computationMethod: 'formula',
    formula: 'BASIC + HRA',
  },
  {
    code: 'PF',
    name: 'Provident Fund',
    category: 'Deduction',
    sequence: 4,
    computationMethod: 'percentage',
    percentageOf: 'BASIC',
    percentageValue: 12,
  },
  {
    code: 'NET',
    name: 'Net Salary',
    category: 'Net',
    sequence: 5,
    computationMethod: 'formula',
    formula: 'GROSS - PF',
  },
];

describe('computeSalaryRules — unit tests', () => {
  const baseContext = { CONTRACT_WAGE: 30000, WORKED_DAYS: 30 };

  test('standard payslip: produces correct values for all 5 rules', () => {
    const { lines, warnings } = computeSalaryRules(standardRules, baseContext);

    expect(warnings).toHaveLength(0);

    const byCode = Object.fromEntries(lines.map((l) => [l.code, l.amount]));
    expect(byCode['BASIC']).toBe(30000);
    expect(byCode['HRA']).toBe(6000);
    expect(byCode['GROSS']).toBe(36000);
    expect(byCode['PF']).toBe(3600);
    expect(byCode['NET']).toBe(32400);
  });

  test('rules are sorted by sequence regardless of input order', () => {
    const shuffled = [...standardRules].reverse();
    const { lines } = computeSalaryRules(shuffled, baseContext);
    const byCode = Object.fromEntries(lines.map((l) => [l.code, l.amount]));
    // Values should still be correct since we sort before evaluating
    expect(byCode['NET']).toBe(32400);
  });

  test('malformed formula: returns warning, defaults to 0, does not throw', () => {
    const badRule: RuleInput = {
      code: 'BAD',
      name: 'Bad Rule',
      category: 'Basic',
      sequence: 1,
      computationMethod: 'formula',
      formula: 'UNDEFINED_VAR * 2',
    };

    const { lines, warnings } = computeSalaryRules([badRule]);

    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(0);
    // Warning must mention the rule code
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('BAD'))).toBe(true);
  });

  test('percentageOf references an undefined code: produces warning and value 0', () => {
    const rule: RuleInput = {
      code: 'HRA',
      name: 'HRA',
      category: 'Allowance',
      sequence: 1,
      computationMethod: 'percentage',
      percentageOf: 'NONEXISTENT',
      percentageValue: 20,
    };

    const { lines, warnings } = computeSalaryRules([rule]);
    expect(lines[0].amount).toBe(0);
    expect(warnings.some((w) => w.includes('NONEXISTENT'))).toBe(true);
  });

  test('fixed rule with null amount defaults to 0', () => {
    const rule: RuleInput = {
      code: 'BONUS',
      name: 'Bonus',
      category: 'Allowance',
      sequence: 1,
      computationMethod: 'fixed',
      amount: null,
    };
    const { lines } = computeSalaryRules([rule]);
    expect(lines[0].amount).toBe(0);
  });

  test('scope is returned with all computed codes available', () => {
    const { scope } = computeSalaryRules(standardRules, baseContext);
    expect(scope['BASIC']).toBe(30000);
    expect(scope['HRA']).toBe(6000);
    expect(scope['GROSS']).toBe(36000);
    expect(scope['NET']).toBe(32400);
    // Base context values are also in scope
    expect(scope['CONTRACT_WAGE']).toBe(30000);
    expect(scope['WORKED_DAYS']).toBe(30);
  });

  test('non-finite formula result defaults to 0 with warning', () => {
    const rule: RuleInput = {
      code: 'DIV',
      name: 'Division',
      category: 'Basic',
      sequence: 1,
      computationMethod: 'formula',
      formula: '1 / 0',
    };
    const { lines, warnings } = computeSalaryRules([rule]);
    expect(lines[0].amount).toBe(0);
    expect(warnings.some((w) => w.includes('DIV'))).toBe(true);
  });
});
