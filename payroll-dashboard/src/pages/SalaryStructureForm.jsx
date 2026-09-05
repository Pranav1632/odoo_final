// src/pages/SalaryStructureForm.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Input, Table, Breadcrumb 
} from '../components/UI';
import { salaryStructuresApi } from '../lib/api';

export function SalaryStructureForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const [name, setName] = useState('');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let isMounted = true;
    salaryStructuresApi.getById(id)
      .then(struct => {
        if (!isMounted || !struct) return;
        setName(struct.name || '');
        if (Array.isArray(struct.rules)) {
          setRules([...struct.rules].sort((a, b) => a.sequence - b.sequence));
        }
      })
      .catch(err => {
        console.error('Failed to load salary structure:', err);
        setError('Failed to load salary structure');
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    return () => { isMounted = false; };
  }, [id, isEdit]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Structure name is required.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await salaryStructuresApi.update(id, { name });
      } else {
        await salaryStructuresApi.create({ name });
      }
      navigate('/salary-structures');
    } catch (err) {
      console.error('Failed to save salary structure:', err);
      setError(err.message || 'Failed to save salary structure');
    } finally {
      setLoading(false);
    }
  };

  const ruleColumns = [
    { key: 'sequence', header: 'Seq', width: '70px', render: (row) => (
      <span className="font-mono text-gray-500">{row.sequence}</span>
    )},
    { key: 'name', header: 'Rule Name', width: '200px', render: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        <p className="text-xs font-mono text-gray-500">{row.code}</p>
      </div>
    )},
    { key: 'category', header: 'Category', width: '130px', render: (row) => (
      <Badge variant={
        row.category === 'Basic' ? 'primary' :
        row.category === 'Allowance' ? 'success' :
        row.category === 'Deduction' ? 'warning' :
        row.category === 'Net' ? 'info' : 'gray'
      }>
        {row.category}
      </Badge>
    )},
    { key: 'method', header: 'Computation', width: '200px', render: (row) => (
      <span className="text-xs text-gray-700">
        {row.computationMethod === 'fixed' && `Fixed: ₹${row.amount?.toLocaleString() || 0}`}
        {row.computationMethod === 'percentage' && `${row.percentageValue}% of ${row.percentageOf || 'BASIC'}`}
        {row.computationMethod === 'formula' && <span className="font-mono text-[11px] bg-cream px-2 py-0.5 rounded">{row.formula}</span>}
      </span>
    )},
    { key: 'actions', header: 'Actions', width: '100px', render: (row) => (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate(`/salary-rules/${row.id}`)}
      >
        Edit
      </Button>
    )},
  ];

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-5xl" data-testid="salary-structure-form-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Salary Structures', href: '/salary-structures' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading salary structure...
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl" data-testid="salary-structure-form-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Salary Structures', href: '/salary-structures' },
        { label: isEdit ? (name || id) : 'New Salary Structure' },
      ]} />

      <PageHeader
        title={isEdit ? `Salary Structure: ${name}` : 'New Salary Structure'}
        subtitle="Configure structure header and ordered salary computation rules"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/salary-structures')}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>Save Structure</Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm" role="alert">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-semibold">Structure Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Structure Information</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Structure Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Regular Monthly Salary"
            required
          />
        </CardBody>
      </Card>

      {isEdit && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Salary Rules</h3>
              <p className="text-xs text-gray-500 mt-0.5">Rules are computed sequentially from lowest sequence to highest</p>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => navigate('/salary-rules/new')}
            >
              + Add Rule
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <Table
              columns={ruleColumns}
              data={rules}
              keyField="id"
              emptyMessage="No rules configured in this salary structure yet."
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
