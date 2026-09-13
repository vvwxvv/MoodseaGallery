"use client";

/**
 * useArtistRollingImages
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the "rolling images" slideshow for one artist on the artist detail
 * page, sourced from the **Image** schema (not from artwork covers).
 *
 * How the right images are found:
 *   1. `Image` rows are matched to an artist through their `tag_en` / `tag_cn`
 *      (which usually equal an artwork title, or the artist's own name) —
 *      the same matcher used by the image manager's artist grouping.
 *   2. Because the artwork rows are split by language, the EN/CN artist names
 *      are first merged by `buildArtistNameIndex`, so an artist page works no
 *      matter which language the URLs / records use.
 *   3. Images marked as "hide in artist page rolling image" are skipped.
 *   4. The rest are ordered by `order.rolling_img_order` (the value the image
 *      order manager saves) — numbered images first, ascending; images without
 *      a position fall to the end, then by tag.
 *
 * Returns slides in the same shape the artist page's slideshow expects:
 *   [{ id, title, cover_img_url, caption, year, medium, tag_en, tag_cn, order }]
 */

import { useMemo } from "react";
import useData from "@/hooks/useData";
import {
  buildArtistMatchers,
  matchImageArtist,
} from "@/components/pages/images/hooks/useImageArtistGroups";
import { buildArtistNameIndex } from "@/components/pages/images/hooks/useArtistNameIndex";
import { isHiddenInArtistRollingImage } from "@/utils/mediaMarks";
import { getOrder } from "@/utils/mediaOrder";

/** Sub-key inside `Image.order` that drives the artist page rolling order. */
export const ARTIST_ROLLING_ORDER_KEY = "rolling_img_order";

/** Position value: numbered (1..N) first & ascending; unnumbered → Infinity. */
const positionOf = (image, orderKey) => {
  const value = Number(getOrder(image, orderKey));
  return Number.isFinite(value) && value > 0 ? value : Infinity;
};

/**
 * @param {Array} images
 * @param {Array} artworks
 * @param {string} artistName
 * @param {object} [options]
 * @param {boolean}[options.isCn=false]
 * @param {string} [options.orderKey="rolling_img_order"]
 * @param {boolean}[options.includeHidden=false]
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
    includeHidden = false,
  } = options;

  if (!artistName) return [];

  const matchers = buildArtistMatchers(artworks);
  const nameIndex = buildArtistNameIndex(artworks, images);
  const wantedKey = nameIndex.keyOf(artistName);

  const mine = [];
  for (const image of Array.isArray(images) ? images : []) {
    const artist = matchImageArtist(image, matchers);
    if (!artist) continue;
    if (nameIndex.keyOf(artist) !== wantedKey) continue;
    if (!includeHidden && isHiddenInArtistRollingImage(image)) continue;
    mine.push(image);
  }

  mine.sort((a, b) => {
    const ap = positionOf(a, orderKey);
    const bp = positionOf(b, orderKey);
    if (ap !== bp) return ap - bp;
    return String(a?.tag_en || "").localeCompare(String(b?.tag_en || ""));
  });

  return mine.map((image) => ({
    id: image.id || image._id,
    title: (isCn ? image.tag_cn : image.tag_en) || image.tag_en || image.tag_cn || "",
    cover_img_url: image.img_url || image.image_url || "",
    caption: (isCn ? image.caption_cn : image.caption_en) || "",
    year: "",
    medium: image.type || "",
    tag_en: image.tag_en || "",
    tag_cn: image.tag_cn || "",
    order: getOrder(image, orderKey),
    hidden: isHiddenInArtistRollingImage(image),
  }));
}

export default function useArtistRollingImages(artistName, isCn = false, options = {}) {
  const { orderKey = ARTIST_ROLLING_ORDER_KEY, includeHidden = false } = options;

  const { data: rawImages = [], isLoading: loadingImages } = useData("/api/image");
  const { data: rawArtworks = [], isLoading: loadingArtworks } = useData("/api/artwork");

  const slides = useMemo(
    () =>
      buildArtistRollingSlides(rawImages, rawArtworks, artistName, {
        isCn,
        orderKey,
        includeHidden,
      }),
    [rawImages, rawArtworks, artistName, isCn, orderKey, includeHidden]
  );

  return { slides, isLoading: loadingImages || loadingArtworks };
}
