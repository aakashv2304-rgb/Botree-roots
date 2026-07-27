import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Plus, X, CurrencyDollar, Users, Package } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null,
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: ''
  });
  const [fileName, setFileName] = useState('');
  const [products, setProducts] = useState([{
    product_name: '',
    users: '',
    price_per_user: '',
    one_time_cost: '',
    minimum_billing: '',
    additional_fees: []
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
      one_time_cost: '',
      minimum_billing: '',
      additional_fees: []
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

  const addAdditionalFee = (productIndex) => {
    const updated = [...products];
    updated[productIndex].additional_fees.push({ name: '', value: '' });
    setProducts(updated);
  };

  const removeAdditionalFee = (productIndex, feeIndex) => {
    const updated = [...products];
    updated[productIndex].additional_fees.splice(feeIndex, 1);
    setProducts(updated);
  };

  const updateAdditionalFee = (productIndex, feeIndex, field, value) => {
    const updated = [...products];
    updated[productIndex].additional_fees[feeIndex][field] = value;
    setProducts(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      toast.error('Please upload a proposal document');
      return;
    }

    setLoading(true);
    try {
      // Upload file
      const fileFormData = new FormData();
      fileFormData.append('file', formData.file);
      const fileUpload = await axios.post(`${API}/proposals/upload`, fileFormData, { withCredentials: true });

      // Prepare products data
      const productsData = products.map(p => ({
        product_name: p.product_name,
        users: p.users,
        price_per_user: p.price_per_user ? parseFloat(p.price_per_user) : null,
        one_time_cost: p.one_time_cost ? parseFloat(p.one_time_cost) : null,
        minimum_billing: p.minimum_billing ? parseFloat(p.minimum_billing) : null,
        additional_fees: p.additional_fees.map(f => ({
          name: f.name,
          value: parseFloat(f.value) || 0
        })).filter(f => f.name && f.value)
      })).filter(p => p.product_name);

      // Create proposal
      await axios.post(`${API}/proposals`, {
        title: formData.title,
        description: formData.description,
        file_id: fileUpload.data.id,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
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
            <h1 className="text-3xl font-bold text-gray-900">New Proposal</h1>
            <p className="text-gray-600">Create a new proposal for approval</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-8 shadow-sm border border-gray-200 card-enter">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package size={24} className="text-purple-600" />
              Basic Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-700 font-semibold">
                    Proposal Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter proposal title"
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-gray-700 font-semibold">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 font-semibold">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter proposal description"
                  required
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-gray-700 font-semibold">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Healthcare, Finance"
                    className="h-12"
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
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">Total value in Indian Rupees (₹)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-gray-700 font-semibold">
                  Proposal Document <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="file"
                    className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 cursor-pointer transition-all"
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
                    required
                  />
                  {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white p-8 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.1s'}}>
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
                  className="p-6 border-2 border-gray-200 rounded-lg bg-gray-50 space-y-4 animate-scale-in hover-lift"
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
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Product Name *</Label>
                      <Input
                        value={product.product_name}
                        onChange={(e) => updateProduct(pIndex, 'product_name', e.target.value)}
                        placeholder="e.g., CRM Software"
                        className="h-11 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold flex items-center gap-2">
                        <Users size={16} />
                        Number of Users
                      </Label>
                      <Input
                        value={product.users}
                        onChange={(e) => updateProduct(pIndex, 'users', e.target.value)}
                        placeholder="e.g., 50 users"
                        className="h-11 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">Price per User (₹)</Label>
                      <Input
                        type="number"
                        value={product.price_per_user}
                        onChange={(e) => updateProduct(pIndex, 'price_per_user', e.target.value)}
                        placeholder="e.g., 500"
                        className="h-11 bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-semibold">One Time Cost (₹)</Label>
                      <Input
                        type="number"
                        value={product.one_time_cost}
                        onChange={(e) => updateProduct(pIndex, 'one_time_cost', e.target.value)}
                        placeholder="e.g., 50000"
                        className="h-11 bg-white"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-gray-700 font-semibold">Minimum Billing (₹)</Label>
                      <Input
                        type="number"
                        value={product.minimum_billing}
                        onChange={(e) => updateProduct(pIndex, 'minimum_billing', e.target.value)}
                        placeholder="e.g., 100000"
                        className="h-11 bg-white"
                      />
                      <p className="text-xs text-gray-500">Minimum commitment amount</p>
                    </div>
                  </div>

                  {/* Additional Fees */}
                  <div className="mt-6 pt-6 border-t border-gray-300">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-gray-700 font-semibold">Additional Fees</Label>
                      <Button
                        type="button"
                        onClick={() => addAdditionalFee(pIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Fee
                      </Button>
                    </div>

                    {product.additional_fees.length > 0 && (
                      <div className="space-y-3">
                        {product.additional_fees.map((fee, fIndex) => (
                          <div key={fIndex} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={fee.name}
                                onChange={(e) => updateAdditionalFee(pIndex, fIndex, 'name', e.target.value)}
                                placeholder="Fee name (e.g., Customization, Integration)"
                                className="h-10"
                              />
                            </div>
                            <div className="w-40 space-y-2">
                              <Input
                                type="number"
                                value={fee.value}
                                onChange={(e) => updateAdditionalFee(pIndex, fIndex, 'value', e.target.value)}
                                placeholder="Amount (₹)"
                                className="h-10"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={() => removeAdditionalFee(pIndex, fIndex)}
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
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white p-8 shadow-sm border border-gray-200 card-enter" style={{animationDelay: '0.2s'}}>
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
              className="text-white shadow-lg"
              style={{background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)'}}
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProposal;
