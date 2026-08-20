"""
recommendations.py — CampusEats item recommendation engine.

Computes item-to-item similarity from historical OrderItem co-occurrence
data using pandas and cosine similarity (numpy). Returns top-N recommended
items given a target item or a basket of items.

Design decisions
----------------
* **Per-order co-occurrence** (not per-user): In a college canteen, most
  students order 1–3 times before meaningful personal history accumulates.
  Per-order co-occurrence ("A and B appeared together in the same order")
  yields useful signal from as few as 20 orders across 72 items, which is
  realistic for a first week of usage.

* **Cold-start handling**: Two separate fallback paths (``fallback_category``
  and ``fallback_popularity``) that are distinguishable in code and in the
  API response via the ``source`` field.  They are never silently blended
  with cosine-similarity results.

* **Caching**: The similarity matrix is NOT cached inside this module.
  Caching is the responsibility of the caller (view layer) so the cache
  strategy can change without touching analysis logic.

* **PEP-8 + docstrings**: every public function is documented.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from django.db.models import Count, Sum


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Below this many total non-cancelled orders, the co-occurrence matrix is too
# sparse to produce meaningful similarities.  Fall back to popularity instead.
MIN_ORDERS_FOR_SIMILARITY: int = 20

# How many top results to return when no explicit ``n`` is requested.
DEFAULT_TOP_N: int = 3


# ---------------------------------------------------------------------------
# Matrix construction
# ---------------------------------------------------------------------------

def build_cooccurrence_matrix(order_qs) -> pd.DataFrame:
    """
    Build a symmetric item×item co-occurrence count matrix.

    Each cell ``matrix[i][j]`` is the number of orders in which both
    item ``i`` and item ``j`` were ordered together.  The diagonal
    (item co-occurring with itself) is zeroed out so it cannot appear
    as a self-recommendation.

    Args:
        order_qs: Django queryset of ``Order`` instances.  Should cover
            the order history you want recommendations based on.  Cancelled
            orders are included here — a co-occurrence is still informative
            even if the order was later cancelled.

    Returns:
        A ``pd.DataFrame`` with both index and columns equal to the set
        of all ``menu_item_id`` values found in the order history.
        Returns an empty ``DataFrame`` if there are no order items.
    """
    from apps.orders.models import OrderItem

    # Pull (order_id, menu_item_id) pairs efficiently
    pairs = list(
        OrderItem.objects
        .filter(order__in=order_qs)
        .values_list('order_id', 'menu_item__id')
    )

    if not pairs:
        return pd.DataFrame()

    df = pd.DataFrame(pairs, columns=['order_id', 'item_id'])

    # Pivot: rows = orders, cols = items, values = 1 if ordered else 0
    pivot = (
        df.assign(present=1)
        .pivot_table(index='order_id', columns='item_id', values='present', fill_value=0)
    )

    # Co-occurrence = pivot.T @ pivot
    cooc = pivot.T @ pivot

    # NumPy 2.x returns a read-only view from matrix multiplication.
    # We need a writeable copy before zeroing the diagonal.
    cooc = cooc.copy()

    # Zero the diagonal (self-similarity is meaningless for recommendations)
    np.fill_diagonal(cooc.values, 0)

    return cooc


def compute_cosine_similarity(cooc: pd.DataFrame) -> pd.DataFrame:
    """
    Normalise a co-occurrence matrix to produce item-to-item cosine similarity.

    Cosine similarity treats each item's co-occurrence row as a vector and
    measures the angle between vectors.  Items with similar ordering patterns
    score highly even if their absolute co-occurrence counts differ.

    Args:
        cooc: Square symmetric co-occurrence ``DataFrame`` produced by
            :func:`build_cooccurrence_matrix`.

    Returns:
        A ``DataFrame`` of the same shape with values in ``[0.0, 1.0]``.
        Returns an empty ``DataFrame`` if ``cooc`` is empty.
    """
    if cooc.empty:
        return pd.DataFrame()

    mat = cooc.values.astype(float)
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    # Avoid division by zero for items with no co-occurrences
    norms = np.where(norms == 0, 1.0, norms)
    normed = mat / norms

    sim_mat = normed @ normed.T
    return pd.DataFrame(sim_mat, index=cooc.index, columns=cooc.columns)


# ---------------------------------------------------------------------------
# Fallback helpers
# ---------------------------------------------------------------------------

def _popularity_fallback(
    exclude_ids: set[int],
    menu_qs,
    order_qs,
    n: int,
    same_category_item=None,
) -> tuple[list[dict[str, Any]], str]:
    """
    Return the N most-ordered available items, optionally filtered by category.

    This is the shared fallback used by both cold-start paths so the logic
    is never duplicated.  The two paths remain distinct only in *which*
    ``same_category_item`` is passed:

    * ``fallback_category`` (new item): ``same_category_item`` is the target
      ``MenuItem`` object; items from the same category are ranked first.
    * ``fallback_popularity`` (low data volume): ``same_category_item=None``
      so the full catalogue is ranked by global popularity.

    Args:
        exclude_ids:         Set of item IDs to exclude (cart + target item).
        menu_qs:             QuerySet of all available ``MenuItem`` objects.
        order_qs:            QuerySet of ``Order`` objects for popularity scoring.
        n:                   How many results to return.
        same_category_item:  If supplied, preference is given to items in the
                             same ``category`` field.  Other available items
                             are appended if fewer than ``n`` same-category
                             items are available.

    Returns:
        Tuple of ``(items_list, source_label)`` where ``source_label`` is
        ``"fallback_category"`` or ``"fallback_popularity"``.
    """
    from apps.orders.models import OrderItem

    # Popularity counts (by total units ordered) across non-cancelled orders
    popularity = dict(
        OrderItem.objects
        .filter(order__in=order_qs.exclude(status='cancelled'))
        .values('menu_item_id')
        .annotate(units=Sum('quantity'))
        .values_list('menu_item_id', 'units')
    )

    available = list(
        menu_qs.filter(is_available=True).exclude(id__in=exclude_ids)
    )

    # Sort by popularity descending (0 for items with no history)
    available.sort(key=lambda m: popularity.get(m.id, 0), reverse=True)

    if same_category_item is not None:
        # Split: same-category first, then the rest
        same_cat = [m for m in available if m.category == same_category_item.category]
        other = [m for m in available if m.category != same_category_item.category]
        ranked = (same_cat + other)[:n]
        source = 'fallback_category'
    else:
        ranked = available[:n]
        source = 'fallback_popularity'

    return [_menu_item_to_dict(m) for m in ranked], source


def _menu_item_to_dict(item) -> dict[str, Any]:
    """Serialise a ``MenuItem`` instance to a plain dict for the API response."""
    return {
        'id': item.id,
        'name': item.name,
        'price': str(item.price),
        'emoji': getattr(item, 'emoji', '🍽️') or '🍽️',
        'veg_flag': item.veg_flag,
        'is_available': item.is_available,
        'category': item.category,
        'ui_category': getattr(item, 'ui_category', item.category),
    }


def _sim_top_n(
    sim_df: pd.DataFrame,
    target_id: int,
    exclude_ids: set[int],
    menu_qs,
    n: int,
) -> list[dict[str, Any]]:
    """
    Extract top-N similar items for ``target_id`` from a similarity matrix.

    Items that are unavailable or in ``exclude_ids`` are skipped.

    Args:
        sim_df:      Cosine-similarity ``DataFrame``.
        target_id:   The ``menu_item_id`` whose row we want to rank.
        exclude_ids: IDs to skip in results.
        menu_qs:     QuerySet of ``MenuItem`` for availability check.
        n:           Number of results to return.

    Returns:
        List of item dicts (may be shorter than ``n`` if few similar items
        are available).
    """
    if target_id not in sim_df.index:
        return []

    available_ids = set(
        menu_qs.filter(is_available=True).values_list('id', flat=True)
    )

    row = sim_df.loc[target_id].drop(index=list(exclude_ids), errors='ignore')
    # Filter to available items only
    row = row[row.index.isin(available_ids)]
    row = row[row > 0]  # skip zero-similarity items

    if row.empty:
        return []

    top_ids = list(row.nlargest(n).index)
    items_by_id = {m.id: m for m in menu_qs.filter(id__in=top_ids)}
    return [_menu_item_to_dict(items_by_id[i]) for i in top_ids if i in items_by_id]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_item_recommendations(
    item_id: int,
    cart_ids: list[int],
    n: int,
    order_qs,
    menu_qs,
    sim_df: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """
    Return up to ``n`` recommended items for a given menu item.

    Cold-start cases are handled as follows:

    1. **Too few orders** (< ``MIN_ORDERS_FOR_SIMILARITY``):
       Sitewide popularity fallback.  ``source = "fallback_popularity"``.

    2. **Item has no co-occurrence history** (not in similarity matrix):
       Same-category popularity fallback.  ``source = "fallback_category"``.

    3. **Normal case**: Cosine-similarity top-N, excluding cart items and
       the target item itself.  ``source = "cosine_similarity"``.

    Args:
        item_id:   The ``MenuItem.id`` for which to find recommendations.
        cart_ids:  List of item IDs currently in the student's cart.
                   These are excluded from results.
        n:         Maximum number of recommendations to return.
        order_qs:  Queryset of ``Order`` objects for the co-occurrence matrix.
        menu_qs:   Queryset of ``MenuItem`` objects for availability filtering.
        sim_df:    Pre-computed similarity DataFrame (pass from cache to avoid
                   recomputing on every request).  If ``None``, will be built
                   fresh (useful in tests).

    Returns:
        Dict with keys ``item_id``, ``recommendations`` (list of item dicts),
        and ``source`` (str — one of the three values above).
    """
    exclude_ids = set(cart_ids) | {item_id}
    total_orders = order_qs.count()

    # ── Path 1: too little data ──────────────────────────────────────────────
    if total_orders < MIN_ORDERS_FOR_SIMILARITY:
        try:
            target_item = menu_qs.get(id=item_id)
        except Exception:
            target_item = None
        recs, source = _popularity_fallback(
            exclude_ids, menu_qs, order_qs, n,
            same_category_item=target_item,
        )
        # If target item is new (not in popularity but category known) → fallback_category
        if target_item is not None:
            source = 'fallback_category'
        return {'item_id': item_id, 'recommendations': recs, 'source': source}

    # ── Build/reuse similarity matrix ───────────────────────────────────────
    if sim_df is None or sim_df.empty:
        cooc = build_cooccurrence_matrix(order_qs)
        sim_df = compute_cosine_similarity(cooc)

    # ── Path 2: item not in matrix (brand-new item) ──────────────────────────
    if sim_df.empty or item_id not in sim_df.index:
        try:
            target_item = menu_qs.get(id=item_id)
        except Exception:
            target_item = None
        recs, _ = _popularity_fallback(
            exclude_ids, menu_qs, order_qs, n,
            same_category_item=target_item,
        )
        return {'item_id': item_id, 'recommendations': recs, 'source': 'fallback_category'}

    # ── Path 3: cosine similarity ────────────────────────────────────────────
    recs = _sim_top_n(sim_df, item_id, exclude_ids, menu_qs, n)

    # If similarity returns nothing useful, fall back to category popularity
    if not recs:
        try:
            target_item = menu_qs.get(id=item_id)
        except Exception:
            target_item = None
        recs, _ = _popularity_fallback(
            exclude_ids, menu_qs, order_qs, n,
            same_category_item=target_item,
        )
        return {'item_id': item_id, 'recommendations': recs, 'source': 'fallback_category'}

    return {'item_id': item_id, 'recommendations': recs, 'source': 'cosine_similarity'}


def get_cart_recommendations(
    cart_ids: list[int],
    n: int,
    order_qs,
    menu_qs,
    sim_df: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """
    Return up to ``n`` recommended add-ons for a basket of items.

    Strategy: aggregate the similarity scores for all items in the cart,
    then return the top-N items with the highest total score (excluding
    cart items themselves).  This surfaces items that pair well with the
    *combination* of cart contents, not just any single item.

    Cold-start:
    - Empty cart or below threshold → popularity fallback.
    - Cart items not in matrix → popularity fallback.

    Args:
        cart_ids:  List of ``MenuItem.id`` values in the current cart.
        n:         Maximum number of recommendations to return.
        order_qs:  Queryset of ``Order`` objects.
        menu_qs:   Queryset of ``MenuItem`` objects.
        sim_df:    Pre-computed similarity DataFrame or ``None``.

    Returns:
        Dict with keys ``cart_ids``, ``recommendations``, and ``source``.
    """
    exclude_ids = set(cart_ids)
    total_orders = order_qs.count()

    if not cart_ids or total_orders < MIN_ORDERS_FOR_SIMILARITY:
        recs, source = _popularity_fallback(exclude_ids, menu_qs, order_qs, n)
        return {'cart_ids': cart_ids, 'recommendations': recs, 'source': source}

    if sim_df is None or sim_df.empty:
        cooc = build_cooccurrence_matrix(order_qs)
        sim_df = compute_cosine_similarity(cooc)

    if sim_df.empty:
        recs, source = _popularity_fallback(exclude_ids, menu_qs, order_qs, n)
        return {'cart_ids': cart_ids, 'recommendations': recs, 'source': source}

    # Aggregate similarity scores across all cart items present in the matrix
    valid_cart_ids = [cid for cid in cart_ids if cid in sim_df.index]
    if not valid_cart_ids:
        recs, source = _popularity_fallback(exclude_ids, menu_qs, order_qs, n)
        return {'cart_ids': cart_ids, 'recommendations': recs, 'source': source}

    # Sum the similarity rows for all valid cart items
    agg_scores = sim_df.loc[valid_cart_ids].sum(axis=0)

    # Zero out cart items themselves
    for cid in exclude_ids:
        if cid in agg_scores.index:
            agg_scores[cid] = 0.0

    available_ids = set(
        menu_qs.filter(is_available=True).values_list('id', flat=True)
    )
    agg_scores = agg_scores[agg_scores.index.isin(available_ids)]
    agg_scores = agg_scores[agg_scores > 0]

    if agg_scores.empty:
        recs, source = _popularity_fallback(exclude_ids, menu_qs, order_qs, n)
        return {'cart_ids': cart_ids, 'recommendations': recs, 'source': source}

    top_ids = list(agg_scores.nlargest(n).index)
    items_by_id = {m.id: m for m in menu_qs.filter(id__in=top_ids)}
    recs = [_menu_item_to_dict(items_by_id[i]) for i in top_ids if i in items_by_id]

    return {'cart_ids': cart_ids, 'recommendations': recs, 'source': 'cosine_similarity'}
