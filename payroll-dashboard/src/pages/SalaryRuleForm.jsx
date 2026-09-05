// src/pages/SalaryRuleForm.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Breadcrumb 
} from '../components/UI';
import { salaryStructures } from '../data/mockData';
import { getSession } from '../lib/user';

export function SalaryRuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const isEdit = Boolean(id && id !== 'new');

  // Role check: HR_PAYROLL_USER is read-only on rules (security requirement)
  const canEdit = session?.role === 'HR_PAYROLL_MANAGER' || session?.role === 'ADMIN' || !session;

  const allRules = useMemo(() => {
    return salaryStructures.flatMap(s => s.rules || []);
  }, []);

  const existing = useMemo(() => {
    return isEdit ? allRules.find(r => r.id === id) : null;
  }, [id, isEdit, allRules]);

  const [structureId, setStructureId] = useState(
    existing?.structureId || salaryStructures[0]?.id || 'struct-001'
  );
  const [name, setName] = useState(existing?.name || '');
  const [code, setCode] = useState(existing?.code || '');
  const [category, setCategory] = useState(existing?.category || 'Allowance');
  const [sequence, setSequence] = useState(existing?.seq?.toString() || existing?.sequence?.toString() || '1');
  const [method, setMethod] = useState(existing?.method?.toLowerCase() || existing?.computationMethod || 'percentage');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [ofRule, setOfRule] = useState(existing?.ofRule || existing?.percentageOf || 'BASIC');
  const [percentage, setPercentage] = useState(existing?.percentage?.toString() || existing?.percentageValue?.toString() || '40');
  const [formula, setFormula] = useState(existing?.formula || 'BASIC + HRA');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (val) => {
    const uppercaseVal = val.toUpperCase();
    setCode(uppercaseVal);
    if (uppercaseVal && !/^[A-Z_]+$/.test(uppercaseVal)) {
      setErrors(prev => ({ ...prev, code: 'Rule code must contain only uppercase letters and underscores (e.g. BASIC_PAY)' }));
    } else {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!code.trim() || !/^[A-Z_]+$/.test(code)) {
      newErrors.code = 'Rule code must match /^[A-Z_]+$/';
    }
    if (method === 'fixed' && !amount) newErrors.amount = 'Amount is required for fixed method';
    if (method === 'percentage' && !percentage) newErrors.percentage = 'Percentage value is required';
    if (method === 'formula' && !formula.trim()) newErrors.formula = 'Formula is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(-1);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="salary-rule-form-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Salary Structures', href: '/salary-structures' },
        { label: isEdit ? `Edit Rule: ${code || id}` : 'New Salary Rule' },
      ]} />

      <PageHeader
        title={isEdit ? `Salary Rule: ${name || code}` : 'New Salary Rule'}
        subtitle="Configure rule category, code, sequence, and computation logic"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
            {canEdit && (
              <>
                {isEdit && <Button variant="danger" onClick={() => navigate(-1)}>Delete</Button>}
                <Button variant="primary" onClick={handleSave} loading={loading}>Save</Button>
              </>
            )}
          </div>
        }
      />

      {!canEdit && (
        <div className="p-3 bg-cream text-gray-700 text-xs rounded-xl border border-gray-200">
          Viewing in read-only mode for role <strong className="font-mono">{session?.role}</strong>. Save/Delete actions are restricted to Payroll Managers.
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Rule Parameters</h3>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Salary Structure *"
              value={structureId}
              onChange={(e) => setStructureId(e.target.value)}
              options={salaryStructures.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              disabled={!canEdit}
              required
            />
            <Input
              label="Rule Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House Rent Allowance"
              error={errors.name}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rule Code * (Uppercase & Underscores only)"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g. HRA"
              error={errors.code}
              disabled={!canEdit}
              required
            />
            <Select
              label="Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Basic', label: 'Basic' },
                { value: 'Allowance', label: 'Allowance' },
                { value: 'Gross', label: 'Gross' },
                { value: 'Deduction', label: 'Deduction' },
                { value: 'Net', label: 'Net' },
              ]}
              disabled={!canEdit}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Computation Sequence *"
              type="number"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              placeholder="1"
              disabled={!canEdit}
              required
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Computation Method</h4>
            <Select
              label="Method *"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
                { value: 'formula', label: 'Formula' },
              ]}
              disabled={!canEdit}
            />

            {/* Conditional fields per method */}
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              {method === 'fixed' && (
                <Input
                  label="Amount (₹) *"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  error={errors.amount}
                  disabled={!canEdit}
                  required
                />
              )}

              {method === 'percentage' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Percentage Of (Rule Code) *"
                    value={ofRule}
                    onChange={(e) => setOfRule(e.target.value.toUpperCase())}
                    placeholder="BASIC"
                    disabled={!canEdit}
                    required
                  />
                  <Input
                    label="Percentage Value (%) *"
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="40"
                    error={errors.percentage}
                    disabled={!canEdit}
                    required
                  />
                </div>
              )}

              {method === 'formula' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Formula Expression *
                  </label>
                  <textarea
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. BASIC + HRA - PF"
                    rows={3}
                    disabled={!canEdit}
                    className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                  {errors.formula && <p className="text-xs text-error mt-1">{errors.formula}</p>}
                  <p className="text-xs text-gray-400 mt-1">Available variables: rule codes defined in preceding sequence steps.</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
