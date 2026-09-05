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

const MOCK_ERROR_LOGS = [
  {
    id: 'err-001',
    timestamp: '2026-08-15 14:30:12',
    endpoint: '/api/payruns/pr-001/compute',
    statusCode: 400,
    message: 'Rule HRA: formula produced non-finite value',
    userId: 'emp-003',
    stack: 'Error: Cannot divide by zero at computeSalaryRules (computeRules.ts:104)'
  },
  {
    id: 'err-002',
    timestamp: '2026-08-14 09:12:44',
    endpoint: '/api/timeoff/requests/tor-002/approve',
    statusCode: 400,
    message: 'Insufficient balance. Requested 5, remaining 2',
    userId: 'emp-003',
    stack: 'ApiError: Insufficient balance at PATCH /api/timeoff/requests/:id/approve'
  },
  {
    id: 'err-003',
    timestamp: '2026-08-12 18:22:01',
    endpoint: '/api/contracts',
    statusCode: 409,
    message: 'Employee already has an active contract. Expire the existing one first.',
    userId: 'emp-005',
    stack: 'ApiError: Duplicate active contract conflict'
  }
];

export function AuditLog() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'error'
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

  const filteredErrorLogs = useMemo(() => {
    return MOCK_ERROR_LOGS.filter(err => {
      return !search || 
        err.endpoint.toLowerCase().includes(search.toLowerCase()) ||
        err.message.toLowerCase().includes(search.toLowerCase());
    });
  }, [search]);

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

  const errorColumns = [
    { key: 'timestamp', header: 'Timestamp', width: '160px', render: (row) => (
      <span className="font-mono text-xs text-gray-700">{row.timestamp}</span>
    )},
    { key: 'statusCode', header: 'Status', width: '100px', render: (row) => (
      <Badge variant={row.statusCode >= 500 ? 'error' : 'warning'}>{row.statusCode}</Badge>
    )},
    { key: 'endpoint', header: 'Endpoint', width: '220px', render: (row) => (
      <span className="font-mono text-xs text-ink-900 font-semibold">{row.endpoint}</span>
    )},
    { key: 'message', header: 'Error Message', width: '260px', render: (row) => (
      <span className="text-xs text-red-700 font-medium">{row.message}</span>
    )},
    { key: 'stack', header: 'Stack / Trace', width: '260px', render: (row) => (
      <details className="cursor-pointer text-xs">
        <summary className="text-gray-500 font-medium hover:underline">
          View Stack Trace
        </summary>
        <pre className="mt-2 p-2 bg-red-50 text-red-900 rounded-lg text-[10px] overflow-x-auto max-w-sm font-mono">
          {row.stack}
        </pre>
      </details>
    )},
  ];

  return (
    <div className="space-y-6" data-testid="audit-log-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'System Logs' },
      ]} />

      <PageHeader
        title="System Logs"
        subtitle="Read-only chronological trail of system operations, status changes, and runtime error logs"
      />

      {/* Mode Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          📋 Audit Trail ({MOCK_AUDIT_LOGS.length})
        </button>
        <button
          onClick={() => setActiveTab('error')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'error'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          ⚠️ Error Log ({MOCK_ERROR_LOGS.length})
        </button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder={activeTab === 'audit' ? "Search by action, ID, user..." : "Search error message or endpoint..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        {activeTab === 'audit' && (
          <>
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
          </>
        )}
        {(userFilter !== 'all' || entityFilter !== 'all' || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setUserFilter('all'); setEntityFilter('all'); setSearch(''); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <Table
            columns={activeTab === 'audit' ? columns : errorColumns}
            data={activeTab === 'audit' ? filteredLogs : filteredErrorLogs}
            keyField="id"
            emptyMessage={activeTab === 'audit' ? "No audit log entries found" : "No system errors logged"}
          />
        </CardBody>
      </Card>
    </div>
  );
}
