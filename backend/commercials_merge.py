"""
Fills sales-entered commercial numbers into the standard Botree base
proposal document:

  - Table B.1 "One-time Charges": fills matched rows, removes any row
    whose value wasn't provided by Sales, and appends a new row for each
    "Extra Charge" Sales added.
  - Table B.2 "Ongoing Charges": fills matched rows, removes any row left
    entirely blank.
  - Section B.3 (Price Escalation): replaces the "8%" figure.
  - Section B.4 (Contract Duration): replaces the "7 (seven) years" figure.

Only the specific tokens/rows described above are touched - everything
else in the document (T&Cs, other tables, formatting) is left exactly
as uploaded.

Only .docx is supported. If the uploaded file isn't a .docx, callers
should skip the merge and use the file as-is.
"""
import copy
import io
from typing import Optional
from docx import Document
from docx.table import _Row


def _format_inr(value: Optional[float]) -> Optional[str]:
    """Format a number using Indian digit grouping, e.g. 1234567 -> '12,34,567'."""
    if value is None:
        return None
    is_negative = value < 0
    value = abs(value)
    if float(value).is_integer():
        int_part = str(int(value))
        decimal_part = ""
    else:
        s = f"{value:.2f}"
        int_part, decimal_part = s.split(".")
        decimal_part = "." + decimal_part

    if len(int_part) > 3:
        last3 = int_part[-3:]
        rest = int_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        int_part = ",".join(groups) + "," + last3

    return ("-" if is_negative else "") + int_part + decimal_part


def _format_plain_number(value: Optional[float]) -> Optional[str]:
    """Format a number without currency grouping, e.g. 8.0 -> '8', 7.5 -> '7.5'."""
    if value is None:
        return None
    if float(value).is_integer():
        return str(int(value))
    return f"{value:g}"


_NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven",
    8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
    14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
    19: "nineteen", 20: "twenty",
}


def _number_to_words(n: int) -> str:
    return _NUMBER_WORDS.get(int(n), str(int(n)))


def _set_cell_text(cell, new_text: str):
    """Overwrite a table cell's text, keeping the formatting of its first run."""
    paragraph = cell.paragraphs[0]
    if paragraph.runs:
        paragraph.runs[0].text = new_text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(new_text)
    for extra_p in cell.paragraphs[1:]:
        extra_p._element.getparent().remove(extra_p._element)


def _find_table(doc: Document, required_headers: list):
    """Return the first table whose header row contains all required header
    substrings (case-insensitive), or None if not found."""
    for table in doc.tables:
        if not table.rows:
            continue
        header_cells = [c.text.strip().lower() for c in table.rows[0].cells]
        header_text = " | ".join(header_cells)
        if all(h.lower() in header_text for h in required_headers):
            return table
    return None


def _remove_row(table, row):
    table._tbl.remove(row._tr)


def _clone_row_after(table, anchor_row, cell_texts: list):
    """Clone anchor_row's XML, place it directly after anchor_row in the
    table, fill its cells with cell_texts (by column index), and return the
    new row (so callers can chain further clones after it)."""
    new_tr = copy.deepcopy(anchor_row._tr)
    anchor_row._tr.addnext(new_tr)
    new_row = _Row(new_tr, table)
    for i, text in enumerate(cell_texts):
        if i < len(new_row.cells) and text is not None:
            _set_cell_text(new_row.cells[i], text)
    return new_row


# Row label (lowercased, substring match against col-0 text) -> the
# ProposalCreate field(s) that supply the value(s) for that row.
ONE_TIME_FEE_ROWS = {
    "one-time setup fee": "one_time_setup_fee",
    "integration fee": "integration_fee",
}
ONE_TIME_TOGGLE_ROWS = {
    "dms training": "include_dms_training",
    "sfa training": "include_sfa_training",
    "flexi dms -": "include_flexidms_deployment",   # "Flexi DMS - Deployment / ..."
}
ONE_TIME_TBD_ROWS = {
    "any customization fee": "customization_fee",
    "workshop fee": "workshop_fee",
}

ONGOING_ROW_MAP = {
    "flexi dms": "flexidms_distributor_charge",        # "Flexi DMS – Distributor Users"
    "distributors for dms": "dms_distributor_charge",   # "No. of Distributors for DMS"
    "sfa users": "sfa_user_charge",                     # "No. of SFA Users"
    "shared l1 support fee": "shared_l1_support_charge",
}


def _merge_one_time_table(doc: Document, commercial_data: dict):
    table = _find_table(doc, ["type of fees", "fees", "invoicing"])
    if table is None:
        return

    header = [c.text.strip().lower() for c in table.rows[0].cells]
    try:
        fees_col = next(i for i, h in enumerate(header) if "inr" in h)
    except StopIteration:
        fees_col = None

    rows_to_remove = []
    last_kept_row = table.rows[0]

    for row in list(table.rows)[1:]:
        label = row.cells[0].text.strip().lower()
        matched = False

        for key, field in ONE_TIME_FEE_ROWS.items():
            if label.startswith(key):
                matched = True
                value = commercial_data.get(field)
                if value is None:
                    rows_to_remove.append(row)
                elif fees_col is not None:
                    _set_cell_text(row.cells[fees_col], _format_inr(value))
                break

        if not matched:
            for key, field in ONE_TIME_TOGGLE_ROWS.items():
                if label.startswith(key):
                    matched = True
                    if not commercial_data.get(field):
                        rows_to_remove.append(row)
                    break

        if not matched:
            for key, field in ONE_TIME_TBD_ROWS.items():
                if label.startswith(key):
                    matched = True
                    value = commercial_data.get(field)
                    if value is None:
                        rows_to_remove.append(row)
                    elif fees_col is not None:
                        _set_cell_text(row.cells[fees_col], _format_inr(value))
                    break

        if row not in rows_to_remove:
            last_kept_row = row

    # Clone the "Integration fee" row (a clean 4-column single-line row) as
    # the template for any Extra Charges, before removing anything.
    extra_charge_template = None
    for row in table.rows[1:]:
        if row.cells[0].text.strip().lower().startswith("integration fee"):
            extra_charge_template = copy.deepcopy(row._tr)
            break

    for row in rows_to_remove:
        _remove_row(table, row)

    additional_fees = commercial_data.get("additional_fees") or []
    if additional_fees and extra_charge_template is not None:
        anchor_tr = last_kept_row._tr if last_kept_row not in rows_to_remove else table.rows[0]._tr
        # last_kept_row may have been removed if e.g. only fixed-rate rows
        # existed and were all skipped - fall back to the header row so we
        # still insert right after it.
        anchor_row = _Row(anchor_tr, table)
        for fee in additional_fees:
            name = fee.get("name") or "Additional Charge"
            value = fee.get("value")
            new_row = _clone_row_after(
                table, anchor_row,
                [name, "", _format_inr(value) if value is not None else "", ""]
            )
            anchor_row = new_row


def _merge_ongoing_table(doc: Document, commercial_data: dict):
    table = _find_table(doc, ["quantity", "rate", "monthly minimum billing"])
    if table is None:
        return

    header = [c.text.strip().lower() for c in table.rows[0].cells]
    col_idx = {}
    for i, h in enumerate(header):
        if h == "quantity":
            col_idx["quantity"] = i
        elif h.startswith("rate"):
            col_idx["rate"] = i
        elif "minimum billing" in h:
            col_idx["min_billing"] = i

    rows_to_remove = []
    for row in list(table.rows)[1:]:
        label = row.cells[0].text.strip().lower()
        for key, field in ONGOING_ROW_MAP.items():
            if key in label:
                charge = commercial_data.get(field)
                if not charge or all(
                    charge.get(k) is None
                    for k in ("quantity", "rate_per_user_month", "monthly_minimum_billing")
                ):
                    rows_to_remove.append(row)
                else:
                    if charge.get("quantity") is not None and "quantity" in col_idx:
                        _set_cell_text(row.cells[col_idx["quantity"]], _format_inr(charge["quantity"]))
                    if charge.get("rate_per_user_month") is not None and "rate" in col_idx:
                        _set_cell_text(row.cells[col_idx["rate"]], _format_inr(charge["rate_per_user_month"]))
                    if charge.get("monthly_minimum_billing") is not None and "min_billing" in col_idx:
                        _set_cell_text(row.cells[col_idx["min_billing"]], _format_inr(charge["monthly_minimum_billing"]))
                break

    for row in rows_to_remove:
        _remove_row(table, row)


def _replace_price_escalation(doc: Document, percent_value: Optional[float]):
    if percent_value is None:
        return
    for p in doc.paragraphs:
        if "would be increased by" in p.text:
            for run in p.runs:
                if run.text.strip().replace(".", "", 1).isdigit():
                    run.text = _format_plain_number(percent_value)
                    return
            return


def _replace_contract_duration(doc: Document, years_value: Optional[int]):
    if years_value is None:
        return
    for p in doc.paragraphs:
        if "shall continue to be in force for" in p.text:
            runs = p.runs
            for i, run in enumerate(runs):
                if run.text.strip().isdigit():
                    run.text = str(int(years_value))
                    for j in range(i + 1, len(runs)):
                        if runs[j].text.strip().isalpha():
                            runs[j].text = _number_to_words(years_value)
                            break
                    return
            return


def fill_commercials(docx_bytes: bytes, commercial_data: dict) -> bytes:
    """
    commercial_data keys (all optional):
      one_time_setup_fee, integration_fee: float
      include_dms_training, include_sfa_training, include_flexidms_deployment: bool
      customization_fee, workshop_fee: float
      flexidms_distributor_charge / dms_distributor_charge /
      sfa_user_charge / shared_l1_support_charge: dict with
        quantity, rate_per_user_month, monthly_minimum_billing
      additional_fees: list of {"name": str, "value": float}
      price_escalation_percent: float
      contract_years: int

    Any Table B.1/B.2 row whose value(s) weren't provided is removed
    entirely from the returned document. Extra Charges are appended as new
    rows in Table B.1. Returns the merged document as bytes.
    """
    doc = Document(io.BytesIO(docx_bytes))

    _merge_one_time_table(doc, commercial_data)
    _merge_ongoing_table(doc, commercial_data)
    _replace_price_escalation(doc, commercial_data.get("price_escalation_percent"))
    _replace_contract_duration(doc, commercial_data.get("contract_years"))

    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()
