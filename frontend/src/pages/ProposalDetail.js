import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Check, Clock, Download, ArrowBendUpLeft, X, GitBranch, ListNumbers, FilePdf, Eye } from '@phosphor-icons/react';

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
  const [versionTab, setVersionTab] = useState('history'); // 'history' | 'compare'
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [activeComparison, setActiveComparison] = useState(null); // { aNum, bNum } | null
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [aboutCustomer, setAboutCustomer] = useState('');
  const [profitability, setProfitability] = useState('');
  const [savingFinanceDetails, setSavingFinanceDetails] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewKind, setPreviewKind] = useState(null); // 'pdf' | 'docx' | null
  const [previewObjectUrl, setPreviewObjectUrl] = useState(null);
  const previewContainerRef = useRef(null);

  useEffect(() => {
    fetchProposal();
    fetchVersionHistory();
  }, [id]);

  const fetchProposal = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals/${id}`, { withCredentials: true });
      setProposal(data);
      setAboutCustomer(data.about_customer || '');
      setProfitability(data.profitability || '');
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

  const handleSaveFinanceDetails = async () => {
    setSavingFinanceDetails(true);
    try {
      await axios.patch(
        `${API}/proposals/${id}/finance-details`,
        { about_customer: aboutCustomer, profitability: profitability },
        { withCredentials: true }
      );
      toast.success('Finance details saved');
      fetchProposal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save finance details');
    } finally {
      setSavingFinanceDetails(false);
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

  const handleCompareClick = () => {
    if (compareA && compareB && compareA !== compareB) {
      setActiveComparison({ aNum: parseInt(compareA), bNum: parseInt(compareB) });
    }
  };

  const getVersionComparison = () => {
    if (!activeComparison) return null;

    const v1 = versions.find(v => v.version_number === activeComparison.aNum);
    const v2 = versions.find(v => v.version_number === activeComparison.bNum);

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

  // ---- Full commercial diff engine (Option A + B) ----
  const formatDiffValue = (val, currency) => {
    if (val === null || val === undefined || val === '') return '—';
    if (currency) return `₹${Number(val).toLocaleString('en-IN')}`;
    return String(val);
  };

  const SIMPLE_DIFF_FIELDS = [
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'industry', label: 'Industry' },
    { key: 'deal_value', label: 'Deal Value', currency: true },
    { key: 'one_time_setup_fee', label: 'One-Time Setup Fee', currency: true },
    { key: 'integration_fee', label: 'Integration Fee', currency: true },
    { key: 'dms_training_fee', label: 'DMS Training Fee', currency: true },
    { key: 'sfa_training_fee', label: 'SFA Training Fee', currency: true },
    { key: 'flexidms_deployment_fee', label: 'Flexi DMS Deployment Fee', currency: true },
    { key: 'customization_fee', label: 'Customization Fee', currency: true },
    { key: 'workshop_fee', label: 'Workshop / Data Migration Fee', currency: true },
    { key: 'contract_years', label: 'Contract Tenure (years)' },
    { key: 'price_escalation_percent', label: 'Price Escalation %' },
    { key: 'comments', label: 'Comments' },
  ];

  const CHARGE_DIFF_FIELDS = [
    { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
    { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
    { key: 'sfa_user_charge', label: 'No. of SFA Users' },
    { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee' },
  ];

  const getSimpleFieldDiffs = (older, newer) => {
    return SIMPLE_DIFF_FIELDS.map((def) => {
      const oldDisplay = formatDiffValue(older[def.key], def.currency);
      const newDisplay = formatDiffValue(newer[def.key], def.currency);
      return { ...def, oldDisplay, newDisplay, changed: oldDisplay !== newDisplay };
    });
  };

  const getChargeDiffs = (older, newer) => {
    return CHARGE_DIFF_FIELDS.map((def) => {
      const oldCharge = older[def.key];
      const newCharge = newer[def.key];
      const oldExists = !!oldCharge;
      const newExists = !!newCharge;
      let status = 'unchanged';
      if (!oldExists && newExists) status = 'added';
      else if (oldExists && !newExists) status = 'removed';
      else if (oldExists && newExists) {
        const subKeys = ['quantity', 'rate_per_user_month', 'monthly_minimum_billing', 'description'];
        const changed = subKeys.some((k) => (oldCharge[k] ?? null) !== (newCharge[k] ?? null));
        status = changed ? 'changed' : 'unchanged';
      }
      return { ...def, oldCharge, newCharge, status };
    });
  };

  const getAdditionalFeesDiff = (older, newer) => {
    const oldFees = older.additional_fees || [];
    const newFees = newer.additional_fees || [];
    const names = Array.from(new Set([...oldFees.map((f) => f.name), ...newFees.map((f) => f.name)]));
    return names.map((name) => {
      const oldFee = oldFees.find((f) => f.name === name);
      const newFee = newFees.find((f) => f.name === name);
      let status = 'unchanged';
      if (!oldFee && newFee) status = 'added';
      else if (oldFee && !newFee) status = 'removed';
      else if (oldFee && newFee && oldFee.value !== newFee.value) status = 'changed';
      return { name, oldFee, newFee, status };
    });
  };

  const formatChargeLine = (charge) => {
    if (!charge) return null;
    const parts = [];
    if (charge.quantity != null) parts.push(`Qty ${charge.quantity}`);
    if (charge.rate_per_user_month != null) parts.push(`₹${Number(charge.rate_per_user_month).toLocaleString('en-IN')}/user/mo`);
    if (charge.monthly_minimum_billing != null) parts.push(`Min ₹${Number(charge.monthly_minimum_billing).toLocaleString('en-IN')}`);
    return parts.length ? parts.join(' · ') : '—';
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
    if (!proposal?.file_info) {
      toast.error('No document is attached to this proposal');
      return;
    }
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

  const handlePreview = async () => {
    if (!proposal?.file_info) {
      toast.error('No document is attached to this proposal');
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewKind(null);
    try {
      const response = await axios.get(`${API}/proposals/${id}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const filename = (proposal.file_info.filename || '').toLowerCase();
      const isPdf = filename.endsWith('.pdf') || response.data.type === 'application/pdf';
      const isDocx = filename.endsWith('.docx');

      if (isPdf) {
        const url = window.URL.createObjectURL(response.data);
        setPreviewObjectUrl(url);
        setPreviewKind('pdf');
        setPreviewLoading(false);
      } else if (isDocx) {
        setPreviewKind('docx');
        // Render after the dialog's container is in the DOM
        setTimeout(async () => {
          try {
            const { renderAsync } = await import('docx-preview');
            if (previewContainerRef.current) {
              previewContainerRef.current.innerHTML = '';
              await renderAsync(response.data, previewContainerRef.current, undefined, {
                className: 'docx-preview',
                inWrapper: true,
              });
            }
          } catch (err) {
            setPreviewError('Could not render this document for preview. Try downloading it instead.');
          } finally {
            setPreviewLoading(false);
          }
        }, 0);
      } else {
        setPreviewError('Preview isn\'t supported for this file type. Download it to view.');
        setPreviewLoading(false);
      }
    } catch (error) {
      setPreviewError('Failed to load document for preview.');
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewObjectUrl) {
      window.URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }
    setPreviewKind(null);
    setPreviewError('');
    if (previewContainerRef.current) {
      previewContainerRef.current.innerHTML = '';
    }
  };

  const canTakeAction = () => {
    if (!proposal) return false;
    if (proposal.status === 'approved') return false;
    if (proposal.status === 'needs_revision') return false; // ball is with Sales to fix and resubmit, not an approver
    
    const currentStage = WORKFLOW_STAGES[proposal.current_stage];
    return currentStage && currentStage.role === user.role;
  };

  const canViewFinanceFields = () => ['Finance', 'CFO', 'Admin'].includes(user.role);

  const canEditFinanceFields = () => {
    if (!proposal) return false;
    if (user.role !== 'Finance') return false;
    const currentStage = WORKFLOW_STAGES[proposal.current_stage];
    return currentStage && currentStage.key === 'finance_review';
  };

  const canEdit = () => {
    if (!proposal) return false;
    if (proposal.status !== 'needs_revision') return false;
    if (user.role === 'Admin') return true; // Admin can step in and edit/resubmit any proposal
    return user.role === 'Sales' && proposal.created_by.id === user.id;
  };

  const canOverrideWorkflow = () => user.role === 'Admin' && proposal && !proposal.is_closed && proposal.status !== 'approved';

  const canDeleteProposal = () => {
    if (!proposal) return false;
    return user.role === 'Admin' || (user.role === 'Sales' && proposal.created_by.id === user.id);
  };

  const [overrideTarget, setOverrideTarget] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOverrideStage = async () => {
    if (!overrideTarget) return;
    setOverrideLoading(true);
    try {
      await axios.post(
        `${API}/proposals/${id}/override-stage`,
        { target_stage: overrideTarget, comment: comment || undefined },
        { withCredentials: true }
      );
      toast.success('Workflow stage updated');
      setOverrideTarget('');
      fetchProposal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update workflow stage');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleDeleteProposal = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/proposals/${id}`, { withCredentials: true });
      toast.success('Proposal deleted');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete proposal');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading proposal..." />
  }

  if (!proposal) {
    return (
      <div className="p-6">
        <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 text-center">
          <p className="text-[#7A6B9E]">Proposal not found</p>
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

  const getStageTimestamp = (index) => {
    if (!proposal || !proposal.history) return null;

    if (index === 0) {
      const created = proposal.history.find((h) => h.action === 'created');
      return created ? created.timestamp : proposal.created_at;
    }

    // The "Approved" terminal node shares the CFO approval moment
    const roleToMatch = index === 5 ? WORKFLOW_STAGES[4].role : WORKFLOW_STAGES[index].role;
    const matches = proposal.history.filter((h) => h.action === 'approved' && h.by?.role === roleToMatch);
    return matches.length > 0 ? matches[matches.length - 1].timestamp : null;
  };

  return (
    <div className="p-6" data-testid="proposal-detail-page">
      <Button
        onClick={() => navigate('/dashboard')}
        variant="ghost"
        className="mb-6 text-[#7A6B9E] hover:text-[#1E1533]"
        data-testid="back-to-dashboard"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold tracking-tight" data-testid="proposal-title">
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
                {proposal.description && (
                  <p className="text-[#7A6B9E]">{proposal.description}</p>
                )}
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
                    className="text-white font-semibold shadow-md"
                    style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
                    data-testid="edit-proposal-button"
                  >
                    Edit & Resubmit
                  </Button>
                )}
                {canDeleteProposal() && (
                  <Button
                    onClick={() => setDeleteConfirmOpen(true)}
                    variant="outline"
                    className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                    data-testid="delete-proposal-button"
                  >
                    Delete Proposal
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm border-t border-[#E4DCF0] pt-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#7A6B9E] text-xs font-medium">Created by:</span>
                  <span className="font-semibold text-xs">{proposal.created_by.name} ({proposal.created_by.role})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#7A6B9E] text-xs font-medium">Created on:</span>
                  <span className="font-semibold text-xs">{new Date(proposal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#7A6B9E] text-xs font-medium">Document:</span>
                {proposal.file_info ? (
                  <>
                    <span className="text-xs text-[#2D1F47] font-medium">{proposal.file_info.filename}</span>
                    <Button
                      onClick={handlePreview}
                      variant="link"
                      className="h-auto p-0 text-blue-700 hover:text-blue-800 text-xs"
                      data-testid="preview-button"
                    >
                      <Eye size={14} className="mr-1" />
                      Preview
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="link"
                      className="h-auto p-0 text-pink-700 hover:text-pink-800 text-xs"
                      data-testid="download-button"
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-[#8577A3] italic">No document attached</span>
                )}
              </div>
            </div>

            {/* Extended Fields */}
            {(proposal.customer_name || proposal.industry || proposal.deal_value || proposal.one_time_setup_fee || proposal.integration_fee || proposal.additional_fees?.length > 0 || proposal.contract_years || proposal.price_escalation_percent || proposal.comments || proposal.flexidms_distributor_charge || proposal.dms_distributor_charge || proposal.sfa_user_charge || proposal.shared_l1_support_charge || proposal.include_dms_training || proposal.include_sfa_training || proposal.include_flexidms_deployment || proposal.customization_fee || proposal.workshop_fee) && (
              <div className="border-t border-[#E4DCF0] pt-4 mt-4">
                <h3 className="text-sm font-heading font-bold text-[#1E1533] mb-3">Proposal Details</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {proposal.deal_value && (
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                      <span className="text-emerald-700 font-medium block mb-1">Total Deal Value</span>
                      <span className="text-emerald-700 font-bold text-base">₹{proposal.deal_value.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {proposal.one_time_setup_fee && (
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <span className="text-blue-700 font-medium block mb-1">One-Time Setup</span>
                      <span className="text-blue-700 font-bold text-base">₹{proposal.one_time_setup_fee.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {proposal.integration_fee && (
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <span className="text-blue-700 font-medium block mb-1">Integration</span>
                      <span className="text-blue-700 font-bold text-base">₹{proposal.integration_fee.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {proposal.customer_name && (
                    <div className="bg-[#F7F4FC] p-2 rounded">
                      <span className="text-[#7A6B9E] font-medium block mb-1">Customer</span>
                      <span className="text-[#1E1533] font-semibold">{proposal.customer_name}</span>
                    </div>
                  )}
                  {proposal.industry && (
                    <div className="bg-[#F7F4FC] p-2 rounded">
                      <span className="text-[#7A6B9E] font-medium block mb-1">Industry</span>
                      <span className="text-[#1E1533] font-semibold">{proposal.industry}</span>
                    </div>
                  )}
                  {proposal.contract_years && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                      <span className="text-amber-700 font-medium block mb-1">Contract Tenure</span>
                      <span className="text-amber-700 font-semibold">{proposal.contract_years} year{proposal.contract_years > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {proposal.price_escalation_percent && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                      <span className="text-amber-700 font-medium block mb-1">Price Escalation / Year</span>
                      <span className="text-amber-700 font-semibold">{proposal.price_escalation_percent}%</span>
                    </div>
                  )}
                </div>

                {/* Other One-Time Line Items (toggles + optional TBD fees) */}
                {(proposal.include_dms_training || proposal.include_sfa_training || proposal.include_flexidms_deployment || proposal.customization_fee || proposal.workshop_fee) && (
                  <div className="mt-4">
                    <h4 className="font-bold text-[#1E1533] mb-2 text-sm">Other One-Time Line Items</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {proposal.include_dms_training && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-1">DMS Training included</span>
                      )}
                      {proposal.include_sfa_training && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-1">SFA Training included</span>
                      )}
                      {proposal.include_flexidms_deployment && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-1">Flexi DMS Deployment included</span>
                      )}
                      {proposal.customization_fee && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-1">Customization: ₹{proposal.customization_fee.toLocaleString('en-IN')}</span>
                      )}
                      {proposal.workshop_fee && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-2 py-1">Workshop/Data Migration: ₹{proposal.workshop_fee.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                )}

                {proposal.additional_fees && proposal.additional_fees.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-bold text-[#1E1533] mb-2 text-sm">Extra Charges</h4>
                    <div className="space-y-1">
                      {proposal.additional_fees.map((fee, fIndex) => (
                        <div key={fIndex} className="flex justify-between text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2">
                          <span className="text-[#5B4B7A]">{fee.name}</span>
                          <span className="text-[#1E1533] font-semibold">₹{fee.value.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ongoing / Recurring & Subscription Charges (Table B.2) */}
                {[
                  { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                  { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                  { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                  { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee' },
                ].some(({ key }) => proposal[key]) && (
                  <div className="mt-4">
                    <h4 className="font-bold text-[#1E1533] mb-2 text-sm">Ongoing / Recurring &amp; Subscription Charges</h4>
                    <div className="space-y-2">
                      {[
                        { key: 'flexidms_distributor_charge', label: 'Flexi DMS – Distributor Users' },
                        { key: 'dms_distributor_charge', label: 'No. of Distributors for DMS' },
                        { key: 'sfa_user_charge', label: 'No. of SFA Users' },
                        { key: 'shared_l1_support_charge', label: 'Shared L1 Support Fee' },
                      ].filter(({ key }) => proposal[key]).map(({ key, label }) => (
                        <div key={key} className="bg-teal-50 border border-teal-200 rounded px-3 py-2 text-xs">
                          <span className="text-teal-700 font-semibold block mb-1">{label}</span>
                          {proposal[key].description && (
                            <p className="text-teal-700 mb-2">{proposal[key].description}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2 text-teal-700">
                            {proposal[key].quantity != null && (
                              <span>Qty: <span className="font-semibold">{proposal[key].quantity}</span></span>
                            )}
                            {proposal[key].rate_per_user_month != null && (
                              <span>Rate: <span className="font-semibold">₹{proposal[key].rate_per_user_month.toLocaleString('en-IN')}/mo</span></span>
                            )}
                            {proposal[key].monthly_minimum_billing != null && (
                              <span>Min. Billing: <span className="font-semibold">₹{proposal[key].monthly_minimum_billing.toLocaleString('en-IN')}</span></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {proposal.comments && (
                  <div className="bg-[#F7F4FC] p-2 rounded mt-3">
                    <span className="text-[#7A6B9E] font-medium text-xs block mb-1">Comments</span>
                    <p className="text-[#1E1533] text-xs">{proposal.comments}</p>
                  </div>
                )}
              </div>
            )}

            {/* Finance-only: About the Customer & Profitability.
                Visible only to Finance/CFO/Admin; editable only by Finance
                while the proposal sits at the Finance stage. */}
            {canViewFinanceFields() && (
              <div className="border-t border-[#E4DCF0] pt-4 mt-4" data-testid="finance-only-section">
                <h3 className="text-sm font-heading font-bold text-[#1E1533] mb-3 flex items-center gap-2">
                  Finance Notes
                  <span className="text-[10px] uppercase font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Finance / CFO only
                  </span>
                </h3>

                {canEditFinanceFields() ? (
                  <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <Label htmlFor="about-customer">About the Customer</Label>
                      <Textarea
                        id="about-customer"
                        value={aboutCustomer}
                        onChange={(e) => setAboutCustomer(e.target.value)}
                        placeholder="Background on the customer, relationship history, credit notes, etc."
                        rows={4}
                        data-testid="about-customer-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profitability">Profitability</Label>
                      <Textarea
                        id="profitability"
                        value={profitability}
                        onChange={(e) => setProfitability(e.target.value)}
                        placeholder="Margin analysis, expected profitability, cost breakdown, etc."
                        rows={4}
                        data-testid="profitability-input"
                      />
                    </div>
                    <Button
                      onClick={handleSaveFinanceDetails}
                      disabled={savingFinanceDetails}
                      className="bg-[#9B30FF] hover:bg-[#7518F2] text-white"
                      data-testid="save-finance-details-button"
                    >
                      {savingFinanceDetails ? 'Saving...' : 'Save Finance Notes'}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                      <span className="text-purple-700 font-medium block mb-1">About the Customer</span>
                      <span className="text-[#1E1533] whitespace-pre-wrap">
                        {proposal.about_customer || 'Not filled in yet by Finance.'}
                      </span>
                    </div>
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                      <span className="text-purple-700 font-medium block mb-1">Profitability</span>
                      <span className="text-[#1E1533] whitespace-pre-wrap">
                        {proposal.profitability || 'Not filled in yet by Finance.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Version History */}
          {showVersionHistory && versions.length > 1 && (
            <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <GitBranch size={24} />
                  Version History
                </h2>
                <Tabs value={versionTab} onValueChange={setVersionTab}>
                  <TabsList>
                    <TabsTrigger value="history" data-testid="version-history-tab">History</TabsTrigger>
                    <TabsTrigger value="compare" data-testid="version-compare-tab">Compare</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Compare tab: pick any two versions via dropdowns, then click Compare */}
              {versionTab === 'compare' && (
                <div className="mb-6 space-y-5">
                  <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-[#F7F4FC] border border-[#E4DCF0] rounded-lg">
                    <div className="flex-1 w-full space-y-1.5">
                      <Label className="text-xs font-semibold text-[#5B4B7A]">Version A</Label>
                      <select
                        value={compareA}
                        onChange={(e) => setCompareA(e.target.value)}
                        data-testid="compare-version-a"
                        className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4DCF0] text-sm text-[#1E1533] focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF]"
                      >
                        <option value="">Select a version...</option>
                        {versions.slice().sort((a, b) => b.version_number - a.version_number).map((v) => (
                          <option key={v.version_number} value={v.version_number} className="bg-[#FFFFFF] text-[#1E1533]">
                            {v.version_label}{v.version_number === proposal.current_version ? ' (Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="hidden sm:block text-[#8577A3] pb-2">vs</span>

                    <div className="flex-1 w-full space-y-1.5">
                      <Label className="text-xs font-semibold text-[#5B4B7A]">Version B</Label>
                      <select
                        value={compareB}
                        onChange={(e) => setCompareB(e.target.value)}
                        data-testid="compare-version-b"
                        className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4DCF0] text-sm text-[#1E1533] focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF]"
                      >
                        <option value="">Select a version...</option>
                        {versions.slice().sort((a, b) => b.version_number - a.version_number).map((v) => (
                          <option key={v.version_number} value={v.version_number} className="bg-[#FFFFFF] text-[#1E1533]">
                            {v.version_label}{v.version_number === proposal.current_version ? ' (Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      onClick={handleCompareClick}
                      disabled={!compareA || !compareB || compareA === compareB}
                      data-testid="compare-button"
                      className="text-white shrink-0"
                      style={{ backgroundColor: '#9B30FF' }}
                    >
                      Compare
                    </Button>
                  </div>

                  {compareA && compareB && compareA === compareB && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                      Select two different versions to compare.
                    </div>
                  )}

              {/* Version Comparison View: full commercial diff between the two chosen versions */}
              {activeComparison && getVersionComparison() && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  {(() => {
                    const { older, newer } = getVersionComparison();
                    const simpleDiffs = getSimpleFieldDiffs(older, newer);
                    const chargeDiffs = getChargeDiffs(older, newer);
                    const feeDiffs = getAdditionalFeesDiff(older, newer);

                    const changedSimple = simpleDiffs.filter((d) => d.changed);
                    const changedCharges = chargeDiffs.filter((d) => d.status !== 'unchanged');
                    const changedFees = feeDiffs.filter((d) => d.status !== 'unchanged');
                    const totalChanges = changedSimple.length + changedCharges.length + changedFees.length;

                    const statusBadge = (status) => {
                      const map = {
                        added: 'bg-emerald-100 text-emerald-700',
                        removed: 'bg-red-100 text-red-700',
                        changed: 'bg-amber-100 text-amber-700',
                      };
                      return <Badge className={`text-xs font-semibold border-0 ${map[status]}`}>{status}</Badge>;
                    };

                    return (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-2 bg-red-100 rounded">
                            <Badge className="bg-red-600">{older.version_label}</Badge>
                            <p className="text-xs mt-1">{new Date(older.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-center p-2 bg-green-100 rounded">
                            <Badge className="bg-green-600">{newer.version_label}</Badge>
                            <p className="text-xs mt-1">{new Date(newer.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-blue-800">
                          {totalChanges === 0
                            ? 'No commercial differences between these versions.'
                            : `${totalChanges} change${totalChanges === 1 ? '' : 's'} found`}
                        </div>

                        {/* Simple fields */}
                        {simpleDiffs.map((diff) => (
                          <div
                            key={diff.key}
                            className={`grid grid-cols-2 gap-4 p-3 rounded ${diff.changed ? 'bg-amber-50 border border-amber-300' : 'bg-[#FFFFFF] border border-[#E4DCF0]'}`}
                          >
                            <div>
                              <p className="text-xs font-semibold text-[#7A6B9E] mb-1">{diff.label}</p>
                              <p className={`text-sm ${diff.changed ? 'line-through text-red-700' : 'text-[#1E1533]'}`}>
                                {diff.oldDisplay}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#7A6B9E] mb-1">{diff.label}</p>
                              <p className={`text-sm ${diff.changed ? 'font-bold text-emerald-700' : 'text-[#1E1533]'}`}>
                                {diff.newDisplay}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Ongoing charges */}
                        {chargeDiffs.map((diff) => (
                          <div
                            key={diff.key}
                            className={`p-3 rounded ${diff.status !== 'unchanged' ? 'bg-amber-50 border border-amber-300' : 'bg-[#FFFFFF] border border-[#E4DCF0]'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-[#7A6B9E]">{diff.label}</p>
                              {diff.status !== 'unchanged' && statusBadge(diff.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <p className={`text-sm ${diff.status === 'removed' || diff.status === 'changed' ? 'line-through text-red-700' : 'text-[#1E1533]'}`}>
                                {formatChargeLine(diff.oldCharge) || '—'}
                              </p>
                              <p className={`text-sm ${diff.status === 'added' || diff.status === 'changed' ? 'font-bold text-emerald-700' : 'text-[#1E1533]'}`}>
                                {formatChargeLine(diff.newCharge) || '—'}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Extra Charges */}
                        {feeDiffs.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-[#7A6B9E]">Extra Charges</p>
                            {feeDiffs.map((diff) => (
                              <div
                                key={diff.name}
                                className={`flex items-center justify-between p-3 rounded ${diff.status !== 'unchanged' ? 'bg-amber-50 border border-amber-300' : 'bg-[#FFFFFF] border border-[#E4DCF0]'}`}
                              >
                                <span className="text-sm text-[#1E1533]">{diff.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${diff.status === 'removed' ? 'line-through text-red-700' : 'text-[#1E1533]'}`}>
                                    {diff.oldFee ? `₹${diff.oldFee.value.toLocaleString('en-IN')}` : '—'}
                                  </span>
                                  <span className="text-[#8577A3]">→</span>
                                  <span className={`text-sm ${diff.status === 'added' || diff.status === 'changed' ? 'font-bold text-emerald-700' : 'text-[#1E1533]'}`}>
                                    {diff.newFee ? `₹${diff.newFee.value.toLocaleString('en-IN')}` : '—'}
                                  </span>
                                  {statusBadge(diff.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
                </div>
              )}

              {/* Change-note timeline */}
              {versionTab === 'history' && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-[#5B4B7A] uppercase tracking-wide mb-3">Change Timeline</h3>
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E4DCF0]"></div>
                    {versions.slice().reverse().map((version) => (
                      <div key={version.version_number} className="relative pb-5 last:pb-0">
                        <div
                          className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            version.version_number === proposal.current_version ? 'bg-indigo-600' : 'bg-[#94A3B8]'
                          }`}
                        ></div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-[#1E1533]">{version.version_label}</span>
                          <span className="text-xs text-[#8577A3]">{new Date(version.created_at).toLocaleString()}</span>
                          <span className="text-xs text-[#8577A3]">· {version.created_by?.name || 'Unknown'}</span>
                        </div>
                        <p className="text-sm text-[#5B4B7A]">{version.change_note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {versionTab === 'history' && (
              <div className="space-y-4">
                {versions.slice().reverse().map((version, index) => (
                  <div 
                    key={version.version_number} 
                    className={`p-4 rounded-lg border ${
                      version.version_number === proposal.current_version 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-[#E4DCF0] bg-[#F7F4FC]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={
                          version.version_number === proposal.current_version 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-[#E4DCF0] text-[#1E1533]'
                        }>
                          {version.version_label}
                        </Badge>
                        {version.version_number === proposal.current_version && (
                          <span className="text-xs text-indigo-700 font-semibold">CURRENT</span>
                        )}
                        {canEdit() && version.version_number !== proposal.current_version && !proposal.is_closed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreVersion(version.version_number)}
                            className="text-xs border-purple-500 text-purple-700 hover:bg-purple-500 hover:text-white"
                          >
                            Restore This Version
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(version.version_number, version.version_label)}
                          className="text-xs border-blue-500 text-blue-700 hover:bg-blue-500 hover:text-white"
                        >
                          <FilePdf size={14} className="mr-1" />
                          Download PDF
                        </Button>
                      </div>
                      <span className="text-xs text-[#7A6B9E]">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> {version.title}</p>
                      <p><strong>Customer:</strong> {version.customer_name || 'N/A'}</p>
                      <p><strong>Deal Value:</strong> {version.deal_value ? `₹${version.deal_value.toLocaleString('en-IN')}` : 'N/A'}</p>
                      <p><strong>Change Note:</strong> {version.change_note}</p>
                      <p className="text-xs text-[#7A6B9E]">
                        <strong>Created by:</strong> {version.created_by?.name || 'Unknown'} ({version.created_by?.role || 'Unknown'})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight mb-6 font-heading">Workflow Progress</h2>
            
            <div className="space-y-6" data-testid="workflow-stepper">
              {WORKFLOW_STAGES.map((stage, index) => {
                const status = getStageStatus(index);
                return (
                  <div key={stage.key} className="flex items-start gap-4" data-testid={`stage-${index}`}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                          status === 'completed'
                            ? 'bg-[#10B981] border-[#10B981] text-[#1E1533]'
                            : status === 'active'
                            ? 'bg-[#3B82F6] border-[#3B82F6] text-[#1E1533] animate-pulse'
                            : 'bg-[#FFFFFF] border-[#E4DCF0] text-[#7A6B9E]'
                        }`}
                        data-testid={`stage-circle-${index}`}
                      >
                        {status === 'completed' ? <Check size={20} weight="bold" /> : status === 'active' ? <Clock size={20} /> : index + 1}
                      </div>
                      {index < WORKFLOW_STAGES.length - 1 && (
                        <div className={`w-0.5 h-10 ${status === 'completed' ? 'bg-[#10B981]' : 'bg-[#F1EBFA]'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-sm">{stage.label}</p>
                      {stage.role && <p className="text-xs text-[#7A6B9E]">{stage.role} Review</p>}
                      {status === 'completed' && getStageTimestamp(index) && (
                        <p className="text-xs text-[#10B981] font-medium mt-0.5" data-testid={`stage-timestamp-${index}`}>
                          {new Date(getStageTimestamp(index)).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight mb-6 font-heading">History</h2>
            <div className="space-y-4" data-testid="audit-trail">
              {proposal.history.map((entry, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-[#E4DCF0] last:border-0" data-testid={`history-${index}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{entry.by.name}</span>
                      <span className="text-xs text-[#7A6B9E]">({entry.by.role})</span>
                      <Badge
                        className={`text-xs ${
                          entry.action === 'approved' ? 'bg-[#D1FAE5] text-[#059669]' : 
                          entry.action === 'rejected_closed' ? 'bg-[#DC2626] text-white' :
                          entry.action === 'returned_for_revision' ? 'bg-[#FEF3C7] text-[#D97706]' :
                          entry.action === 'restored_version' ? 'bg-[#8B5CF6] text-white' :
                          entry.action === 'rejected' ? 'bg-[#FFE4E6] text-[#E11D48]' : 
                          'bg-[#F1EBFA] text-[#1E1533]'
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
                    <p className="text-sm text-[#7A6B9E] mb-1">{entry.comment}</p>
                    <p className="text-xs text-[#8577A3]">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {canTakeAction() && (
          <div className="lg:col-span-1">
            <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm sticky top-8" data-testid="action-panel">
              <h2 className="text-xl font-bold tracking-tight mb-4 font-heading">Take Action</h2>
              
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
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-[#1E1533]"
                  >
                    <Check size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={handleReturnForRevision}
                    disabled={actionLoading}
                    data-testid="return-button"
                    variant="outline"
                    className="w-full border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white"
                  >
                    <ArrowBendUpLeft size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Return for Revision'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    data-testid="reject-button"
                    variant="outline"
                    className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-[#1E1533]"
                  >
                    <X size={20} className="mr-2" />
                    {actionLoading ? 'Processing...' : 'Reject Permanently'}
                  </Button>
                </div>
                <p className="text-xs text-[#7A6B9E] border-t pt-3">
                  <strong>Return for Revision:</strong> Sends back to Sales for editing (resubmittable).
                  <br />
                  <strong>Reject Permanently:</strong> Closes proposal (cannot be reopened).
                </p>
              </div>
            </div>
          </div>
        )}

        {canOverrideWorkflow() && (
          <div className="lg:col-span-1">
            <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm" data-testid="admin-override-panel">
              <h2 className="text-lg font-bold tracking-tight mb-2 font-heading">Admin: Override Workflow Stage</h2>
              <p className="text-xs text-[#7A6B9E] mb-4">
                Move this proposal directly to any stage, bypassing the normal one-step-at-a-time approval flow (e.g. CGO straight to CFO).
              </p>
              <div className="space-y-3">
                <select
                  value={overrideTarget}
                  onChange={(e) => setOverrideTarget(e.target.value)}
                  data-testid="override-stage-select"
                  className="w-full h-9 px-3 rounded-lg bg-[#FFFFFF] border border-[#E4DCF0] text-sm text-[#1E1533] focus:outline-none focus:ring-2 focus:ring-[#9B30FF]/30 focus:border-[#9B30FF]"
                >
                  <option value="">Select target stage...</option>
                  {WORKFLOW_STAGES.map((stage, idx) => (
                    <option key={stage.key} value={stage.key} disabled={idx === proposal.current_stage}>
                      {stage.label}{idx === proposal.current_stage ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleOverrideStage}
                  disabled={!overrideTarget || overrideLoading}
                  data-testid="override-stage-button"
                  className="w-full text-white"
                  style={{ backgroundColor: '#9B30FF' }}
                >
                  {overrideLoading ? 'Updating...' : 'Move Workflow'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Proposal confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle>Delete this proposal?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#5B4B7A]">
            This permanently deletes <strong>{proposal?.title}</strong> and its entire version and approval history. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProposal}
              disabled={deleteLoading}
              data-testid="confirm-delete-button"
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="bg-[#FFFFFF] max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span className="truncate">{proposal?.file_info?.filename || 'Document Preview'}</span>
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                className="border-[#E4DCF0] shrink-0"
              >
                <Download size={16} className="mr-2" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-[#E4DCF0] rounded bg-[#F7F4FC] min-h-[400px]">
            {previewLoading && (
              <div className="flex items-center justify-center h-full py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#9B30FF]"></div>
              </div>
            )}
            {!previewLoading && previewError && (
              <div className="flex items-center justify-center h-full py-20 text-sm text-[#7A6B9E] px-6 text-center">
                {previewError}
              </div>
            )}
            {previewKind === 'pdf' && previewObjectUrl && (
              <iframe
                src={previewObjectUrl}
                title="Document preview"
                className="w-full h-full min-h-[70vh]"
              />
            )}
            <div
              ref={previewContainerRef}
              className={previewKind === 'docx' ? 'p-4 bg-[#FFFFFF]' : 'hidden'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProposalDetail;
