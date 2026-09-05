// src/pages/PayslipsList.jsx
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Select, Table, Avatar, Breadcrumb 
} from '../components/UI';
import { payruns, employees } from '../data/mockData';

export function PayslipsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  // Extract all payslips from payruns
  const allPayslips = useMemo(() => {
    return payruns.flatMap(pr => 
      (pr.payslips || []).map(ps => {
        const emp = employees.find(e => e.id === ps.employeeId);
        return {
          ...ps,
          payrunId: pr.id,
          payrunName: pr.name,
          period: `${pr.periodStart} – ${pr.periodEnd}`,
          employeeName: emp?.fullName || ps.employeeId,
          employeeDept: emp?.departmentId || ps.department,
        };
      })
    );
  }, []);

  const filtered = useMemo(() => {
    return allPayslips.filter(p => {
      const matchSearch = !search || 
        p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        p.payrunName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [allPayslips, search, statusFilter]);

  const columns = [
    { key: 'employee', header: 'Employee', width: '220px', render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.employeeName} size="sm" />
        <div>
          <p className="font-semibold text-gray-900">{row.employeeName}</p>
          <p className="text-xs text-gray-500">{row.department}</p>
        </div>
      </div>
    )},
    { key: 'payrun', header: 'Payrun', width: '200px', render: (row) => (
      <span className="text-sm font-medium text-gray-700">{row.payrunName}</span>
    )},
    { key: 'basic', header: 'Basic Salary', width: '130px', render: (row) => (
      <span className="font-mono text-sm text-gray-700">₹{row.basic?.toLocaleString('en-IN') || 0}</span>
    )},
    { key: 'gross', header: 'Gross Salary', width: '130px', render: (row) => (
      <span className="font-mono text-sm text-gray-700">₹{row.gross?.toLocaleString('en-IN') || 0}</span>
    )},
    { key: 'net', header: 'Net Salary', width: '140px', render: (row) => (
      <span className="font-mono font-bold text-sm text-gray-900">₹{row.net?.toLocaleString('en-IN') || 0}</span>
    )},
    { key: 'status', header: 'Status', width: '110px', render: (row) => (
      <Badge variant={row.status === 'Paid' ? 'success' : 'info'}>{row.status || 'Validated'}</Badge>
    )},
    { key: 'actions', header: 'Actions', width: '120px', render: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/payslips/${row.id}`)}>
          View
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="payslips-list-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Payslips' },
      ]} />

      <PageHeader
        title="Employee Payslips"
        subtitle="View and download individual monthly pay slips and computation breakdowns"
      />

      <div className="filter-bar">
        <Input
          placeholder="Search by employee or payrun..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'validated', label: 'Validated' },
            { value: 'paid', label: 'Paid' },
            { value: 'computed', label: 'Computed' },
          ]}
          className="w-44"
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
            onRowClick={(row) => navigate(`/payslips/${row.id}`)}
            emptyMessage="No payslips found matching your filters"
          />
        </CardBody>
      </Card>
    </div>
  );
}
