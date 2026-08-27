import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, FileText, Clock, TrendUp, Warning, CheckCircle, Funnel, CurrencyInr, CalendarBlank, CaretLeft, CaretRight, Table, SquaresFour } from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

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
    dealValue: null,
    monthlyData: null
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'pipeline'
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAll();
  }, [selectedMonth, selectedYear]);

  const fetchAll = async () => {
    try {
      const [proposalsRes, stageRes, approvalRes, bottleneckRes, activityRes, throughputRes, slaRes, dealValueRes, monthlyRes] = await Promise.all([
        axios.get(`${API}/proposals`, { withCredentials: true }),
        axios.get(`${API}/analytics/stage-counts`, { withCredentials: true }),
        axios.get(`${API}/analytics/approval-rate`, { withCredentials: true }),
        axios.get(`${API}/analytics/bottlenecks`, { withCredentials: true }),
        axios.get(`${API}/analytics/activity-feed`, { withCredentials: true }),
        axios.get(`${API}/analytics/throughput`, { withCredentials: true }),
        axios.get(`${API}/analytics/sla-health`, { withCredentials: true }),
        axios.get(`${API}/analytics/deal-value-summary`, { withCredentials: true }),
        axios.get(`${API}/analytics/monthly-proposals?year=${selectedYear}&month=${selectedMonth}`, { withCredentials: true })
      ]);

      setProposals(proposalsRes.data);
      setAnalytics({
        stageCounts: stageRes.data,
        approvalRate: approvalRes.data,
        bottlenecks: bottleneckRes.data,
        activityFeed: activityRes.data,
        throughput: throughputRes.data,
        slaHealth: slaRes.data,
        dealValue: dealValueRes.data,
        monthlyData: monthlyRes.data
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.customer_name && p.customer_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Functional status colors per the Botree design system
  const getStatusColor = (status) => {
    if (status === 'approved') return { backgroundColor: '#0F3D2E', color: '#34D399' };
    if (status === 'needs_revision') return { backgroundColor: '#3D1424', color: '#FB7185' };
    if (status === 'sales_submitted') return { backgroundColor: '#3D2A0F', color: '#FBBF24' };
    return { backgroundColor: '#2A1745', color: '#E64AD1' }; // *_review states = Under Review
  };

  const getStatusLabel = (status) => {
    const labels = {
      sales_submitted: 'Draft',
      cgo_review: 'Under Review · CGO',
      finance_review: 'Under Review · Finance',
      legal_review: 'Under Review · Legal',
      cfo_review: 'Under Review · CFO',
      approved: 'Approved',
      needs_revision: 'Needs Revision'
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

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const winRate = analytics.approvalRate?.approval_percentage || 0;
  const underReviewCount = analytics.stageCounts?.under_review || 0;
  const activeCount = analytics.monthlyData?.active_proposals ?? filteredProposals.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-113px)] bg-[#150E29]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#9B30FF]"></div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Active Proposals',
      value: activeCount,
      sub: `${formatCurrency(analytics.dealValue?.active_pipeline_value)} in value`,
      icon: FileText,
      accent: '#9B30FF'
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      sub: `${analytics.approvalRate?.approved_count || 0} of ${analytics.approvalRate?.total_proposals || 0} approved`,
      icon: TrendUp,
      accent: '#34D399'
    },
    {
      label: 'Proposals Under Review',
      value: underReviewCount,
      sub: analytics.slaHealth?.critical_count > 0 ? `${analytics.slaHealth.critical_count} critical` : 'Healthy',
      icon: Clock,
      accent: '#C026D3'
    },
    {
      label: 'Total Pipeline Value',
      value: formatCurrency(analytics.dealValue?.active_pipeline_value),
      sub: 'Active deals',
      icon: CurrencyInr,
      accent: '#E64AD1'
    }
  ];

  return (
    <div className="min-h-screen bg-[#150E29]" data-testid="overview-page">
      <div className="px-6 py-6 max-w-[1600px] mx-auto space-y-6">

        {/* Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarBlank size={20} className="text-[#9B30FF]" />
            <span className="text-sm font-semibold text-[#B9AED4]">Monthly Stats:</span>
            <span className="text-lg font-bold text-[#F5F3FA]">{analytics.monthlyData?.month_name || 'Loading...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigateMonth(-1)} size="sm" variant="ghost" className="text-[#B9AED4] hover:text-[#F5F3FA]">
              <CaretLeft size={18} weight="bold" />
            </Button>
            {!analytics.monthlyData?.is_current_month && (
              <Button onClick={goToCurrentMonth} size="sm" variant="outline" className="text-xs border-[#9B30FF] text-[#9B30FF] hover:bg-[#9B30FF]/5">
                Current Month
              </Button>
            )}
            <Button
              onClick={() => navigateMonth(1)}
              size="sm"
              variant="ghost"
              className="text-[#B9AED4] hover:text-[#F5F3FA]"
              disabled={analytics.monthlyData?.is_current_month}
            >
              <CaretRight size={18} weight="bold" />
            </Button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">{card.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.accent}1A` }}>
                  <card.icon size={16} style={{ color: card.accent }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#F5F3FA] mb-1">{card.value}</div>
              <div className="text-xs text-[#8B7FAE]">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters + View Switcher */}
        <div className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#150E29] border border-[#3D2A5C] rounded-lg px-3 py-2">
              <MagnifyingGlass size={16} className="text-[#8B7FAE]" />
              <Input
                type="text"
                placeholder="Search proposals by title, client, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="search-input"
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-[#F5F3FA] placeholder:text-[#6B5D91] p-0 h-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Funnel size={16} className="text-[#8B7FAE]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#150E29] border border-[#3D2A5C] text-[#F5F3FA] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF]"
              >
                <option value="all">All Status</option>
                <option value="sales_submitted">Draft</option>
                <option value="cgo_review">CGO Review</option>
                <option value="finance_review">Finance Review</option>
                <option value="legal_review">Legal Review</option>
                <option value="cfo_review">CFO Review</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs Revision</option>
              </select>
            </div>
            <div className="flex items-center bg-[#150E29] border border-[#3D2A5C] rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  viewMode === 'table' ? 'bg-[#1E1533] text-[#9B30FF] shadow-sm' : 'text-[#B9AED4]'
                }`}
              >
                <Table size={14} /> Table
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  viewMode === 'pipeline' ? 'bg-[#1E1533] text-[#9B30FF] shadow-sm' : 'text-[#B9AED4]'
                }`}
              >
                <SquaresFour size={14} /> Pipeline
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Main data table / pipeline */}
          <div className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D2A5C]">
              <h2 className="text-base font-bold text-[#F5F3FA]">Proposal Pipeline</h2>
              <span className="text-sm text-[#B9AED4]">{filteredProposals.length} proposals</span>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#150E29] border-b border-[#3D2A5C]">
                    <tr>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Proposal ID</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Client Name</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Deal Value</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Stage / Status</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Commercial Lead</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-[#B9AED4] uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3D2A5C]">
                    {filteredProposals.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-[#8B7FAE] text-sm">
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
                            className="hover:bg-[#150E29] cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-5 text-[#B9AED4] font-mono text-xs">#{String(index + 1).padStart(3, '0')}</td>
                            <td className="py-3 px-5">
                              <div className="text-[#F5F3FA] font-semibold text-sm mb-0.5 truncate max-w-[240px]">{proposal.title}</div>
                              {proposal.customer_name && (
                                <div className="text-xs text-[#8B7FAE]">{proposal.customer_name}</div>
                              )}
                            </td>
                            <td className="py-3 px-5">
                              <span className="text-[#34D399] font-semibold">{formatCurrency(proposal.deal_value)}</span>
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2">
                                {isBottleneck && <Warning size={14} className="text-[#E11D48]" />}
                                <Badge
                                  className="text-xs font-semibold px-2.5 py-1 border-0"
                                  style={getStatusColor(proposal.status)}
                                  data-testid={`status-${proposal.id}`}
                                >
                                  {getStatusLabel(proposal.status)}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                  style={{ backgroundColor: '#9B30FF' }}
                                >
                                  {proposal.created_by.name[0]}
                                </div>
                                <span className="text-[#B9AED4] text-xs">{proposal.created_by.name.split(' ')[0]}</span>
                              </div>
                            </td>
                            <td className="py-3 px-5 text-[#8B7FAE] text-xs">
                              {new Date(proposal.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {['sales_submitted', 'cgo_review', 'finance_review', 'legal_review', 'cfo_review', 'approved'].map((stage) => {
                  const stageProposals = filteredProposals.filter(p => p.status === stage);
                  return (
                    <div key={stage} className="bg-[#150E29] border border-[#3D2A5C] rounded-lg p-3 min-h-[120px]">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="text-xs font-semibold px-2 py-1 border-0" style={getStatusColor(stage)}>
                          {getStatusLabel(stage)}
                        </Badge>
                        <span className="text-xs text-[#8B7FAE] font-semibold">{stageProposals.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageProposals.slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            onClick={() => navigate(`/dashboard/proposal/${p.id}`)}
                            className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg p-2.5 cursor-pointer hover:shadow-sm transition-shadow"
                          >
                            <div className="text-xs font-semibold text-[#F5F3FA] truncate">{p.title}</div>
                            <div className="text-xs text-[#34D399] font-semibold mt-1">{formatCurrency(p.deal_value)}</div>
                          </div>
                        ))}
                        {stageProposals.length === 0 && (
                          <p className="text-xs text-[#CBD5E1] text-center py-4">No proposals</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Analytics Panel */}
          <div className="space-y-4">
            {/* Live Activity Feed */}
            <div className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#F5F3FA] uppercase tracking-wider">Live System Activity</h3>
                <Clock size={16} className="text-[#8B7FAE]" />
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-3">
                {analytics.activityFeed?.activities?.length === 0 ? (
                  <p className="text-[#8B7FAE] text-xs text-center py-4">No recent activity</p>
                ) : (
                  analytics.activityFeed?.activities?.map((activity, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b border-[#F1F5F9] last:border-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: '#9B30FF' }}
                      >
                        {activity.by.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#B9AED4] mb-1">
                          <span className="font-semibold text-[#F5F3FA]">{activity.by.name}</span>
                          <span className="text-[#8B7FAE] mx-1">
                            {activity.action === 'approved' ? 'approved' : activity.action === 'rejected' ? 'rejected' : 'updated'}
                          </span>
                          <span className="text-[#B9AED4] truncate inline-block max-w-[160px] align-bottom">{activity.proposal_title}</span>
                        </div>
                        <div className="text-[10px] text-[#CBD5E1]">{formatTimestamp(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottleneck Alerts */}
            <div className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#F5F3FA] uppercase tracking-wider">Bottleneck Alerts</h3>
                <Warning size={16} className="text-[#D97706]" />
              </div>
              {analytics.bottlenecks?.bottlenecks?.length === 0 ? (
                <div className="flex items-center gap-2 text-[#34D399] text-sm">
                  <CheckCircle size={18} weight="fill" />
                  <span>All proposals flowing smoothly</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.bottlenecks?.bottlenecks?.slice(0, 5).map((bottleneck) => (
                    <div
                      key={bottleneck.id}
                      onClick={() => navigate(`/dashboard/proposal/${bottleneck.id}`)}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#3D1424' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#F5F3FA] truncate">{bottleneck.title}</div>
                        <div className="text-[10px] text-[#B9AED4]">{getStatusLabel(bottleneck.status)}</div>
                      </div>
                      <div className="text-xs font-bold text-[#E11D48] shrink-0 ml-2">{bottleneck.days_stuck}d</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Health / Approval Rate */}
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#0F3D2E', borderColor: '#1D6B4F' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#6EE7B7]">Approval Rate</span>
                <span className="text-2xl font-bold text-[#34D399]">{winRate}%</span>
              </div>
              <div className="h-2 bg-[#1E1533]/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${winRate}%`, backgroundColor: '#34D399' }}
                ></div>
              </div>
              <div className="mt-3 text-[10px] text-[#6EE7B7]">
                {analytics.approvalRate?.approved_count} of {analytics.approvalRate?.total_proposals} proposals approved
              </div>
            </div>

            {/* Throughput Sparkline */}
            <div className="bg-[#1E1533] rounded-xl border border-[#3D2A5C] shadow-sm p-4">
              <h3 className="text-xs font-bold text-[#F5F3FA] uppercase tracking-wider mb-3">30-Day Throughput</h3>
              <div className="flex items-end justify-between h-16 gap-0.5">
                {analytics.throughput?.sparkline?.map((value, idx) => {
                  const maxValue = Math.max(...(analytics.throughput?.sparkline || [1]));
                  const height = maxValue > 0 ? (value / maxValue * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t"
                      style={{ height: `${height}%`, minHeight: value > 0 ? '2px' : '0', backgroundColor: '#9B30FF', opacity: 0.7 }}
                    ></div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-[#B9AED4]">
                {analytics.throughput?.throughput_per_day || 0} approvals/day avg
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
