import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, CardHeader, CardBody, PageHeader, Button, Input, Select, Badge, Avatar, Modal, Breadcrumb 
} from '../components/UI';
import { 
  DEPARTMENTS as departments, JOB_POSITIONS as jobPositions, getInitials 
} from '../lib/formatters';
import { employeesApi, schedulesApi } from '../lib/api';

const employmentStatusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' },
];

const employmentTypeOptions = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
];

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const paymentMethodOptions = [
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
];

const initialFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  personalEmail: '',
  phone: '',
  address: '',
  departmentId: '',
  jobPositionId: '',
  managerId: '',
  scheduleId: '',
  employmentStatus: 'Active',
  employmentType: 'Full-time',
  startDate: '',
  endDate: '',
  workEmail: '',
  workPhone: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  paymentMethod: 'Bank Transfer',
};

export function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [formData, setFormData] = useState(initialFormData);
  const [employee, setEmployee] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [scheduleList, setScheduleList] = useState([]);
  const [managerList, setManagerList] = useState([]);

  useEffect(() => {
    schedulesApi.getAll()
      .then(data => { if (Array.isArray(data)) setScheduleList(data); })
      .catch(() => {});

    employeesApi.getAll()
      .then(data => { if (Array.isArray(data)) setManagerList(data); })
      .catch(() => {});

    if (isEdit) {
      setLoading(true);
      employeesApi.getById(id)
        .then(emp => {
          if (emp) {
            setEmployee(emp);
            setFormData({
              fullName: emp.name || '',
              dateOfBirth: '1995-01-01',
              gender: 'Male',
              personalEmail: `${(emp.name || 'user').toLowerCase().replace(/\s+/g, '.')}@personal.com`,
              phone: '+1-555-0199',
              address: '123 Main St, City, ST',
              departmentId: emp.department || 'Engineering',
              jobPositionId: emp.jobPosition || 'Developer',
              managerId: emp.managerId || '',
              scheduleId: emp.scheduleId || '',
              employmentStatus: emp.status === 'active' ? 'Active' : 'Inactive',
              employmentType: emp.employmentType || 'Full-time',
              startDate: emp.hireDate?.split('T')[0] || new Date().toISOString().split('T')[0],
              endDate: '',
              workEmail: `${(emp.name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`,
              workPhone: '+1-555-0199',
              bankName: 'HDFC Bank',
              accountNumber: emp.bankAccountNumber || '',
              ifscCode: 'HDFC0001234',
              accountHolderName: emp.name || '',
              paymentMethod: 'Bank Transfer',
            });
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, startDate: today, departmentId: 'Engineering', jobPositionId: 'Developer' }));
    }
  }, [id, isEdit]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    else if (formData.fullName.length < 2) newErrors.fullName = 'Full name must be at least 2 characters';
    if (!formData.departmentId) newErrors.departmentId = 'Department is required';
    if (!formData.jobPositionId) newErrors.jobPositionId = 'Job position is required';
    if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.workEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      newErrors.workEmail = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.fullName,
        department: formData.departmentId,
        jobPosition: formData.jobPositionId,
        scheduleId: formData.scheduleId || undefined,
        managerId: formData.managerId || undefined,
        bankAccountNumber: formData.accountNumber || undefined,
        status: formData.employmentStatus === 'Active' ? 'active' : 'inactive',
        employmentType: formData.employmentType,
        hireDate: formData.startDate || undefined,
      };
      if (isEdit) {
        await employeesApi.update(id, payload);
        navigate(`/employees/${id}`, { replace: true });
      } else {
        const created = await employeesApi.create(payload);
        navigate(`/employees/${created.id || ''}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to save employee:', err);
      setErrors(prev => ({ ...prev, form: err.message || 'Failed to save employee' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    navigate(-1);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => setAvatarPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const filteredManagers = managerList.filter(e => e.id !== id && e.status === 'active');
  const filteredPositions = jobPositions.filter(p => p.departmentId === formData.departmentId);
  
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Employees', href: '/employees' },
    { label: isEdit ? 'Edit Employee' : 'New Employee' },
  ];
  
  return (
    <div className="space-y-6" data-testid="employee-form-page">
      <Breadcrumb items={breadcrumbs} />
      
      <PageHeader
        title={isEdit ? `Edit Employee: ${employee?.name || ''}` : 'New Employee'}
        subtitle={isEdit ? `Employee ID: ${employee?.id || ''}` : 'Create a new employee record'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDiscard}>Discard</Button>
            <Button variant="primary" type="submit" form="employee-form" loading={loading}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      />
      
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar name={formData.fullName || 'Employee'} size="xl" src={avatarPreview} className="mb-2" />
                    <label className="absolute bottom-0 right-0 btn-primary p-2 rounded-full cursor-pointer" aria-label="Upload avatar">
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" data-testid="employee-form-avatar-upload" />
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </label>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name *"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="John Doe"
                      error={errors.fullName}
                      data-testid="employee-form-name"
                      required
                    />
                    <Input
                      label="Employee ID"
                      value={isEdit ? (employee?.id || '') : 'EMP-AUTO'}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <Select
                      label="Gender"
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      options={[{value:'',label:'Select gender'},...genderOptions]}
                    />
                    <Input
                      label="Personal Email"
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => handleChange('personalEmail', e.target.value)}
                      placeholder="john@personal.com"
                    />
                    <Input
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1-555-0100"
                    />
                    <div className="sm:col-span-2">
                      <label className="label">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        rows={3}
                        className="input resize-none"
                        placeholder="123 Main St, City, State ZIP"
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Work Information</h3>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Department *"
                    value={formData.departmentId}
                    onChange={(e) => { handleChange('departmentId', e.target.value); handleChange('jobPositionId', ''); }}
                    options={[{value:'',label:'Select department'},...departments.map(d=>({value:d.id,label:d.name}))]}
                    error={errors.departmentId}
                    data-testid="employee-form-department"
                    required
                  />
                  <Select
                    label="Job Position *"
                    value={formData.jobPositionId}
                    onChange={(e) => handleChange('jobPositionId', e.target.value)}
                    options={[{value:'',label:'Select position'},...filteredPositions.map(p=>({value:p.id,label:p.name}))]}
                    error={errors.jobPositionId}
                    data-testid="employee-form-position"
                    required
                    disabled={!formData.departmentId}
                  />
                  <Select
                    label="Manager"
                    value={formData.managerId}
                    onChange={(e) => handleChange('managerId', e.target.value)}
                    options={[{value:'',label:'No manager'},...filteredManagers.map(m=>({value:m.id,label:m.name}))]}
                    data-testid="employee-form-manager"
                  />
                  <Select
                    label="Working Schedule *"
                    value={formData.scheduleId}
                    onChange={(e) => handleChange('scheduleId', e.target.value)}
                    options={[{value:'',label:'Select schedule'},...scheduleList.map(s=>({value:s.id,label:s.name}))]}
                    error={errors.scheduleId}
                    data-testid="employee-form-schedule"
                    required
                  />
                  <Select
                    label="Employment Status *"
                    value={formData.employmentStatus}
                    onChange={(e) => handleChange('employmentStatus', e.target.value)}
                    options={employmentStatusOptions}
                    error={errors.employmentStatus}
                    required
                  />
                  <Select
                    label="Employment Type"
                    value={formData.employmentType}
                    onChange={(e) => handleChange('employmentType', e.target.value)}
                    options={employmentTypeOptions}
                  />
                  <Input
                    label="Start Date *"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    error={errors.startDate}
                    required
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    placeholder="Leave empty for permanent"
                  />
                  <Input
                    label="Work Email"
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => handleChange('workEmail', e.target.value)}
                    placeholder="john@company.com"
                    error={errors.workEmail}
                    data-testid="employee-form-work-email"
                  />
                  <Input
                    label="Work Phone"
                    value={formData.workPhone}
                    onChange={(e) => handleChange('workPhone', e.target.value)}
                    placeholder="+1-555-1000"
                  />
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank & Payment Details</h3>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="Chase Bank"
                  />
                  <Input
                    label="Account Number"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    placeholder="1234567890"
                    error={errors.accountNumber}
                    data-testid="employee-form-bank-account"
                  />
                  <Input
                    label="IFSC / Routing Code"
                    value={formData.ifscCode}
                    onChange={(e) => handleChange('ifscCode', e.target.value)}
                    placeholder="CHASUS33"
                  />
                  <Input
                    label="Account Holder Name"
                    value={formData.accountHolderName}
                    onChange={(e) => handleChange('accountHolderName', e.target.value)}
                    placeholder="John Doe"
                  />
                  <Select
                    label="Payment Method"
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                    options={paymentMethodOptions}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
          
          <div className="space-y-6" data-testid="employee-form-sidebar">
            {isEdit && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Active Since: <span className="font-medium text-gray-900 dark:text-white">
                      {employee?.hireDate ? formatDate(employee.hireDate) : 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Contracts', count: employee?._count?.contracts, href: `/contracts?employee=${id}`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                      { label: 'Attendance', count: employee?._count?.attendances, href: `/attendance?employee=${id}`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { label: 'Time Off', count: employee?._count?.timeOffRequests, href: `/time-off?employee=${id}`, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                      { label: 'Allocations', count: employee?._count?.allocations, href: `/time-off/allocations?employee=${id}`, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                    ].map((stat, index) => (
                      <a key={index} href={stat.href} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-primary-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent-50 text-accent-600 rounded-lg dark:bg-accent-900/30 dark:text-accent-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon}/></svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.label}</span>
                        </div>
                        <Badge variant="primary">{stat.count}</Badge>
                      </a>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
            
            {isEdit && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {[
                      { action: 'Contract updated', time: '2 days ago', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'accent' },
                      { action: 'Time off approved', time: '5 days ago', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'success' },
                      { action: 'Salary structure changed', time: '1 week ago', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'warning' },
                      { action: 'Bank details updated', time: '2 weeks ago', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'info' },
                      { action: 'Profile created', time: '3 weeks ago', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'gray' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className={`p-1.5 bg-${activity.color}-50 text-${activity.color}-600 rounded dark:bg-${activity.color}-900/30 dark:text-${activity.color}-400`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={activity.icon}/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{activity.action}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white dark:bg-primary-800 border-t border-gray-100 dark:border-primary-700 p-4 flex items-center justify-end gap-2" data-testid="employee-form-actions">
          <Button type="button" variant="secondary" onClick={handleDiscard}>Discard</Button>
          <Button type="button" variant="secondary" onClick={() => { validate(); }}>Save Draft</Button>
          <Button type="submit" variant="primary" loading={loading} data-testid="employee-form-submit">
            {isEdit ? 'Save' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}