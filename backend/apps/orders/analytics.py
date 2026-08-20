"""
analytics.py — CampusEats order analytics module.

All functions accept a Django queryset of Order objects as their primary
input and return plain Python dicts/lists suitable for JSON serialisation.
No side effects, no hardcoded values.

Functions are intentionally kept small and independently testable.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import (
    Avg, Count, ExpressionWrapper, F, FloatField, IntegerField, Q, Sum,
)
from django.db.models.functions import (
    ExtractHour, ExtractIsoWeekDay, TruncDate,
)
from django.utils import timezone


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

WEEKDAY_LABELS = {
    1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu',
    5: 'Fri', 6: 'Sat', 7: 'Sun',
}

# Assumed average wait time (minutes) in a walk-up queue scenario.
# Used as the baseline for estimating wait-time reduction.
WALK_UP_BASELINE_MINUTES: int = 15

# Minimum order count below which we decline to estimate waste/wait metrics.
MIN_ORDERS_FOR_ESTIMATE: int = 5


# ---------------------------------------------------------------------------
# Peak ordering hours
# ---------------------------------------------------------------------------

def compute_peak_hours(order_qs) -> list[dict[str, Any]]:
    """
    Return the count of orders placed in each hour of the day (0–23).

    Args:
        order_qs: Queryset of Order instances to analyse.

    Returns:
        List of dicts ``[{'hour': int, 'label': str, 'count': int}]``
        sorted by hour ascending. Hours with zero orders are omitted.
    """
    rows = (
        order_qs
        .annotate(hour=ExtractHour('created_at'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('hour')
    )
    return [
        {
            'hour': r['hour'],
            'label': f"{r['hour']:02d}:00",
            'count': r['count'],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Peak ordering days
# ---------------------------------------------------------------------------

def compute_peak_days(order_qs) -> list[dict[str, Any]]:
    """
    Return order count grouped by ISO weekday (Mon=1 … Sun=7).

    Args:
        order_qs: Queryset of Order instances.

    Returns:
        List of dicts ``[{'day_num': int, 'day': str, 'count': int}]``
        sorted Monday→Sunday. Days with zero orders are omitted.
    """
    rows = (
        order_qs
        .annotate(day_num=ExtractIsoWeekDay('created_at'))
        .values('day_num')
        .annotate(count=Count('id'))
        .order_by('day_num')
    )
    return [
        {
            'day_num': r['day_num'],
            'day': WEEKDAY_LABELS.get(r['day_num'], str(r['day_num'])),
            'count': r['count'],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Cancelled item analysis
# ---------------------------------------------------------------------------

def compute_cancelled_items(order_qs) -> list[dict[str, Any]]:
    """
    Return the most-cancelled items by unit count and ₹ value.

    Considers only orders whose status is 'cancelled'.

    Args:
        order_qs: Queryset of Order instances (full history, not filtered).

    Returns:
        List of dicts sorted by ``count`` descending::

            [
              {
                'name': str,
                'count': int,           # total units cancelled
                'value': str,           # total ₹ lost (2 dp string)
              },
              ...
            ]
    """
    from apps.orders.models import OrderItem  # avoid circular at module level

    rows = (
        OrderItem.objects
        .filter(order__in=order_qs.filter(status='cancelled'))
        .values('menu_item__name')
        .annotate(
            count=Sum('quantity'),
            value=Sum(
                ExpressionWrapper(
                    F('quantity') * F('price_at_order'),
                    output_field=FloatField(),
                )
            ),
        )
        .order_by('-count')[:10]
    )
    return [
        {
            'name': r['menu_item__name'],
            'count': r['count'],
            'value': f"{r['value']:.2f}",
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Revenue by category
# ---------------------------------------------------------------------------

def compute_revenue_by_category(order_qs) -> list[dict[str, Any]]:
    """
    Return total paid revenue grouped by MenuItem.category.

    Only includes paid orders (payment_status='paid').

    Args:
        order_qs: Queryset of Order instances.

    Returns:
        List of dicts sorted by revenue descending::

            [{'category': str, 'label': str, 'revenue': str}, ...]
    """
    from apps.orders.models import OrderItem

    CATEGORY_LABELS = {
        'ready_stock': 'Ready Stock',
        'made_to_order': 'Made to Order',
    }

    paid_qs = order_qs.filter(payment_status='paid')
    rows = (
        OrderItem.objects
        .filter(order__in=paid_qs)
        .values('menu_item__category')
        .annotate(
            revenue=Sum(
                ExpressionWrapper(
                    F('quantity') * F('price_at_order'),
                    output_field=FloatField(),
                )
            )
        )
        .order_by('-revenue')
    )
    return [
        {
            'category': r['menu_item__category'],
            'label': CATEGORY_LABELS.get(r['menu_item__category'], r['menu_item__category']),
            'revenue': f"{r['revenue']:.2f}",
        }
        for r in rows
        if r['revenue'] is not None
    ]


# ---------------------------------------------------------------------------
# Total orders processed
# ---------------------------------------------------------------------------

def compute_orders_processed(order_qs) -> dict[str, Any]:
    """
    Return order counts broken down by status.

    Args:
        order_qs: Queryset of Order instances.

    Returns:
        Dict with keys: ``total``, ``picked_up``, ``cancelled``, ``pending``.
    """
    total = order_qs.count()
    picked_up = order_qs.filter(status='picked_up').count()
    cancelled = order_qs.filter(status='cancelled').count()
    pending = total - picked_up - cancelled
    return {
        'total': total,
        'picked_up': picked_up,
        'cancelled': cancelled,
        'pending': max(0, pending),
    }


# ---------------------------------------------------------------------------
# Estimated food-waste reduction
# ---------------------------------------------------------------------------

def compute_waste_reduction(order_qs) -> dict[str, Any]:
    """
    Estimate food-waste reduction vs a "cook-everything-upfront" baseline.

    Methodology:
    - **Baseline** (cook everything): sum of ``SlotItemCapacity.max_units``
      for all slots that had at least one paid order.
    - **Actual** demand: sum of ``OrderItem.quantity`` for paid orders.
    - **Reduction %** = (baseline − actual) / baseline × 100

    Rationale: In a traditional canteen the cook prepares up to slot-capacity
    units of every item. With pre-ordering, only committed quantities are
    prepared. The delta represents avoided over-production.

    Args:
        order_qs: Queryset of Order instances.

    Returns:
        Dict with keys ``reduction_pct`` (float | None), ``baseline_units``,
        ``actual_units``, and ``note``.
    """
    from apps.orders.models import OrderItem
    from apps.slots.models import SlotItemCapacity

    paid_qs = order_qs.filter(payment_status='paid')
    if paid_qs.count() < MIN_ORDERS_FOR_ESTIMATE:
        return {
            'reduction_pct': None,
            'baseline_units': None,
            'actual_units': None,
            'note': 'Not enough data to estimate (need ≥5 paid orders).',
        }

    # Actual units pre-ordered (paid)
    actual = (
        OrderItem.objects
        .filter(order__in=paid_qs)
        .aggregate(total=Sum('quantity'))['total'] or 0
    )

    # Baseline: max_units across slots that had paid orders
    slot_ids = paid_qs.values_list('slot_id', flat=True).distinct()
    baseline = (
        SlotItemCapacity.objects
        .filter(slot_id__in=slot_ids)
        .aggregate(total=Sum('max_units'))['total'] or 0
    )

    if baseline == 0 or actual >= baseline:
        return {
            'reduction_pct': None,
            'baseline_units': int(baseline),
            'actual_units': int(actual),
            'note': 'Capacity data insufficient to compute reduction.',
        }

    reduction_pct = round((baseline - actual) / baseline * 100, 1)
    return {
        'reduction_pct': reduction_pct,
        'baseline_units': int(baseline),
        'actual_units': int(actual),
        'note': (
            f'Pre-ordering reduced estimated food preparation by {reduction_pct}% '
            f'vs cooking to full slot capacity ({baseline} → {actual} units).'
        ),
    }


# ---------------------------------------------------------------------------
# Estimated pickup wait-time reduction
# ---------------------------------------------------------------------------

def compute_wait_time_reduction(order_qs) -> dict[str, Any]:
    """
    Estimate average pickup wait-time reduction vs a walk-up queue baseline.

    Methodology:
    - **Actual wait**: median of (``updated_at`` − ``created_at``) in minutes
      for orders with ``status='picked_up'``. ``updated_at`` is set when the
      order is scanned as picked up, making it a reasonable proxy for the
      actual end-to-end time.
    - **Baseline**: ``WALK_UP_BASELINE_MINUTES`` (15 min). Represents the
      average time a student would wait in a walk-up queue at peak hours.
    - **Reduction %** = (baseline − actual) / baseline × 100

    Args:
        order_qs: Queryset of Order instances.

    Returns:
        Dict with keys ``actual_minutes`` (float | None), ``baseline_minutes``,
        ``reduction_pct`` (float | None), and ``note``.
    """
    picked_up_qs = order_qs.filter(status='picked_up')
    count = picked_up_qs.count()

    if count < MIN_ORDERS_FOR_ESTIMATE:
        return {
            'actual_minutes': None,
            'baseline_minutes': WALK_UP_BASELINE_MINUTES,
            'reduction_pct': None,
            'note': 'Not enough picked-up orders to estimate (need ≥5).',
        }

    # Compute duration in seconds using database, then convert
    durations = list(
        picked_up_qs.annotate(
            duration_s=ExpressionWrapper(
                F('updated_at') - F('created_at'),
                output_field=FloatField(),
            )
        ).values_list('duration_s', flat=True)
    )

    # duration_s may be a timedelta; convert to seconds
    secs = []
    for d in durations:
        try:
            secs.append(float(d.total_seconds()) if hasattr(d, 'total_seconds') else float(d))
        except (TypeError, ValueError):
            continue

    if not secs:
        return {
            'actual_minutes': None,
            'baseline_minutes': WALK_UP_BASELINE_MINUTES,
            'reduction_pct': None,
            'note': 'Could not parse order timestamps.',
        }

    secs.sort()
    mid = len(secs) // 2
    median_s = secs[mid] if len(secs) % 2 else (secs[mid - 1] + secs[mid]) / 2
    actual_minutes = round(median_s / 60, 1)
    baseline = WALK_UP_BASELINE_MINUTES

    if actual_minutes >= baseline:
        reduction_pct = 0.0
    else:
        reduction_pct = round((baseline - actual_minutes) / baseline * 100, 1)

    return {
        'actual_minutes': actual_minutes,
        'baseline_minutes': baseline,
        'reduction_pct': reduction_pct,
        'note': (
            f'Median end-to-end time for {count} picked-up orders: '
            f'{actual_minutes} min vs {baseline} min walk-up baseline.'
        ),
    }
