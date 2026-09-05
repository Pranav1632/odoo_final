// src/components/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Avatar, Dropdown } from './UI';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/', roles: ['ALL'] },
  { id: 'employees', label: 'Employees', href: '/employees', roles: ['ALL'] },
  { id: 'contracts', label: 'Contracts', href: '/contracts', roles: ['ALL'] },
  { id: 'schedules', label: 'Schedules', href: '/schedules', roles: ['ALL'] },
  { id: 'attendance', label: 'Attendance', href: '/attendance', roles: ['ALL'] },
  { id: 'timeoff', label: 'Time Off', href: '/time-off', roles: ['ALL'] },
  { id: 'payroll', label: 'Payroll', href: '/payroll/payruns', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'payslips', label: 'Payslips', href: '/payslips', roles: ['ALL'] },
  { id: 'structures', label: 'Salary Structures', href: '/salary-structures', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'audit', label: 'Audit Log', href: '/audit-log', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'] },
];

export function Topbar({ currentPath, onNavigate, user }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const userRole = user?.role || 'HR_PAYROLL_MANAGER';

  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (item.roles.includes('ALL')) return true;
    return item.roles.includes(userRole);
  });

  const userMenuItems = [
    { label: 'Profile', onClick: () => { setUserMenuOpen(false); onNavigate('/profile'); } },
    { label: 'Settings', onClick: () => { setUserMenuOpen(false); onNavigate('/settings'); } },
    { divider: true },
    { label: 'Sign Out', variant: 'danger', onClick: () => { setUserMenuOpen(false); /* no-op */ } },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClickOutside = (ref, setter) => (e) => {
    if (ref.current && !ref.current.contains(e.target)) {
      setter(false);
    }
  };

  useEffect(() => {
    const h1 = handleClickOutside(searchRef, setSearchOpen);
    const h2 = handleClickOutside(notifRef, setNotificationsOpen);
    const h3 = handleClickOutside(userMenuRef, setUserMenuOpen);
    document.addEventListener('mousedown', h1);
    document.addEventListener('mousedown', h2);
    document.addEventListener('mousedown', h3);
    return () => {
      document.removeEventListener('mousedown', h1);
      document.removeEventListener('mousedown', h2);
      document.removeEventListener('mousedown', h3);
    };
  }, []);

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-4" data-testid="topbar">
      <div 
        className="max-w-full h-14 mx-2 flex items-center gap-4 pl-5 pr-3 rounded-full bg-white/90 shadow-soft backdrop-blur border border-black/[0.04]"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <a 
          href="/" 
          onClick={(e) => { e.preventDefault(); onNavigate('/'); }} 
          className="flex items-center gap-2 shrink-0" 
          data-testid="topbar-logo"
        >
          <span className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-sm font-bold">P</span>
          <span className="text-base font-bold tracking-tight hidden sm:block">peoplepay<span className="text-accent-500">360</span></span>
        </a>

        <nav className="flex-1 flex items-center gap-1 overflow-x-auto hidden xl:flex scrollbar-none" role="navigation" aria-label="Main navigation">
          {visibleNavItems.map(item => {
            const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => { e.preventDefault(); onNavigate(item.href); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-cream'
                }`}
                data-testid={`topbar-nav-${item.id}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex-1 max-w-sm hidden lg:block">
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-cream text-gray-500 hover:bg-gray-200/70 transition-colors"
              aria-label="Global search"
              data-testid="global-search-trigger"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <span>Search…</span>
              <kbd className="ml-auto text-[10px] font-medium text-gray-400 bg-white rounded-full px-1.5 py-0.5">⌘K</kbd>
            </button>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl border border-gray-100 animate-scale-in z-50 overflow-hidden">
                <input
                  ref={searchRef}
                  placeholder="Search employees, contracts, payruns…"
                  className="w-full px-4 py-3 border-0 bg-transparent font-medium focus:outline-none placeholder-gray-400"
                  autoFocus
                />
                <div className="px-4 py-3 border-t border-gray-100 bg-cream/60 text-center">
                  <p className="text-xs text-gray-500">Enter to search · Esc to close</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-cream transition-colors"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              data-testid="topbar-notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">3</span>
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in z-50 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button className="text-xs font-medium text-accent-600 hover:underline">Mark all read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {[
                    { id: 1, message: 'Payrun "August 2025" validated successfully', time: '2 min ago', read: false },
                    { id: 2, message: '5 employees missing bank details', time: '1 hour ago', read: false },
                    { id: 3, message: 'Contract CTR-000004 expiring in 30 days', time: '3 hours ago', read: true },
                  ].map(notif => (
                    <button key={notif.id} className={`w-full px-4 py-3 text-left hover:bg-cream transition-colors ${!notif.read ? 'border-l-2 border-accent-500 bg-accent-50/40' : ''}`}>
                      <p className="text-sm text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.time}</p>
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-gray-100 text-center">
                  <button className="text-sm font-medium text-accent-600 hover:underline">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:ring-2 hover:ring-accent-100 transition-shadow"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              data-testid="topbar-user-menu"
            >
              <Avatar name={user?.name || 'User'} size="sm" />
            </button>
            {userMenuOpen && (
              <Dropdown
                trigger={<div />}
                items={[
                  { label: 'Profile', onClick: () => { setUserMenuOpen(false); onNavigate('/profile'); } },
                  { label: 'Settings', onClick: () => { setUserMenuOpen(false); onNavigate('/settings'); } },
                  { divider: true },
                  { label: 'Sign Out', variant: 'danger', onClick: () => { setUserMenuOpen(false); } },
                ]}
                align="right"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ currentPath, onNavigate, isOpen, onClose, user }) {
  if (!isOpen) return null;

  const userRole = user?.role || 'HR_PAYROLL_MANAGER';
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (item.roles.includes('ALL')) return true;
    return item.roles.includes(userRole);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true">
      <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-xl animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-cream transition-colors" aria-label="Close menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav className="p-4" role="navigation" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {visibleNavItems.map(item => {
              const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); onNavigate(item.href); onClose(); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ink-900 text-white'
                        : 'text-gray-700 hover:bg-cream'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}