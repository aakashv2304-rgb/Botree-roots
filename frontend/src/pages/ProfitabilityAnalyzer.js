import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calculator, Plus, X, Trash, PencilSimple, CaretDown, CaretUp } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ALLOCATION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 10); // 10,20,...100

const emptyResourceLine = () => ({ role_name: '', allocation_percent: '100' });
const emptyRevenueLineItem = (label = '') => ({ label, revenue: '', distributor_count: '', selected_distributor_costs: [], resource_lines: [] });

const ProfitabilityAnalyzer = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [rateCard, setRateCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [title, setTitle] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([emptyRevenueLineItem()]);

  useEffect(() => {
    fetchAnalyses();
    fetchProposals();
    fetchRateCard();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data } = await axios.get(`${API}/profitability-analyses`, { withCredentials: true });
      setAnalyses(data);
    } catch (error) {
      toast.error('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals`, { withCredentials: true });
      setProposals(data);
    } catch (error) {
      // non-fatal
    }
  };

  const fetchRateCard = async () => {
    try {
      const { data } = await axios.get(`${API}/profitability-analyses/rate-card`, { withCredentials: true });
      setRateCard(data);
    } catch (error) {
      toast.error('Failed to load rate card');
    }
  };

  // Client-side mirror of the backend calculation, for live preview only.
  // The backend recomputes authoritatively on save using the same fixed rates.
  const computeLineItem = (item) => {
    if (!rateCard) return { manualCost: 0, autoCost: 0, totalCost: 0, autoBreakdown: null };

    const manualCost = item.resource_lines.reduce((sum, rl) => {
      const monthlyCost = rateCard.roles[rl.role_name] || 0;
      const pct = parseFloat(rl.allocation_percent) || 0;
      return sum + (monthlyCost * pct) / 100;
    }, 0);

    const distributors = parseFloat(item.distributor_count) || 0;
    let autoBreakdown = null;
    let autoCost = 0;
    if (distributors > 0) {
      const l2Required = distributors * rateCard.staffing_ratios.L2;
      const l3Required = distributors * rateCard.staffing_ratios.L3;
      const l2Cost = l2Required * rateCard.auto_roles.L2;
      const l3Cost = l3Required * rateCard.auto_roles.L3;

      const licenseCosts = {};
      let licenseTotal = 0;
      (item.selected_distributor_costs || []).forEach((costName) => {
        const rate = rateCard.per_distributor_costs[costName];
        if (rate !== undefined) {
          const value = distributors * rate;
          licenseCosts[costName] = value;
          licenseTotal += value;
        }
      });

      autoCost = l2Cost + l3Cost + licenseTotal;
      autoBreakdown = { l2Required, l2Cost, l3Required, l3Cost, licenseCosts };
    }

    return { manualCost, autoCost, totalCost: manualCost + autoCost, autoBreakdown };
  };

  const resetForm = () => {
    setTitle('');
    setProposalId('');
    setNotes('');
    setLineItems([emptyRevenueLineItem()]);
    setEditingId(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (analysis) => {
    setEditingId(analysis.id);
    setTitle(analysis.title);
    setProposalId(analysis.proposal_id || '');
    setNotes(analysis.notes || '');
    setLineItems(
      analysis.revenue_line_items.length > 0
        ? analysis.revenue_line_items.map((li) => ({
            label: li.label,
            revenue: li.revenue ?? '',
            distributor_count: li.distributor_count ?? '',
            selected_distributor_costs: li.selected_distributor_costs || [],
            resource_lines: (li.resource_lines || []).map((rl) => ({
              role_name: rl.role_name,
              allocation_percent: String(rl.allocation_percent)
            }))
          }))
        : [emptyRevenueLineItem()]
    );
    setShowForm(true);
  };

  // Extract a plain number out of a free-text "users" field like "50 users" or "50"
  const parseUsersCount = (usersText) => {
    if (!usersText) return null;
    const match = String(usersText).match(/[\d,.]+/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  };

  const handleProposalSelect = (id) => {
    setProposalId(id);
    if (!id) {
      setLineItems([emptyRevenueLineItem()]);
      return;
    }
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) return;

    const items = [];
    (proposal.products || []).forEach((p) => {
      const item = emptyRevenueLineItem(p.product_name);

      // Revenue = higher of (price/user x users) and minimum billing -
      // standard SaaS minimum-commitment model
      const usersCount = parseUsersCount(p.users);
      const perUserRevenue = p.price_per_user && usersCount ? p.price_per_user * usersCount : null;
      const minBilling = p.minimum_billing || null;
      let suggestedRevenue = null;
      if (perUserRevenue !== null && minBilling !== null) {
        suggestedRevenue = Math.max(perUserRevenue, minBilling);
      } else if (perUserRevenue !== null) {
        suggestedRevenue = perUserRevenue;
      } else if (minBilling !== null) {
        suggestedRevenue = minBilling;
      }
      if (suggestedRevenue !== null) {
        item.revenue = String(suggestedRevenue);
      }
      items.push(item);

      // Training gets its own separate revenue line item
      if (p.training) {
        const trainingItem = emptyRevenueLineItem(`${p.product_name} - Training`);
        trainingItem.revenue = String(p.training);
        items.push(trainingItem);
      }
    });
    if (proposal.one_time_setup_fee) {
      const item = emptyRevenueLineItem('One-Time Setup & Integration');
      item.revenue = String(proposal.one_time_setup_fee);
      items.push(item);
    }
    (proposal.additional_fees || []).forEach((f) => {
      const item = emptyRevenueLineItem(f.name);
      item.revenue = String(f.value);
      items.push(item);
    });

    setLineItems(items.length > 0 ? items : [emptyRevenueLineItem()]);
  };

  const addLineItem = () => setLineItems([...lineItems, emptyRevenueLineItem()]);
  const removeLineItem = (index) => setLineItems(lineItems.filter((_, i) => i !== index));
  const updateLineItemField = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const toggleDistributorCost = (itemIndex, costName) => {
    const updated = [...lineItems];
    const current = updated[itemIndex].selected_distributor_costs || [];
    updated[itemIndex].selected_distributor_costs = current.includes(costName)
      ? current.filter((c) => c !== costName)
      : [...current, costName];
    setLineItems(updated);
  };

  const addResourceLine = (itemIndex) => {
    const updated = [...lineItems];
    updated[itemIndex].resource_lines.push(emptyResourceLine());
    setLineItems(updated);
  };
  const removeResourceLine = (itemIndex, lineIndex) => {
    const updated = [...lineItems];
    updated[itemIndex].resource_lines = updated[itemIndex].resource_lines.filter((_, i) => i !== lineIndex);
    setLineItems(updated);
  };
  const updateResourceLine = (itemIndex, lineIndex, field, value) => {
    const updated = [...lineItems];
    updated[itemIndex].resource_lines[lineIndex][field] = value;
    setLineItems(updated);
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // Live preview totals
  const totals = lineItems.reduce(
    (acc, item) => {
      const { totalCost } = computeLineItem(item);
      acc.totalCost += totalCost;
      if (item.revenue !== '') {
        acc.totalRevenue += parseFloat(item.revenue) || 0;
        acc.anyRevenue = true;
      }
      return acc;
    },
    { totalCost: 0, totalRevenue: 0, anyRevenue: false }
  );
  const totalProfit = totals.anyRevenue ? totals.totalRevenue - totals.totalCost : null;
  const totalMargin = totals.anyRevenue && totals.totalRevenue > 0 ? (totalProfit / totals.totalRevenue) * 100 : null;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for this analysis');
      return;
    }
    for (const li of lineItems) {
      for (const rl of li.resource_lines) {
        if (rl.role_name && !rateCard.roles[rl.role_name]) {
          toast.error(`Please select a valid role for "${li.label}"`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload = {
        title,
        proposal_id: proposalId || null,
        revenue_line_items: lineItems
          .filter((li) => li.label)
          .map((li) => ({
            label: li.label,
            revenue: li.revenue !== '' ? parseFloat(li.revenue) : null,
            distributor_count: li.distributor_count !== '' ? parseFloat(li.distributor_count) : null,
            selected_distributor_costs: li.selected_distributor_costs || [],
            resource_lines: li.resource_lines
              .filter((rl) => rl.role_name)
              .map((rl) => ({
                role_name: rl.role_name,
                allocation_percent: parseFloat(rl.allocation_percent) || 0
              }))
          })),
        notes: notes || null
      };

      if (editingId) {
        await axios.put(`${API}/profitability-analyses/${editingId}`, payload, { withCredentials: true });
        toast.success('Analysis updated');
      } else {
        await axios.post(`${API}/profitability-analyses`, payload, { withCredentials: true });
        toast.success('Analysis saved');
      }
      setShowForm(false);
      resetForm();
      fetchAnalyses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save analysis');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this analysis?')) return;
    try {
      await axios.delete(`${API}/profitability-analyses/${id}`, { withCredentials: true });
      toast.success('Analysis deleted');
      fetchAnalyses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const canEdit = (analysis) => analysis.created_by?.id === user?.id || user?.role === 'Admin';

  if (loading || !rateCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F172A]"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="profitability-analyzer-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight mb-2 flex items-center gap-3">
            <Calculator size={36} className="text-purple-600" />
            Deal Profitability Analyzer
          </h1>
          <p className="text-gray-600 font-body">
            Model resource costs against each revenue line item to see real margin
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={openNewForm}
            className="text-white font-semibold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
            data-testid="new-analysis-button"
          >
            <Plus size={18} className="mr-2" />
            New Analysis
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-[#E4E4E7] shadow-sm p-8 mb-8 animate-scale-in" data-testid="analysis-form">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Analysis' : 'New Analysis'}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Analysis Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Acme Corp - CRM Rollout"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Link to a Proposal (optional)</Label>
              <Select value={proposalId || 'none'} onValueChange={(v) => handleProposalSelect(v === 'none' ? '' : v)}>
                <SelectTrigger data-testid="proposal-link-select">
                  <SelectValue placeholder="None - standalone analysis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - standalone analysis</SelectItem>
                  {proposals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {proposalId && (
                <p className="text-xs text-gray-500">
                  Revenue line items auto-filled below from this proposal's products and fees.
                </p>
              )}
            </div>
          </div>

          {/* Revenue Line Items */}
          <div className="space-y-5">
            {lineItems.map((item, itemIndex) => {
              const { manualCost, totalCost, autoBreakdown } = computeLineItem(item);
              const revenueNum = item.revenue !== '' ? parseFloat(item.revenue) || 0 : null;
              const profit = revenueNum !== null ? revenueNum - totalCost : null;
              const margin = revenueNum ? (profit / revenueNum) * 100 : null;

              return (
                <div key={itemIndex} className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Revenue Line Item</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => updateLineItemField(itemIndex, 'label', e.target.value)}
                          placeholder="e.g., DMS Software"
                          className="h-10 bg-white font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Revenue (₹)</Label>
                        <Input
                          type="number"
                          value={item.revenue}
                          onChange={(e) => updateLineItemField(itemIndex, 'revenue', e.target.value)}
                          placeholder="e.g., 600000"
                          className="h-10 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Number of Distributors</Label>
                        <Input
                          type="number"
                          value={item.distributor_count}
                          onChange={(e) => updateLineItemField(itemIndex, 'distributor_count', e.target.value)}
                          placeholder="e.g., 1000"
                          className="h-10 bg-white"
                        />
                        <p className="text-[10px] text-gray-500">Auto-adds L2/L3 + any licenses you select below</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeLineItem(itemIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 mt-5"
                      disabled={lineItems.length === 1}
                    >
                      <Trash size={18} />
                    </Button>
                  </div>

                  {/* Distributor-driven costs: license checkboxes + auto L2/L3 */}
                  {parseFloat(item.distributor_count) > 0 && rateCard && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-2">
                        Which licenses does this line item include?
                      </p>
                      <div className="flex flex-wrap gap-3 mb-3">
                        {Object.keys(rateCard.per_distributor_costs).map((costName) => {
                          const rate = rateCard.per_distributor_costs[costName];
                          const checked = (item.selected_distributor_costs || []).includes(costName);
                          return (
                            <label key={costName} className="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded border border-gray-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDistributorCost(itemIndex, costName)}
                                className="accent-purple-600"
                              />
                              {costName} {rate === 0 && <span className="text-gray-400">(rate pending)</span>}
                            </label>
                          );
                        })}
                      </div>

                      {autoBreakdown && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <div className="bg-white rounded px-2 py-1.5">
                            <p className="text-gray-500">L2 ({autoBreakdown.l2Required.toFixed(3)})</p>
                            <p className="font-semibold">{fmt(autoBreakdown.l2Cost)}</p>
                          </div>
                          <div className="bg-white rounded px-2 py-1.5">
                            <p className="text-gray-500">L3 ({autoBreakdown.l3Required.toFixed(3)})</p>
                            <p className="font-semibold">{fmt(autoBreakdown.l3Cost)}</p>
                          </div>
                          {Object.entries(autoBreakdown.licenseCosts).map(([name, value]) => (
                            <div key={name} className="bg-white rounded px-2 py-1.5">
                              <p className="text-gray-500">{name}</p>
                              <p className="font-semibold">{fmt(value)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual role allocations - fixed rate card, dropdown only */}
                  <div className="pl-4 border-l-4 border-purple-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-purple-700">Additional Role Allocations for this line</Label>
                      <Button
                        type="button"
                        onClick={() => addResourceLine(itemIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700 h-7"
                      >
                        <Plus size={14} className="mr-1" />
                        Add Role
                      </Button>
                    </div>

                    {item.resource_lines.map((rl, lineIndex) => {
                      const monthlyCost = rateCard.roles[rl.role_name] || 0;
                      const rlCost = (monthlyCost * (parseFloat(rl.allocation_percent) || 0)) / 100;
                      return (
                        <div key={lineIndex} className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-2 items-end bg-white p-2.5 rounded-lg border border-gray-200">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500">Role</Label>
                            <Select value={rl.role_name} onValueChange={(v) => updateResourceLine(itemIndex, lineIndex, 'role_name', v)}>
                              <SelectTrigger className="h-9 text-sm" data-testid={`role-select-${itemIndex}-${lineIndex}`}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(rateCard.roles).map((role) => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500">Monthly Cost (fixed)</Label>
                            <div className="h-9 flex items-center px-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                              {rl.role_name ? fmt(monthlyCost) : '—'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500">Allocation</Label>
                            <Select value={rl.allocation_percent} onValueChange={(v) => updateResourceLine(itemIndex, lineIndex, 'allocation_percent', v)}>
                              <SelectTrigger className="h-9 text-sm" data-testid={`allocation-select-${itemIndex}-${lineIndex}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALLOCATION_OPTIONS.map((pct) => (
                                  <SelectItem key={pct} value={String(pct)}>{pct}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500">Line Cost</Label>
                            <div className="h-9 flex items-center px-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-800">
                              {fmt(rlCost)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeResourceLine(itemIndex, lineIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 h-9"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      );
                    })}
                    {item.resource_lines.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No additional roles added for this line.</p>
                    )}
                  </div>

                  {/* Per-line-item summary */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-center">
                      <p className="text-[10px] text-blue-700 font-medium">Line Cost</p>
                      <p className="text-sm font-bold text-blue-900">{fmt(totalCost)}</p>
                      {manualCost > 0 && autoBreakdown && (
                        <p className="text-[9px] text-blue-600 mt-0.5">manual + auto</p>
                      )}
                    </div>
                    <div className={`rounded px-3 py-2 text-center border ${profit !== null && profit < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className={`text-[10px] font-medium ${profit !== null && profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>Line Profit</p>
                      <p className={`text-sm font-bold ${profit !== null && profit < 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                        {profit !== null ? fmt(profit) : '—'}
                      </p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2 text-center">
                      <p className="text-[10px] text-purple-700 font-medium">Line Margin</p>
                      <p className="text-sm font-bold text-purple-900">{margin !== null ? `${margin.toFixed(1)}%` : '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={addLineItem}
            variant="outline"
            className="mt-4 border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Plus size={18} className="mr-2" />
            Add Revenue Line Item
          </Button>

          {/* Overall Summary */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-700 font-medium mb-1">Total Cost</p>
              <p className="text-xl font-bold text-blue-900">{fmt(totals.totalCost)}</p>
            </div>
            <div className={`rounded-lg p-4 text-center border ${totalProfit !== null && totalProfit < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-xs font-medium mb-1 ${totalProfit !== null && totalProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>Total Profit</p>
              <p className={`text-xl font-bold ${totalProfit !== null && totalProfit < 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                {totalProfit !== null ? fmt(totalProfit) : '—'}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-xs text-purple-700 font-medium mb-1">Overall Margin</p>
              <p className="text-xl font-bold text-purple-900">
                {totalMargin !== null ? `${totalMargin.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-6">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Assumptions, context, etc." />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
              data-testid="save-analysis-button"
            >
              {saving ? 'Saving...' : editingId ? 'Update Analysis' : 'Save Analysis'}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E4E4E7] shadow-sm">
        <div className="divide-y divide-[#E4E4E7]">
          {analyses.length === 0 ? (
            <div className="p-12 text-center text-[#71717A]" data-testid="no-analyses">
              <p>No profitability analyses yet</p>
            </div>
          ) : (
            analyses.map((analysis) => (
              <div key={analysis.id} className="p-6" data-testid={`analysis-${analysis.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}>
                      <h3 className="text-lg font-semibold" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>
                        {analysis.title}
                      </h3>
                      {expandedId === analysis.id ? <CaretUp size={16} /> : <CaretDown size={16} />}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#71717A] mb-3 mt-1">
                      <span>By {analysis.created_by?.name}</span>
                      <span>•</span>
                      <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                      {analysis.proposal_id && (
                        <>
                          <span>•</span>
                          <span className="text-purple-600 font-medium">Linked to a proposal</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{analysis.revenue_line_items.length} line item(s)</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-600">
                        Revenue: <span className="font-semibold text-gray-900">{analysis.total_revenue ? fmt(analysis.total_revenue) : '—'}</span>
                      </span>
                      <span className="text-gray-600">
                        Cost: <span className="font-semibold text-gray-900">{fmt(analysis.total_cost)}</span>
                      </span>
                      <span className={analysis.profit !== null && analysis.profit < 0 ? 'text-red-600' : 'text-emerald-600'}>
                        Profit: <span className="font-bold">{analysis.profit !== null ? fmt(analysis.profit) : '—'}</span>
                      </span>
                      <span className="text-purple-600">
                        Margin: <span className="font-bold">{analysis.margin_percent !== null ? `${analysis.margin_percent.toFixed(1)}%` : '—'}</span>
                      </span>
                    </div>

                    {expandedId === analysis.id && (
                      <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                        {analysis.revenue_line_items.map((li, i) => (
                          <div key={i} className="bg-gray-50 rounded p-3 text-xs">
                            <div className="flex justify-between font-semibold mb-1">
                              <span>{li.label}</span>
                              <span>{li.revenue !== null ? fmt(li.revenue) : '—'} revenue</span>
                            </div>
                            <div className="text-gray-600">
                              Cost: {fmt(li.cost)} · Profit: {li.profit !== null ? fmt(li.profit) : '—'} · Margin: {li.margin_percent !== null ? `${li.margin_percent.toFixed(1)}%` : '—'}
                            </div>
                            {li.distributor_count && li.auto_costs && (
                              <div className="mt-2 pl-3 border-l-2 border-amber-300 space-y-0.5 text-amber-700">
                                <div>{li.distributor_count} distributors:</div>
                                <div className="flex justify-between"><span>L2 ({li.auto_costs.l2_required.toFixed(3)})</span><span>{fmt(li.auto_costs.l2_cost)}</span></div>
                                <div className="flex justify-between"><span>L3 ({li.auto_costs.l3_required.toFixed(3)})</span><span>{fmt(li.auto_costs.l3_cost)}</span></div>
                                {Object.entries(li.auto_costs.license_costs || {}).map(([name, value]) => (
                                  <div key={name} className="flex justify-between"><span>{name}</span><span>{fmt(value)}</span></div>
                                ))}
                              </div>
                            )}
                            {li.resource_lines.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-purple-200 space-y-0.5">
                                {li.resource_lines.map((rl, j) => (
                                  <div key={j} className="flex justify-between text-gray-500">
                                    <span>{rl.role_name} ({rl.allocation_percent}%)</span>
                                    <span>{fmt(rl.cost)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {analysis.notes && (
                          <p className="text-xs text-gray-500 italic pt-2">Notes: {analysis.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {canEdit(analysis) && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(analysis)} data-testid={`edit-analysis-${analysis.id}`}>
                        <PencilSimple size={18} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(analysis.id)} className="text-red-500 hover:text-red-700" data-testid={`delete-analysis-${analysis.id}`}>
                        <Trash size={18} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityAnalyzer;
