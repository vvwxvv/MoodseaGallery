/**
 * mediaMarks.js — helpers for the `mark` field on media records.
 *
 * ── The mark is now a JSON object ────────────────────────────────────────────
 *
 *   mark = {
 *     value: "Slider",                        // the classic scalar mark (optional)
 *     hide:  ["artist_page", "exhibition_page"] // pages this record is hidden on
 *   }
 *
 * `value` keeps the old dropdown semantics ("Slider" / "Feature" / "Private" /
 * …). `hide` is a list of page tokens where the record must NOT appear — the
 * artwork order page eye-icon writes one token per page, so a work can be
 * hidden on several pages *independently* (artist + exhibition + art fair).
 *
 * Page tokens:
 *   "artist_page"          → artist detail page works grid
 *   "exhibition_page"      → exhibition detail page works grid
 *   "art_fair_page"        → art fair detail page works grid
 *   "artist_rolling_image" → an artist's rolling-image slideshow (images)
 *
 * ── Backward compatibility ──────────────────────────────────────────────────
 * Existing rows may still hold a plain string. Every helper tolerates it:
 *   "Slider"                              → { value: "Slider", hide: [] }
 *   "hide_in_artist_page"                 → { value: "", hide: ["artist_page"] }
 *   "hide_in_artist_page_rolling_image"   → { value: "", hide: ["artist_rolling_image"] }
 *   "hide in artist page" (any casing / separators) → normalized as above.
 */

// ── Page tokens ─────────────────────────────────────────────────────────────
export const HIDE_ARTIST_PAGE = "artist_page";
export const HIDE_EXHIBITION_PAGE = "exhibition_page";
export const HIDE_ART_FAIR_PAGE = "art_fair_page";
export const HIDE_ARTIST_ROLLING_IMAGE = "artist_rolling_image";

export const HIDE_TOKEN_LABELS = Object.freeze({
  [HIDE_ARTIST_PAGE]: { en: "Artist Page", cn: "艺术家页" },
  [HIDE_EXHIBITION_PAGE]: { en: "Exhibition Page", cn: "展览页" },
  [HIDE_ART_FAIR_PAGE]: { en: "Art Fair Page", cn: "艺博会页" },
  [HIDE_ARTIST_ROLLING_IMAGE]: {
    en: "Artist Page Rolling Image",
    cn: "艺术家页轮播图",
  },
});

/**
 * Which hide token belongs to each `order` page key (used by the order pages).
 * `rolling_img_order` is image-only.
 */
export const HIDE_TOKEN_BY_ORDER_KEY = Object.freeze({
  artist_page_order: HIDE_ARTIST_PAGE,
  exhibition_page_order: HIDE_EXHIBITION_PAGE,
  art_fair_page_order: HIDE_ART_FAIR_PAGE,
  rolling_img_order: HIDE_ARTIST_ROLLING_IMAGE,
});

/** Hide token for an order page key (or "" when unknown). */
export const hideTokenForOrderKey = (orderKey) =>
  HIDE_TOKEN_BY_ORDER_KEY[orderKey] || "";

/** { en, cn } label for an order page key's hide token (or null). */
export const hideLabelForOrderKey = (orderKey) => {
  const token = hideTokenForOrderKey(orderKey);
  return token ? HIDE_TOKEN_LABELS[token] || null : null;
};

// ── Legacy constants (kept so old imports keep working) ─────────────────────
export const IMAGE_MARK_HIDE_ARTIST_ROLLING = "hide_in_artist_page_rolling_image";
export const IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL = {
  en: "Hide in Artist Page Rolling Image",
  cn: "艺术家页轮播图隐藏",
};

const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Legacy scalar hide marks → hide tokens.
const LEGACY_HIDE_ALIASES = Object.freeze({
  [norm("hide_in_artist_page_rolling_image")]: [HIDE_ARTIST_ROLLING_IMAGE],
  [norm("hide_in_artist_page")]: [HIDE_ARTIST_PAGE],
  [norm("hide_in_exhibition_page")]: [HIDE_EXHIBITION_PAGE],
  [norm("hide_in_art_fair_page")]: [HIDE_ART_FAIR_PAGE],
});

const legacyHideTokens = (raw) => {
  const key = norm(raw);
  if (!key) return [];
  if (LEGACY_HIDE_ALIASES[key]) return [...LEGACY_HIDE_ALIASES[key]];
  if (!key.startsWith("hide")) return [];

  // Tolerant fallback for hand-written variants.
  if (key.includes("artist") && (key.includes("roll") || key.includes("img") || key.includes("image")))
    return [HIDE_ARTIST_ROLLING_IMAGE];
  if (key.includes("artist") && key.includes("page")) return [HIDE_ARTIST_PAGE];
  if (key.includes("exhibition")) return [HIDE_EXHIBITION_PAGE];
  if (key.includes("artfair") || key.includes("fair")) return [HIDE_ART_FAIR_PAGE];
  return [];
};

// ── Core normalisation ──────────────────────────────────────────────────────
/** Coerce ANY stored mark into `{ value: string, hide: string[] }`. */
export const normalizeMark = (mark) => {
  if (mark === null || mark === undefined) return { value: "", hide: [] };

  if (typeof mark === "string") {
    const tokens = legacyHideTokens(mark);
    if (tokens.length) return { value: "", hide: tokens };
    return { value: mark, hide: [] };
  }

  if (typeof mark === "object") {
    const value = typeof mark.value === "string" ? mark.value : "";
    let hide = [];
    if (Array.isArray(mark.hide)) {
      hide = mark.hide.filter((t) => typeof t === "string" && t.trim());
    } else if (mark.hide && typeof mark.hide === "object") {
      hide = Object.keys(mark.hide).filter((k) => mark.hide[k]);
    }
    // A legacy value-string hiding under `value` (e.g. {value:"hide_in_..."}).
    if (!hide.length) {
      const tokens = legacyHideTokens(value);
      if (tokens.length) return { value: "", hide: tokens };
    }
    return { value, hide: [...new Set(hide)] };
  }

  return { value: String(mark), hide: [] };
};

const readMarkSource = (recordOrMark) =>
  recordOrMark && typeof recordOrMark === "object" && "mark" in recordOrMark
    ? recordOrMark.mark
    : recordOrMark;

/** The classic scalar mark value ("" when none). */
export const getMarkValue = (recordOrMark) =>
  normalizeMark(readMarkSource(recordOrMark)).value;

/** The list of page tokens this record is hidden on. */
export const getMarkHide = (recordOrMark) =>
  normalizeMark(readMarkSource(recordOrMark)).hide;

/** Is the record hidden on the given page token? */
export const isMarkHidden = (recordOrMark, token) =>
  getMarkHide(recordOrMark).includes(token);

/** Normalised mark is effectively empty (no value, no hides). */
export const markIsEmpty = (mark) => {
  const n = normalizeMark(mark);
  return !n.value && n.hide.length === 0;
};

/** Collapse a mark to the minimal stored shape — or null when empty. */
export const toStoredMark = (mark) => {
  const n = normalizeMark(mark);
  if (!n.value && !n.hide.length) return null;
  const out = {};
  if (n.value) out.value = n.value;
  if (n.hide.length) out.hide = [...new Set(n.hide)];
  return out;
};

/** Return a mark with a new scalar `value` (keeps existing hides). */
export const withMarkValue = (mark, value) =>
  toStoredMark({ value: value || "", hide: normalizeMark(mark).hide });

/** Return a mark with `token` hidden / shown (keeps existing value + hides). */
export const withMarkHide = (mark, token, hidden) => {
  const n = normalizeMark(mark);
  const set = new Set(n.hide);
  if (hidden) set.add(token);
  else set.delete(token);
  return toStoredMark({ value: n.value, hide: [...set] });
};

/**
 * API-side sanitiser. `submitted` may be a scalar string (from a form) or a
 * full JSON mark (from the order page). When it is a scalar, the record's
 * existing `hide` list is PRESERVED so a form edit never wipes page hides.
 * Returns the JSON mark to store, or null.
 */
export const cleanMarkForStore = (submitted, existingMark = null) => {
  if (submitted === undefined) return undefined;

  if (typeof submitted === "string") {
    const tokens = legacyHideTokens(submitted);
    if (tokens.length) {
      // A legacy hide-string was submitted directly — fold it into hide.
      return toStoredMark({
        value: getMarkValue(existingMark),
        hide: [...new Set([...getMarkHide(existingMark), ...tokens])],
      });
    }
    return toStoredMark({ value: submitted, hide: getMarkHide(existingMark) });
  }

  if (submitted === null) return toStoredMark({ value: "", hide: getMarkHide(existingMark) });

  if (typeof submitted === "object") {
    // Full JSON mark → trust it (missing `hide` = keep existing hides).
    const n = normalizeMark(submitted);
    const hide = "hide" in submitted ? n.hide : getMarkHide(existingMark);
    return toStoredMark({ value: n.value, hide });
  }

  return null;
};

// ── Artwork per-page hiding ────────────────────────────────────────────────
export const isHiddenInArtistPage = (record) =>
  isMarkHidden(record, HIDE_ARTIST_PAGE);
export const isHiddenInExhibitionPage = (record) =>
  isMarkHidden(record, HIDE_EXHIBITION_PAGE);
export const isHiddenInArtFairPage = (record) =>
  isMarkHidden(record, HIDE_ART_FAIR_PAGE);
export const isHiddenInArtistRollingImage = (record) =>
  isMarkHidden(record, HIDE_ARTIST_ROLLING_IMAGE);

/** Is this artwork hidden for the given `order` page key? */
export const isArtworkHiddenForPage = (record, pageKey) => {
  const token = hideTokenForOrderKey(pageKey);
  return token ? isMarkHidden(record, token) : false;
};

/** Keeps only records NOT hidden for the given page key. */
export const filterArtworksHiddenForPage = (list, pageKey) =>
  (Array.isArray(list) ? list : []).filter(
    (item) => !isArtworkHiddenForPage(item, pageKey)
  );

// ── Back-compat shorthands ──────────────────────────────────────────────────
export const hasHideArtistRollingMark = (value) =>
  isHiddenInArtistRollingImage(value);
export const hasMarkValue = (record, value) =>
  getMarkValue(record).toLowerCase() === String(value ?? "").toLowerCase();
export const markValueIn = (record, values) =>
  (Array.isArray(values) ? values : [values]).some((v) => hasMarkValue(record, v));
