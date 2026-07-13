import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload, ArrowLeft } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewProposal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', file: null });
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
        file_id: fileUpload.data.id
      }, { withCredentials: true });

      toast.success('Proposal created successfully');
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
        <div className="bg-white border border-[#E4E4E7] p-8 text-center">
          <p className="text-[#71717A]">Only Sales can create proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="new-proposal-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-[#71717A] hover:text-[#09090B]"
        data-testid="back-button"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>New Proposal</h1>
        <p className="text-[#71717A]">Submit a new proposal for approval</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
          <form onSubmit={handleSubmit} data-testid="new-proposal-form" className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="file">Proposal Document</Label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="file"
                  className="flex items-center gap-2 px-4 py-2 border border-[#E4E4E7] hover:bg-[#F4F4F5] cursor-pointer transition-colors"
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
                {fileName && <span className="text-sm text-[#71717A]">{fileName}</span>}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                data-testid="cancel-button"
                className="border-[#E4E4E7]"
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
                {loading ? 'Creating...' : 'Submit Proposal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProposal;