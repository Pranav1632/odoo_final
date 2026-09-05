// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Topbar, MobileNav } from './components/Topbar';
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
import { Profile } from './pages/Profile';
import { ToastContainer } from './components/ToastContainer';
import { getSession } from './lib/user';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const session = getSession();

  const handleNavigate = (path) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  const currentPath = location.pathname;

  const userRole = session?.role || 'HR_PAYROLL_MANAGER';
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/', roles: ['ALL'], icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'employees', label: 'Employees', href: '/employees', roles: ['ALL'], icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'contracts', label: 'Contracts', href: '/contracts', roles: ['ALL'], icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'schedules', label: 'Schedules', href: '/schedules', roles: ['ALL'], icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'attendance', label: 'Attendance', href: '/attendance', roles: ['ALL'], icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'timeoff', label: 'Time Off', href: '/time-off', roles: ['ALL'], icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'payroll', label: 'Payroll', href: '/payroll/payruns', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'payslips', label: 'Payslips', href: '/payslips', roles: ['ALL'], icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'structures', label: 'Salary Structures', href: '/salary-structures', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16' },
    { id: 'audit', label: 'Audit Log', href: '/audit-log', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'], icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ].filter(item => item.roles.includes('ALL') || item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-paper">
      <Topbar 
        onNavigate={handleNavigate} 
        user={session}
        onToggleMobileNav={() => setMobileNavOpen(true)}
      />
      <MobileNav 
        currentPath={currentPath} 
        onNavigate={handleNavigate}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={session}
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
                <Route path="/" element={<Dashboard />} />
                
                {/* Profile */}
                <Route path="/profile" element={<Profile />} />

                {/* Employees */}
                <Route path="/employees" element={<EmployeesList />} />
                <Route path="/employees/new" element={<EmployeeForm mode="create" />} />
                <Route path="/employees/:id/edit" element={<EmployeeForm mode="edit" />} />
                <Route path="/employees/:id" element={<EmployeeView />} />
                
                {/* Contracts */}
                <Route path="/contracts" element={<ContractsList />} />
                <Route path="/contracts/new" element={<ContractForm />} />
                <Route path="/contracts/:id" element={<ContractForm />} />
                
                {/* Working Schedules */}
                <Route path="/schedules" element={<SchedulesList />} />
                <Route path="/schedules/new" element={<ScheduleForm />} />
                <Route path="/schedules/:id" element={<ScheduleForm />} />
                
                {/* Attendance */}
                <Route path="/attendance" element={<AttendanceList />} />
                <Route path="/attendance/new" element={<AttendanceList />} />
                <Route path="/attendance/:id" element={<AttendanceList />} />
                
                {/* Time Off */}
                <Route path="/time-off" element={<TimeOffList />} />
                <Route path="/timeoff/requests" element={<TimeOffList />} />
                <Route path="/timeoff/allocations" element={<TimeOffList />} />
                <Route path="/timeoff/types" element={<TimeOffList />} />
                
                {/* Payroll & Payruns */}
                <Route path="/payroll" element={<Navigate to="/payroll/payruns" replace />} />
                <Route path="/payroll/payruns" element={<PayrunsList />} />
                <Route path="/payroll/payruns/new" element={<PayrunWizard />} />
                <Route path="/payroll/payruns/:id" element={<PayrunDetail />} />
                <Route path="/payroll/new" element={<PayrunWizard />} />
                <Route path="/payroll/:id" element={<PayrunDetail />} />
                
                {/* Payslips */}
                <Route path="/payslips" element={<PayslipsList />} />
                <Route path="/payslips/:id" element={<PayslipDetail />} />
                <Route path="/payroll/payslips/:id" element={<PayslipDetail />} />
                
                {/* Salary Structures & Rules */}
                <Route path="/salary-structures" element={<SalaryStructuresList />} />
                <Route path="/salary-structures/new" element={<SalaryStructureForm />} />
                <Route path="/salary-structures/:id" element={<SalaryStructureForm />} />
                <Route path="/salary-rules" element={<SalaryStructuresList />} />
                <Route path="/salary-rules/new" element={<SalaryRuleForm />} />
                <Route path="/salary-rules/:id" element={<SalaryRuleForm />} />
                
                {/* Audit Log */}
                <Route path="/audit-log" element={<AuditLog />} />
                
                {/* Reports — alias to Dashboard */}
                <Route path="/reports" element={<Dashboard />} />
                
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  );
}