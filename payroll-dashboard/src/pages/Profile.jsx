// src/pages/Profile.jsx
import { useMemo } from 'react';
import { Card, CardHeader, CardBody, PageHeader, Badge, Avatar, Breadcrumb } from '../components/UI';
import { getSession } from '../lib/user';
import { employees, departments, jobPositions, schedules, formatDate } from '../data/mockData';

export function Profile() {
  const session = getSession();
  const employee = useMemo(() => {
    return employees.find(e => e.id === session?.employeeId) || {
      fullName: session?.name || 'Emily Rodriguez',
      workEmail: session?.email || 'emily.rodriguez@company.com',
      employeeId: 'EMP-000003',
      employmentStatus: 'Active',
      employmentType: 'Full-time',
      startDate: '2020-03-01',
      departmentId: 'hr',
      jobPositionId: 'hr-mgr',
      phone: '+1-555-0103',
      address: '789 Pine Rd, San Francisco, CA',
      bankName: 'Silicon Valley Bank',
      accountNumber: '****9012'
    };
  }, [session]);

  const dept = departments.find(d => d.id === employee.departmentId);
  const position = jobPositions.find(p => p.id === employee.jobPositionId);
  const schedule = schedules.find(s => s.id === employee.scheduleId);

  return (
    <div className="space-y-6" data-testid="profile-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'My Profile' },
      ]} />

      <PageHeader
        title={employee.fullName}
        subtitle={`${position?.name || 'HR Manager'} · ${dept?.name || 'Human Resources'}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center p-6 space-y-4">
            <Avatar name={employee.fullName} size="xl" />
            <div>
              <h2 className="text-lg font-bold text-ink-900">{employee.fullName}</h2>
              <p className="text-sm text-gray-500">{employee.workEmail}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success" dot>{employee.employmentStatus || 'Active'}</Badge>
              <Badge variant="gray">{employee.employmentType || 'Full-time'}</Badge>
            </div>
            <div className="w-full pt-4 border-t border-gray-100 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee ID</span>
                <span className="font-semibold text-ink-900">{employee.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">System Role</span>
                <span className="font-semibold text-ink-900">{session?.role || 'HR_PAYROLL_MANAGER'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since</span>
                <span className="font-semibold text-ink-900">{formatDate(employee.startDate || '2020-03-01')}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-ink-900">Work Information</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium text-ink-900 mt-0.5">{dept?.name || 'Human Resources'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Position</p>
                <p className="font-medium text-ink-900 mt-0.5">{position?.name || 'HR Manager'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Schedule</p>
                <p className="font-medium text-ink-900 mt-0.5">{schedule?.name || 'Standard 40h'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Email</p>
                <p className="font-medium text-ink-900 mt-0.5">{employee.workEmail}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-ink-900">Personal & Payment Details</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-ink-900 mt-0.5">{employee.phone || '+1-555-0103'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium text-ink-900 mt-0.5">{employee.address || '789 Pine Rd, San Francisco, CA'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bank Name</p>
                <p className="font-medium text-ink-900 mt-0.5">{employee.bankName || 'Silicon Valley Bank'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-medium text-ink-900 mt-0.5">{employee.accountNumber || '****9012'}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
