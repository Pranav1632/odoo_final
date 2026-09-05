// src/pages/AuditLog.jsx
import { useState, useMemo } from 'react';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Select, Table, Breadcrumb 
} from '../components/UI';
import { employees } from '../data/mockData';

const MOCK_AUDIT_LOGS = [
  {
    id: 'log-001',
    timestamp: '2026-08-15 14:32:10',
    userName: 'Emily Rodriguez',
    userId: 'emp-003',
    action: 'PAYRUN_VALIDATE',
    entityType: 'Payrun',
    entityId: 'pr-001',
    details: { payrunName: 'August 2025 Payroll', totalNet: 485000, payslipCount: 8, status: 'Validated' }
  },
  {
    id: 'log-002',
    timestamp: '2026-08-15 11:20:45',
    userName: 'Lisa Wang',
    userId: 'emp-005',
    action: 'CONTRACT_ACTIVATE',
    entityType: 'Contract',
    entityId: 'ctr-001',
    details: { employeeId: 'emp-001', wage: 120000, structure: 'REG-SAL', previousStatus: 'Draft' }
  },
  {
    id: 'log-003',
    timestamp: '2026-08-14 16:05:12',
    userName: 'Emily Rodriguez',
    userId: 'emp-003',
    action: 'TIMEOFF_APPROVE',
    entityType: 'TimeOffRequest',
    entityId: 'tor-001',
    details: { employeeId: 'emp-001', leaveType: 'Annual Leave', duration: '5 days', approvedBy: 'emp-003' }
  },
  {
    id: 'log-004',
    timestamp: '2026-08-12 09:14:02',
    userName: 'Sarah Chen',
    userId: 'emp-001',
    action: 'BANK_ACCOUNT_UPDATE',
    entityType: 'Employee',
    entityId: 'emp-001',
    details: { field: 'bankAccountNumber', masked: '****1234', bankName: 'Chase Bank' }
  },
  {
    id: 'log-005',
    timestamp: '2026-08-10 13:45:00',
    userName: 'Maria Garcia',
    userId: 'emp-007',
    action: 'SALARY_RULE_CREATE',
    entityType: 'SalaryRule',
    entityId: 'rule-006',
    details: { code: 'PT', category: 'Deduction', method: 'fixed', amount: 200 }
  },
  {
    id: 'log-006',
    timestamp: '2026-08-01 08:30:00',
    userName: 'System',
    userId: 'sys-001',
    action: 'PAYRUN_COMPUTE',
    entityType: 'Payrun',
    entityId: 'pr-001',
    details: { durationMs: 420, warningsFound: 3, computedPayslips: 8 }
  }
];

export function AuditLog() {
  const [userFilter, setUserFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    return ['all', ...Array.from(new Set(MOCK_AUDIT_LOGS.map(l => l.userName)))];
  }, []);

  const entityTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(MOCK_AUDIT_LOGS.map(l => l.entityType)))];
  }, []);

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter(log => {
      const matchUser = userFilter === 'all' || log.userName === userFilter;
      const matchEntity = entityFilter === 'all' || log.entityType === entityFilter;
      const matchSearch = !search || 
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(search.toLowerCase()) ||
        log.userName.toLowerCase().includes(search.toLowerCase());
      return matchUser && matchEntity && matchSearch;
    });
  }, [userFilter, entityFilter, search]);

  const columns = [
    { key: 'timestamp', header: 'Timestamp', width: '160px', render: (row) => (
      <span className="font-mono text-xs text-gray-700">{row.timestamp}</span>
    )},
    { key: 'userName', header: 'User', width: '160px', render: (row) => (
      <span className="font-medium text-gray-900">{row.userName}</span>
    )},
    { key: 'action', header: 'Action', width: '180px', render: (row) => (
      <Badge variant="primary">{row.action}</Badge>
    )},
    { key: 'entityType', header: 'Entity Type', width: '140px', render: (row) => (
      <Badge variant="gray">{row.entityType}</Badge>
    )},
    { key: 'entityId', header: 'Entity ID', width: '120px', render: (row) => (
      <span className="font-mono text-xs text-gray-600">{row.entityId}</span>
    )},
    { key: 'details', header: 'Details', width: '280px', render: (row) => (
      <details className="cursor-pointer text-xs">
        <summary className="text-accent-600 font-medium hover:underline">
          View JSON Payload
        </summary>
        <pre className="mt-2 p-2 bg-cream text-gray-800 rounded-lg text-[11px] overflow-x-auto max-w-sm">
          {JSON.stringify(row.details, null, 2)}
        </pre>
      </details>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="audit-log-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Audit Log' },
      ]} />

      <PageHeader
        title="Audit Log"
        subtitle="Read-only chronological trail of system operations, status changes, and payroll actions"
      />

      <div className="filter-bar">
        <Input
          placeholder="Search by action, ID, user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          label="User"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          options={users.map(u => ({ value: u, label: u === 'all' ? 'All Users' : u }))}
          className="w-48"
        />
        <Select
          label="Entity Type"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          options={entityTypes.map(t => ({ value: t, label: t === 'all' ? 'All Entity Types' : t }))}
          className="w-48"
        />
        {(userFilter !== 'all' || entityFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setUserFilter('all'); setEntityFilter('all'); setSearch(''); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={columns}
            data={filteredLogs}
            keyField="id"
            emptyMessage="No audit log entries found matching filters"
          />
        </CardBody>
      </Card>
    </div>
  );
}
