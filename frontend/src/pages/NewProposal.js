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
import { ArrowLeft, Upload, Plus, X, CurrencyDollar, Users, Package } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [baseTemplate, setBaseTemplate] = useState(null); // { configured, filename, updated_at }
  const [formData, setFormData] = useState({
    file: null,
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: '',
    one_time_setup_fee: '',
    integration_fee: '',
    contract_years: '',
    price_escalation_percent: ''
  });
  const [fileName, setFileName] = useState('');
  const [additionalFees, setAdditionalFees] = useState([]);
  // Table B.2 "Ongoing Charges" in the base proposal document - quantity,
  // rate/user/month, and monthly minimum billing per license type.
  const [ongoingCharges, setOngoingCharges] = useState({
    flexidms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    dms_distributor_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    sfa_user_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
    shared_l1_support_charge: { quantity: '', rate_per_user_month: '', monthly_minimum_billing: '' },
  });

  const updateOngoingCharge = (key, field, value) => {
    setOngoingCharges({
      ...ongoingCharges,
      [key]: { ...ongoingCharges[key], [field]: value }
    });
  };

  useEffect(() => {
    axios.get(`${API}/base-template`, { withCredentials: true })
      .then(({ data }) => setBaseTemplate(data))
      .catch(() => setBaseTemplate({ configured: false }));
  }, []);
  const [products, setProducts] = useState([{
    product_name: '',
    users: '',
    price_per_user: '',
    minimum_billing: '',
    training: ''
  }]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
      setFileName(file.name);
    }
  };

  const addProduct = () => {
    setProducts([...products, {
      product_name: '',
      users: '',
      price_per_user: '',
      minimum_billing: '',
      training: ''
    }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const addAdditionalFee = () => {
    setAdditionalFees([...additionalFees, { name: '', value: '' }]);
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
    // Proposal document upload is optional - commercial fields below are
    // still captured and, if a document is attached, auto-filled into it.

    setLoading(true);
    try {
      // Upload file (only if one was chosen)
      let fileId = null;
      if (formData.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', formData.file);
        const fileUpload = await axios.post(`${API}/proposals/upload`, fileFormData, { withCredentials: true });
        fileId = fileUpload.data.id;
      }

      // Prepare products data
      const productsData = products.map(p => ({
        product_name: p.product_name,
        users: p.users,
        price_per_user: p.price_per_user ? parseFloat(p.price_per_user) : null,
        minimum_billing: p.minimum_billing ? parseFloat(p.minimum_billing) : null,
        training: p.training ? parseFloat(p.training) : null
      })).filter(p => p.product_name);

      const additionalFeesData = additionalFees
        .map(f => ({ name: f.name, value: parseFloat(f.value) || 0 }))
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
        };
      };

      // Create proposal - title is auto-derived from customer name since
      // Title/Description are no longer manually entered
      await axios.post(`${API}/proposals`, {
        title: formData.customer_name,
        file_id: fileId,
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
        products: productsData
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
    <div className="min-h-screen bg-[#F4F4F5] p-6 animate-fade-in">
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
            <h1 className="text-2xl font-bold text-gray-900">New Proposal</h1>
            <p className="text-gray-600">Create a new proposal for approval</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 card-enter">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package size={24} className="text-purple-600" />
              Basic Information
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="text-gray-700 font-semibold">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  className="h-10"
                />
                <p className="text-xs text-gray-500">This is how the proposal will be labeled everywhere</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-gray-700 font-semibold">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Healthcare, Finance"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deal_value" className="text-gray-700 font-semibold flex items-center gap-2">
                    <CurrencyDollar size={16} />
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
                  <p className="text-xs text-gray-500">Total value in Indian Rupees (₹)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_years" className="text-gray-700 font-semibold">
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
                  <Label htmlFor="price_escalation_percent" className="text-gray-700 font-semibold">
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
                  <p className="text-xs text-gray-500">Used to project price increases in subsequent contract years</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-gray-700 font-semibold">
                  Proposal Document <span className="text-gray-400 font-normal">(optional override)</span>
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="file"
                    className="flex items-center gap-2 px-6 py-3 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50 cursor-pointer transition-all"
                  >
                    <Upload size={20} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-600">Choose File</span>
                  </label>
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
                </div>
                {baseTemplate?.configured ? (
                  <p className="text-xs text-gray-500">
                    Uses the company base template ({baseTemplate.filename}) by default - the commercial numbers below get filled into it automatically. Only attach a file here if this proposal needs a different document.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">
                    No company base template is set up yet (Admin can add one in User Management). Attach a document here if this proposal needs one.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* One-Time Setup & Integration Section */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.05s'}}>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <CurrencyDollar size={24} className="text-purple-600" />
              One-Time Setup & Integration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">One-Time Setup Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.one_time_setup_fee}
                  onChange={(e) => setFormData({ ...formData, one_time_setup_fee: e.target.value })}
                  placeholder="e.g., 30000"
                  className="h-10 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Integration Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.integration_fee}
                  onChange={(e) => setFormData({ ...formData, integration_fee: e.target.value })}
                  placeholder="e.g., 20000"
                  className="h-10 bg-white"
                />
              </div>
            </div>

            {/* Extra Charges - unchanged mechanism, now proposal-level */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-gray-700 font-semibold">Extra Charges</Label>
                <Button
                  type="button"
                  onClick={addAdditionalFee}
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Plus size={16} className="mr-1" />
                  Add Extra Charge
                </Button>
              </div>

              {additionalFees.length > 0 && (
                <div className="space-y-3">
                  {additionalFees.map((fee, fIndex) => (
                    <div key={fIndex} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={fee.name}
                          onChange={(e) => updateAdditionalFee(fIndex, 'name', e.target.value)}
                          placeholder="Fee name (e.g., Customization, Data Migration)"
                          className="h-10 bg-white"
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
                        className="text-red-500 hover:text-red-700"
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
          <div className="bg-white p-6 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.08s'}}>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <CurrencyDollar size={24} className="text-purple-600" />
              Ongoing / Recurring &amp; Subscription Charges
            </h2>
            <p className="text-sm text-gray-500 mb-6">Quantity, rate per user/month, and monthly minimum billing for each license type. Leave a row blank to skip it.</p>

            <div className="space-y-6">
              {[
                { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee (if required)' },
              ].map(({ key, label }) => (
                <div key={key} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{label}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Quantity</Label>
                      <Input
                        type="number"
                        value={ongoingCharges[key].quantity}
                        onChange={(e) => updateOngoingCharge(key, 'quantity', e.target.value)}
                        placeholder="e.g., 350"
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Rate (₹ / user / month)</Label>
                      <Input
                        type="number"
                        value={ongoingCharges[key].rate_per_user_month}
                        onChange={(e) => updateOngoingCharge(key, 'rate_per_user_month', e.target.value)}
                        placeholder="e.g., 80"
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Monthly Minimum Billing (₹)</Label>
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

          {/* Products Section */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={24} className="text-purple-600" />
                Products
              </h2>
              <Button
                type="button"
                onClick={addProduct}
                variant="outline"
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Plus size={18} className="mr-2" />
                Add Product
              </Button>
            </div>

            <div className="space-y-6">
              {products.map((product, pIndex) => (
                <div
                  key={pIndex}
                  className="p-6 border border-gray-200 rounded-lg bg-gray-50 space-y-4 animate-scale-in hover-lift"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Product {pIndex + 1}</h3>
                    {products.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeProduct(pIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={18} className="mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-700 font-semibold">Product Name *</Label>
                      <Input
                        value={product.product_name}
                        onChange={(e) => updateProduct(pIndex, 'product_name', e.target.value)}
                        placeholder="e.g., CRM Software"
                        className="h-10 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold flex items-center gap-2">
                        <Users size={16} />
                        Users
                      </Label>
                      <Input
                        value={product.users}
                        onChange={(e) => updateProduct(pIndex, 'users', e.target.value)}
                        placeholder="e.g., 50 users"
                        className="h-10 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Price (per user per month) (₹)</Label>
                      <Input
                        type="number"
                        value={product.price_per_user}
                        onChange={(e) => updateProduct(pIndex, 'price_per_user', e.target.value)}
                        placeholder="e.g., 500"
                        className="h-10 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Minimum Billing (per month) (₹)</Label>
                      <Input
                        type="number"
                        value={product.minimum_billing}
                        onChange={(e) => updateProduct(pIndex, 'minimum_billing', e.target.value)}
                        placeholder="e.g., 100000"
                        className="h-10 bg-white"
                      />
                      <p className="text-xs text-gray-500">Minimum commitment amount</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Training (per man day/per batch) (₹)</Label>
                      <Input
                        type="number"
                        value={product.training}
                        onChange={(e) => updateProduct(pIndex, 'training', e.target.value)}
                        placeholder="e.g., 5000"
                        className="h-10 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white p-6 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.2s'}}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h2>
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-gray-700 font-semibold">Comments</Label>
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
