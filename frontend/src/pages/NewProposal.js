import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import ValidationModal from '../components/ValidationModal';
import { ArrowLeft, Plus, X, CurrencyInr, Package } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [baseTemplate, setBaseTemplate] = useState(null); // { configured, filename, updated_at }
  const [formData, setFormData] = useState({
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: '',
    one_time_setup_fee: '',
    integration_fee: '',
    contract_years: '',
    price_escalation_percent: ''
  });
  const [additionalFees, setAdditionalFees] = useState([]);
  // Table B.2 "Ongoing Charges" in the base proposal document - quantity,
  // rate/user/month, and monthly minimum billing per license type.
  const [ongoingCharges, setOngoingCharges] = useState({
    flexidms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    dms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    sfa_user_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    shared_l1_support_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
  });

  const updateOngoingCharge = (key, field, value) => {
    setOngoingCharges({
      ...ongoingCharges,
      [key]: { ...ongoingCharges[key], [field]: value }
    });
  };

  useEffect(() => {
    axios.get(`${API}/base-template`, { withCredentials: true })
      .then(({ data }) => {
        setBaseTemplate(data);
        if (data.row_defaults) {
          setOneTimeLineItemText(prev => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
              if (data.row_defaults[key]) {
                next[key] = {
                  description: data.row_defaults[key].description || '',
                  invoicing: data.row_defaults[key].invoicing || '',
                };
              }
            }
            return next;
          });
          setOngoingCharges(prev => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
              if (data.row_defaults[key]?.description) {
                next[key] = { ...next[key], description: data.row_defaults[key].description };
              }
            }
            return next;
          });
        }
      })
      .catch(() => setBaseTemplate({ configured: false }));
  }, []);

  // Table B.1 optional line items - blank amount means "not required",
  // removed from the document; a value replaces the row's standard rate.
  const [oneTimeOptionalFees, setOneTimeOptionalFees] = useState({
    dms_training_fee: '',
    sfa_training_fee: '',
    flexidms_deployment_fee: '',
    customization_fee: '',
    workshop_fee: '',
  });

  // Description/Invoicing text per Table B.1 row - pre-filled from the base
  // template once it loads (see useEffect above), editable from there.
  const [oneTimeLineItemText, setOneTimeLineItemText] = useState({
    one_time_setup_fee: { description: '', invoicing: '' },
    integration_fee: { description: '', invoicing: '' },
    dms_training_fee: { description: '', invoicing: '' },
    sfa_training_fee: { description: '', invoicing: '' },
    flexidms_deployment_fee: { description: '', invoicing: '' },
    customization_fee: { description: '', invoicing: '' },
    workshop_fee: { description: '', invoicing: '' },
  });

  const updateOneTimeLineItemText = (key, field, value) => {
    setOneTimeLineItemText({
      ...oneTimeLineItemText,
      [key]: { ...oneTimeLineItemText[key], [field]: value }
    });
  };

  const ONE_TIME_ROWS = [
    { key: 'one_time_setup_fee', label: 'One-Time Setup Fee', amountPlaceholder: 'e.g., 275000', getAmount: () => formData.one_time_setup_fee, setAmount: (v) => setFormData({ ...formData, one_time_setup_fee: v }) },
    { key: 'integration_fee', label: 'Integration Fee', amountPlaceholder: 'e.g., 425000', getAmount: () => formData.integration_fee, setAmount: (v) => setFormData({ ...formData, integration_fee: v }) },
    { key: 'dms_training_fee', label: 'DMS Training Fee', amountPlaceholder: 'e.g., 12500 — leave blank if not required', getAmount: () => oneTimeOptionalFees.dms_training_fee, setAmount: (v) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, dms_training_fee: v }) },
    { key: 'sfa_training_fee', label: 'SFA Training Fee', amountPlaceholder: 'e.g., 12500 — leave blank if not required', getAmount: () => oneTimeOptionalFees.sfa_training_fee, setAmount: (v) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, sfa_training_fee: v }) },
    { key: 'flexidms_deployment_fee', label: 'Flexi DMS Deployment Fee', amountPlaceholder: 'e.g., 3500 — leave blank if not required', getAmount: () => oneTimeOptionalFees.flexidms_deployment_fee, setAmount: (v) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, flexidms_deployment_fee: v }) },
    { key: 'customization_fee', label: 'Customization Fee', amountPlaceholder: 'Leave blank if not required', getAmount: () => oneTimeOptionalFees.customization_fee, setAmount: (v) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, customization_fee: v }) },
    { key: 'workshop_fee', label: 'Workshop / Data Migration / Audit Fee', amountPlaceholder: 'Leave blank if not required', getAmount: () => oneTimeOptionalFees.workshop_fee, setAmount: (v) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, workshop_fee: v }) },
  ];

  const addAdditionalFee = () => {
    setAdditionalFees([...additionalFees, { name: '', value: '', description: '' }]);
  };

  const removeAdditionalFee = (feeIndex) => {
    setAdditionalFees(additionalFees.filter((_, i) => i !== feeIndex));
  };

  const updateAdditionalFee = (feeIndex, field, value) => {
    const updated = [...additionalFees];
    updated[feeIndex][field] = value;
    setAdditionalFees(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_name.trim()) {
      setValidationError('Customer Name is not filled');
      return;
    }
    // No document upload here - every proposal automatically uses the
    // company's base template (configured by Admin) and the commercial
    // fields below get filled into it.

    setLoading(true);
    try {
      // Prepare Extra Charges
      const additionalFeesData = additionalFees
        .map(f => ({ name: f.name, value: parseFloat(f.value) || 0, description: f.description || null }))
        .filter(f => f.name && f.value);

      // Table B.2 ongoing charges - only send a line if at least one of its
      // three values was actually entered, otherwise send null so the
      // document's original placeholder is left untouched.
      const buildCharge = (key) => {
        const c = ongoingCharges[key];
        if (!c.quantity && !c.rate_per_user_month && !c.monthly_minimum_billing) return null;
        return {
          quantity: c.quantity ? parseFloat(c.quantity) : null,
          rate_per_user_month: c.rate_per_user_month ? parseFloat(c.rate_per_user_month) : null,
          monthly_minimum_billing: c.monthly_minimum_billing ? parseFloat(c.monthly_minimum_billing) : null,
          description: c.description || null,
        };
      };

      // Create proposal - title is auto-derived from customer name since
      // Title/Description are no longer manually entered
      await axios.post(`${API}/proposals`, {
        title: formData.customer_name,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        one_time_setup_fee: formData.one_time_setup_fee ? parseFloat(formData.one_time_setup_fee) : null,
        integration_fee: formData.integration_fee ? parseFloat(formData.integration_fee) : null,
        additional_fees: additionalFeesData,
        contract_years: formData.contract_years ? parseInt(formData.contract_years) : null,
        price_escalation_percent: formData.price_escalation_percent ? parseFloat(formData.price_escalation_percent) : null,
        flexidms_distributor_charge: buildCharge('flexidms_distributor_charge'),
        dms_distributor_charge: buildCharge('dms_distributor_charge'),
        sfa_user_charge: buildCharge('sfa_user_charge'),
        shared_l1_support_charge: buildCharge('shared_l1_support_charge'),
        dms_training_fee: oneTimeOptionalFees.dms_training_fee ? parseFloat(oneTimeOptionalFees.dms_training_fee) : null,
        sfa_training_fee: oneTimeOptionalFees.sfa_training_fee ? parseFloat(oneTimeOptionalFees.sfa_training_fee) : null,
        flexidms_deployment_fee: oneTimeOptionalFees.flexidms_deployment_fee ? parseFloat(oneTimeOptionalFees.flexidms_deployment_fee) : null,
        customization_fee: oneTimeOptionalFees.customization_fee ? parseFloat(oneTimeOptionalFees.customization_fee) : null,
        workshop_fee: oneTimeOptionalFees.workshop_fee ? parseFloat(oneTimeOptionalFees.workshop_fee) : null,
        one_time_line_item_text: oneTimeLineItemText
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
    <div className="min-h-screen bg-[#F8FAFC] p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="hover-lift"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">New Proposal</h1>
            <p className="text-[#64748B]">Create a new proposal for approval</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 shadow-sm border border-[#E2E8F0] card-enter">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
              <Package size={24} className="text-purple-700" />
              Basic Information
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="text-[#475569] font-semibold">
                  Customer Name <span className="text-red-700">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  className="h-10"
                />
                <p className="text-xs text-[#64748B]">This is how the proposal will be labeled everywhere</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-[#475569] font-semibold">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Healthcare, Finance"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deal_value" className="text-[#475569] font-semibold flex items-center gap-2">
                    <CurrencyInr size={16} />
                    Total Deal Value (INR)
                  </Label>
                  <Input
                    id="deal_value"
                    type="number"
                    value={formData.deal_value}
                    onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                    placeholder="e.g., 500000"
                    className="h-10"
                  />
                  <p className="text-xs text-[#64748B]">Total value in Indian Rupees (₹)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_years" className="text-[#475569] font-semibold">
                    Contract Tenure
                  </Label>
                  <Input
                    id="contract_years"
                    type="number"
                    min="1"
                    value={formData.contract_years}
                    onChange={(e) => setFormData({ ...formData, contract_years: e.target.value })}
                    placeholder="e.g., 3"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_escalation_percent" className="text-[#475569] font-semibold">
                    Price Escalation % Each Year
                  </Label>
                  <Input
                    id="price_escalation_percent"
                    type="number"
                    step="0.1"
                    value={formData.price_escalation_percent}
                    onChange={(e) => setFormData({ ...formData, price_escalation_percent: e.target.value })}
                    placeholder="e.g., 5"
                    className="h-10"
                  />
                  <p className="text-xs text-[#64748B]">Used to project price increases in subsequent contract years</p>
                </div>
              </div>

              <div className="space-y-2">
                {baseTemplate?.configured ? (
                  <p className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
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

          {/* One-Time Charges Section - mirrors Table B.1 in the document:
              Type of fees / Description / Fees-INR / Invoicing */}
          <div className="bg-white p-6 shadow-sm border border-[#E2E8F0] card-enter" style={{animationDelay: '0.05s'}}>
            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2 mb-2">
              <CurrencyInr size={24} className="text-purple-700" />
              One-Time Charges
            </h2>
            <p className="text-sm text-[#64748B] mb-6">Description and Invoicing are pre-filled from the base template and can be edited. Leave a row's amount blank and it's removed from the document.</p>

            <div className="space-y-4">
              {ONE_TIME_ROWS.map(({ key, label, amountPlaceholder, getAmount, setAmount }) => (
                <div key={key} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
                  <h3 className="text-sm font-bold text-[#0F172A] mb-3">{label}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Amount (₹)</Label>
                      <Input
                        type="number"
                        value={getAmount()}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={amountPlaceholder}
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Description</Label>
                      <Textarea
                        value={oneTimeLineItemText[key].description}
                        onChange={(e) => updateOneTimeLineItemText(key, 'description', e.target.value)}
                        placeholder="Description shown in the document"
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Invoicing</Label>
                      <Textarea
                        value={oneTimeLineItemText[key].invoicing}
                        onChange={(e) => updateOneTimeLineItemText(key, 'invoicing', e.target.value)}
                        placeholder="Invoicing terms shown in the document"
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Extra Charges - appended as new rows in the document */}
            <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-[#475569] font-semibold">Extra Charges</Label>
                <Button
                  type="button"
                  onClick={addAdditionalFee}
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-800"
                >
                  <Plus size={16} className="mr-1" />
                  Add Extra Charge
                </Button>
              </div>

              {additionalFees.length > 0 && (
                <div className="space-y-3">
                  {additionalFees.map((fee, fIndex) => (
                    <div key={fIndex} className="flex gap-3 items-start bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={fee.name}
                          onChange={(e) => updateAdditionalFee(fIndex, 'name', e.target.value)}
                          placeholder="Fee name (e.g., Custom Report Module)"
                          className="h-10 bg-white"
                        />
                        <Textarea
                          value={fee.description || ''}
                          onChange={(e) => updateAdditionalFee(fIndex, 'description', e.target.value)}
                          placeholder="Description (optional)"
                          rows={2}
                          className="bg-white"
                        />
                      </div>
                      <div className="w-40 space-y-2">
                        <Input
                          type="number"
                          value={fee.value}
                          onChange={(e) => updateAdditionalFee(fIndex, 'value', e.target.value)}
                          placeholder="Amount (₹)"
                          className="h-10 bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeAdditionalFee(fIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ongoing / Recurring Charges Section */}
          <div className="bg-white p-6 shadow-sm border border-[#E2E8F0] card-enter" style={{animationDelay: '0.08s'}}>
            <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2 mb-2">
              <CurrencyInr size={24} className="text-purple-700" />
              Ongoing / Recurring &amp; Subscription Charges
            </h2>
            <p className="text-sm text-[#64748B] mb-6">Quantity, rate per user/month, and monthly minimum billing for each license type. Leave a row blank to skip it.</p>

            <div className="space-y-6">
              {[
                { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee (if required)' },
              ].map(({ key, label }) => (
                <div key={key} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
                  <h3 className="text-sm font-bold text-[#0F172A] mb-3">{label}</h3>
                  <div className="space-y-2 mb-4">
                    <Label className="text-[#475569] font-semibold">Description</Label>
                    <Textarea
                      value={ongoingCharges[key].description}
                      onChange={(e) => updateOngoingCharge(key, 'description', e.target.value)}
                      placeholder="Pre-filled from the base template - edit as needed"
                      rows={2}
                      className="bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Quantity</Label>
                      <Input
                        type="number"
                        value={ongoingCharges[key].quantity}
                        onChange={(e) => updateOngoingCharge(key, 'quantity', e.target.value)}
                        placeholder="e.g., 350"
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Rate (₹ / user / month)</Label>
                      <Input
                        type="number"
                        value={ongoingCharges[key].rate_per_user_month}
                        onChange={(e) => updateOngoingCharge(key, 'rate_per_user_month', e.target.value)}
                        placeholder="e.g., 80"
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#475569] font-semibold">Monthly Minimum Billing (₹)</Label>
                      <Input
                        type="number"
                        value={ongoingCharges[key].monthly_minimum_billing}
                        onChange={(e) => updateOngoingCharge(key, 'monthly_minimum_billing', e.target.value)}
                        placeholder="e.g., 28000"
                        className="h-10 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white p-6 shadow-sm border border-[#E2E8F0] card-enter" style={{animationDelay: '0.2s'}}>
            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Additional Information</h2>
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-[#475569] font-semibold">Comments</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Any additional notes or comments..."
                rows={4}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 justify-end animate-slide-in-left" style={{animationDelay: '0.3s'}}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-white shadow-md"
              style={{background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)'}}
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
