import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Check, Clock, Download, ArrowBendUpLeft, X, GitBranch, ListNumbers, FilePdf } from '@phosphor-icons/react';

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
  const [versions, setVersions] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProposal();
    fetchVersionHistory();
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

  const fetchVersionHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}/versions`, { withCredentials: true });
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Failed to fetch version history');
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
      toast.error('Please add a comment when permanently rejecting');
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/proposals/${id}/reject`, { comment }, { withCredentials: true });
      toast.success('Proposal permanently rejected');
      fetchProposal();
      setComment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnForRevision = async () => {
    if (!comment.trim()) {
      toast.error('Please add revision notes when returning for revision');
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/proposals/${id}/return-for-revision`, { comment }, { withCredentials: true });
      toast.success('Proposal returned to Sales for revision');
      fetchProposal();
      setComment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to return for revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreVersion = async (versionNumber) => {
    if (!window.confirm(`Are you sure you want to restore version ${versionNumber}? This will create a new version with the content from v${versionNumber}.`)) {
      return;
    }
    
    try {
      const { data } = await axios.post(`${API}/proposals/${id}/restore-version`, 
        versionNumber, 
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      toast.success(data.message);
      fetchProposal();
      fetchVersionHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore version');
    }
  };

  const toggleVersionForCompare = (versionNumber) => {
    if (selectedVersions.includes(versionNumber)) {
      setSelectedVersions(selectedVersions.filter(v => v !== versionNumber));
    } else {
      if (selectedVersions.length >= 2) {
        toast.error('You can only compare 2 versions at a time');
        return;
      }
      setSelectedVersions([...selectedVersions, versionNumber]);
    }
  };

  const getVersionComparison = () => {
    if (selectedVersions.length !== 2) return null;
    
    const v1 = versions.find(v => v.version_number === selectedVersions[0]);
    const v2 = versions.find(v => v.version_number === selectedVersions[1]);
    
    if (!v1 || !v2) return null;
    
    // Ensure v1 is older than v2
    const [older, newer] = v1.version_number < v2.version_number ? [v1, v2] : [v2, v1];
    
    return { older, newer };
  };

  const getFieldDiff = (field, older, newer) => {
    const oldVal = older[field] || 'N/A';
    const newVal = newer[field] || 'N/A';
    const changed = oldVal !== newVal;
    return { oldVal, newVal, changed };
  };

  const handleDownloadPDF = async (versionNumber, versionLabel) => {
    try {
      const response = await axios.get(
        `${API}/proposals/${id}/versions/${versionNumber}/download-pdf`,
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      // Extract filename from Content-Disposition header or use default
      let filename = `proposal_${versionLabel}.pdf`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`PDF downloaded: ${versionLabel}`);
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error('PDF download error:', error);
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
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight" data-testid="proposal-title">
                    {proposal.title}
                  </h1>
                  <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-300 flex items-center gap-1">
                    <GitBranch size={14} />
                    {proposal.versions && proposal.versions.length > 0 
                      ? proposal.versions[proposal.current_version - 1]?.version_label 
                      : `v${proposal.current_version || 1}`}
                  </Badge>
                  {versions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="text-xs"
                    >
                      <ListNumbers size={16} className="mr-1" />
                      {versions.length} versions
                    </Button>
                  )}
                </div>
                <p className="text-gray-600">{proposal.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={
                    proposal.status === 'approved' ? 'bg-green-500 text-white' : 
                    proposal.status === 'rejected' ? 'bg-red-600 text-white' :
                    proposal.status === 'needs_revision' ? 'bg-amber-500 text-white' : 
                    'bg-blue-500 text-white'
                  }
                  data-testid="proposal-status-badge"
                >
                  {proposal.status === 'approved' ? 'Approved' : 
                   proposal.status === 'rejected' ? 'Rejected (Closed)' :
                   proposal.status === 'needs_revision' ? 'Needs Revision' : 'Pending'}
                </Badge>
                {canEdit() && !proposal.is_closed && (
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

          {/* Version History */}
          {showVersionHistory && versions.length > 1 && (
            <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <GitBranch size={24} />
                  Version History
                </h2>
                <div className="flex items-center gap-2">
                  {!compareMode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setCompareMode(true);
                        setSelectedVersions([]);
                      }}
                      disabled={versions.length < 2}
                    >
                      Compare Versions
                    </Button>
                  )}
                  {compareMode && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setCompareMode(false);
                        setSelectedVersions([]);
                      }}
                    >
                      Cancel Compare
                    </Button>
                  )}
                </div>
              </div>

              {/* Version Comparison View */}
              {compareMode && selectedVersions.length === 2 && getVersionComparison() && (
                <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <h3 className="text-lg font-bold mb-4 text-blue-900">Comparing Versions</h3>
                  {(() => {
                    const { older, newer } = getVersionComparison();
                    const fields = ['title', 'description', 'customer_name', 'industry', 'product', 'deal_value'];
                    
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-2 bg-red-100 rounded">
                            <Badge className="bg-red-600">{older.version_label}</Badge>
                            <p className="text-xs mt-1">{new Date(older.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-center p-2 bg-green-100 rounded">
                            <Badge className="bg-green-600">{newer.version_label}</Badge>
                            <p className="text-xs mt-1">{new Date(newer.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {fields.map(field => {
                          const diff = getFieldDiff(field, older, newer);
                          return (
                            <div key={field} className={`grid grid-cols-2 gap-4 p-3 rounded ${diff.changed ? 'bg-yellow-50 border border-yellow-300' : 'bg-gray-50'}`}>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1 capitalize">{field.replace('_', ' ')}</p>
                                <p className={`text-sm ${diff.changed ? 'line-through text-red-700' : ''}`}>
                                  {field === 'deal_value' && diff.oldVal !== 'N/A' 
                                    ? `₹${parseFloat(diff.oldVal).toLocaleString('en-IN')}` 
                                    : diff.oldVal}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1 capitalize">{field.replace('_', ' ')}</p>
                                <p className={`text-sm ${diff.changed ? 'font-bold text-green-700' : ''}`}>
                                  {field === 'deal_value' && diff.newVal !== 'N/A' 
                                    ? `₹${parseFloat(diff.newVal).toLocaleString('en-IN')}` 
                                    : diff.newVal}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-4">
                {versions.slice().reverse().map((version, index) => (
                  <div 
                    key={version.version_number} 
                    className={`p-4 rounded-lg border ${
                      version.version_number === proposal.current_version 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : compareMode && selectedVersions.includes(version.version_number)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {compareMode && (
                          <input 
                            type="checkbox"
                            checked={selectedVersions.includes(version.version_number)}
                            onChange={() => toggleVersionForCompare(version.version_number)}
                            className="w-4 h-4 text-blue-600"
                          />
                        )}
                        <Badge className={
                          version.version_number === proposal.current_version 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-400 text-white'
                        }>
                          {version.version_label}
                        </Badge>
                        {version.version_number === proposal.current_version && (
                          <span className="text-xs text-indigo-600 font-semibold">CURRENT</span>
                        )}
                        {canEdit() && version.version_number !== proposal.current_version && !proposal.is_closed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreVersion(version.version_number)}
                            className="text-xs border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white"
                          >
                            Restore This Version
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(version.version_number, version.version_label)}
                          className="text-xs border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                        >
                          <FilePdf size={14} className="mr-1" />
                          Download PDF
                        </Button>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> {version.title}</p>
                      <p><strong>Customer:</strong> {version.customer_name || 'N/A'}</p>
                      <p><strong>Deal Value:</strong> {version.deal_value ? `₹${version.deal_value.toLocaleString('en-IN')}` : 'N/A'}</p>
                      <p><strong>Change Note:</strong> {version.change_note}</p>
                      <p className="text-xs text-gray-500">
                        <strong>Created by:</strong> {version.created_by?.name || 'Unknown'} ({version.created_by?.role || 'Unknown'})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{entry.by.name}</span>
                      <span className="text-xs text-[#71717A]">({entry.by.role})</span>
                      <Badge
                        className={`text-xs ${
                          entry.action === 'approved' ? 'bg-[#10B981] text-white' : 
                          entry.action === 'rejected_closed' ? 'bg-[#DC2626] text-white' :
                          entry.action === 'returned_for_revision' ? 'bg-[#F59E0B] text-white' :
                          entry.action === 'restored_version' ? 'bg-[#8B5CF6] text-white' :
                          entry.action === 'rejected' ? 'bg-[#EF4444] text-white' : 
                          'bg-[#E4E4E7] text-[#09090B]'
                        }`}
                      >
                        {entry.action === 'rejected_closed' ? 'Rejected (Closed)' :
                         entry.action === 'returned_for_revision' ? 'Returned for Revision' :
                         entry.action === 'restored_version' ? 'Restored Version' :
                         entry.action}
                      </Badge>
                      {entry.version && (
                        <Badge variant="outline" className="text-xs">
                          v{entry.version}
                        </Badge>
                      )}
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
                  <Label htmlFor="comment">Comment</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add your comments (required for reject/return)..."
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
                    onClick={handleReturnForRevision}
                    disabled={actionLoading}
                    data-testid="return-button"
                    variant="outline"
                    className="w-full border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
                  >
                    <ArrowBendUpLeft size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Return for Revision'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    data-testid="reject-button"
                    variant="outline"
                    className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                  >
                    <X size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Reject Permanently'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 border-t pt-3">
                  <strong>Return for Revision:</strong> Sends back to Sales for editing (resubmittable).
                  <br />
                  <strong>Reject Permanently:</strong> Closes proposal (cannot be reopened).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalDetail;
