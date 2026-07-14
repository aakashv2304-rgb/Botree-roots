import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Check, Clock, Download, ArrowBendUpLeft } from '@phosphor-icons/react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WORKFLOW_STAGES = [
  { key: 'sales_submitted', role: 'Sales', label: 'Sales' },
  { key: 'cgo_review', role: 'CGO', label: 'CGO' },
  { key: 'finance_review', role: 'Finance', label: 'Finance' },
  { key: 'legal_review', role: 'Legal', label: 'Legal' },
  { key: 'cfo_review', role: 'CFO', label: 'CFO' },
  { key: 'approved', role: null, label: 'Approved' }
];

const ProposalDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}`, { withCredentials: true });
      setProposal(data);
    } catch (error) {
      toast.error('Failed to fetch proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${API}/proposals/${id}/approve`, { comment }, { withCredentials: true });
      toast.success('Proposal approved');
      fetchProposal();
      setComment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Please add a comment when rejecting');
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/proposals/${id}/reject`, { comment }, { withCredentials: true });
      toast.success('Proposal sent back to Sales');
      fetchProposal();
      setComment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`${API}/proposals/${id}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', proposal.file_info.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const canTakeAction = () => {
    if (!proposal) return false;
    if (proposal.status === 'approved') return false;
    
    const currentStage = WORKFLOW_STAGES[proposal.current_stage];
    return currentStage && currentStage.role === user.role;
  };

  const canEdit = () => {
    return user.role === 'Sales' && proposal.status === 'needs_revision' && proposal.created_by.id === user.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F172A]"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-8">
        <div className="bg-white border border-[#E4E4E7] p-8 text-center">
          <p className="text-[#71717A]">Proposal not found</p>
        </div>
      </div>
    );
  }

  const getStageStatus = (index) => {
    if (proposal.status === 'approved') return index <= proposal.current_stage ? 'completed' : 'pending';
    if (index < proposal.current_stage) return 'completed';
    if (index === proposal.current_stage) return 'active';
    return 'pending';
  };

  return (
    <div className="p-8" data-testid="proposal-detail-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-[#71717A] hover:text-[#09090B]"
        data-testid="back-to-dashboard"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="proposal-title">
                  {proposal.title}
                </h1>
                <p className="text-gray-600">{proposal.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={proposal.status === 'approved' ? 'bg-green-500 text-white' : proposal.status === 'needs_revision' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}
                  data-testid="proposal-status-badge"
                >
                  {proposal.status === 'approved' ? 'Approved' : proposal.status === 'needs_revision' ? 'Needs Revision' : 'Pending'}
                </Badge>
                {canEdit() && (
                  <Button
                    onClick={() => navigate(`/dashboard/proposal/${id}/edit`)}
                    className="text-white font-semibold shadow-lg"
                    style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
                    data-testid="edit-proposal-button"
                  >
                    Edit & Resubmit
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium">Created by:</span>
                  <span className="font-semibold text-xs">{proposal.created_by.name} ({proposal.created_by.role})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-medium">Created on:</span>
                  <span className="font-semibold text-xs">{new Date(proposal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-medium">Document:</span>
                <Button
                  onClick={handleDownload}
                  variant="link"
                  className="h-auto p-0 text-pink-600 hover:text-pink-700 text-xs"
                  data-testid="download-button"
                >
                  <Download size={14} className="mr-1" />
                  {proposal.file_info.filename}
                </Button>
              </div>
            </div>

            {/* Extended Fields */}
            {(proposal.customer_name || proposal.industry || proposal.product || proposal.users || proposal.rate || proposal.one_time || proposal.deal_value || proposal.comments) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-heading font-bold text-gray-900 mb-3">Proposal Details</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {proposal.deal_value && (
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                      <span className="text-emerald-700 font-medium block mb-1">Deal Value</span>
                      <span className="text-emerald-900 font-bold text-base">₹{proposal.deal_value.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {proposal.customer_name && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">Customer</span>
                      <span className="text-gray-900 font-semibold">{proposal.customer_name}</span>
                    </div>
                  )}
                  {proposal.industry && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">Industry</span>
                      <span className="text-gray-900 font-semibold">{proposal.industry}</span>
                    </div>
                  )}
                  {proposal.product && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">Product</span>
                      <span className="text-gray-900 font-semibold">{proposal.product}</span>
                    </div>
                  )}
                  {proposal.users && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">Users</span>
                      <span className="text-gray-900 font-semibold">{proposal.users}</span>
                    </div>
                  )}
                  {proposal.one_time && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">One Time Cost</span>
                      <span className="text-gray-900 font-semibold">{proposal.one_time}</span>
                    </div>
                  )}
                  {proposal.rate && (
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500 font-medium block mb-1">Rate</span>
                      <span className="text-gray-900 font-semibold">{proposal.rate}</span>
                    </div>
                  )}
                </div>
                {proposal.comments && (
                  <div className="bg-gray-50 p-2 rounded mt-3">
                    <span className="text-gray-500 font-medium text-xs block mb-1">Comments</span>
                    <p className="text-gray-900 text-xs">{proposal.comments}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>Workflow Progress</h2>
            
            <div className="space-y-6" data-testid="workflow-stepper">
              {WORKFLOW_STAGES.map((stage, index) => {
                const status = getStageStatus(index);
                return (
                  <div key={stage.key} className="flex items-start gap-4" data-testid={`stage-${index}`}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                          status === 'completed'
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : status === 'active'
                            ? 'bg-[#3B82F6] border-[#3B82F6] text-white animate-pulse'
                            : 'bg-white border-[#E4E4E7] text-[#71717A]'
                        }`}
                        data-testid={`stage-circle-${index}`}
                      >
                        {status === 'completed' ? <Check size={20} weight="bold" /> : status === 'active' ? <Clock size={20} /> : index + 1}
                      </div>
                      {index < WORKFLOW_STAGES.length - 1 && (
                        <div className={`w-0.5 h-12 ${status === 'completed' ? 'bg-[#10B981]' : 'bg-[#E4E4E7]'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">{stage.label}</p>
                      {stage.role && <p className="text-xs text-[#71717A]">{stage.role} Review</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>History</h2>
            <div className="space-y-4" data-testid="audit-trail">
              {proposal.history.map((entry, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-[#E4E4E7] last:border-0" data-testid={`history-${index}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{entry.by.name}</span>
                      <span className="text-xs text-[#71717A]">({entry.by.role})</span>
                      <Badge
                        className={`text-xs ${
                          entry.action === 'approved' ? 'bg-[#10B981] text-white' : entry.action === 'rejected' ? 'bg-[#EF4444] text-white' : 'bg-[#E4E4E7] text-[#09090B]'
                        }`}
                      >
                        {entry.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#71717A] mb-1">{entry.comment}</p>
                    <p className="text-xs text-[#A1A1AA]">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {canTakeAction() && (
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#E4E4E7] p-6 shadow-sm sticky top-8" data-testid="action-panel">
              <h2 className="text-xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>Take Action</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Comment (optional for approval, required for rejection)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add your comments..."
                    rows={4}
                    data-testid="action-comment-input"
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    data-testid="approve-button"
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    <Check size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    data-testid="reject-button"
                    variant="outline"
                    className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                  >
                    <ArrowBendUpLeft size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Send Back to Sales'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalDetail;
