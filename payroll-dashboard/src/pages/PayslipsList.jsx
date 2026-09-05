import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Select, Table, Avatar, Breadcrumb 
} from '../components/UI';
import { payslipsApi } from '../lib/api';

export function PayslipsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [payslipList, setPayslipList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    payslipsApi.getAll()
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setPayslipList(data.map(ps => ({
            id: ps.id,
            employeeId: ps.employeeId,
            employeeName: ps.employee?.name || 'Employee',
            employeeDept: ps.employee?.department || 'General',
            payrunId: ps.payrunId,
            payrunName: ps.payrun?.name || 'Payrun',
            status: ps.status ? ps.status.charAt(0).toUpperCase() + ps.status.slice(1).toLowerCase() : 'Draft',
            netSalary: ps.netSalary ?? 0,
            workedDays: ps.workedDays ?? 30,
          })));
        } else {
          setPayslipList([]);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setPayslipList([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const filteredPayslips = useMemo(() => {
    return payslipList.filter(ps => {
      const matchSearch = !search || 
        ps.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        ps.payrunName.toLowerCase().includes(search.toLowerCase()) ||
        ps.employeeDept.toLowerCase().includes(search.toLowerCase()) ||
        ps.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || ps.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [payslipList, search, statusFilter]);

  const columns = [
    { key: 'employee', header: 'Employee', width: '220px', render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.employeeName} size="sm" />
        <div>
          <p className="font-semibold text-gray-900">{row.employeeName}</p>
          <p className="text-xs text-gray-500">{row.employeeDept}</p>
        </div>
      </div>
    )},
    { key: 'payrun', header: 'Payrun', width: '200px', render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.payrunName}</p>
        <p className="text-xs font-mono text-gray-500">{row.payrunId}</p>
      </div>
    )},
    { key: 'workedDays', header: 'Worked Days', width: '120px', render: (row) => (
      <span className="font-mono text-sm">{row.workedDays} days</span>
    )},
    { key: 'netSalary', header: 'Net Salary', width: '150px', render: (row) => (
      <span className="font-semibold text-gray-900">
        ₹{Number(row.netSalary || 0).toLocaleString('en-IN')}
      </span>
    )},
    { key: 'status', header: 'Status', width: '120px', render: (row) => (
      <Badge variant={
        row.status === 'Paid' ? 'success' :
        row.status === 'Validated' ? 'info' :
        row.status === 'Computed' ? 'primary' : 'gray'
      }>
        {row.status}
      </Badge>
    )},
    { key: 'actions', header: 'Actions', width: '100px', render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/payslips/${row.id}`)}>
        View
      </Button>
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
        subtitle="Individual computed payslips, line breakdown, and PDF download generation"
      />

      <div className="filter-bar">
        <Input
          placeholder="Search by employee, department, payrun..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80"
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'Draft', label: 'Draft' },
            { value: 'Computed', label: 'Computed' },
            { value: 'Validated', label: 'Validated' },
            { value: 'Paid', label: 'Paid' },
          ]}
          className="w-44"
        />
        {(search || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={filteredPayslips}
            keyField="id"
            onRowClick={(row) => navigate(`/payslips/${row.id}`)}
            emptyMessage={loading ? "Loading payslips..." : "No payslips found"}
          />
        </CardBody>
      </Card>
    </div>
  );
}
