import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { House, ClockCounterClockwise, CheckCircle, Users, SignOut, Plus } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: House, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/dashboard/pending', icon: ClockCounterClockwise, label: 'Pending', testId: 'nav-pending' },
    { path: '/dashboard/approved', icon: CheckCircle, label: 'Approved', testId: 'nav-approved' },
  ];

  if (user?.role === 'Finance') {
    navItems.push({ path: '/dashboard/users', icon: Users, label: 'Users', testId: 'nav-users' });
  }

  return (
    <div className="w-64 bg-[#0F172A] text-white flex flex-col border-r border-[#1E293B]">
      <div className="p-6 border-b border-[#1E293B]">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }} data-testid="app-title">Proposal Tracker</h1>
        <p className="text-[#94A3B8] text-sm mt-1">{user?.name}</p>
        <p className="text-[#64748B] text-xs uppercase tracking-[0.2em] mt-1">{user?.role}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-white/10 text-white border-l-2 border-white'
                  : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={20} weight="regular" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}

        {user?.role === 'Sales' && (
          <Button
            onClick={() => navigate('/dashboard/new')}
            data-testid="new-proposal-button"
            className="w-full justify-start gap-3 bg-white/10 hover:bg-white/20 text-white mt-4"
          >
            <Plus size={20} weight="regular" />
            <span>New Proposal</span>
          </Button>
        )}
      </nav>

      <div className="p-4 border-t border-[#1E293B]">
        <Button
          onClick={handleLogout}
          data-testid="logout-button"
          variant="ghost"
          className="w-full justify-start gap-3 text-[#94A3B8] hover:bg-white/5 hover:text-white"
        >
          <SignOut size={20} weight="regular" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;