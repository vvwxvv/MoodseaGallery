import { useMemo } from "react";
import { getImageOrder } from "@/utils/mediaOrder";

const DEFAULT_ID_FIELD = "_id";
const DEFAULT_TITLE_FIELD = "title";
const DEFAULT_COVER_FIELD = "cover_img_url";

/**
 * Which `Image.order` sub-key drives the gallery order for each entity page.
 * Images are only ever positioned from the image order page (rolling order),
 * so `rolling_img_order` is the fallback for every entity.
 */
const ORDER_KEY_BY_ENTITY = {
  artwork: "artist_page_order",
  exhibition: "exhibition_page_order",
  fair: "art_fair_page_order",
};

/** Rank for one image: first usable position wins; none → Infinity (last). */
const rankOf = (img, orderKeys) => {
  for (const key of orderKeys) {
    const v = Number(getImageOrder(img, key));
    if (Number.isFinite(v) && v > 0) return v;
  }
  return Infinity;
};

/**
 * Match images to a single entity. Safe against null/undefined inputs.
 */
export const useSingleEntityImagesMaching = (allImages, entity, entityType = "artwork", isCn) => {
  return useMemo(() => {
    if (!Array.isArray(allImages) || !allImages.length || !entity) {
      return { matchedImages: [], coverImage: null };
    }

    const idField = DEFAULT_ID_FIELD;
    const titleField = DEFAULT_TITLE_FIELD;
    const coverField = DEFAULT_COVER_FIELD;

    const entityId = entity[idField] || entity._id || entity.id;
    const entityTitle = entity[titleField] || "";

    // Order key chain: the entity's own page order, then the rolling order
    // (images are positioned from the image order page), then everything else.
    const primaryKey = ORDER_KEY_BY_ENTITY[entityType] || "artist_page_order";
    const orderKeys = [
      primaryKey,
      "rolling_img_order",
      ...Object.values(ORDER_KEY_BY_ENTITY).filter((k) => k !== primaryKey),
    ];

    const matchedImages = allImages
      .filter((img) => {
        if (!img) return false;
        if (img.artworkId && img.artworkId === entityId) return true;
        if (img.eventId && img.eventId === entityId) return true;
        if (img.entityId && img.entityId === entityId) return true;

        const tagEn = (img.tag_en || "").toLowerCase();
        const tagCn = (img.tag_cn || "").toLowerCase();
        const titleLower = entityTitle.toLowerCase();

        return (tagEn && tagEn === titleLower) || (tagCn && tagCn === titleLower);
      })
      .map((img) => ({
        ...img,
        id: img.id || img._id,
        img_url: img.img_url,
        caption_en: img.caption_en || "",
        caption_cn: img.caption_cn || "",
        tag_en: img.tag_en || "",
        tag_cn: img.tag_cn || "",
        // `order` is a JSON object on Image — expose the resolved position as a
        // plain string so nothing downstream can render "[object Object]".
        order: getImageOrder(img, primaryKey),
      }))
      .sort((a, b) => rankOf(a, orderKeys) - rankOf(b, orderKeys));

    const coverImage =
      entity[coverField] || (matchedImages.length > 0 ? matchedImages[0].img_url : null);

    return { matchedImages, coverImage };
  }, [allImages, entity, entityType]);
};

const FALLBACK_IMAGE = "/no-image.png";

const useImageGallery = (images, item, isCn, options = {}) => {
  const {
    imageUrlField = "img_url",
    coverImageField = "cover_img_url",
    fallbackImage = FALLBACK_IMAGE,
    entityType = "artwork",
  } = options;

  const { matchedImages } = useSingleEntityImagesMaching(images, item, entityType, isCn);

  const uniqueImages = useMemo(() => {
    if (!Array.isArray(matchedImages) || matchedImages.length === 0) return [];
    const seen = new Set();
    return matchedImages.filter((image) => {
      if (!image?.[imageUrlField]?.trim()) return false;
      if (seen.has(image[imageUrlField])) return false;
      seen.add(image[imageUrlField]);
      return true;
    });
  }, [matchedImages, imageUrlField]);

  const mainImageUrl = useMemo(() => {
    if (uniqueImages.length > 0) return uniqueImages[0][imageUrlField];
    if (item?.[coverImageField]?.trim()) return item[coverImageField];
    return fallbackImage;
  }, [uniqueImages, item, coverImageField, imageUrlField, fallbackImage]);

  const galleryImages = useMemo(() => uniqueImages.slice(1), [uniqueImages]);

  return { mainImageUrl, galleryImages, uniqueImages };
};

export default useImageGallery;
