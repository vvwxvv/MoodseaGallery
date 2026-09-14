"use client";

import { useMemo } from "react";
import useData from "@/hooks/useData";
import { filterByLanguage } from "@/utils/filterByLanguage";
import { sortArtworksByPageOrder } from "@/utils/artworkOrder";
import { filterArtworksHiddenForPage } from "@/utils/mediaMarks";

// Year (desc) fallback for works that have no artist-page order yet — the
// same fallback the artist detail page uses, so both lists agree.
const yearOf = (aw) => {
  const n = parseInt(aw?.year, 10);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * useRelatedArtworks
 *
 * "Related works" for an artwork detail page: every *other* artwork by the
 * same artist, ordered by the artwork's `order.artist_page_order` JSON field
 * (ascending — the same position the artist page uses).
 *
 * Artworks with no `artist_page_order` keep their incoming (API) order and
 * sit alongside the value-0 items, so nothing is lost or reshuffled when the
 * field hasn't been filled in.
 *
 * @param {string} artist       — current artwork's artist
 * @param {object} options
 * @param {string} options.excludeTitle — skip this artwork's own title
 * @param {boolean} options.isCn
 * @returns {{ related: Array, isLoading: boolean, error: any }}
 */export default function useRelatedArtworks(artist, { excludeTitle, isCn } = {}) {
  const { data: allArtworks = [], isLoading, error } = useData("/api/artwork");

  const related = useMemo(() => {
    if (!artist || !Array.isArray(allArtworks)) return [];

    const key = String(artist).trim().toLowerCase();

    // Other works by the same artist, minus the ones hidden from the artist
    // page (mark.hide includes "artist_page") and the artwork being viewed.
    const list = filterArtworksHiddenForPage(
      filterByLanguage(allArtworks, isCn),
      "artist_page_order"
    ).filter(
      (item) =>
        String(item?.artist || "")
          .trim()
          .toLowerCase() === key && item?.title !== excludeTitle
    );

    // Order by the artist-page order (`order.artist_page_order`), the exact
    // same rule the artist page itself uses (positioned works first /
    // ascending, the rest by newest year then title A→Z).
    return sortArtworksByPageOrder(list, "artist_page_order");
  }, [allArtworks, artist, excludeTitle, isCn]);

  return { related, isLoading, error };
}
