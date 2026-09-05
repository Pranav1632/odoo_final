// src/pages/SalaryStructureForm.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Input, Table, Breadcrumb 
} from '../components/UI';
import { salaryStructures } from '../data/mockData';

export function SalaryStructureForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const existing = useMemo(() => {
    return isEdit ? salaryStructures.find(s => s.id === id) : null;
  }, [id, isEdit]);

  const [name, setName] = useState(existing?.name || '');
  const [code, setCode] = useState(existing?.code || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [rules, setRules] = useState(
    existing?.rules ? [...existing.rules].sort((a, b) => a.seq - b.seq) : []
  );
  const [loading, setLoading] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/salary-structures');
    }, 500);
  };

  const ruleColumns = [
    { key: 'seq', header: 'Seq', width: '70px', render: (row) => (
      <span className="font-mono text-gray-500">{row.seq}</span>
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
    { key: 'method', header: 'Computation', width: '150px', render: (row) => (
      <span className="text-xs text-gray-700">
        {row.method === 'Fixed' && `Fixed: ₹${row.amount?.toLocaleString() || 0}`}
        {row.method === 'Percentage' && `${row.percentage}% of ${row.ofRule || 'BASIC'}`}
        {row.method === 'Formula' && <span className="font-mono text-[11px] bg-cream px-2 py-0.5 rounded">{row.formula}</span>}
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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Structure Information</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Structure Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Regular Monthly Salary"
              required
            />
            <Input
              label="Structure Code *"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. REG-SAL"
              required
            />
          </div>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of this salary structure"
          />
        </CardBody>
      </Card>

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
    </div>
  );
}
