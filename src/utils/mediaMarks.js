/**
 * mediaMarks.js — shared helpers for the `mark` field on media records.
 *
 * Marks are free-ish strings chosen from `src/data/form_marks.json`. The one
 * that matters to the public site is the "hide in artist page rolling image"
 * mark: an image carrying it is excluded from an artist's rolling-image
 * slideshow (and greyed out with an X on the ordering page).
 *
 * Matching is deliberately forgiving — the mark is normalised to
 * [a-z0-9] only, so all of these are treated the same:
 *   "Hide in Artist Page Rolling Image"
 *   "hide_in_artist_page_rolling_image"
 *   "hide-in-artist-page-rolling-image"
 *   "hideInArtistPageRollingImage"
 */

export const IMAGE_MARK_HIDE_ARTIST_ROLLING = "hide_in_artist_page_rolling_image";

export const IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL = {
  en: "Hide in Artist Page Rolling Image",
  cn: "艺术家页轮播图隐藏",
};

const normalizeMark = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const HIDE_KEY = normalizeMark(IMAGE_MARK_HIDE_ARTIST_ROLLING); // hideinartistpagerollingimage

/** True when a record's `mark` means "hide in the artist page rolling images". */
export const isHiddenInArtistRollingImage = (record) => {
  const mark = normalizeMark(record?.mark ?? record);
  if (!mark) return false;
  if (mark === HIDE_KEY) return true;

  // Tolerant fallback: any "hide … artist … roll…" phrasing.
  return (
    mark.startsWith("hide") &&
    mark.includes("artist") &&
    (mark.includes("roll") || mark.includes("img") || mark.includes("image"))
  );
};

/** Convenience: does this value hold the hide mark? (accepts a raw string too) */
export const hasHideArtistRollingMark = (value) =>
  isHiddenInArtistRollingImage({ mark: value });
