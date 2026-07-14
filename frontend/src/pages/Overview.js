import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, FileText, Clock } from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals`, { withCredentials: true });
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = proposals.filter(p => p.status !== 'approved').length;
  const approvedCount = proposals.filter(p => p.status === 'approved').length;

  const getStatusColor = (status) => {
    if (status === 'approved') return 'bg-green-500 text-white';
    if (status === 'needs_revision') return 'bg-red-500 text-white';
    return 'bg-amber-500 text-white';
  };

  const getStatusLabel = (status) => {
    const labels = {
      sales_submitted: 'Sales Submitted',
      cgo_review: 'CGO Review',
      finance_review: 'Finance Review',
      legal_review: 'Legal Review',
      cfo_review: 'CFO Review',
      approved: 'Approved',
      needs_revision: 'Needs Revision'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen relative" data-testid="overview-page" style={{background: '#F9FAFB'}}>
      {/* Geometric Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-10 right-10 w-32 h-32 bg-pink-200 rounded-lg rotate-45"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-purple-200 rounded-lg rotate-12"></div>
        <div className="absolute top-1/3 left-1/4 w-16 h-16 bg-pink-100 rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-black tracking-tight mb-1">Dashboard</h1>
          <p className="text-gray-600 text-sm font-body">Overview of all proposals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 p-4 shadow-sm rounded-lg card-hover" data-testid="stat-total">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="text-gray-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold font-body">Total</p>
            </div>
            <p className="text-2xl font-display font-black">{proposals.length}</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 shadow-sm rounded-lg card-hover" data-testid="stat-pending">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-amber-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold font-body">Pending</p>
            </div>
            <p className="text-2xl font-display font-black">{pendingCount}</p>
          </div>

          <div className="bg-white border border-gray-200 p-4 shadow-sm rounded-lg card-hover" data-testid="stat-approved">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="text-green-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold font-body">Approved</p>
            </div>
            <p className="text-2xl font-display font-black">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <MagnifyingGlass size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="search-input"
                className="flex-1 border-none shadow-none focus-visible:ring-0 text-sm"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No proposals found</p>
              </div>
            ) : (
              filteredProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                  data-testid={`proposal-${proposal.id}`}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-heading font-bold mb-1">{proposal.title}</h3>
                      <p className="text-gray-600 text-xs mb-2 font-body line-clamp-1">{proposal.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-body">
                        <span>By {proposal.created_by.name}</span>
                        <span>•</span>
                        <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(proposal.status)} text-xs`} data-testid={`status-${proposal.id}`}>
                      {getStatusLabel(proposal.status)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
