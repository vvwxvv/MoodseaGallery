"use client";
import React, { useCallback, useContext, useMemo } from "react";
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { imageSchemaConfig } from "@/components/pages/manager/config/imageSchemaConfig";
import {
  buildImageSourceIndex,
  imageGroupKeys,
  groupSourceLabel,
  groupParentId,
  parentArtist,
  compareGroupKeys,
} from "@/components/pages/images/hooks/useImageSourceIndex";
import useImageSync from "@/hooks/useImageSync";

import ManagerStructureLayout from "@/components/pages/manager/layouts/ManagerStructureLayout";
import useData from "@/hooks/useData";

export default function ImageSManagerPage() {
  const { isCn } = useContext(LanguageContext);
  // "Group by artist" resolves every image tag against the whole graph —
  // Artwork (title → artist), Exhibition, Fair, Event, Bibliography, About —
  // instead of the Artwork schema alone, so exhibition / fair / biography
  // images no longer fall into "Ungrouped". See useImageSourceIndex.
  const { data: rawArtworks = [] } = useData("/api/artwork");
  const { data: rawImages = [], refetch: refetchImages } = useData("/api/image");
  const { data: rawExhibitions = [] } = useData("/api/exhibition");
  const { data: rawFairs = [] } = useData("/api/fair");
  const { data: rawEvents = [] } = useData("/api/event");
  const { data: rawBibliographies = [] } = useData("/api/bibliography");
  const { data: rawAbouts = [] } = useData("/api/about");
  const { data: rawWritings = [] } = useData("/api/writing");

  const sourceIndex = useMemo(
    () =>
      buildImageSourceIndex({
        artworks: Array.isArray(rawArtworks) ? rawArtworks : [],
        images: Array.isArray(rawImages) ? rawImages : [],
        exhibitions: Array.isArray(rawExhibitions) ? rawExhibitions : [],
        fairs: Array.isArray(rawFairs) ? rawFairs : [],
        events: Array.isArray(rawEvents) ? rawEvents : [],
        bibliographies: Array.isArray(rawBibliographies) ? rawBibliographies : [],
        abouts: Array.isArray(rawAbouts) ? rawAbouts : [],
      }),
    [
      rawArtworks,
      rawImages,
      rawExhibitions,
      rawFairs,
      rawEvents,
      rawBibliographies,
      rawAbouts,
    ]
  );

  // ── "Refresh Images" — pull in covers that exist on other collections but
  // were never added as Image rows (auto-fills tag_en / tag_cn from the
  // language-split siblings). See utils/imageSync + /api/image/sync.

  const syncData = useMemo(
    () => ({
      artwork: Array.isArray(rawArtworks) ? rawArtworks : [],
      exhibition: Array.isArray(rawExhibitions) ? rawExhibitions : [],
      fair: Array.isArray(rawFairs) ? rawFairs : [],
      event: Array.isArray(rawEvents) ? rawEvents : [],
      writing: Array.isArray(rawWritings) ? rawWritings : [],
      bibliography: Array.isArray(rawBibliographies) ? rawBibliographies : [],
      about: Array.isArray(rawAbouts) ? rawAbouts : [],
    }),
    [
      rawArtworks,
      rawExhibitions,
      rawFairs,
      rawEvents,
      rawWritings,
      rawBibliographies,
      rawAbouts,
    ]
  );

  const { missingCount, syncing, syncImages } = useImageSync(
    syncData,
    Array.isArray(rawImages) ? rawImages : []
  );

  const handleRefreshImages = useCallback(async () => {
    await syncImages();
    refetchImages?.();
  }, [syncImages, refetchImages]);

  const managerSchemaConfig = useMemo(() => {
    return {
      ...imageSchemaConfig,
      dataConfig: {
        ...imageSchemaConfig.dataConfig,
        // Dedicated drag-and-drop page that orders images within artist groups.
        orderPagePath: "/manager/image/order",
        // Title-cased shortcut label for that page ("Order Rolling Images").
        orderPageLabel: { EN: "Order Rolling Images", CN: "轮播图排序" },
        // Dedicated page that picks each artist's hover image.
        hoverPagePath: "/manager/image/hover",
        hoverPageLabel: { EN: "Hover Image", CN: "悬停图" },
        // "Refresh Images" — pulls cover URLs that exist on other collections
        // but were never added as Image rows (tag_en / tag_cn auto-filled from
        // the language-split siblings). Rendered in the search & filter header,
        // next to the group-by select / order-page link.
        headerActionButtons: [
          {
            action: "syncImages",
            icon: syncing ? Loader2 : missingCount ? RefreshCw : CheckCircle2,
            label: syncing
              ? isCn
                ? "同步中…"
                : "Syncing…"
              : missingCount
              ? isCn
                ? `同步图片 (${missingCount})`
                : `Sync Images (${missingCount})`
              : isCn
              ? "图片已同步"
              : "Images Up To Date",
            notice: syncing
              ? null
              : missingCount === 1
              ? isCn
                ? "有 1 张图片需要同步"
                : "1 image needs syncing"
              : missingCount
              ? isCn
                ? `有 ${missingCount} 张图片需要同步`
                : `${missingCount} images need syncing`
              : null,
            tooltip: missingCount
              ? isCn
                ? "从作品 / 展览 / 艺博会等封面补全缺失的图片并自动填充中英文标签"
                : "Add covers from artwork / exhibition / fair … that are missing in Images, with tag_en / tag_cn filled in"
              : isCn
              ? "所有封面都已在图片库中"
              : "Every cover is already in the Image collection",
            // Greyed out when there is nothing to sync.
            disabled: syncing || missingCount === 0,
            onClick: handleRefreshImages,
          },
        ],
        // Sort the manager list by tag (images carry no artwork order), and show
        // the rolling-image position on the cards.
        defaultSort: { field: "tag_en", direction: "asc", orderKey: "rolling_img_order" },
        groupConfig: {
          enabled: true,
          applyTo: ["grid", "list"],
          sortGroups: true,
          emptyLabel: { EN: "Ungrouped", CN: "未分组" },
          // Artist groups come first (A→Z), then groups whose source has no
          // artist, and the ungrouped bucket last.
          sortGroupsFn: (a, b) => compareGroupKeys(a?.key, b?.key),
          // Switchable grouping dimension (see the `selectGroupBy` control).
          default: "tag",
          options: [
            {
              value: "tag",
              // Group by the image tag, showing both languages on the group
              // header ("Title EN / 标题 CN").
              overrides: {
                field: "tag_en",
                getGroupKey: undefined,
                getGroupLabel: (key, items, context) => {
                  const en = (items?.[0]?.tag_en || key || "").trim();
                  const cn = (items?.[0]?.tag_cn || "").trim();
                  if (!cn || cn === en) return en;
                  return context?.isCn ? `${cn} / ${en}` : `${en} / ${cn}`;
                },
              },
            },
            {
              value: "artist",
              // Artist grouping, nested: ONE big accordion box per artist with a
              // collapsible box per source inside it —
              //   ┌ Chen Hongzhi / 陈鸿志            (39 Images)
              //   │  ├ Works                        (27)
              //   │  └ Exhibition: One, and Many …  (12)
              // An image can appear under several artists (a group show's
              // installation views belong to every artist in the show), hence
              // the array of keys.
              overrides: {
                field: null,
                getGroupKey: (item) => imageGroupKeys(item, sourceIndex),
                // Child boxes show only the source — the artist is on the parent.
                getGroupLabel: (key, items, context) =>
                  groupSourceLabel(key, { isCn: Boolean(context?.isCn) }),
                // …which is what turns the flat group list into a tree.
                getGroupParent: (key) => groupParentId(key),
                getGroupParentLabel: (parentId, group, context) => {
                  const artist = parentArtist(parentId);
                  return artist
                    ? sourceIndex.labelFor(artist, {
                        lang: context?.isCn ? "cn" : "en",
                      })
                    : group?.label || parentId;
                },
              },
            },
          ],
        },
      },
    };
  }, [sourceIndex, isCn, syncing, missingCount, handleRefreshImages]);

  return (
    <ManagerStructureLayout managerSchemaConfig={managerSchemaConfig} />
  );
}
