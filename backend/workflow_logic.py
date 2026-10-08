"""Approval workflow rules - pure functions (no FastAPI, no database).

There is no default workflow. Whoever creates a proposal builds its approval
chain: an ordered list of stages, each assigned to one named user (stage 1,
stage 2, ...). A proposal moves through them in order and only the person
assigned to the CURRENT stage can approve, reject or return it.

Numbering (shared with proposals created before this change, so old and new
data line up):
    current_stage 0        with the creator (returned for revision)
    current_stage 1..N     waiting for approval stage k
    current_stage N + 1    approved

Proposals created before approvers were configurable have no "workflow" field
and are approved by ROLE through the old CGO -> Finance -> Legal -> CFO chain.
That chain survives here only so that those in-flight proposals can finish
(LEGACY_CHAIN below). No new proposal can use it, and when a legacy proposal is
returned and resubmitted its creator must build a real workflow.
"""

from typing import Any, Dict, List, Optional, Tuple

MAX_APPROVAL_STAGES = 10
IN_REVIEW = "in_review"          # status of a proposal waiting on a custom-workflow approver
TERMINAL_STATUSES = ("approved", "rejected", "needs_revision")

# --- the old fixed chain: ONLY for proposals that were already in flight --------------------------
LEGACY_CHAIN = [
    {"stage": 1, "role": "CGO", "label": "CGO", "status": "cgo_review"},
    {"stage": 2, "role": "Finance", "label": "Finance", "status": "finance_review"},
    {"stage": 3, "role": "Legal", "label": "Legal", "status": "legal_review"},
    {"stage": 4, "role": "CFO", "label": "CFO", "status": "cfo_review"},
]
LEGACY_INITIAL_STATUS = "sales_submitted"   # a legacy proposal's status when first (re)submitted
LEGACY_OVERRIDE_TARGETS = {                  # what the Admin "move workflow" control could target
    "sales_submitted": 0, "cgo_review": 1, "finance_review": 2, "legal_review": 3, "cfo_review": 4, "approved": 5,
}
LEGACY_OVERRIDE_LABELS = {
    "sales_submitted": "Sales Submitted", "cgo_review": "CGO Review", "finance_review": "Finance Review",
    "legal_review": "Legal Review", "cfo_review": "CFO Review", "approved": "Approved",
}
_LEGACY_ROLE_TO_STAGE = {s["role"]: s["stage"] for s in LEGACY_CHAIN}
_ROUND_STARTS = ("created", "updated", "restored_version")   # history actions that (re)start approvals


def has_custom_workflow(proposal: Dict[str, Any]) -> bool:
    return bool(proposal.get("workflow"))


def workflow_stages(proposal: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The proposal's stages, in order: its own chain, or the legacy one for old proposals."""
    if has_custom_workflow(proposal):
        return [dict(s, stage=i) for i, s in enumerate(proposal["workflow"], start=1)]
    return [dict(s) for s in LEGACY_CHAIN]


def stage_count(proposal: Dict[str, Any]) -> int:
    return len(workflow_stages(proposal))


def status_for_stage(proposal: Dict[str, Any], stage: int) -> str:
    """The status a proposal has while waiting at `stage` (or 'approved' past the last one)."""
    if stage > stage_count(proposal):
        return "approved"
    return IN_REVIEW if has_custom_workflow(proposal) else LEGACY_CHAIN[stage - 1]["status"]


def initial_status(proposal: Dict[str, Any]) -> str:
    """Status when a proposal is submitted or resubmitted and starts at stage 1."""
    return IN_REVIEW if has_custom_workflow(proposal) else LEGACY_INITIAL_STATUS


def is_awaiting_approval(proposal: Dict[str, Any]) -> bool:
    n = stage_count(proposal)
    return proposal.get("status") not in TERMINAL_STATUSES and 1 <= int(proposal.get("current_stage", 0)) <= n


def current_stage_entry(proposal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not is_awaiting_approval(proposal):
        return None
    return workflow_stages(proposal)[int(proposal["current_stage"]) - 1]


def is_current_approver(proposal: Dict[str, Any], user: Dict[str, Any]) -> bool:
    """May this user act on the proposal right now? Custom workflow: only the person
    assigned to the current stage - not even an Admin. Legacy: anyone with the stage's role."""
    if (user and not has_custom_workflow(proposal) and proposal.get("status") == LEGACY_INITIAL_STATUS
            and int(proposal.get("current_stage", 0)) == 0):
        # Old chain only: an Admin can park a proposal back at "Sales Submitted". As before, any Sales
        # user can then send it on to the first review stage (or return/reject it).
        return user.get("role") == "Sales"
    entry = current_stage_entry(proposal)
    if entry is None or not user:
        return False
    if has_custom_workflow(proposal):
        return str(entry.get("approver_id")) == str(user.get("id"))
    return entry.get("role") == user.get("role")


def stage_label(proposal: Dict[str, Any], stage: int) -> str:
    """Short name of a stage for emails and history: 'Stage 2 · Priya Sharma' or 'CGO Review'."""
    stages = workflow_stages(proposal)
    if not 1 <= stage <= len(stages):
        return "Approved" if stage > len(stages) else "Revision"
    s = stages[stage - 1]
    if has_custom_workflow(proposal):
        return f"Stage {stage} · {s.get('approver_name') or 'approver'}"
    return f"{s['label']} Review"


def status_label(proposal: Dict[str, Any]) -> str:
    status = proposal.get("status")
    if status == "approved":
        return "Approved"
    if status == "rejected":
        return "Rejected"
    if status == "needs_revision":
        return "Needs Revision"
    entry = current_stage_entry(proposal)
    if entry is None:
        return status or ""
    if has_custom_workflow(proposal):
        return f"Stage {entry['stage']} of {stage_count(proposal)} · {entry.get('approver_name') or 'approver'}"
    return f"Under Review · {entry['label']}"


def _approval_round(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """History since the proposal was last (re)submitted - earlier rounds' approvals no longer count."""
    start = 0
    for i, h in enumerate(history):
        if h.get("action") in _ROUND_STARTS:
            start = i
    return history[start:]


def stage_completion_times(proposal: Dict[str, Any]) -> Dict[int, str]:
    """When each stage was approved, in the current round of approvals."""
    times: Dict[int, str] = {}
    for h in _approval_round(proposal.get("history") or []):
        if h.get("action") != "approved" or not h.get("timestamp"):
            continue
        stage = h.get("stage")
        if stage is None and not has_custom_workflow(proposal):
            stage = _LEGACY_ROLE_TO_STAGE.get((h.get("by") or {}).get("role"))   # old entries recorded no stage number
        if stage:
            times[int(stage)] = h["timestamp"]
    return times


def workflow_view(proposal: Dict[str, Any], user: Optional[Dict[str, Any]] = None,
                  users_by_id: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Everything a screen needs to draw the workflow, so no screen re-implements the rules.
    `users_by_id` (optional) supplies current names; the name stored at assignment time is the fallback."""
    custom = has_custom_workflow(proposal)
    status = proposal.get("status")
    current = int(proposal.get("current_stage", 0))
    done_at = stage_completion_times(proposal)

    stages = []
    for s in workflow_stages(proposal):
        i = s["stage"]
        if status == "approved":
            state = "completed"
        elif status == "needs_revision":
            state = "pending"
        elif status == "rejected":
            state = "completed" if i < current else ("rejected" if i == current else "pending")
        else:
            state = "completed" if i < current else ("active" if i == current else "pending")
        item = {"stage": i, "state": state, "completed_at": done_at.get(i)}
        if custom:
            live = users_by_id.get(str(s.get("approver_id"))) if users_by_id is not None else None
            item.update({
                "approver_id": str(s.get("approver_id")),
                "approver_name": (live or {}).get("name") or s.get("approver_name") or "Unknown user",
                "approver_role": (live or {}).get("role") or s.get("approver_role"),
                "label": (live or {}).get("name") or s.get("approver_name") or "Unknown user",
                "approver_missing": users_by_id is not None and live is None,
            })
        else:
            item.update({"approver_id": None, "approver_name": None, "approver_role": s["role"], "label": s["label"], "approver_missing": False})
        stages.append(item)

    awaiting = None
    entry = current_stage_entry(proposal)
    if entry is not None:
        awaiting = next(x for x in stages if x["stage"] == entry["stage"])
        awaiting = {k: awaiting[k] for k in ("stage", "approver_id", "approver_name", "approver_role", "label")}

    can_act = bool(user) and is_current_approver(proposal, user)
    view = {
        "custom": custom, "stage_count": len(stages), "current_stage": current, "stages": stages,
        "awaiting": awaiting, "status_label": status_label(proposal) if not custom else _label_with_live_name(proposal, awaiting),
        "can_act": can_act,
        "can_edit_finance": can_act and bool(user) and user.get("role") == "Finance",
        "override_options": override_options(proposal, stages),
    }
    return view


def override_options(proposal: Dict[str, Any], stages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The places the Admin 'move workflow' control can send this proposal. Built here so the
    screen never needs to know the stage keys (old chain or new)."""
    current = int(proposal.get("current_stage", 0))
    if has_custom_workflow(proposal):
        waiting = is_awaiting_approval(proposal)
        options = [{"value": f"stage_{s['stage']}", "label": f"Stage {s['stage']} · {s['label']}",
                    "current": waiting and s["stage"] == current} for s in stages]
        options.append({"value": "approved", "label": "Approved", "current": proposal.get("status") == "approved"})
        return options
    return [{"value": key, "label": LEGACY_OVERRIDE_LABELS[key], "current": index == current}
            for key, index in LEGACY_OVERRIDE_TARGETS.items()]


def _label_with_live_name(proposal: Dict[str, Any], awaiting: Optional[Dict[str, Any]]) -> str:
    if awaiting is None:
        return status_label(proposal)
    return f"Stage {awaiting['stage']} of {stage_count(proposal)} · {awaiting['approver_name']}"


# --------------------------------------------------------------------------------------------------
# Building and changing a workflow
# --------------------------------------------------------------------------------------------------

def _stage_snapshot(position: int, user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "stage": position, "approver_id": str(user["id"]), "approver_name": user.get("name", ""),
        "approver_email": user.get("email", ""), "approver_role": user.get("role"),
    }


def validate_workflow_input(approver_ids: Any, creator_id: Any, users_by_id: Dict[str, Dict[str, Any]],
                            also_not: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    """Turn the creator's ordered list of approver ids into stored stages, or raise ValueError with a
    message fit to show. `users_by_id` must contain ACTIVE users only (access-pending and rejected
    accounts are not valid approvers). Names and emails always come from the user record, never the client.
    The creator - and anyone in `also_not`, e.g. the person resubmitting a returned proposal - can't be an approver."""
    ids = [str(x).strip() for x in (approver_ids or []) if str(x or "").strip()]
    if not ids:
        raise ValueError("Add at least one approval stage before submitting")
    if len(ids) > MAX_APPROVAL_STAGES:
        raise ValueError(f"A workflow can have at most {MAX_APPROVAL_STAGES} approval stages")
    forbidden = {str(creator_id)} | {str(x) for x in also_not}
    seen = set()
    stages = []
    for position, uid in enumerate(ids, start=1):
        user = users_by_id.get(uid)
        if user is None:
            raise ValueError(f"The approver chosen for stage {position} is not an active user")
        if uid in forbidden:
            raise ValueError(f"{user.get('name', 'This person')} cannot approve a proposal they created or submitted - choose someone else for stage {position}")
        if uid in seen:
            raise ValueError(f"{user.get('name', 'This person')} is assigned to more than one stage - each stage needs a different person")
        seen.add(uid)
        stages.append(_stage_snapshot(position, user))
    return stages


def validate_reassignment(proposal: Dict[str, Any], stage: Any, new_user: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Admin hands a stage that has NOT been approved yet to someone else. Returns the whole new
    workflow list; raises ValueError otherwise."""
    if not has_custom_workflow(proposal):
        raise ValueError("This proposal still uses the old role-based chain, so it has no named approvers to change. "
                         "It gets a real workflow when it is returned for revision and resubmitted")
    if proposal.get("status") in ("approved", "rejected") or proposal.get("is_closed"):
        raise ValueError("This proposal is already finished, so its approvers can't be changed")
    try:
        stage = int(stage)
    except (TypeError, ValueError):
        raise ValueError("Choose a valid stage")
    stages = workflow_stages(proposal)
    if not 1 <= stage <= len(stages):
        raise ValueError("Choose a valid stage")
    current = int(proposal.get("current_stage", 0))
    if proposal.get("status") != "needs_revision" and stage < current:
        raise ValueError(f"Stage {stage} has already been approved, so it can't be reassigned")
    if new_user is None:
        raise ValueError("The new approver is not an active user")
    if str(new_user["id"]) == str(proposal.get("created_by")):
        raise ValueError("The person who created this proposal cannot also approve it")
    for s in stages:
        if s["stage"] != stage and str(s.get("approver_id")) == str(new_user["id"]):
            raise ValueError(f"{new_user.get('name', 'This person')} is already assigned to stage {s['stage']}")
    out = [dict(s) for s in proposal["workflow"]]
    out[stage - 1] = _stage_snapshot(stage, new_user)
    return out


def resolve_override_target(proposal: Dict[str, Any], target: Any) -> Tuple[int, str]:
    """Where the Admin 'move workflow' control sends a proposal -> (current_stage, status).
    Custom workflows: 'stage_<k>' or 'approved'. Legacy proposals keep the old keys."""
    key = str(target or "")
    n = stage_count(proposal)
    if has_custom_workflow(proposal):
        if key == "approved":
            return n + 1, "approved"
        if key.startswith("stage_") and key[6:].isdigit() and 1 <= int(key[6:]) <= n:
            return int(key[6:]), IN_REVIEW
        raise ValueError("Invalid target stage")
    if key in LEGACY_OVERRIDE_TARGETS:
        return LEGACY_OVERRIDE_TARGETS[key], key
    raise ValueError("Invalid target stage")
