"use client";

/**
 * useArtistHoverImageFor(artistName)
 *
 * Resolves the image an artist flagged with the `artist_hover_image` mark —
 * the picture shown when a visitor hovers the artist's name (artist list) and
 * the one the artist detail page reveals on hover.
 *
 * Same resolution path as the artist list: an image is matched to an artist
 * through the shared image-source index (image tag → artwork / exhibition /
 * fair / event / bibliography / about), so a hover image tagged with any of
 * those resolves to the right artist.
 *
 * Returns a slide-shaped object ({ id, title, cover_img_url, caption, … }) or
 * null when the artist has no hover image.
 */

import { useMemo } from "react";
import useData from "@/hooks/useData";
import { MARK, isMarkApplied } from "@/utils/mediaMarks";
import { buildImageSourceIndex } from "@/components/pages/images/hooks/useImageSourceIndex";

const keyOf = (index, name) =>
  String(index?.canonicalArtist?.(name) || name || "").trim().toLowerCase();

export default function useArtistHoverImageFor(artistName, isCn = false, options = {}) {
  const { images: providedImages, artworks: providedArtworks } = options;
  const hasExternal = Array.isArray(providedImages) || Array.isArray(providedArtworks);

  const { data: fetchedImages = [] } = useData(hasExternal ? null : "/api/image");
  const { data: fetchedArtworks = [] } = useData(hasExternal ? null : "/api/artwork");

  const images = hasExternal ? providedImages || [] : fetchedImages;
  const artworks = hasExternal ? providedArtworks || [] : fetchedArtworks;

  return useMemo(() => {
    if (!artistName) return null;

    const list = Array.isArray(images) ? images : [];
    const index = buildImageSourceIndex({
      artworks: Array.isArray(artworks) ? artworks : [],
      images: list,
    });
    const wanted = keyOf(index, artistName);

    for (const img of list) {
      if (!isMarkApplied(img, MARK.ARTIST_HOVER_IMAGE)) continue;
      const url = img?.img_url || img?.image_url;
      if (!url) continue;

      const artists = index.resolveImageSource(img)?.artists || [];
      if (!artists.some((a) => keyOf(index, a) === wanted)) continue;

      return {
        id: img.id || img._id || url,
        title: img.tag_en || img.caption_en || "",
        cover_img_url: url,
        caption: (isCn ? img.caption_cn : img.caption_en) || "",
        year: "",
        medium: "",
        tag_en: img.tag_en || "",
        tag_cn: img.tag_cn || "",
        order: "",
        isHoverImage: true,
      };
    }

    return null;
  }, [images, artworks, artistName, isCn]);
}
