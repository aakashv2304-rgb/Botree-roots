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
    if (status === 'approved') return 'bg-[#10B981] text-white';
    if (status === 'needs_revision') return 'bg-[#EF4444] text-white';
    return 'bg-[#F59E0B] text-white';
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F172A]"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="overview-page">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-black tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-600 font-body">Overview of all proposals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#E4E4E7] p-6 shadow-sm" data-testid="stat-total">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={24} className="text-[#71717A]" />
            <p className="text-sm text-[#71717A] uppercase tracking-[0.2em]">Total</p>
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>{proposals.length}</p>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-6 shadow-sm" data-testid="stat-pending">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={24} className="text-[#F59E0B]" />
            <p className="text-sm text-[#71717A] uppercase tracking-[0.2em]">Pending</p>
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>{pendingCount}</p>
        </div>

        <div className="bg-white border border-[#E4E4E7] p-6 shadow-sm" data-testid="stat-approved">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={24} className="text-[#10B981]" />
            <p className="text-sm text-[#71717A] uppercase tracking-[0.2em]">Approved</p>
          </div>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>{approvedCount}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E4E4E7] shadow-sm">
        <div className="p-6 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-3">
            <MagnifyingGlass size={20} className="text-[#71717A]" />
            <Input
              type="text"
              placeholder="Search proposals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
              className="flex-1 border-none shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="divide-y divide-[#E4E4E7]">
          {filteredProposals.length === 0 ? (
            <div className="p-12 text-center text-[#71717A]">
              <p>No proposals found</p>
            </div>
          ) : (
            filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                data-testid={`proposal-${proposal.id}`}
                className="p-6 hover:bg-[#F4F4F5] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>{proposal.title}</h3>
                    <p className="text-[#71717A] text-sm mb-3">{proposal.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#71717A]">
                      <span>By {proposal.created_by.name}</span>
                      <span>•</span>
                      <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(proposal.status)} data-testid={`status-${proposal.id}`}>
                    {getStatusLabel(proposal.status)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;