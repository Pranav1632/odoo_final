// src/pages/EmployeeView.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Badge, Avatar, Breadcrumb, Modal 
} from '../components/UI';
import { 
  employees, departments, jobPositions, schedules,
  contracts, timeOffTypes, allocations, timeOffRequests,
  attendance, formatDate, getStatusColor
} from '../data/mockData';

export function EmployeeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contracts');
  const [deactivateModal, setDeactivateModal] = useState(false);

  const employee = useMemo(() => {
    return employees.find(e => e.id === id);
  }, [id]);

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

  const dept = departments.find(d => d.id === employee.departmentId);
  const position = jobPositions.find(p => p.id === employee.jobPositionId);
  const schedule = schedules.find(s => s.id === employee.scheduleId);
  const mgr = employee.managerId ? employees.find(e => e.id === employee.managerId) : null;

  const empContracts = contracts.filter(c => c.employeeId === id);
  const empAllocations = allocations.filter(a => a.employeeId === id);
  const empTimeOff = timeOffRequests.filter(t => t.employeeId === id);
  const empAttendance = attendance.filter(a => a.employeeId === id);

  // Counts for smart buttons
  const counts = {
    contracts: empContracts.length,
    attendance: empAttendance.length,
    timeOff: empTimeOff.length,
    allocations: empAllocations.length,
  };

  const handleDeactivate = () => {
    setDeactivateModal(false);
    navigate('/employees');
  };

  return (
    <div className="space-y-6" data-testid="employee-view-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Employees', href: '/employees' },
        { label: employee.fullName },
      ]} />

      <PageHeader
        title={employee.fullName}
        subtitle={`${dept?.name || employee.departmentId} · ${position?.name || employee.jobPositionId} · ${employee.employeeId}`}
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
                <p className="font-medium text-gray-900">{employee.workEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Phone</p>
                <p className="font-medium text-gray-900">{employee.workPhone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-gray-900">{dept?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Position</p>
                <p className="font-medium text-gray-900">{position?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Working Schedule</p>
                <p className="font-medium text-gray-900">{schedule?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Direct Manager</p>
                <p className="font-medium text-gray-900">{mgr?.fullName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Employment Status</p>
                <Badge variant={getStatusColor(employee.employmentStatus)} className="mt-1">{employee.employmentStatus}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">{formatDate(employee.startDate)}</p>
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
                <p className="font-medium text-gray-900">{employee.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-mono font-medium text-gray-900">{employee.accountNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IFSC / Routing Code</p>
                <p className="font-medium text-gray-900">{employee.ifscCode || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">{employee.paymentMethod || 'Bank Transfer'}</p>
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
                        <span className="font-mono font-bold text-gray-900 text-sm">{c.contractId}</span>
                        <p className="text-xs text-gray-500">{formatDate(c.startDate)} to {c.endDate ? formatDate(c.endDate) : 'Permanent'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-gray-900 text-sm">₹{Number(c.wageAmount).toLocaleString('en-IN')}</span>
                        <Badge variant={getStatusColor(c.status)}>{c.status}</Badge>
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
              <Avatar name={employee.fullName} size="xl" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">{employee.fullName}</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{employee.employeeId}</p>
              <Badge variant={getStatusColor(employee.employmentStatus)} className="mt-3">{employee.employmentStatus}</Badge>
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
        <p className="text-gray-600 text-sm">Are you sure you want to deactivate {employee.fullName}? This will set their employment status to Inactive.</p>
        <div className="modal-footer pt-4">
          <Button variant="secondary" onClick={() => setDeactivateModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeactivate}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  );
}