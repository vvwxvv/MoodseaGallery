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
import {
  GripVertical,
  Save,
  RotateCcw,
  ArrowLeft,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
} from "lucide-react";

import { LanguageContext } from "@/components/contexts/LanguageContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useFont from "@/hooks/useFont";
import useData from "@/hooks/useData";
import { filterByLanguage } from "@/utils/filterByLanguage";
import { normalizeName } from "@/components/pages/artists/hooks/useArtistDetailData";
import {
  getArtworkOrder,
  ARTWORK_ORDER_KEYS,
  normalizeArtworkOrder,
} from "@/utils/artworkOrder";
import {
  isArtworkHiddenForPage,
  hideTokenForOrderKey,
  hideLabelForOrderKey,
  withMarkHide,
} from "@/utils/mediaMarks";
import LoadingLayer from "@/components/animations/LoadingLayer";
import AlertInfo from "@/components/alerts/AlertInfo";

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const ORDER_LABELS = {
  artist_page_order: { en: "Artist Page Order", cn: "艺术家页排序" },
  exhibition_page_order: { en: "Exhibition Page Order", cn: "展览页排序" },
  art_fair_page_order: { en: "Art Fair Page Order", cn: "艺博会页排序" },
};

const T = {
  title: { en: "Order artworks", cn: "作品排序" },
  subtitle: {
    en: "Drag the cards to arrange the order for the selected page. Use the eye to hide a work from that page — hidden works grey out, drop to the bottom, half size, under the dashed line.",
    cn: "拖动卡片调整所选页面的顺序。点击眼睛图标可将作品从该页隐藏——隐藏后卡片变灰并缩到一半，统一放到虚线下方。",
  },
  dragHint: { en: "Drag cards to reorder", cn: "拖动卡片排序" },
  orderBy: { en: "Order by", cn: "排序维度" },
  save: { en: "Save order", cn: "保存排序" },
  saving: { en: "Saving…", cn: "保存中…" },
  reset: { en: "Reset", cn: "重置" },
  back: { en: "Back", cn: "返回" },
  grid: { en: "Grid", cn: "网格" },
  list: { en: "List", cn: "列表" },
  size: { en: "Size", cn: "大小" },
  savedOk: { en: "Order saved", cn: "排序已保存" },
  saveFail: { en: "Failed to save order", cn: "保存排序失败" },
  markHideOk: { en: "Hidden · order cleared", cn: "已隐藏 · 已清除排序" },
  markShowOk: { en: "Shown on this page", cn: "已恢复显示" },
  markFail: { en: "Failed to save mark", cn: "标记保存失败" },
  empty: { en: "No artworks", cn: "暂无作品" },
  loadFail: { en: "Loading failed", cn: "加载失败" },
  ungrouped: { en: "Ungrouped", cn: "未分组" },
  hiddenTitle: { en: "Hidden From This Page", cn: "不在此页显示" },
  hiddenHint: {
    en: "Hidden works have no position — they are kept here, half size, under the dashed line.",
    cn: "隐藏的作品不参与排序，统一放在虚线下方，尺寸缩小一半。",
  },
  hidden: { en: "hidden", cn: "隐藏" },
  noOrder: { en: "Hidden · no order", cn: "已隐藏 · 无排序" },
  showOnPage: { en: "Show on this page", cn: "在此页显示" },
  hideFromPage: { en: "Hide from this page", cn: "从此页隐藏" },
};

const txt = (entry, isCn) => (isCn ? entry.cn : entry.en);

const idOf = (item) => item?.id || item?._id;

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
//  Card (image + artist + title + work info — no edit/delete)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({
  item,
  orderNumber,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  hidden,
  hideLabel,
  onToggleHide,
  busy,
}) {
  const info = [
    item?.type,
    item?.medium,
    item?.year,
    item?.size,
    item?.series,
  ].filter(Boolean);

  const img = item?.cover_img_url;
  const hideHint = hideLabel ? txt(hideLabel, isCn) : txt(T.hideFromPage, isCn);

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
        // Greyed out when the artwork is marked to be hidden from this page.
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
          background: "#f2f2f2",
          aspectRatio: listMode ? undefined : "4 / 3",
          height: listMode ? `${Math.round(thumbWidth * 0.75)}px` : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {img ? (
          <img
            src={img}
            alt={item?.title || ""}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <span style={{ fontSize: 11, opacity: 0.4 }}>{isCn ? "无图" : "No image"}</span>
        )}
      </div>

      <div style={{ padding: "10px 12px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
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
            {item?.title || (isCn ? "无标题" : "Untitled")}
          </span>
          <GripVertical size={14} style={{ flex: "0 0 auto", opacity: 0.35 }} />
        </div>
        {/* Artist name + order number — same row, number at the right edge */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 2,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: 12,
              opacity: 0.7,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item?.artist || "—"}
          </div>
          <span
            style={{
              flex: "0 0 auto",
              fontFamily,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1,
              color: "#000",
              // Hidden works carry no position in this page's order.
              opacity: orderNumber ? 1 : 0.3,
            }}
            title={orderNumber ? undefined : txt(T.noOrder, isCn)}
          >
            {orderNumber || "—"}
          </span>
        </div>
        {info.length > 0 && (
          <div style={{ fontFamily, fontSize: 11, opacity: 0.5, marginTop: 4 }}>
            {info.join(" · ")}
          </div>
        )}
      </div>

      {/* Hide / show toggle for the selected page — sets `mark` immediately */}
      <button
        type="button"
        className="ordhide"
        onClick={(event) => {
          event.stopPropagation();
          onToggleHide?.();
        }}
        disabled={busy}
        title={hidden ? txt(T.showOnPage, isCn) : hideHint}
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

      {/* Hidden overlay: one big light grey X across the card */}
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
//  Hidden strip — every hidden artwork of this group, together at the bottom,
//  half size, above a dashed separator. Not sortable (no position).
// ─────────────────────────────────────────────────────────────────────────────
function HiddenStrip({
  items,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  hideLabel,
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
            hideLabel={hideLabel}
            onToggleHide={() => onToggleItemHidden?.(item)}
            busy={isItemBusy ? isItemBusy(item) : false}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Group (header + sortable grid/list + hidden strip)
// ─────────────────────────────────────────────────────────────────────────────
function GroupBlock({
  group,
  items,
  isCn,
  fontFamily,
  listMode,
  thumbWidth,
  hideLabel,
  onReorder,
  isItemHidden,
  onToggleItemHidden,
  isItemBusy,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleItems = useMemo(
    () => items.filter((it) => !isItemHidden(it)),
    [items, isItemHidden]
  );
  const hiddenItems = useMemo(
    () => items.filter((it) => isItemHidden(it)),
    [items, isItemHidden]
  );

  // Number the visible works 1..N (hidden works carry no position).
  const numbers = useMemo(() => {
    const map = new Map();
    visibleItems.forEach((it, idx) => map.set(idOf(it), idx + 1));
    return map;
  }, [visibleItems]);

  const ids = visibleItems.map(idOf);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(visibleItems, oldIndex, newIndex));
  };

  const gridStyle = listMode
    ? { display: "flex", flexDirection: "column", gap: 10 }
    : {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))`,
        gap: 12,
      };

  return (
    <div
      style={{
        border: "1px solid #000",
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #000",
          fontFamily,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{group}</span>
        <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap" }}>
          {visibleItems.length}
          {hiddenItems.length > 0
            ? ` + ${hiddenItems.length} ${txt(T.hidden, isCn)}`
            : ""}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div style={gridStyle}>
              {visibleItems.map((item) => (
                <SortableItem key={idOf(item)} id={idOf(item)}>
                  <OrderCard
                    item={item}
                    orderNumber={numbers.get(idOf(item)) ?? null}
                    isCn={isCn}
                    fontFamily={fontFamily}
                    listMode={listMode}
                    thumbWidth={thumbWidth}
                    hidden={false}
                    hideLabel={hideLabel}
                    onToggleHide={() => onToggleItemHidden?.(item)}
                    busy={isItemBusy ? isItemBusy(item) : false}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <HiddenStrip
          items={hiddenItems}
          isCn={isCn}
          fontFamily={fontFamily}
          listMode={listMode}
          thumbWidth={thumbWidth}
          hideLabel={hideLabel}
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
export default function ArtworkOrderPageComponent() {
  const { isCn } = useContext(LanguageContext);
  const { colors } = useReverseTheme();
  const { fontFamily } = useFont();

  const { data: raw = [], isLoading, error, refetch } = useData("/api/artwork");

  const [orderKey, setOrderKey] = useState("artist_page_order");
  const [draft, setDraft] = useState({}); // groupLabel -> ordered items
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(240);

  // Per-card hide/show state. Optimistic overrides: id → mark value, applied
  // instantly on toggle and persisted with a PUT to /api/artwork.
  const [markOverrides, setMarkOverrides] = useState({});
  const [markBusy, setMarkBusy] = useState({});
  // Groups touched by a hide/show toggle → re-number them on Save.
  const [dirtyKeys, setDirtyKeys] = useState({});

  const items = useMemo(() => {
    const filtered = filterByLanguage(Array.isArray(raw) ? raw : [], isCn);
    return filtered.map((it) => ({ ...it, id: it.id || it._id, _id: it._id || it.id }));
  }, [raw, isCn]);

  // The hide token / label that belongs to the page currently being ordered.
  const hideToken = useMemo(() => hideTokenForOrderKey(orderKey), [orderKey]);
  const hideLabel = useMemo(() => hideLabelForOrderKey(orderKey), [orderKey]);

  const markOf = useCallback(
    (item) => {
      const id = idOf(item);
      if (id && Object.prototype.hasOwnProperty.call(markOverrides, id)) {
        return markOverrides[id];
      }
      return item?.mark;
    },
    [markOverrides]
  );

  const isItemHidden = useCallback(
    (item) => isArtworkHiddenForPage({ mark: markOf(item) }, orderKey),
    [markOf, orderKey]
  );

  const isItemBusy = useCallback(
    (item) => {
      const id = idOf(item);
      return Boolean(id && markBusy[id]);
    },
    [markBusy]
  );

  // Build groups (by artist), each ordered by the active order key.
  // NOTE: intentionally does NOT depend on markOverrides / isItemHidden, so a
  // hide/show toggle never reshuffles the groups mid-session (draft would be
  // reset). Hidden rows are separated out at render time by GroupBlock.
  const groups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.artist || "").trim() || txt(T.ungrouped, isCn);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const out = [...map.entries()].map(([label, arr]) => ({
      label,
      items: [...arr].sort((a, b) => {
        const av = Number(getArtworkOrder(a, orderKey)) || Infinity;
        const bv = Number(getArtworkOrder(b, orderKey)) || Infinity;
        if (av !== bv) return av - bv;
        return String(a.title || "").localeCompare(String(b.title || ""));
      }),
    }));
    // Artist boxes are ordered A→Z by artist name (pinyin-aware for CN);
    // the "Ungrouped" bucket always sinks to the bottom.
    const ungroupedLabel = txt(T.ungrouped, isCn);
    out.sort((a, b) => {
      const aU = a.label === ungroupedLabel;
      const bU = b.label === ungroupedLabel;
      if (aU !== bU) return aU ? 1 : -1;
      return a.label.localeCompare(b.label, isCn ? "zh-Hans-CN" : undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
    return out;
  }, [items, orderKey, isCn]);

  // Reset the draft whenever groups/order key change.
  useEffect(() => {
    const next = {};
    for (const g of groups) next[g.label] = g.items;
    setDraft(next);
  }, [groups]);

  // Drag inside a group → splice the visible cards back into the group's
  // running order, leaving hidden rows where they are.
  const onReorder = useCallback(
    (groupLabel, nextVisibleItems) => {
      setDraft((prev) => {
        const list = prev[groupLabel] || [];
        let cursor = 0;
        const next = list.map((item) => {
          if (isItemHidden(item)) return item;
          return nextVisibleItems[cursor++] || item;
        });
        return { ...prev, [groupLabel]: next };
      });
    },
    [isItemHidden]
  );

  const onToggleItemHidden = useCallback(
    async (item) => {
      const id = idOf(item);
      if (!id || !hideToken) return;

      const nextHidden = !isItemHidden(item);
      // Hide flags live inside the JSON mark, so other pages' hides survive.
      const nextMark = withMarkHide(markOf(item), hideToken, nextHidden);

      // Remember that this group needs re-numbering on the next save (both for
      // hide — which clears the position — and show — which adds it back).
      const groupLabel = (item.artist || "").trim() || txt(T.ungrouped, isCn);
      setDirtyKeys((prev) => ({ ...prev, [groupLabel]: true }));

      // Optimistic — the card greys out (or clears) immediately.
      setMarkOverrides((prev) => ({ ...prev, [id]: nextMark }));
      setMarkBusy((prev) => ({ ...prev, [id]: true }));

      try {
        const payload = { mark: nextMark };
        if (nextHidden) {
          // A hidden work keeps NO position on this page — clear it right away
          // (the other page orders are preserved).
          payload.order = {
            ...normalizeArtworkOrder(item?.order),
            [orderKey]: "",
          };
        }

        const res = await fetch(`/api/artwork?id=${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setNotice({
          type: "ok",
          text: nextHidden ? txt(T.markHideOk, isCn) : txt(T.markShowOk, isCn),
        });
      } catch (err) {
        console.error("[artwork order] mark update failed:", err);
        setMarkOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setNotice({ type: "err", text: txt(T.markFail, isCn) });
      } finally {
        setMarkBusy((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [isItemHidden, hideToken, orderKey, isCn]
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setNotice(null);

      // Only send groups whose visible order actually changed (single request).
      // Hidden works are excluded from the numbering and have this page's order
      // cleared, so "hidden" rows never carry a position.
      const groupsToSave = [];
      const hiddenSet = new Set();
      for (const g of groups) {
        const groupItems = draft[g.label] || g.items;
        const visible = [];
        let hasHidden = false;
        for (const it of groupItems) {
          const id = idOf(it);
          if (isItemHidden(it)) {
            hasHidden = true;
            if (id) hiddenSet.add(id);
          } else if (id) {
            visible.push(id);
          }
        }

        const originalVisible = (g.items || [])
          .filter((it) => !isItemHidden(it))
          .map((it) => idOf(it));

        if (
          visible.length &&
          (hasHidden ||
            dirtyKeys[g.label] ||
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

      const res = await fetch("/api/artwork/reorder", {
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
      refetch?.();
    } catch (e) {
      console.error(e);
      setNotice({ type: "err", text: txt(T.saveFail, isCn) });
    } finally {
      setSaving(false);
    }
  }, [groups, draft, dirtyKeys, isItemHidden, orderKey, refetch, isCn]);

  const handleReset = useCallback(() => {
    const next = {};
    for (const g of groups) next[g.label] = g.items;
    setDraft(next);
    setNotice(null);
  }, [groups]);

  const hiddenCount = useMemo(() => {
    const ids = new Set();
    for (const g of groups) {
      for (const item of draft[g.label] || g.items) {
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
        onBack={() => refetch?.()}
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
      {/* Toolbar button hover: underline the label (monochrome, no black fill) */}
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
          {/* Order dimension + save together */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{txt(T.orderBy, isCn)}:</span>
            <select
              value={orderKey}
              onChange={(e) => setOrderKey(e.target.value)}
              style={{
                fontFamily,
                fontSize: 13,
                padding: "8px 10px",
                border: "1px solid #000",
                borderRadius: 8,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
              }}
            >
              {ARTWORK_ORDER_KEYS.map((k) => (
                <option key={k} value={k}>
                  {txt(ORDER_LABELS[k] || { en: k, cn: k }, isCn)}
                </option>
              ))}
            </select>
          </span>

          {/* Legend: works marked to be hidden from the selected page */}
          {hiddenCount > 0 && hideLabel && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily,
                fontSize: 12,
                opacity: 0.6,
              }}
              title={txt(hideLabel, isCn)}
            >
              <svg width="12" height="12" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <path
                  d="M12 12 L60 60 M60 12 L12 60"
                  stroke="#9a9a9a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              {isCn
                ? `${hiddenCount} 个作品不在此页显示`
                : `${hiddenCount} hidden from this page`}
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

        {/* Groups */}
        {groups.length === 0 ? (
          <div style={{ fontFamily, fontSize: 14, opacity: 0.6, padding: 40, textAlign: "center" }}>
            {txt(T.empty, isCn)}
          </div>
        ) : (
          groups.map((g) => (
            <GroupBlock
              key={g.label}
              group={g.label}
              items={draft[g.label] || g.items}
              isCn={isCn}
              fontFamily={fontFamily}
              listMode={listMode}
              thumbWidth={thumbWidth}
              hideLabel={hideLabel}
              onReorder={(next) => onReorder(g.label, next)}
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
