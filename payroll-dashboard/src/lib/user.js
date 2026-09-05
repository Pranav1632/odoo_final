// src/lib/user.js — minimal current-user provider (replaces mock auth)
// No auth, no localStorage, no JWT. Just the user the app runs as.

export function getSession() {
  return {
    userId: 'emp-003',
    email: 'emily.rodriguez@company.com',
    role: 'HR_PAYROLL_MANAGER',
    name: 'Emily Rodriguez',
    employeeId: 'emp-003'
  };
}