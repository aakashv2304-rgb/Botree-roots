import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import ValidationModal from '../components/ValidationModal';
import { ArrowLeft, Plus, X, CurrencyInr, Package } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Preset charge types - selecting one maps this row to a fixed field the
// Word base-template merge already knows how to fill. Picking "Custom"
// instead lets Sales type any name; those become freeform extra rows
// (still appended to the document, just not tied to a specific placeholder).
const PRESET_ONE_TIME = [
  { key: 'one_time_setup_fee', label: 'One-Time Setup Fee' },
  { key: 'integration_fee', label: 'Integration Fee' },
  { key: 'dms_training_fee', label: 'DMS Training Fee' },
  { key: 'sfa_training_fee', label: 'SFA Training Fee' },
  { key: 'flexidms_deployment_fee', label: 'Flexi DMS Deployment Fee' },
  { key: 'customization_fee', label: 'Customization Fee' },
  { key: 'workshop_fee', label: 'Workshop / Data Migration / Audit Fee' },
];

const PRESET_RECURRING = [
  { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
  { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
  { key: 'sfa_user_charge', label: 'No. of SFA Users' },
  { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee' },
];

let rowIdCounter = 0;
const nextRowId = () => ++rowIdCounter;

const emptyOneTimeRow = () => ({ id: nextRowId(), presetKey: '', customName: '', amount: '', description: '', invoicing: '' });
const emptyRecurringRow = () => ({ id: nextRowId(), presetKey: '', customName: '', quantity: '', rate: '', minBilling: '', description: '' });

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [baseTemplate, setBaseTemplate] = useState(null); // { configured, filename, updated_at, row_defaults }
  const [rowDefaults, setRowDefaults] = useState({});
  const [formData, setFormData] = useState({
    customer_name: '',
    industry: '',
    comments: '',
    contract_years: '',
    price_escalation_percent: ''
  });

  const [oneTimeRows, setOneTimeRows] = useState([emptyOneTimeRow()]);
  const [recurringRows, setRecurringRows] = useState([emptyRecurringRow()]);

  useEffect(() => {
    axios.get(`${API}/base-template`, { withCredentials: true })
      .then(({ data }) => {
        setBaseTemplate(data);
        setRowDefaults(data.row_defaults || {});
      })
      .catch(() => setBaseTemplate({ configured: false }));
  }, []);

  // --- One-Time Charges row helpers ---
  const addOneTimeRow = () => setOneTimeRows([...oneTimeRows, emptyOneTimeRow()]);
  const removeOneTimeRow = (id) => setOneTimeRows(oneTimeRows.filter((r) => r.id !== id));
  const updateOneTimeRow = (id, field, value) => {
    setOneTimeRows(oneTimeRows.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Auto-fill Description/Invoicing from the base template's defaults
      // for this charge type - still fully editable afterward.
      if (field === 'presetKey' && value && value !== 'custom') {
        const defaults = rowDefaults[value];
        if (defaults) {
          updated.description = defaults.description || '';
          updated.invoicing = defaults.invoicing || '';
        }
      }
      return updated;
    }));
  };
  const oneTimePresetTaken = (excludeId) =>
    new Set(oneTimeRows.filter((r) => r.id !== excludeId && r.presetKey && r.presetKey !== 'custom').map((r) => r.presetKey));

  // --- Recurring Charges row helpers ---
  const addRecurringRow = () => setRecurringRows([...recurringRows, emptyRecurringRow()]);
  const removeRecurringRow = (id) => setRecurringRows(recurringRows.filter((r) => r.id !== id));
  const updateRecurringRow = (id, field, value) => {
    setRecurringRows(recurringRows.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'presetKey' && value && value !== 'custom') {
        const defaults = rowDefaults[value];
        if (defaults) {
          updated.description = defaults.description || '';
        }
      }
      return updated;
    }));
  };
  const recurringPresetTaken = (excludeId) =>
    new Set(recurringRows.filter((r) => r.id !== excludeId && r.presetKey && r.presetKey !== 'custom').map((r) => r.presetKey));

  // --- Live summary calculation ---
  const oneTimeTotal = oneTimeRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const recurringLineMonthly = (r) => {
    const rate = parseFloat(r.rate) || 0;
    const qty = parseFloat(r.quantity) || 0;
    const minBill = parseFloat(r.minBilling) || 0;
    const rateTotal = rate * qty;
    const hasRate = r.rate !== '' && r.quantity !== '';
    const hasMin = r.minBilling !== '';
    if (hasRate && hasMin) return Math.max(rateTotal, minBill);
    if (hasRate) return rateTotal;
    if (hasMin) return minBill;
    return 0;
  };
  const monthlyRecurring = recurringRows.reduce((sum, r) => sum + recurringLineMonthly(r), 0);

  const tenureYears = parseInt(formData.contract_years) || 1;
  const escalation = (parseFloat(formData.price_escalation_percent) || 0) / 100;
  let recurringOverTenure = 0;
  for (let y = 0; y < tenureYears; y++) {
    recurringOverTenure += monthlyRecurring * 12 * Math.pow(1 + escalation, y);
  }
  const totalDealValue = oneTimeTotal + recurringOverTenure;
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_name.trim()) {
      setValidationError('Customer Name is not filled');
      return;
    }

    setLoading(true);
    try {
      // Map dynamic rows back into fixed fields (presets) / freeform lists (custom)
      const oneTimeFixed = {};
      const oneTimeLineItemText = {};
      const additionalFeesData = [];
      oneTimeRows.forEach((r) => {
        const amount = r.amount !== '' ? parseFloat(r.amount) : null;
        if (r.presetKey && r.presetKey !== 'custom') {
          oneTimeFixed[r.presetKey] = amount;
          oneTimeLineItemText[r.presetKey] = { description: r.description || null, invoicing: r.invoicing || null };
        } else if (r.presetKey === 'custom' && r.customName.trim()) {
          additionalFeesData.push({
            name: r.customName.trim(),
            value: amount || 0,
            description: r.description || null,
            invoicing: r.invoicing || null,
          });
        }
      });

      const recurringFixed = {};
      const extraOngoingChargesData = [];
      recurringRows.forEach((r) => {
        if (!r.quantity && !r.rate && !r.minBilling) return;
        const chargeObj = {
          quantity: r.quantity ? parseFloat(r.quantity) : null,
          rate_per_user_month: r.rate ? parseFloat(r.rate) : null,
          monthly_minimum_billing: r.minBilling ? parseFloat(r.minBilling) : null,
          description: r.description || null,
        };
        if (r.presetKey && r.presetKey !== 'custom') {
          recurringFixed[r.presetKey] = chargeObj;
        } else if (r.presetKey === 'custom' && r.customName.trim()) {
          extraOngoingChargesData.push({ ...chargeObj, name: r.customName.trim() });
        }
      });

      // Create proposal - title is auto-derived from customer name.
      // deal_value is computed server-side from the charges below, not sent.
      await axios.post(`${API}/proposals`, {
        title: formData.customer_name,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        contract_years: formData.contract_years ? parseInt(formData.contract_years) : null,
        price_escalation_percent: formData.price_escalation_percent ? parseFloat(formData.price_escalation_percent) : null,
        one_time_setup_fee: oneTimeFixed.one_time_setup_fee ?? null,
        integration_fee: oneTimeFixed.integration_fee ?? null,
        dms_training_fee: oneTimeFixed.dms_training_fee ?? null,
        sfa_training_fee: oneTimeFixed.sfa_training_fee ?? null,
        flexidms_deployment_fee: oneTimeFixed.flexidms_deployment_fee ?? null,
        customization_fee: oneTimeFixed.customization_fee ?? null,
        workshop_fee: oneTimeFixed.workshop_fee ?? null,
        one_time_line_item_text: oneTimeLineItemText,
        additional_fees: additionalFeesData,
        flexidms_distributor_charge: recurringFixed.flexidms_distributor_charge ?? null,
        dms_distributor_charge: recurringFixed.dms_distributor_charge ?? null,
        sfa_user_charge: recurringFixed.sfa_user_charge ?? null,
        shared_l1_support_charge: recurringFixed.shared_l1_support_charge ?? null,
        extra_ongoing_charges: extraOngoingChargesData,
      }, { withCredentials: true });

      toast.success('Proposal created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4FC] p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="hover-lift bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0] hover:bg-[#F1EBFA]"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E1533]">New Proposal</h1>
            <p className="text-[#7A6B9E]">Create a new proposal for approval</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E4DCF0] card-enter">
            <h2 className="text-xl font-bold text-[#1E1533] mb-6 flex items-center gap-2">
              <Package size={24} className="text-purple-700" />
              Basic Information
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="text-[#5B4B7A] font-semibold">
                  Customer Name <span className="text-red-700">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                />
                <p className="text-xs text-[#7A6B9E]">This is how the proposal will be labeled everywhere</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-[#5B4B7A] font-semibold">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Healthcare, Finance"
                  className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_years" className="text-[#5B4B7A] font-semibold">
                    Contract Tenure
                  </Label>
                  <Input
                    id="contract_years"
                    type="number"
                    min="1"
                    value={formData.contract_years}
                    onChange={(e) => setFormData({ ...formData, contract_years: e.target.value })}
                    placeholder="e.g., 3"
                    className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_escalation_percent" className="text-[#5B4B7A] font-semibold">
                    Price Escalation % Each Year
                  </Label>
                  <Input
                    id="price_escalation_percent"
                    type="number"
                    step="0.1"
                    value={formData.price_escalation_percent}
                    onChange={(e) => setFormData({ ...formData, price_escalation_percent: e.target.value })}
                    placeholder="e.g., 5"
                    className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                  />
                  <p className="text-xs text-[#7A6B9E]">Used to project price increases in subsequent contract years</p>
                </div>
              </div>

              <div className="space-y-2">
                {baseTemplate?.configured ? (
                  <p className="text-xs text-[#7A6B9E] bg-[#F7F4FC] border border-[#E4DCF0] rounded p-3">
                    This proposal will use the company base template ({baseTemplate.filename}) - the commercial numbers below are filled into it automatically.
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                    No company base template is set up yet. Ask an Admin to add one in User Management before submitting proposals.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* One-Time Charges Section */}
          <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E4DCF0] card-enter" style={{ animationDelay: '0.05s' }}>
            <h2 className="text-xl font-bold text-[#1E1533] flex items-center gap-2 mb-2">
              <CurrencyInr size={24} className="text-purple-700" />
              One-Time Charges
            </h2>
            <p className="text-sm text-[#7A6B9E] mb-6">Pick a charge type or choose Custom to name your own. Description/Invoicing auto-fill from the base template and stay editable.</p>

            <div className="space-y-4">
              {oneTimeRows.map((row) => {
                const taken = oneTimePresetTaken(row.id);
                return (
                  <div key={row.id} className="p-4 border border-[#E4DCF0] rounded-lg bg-[#F7F4FC]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[#5B4B7A] font-semibold text-xs">Charge Type</Label>
                          <Select value={row.presetKey || 'unset'} onValueChange={(v) => updateOneTimeRow(row.id, 'presetKey', v === 'unset' ? '' : v)}>
                            <SelectTrigger className="h-10 bg-[#FFFFFF]" data-testid={`one-time-type-${row.id}`}>
                              <SelectValue placeholder="Select or choose Custom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Select a charge type...</SelectItem>
                              {PRESET_ONE_TIME.filter((p) => !taken.has(p.key)).map((p) => (
                                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                              ))}
                              <SelectItem value="custom">Custom...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {row.presetKey === 'custom' ? (
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Custom Name</Label>
                            <Input
                              value={row.customName}
                              onChange={(e) => updateOneTimeRow(row.id, 'customName', e.target.value)}
                              placeholder="e.g., Custom Report Module"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                              data-testid={`one-time-custom-name-${row.id}`}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Amount (₹)</Label>
                            <Input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateOneTimeRow(row.id, 'amount', e.target.value)}
                              placeholder="e.g., 275000"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                              data-testid={`one-time-amount-${row.id}`}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeOneTimeRow(row.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:text-red-800 mt-5"
                        disabled={oneTimeRows.length === 1}
                      >
                        <X size={18} />
                      </Button>
                    </div>

                    {row.presetKey === 'custom' && (
                      <div className="mb-3">
                        <Label className="text-[#5B4B7A] font-semibold text-xs">Amount (₹)</Label>
                        <Input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateOneTimeRow(row.id, 'amount', e.target.value)}
                          placeholder="e.g., 50000"
                          className="h-10 bg-[#FFFFFF] text-[#1E1533] mt-1"
                          data-testid={`one-time-custom-amount-${row.id}`}
                        />
                      </div>
                    )}

                    {row.presetKey && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[#5B4B7A] font-semibold text-xs">Description</Label>
                          <Textarea
                            value={row.description}
                            onChange={(e) => updateOneTimeRow(row.id, 'description', e.target.value)}
                            placeholder="Description shown in the document"
                            rows={2}
                            className="bg-[#FFFFFF] text-[#1E1533]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[#5B4B7A] font-semibold text-xs">Invoicing</Label>
                          <Textarea
                            value={row.invoicing}
                            onChange={(e) => updateOneTimeRow(row.id, 'invoicing', e.target.value)}
                            placeholder="Invoicing terms shown in the document"
                            rows={2}
                            className="bg-[#FFFFFF] text-[#1E1533]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={addOneTimeRow}
              variant="ghost"
              size="sm"
              className="text-purple-700 hover:text-purple-800 mt-4"
            >
              <Plus size={16} className="mr-1" />
              Add Field
            </Button>
          </div>

          {/* Recurring Charges Section */}
          <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E4DCF0] card-enter" style={{ animationDelay: '0.08s' }}>
            <h2 className="text-xl font-bold text-[#1E1533] flex items-center gap-2 mb-2">
              <CurrencyInr size={24} className="text-purple-700" />
              Recurring Charges
            </h2>
            <p className="text-sm text-[#7A6B9E] mb-6">Pick a license type or choose Custom to name your own. Monthly revenue for each line uses whichever is higher: Rate × Quantity, or Minimum Billing.</p>

            <div className="space-y-4">
              {recurringRows.map((row) => {
                const taken = recurringPresetTaken(row.id);
                return (
                  <div key={row.id} className="p-4 border border-[#E4DCF0] rounded-lg bg-[#F7F4FC]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[#5B4B7A] font-semibold text-xs">Charge Type</Label>
                          <Select value={row.presetKey || 'unset'} onValueChange={(v) => updateRecurringRow(row.id, 'presetKey', v === 'unset' ? '' : v)}>
                            <SelectTrigger className="h-10 bg-[#FFFFFF]" data-testid={`recurring-type-${row.id}`}>
                              <SelectValue placeholder="Select or choose Custom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Select a charge type...</SelectItem>
                              {PRESET_RECURRING.filter((p) => !taken.has(p.key)).map((p) => (
                                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                              ))}
                              <SelectItem value="custom">Custom...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {row.presetKey === 'custom' && (
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Custom Name</Label>
                            <Input
                              value={row.customName}
                              onChange={(e) => updateRecurringRow(row.id, 'customName', e.target.value)}
                              placeholder="e.g., Premium Analytics Users"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                              data-testid={`recurring-custom-name-${row.id}`}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeRecurringRow(row.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:text-red-800 mt-5"
                        disabled={recurringRows.length === 1}
                      >
                        <X size={18} />
                      </Button>
                    </div>

                    {row.presetKey && (
                      <>
                        <div className="space-y-1 mb-4">
                          <Label className="text-[#5B4B7A] font-semibold text-xs">Description</Label>
                          <Textarea
                            value={row.description}
                            onChange={(e) => updateRecurringRow(row.id, 'description', e.target.value)}
                            placeholder="Pre-filled from the base template - edit as needed"
                            rows={2}
                            className="bg-[#FFFFFF] text-sm text-[#1E1533]"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Quantity</Label>
                            <Input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => updateRecurringRow(row.id, 'quantity', e.target.value)}
                              placeholder="e.g., 350"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Rate (₹ / user / month)</Label>
                            <Input
                              type="number"
                              value={row.rate}
                              onChange={(e) => updateRecurringRow(row.id, 'rate', e.target.value)}
                              placeholder="e.g., 80"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[#5B4B7A] font-semibold text-xs">Monthly Minimum Billing (₹)</Label>
                            <Input
                              type="number"
                              value={row.minBilling}
                              onChange={(e) => updateRecurringRow(row.id, 'minBilling', e.target.value)}
                              placeholder="e.g., 28000"
                              className="h-10 bg-[#FFFFFF] text-[#1E1533]"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={addRecurringRow}
              variant="ghost"
              size="sm"
              className="text-purple-700 hover:text-purple-800 mt-4"
            >
              <Plus size={16} className="mr-1" />
              Add Field
            </Button>
          </div>

          {/* Summary */}
          <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E4DCF0] card-enter" style={{ animationDelay: '0.12s' }}>
            <h2 className="text-xl font-bold text-[#1E1533] mb-4 flex items-center gap-2">
              <CurrencyInr size={24} className="text-purple-700" />
              Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="proposal-summary-table">
                <thead>
                  <tr className="border-b border-[#E4DCF0] text-left text-[#5B4B7A]">
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-[#1E1533]">
                  <tr className="border-b border-[#F1EBFA]">
                    <td className="py-2">Total One-Time Charges</td>
                    <td className="py-2 text-right font-semibold">{fmt(oneTimeTotal)}</td>
                  </tr>
                  <tr className="border-b border-[#F1EBFA]">
                    <td className="py-2">Monthly Recurring (Year 1)</td>
                    <td className="py-2 text-right font-semibold">{fmt(monthlyRecurring)}</td>
                  </tr>
                  <tr className="border-b border-[#F1EBFA]">
                    <td className="py-2">
                      Total Recurring over Tenure
                      <span className="block text-xs text-[#7A6B9E]">
                        {tenureYears} year{tenureYears > 1 ? 's' : ''}, {formData.price_escalation_percent || 0}% escalation/year
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">{fmt(recurringOverTenure)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-base">Total Deal Value</td>
                    <td className="py-3 text-right font-bold text-base text-purple-700">{fmt(totalDealValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E4DCF0] card-enter" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl font-bold text-[#1E1533] mb-6">Additional Information</h2>
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-[#5B4B7A] font-semibold">Comments</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Any additional notes or comments..."
                rows={4}
                className="bg-[#FFFFFF] text-[#1E1533]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
              className="bg-[#FFFFFF] text-[#1E1533] border-[#E4DCF0] hover:bg-[#F1EBFA]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </div>
      <ValidationModal message={validationError} onClose={() => setValidationError(null)} />
    </div>
  );
};

export default NewProposal;
