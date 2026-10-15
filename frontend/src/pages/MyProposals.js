import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, MagnifyingGlass, Plus } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MyProposals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let active = true;
    axios.get(`${API}/proposals?my_only=true`, { withCredentials: true })
      .then(({ data }) => { if (active) setProposals(data); })
      .catch(() => { if (active) setError('Unable to load your proposals. Please try refreshing.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = proposals.filter((proposal) => {
    const matchesSearch = `${proposal.title || ''} ${proposal.customer_name || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'all' || proposal.status === status);
  });

  const canCreate = user?.role === 'Admin' || user?.can_create_proposals === true;
  const statusLabel = (value) => ({
    needs_revision: 'Needs Revision', approved: 'Approved', pending: 'Pending',
    rejected: 'Rejected', under_review: 'Under Review'
  }[value] || String(value || 'Unknown').replace(/_/g, ' '));

  return (
    <div className="p-6" data-testid="my-proposals-page">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1533]">My Proposals</h1>
          <p className="text-sm text-[#7A6B9E] mt-1">All proposals submitted by you, including those awaiting review, requiring revision, and approved.</p>
        </div>
        {canCreate && <button type="button" onClick={() => navigate('/dashboard/new')}
          className="flex items-center gap-2 rounded-lg bg-[#9B30FF] text-white px-4 py-2 font-semibold"
          data-testid="my-proposals-create"><Plus size={17} /> New Proposal</button>}
      </div>
      <div className="bg-white border border-[#E4DCF0] rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-3 items-center p-4 border-b border-[#E4DCF0]">
          <div className="flex items-center gap-2 flex-1 min-w-[190px] rounded-lg bg-[#F7F4FC] px-3 py-2">
            <MagnifyingGlass size={17} className="text-[#8577A3]" />
            <input type="search" aria-label="Search my proposals" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search proposals or customers" className="bg-transparent outline-none flex-1 text-sm min-w-0" />
          </div>
          <select aria-label="Filter proposal status" value={status} onChange={(e) => setStatus(e.target.value)}
            className="border border-[#E4DCF0] rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All Statuses</option>
            {[...new Set(proposals.map((p) => p.status))].map((value) =>
              <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
        </div>
        {loading ? <p className="p-8 text-[#7A6B9E]">Loading your proposals...</p> :
          error ? <p className="p-8 text-red-700" role="alert">{error}</p> :
          visible.length === 0 ? <div className="p-12 text-center text-[#7A6B9E]"><FileText size={30} className="mx-auto mb-3" />
            {proposals.length === 0 ? 'You have not submitted any proposals yet.' : 'No proposals match your filters.'}</div> :
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-[#F7F4FC] text-[#5B4B7A] text-xs uppercase">
              <tr><th className="p-4">Proposal / Customer</th><th className="p-4">Status</th>
                <th className="p-4">Deal Value</th><th className="p-4">Submitted</th><th className="p-4">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-[#E4DCF0]">
              {visible.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-[#FAF8FD]" data-testid={`my-proposal-${proposal.id}`}>
                  <td className="p-4"><div className="font-semibold text-[#1E1533]">{proposal.title}</div>
                    <div className="text-xs text-[#7A6B9E]">{proposal.customer_name || '—'}</div></td>
                  <td className="p-4">{statusLabel(proposal.status)}</td>
                  <td className="p-4">{typeof proposal.deal_value === 'number'
                    ? `₹${proposal.deal_value.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="p-4">{proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="p-4"><button type="button" className="text-[#8126DB] font-semibold hover:underline"
                    onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}>Open Proposal</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>
    </div>
  );
};

export default MyProposals;
