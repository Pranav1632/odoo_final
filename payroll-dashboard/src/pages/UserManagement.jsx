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
        {['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(session?.role) && u.id !== session?.userId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setResetModalUser(u); setResetPasswordInput(''); setResetError(''); setResetSuccess(''); }}
          >
            🔑 Reset Pass
          </Button>
        )}
      </div>
    </div>
  );

  const [resetModalUser, setResetModalUser] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetting(true);
    setResetError('');
    setResetSuccess('');
    try {
      await usersApi.resetPassword(resetModalUser.id, resetPasswordInput);
      setResetSuccess(`Password for ${resetModalUser.email} has been reset successfully!`);
      setTimeout(() => setResetModalUser(null), 1500);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

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

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Reset Password for {resetModalUser.employee?.name || resetModalUser.email}
            </h3>

            {resetError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="p-2.5 bg-green-50 text-green-700 text-xs font-medium rounded-xl border border-green-200">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">New Temporary Password</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-accent-500 font-mono"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setResetModalUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={resetting}>
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
