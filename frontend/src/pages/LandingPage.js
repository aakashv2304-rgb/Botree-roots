import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import BotreeArrowLogo from '../components/BotreeArrowLogo';
import { FileText, ArrowRight, CheckCircle, Clock, CurrencyDollar, Bell, TrendUp } from '@phosphor-icons/react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingStats, setPendingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchStats();
  }, []);

  const checkAuthAndFetchStats = async () => {
    try {
      // Check if user is logged in
      const { data: userData } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(userData);
      
      // Fetch proposals
      const { data: proposals } = await axios.get(`${API}/proposals`, { withCredentials: true });
      
      // Calculate pending reviews based on role
      let pendingCount = 0;
      let needsRevisionCount = 0;
      
      if (userData.role === 'Sales') {
        // Sales: count proposals needing revision
        needsRevisionCount = proposals.filter(p => p.status === 'needs_revision' && p.created_by.id === userData.id).length;
        pendingCount = proposals.filter(p => p.status !== 'approved' && p.created_by.id === userData.id).length;
      } else {
        // Other roles: count proposals waiting for their approval
        const roleStageMap = {
          'CGO': 'cgo_review',
          'Finance': 'finance_review',
          'Legal': 'legal_review',
          'CFO': 'cfo_review'
        };
        const targetStatus = roleStageMap[userData.role];
        if (targetStatus) {
          pendingCount = proposals.filter(p => p.status === targetStatus).length;
        }
      }
      
      setPendingStats({ pendingCount, needsRevisionCount, totalProposals: proposals.length });
    } catch (error) {
      // User not logged in, that's fine
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
      {/* Header */}
      <div className="border-b border-[#334155] bg-[#0F172A]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BotreeArrowLogo width={40} height={40} />
            <div>
              <h1 className="text-xl font-bold">Botree Software</h1>
              <p className="text-xs text-gray-400">Botree Roots</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/login')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
            data-testid="get-started-btn"
          >
            Sign In
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 bg-emerald-600/20 border border-emerald-600/30 rounded-full text-emerald-400 text-sm font-semibold">
              Internal Tool
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{fontFamily: 'Manrope, sans-serif'}}>
            Proposal Approval
            <br />
            <span className="text-emerald-400">Tracking System</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Streamlined workflow management for proposal submissions, reviews, and approvals across Sales, CGO, Finance, Legal, and CFO.
          </p>
          <Button 
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 text-lg shadow-xl"
            data-testid="hero-signin-btn"
          >
            Access Dashboard
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center mb-4">
              <FileText size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Multi-Stage Workflow</h3>
            <p className="text-gray-400 text-sm">
              5-stage approval process from Sales submission through CGO, Finance, Legal, and final CFO approval.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
            <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center mb-4">
              <Clock size={24} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Real-Time Tracking</h3>
            <p className="text-gray-400 text-sm">
              Live activity feed, bottleneck detection, and SLA health monitoring for all active proposals.
            </p>
          </div>

          <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
              <CurrencyDollar size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Deal Value Analytics</h3>
            <p className="text-gray-400 text-sm">
              Track pipeline value, approval rates, and throughput metrics with comprehensive analytics dashboard.
            </p>
          </div>
        </div>

        {/* Workflow Stages */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-10">Approval Workflow</h2>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="px-5 py-3 bg-[#1E293B] border-2 border-emerald-500 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Stage 1</div>
              <div className="font-bold">Sales</div>
            </div>
            <ArrowRight size={20} className="text-gray-600" />
            <div className="px-5 py-3 bg-[#1E293B] border-2 border-indigo-500 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Stage 2</div>
              <div className="font-bold">CGO</div>
            </div>
            <ArrowRight size={20} className="text-gray-600" />
            <div className="px-5 py-3 bg-[#1E293B] border-2 border-purple-500 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Stage 3</div>
              <div className="font-bold">Finance</div>
            </div>
            <ArrowRight size={20} className="text-gray-600" />
            <div className="px-5 py-3 bg-[#1E293B] border-2 border-amber-500 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Stage 4</div>
              <div className="font-bold">Legal</div>
            </div>
            <ArrowRight size={20} className="text-gray-600" />
            <div className="px-5 py-3 bg-[#1E293B] border-2 border-emerald-500 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Stage 5</div>
              <div className="font-bold">CFO</div>
            </div>
            <CheckCircle size={28} className="text-emerald-400 ml-2" weight="fill" />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 mb-4">Sign in to access the system</p>
          <Button 
            onClick={() => navigate('/login')}
            variant="outline"
            className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
          >
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
