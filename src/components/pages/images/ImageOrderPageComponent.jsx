"use client";

import React, { useContext, useMemo, useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Eye, EyeOff, GripVertical } from "lucide-react";

import { LanguageContext } from "@/components/contexts/LanguageContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useFont from "@/hooks/useFont";
import useData from "@/hooks/useData";
import {
  buildImageSourceIndex,
  imageGroupKeys,
  groupSourceLabel,
  parseGroupKey,
  compareGroupKeys,
  SOURCE_ORDER,
  UNGROUPED_KEY,
} from "@/components/pages/images/hooks/useImageSourceIndex";
import {
  isHiddenInArtistRollingImage,
  IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL,
  applyMark,
  hideLabelForOrderKey,
  hideTokenForOrderKey,
  isMarkHidden,
  HIDE_ARTIST_ROLLING_IMAGE,
  MARK_FLAG_ARTIST_HOVER_IMAGE,
  MARK_FLAG_LABELS,
  isMarkFlagged,
} from "@/utils/mediaMarks";
import { IMAGE_ORDER_KEYS, ORDER_KEY_LABELS, normalizeImageOrder, getOrder } from "@/utils/mediaOrder";
import { ARTIST_ROLLING_ORDER_KEY } from "@/components/pages/artists/hooks/useArtistRollingImages";
import LoadingLayer from "@/components/animations/LoadingLayer";
import AlertInfo from "@/components/alerts/AlertInfo";
import OrderPageShell from "@/components/pages/order/OrderPageShell";
import OrderGroupBox from "@/components/pages/order/OrderGroupBox";
import OrderRollingStrip from "@/components/pages/order/OrderRollingStrip";
import OrderCard, {
  OrderCardGrid,
  OrderHiddenStrip,
  OrderViewControls,
  SortableOrderItem,
} from "@/components/pages/order/OrderCard";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// Which `order` sub-key is edited by default. An image can hold one position
// per page (artist / exhibition / art-fair page) PLUS the artist rolling
// order — the toolbar switches between them.
const ORDER_KEY_DEFAULT = ARTIST_ROLLING_ORDER_KEY;

// Sub-group id for one source inside an artist box: artist\u001fkind\u001ftitle
const SOURCE_UNGROUPED = "__ungrouped__";

const idOf = (item) => item?.id || item?._id;

const T = {
  title: { en: "Order Images", cn: "图片排序" },
  subtitle: {
    en: "Pick the order you are editing, then drag the cards. Images are grouped by artist — each exhibition, fair or work sits in its own box; hidden images drop to the bottom, half size, under the dashed line.",
    cn: "选择要编辑的排序，然后拖动卡片。图片按艺术家分组，展览 / 艺博会 / 作品各自一个小盒；隐藏的图片缩小一半，统一放在虚线下方。",
  },
  dragHint: { en: "Drag cards to reorder", cn: "拖动卡片排序" },
  save: { en: "Save Order", cn: "保存排序" },
  saving: { en: "Saving…", cn: "保存中…" },
  reset: { en: "Reset", cn: "重置" },
  back: { en: "Back", cn: "返回" },
  grid: { en: "Grid", cn: "网格" },
  list: { en: "List", cn: "列表" },
  size: { en: "Size", cn: "大小" },
  savedOk: { en: "Order Saved", cn: "排序已保存" },
  saveFail: { en: "Failed to Save Order", cn: "保存排序失败" },
  empty: { en: "No Images", cn: "暂无图片" },
  loadFail: { en: "Loading Failed", cn: "加载失败" },
  ungrouped: { en: "Ungrouped", cn: "未分组" },
  shared: { en: "Shared", cn: "共享" },
  hiddenTitle: { en: "Hidden From Artist Page Rolling", cn: "不在艺术家页轮播中显示" },
  hiddenHint: {
    en: "Hidden images have no position — they are kept here, half size, under the dashed line.",
    cn: "隐藏的图片没有排序，统一放在虚线下方，尺寸缩小一半。",
  },
  matched: { en: "grouped by artist", cn: "按艺术家分组" },
};

const txt = (entry, isCn) => (isCn ? entry.cn : entry.en);

// ─────────────────────────────────────────────────────────────────────────────
//  Card — thin adapter over the shared <OrderCard> (see
//  components/pages/order/OrderCard.jsx). Every order page uses that one card,
//  so the artwork + hover pages finally look identical to this one.
// ─────────────────────────────────────────────────────────────────────────────
function ImageCard({
  item,
  orderNumber,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  hidden,
  onToggleHide,
  busy,
}) {
  const img = item?.img_url || item?.image_url;
  const meta = [item?.type, item?.tag_source].filter(Boolean);
  const hideHint = isCn
    ? IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL.cn
    : IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL.en;

  return (
    <OrderCard
      image={img}
      imageAlt={item?.tag_en || ""}
      title={item?.tag_en || (isCn ? "无标题" : "Untitled")}
      subtitle={item?.tag_cn || "—"}
      meta={meta.join(" · ")}
      number={orderNumber ?? null}
      dim={!!hidden}
      borderColor="#000"
      listMode={listMode}
      thumbWidth={thumbWidth}
      fontFamily={fontFamily}
      overlayX={!!hidden}
      action={{
        icon: hidden ? <EyeOff size={15} /> : <Eye size={15} />,
        pressed: !!hidden,
        busy,
        title: hidden ? (isCn ? "取消隐藏" : "Show in artist page rolling") : hideHint,
        onClick: () => onToggleHide?.(),
      }}
    />
  );
}
// ─────────────────────────────────────────────────────────────────────────────
//  Source sub-group — one box per source (Works / Exhibition: … / Art Fair: …)
//  inside its artist box. Dragging is only possible within a sub-group: the
//  rolling order is a single sequence per artist, so the numbers continue
//  across the artist's boxes.
// ─────────────────────────────────────────────────────────────────────────────
function SourceGroup({
  groupKey,
  label,
  items,
  numbers,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  onReorder,
  isItemHidden,
  onToggleItemHidden,
  isItemHover,
  onToggleItemHover,
  isItemBusy,
  showHeader = true,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map(idOf);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  const cardProps = (item) => ({
    item,
    orderNumber: numbers.get(idOf(item)) ?? null,
    isCn,
    fontFamily,
    listMode,
    thumbWidth,
    hidden: false,
    onToggleHide: () => onToggleItemHidden?.(item, groupKey),
    busy: isItemBusy ? isItemBusy(item) : false,
  });

  return (
    <div style={{ marginBottom: 12 }}>
      {showHeader && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "9px 14px",
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 10,
            marginBottom: 12,
            fontFamily,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
          <span style={{ fontSize: 12, opacity: 0.55 }}>{items.length}</span>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <OrderCardGrid listMode={listMode} thumbWidth={thumbWidth} gap={12}>
            {items.map((item) => (
              <SortableOrderItem key={idOf(item)} id={idOf(item)}>
                <ImageCard {...cardProps(item)} />
              </SortableOrderItem>
            ))}
          </OrderCardGrid>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hidden strip — every hidden image of this artist, together at the bottom,
//  half size, above a dashed separator. Not sortable (no position).
//  Layout comes from the shared <OrderHiddenStrip>.
// ─────────────────────────────────────────────────────────────────────────────
function HiddenStrip({
  groupKey,
  items,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  onToggleItemHidden,
  isItemBusy,
}) {
  if (!items.length) return null;

  return (
    <OrderHiddenStrip
      items={items}
      label={txt(T.hiddenTitle, isCn)}
      hint={txt(T.hiddenHint, isCn)}
      count={items.length}
      listMode={listMode}
      thumbWidth={thumbWidth}
      fontFamily={fontFamily}
      style={{ marginTop: 6 }}
      renderCard={(item, smallWidth) => (
        <ImageCard
          item={item}
          orderNumber={null}
          isCn={isCn}
          fontFamily={fontFamily}
          listMode={listMode}
          thumbWidth={smallWidth}
          hidden
          onToggleHide={() => onToggleItemHidden?.(item, groupKey)}
          busy={isItemBusy ? isItemBusy(item) : false}
        />
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Artist box — the big accordion: header + one sub-box per source
//  (Works / Exhibition: … / Art Fair: …) + the hidden strip at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
function ArtistBlock({
  group,
  items,
  anchorId,
  isRollingTab = false,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  onReorderSource,
  isItemHidden,
  onToggleItemHidden,
  isItemHover,
  onToggleItemHover,
  isItemBusy,
}) {
  // Number the visible images across the WHOLE artist (Works 1..27, then the
  // exhibition continues 28..39): one rolling sequence per artist.
  const numbers = useMemo(() => {
    const map = new Map();
    let n = 0;
    for (const item of items) {
      if (isItemHidden(item)) continue;
      map.set(idOf(item), ++n);
    }
    return map;
  }, [items, isItemHidden]);

  const hiddenItems = items.filter((item) => isItemHidden(item));
  const visibleCount = items.length - hiddenItems.length;

  // Split the artist's ordered list into its sources, keeping that order.
  const sources = useMemo(() => {
    const map = new Map();
    for (const source of group.sources || []) map.set(source.key, { ...source, items: [] });

    for (const item of items) {
      if (isItemHidden(item)) continue;
      const bucket = map.get(item.__sourceKey) || map.get(SOURCE_UNGROUPED);
      if (bucket) bucket.items.push(item);
    }
    return [...map.values()];
  }, [items, group.sources, isItemHidden]);

  const showSourceHeaders = (group.sources || []).length > 1 || Boolean(group.artist);

  return (
    <OrderGroupBox
      id={anchorId}
      label={group.label}
      count={
        hiddenItems.length > 0
          ? `${visibleCount}${isRollingTab ? ` ${isCn ? "轮播" : "rolling"}` : ""} · ${hiddenItems.length} ${isCn ? "隐藏" : "hidden"}`
          : `${visibleCount}${isRollingTab ? ` ${isCn ? "轮播" : "rolling"}` : ""}`
      }
      fontFamily={fontFamily}
      labelFontFamily={fontFamily}
      bodyStyle={{ padding: "14px 16px 16px" }}
    >
      {sources.map((source) => (
        <SourceGroup
          key={source.key}
          groupKey={group.key}
          label={source.label}
          items={source.items}
          numbers={numbers}
          isCn={isCn}
          fontFamily={fontFamily}
          listMode={listMode}
          thumbWidth={thumbWidth}
          onReorder={(next) => onReorderSource(group.key, source.key, next)}
          isItemHidden={isItemHidden}
          onToggleItemHidden={onToggleItemHidden}
          isItemHover={isItemHover}
          onToggleItemHover={onToggleItemHover}
          isItemBusy={isItemBusy}
          showHeader={showSourceHeaders}
        />
      ))}

      <HiddenStrip
        groupKey={group.key}
        items={hiddenItems}
        isCn={isCn}
        fontFamily={fontFamily}
        listMode={listMode}
        thumbWidth={thumbWidth}
        onToggleItemHidden={onToggleItemHidden}
        isItemHover={isItemHover}
        onToggleItemHover={onToggleItemHover}
        isItemBusy={isItemBusy}
      />
    </OrderGroupBox>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ImageOrderPageComponent() {
  const { isCn } = useContext(LanguageContext);
  const { colors } = useReverseTheme();
  const { fontFamily } = useFont();

  const { data: rawImages = [], isLoading: l1, error: e1, refetch: refetchImages } = useData("/api/image");
  const { data: rawArtworks = [], isLoading: l2, error: e2 } = useData("/api/artwork");
  // The other places an artist can hide. An image's tag may name an exhibition,
  // a fair, an event, a bibliography or a biography — those records are what
  // resolve the tag back to an artist, so without them every non-work image
  // falls into "Ungrouped" instead of joining its artist's box.
  const { data: rawExhibitions = [], isLoading: l3, error: e3 } = useData("/api/exhibition");
  const { data: rawFairs = [], isLoading: l4, error: e4 } = useData("/api/fair");
  const { data: rawEvents = [], isLoading: l5, error: e5 } = useData("/api/event");
  const { data: rawBibliographies = [], isLoading: l6, error: e6 } = useData("/api/bibliography");
  const { data: rawAbouts = [], isLoading: l7, error: e7 } = useData("/api/about");

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;
  const error = e1 || e2 || e3 || e4 || e5 || e6 || e7;

  const [draft, setDraft] = useState({}); // group key -> ordered items
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(240);

  // ── Which order is being edited (switchable in the toolbar) ──
  // Declared before `groups`, which reads it.
  const [orderKey, setOrderKey] = useState(ORDER_KEY_DEFAULT);
  const hideToken = useMemo(() => hideTokenForOrderKey(orderKey), [orderKey]);
  const hideLabel = hideLabelForOrderKey(orderKey);

  const images = useMemo(() => {
    const arr = Array.isArray(rawImages) ? rawImages : [];
    return arr.map((it) => ({ ...it, id: it.id || it._id, _id: it._id || it.id }));
  }, [rawImages]);

  const artworks = useMemo(() => (Array.isArray(rawArtworks) ? rawArtworks : []), [rawArtworks]);

  // ── Structure: artist box → source sub-boxes (Works / Exhibition / Fair) ──
  // A tag is resolved against Artwork + Exhibition + Fair + Event +
  // Bibliography + About, so an image whose tag names a show or a fair is
  // placed under EVERY artist of that show/fair (all their images end up in
  // the artist's box) instead of falling into "Ungrouped".
  const sourceIndex = useMemo(
    () =>
      buildImageSourceIndex({
        artworks,
        images,
        exhibitions: Array.isArray(rawExhibitions) ? rawExhibitions : [],
        fairs: Array.isArray(rawFairs) ? rawFairs : [],
        events: Array.isArray(rawEvents) ? rawEvents : [],
        bibliographies: Array.isArray(rawBibliographies) ? rawBibliographies : [],
        abouts: Array.isArray(rawAbouts) ? rawAbouts : [],
      }),
    [
      artworks,
      images,
      rawExhibitions,
      rawFairs,
      rawEvents,
      rawBibliographies,
      rawAbouts,
    ]
  );

  const groups = useMemo(() => {
    const orderValue = (item) => {
      const value = Number(getOrder(item, orderKey));
      return Number.isFinite(value) && value > 0 ? value : Infinity;
    };
    const byTag = (a, b) =>
      String(a?.tag_en || "").localeCompare(String(b?.tag_en || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });

    const artists = new Map();

    for (const image of images) {
      const keys = imageGroupKeys(image, sourceIndex);

      for (const rawKey of keys) {
        const parts = parseGroupKey(rawKey);

        let artistKey;
        let artistLabel;
        let matched = true;

        if (parts.ungrouped) {
          artistKey = UNGROUPED_KEY;
          artistLabel = txt(T.ungrouped, isCn);
          matched = false;
        } else if (parts.sourceOnly) {
          artistKey = rawKey;
          artistLabel = groupSourceLabel(rawKey, { isCn });
          matched = false;
        } else {
          artistKey = parts.artist;
          artistLabel = sourceIndex.labelFor(parts.artist, {
            lang: isCn ? "cn" : "en",
          });
        }

        if (!artists.has(artistKey)) {
          artists.set(artistKey, {
            key: artistKey,
            label: artistLabel,
            artist: parts.artist || "",
            matched,
            sources: new Map(),
            items: [],
          });
        }

        const bucket = artists.get(artistKey);
        const sourceKey = parts.ungrouped ? SOURCE_UNGROUPED : rawKey;

        if (!bucket.sources.has(sourceKey)) {
          bucket.sources.set(sourceKey, {
            key: sourceKey,
            label: parts.ungrouped
              ? txt(T.ungrouped, isCn)
              : groupSourceLabel(rawKey, { isCn }),
            kind: parts.kind || "artwork",
            title: parts.title || "",
            items: [],
          });
        }

        // One copy per artist box (an image can belong to several artists), each
        // remembering which sub-box it came from.
        bucket.sources
          .get(sourceKey)
          .items.push({ ...image, __sourceKey: sourceKey });
      }
    }

    const groups = [...artists.values()];

    for (const group of groups) {
      const sources = [...group.sources.values()];
      sources.sort((a, b) => {
        const ka = SOURCE_ORDER[a.kind] ?? 9;
        const kb = SOURCE_ORDER[b.kind] ?? 9;
        if (ka !== kb) return ka - kb;
        return String(a.title).localeCompare(String(b.title), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      for (const source of sources) source.items.sort((a, b) => {
        const av = orderValue(a);
        const bv = orderValue(b);
        if (av !== bv) return av - bv;
        return byTag(a, b);
      });
      group.sources = sources;
      group.items = sources.flatMap((source) => source.items);
    }

    groups.sort((a, b) => compareGroupKeys(a.key, b.key));
    return groups;
  }, [images, sourceIndex, isCn, orderKey]);

  // Reset the draft whenever the groups change.
  useEffect(() => {
    const next = {};
    for (const g of groups) next[g.key] = g.items;
    setDraft(next);
  }, [groups]);

  // Drag inside one source box → splice those cards back into the artist's
  // running order, leaving every other source box where it was.
  // (Declared after isItemHidden — it is read from this hook's dep array.)

  // Per-card hide/show state (declared before handleSave, which reads it).
  // Optimistic overrides: id → mark value, applied instantly on toggle and
  // persisted with a PUT to /api/image.
  const [markOverrides, setMarkOverrides] = useState({});
  const [markBusy, setMarkBusy] = useState({});
  // Groups touched by a hide/show toggle → re-number them on Save.
  const [dirtyKeys, setDirtyKeys] = useState({});

  // How many images are marked to be hidden from the artist page rolling set.
  const markOf = useCallback(
    (item) => {
      const id = item?.id || item?._id;
      if (id && Object.prototype.hasOwnProperty.call(markOverrides, id)) {
        return markOverrides[id];
      }
      return item?.mark;
    },
    [markOverrides]
  );

  const isItemHidden = useCallback(
    (item) => isMarkHidden({ mark: markOf(item) }, hideToken),
    [markOf, hideToken]
  );

  // Is this image flagged as its artist's hover preview?
  const isItemHoverImage = useCallback(
    (item) => isMarkFlagged({ mark: markOf(item) }, MARK_FLAG_ARTIST_HOVER_IMAGE),
    [markOf]
  );

  // Drag inside one source box → splice those cards back into the artist's
  // running order, leaving every other source box where it was.
  const onReorder = useCallback(
    (artistKey, sourceKey, nextItems) => {
      setDraft((prev) => {
        const list = prev[artistKey] || [];
        let cursor = 0;
        const next = list.map((item) => {
          if (item.__sourceKey !== sourceKey || isItemHidden(item)) return item;
          return nextItems[cursor++] || item;
        });
        return { ...prev, [artistKey]: next };
      });
    },
    [isItemHidden]
  );

  const isItemBusy = useCallback(
    (item) => {
      const id = item?.id || item?._id;
      return Boolean(id && markBusy[id]);
    },
    [markBusy]
  );

  const onToggleItemHidden = useCallback(
    async (item, groupKey) => {
      const id = item?.id || item?._id;
      if (!id) return;

      // Remember that this group needs re-numbering on the next save (both for
      // hide — which clears the position — and show — which adds it back).
      if (groupKey) setDirtyKeys((prev) => ({ ...prev, [groupKey]: true }));

      const nextHidden = !isItemHidden(item);
      // Hide flags live inside the JSON mark, so a form-set `value` survives.
      const nextMark = applyMark(markOf(item), hideToken, nextHidden);

      // Optimistic — the card greys out (or clears) immediately.
      setMarkOverrides((prev) => ({ ...prev, [id]: nextMark }));
      setMarkBusy((prev) => ({ ...prev, [id]: true }));

      try {
        const payload = { mark: nextMark };
        if (nextHidden) {
          // A hidden image keeps NO position for this page — clear it right
          // away (the other order keys are preserved).
          payload.order = {
            ...normalizeImageOrder(item?.order),
            [orderKey]: "",
          };
        }

        const res = await fetch(`/api/image?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setNotice({
          type: "ok",
          text: nextHidden
            ? isCn
              ? "已隐藏 · 已清除排序"
              : "Hidden · order cleared"
            : isCn
            ? "已恢复显示"
            : "Shown in artist page rolling",
        });
      } catch (err) {
        console.log("[image order] mark update failed:", err);
        setMarkOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setNotice({
          type: "err",
          text: isCn ? "标记保存失败" : "Failed to save mark",
        });
      } finally {
        setMarkBusy((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [isItemHidden, isCn]
  );


  // Set / clear the `artist_hover_image` flag. Turning it ON also clears the
  // flag from any OTHER image that resolves to the same artist(s), so each
  // artist keeps exactly one hover image.
  const onToggleItemHover = useCallback(
    async (item) => {
      const id = item?.id || item?._id;
      if (!id) return;

      const nextOn = !isItemHoverImage(item);
      const nextMark = applyMark(markOf(item), MARK_FLAG_ARTIST_HOVER_IMAGE, nextOn);

      // Which other images must lose the flag (same artist)?
      const cleared = [];
      if (nextOn) {
        const artists = new Set(
          (sourceIndex.resolveImageSource(item)?.artists || []).map((a) =>
            String(a).toLowerCase()
          )
        );
        if (artists.size) {
          for (const other of images) {
            const oid = other?.id || other?._id;
            if (!oid || oid === id) continue;
            if (!isMarkFlagged({ mark: markOf(other) }, MARK_FLAG_ARTIST_HOVER_IMAGE)) continue;
            const oArtists = sourceIndex.resolveImageSource(other)?.artists || [];
            if (oArtists.some((a) => artists.has(String(a).toLowerCase()))) {
              cleared.push(other);
            }
          }
        }
      }

      // Optimistic update — this image + any cleared ones.
      setMarkOverrides((prev) => {
        const next = { ...prev, [id]: nextMark };
        for (const other of cleared) {
          const oid = other?.id || other?._id;
          if (oid) next[oid] = applyMark(markOf(other), MARK_FLAG_ARTIST_HOVER_IMAGE, false);
        }
        return next;
      });
      setMarkBusy((prev) => {
        const next = { ...prev, [id]: true };
        for (const other of cleared) {
          const oid = other?.id || other?._id;
          if (oid) next[oid] = true;
        }
        return next;
      });

      const put = (iid, mark) =>
        fetch(`/api/image?id=${iid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mark }),
        });

      try {
        const res = await put(id, nextMark);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await Promise.all(
          cleared.map((other) => {
            const oid = other?.id || other?._id;
            return oid
              ? put(oid, applyMark(markOf(other), MARK_FLAG_ARTIST_HOVER_IMAGE, false))
              : null;
          })
        );
        setNotice({
          type: "ok",
          text: nextOn
            ? isCn
              ? "已设为艺术家悬停图"
              : "Set as artist hover image"
            : isCn
            ? "已取消悬停图"
            : "Hover image cleared",
        });
      } catch (err) {
        console.log("[image order] hover flag update failed:", err);
        setMarkOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          for (const other of cleared) {
            const oid = other?.id || other?._id;
            if (oid) delete next[oid];
          }
          return next;
        });
        setNotice({ type: "err", text: isCn ? "标记保存失败" : "Failed to save mark" });
      } finally {
        setMarkBusy((prev) => {
          const next = { ...prev };
          delete next[id];
          for (const other of cleared) {
            const oid = other?.id || other?._id;
            if (oid) delete next[oid];
          }
          return next;
        });
      }
    },
    [images, sourceIndex, isItemHoverImage, markOf, isCn]
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setNotice(null);

      // Only send groups whose visible order actually changed (single request).
      // Hidden images are excluded from the numbering and have their rolling
      // order cleared, so "hidden" rows never carry a position.
      const groupsToSave = [];
      const hiddenSet = new Set();
      for (const g of groups) {
        const items = draft[g.key] || g.items;
        const visible = [];
        for (const it of items) {
          const id = it.id || it._id;
          if (isItemHidden(it)) {
            if (id) hiddenSet.add(id);
          } else if (id) {
            visible.push(id);
          }
        }

        // Always write every group with at least one visible item — a group
        // holding a single item still needs its position initialised/persisted.
        if (visible.length) {
          groupsToSave.push(visible);
        }
      }

      const hiddenIds = [...hiddenSet];

      if (!groupsToSave.length && !hiddenIds.length) {
        setNotice({ type: "ok", text: txt(T.savedOk, isCn) });
        return;
      }
      const res = await fetch("/api/image/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groupsToSave,
          orderKey,
          clearIds: hiddenIds,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setDirtyKeys({});
      setNotice({ type: "ok", text: txt(T.savedOk, isCn) });
      refetchImages?.();
    } catch (e) {
      console.log(e);
      setNotice({ type: "err", text: txt(T.saveFail, isCn) });
    } finally {
      setSaving(false);
    }
  }, [groups, draft, dirtyKeys, isItemHidden, refetchImages, isCn, orderKey]);

  const handleReset = useCallback(() => {
    const next = {};
    for (const g of groups) next[g.key] = g.items;
    setDraft(next);
    setNotice(null);
  }, [groups]);

  const hiddenCount = useMemo(() => {
    const ids = new Set();
    for (const group of groups) {
      for (const item of draft[group.key] || group.items) {
        if (isItemHidden(item)) ids.add(idOf(item));
      }
    }
    return ids.size;
  }, [groups, draft, isItemHidden]);

  // ── Rolling selection overview (top strip) ──────────────────────────────
  // The Rolling Image Order tab is the one that decides what the artist pages
  // actually show, so it gets an at-a-glance filmstrip of the current
  // selection: artists in page order, each artist's images in rolling order,
  // numbered 1..N across the whole artist (same numbers as the cards).
  const isRollingTab = orderKey === ARTIST_ROLLING_ORDER_KEY;

  const groupAnchorId = useCallback((key) => `ordgroup-${String(key)}`, []);

  const rollingOverview = useMemo(() => {
    if (!isRollingTab) return [];
    return groups.map((g) => {
      const items = draft[g.key] || g.items;
      const rolling = [];
      for (const item of items) {
        if (isItemHidden(item)) continue;
        rolling.push({
          id: idOf(item),
          number: rolling.length + 1,
          title: item?.tag_en || item?.tag_cn || "",
          url: item?.img_url || item?.image_url || "",
          artistLabel: g.label,
        });
      }
      return { key: g.key, label: g.label, items: rolling };
    });
  }, [groups, draft, isItemHidden, isRollingTab]);

  if (isLoading) return <LoadingLayer isLoading />;
  if (error) {
    return (
      <AlertInfo
        message={txt(T.loadFail, isCn)}
        buttonText={isCn ? "重试" : "Retry"}
        onBack={() => refetchImages?.()}
        isCn={isCn}
      />
    );
  }

  // Human-readable name of the order currently being edited.
  const orderLabel = orderKey
    ? txt(ORDER_KEY_LABELS[orderKey] || { en: orderKey, cn: orderKey }, isCn)
    : "";

  return (
    <div style={{ background: colors.background, color: colors.text, minHeight: "100vh" }}>
      <OrderPageShell
        isCn={isCn}
        fontFamily={fontFamily}
        containerStyle={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px 80px" }}
        title={T.title}
        subtitle={T.subtitle}
        backLabel={T.back}
        onBack={() => history.back()}
        orderLabel={orderLabel}
        orderByLabel={{ en: "Order by", cn: "排序维度" }}
        orderKeys={IMAGE_ORDER_KEYS}
        orderLabels={ORDER_KEY_LABELS}
        orderKey={orderKey}
        onOrderKeyChange={setOrderKey}
        notice={notice}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
        saveLabel={T.save}
        savingLabel={T.saving}
        resetLabel={T.reset}
        switcherExtra={
          hiddenCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily,
                fontSize: 12,
                opacity: 0.6,
              }}
              title={hideLabel ? txt(hideLabel, isCn) : ""}
            >
              <svg width="12" height="12" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <path d="M12 12 L60 60 M60 12 L12 60" stroke="#9a9a9a" strokeWidth="8" strokeLinecap="round" />
              </svg>
              {isCn
                ? `${hiddenCount} 张已从此页隐藏`
                : `${hiddenCount} hidden from this page`}
            </span>
          ) : null
        }
        hint={
          <span style={{ fontFamily, fontSize: 12, opacity: 0.55, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <GripVertical size={14} /> {txt(T.dragHint, isCn)}
          </span>
        }
        right={
          <OrderViewControls
            listMode={listMode}
            onListModeChange={setListMode}
            size={thumbWidth}
            onSizeChange={setThumbWidth}
            min={140}
            max={480}
            step={10}
            sizeSliderWidth={140}
            labels={{
              grid: txt(T.grid, isCn),
              list: txt(T.list, isCn),
              size: txt(T.size, isCn),
            }}
            fontFamily={fontFamily}
          />
        }
      >

        {/* Rolling selection — every image that will roll on an artist page,
            in order, numbered. Only relevant on the Rolling Image Order tab. */}
        {isRollingTab ? (
          <OrderRollingStrip
            groups={rollingOverview}
            isCn={isCn}
            fontFamily={fontFamily}
            labelFontFamily={fontFamily}
            anchorIdFor={(key) => groupAnchorId(key)}
          />
        ) : null}

        {/* Groups (one per artist) */}
        {groups.length === 0 ? (
          <div style={{ fontFamily, fontSize: 14, opacity: 0.6, padding: 40, textAlign: "center" }}>
            {txt(T.empty, isCn)}
          </div>
        ) : (
          groups.map((g) => (
            <ArtistBlock
              key={g.key}
              group={g}
              items={draft[g.key] || g.items}
              anchorId={groupAnchorId(g.key)}
              isRollingTab={isRollingTab}
              isCn={isCn}
              fontFamily={fontFamily}
              listMode={listMode}
              thumbWidth={thumbWidth}
              onReorderSource={onReorder}
              isItemHidden={isItemHidden}
              onToggleItemHidden={onToggleItemHidden}
              isItemHover={isItemHoverImage}
              onToggleItemHover={onToggleItemHover}
              isItemBusy={isItemBusy}
            />
          ))
        )}
      </OrderPageShell>
    </div>
  );
}
