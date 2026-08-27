import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  House, ClockCounterClockwise, CheckCircle, Users, SignOut,
  Plus, Calculator, MagnifyingGlass, Bell
} from '@phosphor-icons/react';
import { Button } from './ui/button';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";

const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: House, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/dashboard/pending', icon: ClockCounterClockwise, label: 'Pending', testId: 'nav-pending' },
    { path: '/dashboard/approved', icon: CheckCircle, label: 'Approved', testId: 'nav-approved' },
    { path: '/dashboard/profitability-analyzer', icon: Calculator, label: 'Profitability', testId: 'nav-profitability-analyzer' },
  ];
  if (user?.role === 'Admin') {
    navItems.push({ path: '/dashboard/users', icon: Users, label: 'Users', testId: 'nav-users' });
  }

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#1E1533] border-b border-[#3D2A5C]">
      {/* Row 1: logo, search, actions */}
      <div className="h-16 px-6 flex items-center gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white rounded-lg p-1.5 inline-flex">
            <img src={BOTREE_LOGO} alt="Botree Software" className="h-7 w-auto" />
          </div>
          <div className="hidden lg:block h-6 w-px bg-[#3D2A5C]" />
          <span className="hidden lg:block text-sm font-semibold text-[#B9AED4]">
            Enterprise Proposal Tracker
          </span>
        </div>

        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B7FAE]" />
            <input
              type="text"
              placeholder="Search by Client, Proposal ID, Deal Value..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#150E29] border border-[#3D2A5C] text-sm text-[#F5F3FA] placeholder:text-[#6B5D91] focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF] transition-all"
              data-testid="global-search-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#B9AED4] hover:bg-[#2A1F45] transition-colors"
            aria-label="Notifications"
            data-testid="notifications-button"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
          </button>

          {user?.role === 'Sales' && (
            <Button
              onClick={() => navigate('/dashboard/new')}
              data-testid="new-proposal-button"
              className="gap-2 font-semibold text-white shadow-sm hover:shadow transition-all"
              style={{ backgroundColor: '#9B30FF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7209B7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#9B30FF')}
            >
              <Plus size={18} weight="bold" />
              <span className="hidden sm:inline">New Proposal</span>
            </Button>
          )}

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: '#9B30FF' }}
              data-testid="profile-menu-button"
            >
              {initials}
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#1E1533] border border-[#3D2A5C] rounded-xl shadow-lg py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-[#3D2A5C]">
                  <p className="text-sm font-semibold text-[#F5F3FA] truncate">{user?.name}</p>
                  <p className="text-xs text-[#8B7FAE] uppercase tracking-wide font-bold mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#B9AED4] hover:bg-[#150E29] hover:text-[#E11D48] transition-colors"
                >
                  <SignOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: section nav */}
      <nav className="px-6 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#9B30FF] text-[#9B30FF]'
                  : 'border-transparent text-[#B9AED4] hover:text-[#F5F3FA] hover:border-[#5B3D8A]'
              }`
            }
          >
            <item.icon size={17} weight="regular" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};

export default TopBar;
