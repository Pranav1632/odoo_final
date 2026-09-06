// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, PageHeader, Badge, Avatar, Breadcrumb } from '../components/UI';
import { getSession } from '../lib/user';
import { employeesApi } from '../lib/api';

export function Profile() {
  const session = getSession();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        if (session?.employeeId) {
          const data = await employeesApi.getById(session.employeeId);
          if (isMounted && data) setEmployee(data);
        } else {
          const all = await employeesApi.getAll();
          if (isMounted && Array.isArray(all) && all.length > 0) {
            setEmployee(all[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
    // getSession() returns a new object reference on every render, so depending on
    // `session` itself would re-run this effect (and its state updates) in a loop.
    // The fetch only actually depends on the employeeId it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.employeeId]);

  const fullName = employee?.name || session?.name || 'User';
  const email = session?.email || (employee?.name ? `${employee.name.toLowerCase().replace(/\s+/g, '.')}@peoplepay360.com` : 'user@peoplepay360.com');
  const department = employee?.department || 'Unassigned (Pending HR Setup)';
  const position = employee?.jobPosition || 'Unassigned (Pending HR Setup)';
  const schedule = employee?.schedule?.name || 'Unassigned (Pending HR Setup)';
  const bankAccount = employee?.bankAccountNumber ? employee.bankAccountNumber : 'Not Provided';

  if (loading) {
    return (
      <div className="space-y-6" data-testid="profile-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'My Profile' },
        ]} />
        <Card>
          <CardBody className="py-12 text-center text-gray-500">
            Loading profile details...
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="profile-page">
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'My Profile' },
      ]} />

      <PageHeader
        title={fullName}
        subtitle={`${position} · ${department}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center p-6 space-y-4">
            <Avatar name={fullName} size="xl" />
            <div>
              <h2 className="text-lg font-bold text-ink-900">{fullName}</h2>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success" dot>{employee?.status ? (employee.status.charAt(0).toUpperCase() + employee.status.slice(1)) : 'Active'}</Badge>
              <Badge variant="gray">Full-time</Badge>
            </div>
            <div className="w-full pt-4 border-t border-gray-100 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee ID</span>
                <span className="font-semibold text-ink-900">{employee?.id || 'EMP-ADMIN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">System Role</span>
                <span className="font-semibold text-ink-900">{session?.role || 'ADMIN'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since</span>
                <span className="font-semibold text-ink-900">{employee?.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'Jan 15, 2024'}</span>
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
                <p className="font-medium text-ink-900 mt-0.5">{department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Position</p>
                <p className="font-medium text-ink-900 mt-0.5">{position}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Schedule</p>
                <p className="font-medium text-ink-900 mt-0.5">{schedule}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Email</p>
                <p className="font-medium text-ink-900 mt-0.5">{email}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-ink-900">Personal & Payment Details</h3>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Bank Account Number</p>
                <p className="font-medium text-ink-900 mt-0.5">{bankAccount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Work Email</p>
                <p className="font-medium text-ink-900 mt-0.5">{email}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
