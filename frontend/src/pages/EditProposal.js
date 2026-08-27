import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EditProposal = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: '',
    one_time_setup_fee: '',
    integration_fee: '',
    contract_years: '',
    price_escalation_percent: '',
    change_note: ''
  });
  const [oneTimeOptionalFees, setOneTimeOptionalFees] = useState({
    dms_training_fee: '',
    sfa_training_fee: '',
    flexidms_deployment_fee: '',
    customization_fee: '',
    workshop_fee: '',
  });
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
    setOneTimeLineItemText(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };
  const [additionalFees, setAdditionalFees] = useState([]);

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
  const [ongoingCharges, setOngoingCharges] = useState({
    flexidms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    dms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    sfa_user_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
    shared_l1_support_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '', description: '' },
  });
  const [fileName, setFileName] = useState('');

  const updateOngoingCharge = (key, field, value) => {
    setOngoingCharges({
      ...ongoingCharges,
      [key]: { ...ongoingCharges[key], [field]: value }
    });
  };

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const chargeToStrings = (c) => ({
    quantity: c?.quantity ?? '',
    rate_per_user_month: c?.rate_per_user_month ?? '',
    monthly_minimum_billing: c?.monthly_minimum_billing ?? '',
    description: c?.description ?? '',
  });

  const fetchProposal = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}`, { withCredentials: true });
      setProposal(data);
      setFormData({ 
        title: data.title, 
        description: data.description, 
        customer_name: data.customer_name || '',
        industry: data.industry || '',
        comments: data.comments || '',
        deal_value: data.deal_value || '',
        one_time_setup_fee: data.one_time_setup_fee || '',
        integration_fee: data.integration_fee || '',
        contract_years: data.contract_years || '',
        price_escalation_percent: data.price_escalation_percent || '',
        change_note: ''
      });
      setOneTimeOptionalFees({
        dms_training_fee: data.dms_training_fee || '',
        sfa_training_fee: data.sfa_training_fee || '',
        flexidms_deployment_fee: data.flexidms_deployment_fee || '',
        customization_fee: data.customization_fee || '',
        workshop_fee: data.workshop_fee || '',
      });
      setAdditionalFees(data.additional_fees || []);
      setOngoingCharges({
        flexidms_distributor_charge: chargeToStrings(data.flexidms_distributor_charge),
        dms_distributor_charge: chargeToStrings(data.dms_distributor_charge),
        sfa_user_charge: chargeToStrings(data.sfa_user_charge),
        shared_l1_support_charge: chargeToStrings(data.shared_l1_support_charge),
      });
      // No document may be attached at all - guard against that.
      setFileName(data.file_info?.filename || '');

      // Description/Invoicing per row: use whatever was saved on this
      // proposal already; for any row missing that, fall back to the
      // current base template's default text.
      const savedText = data.one_time_line_item_text || {};
      let templateDefaults = {};
      try {
        const { data: baseTemplateData } = await axios.get(`${API}/base-template`, { withCredentials: true });
        templateDefaults = baseTemplateData.row_defaults || {};
      } catch (e) {
        // non-fatal - just skip pre-filling from template defaults
      }
      setOneTimeLineItemText(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const source = savedText[key] || templateDefaults[key];
          if (source) {
            next[key] = {
              description: source.description || '',
              invoicing: source.invoicing || '',
            };
          }
        }
        return next;
      });
      // Same fallback for Table B.2 descriptions: keep whatever was saved
      // on this proposal, and only fall back to the template's current
      // text for rows that don't have a description yet.
      setOngoingCharges(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (!next[key].description && templateDefaults[key]?.description) {
            next[key] = { ...next[key], description: templateDefaults[key].description };
          }
        }
        return next;
      });
    } catch (error) {
      toast.error('Failed to load proposal');
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
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

      const additionalFeesData = additionalFees
        .map(f => ({ name: f.name, value: parseFloat(f.value) || 0, description: f.description || null }))
        .filter(f => f.name && f.value);

      await axios.put(`${API}/proposals/${id}`, {
        title: formData.title,
        description: formData.description,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        one_time_setup_fee: formData.one_time_setup_fee ? parseFloat(formData.one_time_setup_fee) : null,
        integration_fee: formData.integration_fee ? parseFloat(formData.integration_fee) : null,
        additional_fees: additionalFeesData,
        contract_years: formData.contract_years ? parseInt(formData.contract_years) : null,
        price_escalation_percent: formData.price_escalation_percent ? parseFloat(formData.price_escalation_percent) : null,
        dms_training_fee: oneTimeOptionalFees.dms_training_fee ? parseFloat(oneTimeOptionalFees.dms_training_fee) : null,
        sfa_training_fee: oneTimeOptionalFees.sfa_training_fee ? parseFloat(oneTimeOptionalFees.sfa_training_fee) : null,
        flexidms_deployment_fee: oneTimeOptionalFees.flexidms_deployment_fee ? parseFloat(oneTimeOptionalFees.flexidms_deployment_fee) : null,
        customization_fee: oneTimeOptionalFees.customization_fee ? parseFloat(oneTimeOptionalFees.customization_fee) : null,
        workshop_fee: oneTimeOptionalFees.workshop_fee ? parseFloat(oneTimeOptionalFees.workshop_fee) : null,
        one_time_line_item_text: oneTimeLineItemText,
        flexidms_distributor_charge: buildCharge('flexidms_distributor_charge'),
        dms_distributor_charge: buildCharge('dms_distributor_charge'),
        sfa_user_charge: buildCharge('sfa_user_charge'),
        shared_l1_support_charge: buildCharge('shared_l1_support_charge'),
        change_note: formData.change_note
      }, { withCredentials: true });

      toast.success('Proposal updated and resubmitted successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update proposal');
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-12 border-t-2 border-b-2 border-[#9B30FF]"></div>
      </div>
    );
  }

  if (user?.role !== 'Sales' || proposal.status !== 'needs_revision') {
    return (
      <div className="p-6">
        <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg p-6 text-center">
          <p className="text-[#9E8FC2]">You can only edit rejected proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="edit-proposal-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-[#9E8FC2] hover:text-[#F5F3FA]"
        data-testid="back-button"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#F5F3FA] mb-2">Edit & Resubmit Proposal</h1>
        <p className="text-[#9E8FC2]">Update your rejected proposal and resubmit for approval</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} data-testid="edit-proposal-form" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Proposal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="proposal-title-input"
                placeholder="Enter proposal title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                data-testid="proposal-description-input"
                placeholder="Enter proposal description"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal_value">Deal Value (INR)</Label>
                <Input
                  id="deal_value"
                  type="number"
                  value={formData.deal_value}
                  onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                  placeholder="e.g., 500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Healthcare"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="one_time_setup_fee">One-Time Setup Fee (₹)</Label>
                <Input
                  id="one_time_setup_fee"
                  type="number"
                  value={formData.one_time_setup_fee}
                  onChange={(e) => setFormData({ ...formData, one_time_setup_fee: e.target.value })}
                  placeholder="e.g., 275000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="integration_fee">Integration Fee (₹)</Label>
                <Input
                  id="integration_fee"
                  type="number"
                  value={formData.integration_fee}
                  onChange={(e) => setFormData({ ...formData, integration_fee: e.target.value })}
                  placeholder="e.g., 425000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Extra Charges</Label>
                <Button
                  type="button"
                  onClick={addAdditionalFee}
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-800"
                >
                  Add Extra Charge
                </Button>
              </div>
              {additionalFees.length > 0 && (
                <div className="space-y-2">
                  {additionalFees.map((fee, fIndex) => (
                    <div key={fIndex} className="flex gap-3 items-center bg-[#150E29] p-3 rounded border border-[#3D2A5C]">
                      <Input
                        value={fee.name}
                        onChange={(e) => updateAdditionalFee(fIndex, 'name', e.target.value)}
                        placeholder="Fee name (e.g., Customization, Data Migration)"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={fee.value}
                        onChange={(e) => updateAdditionalFee(fIndex, 'value', e.target.value)}
                        placeholder="Amount (₹)"
                        className="w-40"
                      />
                      <Button
                        type="button"
                        onClick={() => removeAdditionalFee(fIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Ongoing / Recurring &amp; Subscription Charges</Label>
              <p className="text-xs text-[#9E8FC2] -mt-2">Leave a row blank to keep it as-is.</p>
              {[
                { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee (if required)' },
              ].map(({ key, label }) => (
                <div key={key} className="p-3 border border-[#3D2A5C] rounded bg-[#150E29]">
                  <p className="text-sm font-semibold text-[#E5DFF2] mb-2">{label}</p>
                  <Textarea
                    value={ongoingCharges[key].description}
                    onChange={(e) => updateOngoingCharge(key, 'description', e.target.value)}
                    placeholder="Description (pre-filled from base template)"
                    rows={2}
                    className="bg-[#1E1533] text-sm mb-3"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      type="number"
                      value={ongoingCharges[key].quantity}
                      onChange={(e) => updateOngoingCharge(key, 'quantity', e.target.value)}
                      placeholder="Quantity"
                    />
                    <Input
                      type="number"
                      value={ongoingCharges[key].rate_per_user_month}
                      onChange={(e) => updateOngoingCharge(key, 'rate_per_user_month', e.target.value)}
                      placeholder="Rate ₹/user/month"
                    />
                    <Input
                      type="number"
                      value={ongoingCharges[key].monthly_minimum_billing}
                      onChange={(e) => updateOngoingCharge(key, 'monthly_minimum_billing', e.target.value)}
                      placeholder="Monthly minimum billing ₹"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_years">Contract Tenure (years)</Label>
                <Input
                  id="contract_years"
                  type="number"
                  min="1"
                  value={formData.contract_years}
                  onChange={(e) => setFormData({ ...formData, contract_years: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_escalation_percent">Price Escalation % Each Year</Label>
                <Input
                  id="price_escalation_percent"
                  type="number"
                  step="0.1"
                  value={formData.price_escalation_percent}
                  onChange={(e) => setFormData({ ...formData, price_escalation_percent: e.target.value })}
                  placeholder="e.g., 8"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Other One-Time Line Items</Label>
              <p className="text-xs text-[#9E8FC2] -mt-2">Enter an amount to include a row in the document; leave blank and it's removed.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={oneTimeOptionalFees.dms_training_fee}
                  onChange={(e) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, dms_training_fee: e.target.value })}
                  placeholder="DMS Training Fee ₹ (blank = not required)"
                />
                <Input
                  type="number"
                  value={oneTimeOptionalFees.sfa_training_fee}
                  onChange={(e) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, sfa_training_fee: e.target.value })}
                  placeholder="SFA Training Fee ₹ (blank = not required)"
                />
                <Input
                  type="number"
                  value={oneTimeOptionalFees.flexidms_deployment_fee}
                  onChange={(e) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, flexidms_deployment_fee: e.target.value })}
                  placeholder="Flexi DMS Deployment Fee ₹ (blank = not required)"
                />
                <Input
                  type="number"
                  value={oneTimeOptionalFees.customization_fee}
                  onChange={(e) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, customization_fee: e.target.value })}
                  placeholder="Customization Fee ₹ (blank = not required)"
                />
                <Input
                  type="number"
                  value={oneTimeOptionalFees.workshop_fee}
                  onChange={(e) => setOneTimeOptionalFees({ ...oneTimeOptionalFees, workshop_fee: e.target.value })}
                  placeholder="Workshop/Data Migration Fee ₹ (blank = not required)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change_note">Change Note <span className="text-red-400">*</span></Label>
              <Textarea
                id="change_note"
                value={formData.change_note}
                onChange={(e) => setFormData({ ...formData, change_note: e.target.value })}
                placeholder="Explain what changes were made based on reviewer feedback..."
                rows={3}
                required
              />
              <p className="text-xs text-[#9E8FC2]">Required: Describe what you changed after the review feedback</p>
            </div>

            <div className="space-y-2">
              <Label>Proposal Document</Label>
              <p className="text-sm text-[#9E8FC2]">{fileName || 'No document attached'}</p>
              <p className="text-xs text-[#9E8FC2]">The document is generated automatically from the company base template using the fee fields above - there's nothing to upload here.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                data-testid="cancel-button"
                className="border-[#3D2A5C]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                data-testid="submit-proposal-button"
                className="text-white font-semibold shadow-md"
                style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
              >
                {loading ? 'Updating...' : 'Update & Resubmit'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProposal;
