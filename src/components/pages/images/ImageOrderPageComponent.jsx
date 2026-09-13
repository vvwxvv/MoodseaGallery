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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, RotateCcw, ArrowLeft, LayoutGrid, List, Eye, EyeOff } from "lucide-react";

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
  IMAGE_MARK_HIDE_ARTIST_ROLLING,
  IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL,
} from "@/utils/mediaMarks";
import { normalizeImageOrder, getOrder } from "@/utils/mediaOrder";
import { ARTIST_ROLLING_ORDER_KEY } from "@/components/pages/artists/hooks/useArtistRollingImages";
import LoadingLayer from "@/components/animations/LoadingLayer";
import AlertInfo from "@/components/alerts/AlertInfo";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// Only the rolling-image order is edited here; ordering happens *within* each
// artist group (the groups themselves are ordered by artist name).
const ORDER_KEY = "rolling_img_order";

// Sub-group id for one source inside an artist box: artist\u001fkind\u001ftitle
const SOURCE_UNGROUPED = "__ungrouped__";

const idOf = (item) => item?.id || item?._id;

const T = {
  title: { en: "Order Rolling Images", cn: "轮播图排序" },
  subtitle: {
    en: "Images are grouped by artist — exhibitions, fairs and works sit in their own box inside the artist. Drag to arrange each box; hidden images drop to the bottom, half size, under the dashed line.",
    cn: "图片按艺术家分组，展览 / 艺博会 / 作品各自一个小盒。拖动排序；隐藏的图片会缩到一半并统一放在虚线下方。",
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
//  Sortable item wrapper
// ─────────────────────────────────────────────────────────────────────────────
function SortableItem({ id, children, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : "auto",
        position: "relative",
        cursor: disabled ? "default" : "grab",
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Card (image + tag_en / tag_cn + type — no edit/delete)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({
  item,
  index,
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
    <div
      style={{
        border: "1px solid #000",
        borderRadius: "10px",
        background: "#fff",
        color: "#000",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: listMode ? "row" : "column",
        position: "relative",
        // Greyed out when the image is marked to be hidden from the artist
        // page rolling section.
        filter: hidden ? "grayscale(1)" : undefined,
        opacity: hidden ? 0.55 : 1,
        transition: "filter .15s ease, opacity .15s ease",
      }}
      title={hidden ? hideHint : undefined}
    >
      <div
        style={{
          width: listMode ? `${thumbWidth}px` : "100%",
          flex: listMode ? "0 0 auto" : undefined,
          aspectRatio: listMode ? undefined : "4 / 3",
          height: listMode ? `${Math.round(thumbWidth * 0.75)}px` : undefined,
          background: "#f2f2f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {img ? (
          <img
            src={img}
            alt={item?.tag_en || ""}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span style={{ fontSize: 11, opacity: 0.4 }}>{isCn ? "无图" : "No image"}</span>
        )}
      </div>

      <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
        {/* tag_en + order number — same row, number at the right edge */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily,
              fontWeight: 600,
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {item?.tag_en || (isCn ? "无标题" : "Untitled")}
          </span>
          <span
            style={{
              flex: "0 0 auto",
              fontFamily,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1,
              color: "#000",
              // Hidden images carry no position in the rolling order.
              opacity: orderNumber ? 1 : 0.3,
            }}
            title={
              orderNumber ? undefined : isCn ? "已隐藏 · 无排序" : "Hidden · no order"
            }
          >
            {orderNumber || "—"}
          </span>
        </div>

        <div
          style={{
            fontFamily,
            fontSize: 12,
            opacity: 0.7,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item?.tag_cn || "—"}
        </div>
        {meta.length > 0 && (
          <div style={{ fontFamily, fontSize: 11, opacity: 0.5, marginTop: 4 }}>
            {meta.join(" · ")}
          </div>
        )}
      </div>

      {/* Hide / show toggle — sets `mark` immediately */}
      <button
        type="button"
        className="ordhide"
        onClick={(event) => {
          event.stopPropagation();
          onToggleHide?.();
        }}
        disabled={busy}
        title={hidden ? (isCn ? "取消隐藏" : "Show in artist page rolling") : hideHint}
        aria-pressed={hidden}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          zIndex: 3,
          width: 26,
          height: 26,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          borderRadius: 7,
          border: "1px solid " + (hidden ? "#9a9a9a" : "rgba(0,0,0,.18)"),
          background: hidden ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.9)",
          color: "#000",
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.4 : hidden ? 1 : 0.55,
          filter: "none",
        }}
      >
        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>

      {/* Hidden-from-artist-rolling overlay: one big light grey X across the card */}
      {hidden && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "rgba(255,255,255,0.25)",
            zIndex: 2,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <path
              d="M3 3 L97 97 M97 3 L3 97"
              stroke="#c9c9c9"
              strokeWidth="1.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
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

  const gridStyle = listMode
    ? { display: "flex", flexDirection: "column", gap: 10 }
    : {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))`,
        gap: 12,
      };

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
          <div style={gridStyle}>
            {items.map((item) => (
              <SortableItem key={idOf(item)} id={idOf(item)}>
                <OrderCard {...cardProps(item)} />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hidden strip — every hidden image of this artist, together at the bottom,
//  half size, above a dashed separator. Not sortable (no position).
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

  const smallWidth = Math.max(70, Math.round(thumbWidth / 2));

  const gridStyle = listMode
    ? { display: "flex", flexDirection: "column", gap: 8 }
    : {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${smallWidth}px, 1fr))`,
        gap: 10,
      };

  return (
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          borderTop: "1px dashed rgba(0,0,0,.3)",
          paddingTop: 12,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily,
        }}
      >
        <span
          style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".02em", opacity: 0.75 }}
          title={txt(T.hiddenHint, isCn)}
        >
          {txt(T.hiddenTitle, isCn)}
        </span>
        <span style={{ fontSize: 12, opacity: 0.55 }}>{items.length}</span>
      </div>

      <div style={gridStyle}>
        {items.map((item) => (
          <OrderCard
            key={idOf(item)}
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
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Artist box — the big accordion: header + one sub-box per source
//  (Works / Exhibition: … / Art Fair: …) + the hidden strip at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
function ArtistBlock({
  group,
  items,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  onReorderSource,
  isItemHidden,
  onToggleItemHidden,
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
    <div
      style={{
        border: "1px solid rgba(0,0,0,.16)",
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "13px 18px",
          background: "rgba(0,0,0,.02)",
          borderBottom: "1px solid rgba(0,0,0,.08)",
          fontFamily,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: ".01em" }}>
          {group.label}
        </span>
        <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap" }}>
          {visibleCount}
          {hiddenItems.length > 0
            ? ` + ${hiddenItems.length} ${isCn ? "隐藏" : "hidden"}`
            : ""}
        </span>
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
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
          isItemBusy={isItemBusy}
        />
      </div>
    </div>
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

  const isLoading = l1 || l2;
  const error = e1 || e2;

  const [draft, setDraft] = useState({}); // group key -> ordered items
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(240);

  const images = useMemo(() => {
    const arr = Array.isArray(rawImages) ? rawImages : [];
    return arr.map((it) => ({ ...it, id: it.id || it._id, _id: it._id || it.id }));
  }, [rawImages]);

  const artworks = useMemo(() => (Array.isArray(rawArtworks) ? rawArtworks : []), [rawArtworks]);

  // ── Structure: artist box → source sub-boxes (Works / Exhibition / Fair) ──
  // Same rule as the manager page: a tag is resolved against Artwork +
  // Exhibition + Fair + Event + Bibliography + About, so exhibition images sit
  // under their artist instead of "Ungrouped".
  const sourceIndex = useMemo(
    () => buildImageSourceIndex({ artworks, images }),
    [artworks, images]
  );

  const groups = useMemo(() => {
    const orderValue = (item) => {
      const value = Number(getOrder(item, ORDER_KEY));
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
  }, [images, sourceIndex, isCn]);

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
    (item) => isHiddenInArtistRollingImage({ mark: markOf(item) }),
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
      const nextMark = nextHidden ? IMAGE_MARK_HIDE_ARTIST_ROLLING : "";

      // Optimistic — the card greys out (or clears) immediately.
      setMarkOverrides((prev) => ({ ...prev, [id]: nextMark }));
      setMarkBusy((prev) => ({ ...prev, [id]: true }));

      try {
        const payload = { mark: nextMark };
        if (nextHidden) {
          // A hidden image keeps NO rolling position — clear it right away
          // (other order keys, e.g. a legacy artist_page_order, are kept).
          payload.order = {
            ...normalizeImageOrder(item?.order),
            [ARTIST_ROLLING_ORDER_KEY]: "",
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
        console.error("[image order] mark update failed:", err);
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
        let hasHidden = false;
        for (const it of items) {
          const id = it.id || it._id;
          if (isItemHidden(it)) {
            hasHidden = true;
            if (id) hiddenSet.add(id);
          } else if (id) {
            visible.push(id);
          }
        }

        const originalVisible = (g.items || [])
          .filter((it) => !isItemHidden(it))
          .map((it) => it.id || it._id);

        if (
          visible.length &&
          (hasHidden ||
            dirtyKeys[g.key] ||
            visible.join(",") !== originalVisible.join(","))
        ) {
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
          orderKey: ORDER_KEY,
          clearIds: hiddenIds,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setDirtyKeys({});
      setNotice({ type: "ok", text: txt(T.savedOk, isCn) });
      refetchImages?.();
    } catch (e) {
      console.error(e);
      setNotice({ type: "err", text: txt(T.saveFail, isCn) });
    } finally {
      setSaving(false);
    }
  }, [groups, draft, dirtyKeys, isItemHidden, refetchImages, isCn]);

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

  const btn = (primary) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontFamily,
    fontWeight: primary ? 600 : 500,
    border: "1px solid #000",
    borderRadius: 8,
    background: "#fff",
    color: "#000",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ background: colors.background, color: colors.text, minHeight: "100vh" }}>
      <style>{`
        .ordbtn { transition: opacity 0.15s ease; }
        .ordbtn:hover:not(:disabled) { text-decoration: underline; text-underline-offset: 2px; }
        .ordbtn:disabled { opacity: 0.5; cursor: default; }
        .ordhide { transition: opacity 0.15s ease, background 0.15s ease; }
        .ordhide:hover:not(:disabled) { opacity: 1 !important; background: rgba(0,0,0,.04); }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button type="button" className="ordbtn" style={btn(false)} onClick={() => history.back()}>
            <ArrowLeft size={14} /> {txt(T.back, isCn)}
          </button>
          <h1 style={{ fontFamily, fontSize: 22, fontWeight: 700, margin: 0 }}>
            {txt(T.title, isCn)}
          </h1>
        </div>
        <p style={{ fontFamily, fontSize: 13, opacity: 0.6, margin: "6px 0 16px" }}>
          {txt(T.subtitle, isCn)}
        </p>

        {/* Toolbar */}
        <div
          style={{
            position: "sticky",
            top: 70,
            zIndex: 40,
            background: colors.background,
            borderTop: "1px solid #000",
            borderBottom: "1px solid #000",
            padding: "12px 0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <span style={{ fontFamily, fontSize: 13, fontWeight: 500, opacity: 0.75 }}>
            {isCn ? "排序维度" : "Order by"}: {isCn ? "轮播图排序" : "Rolling Image Order"}
          </span>

          {/* Legend: images marked to be hidden from the artist page rolling set */}
          {hiddenCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily,
                fontSize: 12,
                opacity: 0.6,
              }}
              title={
                isCn
                  ? IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL.cn
                  : IMAGE_MARK_HIDE_ARTIST_ROLLING_LABEL.en
              }
            >
              <svg width="12" height="12" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <path d="M12 12 L60 60 M60 12 L12 60" stroke="#9a9a9a" strokeWidth="8" strokeLinecap="round" />
              </svg>
              {isCn
                ? `${hiddenCount} 张不在艺术家页轮播中显示`
                : `${hiddenCount} hidden from artist page rolling`}
            </span>
          )}

          <button type="button" className="ordbtn" style={btn(true)} onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? txt(T.saving, isCn) : txt(T.save, isCn)}
          </button>

          <button type="button" className="ordbtn" style={btn(false)} onClick={handleReset} disabled={saving}>
            <RotateCcw size={14} /> {txt(T.reset, isCn)}
          </button>

          <span style={{ fontFamily, fontSize: 12, opacity: 0.55, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <GripVertical size={14} /> {txt(T.dragHint, isCn)}
          </span>

          {notice && (
            <span
              style={{
                fontFamily,
                fontSize: 12,
                color: notice.type === "ok" ? "#0a7d32" : "#c0392b",
              }}
            >
              {notice.text}
            </span>
          )}

          {/* Right side: view mode + size slider */}
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-flex", border: "1px solid #000", borderRadius: 8, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setListMode(false)}
                title={txt(T.grid, isCn)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontFamily,
                  border: "none",
                  borderBottom: listMode ? "2px solid transparent" : "2px solid #000",
                  cursor: "pointer",
                  background: "#fff",
                  color: listMode ? "rgba(0,0,0,0.4)" : "#000",
                }}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setListMode(true)}
                title={txt(T.list, isCn)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontFamily,
                  border: "none",
                  borderLeft: "1px solid #000",
                  borderBottom: listMode ? "2px solid #000" : "2px solid transparent",
                  cursor: "pointer",
                  background: "#fff",
                  color: listMode ? "#000" : "rgba(0,0,0,0.4)",
                }}
              >
                <List size={14} />
              </button>
            </span>

            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily }}>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{txt(T.size, isCn)}</span>
              <input
                type="range"
                min={140}
                max={480}
                step={10}
                value={thumbWidth}
                onChange={(e) => setThumbWidth(Number(e.target.value))}
                style={{ width: 140, accentColor: "#000", cursor: "pointer" }}
              />
            </span>
          </span>
        </div>

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
              isCn={isCn}
              fontFamily={fontFamily}
              listMode={listMode}
              thumbWidth={thumbWidth}
              onReorderSource={onReorder}
              isItemHidden={isItemHidden}
              onToggleItemHidden={onToggleItemHidden}
              isItemBusy={isItemBusy}
            />
          ))
        )}
      </div>
    </div>
  );
}
