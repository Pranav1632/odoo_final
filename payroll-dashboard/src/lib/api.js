// src/lib/api.js
// Central API Client for PeoplePay360
// Connects to Person A (Core HR, Auth, System Logs) & Person B (Payroll Engine, Payruns, Payslips)
// When Person A and B Express backend is running (e.g., http://localhost:5000/api),
// this client automatically routes requests, attaches JWT tokens, and handles responses/errors cleanly.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic request wrapper supporting Token authentication, JSON bodies, and file downloads.
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle Blob/Binary responses (PDFs, Excel sheets from Person B)
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats'))) {
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

// ==========================================
// PERSON A: Core HR, Auth & System Logs
// ==========================================

export const authApi = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
};

export const employeesApi = {
  getAll: (params = '') => apiRequest(`/employees${params ? `?${params}` : ''}`),
  getById: (id) => apiRequest(`/employees/${id}`),
  create: (data) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
};

export const contractsApi = {
  getAll: (params = '') => apiRequest(`/contracts${params ? `?${params}` : ''}`),
  getById: (id) => apiRequest(`/contracts/${id}`),
  create: (data) => apiRequest('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/contracts/${id}`, { method: 'DELETE' }),
};

export const schedulesApi = {
  getAll: () => apiRequest('/schedules'),
  getById: (id) => apiRequest(`/schedules/${id}`),
  create: (data) => apiRequest('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/schedules/${id}`, { method: 'DELETE' }),
};

export const attendanceApi = {
  getAll: (params = '') => apiRequest(`/attendance${params ? `?${params}` : ''}`),
  getById: (id) => apiRequest(`/attendance/${id}`),
  checkIn: (data) => apiRequest('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/attendance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/attendance/${id}`, { method: 'DELETE' }),
};

export const timeoffApi = {
  getTypes: () => apiRequest('/timeoff/types'),
  createType: (data) => apiRequest('/timeoff/types', { method: 'POST', body: JSON.stringify(data) }),
  getAllocations: (params = '') => apiRequest(`/timeoff/allocations${params ? `?${params}` : ''}`),
  createAllocation: (data) => apiRequest('/timeoff/allocations', { method: 'POST', body: JSON.stringify(data) }),
  getRequests: (params = '') => apiRequest(`/timeoff/requests${params ? `?${params}` : ''}`),
  createRequest: (data) => apiRequest('/timeoff/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveRequest: (id) => apiRequest(`/timeoff/requests/${id}/approve`, { method: 'PATCH' }),
  refuseRequest: (id) => apiRequest(`/timeoff/requests/${id}/refuse`, { method: 'PATCH' }),
};

export const systemLogsApi = {
  getAuditLogs: (params = '') => apiRequest(`/audit-log${params ? `?${params}` : ''}`),
  getErrorLogs: (params = '') => apiRequest(`/error-log${params ? `?${params}` : ''}`),
};

// ==========================================
// PERSON B: Payroll Engine, Payruns & Payslips
// ==========================================

export const salaryStructuresApi = {
  getAll: () => apiRequest('/salary-structures'),
  getById: (id) => apiRequest(`/salary-structures/${id}`),
  create: (data) => apiRequest('/salary-structures', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/salary-structures/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/salary-structures/${id}`, { method: 'DELETE' }),
};

export const salaryRulesApi = {
  getAll: () => apiRequest('/salary-rules'),
  getById: (id) => apiRequest(`/salary-rules/${id}`),
  create: (data) => apiRequest('/salary-rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/salary-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/salary-rules/${id}`, { method: 'DELETE' }),
};

export const payrunsApi = {
  getAll: (params = '') => apiRequest(`/payruns${params ? `?${params}` : ''}`),
  getById: (id) => apiRequest(`/payruns/${id}`),
  create: (data) => apiRequest('/payruns', { method: 'POST', body: JSON.stringify(data) }),
  getEligibleEmployees: (id) => apiRequest(`/payruns/${id}/eligible-employees`),
  attachEmployees: (id, employeeIds) => apiRequest(`/payruns/${id}/employees`, { method: 'POST', body: JSON.stringify({ employeeIds }) }),
  compute: (id) => apiRequest(`/payruns/${id}/compute`, { method: 'POST' }),
  validate: (id) => apiRequest(`/payruns/${id}/validate`, { method: 'POST' }),
  markPaid: (id) => apiRequest(`/payruns/${id}/mark-paid`, { method: 'POST' }),
  sendPayslips: (id) => apiRequest(`/payruns/${id}/send-payslips`, { method: 'POST' }),
};

export const payslipsApi = {
  getAll: (params = '') => apiRequest(`/payslips${params ? `?${params}` : ''}`),
  getById: (id) => apiRequest(`/payslips/${id}`),
  downloadPdf: (id) => apiRequest(`/payslips/${id}/pdf`),
  exportExcel: (payrunId) => apiRequest(`/payslips/export-excel?payrunId=${payrunId}`),
};

export default {
  auth: authApi,
  employees: employeesApi,
  contracts: contractsApi,
  schedules: schedulesApi,
  attendance: attendanceApi,
  timeoff: timeoffApi,
  logs: systemLogsApi,
  salaryStructures: salaryStructuresApi,
  salaryRules: salaryRulesApi,
  payruns: payrunsApi,
  payslips: payslipsApi,
};
