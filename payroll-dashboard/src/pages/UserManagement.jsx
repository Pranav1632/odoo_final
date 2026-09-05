// src/pages/UserManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, PageHeader, Button, Badge, Select, Breadcrumb } from '../components/UI';
import { usersApi } from '../lib/api';
import { getSession } from '../lib/user';

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'HR_PAYROLL_USER', label: 'HR Payroll User' },
  { value: 'HR_PAYROLL_MANAGER', label: 'HR Payroll Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

function statusVariant(status) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'gray'; // disabled
}

export function UserManagement() {
  const session = getSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    usersApi.getAll()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const pendingUsers = useMemo(() => users.filter(u => u.status === 'pending'), [users]);
  const otherUsers = useMemo(() => users.filter(u => u.status !== 'pending'), [users]);

  const handleUpdate = async (id, data) => {
    setActioningId(id);
    setError(null);
    try {
      const updated = await usersApi.update(id, data);
      setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setActioningId(null);
    }
  };

  const renderRow = (u) => (
    <div key={u.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold text-gray-900 text-sm">{u.employee?.name || u.email}</p>
        <p className="text-xs text-gray-500 font-mono">{u.email}</p>
      </div>
      <div className="w-40">
        <Select
          value={u.role}
          onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
          options={ROLE_OPTIONS}
          disabled={actioningId === u.id || u.id === session?.userId}
        />
      </div>
      <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
      <div className="flex items-center gap-2">
        {u.status === 'pending' && (
          <Button
            variant="primary"
            size="sm"
            loading={actioningId === u.id}
            onClick={() => handleUpdate(u.id, { status: 'active' })}
          >
            Approve
          </Button>
        )}
        {u.status === 'active' && u.id !== session?.userId && (
          <Button
            variant="ghost"
            size="sm"
            loading={actioningId === u.id}
            onClick={() => handleUpdate(u.id, { status: 'disabled' })}
          >
            Disable
          </Button>
        )}
        {u.status === 'disabled' && (
          <Button
            variant="ghost"
            size="sm"
            loading={actioningId === u.id}
            onClick={() => handleUpdate(u.id, { status: 'active' })}
          >
            Re-enable
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="user-management-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'User Management' },
      ]} />

      <PageHeader
        title="User Management"
        subtitle="Approve pending registrations and assign roles"
        actions={<Button variant="ghost" size="sm" onClick={loadUsers}>Refresh</Button>}
      />

      {error && (
        <div className="badge-error rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Pending Approval ({pendingUsers.length})
            </h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading users…</p>
          ) : pendingUsers.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No accounts awaiting approval.</p>
          ) : (
            <div>{pendingUsers.map(renderRow)}</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            All Other Accounts ({otherUsers.length})
          </h3>
          {!loading && otherUsers.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No accounts yet.</p>
          ) : (
            <div>{otherUsers.map(renderRow)}</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
