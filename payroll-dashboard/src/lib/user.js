// src/lib/user.js
// Authentication & Session provider for PeoplePay360
// Supports real JWT login / registration from Person A's backend (POST /api/auth/login)
// With fallback demo seed accounts for easy review and testing.

export const SEED_USERS = [
  {
    role: 'ADMIN',
    email: 'admin@peoplepay360.com',
    password: 'Admin@123',
    name: 'Administrator',
    description: 'Full system & error log access',
    employeeId: 'emp-003'
  },
  {
    role: 'HR_PAYROLL_MANAGER',
    email: 'payroll.manager@peoplepay360.com',
    password: 'Manager@123',
    name: 'Emily Rodriguez',
    description: 'Full HR & Payroll Lifecycle (Approve, Compute, Validate)',
    employeeId: 'emp-003'
  },
  {
    role: 'HR_PAYROLL_USER',
    email: 'payroll.user@peoplepay360.com',
    password: 'User@123',
    name: 'David Kim',
    description: 'Payroll processing & payslip generation',
    employeeId: 'emp-002'
  },
  {
    role: 'HR_MANAGER',
    email: 'hr.manager@peoplepay360.com',
    password: 'Hr@123',
    name: 'Lisa Wang',
    description: 'Core HR, Contracts & Leave Approvals',
    employeeId: 'emp-005'
  },
  {
    role: 'EMPLOYEE',
    email: 'emp1@peoplepay360.com',
    password: 'Emp@123',
    name: 'Sarah Chen',
    description: 'Self-service (Own Attendance, Time Off, Payslips)',
    employeeId: 'emp-001'
  }
];

const STORAGE_KEY = 'pp360_session';

/**
 * Returns currently authenticated user session, or null if logged out.
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persists session after login or registration.
 */
export function setSession(sessionData) {
  if (!sessionData) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    if (sessionData.token) {
      localStorage.setItem('token', sessionData.token);
    }
  }
}

/**
 * Logs out the active user and clears local session.
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('token');
}

/**
 * Authenticate against real backend (POST /api/auth/login).
 */
export async function authenticateUser({ email, password }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Invalid email or password');
    }

    const session = {
      userId: data.userId || data.employeeId || 'emp-user',
      email: data.email || email,
      role: data.role || 'EMPLOYEE',
      name: data.name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      employeeId: data.employeeId || null,
      token: data.token
    };

    setSession(session);
    return session;
  } catch (err) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    throw new Error('Could not connect to backend server at ' + API_BASE_URL + '. Ensure the API server is running.');
  }
}

/**
 * Register account with real backend (POST /api/auth/register).
 *
 * Self-registered accounts always land as 'pending' — they cannot log in until
 * an Admin/HR approves them (see UserManagement.jsx). This returns
 * { pending: true, message } in that case instead of a session; there is
 * currently no server-side path that returns a token from register.
 */
export async function registerUser({ name, email, password }) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Failed to create account');
    }

    if (data.pending || !data.token) {
      return { pending: true, message: data.message || 'Registration submitted. Awaiting approval.' };
    }

    const session = {
      userId: data.userId || data.employeeId || 'emp-user',
      email: data.email || email,
      role: data.role || 'EMPLOYEE',
      name: data.name || name,
      employeeId: data.employeeId || null,
      token: data.token
    };

    setSession(session);
    return session;
  } catch (err) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    throw new Error('Could not connect to backend server at ' + API_BASE_URL + '. Ensure the API server is running.');
  }
}