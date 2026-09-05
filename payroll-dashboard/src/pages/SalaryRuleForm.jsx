// src/pages/SalaryRuleForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Breadcrumb 
} from '../components/UI';
import { salaryStructuresApi, salaryRulesApi } from '../lib/api';
import { getSession } from '../lib/user';

export function SalaryRuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const isEdit = Boolean(id && id !== 'new');

  // Role check: HR_PAYROLL_USER is read-only on rules (security requirement)
  const canEdit = session?.role === 'HR_PAYROLL_MANAGER' || session?.role === 'ADMIN' || !session;

  const [structureList, setStructureList] = useState([]);
  const [structureId, setStructureId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Allowance');
  const [sequence, setSequence] = useState('1');
  const [method, setMethod] = useState('percentage');
  const [amount, setAmount] = useState('');
  const [ofRule, setOfRule] = useState('BASIC');
  const [percentage, setPercentage] = useState('40');
  const [formula, setFormula] = useState('BASIC + HRA');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      salaryStructuresApi.getAll().catch(() => []),
      isEdit ? salaryRulesApi.getById(id).catch(() => null) : Promise.resolve(null),
    ]).then(([structures, rule]) => {
      if (!isMounted) return;

      const structArr = Array.isArray(structures) ? structures : [];
      setStructureList(structArr);

      if (rule) {
        setStructureId(rule.structureId || '');
        setName(rule.name || '');
        setCode(rule.code || '');
        setCategory(rule.category || 'Allowance');
        setSequence(rule.sequence ? rule.sequence.toString() : '1');
        setMethod(rule.computationMethod || 'percentage');
        setAmount(rule.amount !== null && rule.amount !== undefined ? rule.amount.toString() : '');
        setOfRule(rule.percentageOf || 'BASIC');
        setPercentage(rule.percentageValue !== null && rule.percentageValue !== undefined ? rule.percentageValue.toString() : '40');
        setFormula(rule.formula || 'BASIC + HRA');
      } else {
        if (structArr.length > 0) setStructureId(structArr[0].id);
      }
    }).finally(() => {
      if (isMounted) setInitialLoading(false);
    });

    return () => { isMounted = false; };
  }, [id, isEdit]);

  const handleCodeChange = (val) => {
    const uppercaseVal = val.toUpperCase();
    setCode(uppercaseVal);
    if (uppercaseVal && !/^[A-Z_]+$/.test(uppercaseVal)) {
      setErrors(prev => ({ ...prev, code: 'Rule code must contain only uppercase letters and underscores (e.g. BASIC_PAY)' }));
    } else {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!code.trim() || !/^[A-Z_]+$/.test(code)) {
      newErrors.code = 'Rule code must match /^[A-Z_]+$/';
    }
    if (method === 'fixed' && (!amount || isNaN(Number(amount)))) newErrors.amount = 'Valid amount is required for fixed method';
    if (method === 'percentage' && (!percentage || isNaN(Number(percentage)))) newErrors.percentage = 'Percentage value is required';
    if (method === 'formula' && !formula.trim()) newErrors.formula = 'Formula is required';
    if (!structureId) newErrors.structureId = 'Salary structure is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        structureId,
        name,
        code,
        category,
        sequence: parseInt(sequence, 10) || 1,
        computationMethod: method,
        amount: method === 'fixed' ? parseFloat(amount) : null,
        percentageOf: method === 'percentage' ? ofRule : null,
        percentageValue: method === 'percentage' ? parseFloat(percentage) : null,
        formula: method === 'formula' ? formula : null,
      };

      if (isEdit) {
        await salaryRulesApi.update(id, payload);
      } else {
        await salaryRulesApi.create(payload);
      }
      navigate(-1);
    } catch (err) {
      console.error('Failed to save salary rule:', err);
      setErrors(prev => ({ ...prev, form: err.message || 'Failed to save salary rule' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this salary rule?')) return;
    setLoading(true);
    try {
      await salaryRulesApi.delete(id);
      navigate(-1);
    } catch (err) {
      console.error('Failed to delete salary rule:', err);
      setErrors(prev => ({ ...prev, form: err.message || 'Failed to delete salary rule' }));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-3xl" data-testid="salary-rule-form-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Salary Structures', href: '/salary-structures' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading rule details...
          </CardBody>
        </Card>
      </div>
    );
  }

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
                {isEdit && <Button variant="danger" onClick={handleDelete} loading={loading}>Delete</Button>}
                <Button variant="primary" onClick={handleSave} loading={loading}>Save</Button>
              </>
            )}
          </div>
        }
      />

      {errors.form && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
          {errors.form}
        </div>
      )}

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
              options={structureList.map(s => ({ value: s.id, label: s.name }))}
              disabled={!canEdit || isEdit}
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
