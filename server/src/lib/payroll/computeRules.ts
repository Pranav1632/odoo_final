import { evaluate } from 'mathjs';

export interface RuleInput {
  code: string;
  name: string;
  category: string;
  sequence: number;
  computationMethod: 'fixed' | 'percentage' | 'formula';
  amount?: number | null;
  percentageOf?: string | null;
  percentageValue?: number | null;
  formula?: string | null;
}

export interface ComputeResult {
  lines: Array<{ code: string; name: string; category: string; amount: number }>;
  scope: Record<string, number>;
  warnings: string[];
}

/**
 * Runs a set of salary rules in sequence (sorted by `sequence`),
 * building up a scope of named values that later rules can reference.
 *
 * - fixed: uses `amount` directly
 * - percentage: uses scope[percentageOf] * percentageValue / 100
 * - formula: evaluates `formula` string via mathjs with current scope
 *
 * Never throws — formula errors produce a warning and default the value to 0.
 */
export function computeSalaryRules(
  rules: RuleInput[],
  baseContext: Record<string, number> = {}
): ComputeResult {
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
  const scope: Record<string, number> = { ...baseContext };
  const lines: ComputeResult['lines'] = [];
  const warnings: string[] = [];

  for (const rule of sorted) {
    let value = 0;
    try {
      if (rule.computationMethod === 'fixed') {
        value = rule.amount ?? 0;
      } else if (rule.computationMethod === 'percentage') {
        const base = scope[rule.percentageOf ?? ''] ?? 0;
        if (rule.percentageOf && scope[rule.percentageOf] === undefined) {
          warnings.push(
            `Rule ${rule.code}: percentageOf "${rule.percentageOf}" not yet computed — value will be 0`
          );
        }
        value = base * ((rule.percentageValue ?? 0) / 100);
      } else if (rule.computationMethod === 'formula') {
        value = Number(evaluate(rule.formula ?? '0', { ...scope }));
        if (!isFinite(value)) {
          warnings.push(
            `Rule ${rule.code}: formula produced non-finite value, defaulting to 0`
          );
          value = 0;
        }
      }
    } catch (e) {
      warnings.push(
        `Rule ${rule.code}: formula error — ${(e as Error).message} — defaulting to 0`
      );
      value = 0;
    }

    scope[rule.code] = value;
    lines.push({ code: rule.code, name: rule.name, category: rule.category, amount: value });
  }

  return { lines, scope, warnings };
}
