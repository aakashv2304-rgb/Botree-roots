import React, { useMemo, useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown, Warning } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const MAX_APPROVAL_STAGES = 10;

// Builds a proposal's approval chain: pick a person, click "Add approval stage N", repeat.
// `value` is the ordered list of approver user ids. There is no default chain - it starts empty.
//   users      everyone who can be chosen (GET /users/directory)
//   excludeIds people who can't approve this proposal (its creator / whoever is resubmitting it)
//   names      optional id -> name, so an approver who is no longer active can still be shown
const WorkflowBuilder = ({ users, value, onChange, excludeIds = [], names = {}, disabled = false }) => {
  const [pick, setPick] = useState('');
  const byId = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const available = users.filter((u) => !value.includes(u.id) && !excludeIds.includes(u.id));
  const nextNo = value.length + 1;
  const atMax = value.length >= MAX_APPROVAL_STAGES;

  const add = () => {
    if (!pick) return;
    onChange([...value, pick]);
    setPick('');
  };
  const remove = (i) => onChange(value.filter((_, j) => j !== i));
  const move = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div data-testid="workflow-builder">
      {value.length === 0 ? (
        <p className="text-sm text-[#7A6B9E] mb-3" data-testid="workflow-empty">
          No approval stages yet. Choose an approver below and click “Add approval stage 1”. The proposal will go to each person in the order you add them.
        </p>
      ) : (
        <ol className="space-y-2 mb-4">
          {value.map((id, i) => {
            const u = byId[id];
            const inactive = !u;
            return (
              <li
                key={id} data-testid={`workflow-stage-${i}`}
                className={`flex items-center gap-3 border p-3 ${inactive ? 'border-red-300 bg-red-50' : 'border-[#E4DCF0] bg-[#FFFFFF]'}`}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#7A6B9E]">Approval stage {i + 1}</p>
                  <p className="font-semibold text-sm text-[#1E1533] truncate" data-testid={`workflow-stage-name-${i}`}>
                    {u ? u.name : (names[id] || 'Unknown user')}
                    {u?.role && <span className="ml-2 text-xs font-normal text-[#7A6B9E]">{u.role}</span>}
                  </p>
                  {inactive && (
                    <p className="flex items-center gap-1 text-xs text-red-700 mt-0.5">
                      <Warning size={14} /> No longer an active user - remove them and choose someone else.
                    </p>
                  )}
                </div>
                {!disabled && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move stage ${i + 1} up`}
                      data-testid={`workflow-up-${i}`} className="p-1.5 rounded text-[#5B4B7A] hover:bg-[#F1EBFA] disabled:opacity-30 disabled:cursor-not-allowed">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move stage ${i + 1} down`}
                      data-testid={`workflow-down-${i}`} className="p-1.5 rounded text-[#5B4B7A] hover:bg-[#F1EBFA] disabled:opacity-30 disabled:cursor-not-allowed">
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" onClick={() => remove(i)} aria-label={`Remove stage ${i + 1}`}
                      data-testid={`workflow-remove-${i}`} className="p-1.5 rounded text-red-700 hover:bg-red-50">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!disabled && !atMax && (
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <Select key={nextNo} value={pick} onValueChange={setPick}>
              <SelectTrigger className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="workflow-user-select">
                <SelectValue placeholder={`Select the approver for stage ${nextNo}`} />
              </SelectTrigger>
              <SelectContent>
                {available.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</SelectItem>
                ))}
                {available.length === 0 && <div className="px-3 py-2 text-sm text-[#7A6B9E]">Everyone available is already in this workflow</div>}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button" onClick={add} disabled={!pick} data-testid="workflow-add-button"
            className="h-10 text-white font-semibold whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
          >
            <Plus size={16} className="mr-1" /> Add approval stage {nextNo}
          </Button>
        </div>
      )}
      {atMax && <p className="text-xs text-[#7A6B9E]" data-testid="workflow-max">A workflow can have at most {MAX_APPROVAL_STAGES} approval stages.</p>}
      {value.length > 0 && (
        <p className="text-xs text-[#7A6B9E] mt-3">
          {value.length} approval stage{value.length === 1 ? '' : 's'}. The proposal is fully approved once the last person signs off.
        </p>
      )}
    </div>
  );
};

export default WorkflowBuilder;
