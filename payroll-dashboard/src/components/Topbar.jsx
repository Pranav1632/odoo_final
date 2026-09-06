// src/components/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Avatar, Dropdown } from './UI';
import { systemLogsApi } from '../lib/api';

function formatTimeAgo(date) {
  const diffSec = Math.floor((new Date() - date) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour ago`;
  return `${Math.floor(diffSec / 86400)} day ago`;
}

const ALL_NAV_ITEMS = [
  { id: 'profile', label: 'My Profile', href: '/', roles: ['EMPLOYEE'] },
  { id: 'dashboard', label: 'Reports', href: '/', roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'employees', label: 'Employees', href: '/employees', roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'contracts', label: 'Contracts', href: '/contracts', roles: ['ALL'] },
  { id: 'schedules', label: 'Schedules', href: '/schedules', roles: ['HR_MANAGER', 'ADMIN'] },
  { id: 'attendance', label: 'Attendance', href: '/attendance', roles: ['ALL'] },
  { id: 'timeoff', label: 'Time Off', href: '/time-off', roles: ['ALL'] },
  { id: 'payroll', label: 'Payroll', href: '/payroll/payruns', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'payslips', label: 'Payslips', href: '/payslips', roles: ['ALL'] },
  { id: 'structures', label: 'Salary Structures', href: '/salary-structures', roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'audit', label: 'System Logs', href: '/audit-log', roles: ['HR_PAYROLL_MANAGER', 'ADMIN'] },
  { id: 'users', label: 'User Management', href: '/users', roles: ['ADMIN'] },
];

export function Topbar({ onNavigate, user, onToggleMobileNav, onLogout }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    systemLogsApi.getAuditLogs('limit=5')
      .then(res => {
        if (res?.data && Array.isArray(res.data)) {
          setNotifications(res.data.map(log => {
            const timeAgo = formatTimeAgo(new Date(log.createdAt));
            let msg = `${log.userName || 'System'} performed ${log.action} on ${log.entityType}`;
            if (log.action === 'REGISTER') msg = `New user registration: ${log.userName || 'Employee'}`;
            if (log.action === 'LOGIN') msg = `User login: ${log.userName || log.userEmail}`;
            if (log.action === 'CREATE_PAYRUN') msg = `New Payrun created by ${log.userName}`;
            if (log.action === 'VALIDATE_PAYRUN') msg = `Payrun validated successfully by ${log.userName}`;
            return {
              id: log.id,
              message: msg,
              time: timeAgo,
              read: false
            };
          }));
        }
      })
      .catch(() => {});
  }, []);

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
        className="max-w-full h-14 mx-2 flex items-center justify-between gap-4 px-4 sm:px-5 rounded-full bg-white/90 shadow-soft backdrop-blur border border-black/[0.04]"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileNav}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-cream lg:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); onNavigate('/'); }} 
            className="flex items-center gap-2.5 shrink-0" 
            data-testid="topbar-logo"
          >
            <span className="w-8 h-8 rounded-full bg-ink-900 text-white flex items-center justify-center text-sm font-bold shadow-sm">P</span>
            <span className="text-base font-bold tracking-tight text-ink-900">peoplepay<span className="text-accent-500">360</span></span>
          </a>
        </div>

        {/* Global Search Bar (Central Utility) */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2 rounded-full text-sm bg-cream text-gray-500 hover:bg-gray-200/70 transition-colors border border-black/[0.02]"
              aria-label="Global search"
              data-testid="global-search-trigger"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <span className="text-xs text-gray-500 font-medium">Search employees, contracts, payruns…</span>
            </button>
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-xl border border-gray-100 animate-scale-in z-50 overflow-hidden">
                <input
                  ref={searchInputRef}
                  placeholder="Search employees, contracts, payruns…"
                  className="w-full px-4 py-3 border-0 bg-transparent text-sm font-medium text-ink-900 focus:outline-none placeholder-gray-400"
                  autoFocus
                />
                <div className="px-4 py-2.5 border-t border-gray-100 bg-cream/60 text-center">
                  <p className="text-xs text-gray-500">Press Enter to search · Esc to close</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Header Utilities: Quick Actions + Notifications + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Payrun Shortcut - only for Payroll Managers & Admins */}
          {(user?.role === 'HR_PAYROLL_MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_PAYROLL_USER') && (
            <button
              onClick={() => onNavigate('/payroll/payruns/new')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span>New Payrun</span>
            </button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                const nextState = !notificationsOpen;
                setNotificationsOpen(nextState);
                if (nextState) {
                  systemLogsApi.getAuditLogs('limit=5')
                    .then(res => {
                      if (res?.data && Array.isArray(res.data)) {
                        setNotifications(res.data.map(log => {
                          const timeAgo = formatTimeAgo(new Date(log.createdAt));
                          let msg = `${log.userName || 'System'} performed ${log.action} on ${log.entityType}`;
                          if (log.action === 'REGISTER') msg = `New user registration: ${log.userName || 'Employee'}`;
                          if (log.action === 'LOGIN') msg = `User login: ${log.userName || log.userEmail}`;
                          if (log.action === 'CREATE_PAYRUN') msg = `New Payrun created by ${log.userName}`;
                          if (log.action === 'VALIDATE_PAYRUN') msg = `Payrun validated successfully by ${log.userName}`;
                          return {
                            id: log.id,
                            message: msg,
                            time: timeAgo,
                            read: false
                          };
                        }));
                      }
                    })
                    .catch(err => console.error('Failed to load notifications:', err));
                }
              }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:text-ink-900 hover:bg-cream transition-colors"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              data-testid="topbar-notifications"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in z-50 overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-ink-900">Notifications</h3>
                  <button 
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                    className="text-xs font-medium text-accent-600 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No new notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <button 
                        key={notif.id} 
                        onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                        className={`w-full px-4 py-3 text-left hover:bg-cream transition-colors ${!notif.read ? 'border-l-2 border-accent-500 bg-accent-50/30' : ''}`}
                      >
                        <p className="text-xs font-medium text-ink-900 leading-snug">{notif.message}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{notif.time}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="p-2.5 border-t border-gray-100 bg-cream/50 text-center">
                  <button onClick={() => { setNotificationsOpen(false); onNavigate('/audit-log'); }} className="text-xs font-medium text-accent-600 hover:underline">
                    View system logs
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-cream transition-colors border border-transparent hover:border-black/[0.04]"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              data-testid="topbar-user-menu"
            >
              <Avatar name={user?.name || 'User'} size="sm" />
              <span className="text-xs font-semibold text-ink-900 hidden sm:block max-w-[100px] truncate">{user?.name || 'User'}</span>
              <svg className="w-3.5 h-3.5 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-scale-in">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-ink-900 truncate">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-gray-500 font-mono truncate">{user?.role || 'EMPLOYEE'}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); onNavigate('/profile'); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-ink-900 hover:bg-cream transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span>My Profile</span>
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setUserMenuOpen(false); onLogout?.(); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ currentPath, onNavigate, isOpen, onClose, user, onLogout }) {
  if (!isOpen) return null;

  const userRole = user?.role || 'HR_PAYROLL_MANAGER';
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (item.roles.includes('ALL')) return true;
    return item.roles.includes(userRole);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true">
      <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-xl animate-slide-in flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">peoplepay<span className="text-accent-500">360</span></h2>
            <p className="text-xs text-gray-500">{user?.name} ({user?.role})</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-cream transition-colors" aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav className="p-4 flex-1 overflow-y-auto" role="navigation" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {visibleNavItems.map(item => {
              const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); onNavigate(item.href); onClose(); }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors ${
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
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => { onClose(); onLogout?.(); }}
            className="w-full py-2 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-center"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}