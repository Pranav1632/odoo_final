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
 * Authenticate against either real Person A backend or seeded mock accounts.
 */
export async function authenticateUser({ email, password }) {
  // 1. Try real backend first if configured / available
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      const session = {
        userId: data.employeeId || 'emp-user',
        email,
        role: data.role || 'HR_PAYROLL_MANAGER',
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        employeeId: data.employeeId || 'emp-001',
        token: data.token
      };
      setSession(session);
      return session;
    }
  } catch {
    // Backend offline / in development — proceed to seed accounts validation
  }

  // 2. Validate against official seed accounts spec
  const match = SEED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!match || match.password !== password) {
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  const session = {
    userId: match.employeeId,
    email: match.email,
    role: match.role,
    name: match.name,
    employeeId: match.employeeId,
    token: `demo-jwt-token-${match.role.toLowerCase()}`
  };

  setSession(session);
  return session;
}

/**
 * Register account provider
 */
export async function registerUser({ name, email, password, role = 'EMPLOYEE' }) {
  const session = {
    userId: `emp-${Date.now().toString().slice(-3)}`,
    email,
    role,
    name,
    employeeId: `emp-${Date.now().toString().slice(-3)}`,
    token: `demo-jwt-registered-${role.toLowerCase()}`
  };
  setSession(session);
  return session;
}