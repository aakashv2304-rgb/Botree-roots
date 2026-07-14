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
    one_time: '',
    product: '',
    users: '',
    rate: '',
    customer_name: '',
    industry: '',
    comments: '',
    deal_value: ''
  });
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}`, { withCredentials: true });
      setProposal(data);
      setFormData({ 
        title: data.title, 
        description: data.description, 
        file: null,
        one_time: data.one_time || '',
        product: data.product || '',
        users: data.users || '',
        rate: data.rate || '',
        customer_name: data.customer_name || '',
        industry: data.industry || '',
        comments: data.comments || '',
        deal_value: data.deal_value || ''
      });
      setFileName(data.file_info.filename);
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
      let fileId = proposal.file_info.id;
      
      // Upload new file if changed
      if (formData.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', formData.file);

        const fileUpload = await axios.post(`${API}/proposals/upload`, fileFormData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileId = fileUpload.data.id;
      }

      await axios.put(`${API}/proposals/${id}`, {
        title: formData.title,
        description: formData.description,
        file_id: fileId,
        one_time: formData.one_time,
        product: formData.product,
        users: formData.users,
        rate: formData.rate,
        customer_name: formData.customer_name,
        industry: formData.industry,
        comments: formData.comments,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0066CC]"></div>
      </div>
    );
  }

  if (user?.role !== 'Sales' || proposal.status !== 'needs_revision') {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">You can only edit rejected proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="edit-proposal-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-gray-600 hover:text-gray-900"
        data-testid="back-button"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit & Resubmit Proposal</h1>
        <p className="text-gray-600">Update your rejected proposal and resubmit for approval</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
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
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Input
                  id="product"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  placeholder="Product name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Proposal Document {formData.file ? '(New file selected)' : '(Keep existing or upload new)'}</Label>
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
                <span className="text-sm text-gray-600">{fileName}</span>
              </div>
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
                className="text-white font-semibold shadow-lg"
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
