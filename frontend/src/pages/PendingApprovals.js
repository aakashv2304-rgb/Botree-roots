import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import DspBadge from '../components/DspBadge';

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

  // Waiting for ME: it is my turn at the current approval stage (the server decides - the person named for
  // that stage, or for an old role-based proposal anyone with that role), or it was returned to Sales to revise.
  const myProposals = proposals.filter(p => {
    if (p.status === 'needs_revision' && user.role === 'Sales') return true;
    return !!p.workflow_view?.can_act;
  });

  const getStatusColor = (status) => {
    if (status === 'needs_revision') return 'bg-[#FFE4E6] text-[#E11D48]';
    return 'bg-[#FEF3C7] text-[#D97706]';
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
    return <LoadingSpinner fullScreen label="Loading pending approvals..." />
  }

  return (
    <div className="p-6" data-testid="pending-page">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-black tracking-tight mb-2">Pending Approvals</h1>
        <p className="text-[#7A6B9E] font-body">Proposals awaiting your action</p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm">
        <div className="divide-y divide-[#E4DCF0]">
          {myProposals.length === 0 ? (
            <div className="p-12 text-center text-[#7A6B9E]" data-testid="no-pending">
              <p>No pending proposals</p>
            </div>
          ) : (
            myProposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                data-testid={`pending-proposal-${proposal.id}`}
                className="p-6 hover:bg-[#F7F4FC] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1 font-heading">{proposal.title}</h3>
                    {proposal.description && (
                      <p className="text-[#7A6B9E] text-sm mb-3">{proposal.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[#7A6B9E]">
                      <span>By {proposal.created_by.name}</span>
                      <span>•</span>
                      <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(proposal.status)} data-testid={`pending-status-${proposal.id}`}>
                      {proposal.status === 'in_review' ? proposal.workflow_view.status_label : getStatusLabel(proposal.status)}
                    </Badge>
                    <DspBadge dsp={proposal.dsp} testId={`pending-dsp-${proposal.id}`} />
                  </div>
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
