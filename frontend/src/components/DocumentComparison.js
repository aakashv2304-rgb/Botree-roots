import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DocumentComparison = ({ sourceFileId, editedFileId, proposalId, versionNumber }) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        source_file_id: sourceFileId,
        edited_file_id: editedFileId,
      };
      if (proposalId) {
        payload.proposal_id = proposalId;
        if (versionNumber) payload.version_number = versionNumber;
      }
      const { data } = await axios.post(`${API}/proposals/compare-documents`, payload, { withCredentials: true });
      setComparison(data);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Could not compare the two Word documents');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const count = comparison?.summary?.total_changes || 0;

  return (
    <div className="mt-3 space-y-3" data-testid="document-comparison">
      <Button
        type="button"
        variant="outline"
        onClick={handleCompare}
        disabled={loading || !sourceFileId || !editedFileId}
        data-testid="compare-document-changes-button"
        className="border-[#9B30FF] text-[#6E27A8] hover:bg-[#F7F1FC]"
      >
        {loading ? 'Comparing Documents...' : comparison ? 'Refresh Comparison' : 'Compare Changes'}
      </Button>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {comparison && (
        <div className="rounded-lg border border-[#E4DCF0] bg-white p-4 space-y-3" data-testid="document-comparison-results">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#1E1533]">Document changes</p>
              <p className="text-xs text-[#7A6B9E]">Generated version compared with the uploaded final version</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-800">+ {comparison.summary.added} added</span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-800">− {comparison.summary.removed} removed</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{comparison.summary.modified} modified</span>
            </div>
          </div>

          {count === 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              No text changes detected between the generated and uploaded documents.
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto rounded-md border border-[#E8E1F0]">
              <div className="grid grid-cols-2 gap-2 border-b border-[#E8E1F0] bg-[#F7F4FC] px-3 py-2 text-xs font-semibold text-[#5B4B7A] sticky top-0">
                <div>Original generated document</div>
                <div>Edited uploaded document</div>
              </div>
              {comparison.changes.map((change, index) => (
                <div key={`${change.status}-${index}`} className="border-b border-[#EEE9F4] last:border-b-0 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      change.status === 'added'
                        ? 'bg-green-100 text-green-800'
                        : change.status === 'removed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {change.status}
                    </span>
                    <span className="text-[11px] text-[#8577A3]">{change.section}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs leading-relaxed">
                    <div className={`min-w-0 whitespace-pre-wrap break-words rounded-md border p-2 ${
                      change.original
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-dashed border-[#E8E1F0] bg-[#FAF9FC] text-[#A49AB5] italic'
                    }`}>
                      {change.original || '— No original text —'}
                    </div>
                    <div className={`min-w-0 whitespace-pre-wrap break-words rounded-md border p-2 ${
                      change.edited
                        ? 'border-green-200 bg-green-50 text-green-900'
                        : 'border-dashed border-[#E8E1F0] bg-[#FAF9FC] text-[#A49AB5] italic'
                    }`}>
                      {change.edited || '— No replacement text —'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-[#8577A3]">{comparison.scope}</p>
          <p className="text-[11px] text-[#8577A3]">{comparison.summary.unchanged} unchanged text blocks were not expanded above.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentComparison;
