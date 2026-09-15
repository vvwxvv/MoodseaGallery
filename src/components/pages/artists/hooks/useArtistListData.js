"use client";

import { useMemo, useCallback } from "react";
import useData from "@/hooks/useData";
import { filterByLanguage } from "@/utils/filterByLanguage";
import { artworkOrderValue } from "@/utils/artworkOrder";
import { filterArtworksHiddenForPage, isArtistHoverImage } from "@/utils/mediaMarks";
import { buildImageSourceIndex } from "@/components/pages/images/hooks/useImageSourceIndex";
import { createImageYearResolver } from "@/utils/mediaMatching";
import {
  ARTIST_ROLLING_ORDER_KEY,
  buildArtistRollingMap,
} from "@/components/pages/artists/hooks/useArtistRollingImages";

// ── Name normalization for matching About <-> Artwork ──
// Trims, lowercases, and collapses internal whitespace so minor
// formatting differences ("Wang Xin", " wang  xin ") still match.
function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ── First-letter sort key ──
// Grabs the first meaningful character of a name. Empty names sort
// last under "#" so they never break the ordering.
function firstLetterKey(name) {
  const ch = String(name || "").trim().charAt(0);
  return ch ? ch.toUpperCase() : "#";
}

// ── Locale-aware comparator ──
// Orders purely by name, starting from the first letter. For CN we use
// a pinyin-aware locale so Chinese names sort by their pinyin initial
// (A→Z); for EN it's a normal case-insensitive A→Z. Empty names ("#")
// always fall to the bottom.
function makeNameComparator(isCn) {
  const locale = isCn ? "zh-Hans-CN" : "en";
  return (a, b) => {
    const ka = firstLetterKey(a?.name);
    const kb = firstLetterKey(b?.name);

    const aEmpty = ka === "#";
    const bEmpty = kb === "#";
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1; // "#" sinks to the end

    return String(a?.name || "").localeCompare(String(b?.name || ""), locale, {
      sensitivity: "base",
      numeric: true,
    });
  };
}

/**
 * Map of normalized artist name -> best cover image + works count,
 * derived purely from Artwork rows. Used to *enrich* About-driven
 * profiles, never to filter them.
 */
function buildArtworkCoverMap(artworks) {
  const map = new Map();

  for (const aw of artworks || []) {
    const rawName = (aw?.artist || "").trim();
    if (!rawName) continue;
    const key = normalizeName(rawName);

    if (!map.has(key)) {
      map.set(key, {
        image: aw.cover_img_url || null,
        order: artworkOrderValue(aw, "artist_page_order"),
        worksCount: 0,
      });
    }

    const entry = map.get(key);
    entry.worksCount += 1;

    if (!entry.image && aw.cover_img_url) {
      entry.image = aw.cover_img_url;
    } else if (aw.cover_img_url && artworkOrderValue(aw, "artist_page_order") < entry.order) {
      entry.image = aw.cover_img_url;
      entry.order = artworkOrderValue(aw, "artist_page_order");
    }
  }

  return map;
}

/**
 * Map of normalized artist name -> the artist's MOST RECENT artwork
 * ({ image, title, year }) — highest `year` wins; ties break on the lowest
 * artist-page order, so the pick is stable. Only artworks with a cover image.
 *
 * Used as the hover-preview fallback: when an artist has no image flagged
 * `artist_hover_image`, hovering the artist name shows this artwork instead.
 */
function buildRecentArtworkMap(artworks) {
  const map = new Map();

  for (const aw of artworks || []) {
    const rawName = (aw?.artist || "").trim();
    const url = aw?.cover_img_url;
    if (!rawName || !url) continue;

    const key = normalizeName(rawName);
    const year = Number(String(aw?.year ?? "").replace(/[^\d]/g, "")) || 0;
    const order = artworkOrderValue(aw, "artist_page_order");
    const prev = map.get(key);

    if (!prev || year > prev.year || (year === prev.year && order < prev.order)) {
      map.set(key, { image: url, title: aw.title || "", year, order });
    }
  }

  return map;
}

/**
 * Builds one profile per unique artist found in the About collection.
 * This is the source of truth for who shows up in the artist list —
 * every unique About artist is included, regardless of whether a
 * matching Artwork row is found.
 *
 * The returned list is ordered by artist name's first letter (A→Z),
 * pinyin-aware when isCn is true.
 */
function buildArtistProfilesFromAbout(aboutRows, artworkCoverMap, isCn, opts = {}) {
  const { hoverImageByArtist, recentArtworkByArtist, sourceIndex, rollingByArtist } = opts;
  const byName = new Map();

  for (const row of aboutRows || []) {
    const name = (row?.artist || "").trim();
    if (!name) continue;
    const key = normalizeName(name);

    if (!byName.has(key)) {
      const artworkEntry = artworkCoverMap.get(key);

      // The image flagged `artist_hover_image` for this artist (if any). Keys
      // come from the source index, so canonicalise the About name the same way.
      const hoverKey = sourceIndex
        ? String(sourceIndex.canonicalArtist(name) || name).toLowerCase()
        : key;
      const hoverImage = hoverImageByArtist?.get(hoverKey) || null;
      // The artist's Artist Page rolling sequence (Manager → Image → Order →
      // "Artist Page Order (Rolling Images)"): the preview column of THIS page
      // follows exactly this order.
      const rolling = rollingByArtist?.get(hoverKey) || [];
      // Nothing flagged → fall back to the artist's most recent artwork.
      const recent = recentArtworkByArtist?.get(key) || null;
      const hoverMeta =
        hoverImage || !recent
          ? ""
          : [recent.title, recent.year || ""].filter(Boolean).join(" · ");

      byName.set(key, {
        id: name,
        name,
        // Prefer a cover image pulled from Artwork; fall back to the
        // artist's own About portrait if no Artwork match exists.
        image: artworkEntry?.image || row.portrait_image_url || null,
        // Explicitly chosen hover image (image manager mouse icon), otherwise
        // the most recent artwork's cover.
        hoverImage: hoverImage || recent?.image || null,
        hoverIsFlagged: !!hoverImage,
        hoverMeta,
        // Ordered slides for the preview (empty when nothing was selected).
        rolling,
        order: Number(row.order) || 0,
        worksCount: artworkEntry?.worksCount || 0,
        caption: row.caption || null,
      });
    }
  }

  return Array.from(byName.values()).sort(makeNameComparator(isCn));
}

function groupArtistsByLetter(profiles, isCn) {
  const groups = new Map();
  for (const p of profiles) {
    const letter = firstLetterKey(p.name);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(p);
  }

  const locale = isCn ? "zh-Hans-CN" : "en";
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if ((a === "#") !== (b === "#")) return a === "#" ? 1 : -1;
      return a.localeCompare(b, locale, { sensitivity: "base" });
    })
    .map(([letter, artists]) => ({ letter, artists }));
}

export default function useArtistListData(isCn) {
  const {
    data: rawArtworks = [],
    isLoading: isArtworkLoading,
    error: artworkError,
    refetch: refetchArtwork,
  } = useData("/api/artwork");

  const {
    data: rawAbout = [],
    isLoading: isAboutLoading,
    error: aboutError,
    refetch: refetchAbout,
  } = useData("/api/about");

  // Extra collections used ONLY to resolve an image's tag back to an artist,
  // so the image flagged `artist_hover_image` can be matched to the right
  // artist on this page. (Same index the image manager/order page uses.)
  const { data: rawImages = [] } = useData("/api/image");
  const { data: rawExhibitions = [] } = useData("/api/exhibition");
  const { data: rawFairs = [] } = useData("/api/fair");
  const { data: rawEvents = [] } = useData("/api/event");
  const { data: rawBibliographies = [] } = useData("/api/bibliography");

  // ── Language-filter first, so EN/CN artist strings never mix ──
  // Artworks hidden from the artist page (mark.hide includes "artist_page")
  // are dropped here, so they can't become an artist's cover or be counted.
  const artworks = useMemo(
    () =>
      filterArtworksHiddenForPage(
        filterByLanguage(rawArtworks, isCn),
        "artist_page_order"
      ),
    [rawArtworks, isCn]
  );

  const aboutRows = useMemo(
    () => filterByLanguage(rawAbout, isCn),
    [rawAbout, isCn]
  );

  // ── Cover image lookup, keyed by normalized artist name ──
  const artworkCoverMap = useMemo(
    () => buildArtworkCoverMap(artworks),
    [artworks]
  );

  // ── Hover image (set from the image manager, mouse icon) ──
  // Built from the same source index the image manager uses, so an image
  // tagged with an artwork OR an exhibition/fair title resolves to its artist.
  const sourceIndex = useMemo(
    () =>
      buildImageSourceIndex({
        artworks: Array.isArray(rawArtworks) ? rawArtworks : [],
        images: Array.isArray(rawImages) ? rawImages : [],
        exhibitions: Array.isArray(rawExhibitions) ? rawExhibitions : [],
        fairs: Array.isArray(rawFairs) ? rawFairs : [],
        events: Array.isArray(rawEvents) ? rawEvents : [],
        bibliographies: Array.isArray(rawBibliographies) ? rawBibliographies : [],
        abouts: Array.isArray(rawAbout) ? rawAbout : [],
      }),
    [
      rawArtworks,
      rawImages,
      rawExhibitions,
      rawFairs,
      rawEvents,
      rawBibliographies,
      rawAbout,
    ]
  );

  const hoverImageByArtist = useMemo(() => {
    const map = new Map();
    const images = Array.isArray(rawImages) ? rawImages : [];
    for (const img of images) {
      if (!isArtistHoverImage(img)) continue;
      const url = img?.img_url || img?.image_url;
      if (!url) continue;
      const artists = sourceIndex.resolveImageSource(img)?.artists || [];
      for (const artist of artists) {
        const key = String(sourceIndex.canonicalArtist(artist) || artist).toLowerCase();
        if (!map.has(key)) map.set(key, url); // first flagged wins
      }
    }
    return map;
  }, [rawImages, sourceIndex]);

  // Fallback for artists with no flagged hover image: their most recent
  // artwork (highest year, then lowest artist-page order).
  const recentArtworkByArtist = useMemo(
    () => buildRecentArtworkMap(artworks),
    [artworks]
  );

  // ── Artist Page rolling sequence, per artist ──
  // The preview column of this page follows the order saved in
  //   Manager → Image → Order → "Artist Page Order (Rolling Images)"
  // so the images are resolved through the SAME index the manager groups by
  // (an image tagged with a show or a fair lands on its artist too), keyed
  // exactly like `hoverImageByArtist` above.
  const rollingByArtist = useMemo(
    () =>
      buildArtistRollingMap(rawImages, rawArtworks, {
        orderKey: ARTIST_ROLLING_ORDER_KEY,
        sourceIndex,
        // Each slide carries the YEAR of the artwork / show its tag names, so
        // the preview can caption it ("I Am Here · 2026").
        yearFor: createImageYearResolver({
          artworks: rawArtworks,
          exhibitions: rawExhibitions,
          fairs: rawFairs,
          events: rawEvents,
          bibliographies: rawBibliographies,
        }),
        keyFn: (artist) =>
          String(sourceIndex.canonicalArtist(artist) || artist).toLowerCase(),
      }),
    [
      rawImages,
      rawArtworks,
      rawExhibitions,
      rawFairs,
      rawEvents,
      rawBibliographies,
      sourceIndex,
    ]
  );

  // ── The list itself: every unique About artist, enriched with a
  //    cover image from Artwork where available, ordered by the first
  //    letter of the artist name ──
  const allProfiles = useMemo(
    () =>
      buildArtistProfilesFromAbout(aboutRows, artworkCoverMap, isCn, {
        hoverImageByArtist,
        recentArtworkByArtist,
        sourceIndex,
        rollingByArtist,
      }),
    [
      aboutRows,
      artworkCoverMap,
      isCn,
      hoverImageByArtist,
      recentArtworkByArtist,
      sourceIndex,
      rollingByArtist,
    ]
  );

  // ── Group by first letter ──
  const artistGroups = useMemo(
    () => groupArtistsByLetter(allProfiles, isCn),
    [allProfiles, isCn]
  );

  const isLoading = isArtworkLoading || isAboutLoading;
  const hasError = !!artworkError || !!aboutError;

  const refetch = useCallback(() => {
    refetchArtwork?.();
    refetchAbout?.();
  }, [refetchArtwork, refetchAbout]);

  return {
    artistGroups,
    allProfiles,
    isLoading,
    hasError,
    refetch,
  };
}