import React from 'react';

// Days in Sales Pipeline: first proposal -> the day the deal is CLOSED (won or lost) by its owner.
// Approval inside Botree does not stop it. The number always comes
// from the server (`dsp` on every proposal), so every screen agrees with the
// dashboard, the tracker and the emails.
//
//   variant "full"    -> "21 days · Won & Closed"  (headers, lists with room)
//   variant "compact" -> "21d"                     (tight cards)
//   variant "inline"  -> "Won in 21d" / "Lost after 7d" /   (feeds, alerts, notifications:
//                        "10d in pipeline" / "7d to reject"   says what the number means)
//   variant "status"  -> "Won & Closed" (status only, next to a big number)
//   size "sm" | "md"  -> small by default for compact/inline, normal otherwise
const STYLES = {
  won: 'bg-green-100 text-green-800 border-green-300',
  lost: 'bg-red-100 text-red-800 border-red-300',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',   // closed, outcome not recorded (typed dates on a tracker)
  in_pipeline: 'bg-amber-100 text-amber-800 border-amber-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',       // rejected and closed by the approvers
};
const STATUS_LABEL = { won: 'Won & Closed', lost: 'Lost & Closed', closed: 'Closed', in_pipeline: 'In pipeline', rejected: 'Rejected' };
const ENDED = { won: 'closed as won', lost: 'closed as lost', closed: 'closed', rejected: 'rejected' };

export const dspDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const dspTooltip = (dsp) => {
  const end = dsp.end ? dspDate(dsp.end) : 'today (still open)';
  const verb = ENDED[dsp.status] || '';
  return `Days in sales pipeline: first proposal ${dspDate(dsp.start)} → ${verb ? `${verb} ` : ''}${end}`;
};

const DspBadge = ({ dsp, variant = 'full', size, className = '', testId }) => {
  if (!dsp || dsp.days === null || dsp.days === undefined || !STYLES[dsp.status]) return null;
  const plural = dsp.days === 1 ? '' : 's';
  const text = {
    full: `${dsp.days} day${plural} · ${STATUS_LABEL[dsp.status]}`,
    compact: `${dsp.days}d`,
    inline: {
      won: `Won in ${dsp.days}d`, lost: `Lost after ${dsp.days}d`, closed: `Closed in ${dsp.days}d`,
      rejected: `${dsp.days}d to reject`, in_pipeline: `${dsp.days}d in pipeline`,
    }[dsp.status],
    status: STATUS_LABEL[dsp.status],
  }[variant];
  // small for tight spots (cards, feeds); normal size wherever there is room - pass size="md" to force it
  const small = (size || (variant === 'compact' || variant === 'inline' ? 'sm' : 'md')) === 'sm';
  const sizeClass = small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      title={dspTooltip(dsp)}
      data-testid={testId}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold ${sizeClass} ${STYLES[dsp.status]} ${className}`}
    >
      {text}
    </span>
  );
};

export default DspBadge;
