import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, X, Lock, ChatText } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import DspBadge, { dspDate } from './DspBadge';
import { computeManualDsp, localToday } from '../utils/trackerCalc';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// The server is the source of truth for the stages (GET /proposals/deal-stages); this copy only
// keeps the dropdown usable if that request ever fails.
const FALLBACK_STAGES = [
  { key: 'S1', label: 'S1', short: 'S1', closed: false },
  { key: 'S2', label: 'S2', short: 'S2', closed: false },
  { key: 'S3', label: 'S3', short: 'S3', closed: false },
  { key: 'S4', label: 'S4', short: 'S4', closed: false },
  { key: 'S5', label: 'S5', short: 'S5', closed: false },
  { key: 'S6_WON', label: 'S6 · Won & Closed', short: 'Won', closed: true, outcome: 'won' },
  { key: 'S6_LOST', label: 'S6 · Lost & Closed', short: 'Lost', closed: true, outcome: 'lost' },
];
const STEPS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const PURPLE = '#9B30FF';
const GREEN = '#059669';
const RED = '#E11D48';

const shortOf = (key) => ({ S6_WON: 'Won', S6_LOST: 'Lost' }[key] || key);

const CHIP_STYLES = {
  open: 'bg-purple-100 text-purple-800 border-purple-300',
  won: 'bg-green-100 text-green-800 border-green-300',
  lost: 'bg-red-100 text-red-800 border-red-300',
};

// A small chip with the deal's current stage: S1..S5, Won or Lost.
export const DealStageChip = ({ deal, variant = 'short', className = '', testId }) => {
  if (!deal) return null;
  const tone = deal.outcome === 'won' ? 'won' : deal.outcome === 'lost' ? 'lost' : 'open';
  return (
    <span
      data-testid={testId}
      title={`Deal status: ${deal.label}`}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0 text-[10px] font-semibold ${CHIP_STYLES[tone]} ${className}`}
    >
      {variant === 'full' ? deal.label : deal.short}
    </span>
  );
};

// S1 ... S6 progress bar. Reached steps fill in; when the deal is closed the last step turns
// green (won) or red (lost).
const StatusBar = ({ deal }) => {
  const reachedTo = deal.closed ? 5 : Math.max(0, STEPS.indexOf(deal.stage));
  const endColor = deal.outcome === 'won' ? GREEN : deal.outcome === 'lost' ? RED : PURPLE;
  const lastLabel = deal.outcome === 'won' ? 'Won & Closed' : deal.outcome === 'lost' ? 'Lost & Closed' : 'Closed';

  return (
    <div
      className="flex items-start w-full max-w-3xl overflow-hidden pt-1 pb-1"
      role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={reachedTo + 1}
      aria-label={`Deal status ${deal.label}`} data-testid="deal-status-bar"
    >
      {STEPS.map((step, i) => {
        const reached = i <= reachedTo;
        const isLast = i === STEPS.length - 1;
        const color = isLast && deal.closed ? endColor : PURPLE;
        const current = i === reachedTo;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center w-12 sm:w-16 shrink-0 min-w-0" data-testid={`deal-step-${step}`} data-reached={reached}>
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                style={reached
                  ? { backgroundColor: color, borderColor: color, color: '#fff', boxShadow: current ? `0 0 0 4px ${color}33` : 'none' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#D9CFEA', color: '#8577A3' }}
              >
                {isLast && deal.closed ? (deal.outcome === 'lost' ? <X size={16} weight="bold" /> : <Check size={16} weight="bold" />) : step}
              </div>
              {isLast ? (
                <span className={`mt-1 text-[10px] sm:text-[11px] text-center leading-tight ${deal.closed ? 'font-bold text-[#1E1533]' : 'text-[#8577A3]'}`}>
                  {deal.closed ? lastLabel : 'Won / Lost'}
                </span>
              ) : (
                current && <span className="mt-1 text-[10px] sm:text-[11px] font-bold leading-tight" style={{ color: PURPLE }}>Current</span>
              )}
            </div>
            {!isLast && (
              <div className="flex-1 min-w-0 h-1 rounded mt-[14px] sm:mt-4 mx-[-6px]" style={{ backgroundColor: i < reachedTo ? PURPLE : '#E4DCF0' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const formatWhen = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DealStatusSection = ({ proposal, user, onUpdated }) => {
  const deal = proposal.deal_status || { stage: 'S1', label: 'S1', short: 'S1', closed: false, closed_on: null };
  const updates = proposal.deal_updates || [];
  const isOwner = !!user && user.id === proposal.created_by?.id;
  const locked = proposal.status === 'rejected' || proposal.is_closed;
  const start = proposal.dsp?.start || null;

  const [stages, setStages] = useState(FALLBACK_STAGES);
  const [stage, setStage] = useState(deal.stage);
  const [closedOn, setClosedOn] = useState(deal.closed_on || localToday());
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/proposals/deal-stages`, { withCredentials: true })
      .then((r) => setStages(r.data.stages))
      .catch(() => {});
  }, []);

  // After a save the page reloads the proposal; start the form again from what is now saved.
  useEffect(() => {
    setStage(deal.stage);
    setClosedOn(deal.closed_on || localToday());
  }, [deal.stage, deal.closed_on]);

  const chosen = stages.find((s) => s.key === stage) || stages[0];
  const closing = !!chosen.closed;
  const sameStage = stage === deal.stage;
  const sameDate = !closing || closedOn === deal.closed_on;
  const nothingToSave = sameStage && sameDate && !comment.trim();
  const previewDays = closing && start && closedOn ? computeManualDsp(start, closedOn).days : null;
  const notApprovedYet = chosen.outcome === 'won' && !sameStage && proposal.status !== 'approved';

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/proposals/${proposal.id}/deal-status`,
        { stage, comment: comment.trim() || null, closed_on: closing ? closedOn : null },
        { withCredentials: true },
      );
      toast.success(closing ? `Deal closed as ${chosen.outcome}. Days in sales pipeline has stopped.` : 'Deal status updated');
      setComment('');
      if (onUpdated) await onUpdated();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not update the deal status');
    } finally {
      setSaving(false);
    }
  };

  const newestFirst = [...updates].reverse();

  return (
    <div className="bg-[#FFFFFF] border border-[#E4DCF0] shadow-sm p-6 mt-4" data-testid="deal-status-section">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight font-heading text-[#1E1533]">Deal Status</h2>
          <p className="text-xs text-[#7A6B9E] mt-0.5">
            Where this deal stands with the customer. Days in Sales Pipeline keeps counting until the deal is closed as won or lost.
          </p>
        </div>
        <div className="flex items-center gap-2" data-testid="deal-status-dsp">
          <span className="text-xs text-[#7A6B9E]">Days in sales pipeline</span>
          <DspBadge dsp={proposal.dsp} size="md" />
        </div>
      </div>

      <StatusBar deal={deal} />

      {/* ---- update form: the uploader only ---- */}
      <div className="mt-6 border-t border-[#E4DCF0] pt-5">
        {isOwner && !locked && (
          <div className="space-y-4" data-testid="deal-status-form">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Deal status</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="deal-stage-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {closing && (
                <div className="space-y-1" data-testid="deal-closing-fields">
                  <Label>Closed on</Label>
                  <Input
                    type="date" value={closedOn} min={start || undefined} max={localToday()}
                    onChange={(e) => setClosedOn(e.target.value)}
                    className="h-10 bg-[#FFFFFF] text-[#1E1533]" data-testid="deal-closed-on"
                  />
                </div>
              )}
            </div>

            {closing && (
              <p className="text-xs text-[#5B4B7A] bg-[#F7F4FC] p-3" data-testid="deal-closing-preview">
                {previewDays !== null
                  ? <>Closing stops Days in Sales Pipeline at <strong>{previewDays} day{previewDays === 1 ? '' : 's'}</strong> (first proposal {dspDate(start)} → closed {dspDate(closedOn)}).</>
                  : 'Closing stops the Days in Sales Pipeline count on the date above.'}
                {' '}If you need to, you can re-open the deal later by choosing an earlier status.
              </p>
            )}
            {notApprovedYet && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3" data-testid="deal-not-approved-note">
                Heads up: this proposal has not been fully approved yet, so marking the deal as won is unusual. You can still do it.
              </p>
            )}

            <div className="space-y-1">
              <Label>Comment (update on the deal)</Label>
              <Textarea
                value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000}
                placeholder="e.g. Customer asked for a revised quote; follow-up call on Friday…"
                className="bg-[#FFFFFF] text-[#1E1533]" data-testid="deal-comment"
              />
            </div>
            <Button
              onClick={save} disabled={saving || nothingToSave} data-testid="deal-save"
              className="text-white font-semibold" style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
            >
              {saving ? 'Saving…' : closing && !deal.closed ? 'Close deal' : 'Save update'}
            </Button>
          </div>
        )}

        {isOwner && locked && (
          <p className="flex items-center gap-2 text-sm text-[#5B4B7A]" data-testid="deal-locked-note">
            <Lock size={16} /> This proposal was rejected and closed, so its deal status can no longer be changed.
          </p>
        )}

        {!isOwner && (
          <p className="flex items-center gap-2 text-sm text-[#5B4B7A] bg-[#F7F4FC] p-3" data-testid="deal-readonly-note">
            <Lock size={16} className="shrink-0" />
            {proposal.created_by?.name
              ? `Only ${proposal.created_by.name}, who uploaded this proposal, can update the deal status.`
              : 'Only the person who uploaded this proposal can update the deal status.'}{' '}You can read the updates below.
          </p>
        )}
      </div>

      {/* ---- the log of updates ---- */}
      <div className="mt-6" data-testid="deal-updates">
        <h3 className="flex items-center gap-2 text-sm font-heading font-bold text-[#1E1533] mb-3">
          <ChatText size={18} className="text-purple-700" /> Updates {updates.length > 0 && <span className="text-xs font-normal text-[#7A6B9E]">({updates.length})</span>}
        </h3>
        {newestFirst.length === 0 ? (
          <p className="text-sm text-[#7A6B9E]" data-testid="deal-no-updates">No updates yet.</p>
        ) : (
          <ol className="space-y-3">
            {newestFirst.map((u, i) => {
              const moved = u.previous_stage && u.previous_stage !== u.stage;
              return (
                <li key={`${u.timestamp}-${i}`} className="flex gap-3 border border-[#F1EBFA] p-3" data-testid={`deal-update-${i}`}>
                  <DealStageChip
                    deal={{ label: u.label, short: u.short || shortOf(u.stage), outcome: u.stage === 'S6_WON' ? 'won' : u.stage === 'S6_LOST' ? 'lost' : null }}
                    className="h-fit mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#7A6B9E]">
                      {moved ? <>Moved <strong>{shortOf(u.previous_stage)}</strong> → <strong>{shortOf(u.stage)}</strong></> : 'Comment'}
                      {u.closed_on ? <> · closed on {dspDate(u.closed_on)}</> : null}
                    </p>
                    {u.comment
                      ? <p className="text-sm text-[#1E1533] whitespace-pre-wrap break-words mt-0.5">{u.comment}</p>
                      : <p className="text-sm italic text-[#7A6B9E] mt-0.5">No comment</p>}
                    <p className="text-[11px] text-[#8577A3] mt-1">{u.by?.name} · {formatWhen(u.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};

export default DealStatusSection;
