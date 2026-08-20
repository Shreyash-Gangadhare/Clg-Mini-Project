"""
analytics_sample.py — Synthetic sample dataset for the Insights module.

PURPOSE
-------
Injected into the analytics endpoint ONLY when ``?demo=1`` is passed AND
the real Order table has fewer than MIN_REAL_ORDERS rows.

This module has zero business logic — it only supplies raw data in exactly
the same shape that real Order/OrderItem DB rows would produce after being
processed by analytics.py.

REMOVAL
-------
To switch to live data, stop passing ``?demo=1`` from the frontend or delete
this file.  The InsightsView will fall through to real DB data automatically.

IS_SAMPLE_DATA flag in every response tells the frontend to show the amber
"sample data" banner.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

# ------------------------------------------------------------------
# Flag — always True in this module, always False in real responses.
# ------------------------------------------------------------------
IS_SAMPLE_DATA = True

# ------------------------------------------------------------------
# Precomputed analytics output that mirrors analytics.py return types.
# These values are realistic for a mid-sized college canteen.
# ------------------------------------------------------------------

SAMPLE_PEAK_HOURS = [
    {'hour': 8,  'label': '08:00', 'count': 12},
    {'hour': 9,  'label': '09:00', 'count': 31},
    {'hour': 10, 'label': '10:00', 'count': 47},
    {'hour': 11, 'label': '11:00', 'count': 38},
    {'hour': 12, 'label': '12:00', 'count': 62},
    {'hour': 13, 'label': '13:00', 'count': 55},
    {'hour': 14, 'label': '14:00', 'count': 28},
    {'hour': 15, 'label': '15:00', 'count': 19},
    {'hour': 16, 'label': '16:00', 'count': 14},
    {'hour': 17, 'label': '17:00', 'count': 7},
]

SAMPLE_PEAK_DAYS = [
    {'day_num': 1, 'day': 'Mon', 'count': 58},
    {'day_num': 2, 'day': 'Tue', 'count': 74},
    {'day_num': 3, 'day': 'Wed', 'count': 81},
    {'day_num': 4, 'day': 'Thu', 'count': 67},
    {'day_num': 5, 'day': 'Fri', 'count': 92},
    {'day_num': 6, 'day': 'Sat', 'count': 34},
]

SAMPLE_CANCELLED_ITEMS = [
    {'name': 'Lunch Thali',              'count': 8,  'value': '1200.00'},
    {'name': 'Masala Cheese Grill Sandwich', 'count': 5, 'value': '850.00'},
    {'name': 'Cheese Masala Dosa',       'count': 4,  'value': '320.00'},
    {'name': 'Schezwan Rice',            'count': 3,  'value': '240.00'},
    {'name': 'Manchurian Noodles',       'count': 2,  'value': '180.00'},
]

SAMPLE_REVENUE_BY_CATEGORY = [
    {'category': 'made_to_order', 'label': 'Made to Order', 'revenue': '18640.00'},
    {'category': 'ready_stock',   'label': 'Ready Stock',   'revenue': '7320.00'},
]

SAMPLE_ORDERS_PROCESSED = {
    'total': 313,
    'picked_up': 271,
    'cancelled': 18,
    'pending': 24,
}

SAMPLE_WASTE_REDUCTION = {
    'reduction_pct': 68.4,
    'baseline_units': 1890,
    'actual_units': 597,
    'note': (
        'Pre-ordering reduced estimated food preparation by 68.4% '
        'vs cooking to full slot capacity (1890 → 597 units).'
    ),
}

SAMPLE_WAIT_TIME = {
    'actual_minutes': 4.2,
    'baseline_minutes': 15,
    'reduction_pct': 72.0,
    'note': (
        'Median end-to-end time for 271 picked-up orders: '
        '4.2 min vs 15 min walk-up baseline.'
    ),
}


def get_sample_payload() -> dict:
    """Return the complete sample analytics payload."""
    return {
        'is_sample_data': True,
        'peak_hours': SAMPLE_PEAK_HOURS,
        'peak_days': SAMPLE_PEAK_DAYS,
        'cancelled_items': SAMPLE_CANCELLED_ITEMS,
        'revenue_by_category': SAMPLE_REVENUE_BY_CATEGORY,
        'orders_processed': SAMPLE_ORDERS_PROCESSED,
        'waste_reduction': SAMPLE_WASTE_REDUCTION,
        'wait_time': SAMPLE_WAIT_TIME,
    }
