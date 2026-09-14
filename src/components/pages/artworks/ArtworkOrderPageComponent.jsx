"use client";

/**
 * ArtworkOrderPageComponent — manager page for ordering artworks PER PAGE.
 *
 *   /manager/artwork/order
 *
 * One tab per page the artworks appear on (artist page / exhibition page / art
 * fair page). Each tab has its own `order.<key>` position inside the JSON
 * `order` object, so a work can sit at #3 on the artist page and #9 on the
 * exhibition page.
 *
 *   • artworks are grouped by artist (A→Z, "Ungrouped" last)
 *   • drag a card (grid) or a row (list) to re-order inside its group
 *   • the eye icon hides a work from the SELECTED page only — it keeps no
 *     position there, greys out, drops to half size and moves under the dashed
 *     line (the other pages' positions are untouched)
 *   • Save writes every group in one request: POST /api/artwork/reorder
 *     { groups, orderKey, clearIds }
 *
 * Mark handling goes through `utils/mediaMarks` (registry-driven) — never the
 * raw mark object.
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  List,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { LanguageContext } from "@/components/contexts/LanguageContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useFont from "@/hooks/useFont";
import useData from "@/hooks/useData";
import AlertInfo from "@/components/alerts/AlertInfo";
import { filterByLanguage } from "@/utils/filterByLanguage";
import {
  ARTWORK_ORDER_KEYS,
  getArtworkOrder,
  normalizeArtworkOrder,
} from "@/utils/artworkOrder";
import {
  applyMark,
  hideLabelForOrderKey,
  hideTokenForOrderKey,
  isArtworkHiddenForPage,
} from "@/utils/mediaMarks";

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
  retry: { en: "Try again", cn: "重试" },
};

const txt = (v, isCn) => (isCn ? v.cn : v.en);
const idOf = (item) => item?.id || item?._id || "";
const normalizeName = (value) => String(value ?? "").trim();
const keyOf = (name) => normalizeName(name).toLowerCase();

const ORDER_KEY_DEFAULT = ARTWORK_ORDER_KEYS[0]; // artist_page_order

/** Numeric position of a work for the active page (Infinity = none). */
const getOrderValue = (item, orderKey) => {
  const n = Number(getArtworkOrder(item, orderKey));
  return Number.isFinite(n) && n > 0 ? n : Infinity;
};

/** Year, newest first — the tie-breaker for works without a position. */
const getYearValue = (item) => {
  const n = Number(String(item?.year ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Sortable card
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({
  item,
  groupKey,
  orderKey,
  hidden,
  busy,
  listMode,
  thumbWidth,
  onToggleHidden,
  isCn,
  fontFamily,
  labelFontFamily,
}) {
  const id = idOf(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: hidden });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    display: listMode ? "flex" : "block",
    alignItems: listMode ? "center" : undefined,
    gap: listMode ? 12 : undefined,
    border: "1px solid rgba(0,0,0,.12)",
    borderRadius: 10,
    background: "#fff",
    overflow: "hidden",
    width: listMode ? "100%" : `${thumbWidth}px`,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const cover = item?.cover_img_url || item?.image_url || "";

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        style={{
          position: "relative",
          width: listMode ? thumbWidth : "100%",
          aspectRatio: listMode ? "1 / 1" : undefined,
          height: listMode ? thumbWidth : undefined,
          background: "#f4f4f4",
          flexShrink: 0,
          filter: hidden ? "grayscale(1)" : "none",
          opacity: hidden ? 0.5 : 1,
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item?.title || ""}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>

      <div style={{ padding: 10, minWidth: 0, flex: listMode ? 1 : undefined }}>
        <div
          style={{
            fontFamily,
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={item?.title || ""}
        >
          {item?.title || "—"}
        </div>
        <div
          style={{
            fontFamily: labelFontFamily,
            fontSize: 11,
            color: "rgba(0,0,0,.45)",
            marginTop: 2,
          }}
        >
          {[item?.year, item?.medium].filter(Boolean).join(" · ")}
        </div>
      </div>

      <span
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,.14)",
          background: "rgba(255,255,255,.9)",
          color: "rgba(0,0,0,.45)",
        }}
        title={isCn ? "拖动排序" : "Drag to reorder"}
      >
        <GripVertical size={14} />
      </span>

      {/* Eye toggle — hides this work from the SELECTED page only */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden(item);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={busy}
        aria-pressed={hidden}
        title={
          hidden
            ? isCn
              ? `取消隐藏（${hideLabelForOrderKey(orderKey)?.cn || ""}）`
              : `Show on ${hideLabelForOrderKey(orderKey)?.en || ""}`
            : isCn
              ? `从此页隐藏（${hideLabelForOrderKey(orderKey)?.cn || ""}）`
              : `Hide from ${hideLabelForOrderKey(orderKey)?.en || ""}`
        }
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
          border: "1px solid " + (hidden ? "#000" : "rgba(0,0,0,.18)"),
          background: hidden ? "#000" : "rgba(255,255,255,.9)",
          color: hidden ? "#fff" : "#000",
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.4 : hidden ? 1 : 0.55,
        }}
      >
        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hidden strip (dashed line + half-size cards, no order)
// ─────────────────────────────────────────────────────────────────────────────
function HiddenStrip({ items, label, hint, fontFamily, labelFontFamily }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          borderTop: "1px dashed rgba(0,0,0,.35)",
          marginBottom: 10,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span style={{ fontFamily, fontSize: 12.5, fontWeight: 700 }}>{label}</span>
        <span style={{ fontFamily: labelFontFamily, fontSize: 11, color: "rgba(0,0,0,.45)" }}>
          {hint}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {items.map((item) => (
          <div
            key={idOf(item)}
            style={{
              width: 120,
              border: "1px solid rgba(0,0,0,.1)",
              borderRadius: 8,
              overflow: "hidden",
              opacity: 0.55,
              background: "#fff",
            }}
          >
            <div style={{ width: "100%", height: 120, background: "#f4f4f4" }}>
              {item?.cover_img_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.cover_img_url}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "grayscale(1)",
                  }}
                />
              ) : null}
            </div>
            <div
              style={{
                fontFamily,
                fontSize: 11,
                padding: "6px 8px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item?.title || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ArtworkOrderPageComponent() {
  const router = useRouter();
  const { isCn } = useContext(LanguageContext);
  const { colors } = useReverseTheme();
  const { fontFamily, labelFontFamily } = useFont();

  const { data: rawWorks = [], isLoading, error, refetch } = useData("/api/artwork");

  const [orderKey, setOrderKey] = useState(ORDER_KEY_DEFAULT);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(180);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [draft, setDraft] = useState({});        // groupKey → items[]
  const [dirtyKeys, setDirtyKeys] = useState({}); // groupKey → true (needs renumber)
  const [markOverrides, setMarkOverrides] = useState({}); // id → mark (optimistic)
  const [markBusy, setMarkBusy] = useState({});           // id → true

  const hideToken = useMemo(() => hideTokenForOrderKey(orderKey), [orderKey]);

  const markOf = useCallback(
    (item) => (idOf(item) in markOverrides ? markOverrides[idOf(item)] : item?.mark),
    [markOverrides]
  );

  const isItemHidden = useCallback(
    (item) => isArtworkHiddenForPage({ mark: markOf(item) }, orderKey),
    [markOf, orderKey]
  );

  // Language-filtered artworks, then grouped by artist (A→Z, ungrouped last).
  const groups = useMemo(() => {
    const works = filterByLanguage(rawWorks, isCn);

    const buckets = new Map();
    for (const item of works) {
      const artist = normalizeName(item?.artist);
      const key = artist ? keyOf(artist) : "__ungrouped__";
      if (!buckets.has(key)) buckets.set(key, { key, label: artist || txt(T.ungrouped, isCn), items: [] });
      buckets.get(key).items.push(item);
    }

    const list = [...buckets.values()];

    // Inside a group: numbered first (ascending by this page's order), then the
    // rest by year (newest first) so unordered works still read sensibly.
    for (const g of list) {
      g.items = [...g.items].sort((a, b) => {
        const av = getOrderValue(a, orderKey);
        const bv = getOrderValue(b, orderKey);
        if (av !== bv) return av - bv;
        const ay = getYearValue(a);
        const by = getYearValue(b);
        if (ay !== by) return by - ay;
        return String(a?.title || "").localeCompare(String(b?.title || ""));
      });
    }

    list.sort((a, b) => {
      if (a.key === "__ungrouped__") return 1;
      if (b.key === "__ungrouped__") return -1;
      return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
    });

    return list;
  }, [rawWorks, isCn, orderKey]);

  // Reset the draft whenever the groups/order key change.
  useEffect(() => {
    const next = {};
    for (const g of groups) next[g.key] = g.items;
    setDraft(next);
  }, [groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback(
    (groupKey) => (event) => {
      const { active, over } = event || {};
      if (!over || active.id === over.id) return;
      setDraft((prev) => {
        const items = prev[groupKey] || [];
        const visible = items.filter((it) => !isItemHidden(it));
        const from = visible.findIndex((it) => idOf(it) === active.id);
        const to = visible.findIndex((it) => idOf(it) === over.id);
        if (from < 0 || to < 0) return prev;
        const moved = arrayMove(visible, from, to);
        const hidden = items.filter((it) => isItemHidden(it));
        return { ...prev, [groupKey]: [...moved, ...hidden] };
      });
      setDirtyKeys((prev) => ({ ...prev, [groupKey]: true }));
    },
    [isItemHidden]
  );

  // Hide / show a work for the ACTIVE page.
  const onToggleHidden = useCallback(
    async (item) => {
      const id = idOf(item);
      if (!id || !hideToken || markBusy[id]) return;

      const nextHidden = !isItemHidden(item);
      const nextMark = applyMark(markOf(item), hideToken, nextHidden);

      setNotice(null);
      setMarkOverrides((prev) => ({ ...prev, [id]: nextMark }));
      setMarkBusy((prev) => ({ ...prev, [id]: true }));

      try {
        const payload = { mark: nextMark };
        if (nextHidden) {
          // A hidden work keeps no position on this page — clear it now
          // (the other pages' positions are preserved).
          payload.order = { ...normalizeArtworkOrder(item?.order), [orderKey]: "" };
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
        console.log("[artwork order] mark update failed:", err);
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
    [hideToken, isCn, isItemHidden, markBusy, markOf, orderKey]
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setNotice(null);

      // Every group with at least one visible work is (re)written — that way a
      // group holding a single work still gets its position persisted.
      const groupsToSave = [];
      const hiddenSet = new Set();

      for (const g of groups) {
        const items = draft[g.key] || g.items;
        const visible = [];
        for (const it of items) {
          const id = idOf(it);
          if (isItemHidden(it)) {
            if (id) hiddenSet.add(id);
          } else if (id) {
            visible.push(id);
          }
        }
        if (visible.length) groupsToSave.push(visible);
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
    } catch (err) {
      console.log("[artwork order] save failed:", err);
      setNotice({ type: "err", text: txt(T.saveFail, isCn) });
    } finally {
      setSaving(false);
    }
  }, [draft, groups, isCn, isItemHidden, orderKey, refetch]);

  const handleReset = useCallback(() => {
    const next = {};
    for (const g of groups) next[g.key] = g.items;
    setDraft(next);
    setDirtyKeys({});
    setNotice(null);
  }, [groups]);

  const btn = (primary) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 14px",
    fontSize: 12.5,
    fontFamily,
    fontWeight: primary ? 700 : 500,
    color: primary ? "#fff" : "#000",
    background: primary ? "#000" : "#fff",
    border: "1px solid #000",
    borderRadius: 8,
    cursor: saving ? "default" : "pointer",
    opacity: saving ? 0.6 : 1,
  });

  if (isLoading) return <div style={{ background: "#fff", minHeight: "60vh" }} />;

  if (error) {
    return (
      <AlertInfo
        message={txt(T.loadFail, isCn)}
        subMessage=""
        buttonText={txt(T.retry, isCn)}
        onBack={() => refetch?.()}
        isCn={isCn}
      />
    );
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1180,
        margin: "0 auto",
        padding: "22px 20px 80px",
        background: "#fff",
        color: "#000",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: "1px solid rgba(0,0,0,.14)",
        }}
      >
        <button type="button" style={btn(false)} onClick={() => router.push("/manager/artwork")}>
          <ArrowLeft size={14} /> {txt(T.back, isCn)}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ fontFamily, fontSize: 17, fontWeight: 700 }}>{txt(T.title, isCn)}</div>
          <div style={{ fontFamily: labelFontFamily, fontSize: 12, color: "rgba(0,0,0,.55)" }}>
            {txt(T.subtitle, isCn)}
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
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

          <button type="button" style={btn(false)} onClick={handleReset} disabled={saving}>
            <RotateCcw size={14} /> {txt(T.reset, isCn)}
          </button>
          <button type="button" style={btn(true)} onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? txt(T.saving, isCn) : txt(T.save, isCn)}
          </button>
        </div>
      </div>

      {/* ── Per-page order tabs + view controls ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          margin: "16px 0 22px",
        }}
      >
        <span
          style={{
            fontFamily: labelFontFamily,
            fontSize: 11,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,.5)",
          }}
        >
          {txt(T.orderBy, isCn)}
        </span>
        {ARTWORK_ORDER_KEYS.map((key) => {
          const active = key === orderKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOrderKey(key)}
              style={{
                padding: "7px 12px",
                fontSize: 12.5,
                fontFamily,
                fontWeight: active ? 700 : 500,
                color: active ? "#fff" : "#000",
                background: active ? "#000" : "#fff",
                border: "1px solid #000",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {txt(ORDER_LABELS[key], isCn)}
            </button>
          );
        })}

        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              border: "1px solid #000",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setListMode(false)}
              title={txt(T.grid, isCn)}
              style={{
                padding: "7px 10px",
                border: "none",
                background: "#fff",
                color: listMode ? "rgba(0,0,0,.4)" : "#000",
                cursor: "pointer",
              }}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setListMode(true)}
              title={txt(T.list, isCn)}
              style={{
                padding: "7px 10px",
                border: "none",
                borderLeft: "1px solid #000",
                background: "#fff",
                color: listMode ? "#000" : "rgba(0,0,0,.4)",
                cursor: "pointer",
              }}
            >
              <List size={14} />
            </button>
          </span>

          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily, fontSize: 12, opacity: 0.6 }}>{txt(T.size, isCn)}</span>
            <input
              type="range"
              min={120}
              max={320}
              step={10}
              value={thumbWidth}
              onChange={(e) => setThumbWidth(Number(e.target.value))}
              style={{ width: 120, accentColor: "#000", cursor: "pointer" }}
            />
          </span>
        </span>
      </div>

      {total === 0 ? (
        <div
          style={{
            padding: "60px 0",
            textAlign: "center",
            fontFamily,
            fontSize: 13,
            color: "rgba(0,0,0,.5)",
          }}
        >
          {txt(T.empty, isCn)}
        </div>
      ) : (
        groups.map((g) => {
          const items = draft[g.key] || g.items;
          const visible = items.filter((it) => !isItemHidden(it));
          const hiddenItems = items.filter((it) => isItemHidden(it));

          return (
            <section key={g.key} style={{ marginBottom: 34 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h2 style={{ fontFamily, fontSize: 14, fontWeight: 700, margin: 0 }}>{g.label}</h2>
                <span style={{ fontFamily: labelFontFamily, fontSize: 11.5, color: "rgba(0,0,0,.5)" }}>
                  {visible.length}
                  {hiddenItems.length ? ` + ${hiddenItems.length} ${txt(T.hidden, isCn)}` : ""}
                </span>
                <span style={{ fontFamily: labelFontFamily, fontSize: 11, color: "rgba(0,0,0,.35)" }}>
                  {txt(T.dragHint, isCn)}
                </span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd(g.key)}
              >
                <SortableContext
                  items={visible.map((it) => idOf(it))}
                  strategy={rectSortingStrategy}
                >
                  <div
                    style={
                      listMode
                        ? { display: "flex", flexDirection: "column", gap: 10 }
                        : {
                            display: "grid",
                            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))`,
                            gap: 14,
                          }
                    }
                  >
                    {visible.map((item) => (
                      <OrderCard
                        key={idOf(item)}
                        item={item}
                        groupKey={g.key}
                        orderKey={orderKey}
                        hidden={false}
                        busy={!!markBusy[idOf(item)]}
                        listMode={listMode}
                        thumbWidth={thumbWidth}
                        onToggleHidden={onToggleHidden}
                        isCn={isCn}
                        fontFamily={fontFamily}
                        labelFontFamily={labelFontFamily}
                      />
                    ))}
                  </div>
                </SortableContext>

                <HiddenStrip
                  items={hiddenItems}
                  label={txt(T.hiddenTitle, isCn)}
                  hint={txt(T.hiddenHint, isCn)}
                  fontFamily={fontFamily}
                  labelFontFamily={labelFontFamily}
                />
              </DndContext>
            </section>
          );
        })
      )}

      {notice && (
        <div style={{ marginTop: 8, fontFamily, fontSize: 11, color: "rgba(0,0,0,.4)" }}>
          {txt({ en: "Hidden works keep their position on the other pages.", cn: "隐藏的作品在其他页面仍保留排序。" }, isCn)}
        </div>
      )}
    </div>
  );
}
