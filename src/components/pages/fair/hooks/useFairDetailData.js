import { useMemo } from "react";
import useData from "@/hooks/useData";
import { hasArtworkOrder, artworkOrderNumber, compareByYearThenTitle } from "@/utils/artworkOrder";
import { isArtworkHiddenForPage } from "@/utils/mediaMarks";
import useImageGallery from "@/hooks/useImageGallery";
import useWebGallery from "@/hooks/useWebGallery";
import { useWebMatching } from "@/hooks/useWebMatching";
import useFairSlugData from "@/components/pages/fair/hooks/useFairSlugData";   // fair slug hook
import useZoomControl from "@/hooks/useZoomControl";
import useImageModal from "@/hooks/useImageModal";

import { imageConfig } from "@/components/configs/imageConfig";
import { webConfig } from "@/components/configs/webConfig";
import { videoConfig } from "@/components/configs/videoConfig";

const FALLBACK_IMAGE = "/no-image.png";
const ZOOM_CONFIG = {
  STEP: 0.1,
  MIN: 1,
  MAX: 3,
};

// Normalize a title for cross-collection matching (same rule as the
// exhibition page, so artwork lookups behave identically).
const normalizeTitle = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export default function useFairDetailData(slug, isCn) {
  // Resolve slug to fair record
  const { fair, loading, error: fairError } = useFairSlugData(slug, isCn);

  // Fetch images data
  const { data: images, isLoading: imagesLoading, error: imagesError } = useData(
    imageConfig.api.endpoints.list,
    null,
    isCn
  );

  // Fetch web data
  const { data: webs, isLoading: websLoading, error: websError } = useData(
    webConfig.api.endpoints.list,
    null,
    isCn
  );

  // Fetch videos data
  const { data: videos, isLoading: videosLoading, error: videosError } = useData(
    videoConfig.api.endpoints.list,
    null,
    isCn
  );

  // ------------------------------------------------------------------
  // Related artworks — resolved from the fair's `related_artwork` entries
  // (object array `[{ title, order, mark }]`) with the legacy
  // `related_artwork_title` string array as fallback.
  //
  // Ordering: the artwork's OWN `order.art_fair_page_order` (the per-page
  // position the artwork order page writes) comes first, ascending; artworks
  // without one keep the order the fair itself declares, and titles that
  // match no artwork keep their declared position too (so nothing disappears).
  //
  // The artwork list is only fetched when the fair actually references an
  // artwork, so fairs with no related works don't pay for an extra request.
  // ------------------------------------------------------------------
  const declaredRelated = useMemo(() => {
    if (!fair) return [];
    const source =
      Array.isArray(fair.related_artwork) && fair.related_artwork.length
        ? fair.related_artwork
        : toArray(fair.related_artwork_title);

    return source
      .map((entry) => {
        const isObj = entry && typeof entry === "object";
        const title = String((isObj ? entry.title : entry) || "").trim();
        if (!title) return null;
        return {
          title,
          related_order: isObj ? entry.order : undefined,
        };
      })
      .filter(Boolean);
  }, [fair]);

  const { data: artworks = [], refetch: refetchArtworks } = useData(
    declaredRelated.length ? "/api/artwork" : null,
    null,
    isCn
  );

  const relatedArtworks = useMemo(() => {
    if (!declaredRelated.length) return [];

    // normalized title → artwork (first match wins on duplicated titles)
    const index = new Map();
    for (const aw of artworks || []) {
      const key = normalizeTitle(aw?.title);
      if (!key || index.has(key)) continue;
      index.set(key, aw);
    }

    const items = declaredRelated.map((entry) => ({
      ...entry,
      artwork: index.get(normalizeTitle(entry.title)) || null,
      matched: index.has(normalizeTitle(entry.title)),
    }));

    // Works the manager marked as hidden from the art fair page are excluded
    // (mark = "hide_in_art_fair_page"). Entries that match no artwork are kept.
    const visibleItems = items.filter(
      (item) =>
        !item.artwork || !isArtworkHiddenForPage(item.artwork, "art_fair_page_order")
    );

    const ordered = [];
    const unordered = [];
    for (const item of visibleItems) {
      (hasArtworkOrder(item.artwork, "art_fair_page_order")
        ? ordered
        : unordered
      ).push(item);
    }

    ordered.sort(
      (a, b) =>
        artworkOrderNumber(a.artwork, "art_fair_page_order") -
        artworkOrderNumber(b.artwork, "art_fair_page_order")
    );

    // Nothing positioned → newest year first, then title A→Z.
    unordered.sort((a, b) => compareByYearThenTitle(a.artwork, b.artwork));

    return [...ordered, ...unordered];
  }, [declaredRelated, artworks]);

  // Image matching (uses cover_img_url field, common to both exhibition and fair)
  const { mainImageUrl, galleryImages } = useImageGallery(images, fair, isCn, {
    imageUrlField: "img_url",
    coverImageField: "cover_img_url",
    fallbackImage: FALLBACK_IMAGE,
  });

  // Web matching (uses web_url field, common)
  const { galleryWebs } = useWebGallery(webs, fair, isCn, {
    webUrlField: "web_url",
  });

  const matchedWebs = useWebMatching(webs, fair, isCn);

  // Zoom & modal
  const { zoomLevel, handleImageWheel } = useZoomControl(mainImageUrl, ZOOM_CONFIG);
  const { enlargedImage, modalOpen, handleImageClick, handleModalClose } = useImageModal(FALLBACK_IMAGE);

  // Aggregate loading & errors
  const isLoading = loading || imagesLoading || websLoading || videosLoading;
  const errors = [fairError, imagesError, websError, videosError].filter(Boolean);
  const hasError = errors.length > 0;
  const firstError = errors[0] || null;

  return {
    fair,                      // renamed from exhibition
    isLoading,
    hasError,
    firstError,
    errors,
    mainImageUrl,
    galleryImages,
    videos,
    galleryWebs,
    matchedWebs,
    relatedArtworks,
    refetchArtworks,
    zoomLevel,
    handleImageWheel,
    enlargedImage,
    modalOpen,
    handleImageClick,
    handleModalClose,
  };
}