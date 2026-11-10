import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { House, FileText, ClockCounterClockwise, CheckCircle, Users, Calculator } from '@phosphor-icons/react';

const Sidebar = ({ mobileOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  useEffect(() => {
    if (mobileOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  const { user } = useAuth();

  const navItems = [
    { path: '/dashboard', icon: House, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/dashboard/my-proposals', icon: FileText, label: 'My Proposals', testId: 'nav-my-proposals' },
    { path: '/dashboard/pending', icon: ClockCounterClockwise, label: 'Pending', testId: 'nav-pending' },
    { path: '/dashboard/approved', icon: CheckCircle, label: 'Approved', testId: 'nav-approved' },
    { path: '/dashboard/profitability-analyzer', icon: Calculator, label: 'Profitability Analyzer', testId: 'nav-profitability-analyzer' },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ path: '/dashboard/users', icon: Users, label: 'Users', testId: 'nav-users' });
  }

  return (
    <>
      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} aria-label="Close navigation" />
      )}
      <aside id="dealpath-sidebar" aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col overflow-y-auto border-r border-[#E4DCF0] bg-[#FFFFFF] shadow-lg transition-transform duration-200 md:sticky md:top-16 md:z-20 md:h-[calc(100vh-4rem)] md:translate-x-0 md:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 pb-3 pt-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8577A3]">Workspace</span>
          <button type="button" className="rounded-lg p-1 text-[#5B4B7A] md:hidden" onClick={onClose} aria-label="Close menu">✕</button>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-5">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/dashboard'} data-testid={item.testId}
              onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-[#F1EBFA] text-[#8126DB] font-semibold' : 'text-[#5B4B7A] hover:bg-[#F7F4FC] hover:text-[#1E1533]'}`}>
              <item.icon size={19} weight="regular" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[#E4DCF0] px-5 py-4">
          <p className="truncate text-xs font-semibold text-[#1E1533]">{user?.name}</p>
          <p className="mt-1 text-xs text-[#8577A3]">{user?.role}</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
