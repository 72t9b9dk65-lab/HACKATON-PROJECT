"""Read the supplied workbook without editing it and export the demo fixture.

Usage: python3 scripts/import-fake-transactions.py '/path/to/Fake Transactions.xlsx'
Requires openpyxl (available in the bundled Codex spreadsheet runtime).
"""

import hashlib
import json
import sys
from collections import Counter
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import openpyxl


source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=False)
sheet = workbook["Blad1"]
cells = list(sheet.iter_rows())
assert [cell.value for cell in cells[0]] == ["Date", "Category", "Amount"]
transactions = []
totals = Counter()
for row_number, row in enumerate(cells[1:], start=2):
    date, category, amount = [cell.value for cell in row]
    assert all(cell.data_type != "f" for cell in row), "Resolve formulas before importing"
    assert isinstance(date, datetime) and date.time() == datetime.min.time()
    assert row[0].number_format == "yyyy-mm-dd", "Expected date-only records"
    assert category in {"food", "medicine", "shelter", "toys"}
    ore = Decimal(str(amount)) * 100
    assert ore == ore.to_integral_value() and 0 < ore <= 1_000_000
    transactions.append({
        "row": row_number,
        "date": date.date().isoformat(),
        "category": category,
        "amountOre": int(ore),
    })
    totals[category] += int(ore)
workbook.close()

fixture = {
    "source": {
        "file": source.name,
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "sheet": sheet.title,
        "range": f"A1:C{len(cells)}",
        "currency": "SEK",
        "currencyBasis": "Workbook amounts use kr; interpreted as SEK for this Swedish demo.",
        "datePrecision": "day",
        "dogAssignments": "Not supplied. The app assigns illustrative recipients for replays.",
        "funding": "Not supplied. Demo opening funding equals the imported expense total.",
    },
    "transactions": transactions,
}
output = Path(__file__).resolve().parents[1] / "public/data/hundstallet/fake-transactions.json"
output.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"rows": len(transactions), "totalOre": sum(totals.values()), "byCategory": dict(totals)}))
