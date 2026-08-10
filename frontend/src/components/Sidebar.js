import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { House, ClockCounterClockwise, CheckCircle, Users, SignOut, Plus, Calculator } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import BotreeLogo from './BotreeLogo';

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
    { path: '/dashboard/profitability-analyzer', icon: Calculator, label: 'Profitability Analyzer', testId: 'nav-profitability-analyzer' },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ path: '/dashboard/users', icon: Users, label: 'Users', testId: 'nav-users' });
  }

  return (
    <div className="w-64 text-white flex flex-col shadow-lg" style={{background: 'linear-gradient(180deg, #F72585 0%, #7209B7 100%)'}}>
      <div className="p-6 border-b border-white/20">
        <div className="text-white">
          <BotreeLogo size="sm" />
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-white/90 text-sm font-semibold">{user?.name}</p>
          <p className="text-white/70 text-xs uppercase tracking-widest mt-1 font-bold">{user?.role}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 transition-all ${
                isActive
                  ? 'bg-white/25 text-white border-l-4 border-white font-semibold shadow-md'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
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
            className="w-full justify-start gap-3 bg-white/20 hover:bg-white/30 text-white mt-4 font-semibold shadow-md"
          >
            <Plus size={20} weight="regular" />
            <span>New Proposal</span>
          </Button>
        )}
      </nav>

      <div className="p-4 border-t border-white/20">
        <Button
          onClick={handleLogout}
          data-testid="logout-button"
          variant="ghost"
          className="w-full justify-start gap-3 text-white/80 hover:bg-white/15 hover:text-white"
        >
          <SignOut size={20} weight="regular" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
