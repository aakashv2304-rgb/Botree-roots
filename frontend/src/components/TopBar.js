import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  House, ClockCounterClockwise, CheckCircle, Users, SignOut,
  Plus, Calculator, MagnifyingGlass, Bell
} from '@phosphor-icons/react';
import { Button } from './ui/button';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleNotifications = async () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    setProfileOpen(false);
    if (opening) {
      setNotificationsLoading(true);
      try {
        const { data } = await axios.get(`${API}/analytics/activity-feed`, { withCredentials: true });
        setNotifications(data.activities || []);
      } catch (error) {
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const notificationVerb = (action) => {
    if (action === 'approved') return 'approved';
    if (action === 'rejected' || action === 'rejected_closed') return 'rejected';
    if (action === 'returned_for_revision') return 'requested changes on';
    if (action === 'created') return 'created';
    return 'updated';
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
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF] border-b border-[#E4DCF0]">
      {/* Row 1: logo, search, actions */}
      <div className="h-16 px-6 flex items-center gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white rounded-lg p-1.5 inline-flex">
            <img src={BOTREE_LOGO} alt="Botree Software" className="h-7 w-auto" />
          </div>
          <div className="hidden lg:block h-6 w-px bg-[#E4DCF0]" />
          <span className="hidden lg:block text-sm font-semibold text-[#5B4B7A]">
            Enterprise Proposal Tracker
          </span>
        </div>

        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8577A3]" />
            <input
              type="text"
              placeholder="Search by Client, Proposal ID, Deal Value..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#F7F4FC] border border-[#E4DCF0] text-sm text-[#1E1533] placeholder:text-[#A99BC7] focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF] transition-all"
              data-testid="global-search-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={toggleNotifications}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#5B4B7A] hover:bg-[#EDE4F9] transition-colors"
              aria-label="Notifications"
              data-testid="notifications-button"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E4DCF0] rounded-xl shadow-lg py-2 animate-fade-in max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-[#E4DCF0]">
                  <p className="text-sm font-semibold text-[#1E1533]">Recent Activity</p>
                </div>
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#9B30FF]"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-[#8577A3] text-center py-8">No recent activity</p>
                ) : (
                  <div className="py-1">
                    {notifications.slice(0, 10).map((activity, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (activity.proposal_id) navigate(`/dashboard/proposal/${activity.proposal_id}`);
                        }}
                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[#F7F4FC] transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: '#9B30FF' }}
                        >
                          {activity.by?.name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#5B4B7A] leading-snug">
                            <span className="font-semibold text-[#1E1533]">{activity.by?.name}</span>
                            {' '}{notificationVerb(activity.action)}{' '}
                            <span className="text-[#1E1533]">{activity.proposal_title}</span>
                          </p>
                          <p className="text-[10px] text-[#A99BC7] mt-0.5">{formatNotificationTime(activity.timestamp)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
              onClick={() => { setProfileOpen((o) => !o); setNotificationsOpen(false); }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: '#9B30FF' }}
              data-testid="profile-menu-button"
            >
              {initials}
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] border border-[#E4DCF0] rounded-xl shadow-lg py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-[#E4DCF0]">
                  <p className="text-sm font-semibold text-[#1E1533] truncate">{user?.name}</p>
                  <p className="text-xs text-[#8577A3] uppercase tracking-wide font-bold mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#5B4B7A] hover:bg-[#F7F4FC] hover:text-[#E11D48] transition-colors"
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
                  : 'border-transparent text-[#5B4B7A] hover:text-[#1E1533] hover:border-[#B9A0D9]'
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
