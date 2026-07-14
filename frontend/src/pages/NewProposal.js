import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload, ArrowLeft, FileText, CurrencyDollar, Users as UsersIcon, Package, Building, MessageSquare } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null,
    one_time: '',
    product: '',
    users: '',
    rate: '',
    customer_name: '',
    industry: '',
    comments: ''
  });
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', formData.file);

      const fileUpload = await axios.post(`${API}/proposals/upload`, fileFormData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await axios.post(`${API}/proposals`, {
        title: formData.title,
        description: formData.description,
        file_id: fileUpload.data.id,
        one_time: formData.one_time,
        product: formData.product,
        users: formData.users,
        rate: formData.rate,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments
      }, { withCredentials: true });

      toast.success('Proposal created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'Sales') {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">Only Sales can create proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="new-proposal-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-gray-600 hover:text-gray-900 smooth-transition"
        data-testid="back-button"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Proposal</h1>
        <p className="text-gray-600">Submit a new proposal for approval through the workflow</p>
      </div>

      <div className="max-w-4xl">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} data-testid="new-proposal-form" className="space-y-6">
            {/* Basic Information Section */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={24} className="text-pink-600" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="title" className="text-gray-700 font-semibold">Proposal Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="proposal-title-input"
                    placeholder="Enter proposal title"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description" className="text-gray-700 font-semibold">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    data-testid="proposal-description-input"
                    placeholder="Enter proposal description"
                    rows={4}
                    className="smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Customer & Product Details */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building size={24} className="text-purple-600" />
                Customer & Product Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-gray-700 font-semibold flex items-center gap-2">
                    <Building size={16} />
                    Customer Name
                  </Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-gray-700 font-semibold flex items-center gap-2">
                    <Package size={16} />
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Healthcare, Finance, Retail"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product" className="text-gray-700 font-semibold flex items-center gap-2">
                    <Package size={16} />
                    Product
                  </Label>
                  <Input
                    id="product"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    placeholder="Enter product name"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="users" className="text-gray-700 font-semibold flex items-center gap-2">
                    <UsersIcon size={16} />
                    Number of Users
                  </Label>
                  <Input
                    id="users"
                    value={formData.users}
                    onChange={(e) => setFormData({ ...formData, users: e.target.value })}
                    placeholder="e.g., 100"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Details */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CurrencyDollar size={24} className="text-green-600" />
                Pricing Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="one_time" className="text-gray-700 font-semibold flex items-center gap-2">
                    <CurrencyDollar size={16} />
                    One Time Cost
                  </Label>
                  <Input
                    id="one_time"
                    value={formData.one_time}
                    onChange={(e) => setFormData({ ...formData, one_time: e.target.value })}
                    placeholder="e.g., $5000"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-gray-700 font-semibold flex items-center gap-2">
                    <CurrencyDollar size={16} />
                    Rate (per user/month)
                  </Label>
                  <Input
                    id="rate"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="e.g., $50/user/month"
                    className="h-12 smooth-transition focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare size={24} className="text-blue-600" />
                Additional Information
              </h2>
              <div className="space-y-2">
                <Label htmlFor="comments" className="text-gray-700 font-semibold">Comments / Notes</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Add any additional comments or notes"
                  rows={4}
                  className="smooth-transition focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload size={24} className="text-orange-600" />
                Document Upload
              </h2>
              <div className="space-y-2">
                <Label htmlFor="file" className="text-gray-700 font-semibold">Proposal Document (PDF/Word) *</Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="file"
                    className="flex items-center gap-3 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 cursor-pointer transition-all duration-300"
                    data-testid="file-upload-label"
                  >
                    <Upload size={24} className="text-pink-600" />
                    <span className="text-sm font-medium text-gray-700">Choose File</span>
                  </label>
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    data-testid="proposal-file-input"
                  />
                  {fileName && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                      <FileText size={20} className="text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">{fileName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                data-testid="cancel-button"
                className="border-gray-300 hover:bg-gray-50 smooth-transition"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                data-testid="submit-proposal-button"
                className="flex-1 text-white font-bold text-base h-12 shadow-lg hover:shadow-xl btn-gradient"
                style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : 'Submit Proposal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProposal;
