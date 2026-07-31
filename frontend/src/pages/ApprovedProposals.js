import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Download } from '@phosphor-icons/react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ApprovedProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data } = await axios.get(`${API}/proposals?status=approved`, { withCredentials: true });
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (proposal) => {
    setDownloadingId(proposal.id);
    try {
      const response = await axios.get(`${API}/proposals/${proposal.id}/download`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', proposal.file_info?.filename || `${proposal.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0F172A]"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="approved-page">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-black tracking-tight mb-2">Approved Proposals</h1>
        <p className="text-gray-600 font-body">The final proposal document for each approved proposal</p>
      </div>

      <div className="bg-white border border-[#E4E4E7] shadow-sm">
        <div className="divide-y divide-[#E4E4E7]">
          {proposals.length === 0 ? (
            <div className="p-12 text-center text-[#71717A]" data-testid="no-approved">
              <p>No approved proposals yet</p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                data-testid={`approved-proposal-${proposal.id}`}
                className="p-6 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-lg font-semibold truncate"
                    style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}
                  >
                    {proposal.title}
                  </h3>
                  <p className="text-[#71717A] text-xs mt-1 truncate">
                    {proposal.file_info?.filename || 'Document'}
                  </p>
                </div>
                <Badge className="bg-[#10B981] text-white flex-shrink-0" data-testid={`approved-status-${proposal.id}`}>
                  Approved
                </Badge>
                <Button
                  onClick={() => handleDownload(proposal)}
                  disabled={downloadingId === proposal.id}
                  data-testid={`approved-download-${proposal.id}`}
                  className="flex-shrink-0 bg-[#0F172A] hover:bg-[#1E293B] text-white"
                >
                  <Download size={18} className="mr-2" />
                  {downloadingId === proposal.id ? 'Downloading...' : 'Download Document'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovedProposals;
