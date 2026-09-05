// src/lib/formatters.js
// Common UI formatters and styling helpers for PeoplePay360

export const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getStatusColor = (status) => {
  if (!status) return 'gray';
  const s = String(status).toLowerCase();
  const colors = {
    active: 'success',
    inactive: 'gray',
    'on leave': 'warning',
    pending: 'warning',
    approved: 'success',
    refused: 'error',
    draft: 'gray',
    validated: 'info',
    paid: 'success',
    computed: 'primary',
    expired: 'gray',
    present: 'success',
    late: 'warning',
    absent: 'error',
    overtime: 'info',
    exception: 'warning',
  };
  return colors[s] || 'gray';
};

export const getStatusBadge = (status) => {
  const color = getStatusColor(status);
  return `badge-${color}`;
};

export const DEPARTMENTS = [
  { id: 'Engineering', name: 'Engineering' },
  { id: 'Marketing', name: 'Marketing' },
  { id: 'Human Resources', name: 'Human Resources' },
  { id: 'Operations', name: 'Operations' },
  { id: 'Finance', name: 'Finance' },
  { id: 'Sales', name: 'Sales' },
];

export const JOB_POSITIONS = [
  { id: 'Software Engineer', name: 'Software Engineer', departmentId: 'Engineering' },
  { id: 'Senior Software Engineer', name: 'Senior Software Engineer', departmentId: 'Engineering' },
  { id: 'Lead Software Engineer', name: 'Lead Software Engineer', departmentId: 'Engineering' },
  { id: 'Product Manager', name: 'Product Manager', departmentId: 'Engineering' },
  { id: 'UI/UX Designer', name: 'UI/UX Designer', departmentId: 'Engineering' },
  { id: 'Marketing Manager', name: 'Marketing Manager', departmentId: 'Marketing' },
  { id: 'Content Specialist', name: 'Content Specialist', departmentId: 'Marketing' },
  { id: 'HR Manager', name: 'HR Manager', departmentId: 'Human Resources' },
  { id: 'Recruiter', name: 'Recruiter', departmentId: 'Human Resources' },
  { id: 'Operations Manager', name: 'Operations Manager', departmentId: 'Operations' },
  { id: 'Finance Manager', name: 'Finance Manager', departmentId: 'Finance' },
  { id: 'Accountant', name: 'Accountant', departmentId: 'Finance' },
  { id: 'Sales Representative', name: 'Sales Representative', departmentId: 'Sales' },
  { id: 'Account Executive', name: 'Account Executive', departmentId: 'Sales' },
];
