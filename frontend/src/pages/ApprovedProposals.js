import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ApprovedProposals = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals?status=approved`, { withCredentials: true });
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F172A]"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="approved-page">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-black tracking-tight mb-2">Approved Proposals</h1>
        <p className="text-gray-600 font-body">All approved proposals</p>
      </div>

      <div className="bg-white border border-[#E4E4E7] shadow-sm">
        <div className="divide-y divide-[#E4E4E7]">
          {proposals.length === 0 ? (
            <div className="p-12 text-center text-[#71717A]" data-testid="no-approved">
              <p>No approved proposals yet</p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                data-testid={`approved-proposal-${proposal.id}`}
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
                  <Badge className="bg-[#10B981] text-white" data-testid={`approved-status-${proposal.id}`}>
                    Approved
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

export default ApprovedProposals;