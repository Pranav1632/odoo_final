// src/pages/AuditLog.jsx
import { useState, useMemo, useEffect } from 'react';
import { 
  Card, CardBody, PageHeader, Button, Badge, Input, Select, Table, Breadcrumb 
} from '../components/UI';
import { systemLogsApi } from '../lib/api';

export function AuditLog() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'error'
  const [userFilter, setUserFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [errorLogsList, setErrorLogsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      systemLogsApi.getAuditLogs().catch(() => ({ data: [] })),
      systemLogsApi.getErrorLogs().catch(() => ({ data: [] })),
    ]).then(([auditRes, errorRes]) => {
      if (!isMounted) return;
      const aLogs = auditRes.data || (Array.isArray(auditRes) ? auditRes : []);
      if (Array.isArray(aLogs)) {
        setAuditLogsList(aLogs.map(l => ({
          id: l.id,
          timestamp: l.createdAt ? new Date(l.createdAt).toLocaleString() : 'Recent',
          userName: l.userId || 'System',
          userId: l.userId,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          details: typeof l.details === 'string' ? JSON.parse(l.details || '{}') : (l.details || {}),
        })));
      }
      const eLogs = errorRes.data || (Array.isArray(errorRes) ? errorRes : []);
      if (Array.isArray(eLogs)) {
        setErrorLogsList(eLogs.map(e => ({
          id: e.id,
          timestamp: e.createdAt ? new Date(e.createdAt).toLocaleString() : 'Recent',
          endpoint: e.route,
          statusCode: 500,
          message: e.message,
          userId: e.userId || 'Unknown',
          stack: e.stack || '',
        })));
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const users = useMemo(() => {
    return ['all', ...Array.from(new Set(auditLogsList.map(l => l.userName).filter(Boolean)))];
  }, [auditLogsList]);

  const entityTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(auditLogsList.map(l => l.entityType).filter(Boolean)))];
  }, [auditLogsList]);

  const filteredLogs = useMemo(() => {
    return auditLogsList.filter(log => {
      const matchUser = userFilter === 'all' || log.userName === userFilter;
      const matchEntity = entityFilter === 'all' || log.entityType === entityFilter;
      const matchSearch = !search || 
        (log.userName && log.userName.toLowerCase().includes(search.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
        (log.entityType && log.entityType.toLowerCase().includes(search.toLowerCase())) ||
        (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));
      return matchUser && matchEntity && matchSearch;
    });
  }, [auditLogsList, userFilter, entityFilter, search]);

  const filteredErrors = useMemo(() => {
    return errorLogsList.filter(err => {
      const matchSearch = !search || 
        (err.endpoint && err.endpoint.toLowerCase().includes(search.toLowerCase())) ||
        (err.message && err.message.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [errorLogsList, search]);

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
          📋 Audit Trail ({auditLogsList.length})
        </button>
        <button
          onClick={() => setActiveTab('error')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'error'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          ⚠️ Error Log ({errorLogsList.length})
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
            data={activeTab === 'audit' ? filteredLogs : filteredErrors}
            keyField="id"
            emptyMessage={loading ? "Loading system logs..." : (activeTab === 'audit' ? "No audit log entries found" : "No system errors logged")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
