import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload, ArrowLeft } from '@phosphor-icons/react';

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
    file: null,
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: '',
    one_time_setup_fee: '',
    integration_fee: '',
    change_note: ''
  });
  const [ongoingCharges, setOngoingCharges] = useState({
    flexidms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    dms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    sfa_user_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    shared_l1_support_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
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
  });

  const fetchProposal = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}`, { withCredentials: true });
      setProposal(data);
      setFormData({ 
        title: data.title, 
        description: data.description, 
        file: null,
        customer_name: data.customer_name || '',
        industry: data.industry || '',
        comments: data.comments || '',
        deal_value: data.deal_value || '',
        one_time_setup_fee: data.one_time_setup_fee || '',
        integration_fee: data.integration_fee || '',
        change_note: ''
      });
      setOngoingCharges({
        flexidms_distributor_charge: chargeToStrings(data.flexidms_distributor_charge),
        dms_distributor_charge: chargeToStrings(data.dms_distributor_charge),
        sfa_user_charge: chargeToStrings(data.sfa_user_charge),
        shared_l1_support_charge: chargeToStrings(data.shared_l1_support_charge),
      });
      // No document may be attached at all - guard against that.
      setFileName(data.file_info?.filename || '');
    } catch (error) {
      toast.error('Failed to load proposal');
      navigate('/dashboard');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Only send a file_id if a *new* file was chosen - the backend keeps
      // the existing attachment (if any) when file_id is omitted, and
      // re-runs the commercials merge automatically either way.
      let fileId = null;
      if (formData.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', formData.file);

        const fileUpload = await axios.post(`${API}/proposals/upload`, fileFormData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileId = fileUpload.data.id;
      }

      const buildCharge = (key) => {
        const c = ongoingCharges[key];
        if (!c.quantity && !c.rate_per_user_month && !c.monthly_minimum_billing) return null;
        return {
          quantity: c.quantity ? parseFloat(c.quantity) : null,
          rate_per_user_month: c.rate_per_user_month ? parseFloat(c.rate_per_user_month) : null,
          monthly_minimum_billing: c.monthly_minimum_billing ? parseFloat(c.monthly_minimum_billing) : null,
        };
      };

      await axios.put(`${API}/proposals/${id}`, {
        title: formData.title,
        description: formData.description,
        file_id: fileId,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        one_time_setup_fee: formData.one_time_setup_fee ? parseFloat(formData.one_time_setup_fee) : null,
        integration_fee: formData.integration_fee ? parseFloat(formData.integration_fee) : null,
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
        <div className="animate-spin rounded-full h-10 w-12 border-t-2 border-b-2 border-[#0066CC]"></div>
      </div>
    );
  }

  if (user?.role !== 'Sales' || proposal.status !== 'needs_revision') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">You can only edit rejected proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="edit-proposal-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-gray-600 hover:text-gray-900"
        data-testid="back-button"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit & Resubmit Proposal</h1>
        <p className="text-gray-600">Update your rejected proposal and resubmit for approval</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
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
              <Label>Ongoing / Recurring &amp; Subscription Charges</Label>
              <p className="text-xs text-gray-500 -mt-2">Leave a row blank to keep it as-is.</p>
              {[
                { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee (if required)' },
              ].map(({ key, label }) => (
                <div key={key} className="p-3 border border-gray-200 rounded bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
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

            <div className="space-y-2">
              <Label htmlFor="change_note">Change Note <span className="text-red-500">*</span></Label>
              <Textarea
                id="change_note"
                value={formData.change_note}
                onChange={(e) => setFormData({ ...formData, change_note: e.target.value })}
                placeholder="Explain what changes were made based on reviewer feedback..."
                rows={3}
                required
              />
              <p className="text-xs text-gray-500">Required: Describe what you changed after the review feedback</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                Proposal Document{' '}
                {formData.file
                  ? '(New file selected)'
                  : fileName
                    ? '(Keep existing or upload new)'
                    : '(optional - none attached)'}
              </Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="file"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                  data-testid="file-upload-label"
                >
                  <Upload size={20} />
                  <span className="text-sm">Choose File</span>
                </label>
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  data-testid="proposal-file-input"
                />
                <span className="text-sm text-gray-600">{fileName || 'No document attached'}</span>
              </div>
              <p className="text-xs text-gray-500">If a .docx is attached, the fee fields above are automatically filled into its Fees tables when you resubmit.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                data-testid="cancel-button"
                className="border-gray-300"
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
