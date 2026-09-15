"use client";

/**
 * useArtistRollingImages
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a "rolling images" slideshow for one artist, sourced from the **Image**
 * schema (not from artwork covers). Two independent sequences exist, each with
 * its own order key AND its own hide flag:
 *
 *   rolling_img_order                → Artist Page Order (Rolling Images)
 *     hide flag: `artist_rolling_image`
 *   artist_detail_rolling_img_order  → Artist Detail Page Order (Rolling Images)
 *     hide flag: `artist_detail_rolling_image`
 *
 * How the right images are found:
 *   1. `Image` rows are matched to an artist through `tag_en` / `tag_cn`.
 *      Preferred path: the shared `buildImageSourceIndex` (the SAME index the
 *      manager groups by), so an image tagged with an ARTWORK, an ARTIST name,
 *      or an EXHIBITION / FAIR / event / bibliography title all land on the
 *      right artist. Without an index we fall back to the artwork-only matcher
 *      — which is what used to silently drop every show-tagged image from the
 *      slideshow (6 of the 34 rolling images were missing) even though the
 *      manager listed them.
 *   2. Because the artwork rows are split by language, the EN/CN artist names
 *      are first merged by `buildArtistNameIndex`, so an artist page works
 *      no matter which language the URLs / records use.
 *   3. Images hidden for the ACTIVE sequence are skipped (each tab's eye button
 *      writes its own flag, so hiding in one sequence never affects the other).
 *   4. The rest are ordered by that sequence's position — numbered images first,
 *      ascending; images without a position fall to the end, then by tag.
 *
 * SELECTION IS THE SOURCE OF TRUTH: the slides returned are exactly what the
 * page shows and what the manager's selection strip lists. There is no
 * exhibition / artwork-cover fallback — an image that was never selected can
 * never appear.
 *
 * `orderKeys` may list more than one sequence: the first one that yields a
 * usable selection wins. Entries are either a plain key or
 * `{ key, requirePositions }` — `requirePositions` means "only use this sequence
 * once it has actually been ordered", which is how the artist detail page keeps
 * using the artist-page sequence until its own order has been saved.
 *
 * Returns slides in the same shape the artist page's slideshow expects:
 *   [{ id, title, cover_img_url, caption, year, medium, tag_en, tag_cn, order }]
 * `year` comes from the artwork / exhibition the image is tagged with (pass a
 * `yearFor` resolver from `createImageYearResolver`), so the caption can print
 * it under the title.
 */

import { useMemo } from "react";
import useData from "@/hooks/useData";
import {
  buildArtistMatchers,
  matchImageArtist,
} from "@/components/pages/images/hooks/useImageArtistGroups";
import { buildArtistNameIndex } from "@/components/pages/images/hooks/useArtistNameIndex";
import { isMarkHidden, markForOrderKey } from "@/utils/mediaMarks";
import { getOrder } from "@/utils/mediaOrder";

/** The artist PAGE rolling order (the original sequence). */
export const ARTIST_ROLLING_ORDER_KEY = "rolling_img_order";
/** The artist DETAIL page rolling order (a separate sequence). */
export const ARTIST_DETAIL_ROLLING_ORDER_KEY = "artist_detail_rolling_img_order";

/** Hide token paired with an order key (falls back to the artist-page flag). */
export const hideTokenForRollingOrderKey = (orderKey) =>
  markForOrderKey(orderKey) || "artist_rolling_image";

/** Is this image part of that sequence's selection? (its eye button is the switch) */
export const isSelectedForOrderKey = (image, orderKey = ARTIST_ROLLING_ORDER_KEY) =>
  !isMarkHidden(image, hideTokenForRollingOrderKey(orderKey));

/** Kept for callers that predate the second sequence. */
export const isRollingSelected = (image) => isSelectedForOrderKey(image, ARTIST_ROLLING_ORDER_KEY);

/**
 * Which artists does this image belong to?
 * With a source index (preferred) the answer is the full tag→artist resolution
 * (artwork / artist / exhibition / fair / event / bibliography / about) — the
 * same one the image manager groups by. Without it we can only read artwork
 * titles + artist names off the tag.
 *
 * @returns {string[]} candidate artist names (may be empty)
 */
const artistsOfImage = (image, { sourceIndex, matchers }) => {
  if (sourceIndex?.resolveImageSource) {
    const resolved = sourceIndex.resolveImageSource(image)?.artists || [];
    if (resolved.length) return resolved;
  }
  const artist = matchImageArtist(image, matchers);
  return artist ? [artist] : [];
};

/** Position value: numbered (1..N) first & ascending; unnumbered → Infinity. */
const positionOf = (image, orderKey) => {
  const value = Number(getOrder(image, orderKey));
  return Number.isFinite(value) && value > 0 ? value : Infinity;
};

/** Slide shape the artist page's slideshow expects. */
const toSlide = (image, key, isCn, yearOf) => ({
  id: image.id || image._id,
  title: (isCn ? image.tag_cn : image.tag_en) || image.tag_en || image.tag_cn || "",
  cover_img_url: image.img_url || image.image_url || "",
  caption: (isCn ? image.caption_cn : image.caption_en) || "",
  // The year of the artwork / show the image is tagged with ("" when the tag is
  // an artist name or that record has no year) — the page prints it under the
  // title, exactly like the artwork captions elsewhere on the site.
  year: (yearOf && yearOf(image)) || "",
  medium: image.type || "",
  tag_en: image.tag_en || "",
  tag_cn: image.tag_cn || "",
  order: getOrder(image, key),
  orderKey: key,
  hidden: isMarkHidden(image, hideTokenForRollingOrderKey(key)),
});

/** Ordered + tagged slides for one image list. */
const slidesFrom = (images, key, isCn, yearOf) =>
  [...images]
    .sort((a, b) => {
      const ap = positionOf(a, key);
      const bp = positionOf(b, key);
      if (ap !== bp) return ap - bp;
      return String(a?.tag_en || "").localeCompare(String(b?.tag_en || ""));
    })
    .map((image) => toSlide(image, key, isCn, yearOf));

/**
 * Every artist's rolling sequence in ONE pass — keyed by the canonical artist
 * key (`buildArtistNameIndex().keyOf`, the same key the manager groups by).
 * Used by the artists INDEX page, whose preview follows this order.
 *
 * @returns {Map<string, Array>} canonical artist key → ordered slides
 */
export function buildArtistRollingMap(images = [], artworks = [], options = {}) {
  const {
    isCn = false,
    orderKey = ARTIST_ROLLING_ORDER_KEY,
    includeHidden = false,
    sourceIndex = null,
    /** How to key the map when no source index is available. */
    keyFn = null,
    /** (image) => year of the artwork / show its tag names. */
    yearFor = null,
  } = options;

  const matchers = buildArtistMatchers(artworks);
  const nameIndex = buildArtistNameIndex(artworks, images);
  const resolveKey =
    keyFn ||
    ((artist) => nameIndex.keyOf(artist)) ||
    ((artist) => artist);
  const buckets = new Map();

  for (const image of Array.isArray(images) ? images : []) {
    if (!includeHidden && isMarkHidden(image, hideTokenForRollingOrderKey(orderKey))) continue;
    for (const artist of artistsOfImage(image, { sourceIndex, matchers })) {
      const key = resolveKey(artist);
      if (!key) continue;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(image);
    }
  }

  const out = new Map();
  for (const [key, list] of buckets) out.set(key, slidesFrom(list, orderKey, isCn, yearFor));
  return out;
}

/**
 * @param {Array} images
 * @param {Array} artworks
 * @param {string} artistName
 * @param {object} [options]
 * @param {boolean}[options.isCn=false]
 * @param {string} [options.orderKey="rolling_img_order"]
 * @param {Array}  [options.orderKeys]  keys or { key, requirePositions }, first usable wins
 * @param {boolean}[options.includeHidden=false]
 * @param {object} [options.sourceIndex] buildImageSourceIndex(...) — preferred
 */
export function buildArtistRollingSlides(
  images = [],
  artworks = [],
  artistName = "",
  options = {}
) {
  const {
    isCn = false,
    orderKey = ARTIST_ROLLING_ORDER_KEY,
    orderKeys = null,
    includeHidden = false,
    sourceIndex = null,
    yearFor = null,
  } = options;

  if (!artistName) return [];

  const matchers = buildArtistMatchers(artworks);
  const nameIndex = buildArtistNameIndex(artworks, images);
  const wantedKey = nameIndex.keyOf(artistName);

  // The artist's images, before any hide / order decision (an image can be in
  // both sequences, so this list is shared and filtered per key).
  const mine = [];
  for (const image of Array.isArray(images) ? images : []) {
    const artists = artistsOfImage(image, { sourceIndex, matchers });
    if (!artists.some((artist) => nameIndex.keyOf(artist) === wantedKey)) continue;
    mine.push(image);
  }

  const slidesFor = (key) => {
    const selected = includeHidden
      ? mine
      : mine.filter((image) => isMarkHidden(image, hideTokenForRollingOrderKey(key)) === false);
    return slidesFrom(selected, key, isCn, yearFor);
  };

  // Normalise the candidate list: a plain key, or
  // `{ key, requirePositions }` — the latter only counts as "this sequence is
  // in use" once at least one of its images actually carries a position, so a
  // brand-new sequence that nobody has saved yet cannot silently replace the
  // sequence it is meant to fall back to.
  const candidates = (Array.isArray(orderKeys) && orderKeys.length ? orderKeys : [orderKey]).map(
    (entry) => (typeof entry === "string" ? { key: entry, requirePositions: false } : entry)
  );

  for (const { key, requirePositions = false } of candidates) {
    if (!key) continue;
    const slides = slidesFor(key);
    if (!slides.length) continue;
    if (requirePositions && !slides.some((slide) => Number(slide.order) > 0)) continue;
    return slides;
  }
  return [];
}

export default function useArtistRollingImages(artistName, isCn = false, options = {}) {
  const {
    orderKey = ARTIST_ROLLING_ORDER_KEY,
    orderKeys = null,
    includeHidden = false,
    // Preferred: the shared image→artist index, so show-tagged images resolve
    // exactly like they do in the manager.
    sourceIndex = null,
    // (image) => year shown in the caption (from the artwork / show it names).
    yearFor = null,
    // Callers that already hold the raw Image / Artwork lists (the artist detail
    // page does) pass them in so the same big payload is not fetched twice.
    images: providedImages,
    artworks: providedArtworks,
  } = options;

  const hasExternal = Array.isArray(providedImages) || Array.isArray(providedArtworks);
  const needsFetch = !hasExternal;

  const { data: fetchedImages = [], isLoading: loadingImages } = useData(
    needsFetch ? "/api/image" : null
  );
  const { data: fetchedArtworks = [], isLoading: loadingArtworks } = useData(
    needsFetch ? "/api/artwork" : null
  );

  const rawImages = hasExternal ? providedImages || [] : fetchedImages;
  const rawArtworks = hasExternal ? providedArtworks || [] : fetchedArtworks;

  const keysSignature = Array.isArray(orderKeys)
    ? orderKeys
        .map((entry) =>
          typeof entry === "string" ? entry : `${entry?.key || ""}:${entry?.requirePositions ? 1 : 0}`
        )
        .join("|")
    : "";

  const slides = useMemo(
    () =>
      buildArtistRollingSlides(rawImages, rawArtworks, artistName, {
        isCn,
        orderKey,
        orderKeys,
        includeHidden,
        sourceIndex,
        yearFor,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rawImages,
      rawArtworks,
      artistName,
      isCn,
      orderKey,
      keysSignature,
      includeHidden,
      sourceIndex,
      yearFor,
    ]
  );

  return {
    slides,
    isLoading: hasExternal ? false : loadingImages || loadingArtworks,
  };
}
