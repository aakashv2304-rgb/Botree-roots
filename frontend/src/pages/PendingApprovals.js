import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PendingApprovals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals?status=pending`, { withCredentials: true });
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const WORKFLOW_STAGES = [
    { key: 'sales_submitted', role: 'Sales', label: 'Sales Submitted' },
    { key: 'cgo_review', role: 'CGO', label: 'CGO Review' },
    { key: 'finance_review', role: 'Finance', label: 'Finance Review' },
    { key: 'legal_review', role: 'Legal', label: 'Legal Review' },
    { key: 'cfo_review', role: 'CFO', label: 'CFO Review' },
  ];

  const myProposals = proposals.filter(p => {
    if (p.status === 'needs_revision' && user.role === 'Sales') return true;
    const stage = WORKFLOW_STAGES[p.current_stage];
    return stage && stage.role === user.role;
  });

  const getStatusColor = (status) => {
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
    <div className="p-8" data-testid="pending-page">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-black tracking-tight mb-2">Pending Approvals</h1>
        <p className="text-gray-600 font-body">Proposals awaiting your action</p>
      </div>

      <div className="bg-white border border-[#E4E4E7] shadow-sm">
        <div className="divide-y divide-[#E4E4E7]">
          {myProposals.length === 0 ? (
            <div className="p-12 text-center text-[#71717A]" data-testid="no-pending">
              <p>No pending proposals</p>
            </div>
          ) : (
            myProposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                data-testid={`pending-proposal-${proposal.id}`}
                className="p-6 hover:bg-[#F4F4F5] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>{proposal.title}</h3>
                    {proposal.description && (
                      <p className="text-[#71717A] text-sm mb-3">{proposal.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[#71717A]">
                      <span>By {proposal.created_by.name}</span>
                      <span>•</span>
                      <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(proposal.status)} data-testid={`pending-status-${proposal.id}`}>
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

export default PendingApprovals;
