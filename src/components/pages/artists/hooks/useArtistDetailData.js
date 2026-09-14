"use client";

import { useMemo, useCallback } from "react";
import useData from "@/hooks/useData";
import { filterByLanguage } from "@/utils/filterByLanguage";
import { getArtworkOrder, sortArtworksByPageOrder } from "@/utils/artworkOrder";
import { filterArtworksHiddenForPage } from "@/utils/mediaMarks";

// The artwork order page can mark a work as hidden from the artist page
// (mark = "hide_in_artist_page"). Such works never render on the artist grid,
// but they still leave the manager ordering page intact.
const visibleArtistArtworks = (list) =>
  filterArtworksHiddenForPage(list, "artist_page_order");

// Normalize a name for cross-collection matching
export const normalizeName = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** 基于 id 或 _id 去重 */
function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((item) => {
    const id = item?.id ?? item?._id;
    if (!id) return true; // 无 id 则保留（稳妥）
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function recordMatchesArtist(record, key) {
  const arr = record?.related_gallery_artist;
  if (Array.isArray(arr) && arr.some((n) => normalizeName(n) === key)) return true;
  const single = record?.participating_artists;
  if (typeof single === "string" && single.trim()) {
    const parts = single.split(/[,，、]/).map(normalizeName);
    if (parts.includes(key)) return true;
  }
  return false;
}

function eventMatchesArtist(event, key) {
  const arr = event?.related_artist;
  return Array.isArray(arr) && arr.some((n) => normalizeName(n) === key);
}

function bibliographyMatchesArtist(record, key) {
  const arr = record?.related_artist;
  return Array.isArray(arr) && arr.some((n) => normalizeName(n) === key);
}

// ----------------------------------------------------------------------
// ORIGINAL (commented out per request — DO NOT DELETE):
// Sorted primarily by year (desc), falling back to `order` only to break
// ties within the same year. Uncomment this and swap the call sites
// below back to `sortByYearDesc` to restore this behavior.
// ----------------------------------------------------------------------
// function sortByYearDesc(list) {
//   return [...list].sort((a, b) => {
//     const ay = parseInt(a?.year, 10) || 0;
//     const by = parseInt(b?.year, 10) || 0;
//     if (ay !== by) return by - ay;
//     return (Number(a?.order) || 0) - (Number(b?.order) || 0);
//   });
// }

// ----------------------------------------------------------------------
// NEW: sort primarily by each item's `order` field (ascending — smaller
// `order` shows first). Flexible fallback: if either item doesn't have a
// usable `order` value (missing, null, empty string, or non-numeric),
// that comparison falls back to sorting by year (desc) instead — so
// items without an `order` still sort sensibly by year, and items that
// do have `order` sort by it.
//
// ⚠️ If your data actually wants `order` descending, flip `aOrder - bOrder`
// to `bOrder - aOrder` below.
// ----------------------------------------------------------------------
function getOrderValue(item) {
  const v = getArtworkOrder(item, "artist_page_order");
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function getYearValue(item) {
  const n = parseInt(item?.year, 10);
  return Number.isNaN(n) ? 0 : n;
}

function sortByOrder(list) {
  return [...list].sort((a, b) => {
    const aOrder = getOrderValue(a);
    const bOrder = getOrderValue(b);

    if (aOrder !== null && bOrder !== null) {
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Same order value — tie-break by year (desc).
      return getYearValue(b) - getYearValue(a);
    }

    // One or both items have no usable `order` — fall back to year (desc).
    return getYearValue(b) - getYearValue(a);
  });
}

// ----------------------------------------------------------------------
// ARTIST ARTWORKS: ordered by `order.artist_page_order` (the per-page JSON
// field an artwork carries for the artist page).
//   • artworks with a value  → first, ascending by artist_page_order
//   • artworks without       → after them, by year (desc)
// This keeps the manager-controlled artist-page ordering authoritative while
// un-ordered works still land in a sensible spot.
// ----------------------------------------------------------------------
function sortArtworksByArtistPageOrder(list) {
  // Shared rule (utils/artworkOrder.sortArtworksByPageOrder): artworks that
  // carry an `artist_page_order` come first, ascending; the rest follow by
  // year (desc) so un-ordered works still land in a sensible spot.
  return sortArtworksByPageOrder(list, "artist_page_order", {
    unorderedComparator: (a, b) => getYearValue(b) - getYearValue(a),
  });
}

function buildArtistProfile(about, artworks, exhibitions, fairs, events, bibliographies) {
  const key = normalizeName(about?.artist);

  const artistArtworks = uniqueById(
    sortArtworksByArtistPageOrder(
      visibleArtistArtworks(artworks || []).filter((aw) => normalizeName(aw?.artist) === key)
    )
  );
  const artistExhibitions = uniqueById(
    sortByOrder((exhibitions || []).filter((ex) => recordMatchesArtist(ex, key)))
  );
  const artistFairs = uniqueById(
    sortByOrder((fairs || []).filter((f) => recordMatchesArtist(f, key)))
  );
  const artistEvents = uniqueById(
    sortByOrder((events || []).filter((ev) => eventMatchesArtist(ev, key)))
  );
  const artistBibliographies = uniqueById(
    sortByOrder((bibliographies || []).filter((b) => bibliographyMatchesArtist(b, key)))
  );

  return {
    id: about?.id || about?._id || null,
    artist: about?.artist || "",
    portrait_image_url: about?.portrait_image_url || null,
    caption: about?.caption || "",
    introductions: about?.introductions || [],
    pdf_url: about?.pdf_url || null,
    web_url: about?.web_url || null,
    language: about?.language || null,
    order: about?.order || null,
    mark: about?.mark || null,
    portrait_img_url: about?.portrait_image_url || null,
    artworks: artistArtworks,
    exhibitions: artistExhibitions,
    fairs: artistFairs,
    events: artistEvents,
    bibliographies: artistBibliographies,
  };
}

export default function useArtistDetailData(artistName, isCn) {
  const { data: rawAbouts = [], isLoading: la, error: ea, refetch: ra } = useData("/api/about");
  const { data: rawArtworks = [], isLoading: lw, error: ew, refetch: rw } = useData("/api/artwork");
  const { data: rawExhibitions = [], isLoading: lx, error: ex, refetch: rx } = useData("/api/exhibition");
  const { data: rawFairs = [], isLoading: lf, error: ef, refetch: rf } = useData("/api/fair");
  const { data: rawEvents = [], isLoading: le, error: ee, refetch: re } = useData("/api/event");
  const { data: rawBibliographies = [], isLoading: lb, error: eb, refetch: rb } = useData("/api/bibliography");

  const isLoading = la || lw || lx || lf || le || lb;
  const hasError = !!(ea || ew || ex || ef || ee || eb);

  const refetch = useCallback(() => {
    ra?.(); rw?.(); rx?.(); rf?.(); re?.(); rb?.();
  }, [ra, rw, rx, rf, re, rb]);

  const abouts = useMemo(() => filterByLanguage(rawAbouts, isCn), [rawAbouts, isCn]);
  const artworksAll = useMemo(() => filterByLanguage(rawArtworks, isCn), [rawArtworks, isCn]);
  const exhibitionsAll = useMemo(() => filterByLanguage(rawExhibitions, isCn), [rawExhibitions, isCn]);
  const fairsAll = useMemo(() => filterByLanguage(rawFairs, isCn), [rawFairs, isCn]);
  const eventsAll = useMemo(() => filterByLanguage(rawEvents, isCn), [rawEvents, isCn]);
  const bibliographiesAll = useMemo(() => filterByLanguage(rawBibliographies, isCn), [rawBibliographies, isCn]);

  const about = useMemo(() => {
    if (!artistName || !Array.isArray(abouts)) return null;
    const key = normalizeName(artistName);
    return abouts.find((a) => normalizeName(a?.artist) === key) || null;
  }, [abouts, artistName]);

  const profile = useMemo(() => {
    if (about) {
      return buildArtistProfile(about, artworksAll, exhibitionsAll, fairsAll, eventsAll, bibliographiesAll);
    }
    if (artistName) {
      const key = normalizeName(artistName);
      const artistArtworks = uniqueById(
        sortArtworksByArtistPageOrder(
          visibleArtistArtworks(artworksAll || []).filter((aw) => normalizeName(aw?.artist) === key)
        )
      );
      const artistExhibitions = uniqueById(
        sortByOrder((exhibitionsAll || []).filter((ex) => recordMatchesArtist(ex, key)))
      );
      const artistFairs = uniqueById(
        sortByOrder((fairsAll || []).filter((f) => recordMatchesArtist(f, key)))
      );
      const artistEvents = uniqueById(
        sortByOrder((eventsAll || []).filter((ev) => eventMatchesArtist(ev, key)))
      );
      const artistBibliographies = uniqueById(
        sortByOrder((bibliographiesAll || []).filter((b) => bibliographyMatchesArtist(b, key)))
      );

      if (
        artistArtworks.length ||
        artistExhibitions.length ||
        artistFairs.length ||
        artistEvents.length ||
        artistBibliographies.length
      ) {
        return {
          id: null,
          artist: artistName,
          name: artistName,
          portrait_img_url: null,
          portrait_image_url: null,
          caption: "",
          introductions: [],
          pdf_url: null,
          web_url: null,
          language: null,
          order: null,
          mark: null,
          artworks: artistArtworks,
          exhibitions: artistExhibitions,
          fairs: artistFairs,
          events: artistEvents,
          bibliographies: artistBibliographies,
        };
      }
    }
    return null;
  }, [about, artistName, artworksAll, exhibitionsAll, fairsAll, eventsAll, bibliographiesAll]);

  const notFound = !isLoading && !profile && !!artistName;

  return {
    profile,
    artworks: profile?.artworks || [],
    exhibitions: profile?.exhibitions || [],
    fairs: profile?.fairs || [],
    events: profile?.events || [],
    bibliographies: profile?.bibliographies || [],
    isLoading,
    hasError,
    refetch,
    notFound,
  };
}