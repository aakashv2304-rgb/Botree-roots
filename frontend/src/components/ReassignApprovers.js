import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Admin only: hand an approval stage that has not been approved yet to someone else - for when the
// named approver is away or has left, so a proposal is never stuck behind one person.
const ReassignApprovers = ({ proposal, users, onDone }) => {
  const wf = proposal.workflow_view;
  const [choice, setChoice] = useState({});
  const [busy, setBusy] = useState(null);
  const open = wf.stages.filter((s) => s.state !== 'completed');
  const inChain = new Set(wf.stages.map((s) => s.approver_id));

  const reassign = async (stage) => {
    setBusy(stage);
    try {
      await axios.post(`${API}/proposals/${proposal.id}/reassign-approver`, { stage, approver_id: choice[stage] }, { withCredentials: true });
      toast.success(`Stage ${stage} reassigned`);
      setChoice((c) => ({ ...c, [stage]: '' }));
      if (onDone) await onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not reassign the approver');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E4DCF0] p-6 shadow-sm" data-testid="reassign-panel">
      <h2 className="text-lg font-bold tracking-tight mb-2 font-heading">Admin: Reassign Approver</h2>
      <p className="text-xs text-[#7A6B9E] mb-4">
        Hand a stage that has not been approved yet to someone else, for example when its approver is away. Stages already approved stay as they are.
      </p>
      <div className="space-y-4">
        {open.map((s) => (
          <div key={s.stage} data-testid={`reassign-row-${s.stage}`}>
            <p className="text-sm font-semibold text-[#1E1533]">
              Stage {s.stage} · {s.approver_name}
              {s.state === 'active' && <span className="ml-2 text-xs font-normal text-blue-700">(waiting now)</span>}
              {s.approver_missing && <span className="ml-2 text-xs font-normal text-red-700">(no longer active)</span>}
            </p>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 min-w-0">
                <Select value={choice[s.stage] || ''} onValueChange={(v) => setChoice((c) => ({ ...c, [s.stage]: v }))}>
                  <SelectTrigger className="h-9 bg-[#FFFFFF] text-[#1E1533]" data-testid={`reassign-select-${s.stage}`}>
                    <SelectValue placeholder="Choose a new approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter((u) => u.id !== proposal.created_by.id && !inChain.has(u.id)).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button" size="sm" disabled={!choice[s.stage] || busy === s.stage} onClick={() => reassign(s.stage)}
                data-testid={`reassign-button-${s.stage}`} className="h-9 text-white" style={{ backgroundColor: '#9B30FF' }}
              >
                {busy === s.stage ? 'Saving…' : 'Reassign'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReassignApprovers;
