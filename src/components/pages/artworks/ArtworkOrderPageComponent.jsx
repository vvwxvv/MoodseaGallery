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
import { GripVertical, Save, RotateCcw, ArrowLeft, LayoutGrid, List } from "lucide-react";

import { LanguageContext } from "@/components/contexts/LanguageContext";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useFont from "@/hooks/useFont";
import useData from "@/hooks/useData";
import { filterByLanguage } from "@/utils/filterByLanguage";
import { normalizeName } from "@/components/pages/artists/hooks/useArtistDetailData";
import { getArtworkOrder, ARTWORK_ORDER_KEYS } from "@/utils/artworkOrder";
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
    en: "Drag the cards to arrange the order, then save.",
    cn: "拖动卡片调整顺序，完成后点击保存。",
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
  empty: { en: "No artworks", cn: "暂无作品" },
  loadFail: { en: "Loading failed", cn: "加载失败" },
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
//  Card (image + artist + title + work info — no edit/delete)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ item, index, isCn, fontFamily, listMode, thumbWidth }) {
  const info = [
    item?.type,
    item?.medium,
    item?.year,
    item?.size,
    item?.series,
  ].filter(Boolean);

  const img = item?.cover_img_url;

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
      }}
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
            }}
          >
            {index + 1}
          </span>
        </div>
        {info.length > 0 && (
          <div style={{ fontFamily, fontSize: 11, opacity: 0.5, marginTop: 4 }}>
            {info.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Group (header + sortable grid/list)
// ─────────────────────────────────────────────────────────────────────────────
function GroupBlock({ group, items, isCn, fontFamily, listMode, thumbWidth, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map((it) => it.id || it._id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
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
        <span style={{ fontSize: 12, opacity: 0.6 }}>{items.length}</span>
      </div>

      <div style={{ padding: 16 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div
              style={
                listMode
                  ? { display: "flex", flexDirection: "column", gap: 10 }
                  : {
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))`,
                      gap: 12,
                    }
              }
            >
              {items.map((item, idx) => (
                <SortableItem key={item.id || item._id || idx} id={item.id || item._id}>
                  <OrderCard
                    item={item}
                    index={idx}
                    isCn={isCn}
                    fontFamily={fontFamily}
                    listMode={listMode}
                    thumbWidth={thumbWidth}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
  const [draft, setDraft] = useState({}); // groupKey -> ordered items
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(240);

  const items = useMemo(() => {
    const filtered = filterByLanguage(Array.isArray(raw) ? raw : [], isCn);
    return filtered.map((it) => ({ ...it, id: it.id || it._id, _id: it._id || it.id }));
  }, [raw, isCn]);

  // Build groups (by artist), each ordered by the active order key.
  const groups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.artist || "").trim() || (isCn ? "未分组" : "Ungrouped");
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
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [items, orderKey, isCn]);

  // Reset the draft whenever groups/order key change.
  useEffect(() => {
    const next = {};
    for (const g of groups) next[g.label] = g.items;
    setDraft(next);
  }, [groups]);

  const onReorder = useCallback((groupLabel, nextItems) => {
    setDraft((prev) => ({ ...prev, [groupLabel]: nextItems }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setNotice(null);

      // Only send groups whose order actually changed (single request).
      const changed = [];
      for (const g of groups) {
        const current = (draft[g.label] || []).map((it) => it.id || it._id);
        const original = (g.items || []).map((it) => it.id || it._id);
        if (current.length && current.join(",") !== original.join(",")) {
          changed.push(current);
        }
      }

      if (!changed.length) {
        setNotice({ type: "ok", text: txt(T.savedOk, isCn) });
        return;
      }

      const res = await fetch("/api/artwork/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: changed, orderKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setNotice({ type: "ok", text: txt(T.savedOk, isCn) });
      refetch?.();
    } catch (e) {
      console.error(e);
      setNotice({ type: "err", text: txt(T.saveFail, isCn) });
    } finally {
      setSaving(false);
    }
  }, [groups, draft, orderKey, refetch, isCn]);

  const handleReset = useCallback(() => {
    const next = {};
    for (const g of groups) next[g.label] = g.items;
    setDraft(next);
    setNotice(null);
  }, [groups]);

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
                  {txt(ORDER_LABELS[k], isCn)}
                </option>
              ))}
            </select>
          </span>

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
              onReorder={(next) => onReorder(g.label, next)}
            />
          ))
        )}
      </div>
    </div>
  );
}
