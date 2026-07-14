import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, FileText, Clock, TrendUp, Warning, CheckCircle, X, Funnel, CurrencyDollar } from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Overview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [analytics, setAnalytics] = useState({
    stageCounts: null,
    approvalRate: null,
    bottlenecks: null,
    activityFeed: null,
    throughput: null,
    slaHealth: null,
    dealValue: null
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [proposalsRes, stageRes, approvalRes, bottleneckRes, activityRes, throughputRes, slaRes, dealValueRes] = await Promise.all([
        axios.get(`${API}/proposals`, { withCredentials: true }),
        axios.get(`${API}/analytics/stage-counts`, { withCredentials: true }),
        axios.get(`${API}/analytics/approval-rate`, { withCredentials: true }),
        axios.get(`${API}/analytics/bottlenecks`, { withCredentials: true }),
        axios.get(`${API}/analytics/activity-feed`, { withCredentials: true }),
        axios.get(`${API}/analytics/throughput`, { withCredentials: true }),
        axios.get(`${API}/analytics/sla-health`, { withCredentials: true }),
        axios.get(`${API}/analytics/deal-value-summary`, { withCredentials: true })
      ]);
      
      setProposals(proposalsRes.data);
      setAnalytics({
        stageCounts: stageRes.data,
        approvalRate: approvalRes.data,
        bottlenecks: bottleneckRes.data,
        activityFeed: activityRes.data,
        throughput: throughputRes.data,
        slaHealth: slaRes.data,
        dealValue: dealValueRes.data
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.description.toLowerCase().includes(search.toLowerCase()) ||
                          (p.customer_name && p.customer_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    if (status === 'approved') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'needs_revision') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  const getStatusLabel = (status) => {
    const labels = {
      sales_submitted: 'Sales Review',
      cgo_review: 'CGO Review',
      finance_review: 'Finance Review',
      legal_review: 'Legal Review',
      cfo_review: 'CFO Review',
      approved: 'Approved',
      needs_revision: 'Revision'
    };
    return labels[status] || status;
  };

  const formatCurrency = (value) => {
    if (!value) return '₹0';
    return `₹${(value / 100000).toFixed(1)}L`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111827]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white" data-testid="overview-page">
      {/* Top Utility Bar */}
      <div className="bg-[#1F2937] border-b border-[#374151] px-6 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex-1 flex items-center gap-3 bg-[#111827] border border-[#374151] rounded-lg px-4 py-2">
            <MagnifyingGlass size={18} className="text-gray-400" />
            <Input
              type="text"
              placeholder="Search proposals by title, client, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
              className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-white placeholder:text-gray-500 p-0 h-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Funnel size={18} className="text-gray-400" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#111827] border border-[#374151] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="sales_submitted">Sales Review</option>
              <option value="cgo_review">CGO Review</option>
              <option value="finance_review">Finance Review</option>
              <option value="legal_review">Legal Review</option>
              <option value="cfo_review">CFO Review</option>
              <option value="approved">Approved</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview Bar */}
      <div className="bg-[#1F2937] border-b border-[#374151] px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Active Queue */}
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Pipeline</span>
              <FileText size={16} className="text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-white">{analytics.stageCounts?.under_review || 0}</span>
              <div className="text-xs text-gray-400 space-x-2">
                <span className="text-emerald-400">{analytics.stageCounts?.approved || 0} Won</span>
                <span>•</span>
                <span className="text-amber-400">{analytics.stageCounts?.needs_revision || 0} Revision</span>
              </div>
            </div>
          </div>

          {/* SLA Health */}
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SLA Health</span>
              <Warning size={16} className={analytics.slaHealth?.critical_count > 0 ? "text-red-400" : "text-emerald-400"} />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-white">{analytics.slaHealth?.health_percentage || 0}%</span>
              {analytics.slaHealth?.critical_count > 0 && (
                <span className="text-xs text-red-400 font-semibold">{analytics.slaHealth.critical_count} Critical</span>
              )}
            </div>
          </div>

          {/* Deal Value */}
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline Value</span>
              <CurrencyDollar size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{formatCurrency(analytics.dealValue?.active_pipeline_value)}</span>
              <span className="text-xs text-gray-400">Active</span>
            </div>
          </div>

          {/* Throughput */}
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">30-Day Velocity</span>
              <TrendUp size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-white">{analytics.throughput?.approved_last_30_days || 0}</span>
              <span className="text-xs text-gray-400">Closed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace - Split Layout */}
      <div className="flex gap-0 h-[calc(100vh-180px)]">
        {/* LEFT: Master Proposal Queue (60%) */}
        <div className="w-[60%] border-r border-[#374151] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Master Proposal Queue</h2>
              <span className="text-sm text-gray-400">{filteredProposals.length} proposals</span>
            </div>

            {/* Dense Table */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#111827] border-b border-[#374151]">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client / Title</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Value</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Modified</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500 text-sm">
                        No proposals found
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((proposal, index) => {
                      const isBottleneck = analytics.bottlenecks?.bottlenecks.some(b => b.id === proposal.id);
                      return (
                        <tr
                          key={proposal.id}
                          onClick={() => navigate(`/dashboard/proposal/${proposal.id}`)}
                          data-testid={`proposal-${proposal.id}`}
                          className="hover:bg-[#374151]/30 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-3 text-gray-300 font-mono text-xs">#{String(index + 1).padStart(3, '0')}</td>
                          <td className="py-2 px-3">
                            <div>
                              <div className="text-white font-semibold text-sm mb-0.5 truncate max-w-[280px]">{proposal.title}</div>
                              {proposal.customer_name && (
                                <div className="text-xs text-gray-400">{proposal.customer_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-400 font-semibold">{formatCurrency(proposal.deal_value)}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                {proposal.created_by.name[0]}
                              </div>
                              <span className="text-gray-300 text-xs">{proposal.created_by.name.split(' ')[0]}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-400 text-xs">
                            {new Date(proposal.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {isBottleneck && <Warning size={14} className="text-red-400" />}
                              <Badge className={`${getStatusColor(proposal.status)} text-xs border px-2 py-0.5`} data-testid={`status-${proposal.id}`}>
                                {getStatusLabel(proposal.status)}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Activity Feed + AI Insights (40%) */}
        <div className="w-[40%] overflow-auto">
          <div className="p-6 space-y-6">
            {/* Live Activity Feed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live System Activity</h3>
                <Clock size={16} className="text-gray-400" />
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 max-h-[320px] overflow-y-auto space-y-3">
                {analytics.activityFeed?.activities?.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-4">No recent activity</p>
                ) : (
                  analytics.activityFeed?.activities?.map((activity, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b border-[#374151] last:border-0">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          {activity.by.name[0]}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 mb-1">
                          <span className="font-semibold text-white">{activity.by.name}</span>
                          <span className="text-gray-400 mx-1">
                            {activity.action === 'approved' ? 'approved' : activity.action === 'rejected' ? 'rejected' : 'updated'}
                          </span>
                          <span className="text-gray-300 truncate inline-block max-w-[180px] align-bottom">{activity.proposal_title}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">{formatTimestamp(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottleneck Alerts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bottleneck Alerts</h3>
                <Warning size={16} className="text-amber-400" />
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-4">
                {analytics.bottlenecks?.bottlenecks?.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle size={18} weight="fill" />
                    <span>All proposals flowing smoothly</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analytics.bottlenecks?.bottlenecks?.slice(0, 5).map((bottleneck) => (
                      <div 
                        key={bottleneck.id} 
                        onClick={() => navigate(`/dashboard/proposal/${bottleneck.id}`)}
                        className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded cursor-pointer hover:bg-red-500/20 transition"
                      >
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white truncate">{bottleneck.title}</div>
                          <div className="text-[10px] text-gray-400">{getStatusLabel(bottleneck.status)}</div>
                        </div>
                        <div className="text-xs font-bold text-red-400">{bottleneck.days_stuck}d</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Compliance Check */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Health</h3>
                <TrendUp size={16} className="text-emerald-400" />
              </div>
              <div className="bg-gradient-to-br from-emerald-900/20 to-indigo-900/20 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-300">Approval Rate</span>
                  <span className="text-2xl font-bold text-emerald-400">{analytics.approvalRate?.approval_percentage || 0}%</span>
                </div>
                <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${analytics.approvalRate?.approval_percentage || 0}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-[10px] text-gray-400">
                  {analytics.approvalRate?.approved_count} of {analytics.approvalRate?.total_proposals} proposals approved
                </div>
              </div>
            </div>

            {/* Throughput Sparkline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">30-Day Throughput</h3>
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-4">
                <div className="flex items-end justify-between h-16 gap-0.5">
                  {analytics.throughput?.sparkline?.map((value, idx) => {
                    const maxValue = Math.max(...(analytics.throughput?.sparkline || [1]));
                    const height = maxValue > 0 ? (value / maxValue * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-emerald-500/30 rounded-t"
                        style={{ height: `${height}%`, minHeight: value > 0 ? '2px' : '0' }}
                      ></div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {analytics.throughput?.throughput_per_day || 0} approvals/day avg
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
