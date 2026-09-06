// src/pages/EmployeeView.jsx
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Avatar, Breadcrumb, Modal 
} from '../components/UI';
import { formatDate, getStatusColor } from '../lib/formatters';
import { employeesApi } from '../lib/api';

export function EmployeeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contracts');
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    employeesApi.getById(id)
      .then((data) => {
        if (!isMounted) return;
        setEmployee(data);
      })
      .catch((err) => {
        console.error('Failed to load employee:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [id]);

  const handleDeactivate = async () => {
    try {
      await employeesApi.update(id, { status: 'inactive' });
      setEmployee(prev => prev ? { ...prev, status: 'inactive' } : prev);
    } catch (err) {
      console.error('Failed to deactivate employee:', err);
    }
    setDeactivateModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="employee-view-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Employees', href: '/employees' },
          { label: 'Loading...' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading employee details...
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Employees', href: '/employees' },
          { label: 'Not Found' },
        ]} />
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Employee not found</h2>
          <p className="text-gray-500 mt-2">The employee you're looking for doesn't exist.</p>
          <Button variant="primary" onClick={() => navigate('/employees')} className="mt-4">Back to Employees</Button>
        </div>
      </div>
    );
  }

  const dept = employee.department || 'General';
  const position = employee.jobPosition || 'Staff';
  const schedule = employee.schedule?.name || 'Standard 40h';
  const mgr = employee.manager ? employee.manager.name : '—';

  const empContracts = employee.contracts || [];
  const empAllocations = employee.allocations || [];
  const empTimeOff = employee.timeOffRequests || [];
  const empAttendance = employee.attendances || [];

  // Counts for smart buttons — the API only returns the full `contracts` array plus
  // aggregate `_count` for the rest (attendances/timeOffRequests/allocations aren't
  // fetched in full here), so those three must come from _count, not array length.
  const counts = {
    contracts: employee._count?.contracts ?? empContracts.length,
    attendance: employee._count?.attendances ?? empAttendance.length,
    timeOff: employee._count?.timeOffRequests ?? empTimeOff.length,
    allocations: employee._count?.allocations ?? empAllocations.length,
  };

  return (
    <div className="space-y-6" data-testid="employee-view-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Employees', href: '/employees' },
        { label: employee.name || employee.fullName },
      ]} />

      <PageHeader
        title={employee.name || employee.fullName}
        subtitle={`${employee.department || dept} · ${employee.jobPosition || position} · ${employee.id}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>Edit Profile</Button>
            <Button variant="danger" onClick={() => setDeactivateModal(true)}>Deactivate</Button>
          </div>
        }
      />

      {/* Task 4 Smart Buttons: Navigate to filtered modules with count */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-2xl shadow-soft border border-black/[0.04]" data-testid="employee-smart-buttons">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/contracts?employeeId=${id}`)}
          className="gap-2"
        >
          📄 Contracts <Badge variant="primary" size="sm">({counts.contracts})</Badge>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/attendance?employeeId=${id}`)}
          className="gap-2"
        >
          ⏱️ Attendance <Badge variant="primary" size="sm">({counts.attendance})</Badge>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/time-off?employeeId=${id}`)}
          className="gap-2"
        >
          🌴 Time Off <Badge variant="primary" size="sm">({counts.timeOff})</Badge>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/time-off?tab=allocations&employeeId=${id}`)}
          className="gap-2"
        >
          📊 Allocations <Badge variant="primary" size="sm">({counts.allocations})</Badge>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Personal & Work Identity</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Work Email</p>
                <p className="font-medium text-gray-900">{employee.workEmail || employee.user?.email || `${(employee.name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Phone</p>
                <p className="font-medium text-gray-900">{employee.workPhone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{employee.department || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Position</p>
                <p className="font-medium text-gray-900">{employee.jobPosition || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Working Schedule</p>
                <p className="font-medium text-gray-900">{schedule}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Direct Manager</p>
                <p className="font-medium text-gray-900">{mgr}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Employment Status</p>
                <Badge variant={getStatusColor(employee.status === 'active' ? 'Active' : 'Inactive')} className="mt-1">
                  {employee.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Employment Type</p>
                <p className="font-medium text-gray-900">{employee.employmentType || 'Full-time'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">{employee.hireDate ? formatDate(employee.hireDate) : '—'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Bank Account & Payment Details</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{employee.bankName || 'Not Provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-mono font-medium text-gray-900">{employee.bankAccountNumber || employee.accountNumber || 'Not Provided'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">Bank Transfer</p>
              </div>
            </CardBody>
          </Card>

          {/* Section: Contracts with zero contracts safety */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Employment Contracts</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts?employeeId=${id}`)}>View All →</Button>
            </CardHeader>
            <CardBody className="p-4">
              {empContracts.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  No contracts yet. <Button variant="link" size="sm" onClick={() => navigate('/contracts/new')}>Create one →</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {empContracts.map(c => (
                    <div key={c.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-gray-900 text-sm">{c.id}</span>
                        <p className="text-xs text-gray-500">{formatDate(c.startDate)} to {c.endDate ? formatDate(c.endDate) : 'Permanent'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-gray-900 text-sm">₹{Number(c.wage || c.wageAmount || 0).toLocaleString('en-IN')}</span>
                        <Badge variant={getStatusColor(c.status || 'Active')}>{c.status || 'Active'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardBody className="p-6 text-center">
              <Avatar name={employee.name || employee.fullName} size="xl" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">{employee.name || employee.fullName}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{employee.id}</p>
              <Badge variant={getStatusColor(employee.status === 'active' ? 'Active' : 'Inactive')} className="mt-3">
                {employee.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={deactivateModal}
        onClose={() => setDeactivateModal(false)}
        title="Deactivate Employee"
        size="sm"
      >
        <p className="text-gray-600 text-sm">Are you sure you want to deactivate {employee.name || employee.fullName}? This will set their employment status to Inactive.</p>
        <div className="modal-footer pt-4">
          <Button variant="secondary" onClick={() => setDeactivateModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeactivate}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  );
}