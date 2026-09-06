// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Topbar, MobileNav } from './components/Topbar';
import { AuthPage } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { EmployeesList } from './pages/EmployeesList';
import { EmployeeForm } from './pages/EmployeeForm';
import { EmployeeView } from './pages/EmployeeView';
import { ContractsList } from './pages/ContractsList';
import { ContractForm } from './pages/ContractForm';
import { SchedulesList } from './pages/SchedulesList';
import { ScheduleForm } from './pages/ScheduleForm';
import { PayrunsList } from './pages/PayrunsList';
import { PayrunWizard } from './pages/PayrunWizard';
import { PayrunDetail } from './pages/PayrunDetail';
import { PayslipsList } from './pages/PayslipsList';
import { PayslipDetail } from './pages/PayslipDetail';
import { SalaryStructuresList } from './pages/SalaryStructuresList';
import { SalaryStructureForm } from './pages/SalaryStructureForm';
import { SalaryRuleForm } from './pages/SalaryRuleForm';
import { AttendanceList } from './pages/AttendanceList';
import { TimeOffList } from './pages/TimeOffList';
import { AuditLog } from './pages/AuditLog';
import { UserManagement } from './pages/UserManagement';
import { Profile } from './pages/Profile';
import { ToastContainer } from './components/ToastContainer';
import { Error401Page, Error403Page, Error404Page, Error500Page } from './pages/ErrorPages';
import { getSession, logout } from './lib/user';

function ProtectedRoute({ session, allowedRoles, onLogout, children }) {
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes('ALL') && !allowedRoles.includes(session.role)) {
    return <Error403Page session={session} onLogout={onLogout} />;
  }
  return children;
}

function Layout({ session, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  const currentPath = location.pathname;
  const userRole = session?.role || 'EMPLOYEE';

  // Tailored RBAC navigation items
  const sidebarItems = [
    { id: 'profile', label: 'My Profile', href: '/', roles: ['EMPLOYEE'], icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'dashboard', label: 'Reports', href: '/', roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'employees', label: 'Employees', href: '/employees', roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'contracts', label: userRole === 'EMPLOYEE' ? 'My Contract' : 'Contracts', href: '/contracts', roles: ['ALL'], icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'schedules', label: 'Schedules', href: '/schedules', roles: ['HR_MANAGER', 'ADMIN'], icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'attendance', label: userRole === 'EMPLOYEE' ? 'My Attendance' : 'Attendance', href: '/attendance', roles: ['ALL'], icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'timeoff', label: userRole === 'EMPLOYEE' ? 'My Time Off' : 'Time Off', href: '/time-off', roles: ['ALL'], icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'payroll', label: 'Payroll', href: '/payroll/payruns', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'payslips', label: userRole === 'EMPLOYEE' ? 'My Payslips' : 'Payslips', href: '/payslips', roles: ['ALL'], icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'structures', label: 'Salary Structures', href: '/salary-structures', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16' },
    { id: 'audit', label: 'System Logs', href: '/audit-log', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'users', label: 'User Management', href: '/users', roles: ['ADMIN'], icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  ].filter(item => item.roles.includes('ALL') || item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-paper">
      <Topbar 
        onNavigate={handleNavigate} 
        user={session}
        onToggleMobileNav={() => setMobileNavOpen(true)}
        onLogout={onLogout}
      />
      <MobileNav 
        currentPath={currentPath} 
        onNavigate={handleNavigate}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={session}
        onLogout={onLogout}
      />
      
      <div className="pt-14 min-h-screen">
        <div className="flex">
          <aside 
            className={`fixed top-24 bottom-6 left-4 z-40 transition-all duration-300 hidden lg:block ${
              sidebarCollapsed ? 'w-16' : 'w-60'
            }`} 
            aria-label="Sidebar navigation"
          >
            <div className="flex flex-col h-full bg-white/60 backdrop-blur-md rounded-3xl p-3 border border-black/[0.04] shadow-soft">
              <div className={`flex items-center mb-2 pb-2 border-b border-black/[0.04] ${sidebarCollapsed ? 'justify-center' : 'justify-between px-1.5'}`}>
                {!sidebarCollapsed && <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu</span>}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-ink-900 hover:bg-cream transition-colors"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto" role="navigation" aria-label="Module navigation">
                {sidebarItems.map(item => {
                  const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-ink-900 text-white shadow-soft'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-cream'
                      }`}
                      data-testid={`sidebar-nav-${item.id}`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon}/></svg>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>
          
          <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-68'} lg:pl-4 min-h-[calc(100vh-56px)]`}>
            <div className="max-w-7xl mx-auto px-6 pt-20 pb-10">
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'EMPLOYEE']}>
                    {userRole === 'EMPLOYEE' ? <Profile /> : <Dashboard />}
                  </ProtectedRoute>
                } />
                
                {/* Profile */}
                <Route path="/profile" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <Profile />
                  </ProtectedRoute>
                } />

                {/* Employees */}
                <Route path="/employees" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <EmployeesList />
                  </ProtectedRoute>
                } />
                <Route path="/employees/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <EmployeeForm mode="create" />
                  </ProtectedRoute>
                } />
                <Route path="/employees/:id/edit" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <EmployeeForm mode="edit" />
                  </ProtectedRoute>
                } />
                <Route path="/employees/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <EmployeeView />
                  </ProtectedRoute>
                } />
                
                {/* Contracts */}
                <Route path="/contracts" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <ContractsList />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <ContractForm />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <ContractForm />
                  </ProtectedRoute>
                } />
                
                {/* Working Schedules */}
                <Route path="/schedules" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <SchedulesList />
                  </ProtectedRoute>
                } />
                <Route path="/schedules/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <ScheduleForm />
                  </ProtectedRoute>
                } />
                <Route path="/schedules/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <ScheduleForm />
                  </ProtectedRoute>
                } />
                
                {/* Attendance */}
                <Route path="/attendance" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <AttendanceList />
                  </ProtectedRoute>
                } />
                <Route path="/attendance/new" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <AttendanceList />
                  </ProtectedRoute>
                } />
                <Route path="/attendance/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <AttendanceList />
                  </ProtectedRoute>
                } />
                
                {/* Time Off */}
                <Route path="/time-off" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <TimeOffList />
                  </ProtectedRoute>
                } />
                <Route path="/timeoff/requests" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <TimeOffList />
                  </ProtectedRoute>
                } />
                <Route path="/timeoff/allocations" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <TimeOffList />
                  </ProtectedRoute>
                } />
                <Route path="/timeoff/types" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <TimeOffList />
                  </ProtectedRoute>
                } />
                
                {/* Payroll & Payruns */}
                <Route path="/payroll" element={<Navigate to="/payroll/payruns" replace />} />
                <Route path="/payroll/payruns" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <PayrunsList />
                  </ProtectedRoute>
                } />
                <Route path="/payroll/payruns/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <PayrunWizard />
                  </ProtectedRoute>
                } />
                <Route path="/payroll/payruns/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <PayrunDetail />
                  </ProtectedRoute>
                } />
                <Route path="/payroll/new" element={<Navigate to="/payroll/payruns/new" replace />} />
                <Route path="/payroll/:id" element={<Navigate to="/payroll/payruns" replace />} />
                
                {/* Payslips */}
                <Route path="/payslips" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <PayslipsList />
                  </ProtectedRoute>
                } />
                <Route path="/payslips/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <PayslipDetail />
                  </ProtectedRoute>
                } />
                <Route path="/payroll/payslips/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['ALL']}>
                    <PayslipDetail />
                  </ProtectedRoute>
                } />
                
                {/* Salary Structures & Rules */}
                <Route path="/salary-structures" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryStructuresList />
                  </ProtectedRoute>
                } />
                <Route path="/salary-structures/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryStructureForm />
                  </ProtectedRoute>
                } />
                <Route path="/salary-structures/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryStructureForm />
                  </ProtectedRoute>
                } />
                <Route path="/salary-rules" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryStructuresList />
                  </ProtectedRoute>
                } />
                <Route path="/salary-rules/new" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryRuleForm />
                  </ProtectedRoute>
                } />
                <Route path="/salary-rules/:id" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <SalaryRuleForm />
                  </ProtectedRoute>
                } />
                
                {/* Audit Log */}
                <Route path="/audit-log" element={
                  <ProtectedRoute session={session} allowedRoles={['HR_PAYROLL_MANAGER', 'ADMIN']}>
                    <AuditLog />
                  </ProtectedRoute>
                } />
                
                {/* User Management */}
                <Route path="/users" element={
                  <ProtectedRoute session={session} allowedRoles={['ADMIN']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />

                {/* Dedicated Error Pages */}
                <Route path="/401" element={<Error401Page onLogout={onLogout} />} />
                <Route path="/403" element={<Error403Page session={session} onLogout={onLogout} />} />
                <Route path="/404" element={<Error404Page />} />
                <Route path="/500" element={<Error500Page />} />

                {/* Catch-all */}
                <Route path="*" element={<Error404Page />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const [session, setSessionState] = useState(() => getSession());

  const handleLoginSuccess = (newSession) => {
    setSessionState(newSession);
  };

  const handleLogout = () => {
    logout();
    setSessionState(null);
  };

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="/login" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/401" element={<Error401Page onLogout={handleLogout} />} />
          <Route path="/403" element={<Error403Page session={null} onLogout={handleLogout} />} />
          <Route path="/404" element={<Error404Page />} />
          <Route path="/500" element={<Error500Page />} />
          <Route path="*" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/401" element={<Error401Page onLogout={handleLogout} />} />
          <Route path="/403" element={<Error403Page session={session} onLogout={handleLogout} />} />
          <Route path="/404" element={<Error404Page />} />
          <Route path="/500" element={<Error500Page />} />
          <Route path="/*" element={<Layout session={session} onLogout={handleLogout} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}