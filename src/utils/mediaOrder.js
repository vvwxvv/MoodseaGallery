/**
 * mediaOrder.js — generic helpers for JSON `order` fields.
 *
 * Several collections store `order` as a JSON object so one record can carry
 * an independent position for each page it appears on:
 *
 *   Artwork.order = { artist_page_order, exhibition_page_order, art_fair_page_order }
 *   Image.order   = { artist_page_order, exhibition_page_order,
 *                     art_fair_page_order, rolling_img_order }
 *
 * Legacy rows still have a plain string `order`; every helper tolerates that
 * (a string is treated as the value for whatever key is asked).
 */

// Human labels for each sub-order key (en/cn), shared by forms + manager.
export const ORDER_KEY_LABELS = Object.freeze({
  artist_page_order: { en: "Artist Page Order", cn: "艺术家页排序" },
  exhibition_page_order: { en: "Exhibition Page Order", cn: "展览页排序" },
  art_fair_page_order: { en: "Art Fair Page Order", cn: "艺博会页排序" },
  rolling_img_order: { en: "Rolling Image Order", cn: "轮播图排序" },
});

// Which sub-keys each collection uses.
export const ORDER_KEYS = Object.freeze({
  artwork: ["artist_page_order", "exhibition_page_order", "art_fair_page_order"],
  image: [
    "artist_page_order",
    "exhibition_page_order",
    "art_fair_page_order",
    "rolling_img_order",
  ],
});

/** True when `order` is the JSON object shape (not the legacy string). */
export const isOrderObject = (order) =>
  !!order && typeof order === "object" && !Array.isArray(order);

/** Empty { key: "" } object for a given key list. */
export const emptyOrder = (keys) =>
  keys.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

/**
 * Coerce any stored `order` into a full object for the given keys.
 * - object → filled with the known keys (missing keys become "")
 * - string  → legacy value, copied to every key (keeps old behaviour)
 * - empty   → all keys ""
 */
export const normalizeOrder = (order, keys) => {
  const out = emptyOrder(keys);
  if (isOrderObject(order)) {
    for (const k of keys) {
      const v = order[k];
      out[k] = v === undefined || v === null ? "" : String(v);
    }
    return out;
  }
  if (typeof order === "string" && order.trim() !== "") {
    for (const k of keys) out[k] = order;
    return out;
  }
  return out;
};

/** Read the order value for one page key. */
export const getOrder = (record, key) => {
  const order = record?.order;
  if (isOrderObject(order)) {
    const v = order[key];
    return v === undefined || v === null ? "" : String(v);
  }
  return typeof order === "string" ? order : ""; // legacy string
};

/** Numeric sort value; missing / non-numeric → 0. */
export const orderValue = (record, key) => Number(getOrder(record, key)) || 0;

/** Comparator for arrays of records, by a specific order key (ascending). */
export const compareOrder = (key) => (a, b) => orderValue(a, key) - orderValue(b, key);

// ── Image convenience wrappers ──────────────────────────────────────────────
export const IMAGE_ORDER_KEYS = ORDER_KEYS.image;
export const EMPTY_IMAGE_ORDER = Object.freeze(emptyOrder(IMAGE_ORDER_KEYS));
export const normalizeImageOrder = (order) => normalizeOrder(order, IMAGE_ORDER_KEYS);
export const getImageOrder = (record, key = "artist_page_order") => getOrder(record, key);
