import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import DspBadge from '../components/DspBadge';
import { FileText, Clock, CheckCircle, CurrencyInr, MagnifyingGlass, ArrowRight, WarningCircle, Plus, ArrowClockwise } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const currency = (amount) => typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';
const date = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const statusLabel = (value) => ({
  approved: 'Approved', needs_revision: 'Needs revision', rejected: 'Rejected',
  sales_submitted: 'Submitted', in_review: 'In review', cgo_review: 'In review',
  finance_review: 'In review', legal_review: 'In review', cfo_review: 'In review'
}[value] || String(value || 'Unknown').replace(/_/g, ' '));
const isUnderReview = (p) => p.status === 'in_review' || Boolean(p.workflow_view?.awaiting) ||
  ['cgo_review', 'finance_review', 'legal_review', 'cfo_review'].includes(p.status);

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    const requests = [
      axios.get(`${API}/proposals?dashboard_only=true`, { withCredentials: true }),
      axios.get(`${API}/analytics/deal-value-summary?dashboard_only=true`, { withCredentials: true }).catch(() => ({ data: null })),
      axios.get(`${API}/analytics/bottlenecks?dashboard_only=true`, { withCredentials: true }).catch(() => ({ data: null })),
      axios.get(`${API}/analytics/dsp-summary?dashboard_only=true`, { withCredentials: true }).catch(() => ({ data: null })),
      axios.get(`${API}/analytics/activity-feed?dashboard_only=true`, { withCredentials: true }).catch(() => ({ data: null })),
    ];
    try {
      const [proposalResult, dealValue, bottlenecks, dsp, activity] = await Promise.all(requests);
      setProposals(Array.isArray(proposalResult.data) ? proposalResult.data : []);
      setAnalytics({ dealValue: dealValue.data, bottlenecks: bottlenecks.data, dsp: dsp.data, activity: activity.data });
    } catch (e) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = proposals.filter(p => p.status !== 'approved' && p.status !== 'rejected' && !p.is_closed);
  const reviewing = proposals.filter(isUnderReview);
  const approved = proposals.filter(p => p.status === 'approved');
  const alerts = analytics.bottlenecks?.bottlenecks || [];
  const filtered = proposals.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || `${p.title || ''} ${p.customer_name || ''} ${p.description || ''}`.toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || (filter === 'review' ? isUnderReview(p) : p.status === filter);
    return matchesText && matchesFilter;
  }).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  const canCreate = user?.role === 'Admin' || user?.can_create_proposals === true;
  const stats = [
    { label: 'Active proposals', value: active.length, icon: FileText, detail: 'Currently in progress' },
    { label: 'Under review', value: reviewing.length, icon: Clock, detail: 'Awaiting approvals' },
    { label: 'Approved', value: approved.length, icon: CheckCircle, detail: 'Across your workspace' },
    { label: 'Active pipeline value', value: currency(analytics.dealValue?.active_pipeline_value), icon: CurrencyInr, detail: 'Value of active deals' },
  ];

  if (loading) return <div className="min-h-[65vh] flex items-center justify-center bg-[#F7F4FC]"><LoadingSpinner label="Loading dashboard..." /></div>;

  return (
    <div className="min-h-screen bg-[#F7F4FC] px-4 py-6 sm:px-6 lg:px-8" data-testid="overview-page">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#8577A3]">Workspace overview</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1533]">Dashboard</h1>
            <p className="mt-1 text-sm text-[#5B4B7A]">Your proposals, approvals and priorities in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#E4DCF0] bg-[#FFFFFF] px-3 py-2 text-sm font-medium text-[#5B4B7A] hover:bg-[#F1EBFA]"><ArrowClockwise size={16} /> Refresh</button>
            {canCreate && <button type="button" onClick={() => navigate('/dashboard/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#9B30FF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Plus size={16} /> New Proposal</button>}
          </div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section aria-label="Key metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(item => <div key={item.label} className="rounded-xl border border-[#E4DCF0] bg-[#FFFFFF] p-5">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[#5B4B7A]">{item.label}</span><item.icon size={19} className="text-[#8577A3]" /></div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#1E1533]">{item.value}</p>
            <p className="mt-1 text-xs text-[#8577A3]">{item.detail}</p>
          </div>)}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
          <section className="overflow-hidden rounded-xl border border-[#E4DCF0] bg-[#FFFFFF]">
            <div className="flex items-center justify-between border-b border-[#E4DCF0] px-5 py-4">
              <div><h2 className="text-base font-semibold text-[#1E1533]">Needs attention</h2><p className="mt-0.5 text-xs text-[#8577A3]">Proposals with reported bottlenecks</p></div>
              <span className="rounded-full bg-[#F7F4FC] px-2.5 py-1 text-xs font-semibold text-[#5B4B7A]">{alerts.length}</span>
            </div>
            {alerts.length ? <div className="divide-y divide-[#E4DCF0]">
              {alerts.slice(0, 5).map(item => <button type="button" key={item.id} onClick={() => navigate(`/dashboard/proposal/${item.id}`)} className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-[#F7F4FC]">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1E1533]">{item.title}</p><p className="mt-1 text-xs text-[#8577A3]">{item.status_label || statusLabel(item.status)}</p></div>
                <span className="shrink-0 text-xs font-semibold text-[#D97706]">{item.days_stuck} days waiting</span>
              </button>)}
            </div> : <div className="flex items-center gap-3 px-5 py-8 text-sm text-[#5B4B7A]"><CheckCircle size={20} className="text-[#059669]" /> No bottlenecks reported.</div>}
          </section>
          <section className="rounded-xl border border-[#E4DCF0] bg-[#FFFFFF]">
            <div className="border-b border-[#E4DCF0] px-5 py-4"><h2 className="text-base font-semibold text-[#1E1533]">Recent activity</h2><p className="mt-0.5 text-xs text-[#8577A3]">Latest proposal updates</p></div>
            <div className="divide-y divide-[#E4DCF0]">
              {(analytics.activity?.activities || []).slice(0, 5).map((item, index) => <div key={index} className="px-5 py-3">
                <p className="text-sm text-[#1E1533]"><span className="font-semibold">{item.by?.name || 'Team member'}</span> {String(item.action || 'updated').replace(/_/g, ' ')} <span className="font-medium">{item.proposal_title || 'a proposal'}</span></p>
                <p className="mt-1 text-xs text-[#8577A3]">{date(item.timestamp)}</p>
              </div>)}
              {!(analytics.activity?.activities || []).length && <p className="px-5 py-8 text-sm text-[#8577A3]">No recent activity.</p>}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#E4DCF0] bg-[#FFFFFF]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DCF0] px-5 py-4">
            <div><h2 className="text-base font-semibold text-[#1E1533]">Proposals</h2><p className="mt-0.5 text-xs text-[#8577A3]">{filtered.length} matching proposals</p></div>
            <button type="button" onClick={() => navigate('/dashboard/my-proposals')} className="inline-flex items-center gap-1 text-sm font-semibold text-[#8126DB] hover:underline">My Proposals <ArrowRight size={15} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E4DCF0] px-5 py-3">
            <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border border-[#E4DCF0] bg-[#F7F4FC] px-3 py-2">
              <MagnifyingGlass size={16} className="text-[#8577A3]" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search proposals or customers" aria-label="Search dashboard proposals" className="w-full min-w-0 bg-transparent text-sm text-[#1E1533] outline-none" data-testid="search-input" />
            </label>
            <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter dashboard proposals" className="rounded-lg border border-[#E4DCF0] bg-[#FFFFFF] px-3 py-2 text-sm text-[#1E1533]">
              <option value="all">All statuses</option><option value="review">Under review</option><option value="approved">Approved</option><option value="needs_revision">Needs revision</option><option value="sales_submitted">Submitted</option><option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F4FC] text-xs font-semibold uppercase tracking-wide text-[#5B4B7A]"><tr>
                <th className="px-5 py-3">Proposal / Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Deal value</th><th className="px-5 py-3">Days in pipeline</th><th className="px-5 py-3">Updated</th>
              </tr></thead>
              <tbody className="divide-y divide-[#E4DCF0]">
                {filtered.slice(0, 12).map(p => <tr key={p.id} data-testid={`proposal-${p.id}`} className="hover:bg-[#F7F4FC]">
                  <td className="px-5 py-3"><button type="button" onClick={() => navigate(`/dashboard/proposal/${p.id}`)} className="max-w-[260px] truncate text-left font-semibold text-[#1E1533] hover:text-[#8126DB] hover:underline">{p.title}</button><p className="text-xs text-[#8577A3]">{p.customer_name || '—'}</p></td>
                  <td className="px-5 py-3"><span className="inline-flex rounded-md bg-[#F1EBFA] px-2 py-1 text-xs font-medium text-[#5B4B7A]">{p.status === 'in_review' ? p.workflow_view?.status_label || 'In review' : statusLabel(p.status)}</span></td>
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-[#1E1533]">{currency(p.deal_value)}</td>
                  <td className="px-5 py-3"><DspBadge dsp={p.dsp} variant="compact" /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-[#8577A3]">{date(p.updated_at)}</td>
                </tr>)}
                {!filtered.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8577A3]">{proposals.length ? 'No proposals match your search.' : 'No proposals yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {filtered.length > 12 && <div className="border-t border-[#E4DCF0] px-5 py-3 text-xs text-[#8577A3]">Showing 12 of {filtered.length} matching proposals. Use My Proposals for your full list.</div>}
        </section>
      </div>
    </div>
  );
};

export default Overview;
