// src/pages/SalaryStructuresList.jsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Table, Breadcrumb 
} from '../components/UI';
import { salaryStructures } from '../data/mockData';

export function SalaryStructuresList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return salaryStructures.filter(s => 
      !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const columns = [
    { key: 'name', header: 'Name', width: '240px', render: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-500 font-mono">{row.code}</p>
      </div>
    )},
    { key: 'description', header: 'Description', width: '300px', render: (row) => (
      <span className="text-sm text-gray-600">{row.description || '—'}</span>
    )},
    { key: 'rulesCount', header: 'Rules Count', width: '140px', render: (row) => (
      <Badge variant="primary">{row.rules?.length || 0} Rules</Badge>
    )},
    { key: 'active', header: 'Status', width: '120px', render: (row) => (
      <Badge variant={row.active ? 'success' : 'gray'}>{row.active ? 'Active' : 'Inactive'}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/salary-structures/${row.id}`)}>
        Edit
      </Button>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="salary-structures-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Salary Structures' },
      ]} />

      <PageHeader
        title="Salary Structures"
        subtitle="Manage payroll calculation formulas, basic allowances, and statutory deduction rules"
        actions={
          <Button variant="primary" onClick={() => navigate('/salary-structures/new')}>
            + New Salary Structure
          </Button>
        }
      />

      <div className="filter-bar">
        <Input
          placeholder="Search salary structures by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80"
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(row) => navigate(`/salary-structures/${row.id}`)}
            emptyMessage="No salary structures found"
          />
        </CardBody>
      </Card>
    </div>
  );
}
