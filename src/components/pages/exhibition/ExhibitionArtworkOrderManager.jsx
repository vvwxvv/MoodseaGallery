// ExhibitionArtworkOrderManager.jsx
// Manager page: pick an exhibition, drag its related artworks into order,
// add/remove, show/hide (mark), then save. Order is re-numbered 1..N on save.
"use client";

import React, { useContext, useMemo, useState, useCallback } from "react";
import {
  Box,
  Container,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Divider,
  Snackbar,
  Alert,
  Autocomplete,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Reorder, useDragControls } from "framer-motion";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Save,
  RotateCcw,
  ImageOff,
  AlertTriangle,
} from "lucide-react";

import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import useExhibitionArtworkOrder from "@/components/pages/exhibition/hooks/useExhibitionArtworkOrder";
import {
  relatedCount,
  exhibitionMatchesLanguage,
} from "@/components/pages/exhibition/utils/exhibitionArtworkOrderUtils";

// ============================================================
// 🅰️  THUMBNAIL / ROW SIZE CONFIG — tune the thumbnail here.
// Two size tiers: `desktop` (non-mobile, bigger) and `mobile`.
// Change WIDTH / HEIGHT to resize the thumbnail; the row grows with it.
// ASPECT is informational — set HEIGHT directly for full control.
// ============================================================
const THUMB_CONFIG = {
  desktop: {
    WIDTH: 350,          // ← non-mobile thumbnail width (px)
    HEIGHT: 230,         // ← non-mobile thumbnail height (px)
    TITLE_FONT: 15,      // artwork title font size
    META_FONT: 12,       // artist · year / warning font size
    BADGE_SIZE: 30,      // position-number badge box
    ROW_GAP: 2,          // gap between rows (px)
    ROW_PADDING: 1.25,   // inner padding (MUI spacing units)
  },
  mobile: {
    WIDTH: 96,           // ← mobile thumbnail width (px)
    HEIGHT: 72,          // ← mobile thumbnail height (px)
    TITLE_FONT: 13,
    META_FONT: 11,
    BADGE_SIZE: 26,
    ROW_GAP: 1,
    ROW_PADDING: 1,
  },
};

const pickThumb = (isMobile) => (isMobile ? THUMB_CONFIG.mobile : THUMB_CONFIG.desktop);

// ============================================================
// 🅱️  UI LABELS — all page text in one place (edit freely).
// ============================================================
const UI_LABELS = {
  pageTitle:     { en: "Exhibition Artwork Order", cn: "展览关联作品排序" },
  pageSubtitle:  {
    en: "Pick an exhibition, drag thumbnails to reorder, save to rewrite each artwork's order.",
    cn: "选择展览，拖动缩略图调整顺序，保存后按新顺序更新 order。",
  },
  searchExhibitions: { en: "Search exhibitions…", cn: "搜索展览…" },
  works:         { en: "works", cn: "件作品" },
  noExhibitions: { en: "No exhibitions", cn: "无展览" },
  untitled:      { en: "Untitled", cn: "无题" },
  selectPrompt:  { en: "← Select an exhibition to start", cn: "← 从左侧选择一个展览" },
  items:         { en: "items", cn: "件" },
  reset:         { en: "Reset", cn: "重置" },
  saveOrder:     { en: "Save order", cn: "保存排序" },
  addArtwork:    { en: "＋ Add an artwork to this exhibition…", cn: "＋ 添加作品到此展览…" },
  emptyList:     { en: "No related artworks yet — add some above.", cn: "此展览暂无关联作品，用上方搜索添加。" },
  noMatch:       { en: "No matching artwork (title mismatch?)", cn: "未匹配到作品（标题可能不一致）" },
  shownHint:     { en: "Shown — click to hide", cn: "展示中，点击隐藏" },
  hiddenHint:    { en: "Hidden — click to show", cn: "已隐藏，点击展示" },
  removeHint:    { en: "Remove from exhibition", cn: "从此展览移除" },
  unsavedWarn:   { en: "Unsaved changes — save or reset first", cn: "有未保存的改动，请先保存或重置" },
  saved:         { en: "Order saved", cn: "已保存排序" },
  saveFailed:    { en: "Save failed", cn: "保存失败" },
};

const L = (key, isCn) => UI_LABELS[key]?.[isCn ? "cn" : "en"] ?? key;

// ── single draggable artwork row ──────────────────────────────────────────
function ArtworkRow({ item, position, onToggleMark, onRemove, isDark, isCn, thumb }) {
  const controls = useDragControls();
  const startDrag = (e) => controls.start(e);
  const visible = (item.mark || "show") === "show";

  const border = isDark ? "#333" : "#e5e5e5";
  const bg = isDark ? "#141414" : "#fff";
  const sub = isDark ? "#999" : "#666";

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: "none", marginBottom: thumb.ROW_GAP }}
      whileDrag={{ scale: 1.015, boxShadow: "0 10px 28px rgba(0,0,0,0.22)", zIndex: 20 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: thumb.ROW_PADDING,
          border: `1px solid ${border}`,
          borderRadius: "10px",
          bgcolor: bg,
          opacity: visible ? 1 : 0.45,
          transition: "opacity 0.15s, border-color 0.15s",
          "&:hover": { borderColor: isDark ? "#555" : "#bbb" },
        }}
      >
        {/* drag handle */}
        <Box
          onPointerDown={startDrag}
          sx={{
            cursor: "grab",
            color: sub,
            display: "flex",
            touchAction: "none",
            flexShrink: 0,
            "&:active": { cursor: "grabbing" },
          }}
        >
          <GripVertical size={18} />
        </Box>

        {/* live position badge */}
        <Box
          sx={{
            minWidth: thumb.BADGE_SIZE,
            height: thumb.BADGE_SIZE,
            borderRadius: "6px",
            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: isDark ? "#fff" : "#000",
            flexShrink: 0,
          }}
        >
          {position}
        </Box>

        {/* thumbnail (also a drag surface) — size driven by THUMB_CONFIG */}
        <Box
          onPointerDown={startDrag}
          sx={{
            width: thumb.WIDTH,
            height: thumb.HEIGHT,
            flexShrink: 0,
            borderRadius: "6px",
            overflow: "hidden",
            bgcolor: isDark ? "#000" : "#f2f2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            touchAction: "none",
            "&:active": { cursor: "grabbing" },
          }}
        >
          {item.thumb ? (
            <img
              src={item.thumb}
              alt={item.title}
              loading="lazy"
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <ImageOff size={Math.min(28, thumb.HEIGHT / 3)} color={sub} />
          )}
        </Box>

        {/* meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: thumb.TITLE_FONT,
              fontWeight: 600,
              color: isDark ? "#fff" : "#000",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.title || L("untitled", isCn)}
          </Typography>
          <Typography sx={{ fontSize: thumb.META_FONT, color: sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.matched
              ? [item.artwork?.artist, item.artwork?.year].filter(Boolean).join(" · ")
              : (
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "#c77" }}>
                  <AlertTriangle size={11} />
                  {L("noMatch", isCn)}
                </Box>
              )}
          </Typography>
        </Box>

        {/* show / hide (mark) */}
        <Tooltip title={visible ? L("shownHint", isCn) : L("hiddenHint", isCn)}>
          <IconButton size="small" onClick={() => onToggleMark(item.uid)} sx={{ color: visible ? (isDark ? "#7bd88f" : "#2e7d32") : sub, flexShrink: 0 }}>
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconButton>
        </Tooltip>

        {/* remove */}
        <Tooltip title={L("removeHint", isCn)}>
          <IconButton size="small" onClick={() => onRemove(item.uid)} sx={{ color: sub, flexShrink: 0, "&:hover": { color: "#e05555" } }}>
            <Trash2 size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Reorder.Item>
  );
}

// ── page ───────────────────────────────────────────────────────────────────
export default function ExhibitionArtworkOrderManager() {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const isDark = useDarkMode();

  const thumb = pickThumb(isMobile);

  const {
    loading,
    error,
    exhibitions,
    selectedId,
    setSelectedId,
    selectedExhibition,
    items,
    reorder,
    toggleMark,
    removeItem,
    addArtwork,
    reset,
    addableArtworks,
    isDirty,
    saving,
    save,
  } = useExhibitionArtworkOrder();

  const [search, setSearch] = useState("");
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  const filteredExhibitions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exhibitions
      .filter((e) => exhibitionMatchesLanguage(e, isCn))
      .filter((e) => !term || String(e.title || "").toLowerCase().includes(term))
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }, [exhibitions, isCn, search]);

  // block switching exhibitions while there are unsaved changes
  const trySelect = useCallback(
    (id) => {
      if (id === selectedId) return;
      if (isDirty) {
        setSnack({ open: true, msg: L("unsavedWarn", isCn), sev: "warning" });
        return;
      }
      setSelectedId(id);
    },
    [isDirty, selectedId, setSelectedId, isCn]
  );

  const handleSave = async () => {
    const r = await save();
    setSnack(
      r.ok
        ? { open: true, msg: L("saved", isCn), sev: "success" }
        : { open: true, msg: r.error || L("saveFailed", isCn), sev: "error" }
    );
  };

  const border = isDark ? "#2a2a2a" : "#e5e5e5";
  const panelBg = isDark ? "#0d0d0d" : "#fafafa";

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: isDark ? "#fff" : "#000" }}>
        {L("pageTitle", isCn)}
      </Typography>
      <Typography sx={{ fontSize: 13, color: isDark ? "#888" : "#666", mb: 3 }}>
        {L("pageSubtitle", isCn)}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" }, alignItems: "flex-start" }}>
          {/* ── left: exhibition picker ── */}
          <Box
            sx={{
              width: { xs: "100%", md: 300 },
              flexShrink: 0,
              border: `1px solid ${border}`,
              borderRadius: "12px",
              bgcolor: panelBg,
              p: 1.5,
              maxHeight: { md: "72vh" },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder={L("searchExhibitions", isCn)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ overflowY: "auto", pr: 0.5 }}>
              {filteredExhibitions.map((ex) => {
                const id = ex.id || ex._id;
                const active = id === selectedId;
                const count = relatedCount(ex);
                return (
                  <Box
                    key={id}
                    onClick={() => trySelect(id)}
                    sx={{
                      p: 1.25,
                      mb: 0.5,
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: `1px solid ${active ? (isDark ? "#fff" : "#000") : "transparent"}`,
                      bgcolor: active ? (isDark ? "#1c1c1c" : "#efefef") : "transparent",
                      "&:hover": { bgcolor: isDark ? "#161616" : "#f0f0f0" },
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: active ? 700 : 500, color: isDark ? "#fff" : "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ex.title || L("untitled", isCn)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: isDark ? "#888" : "#888" }}>
                      {[ex.year, `${count} ${L("works", isCn)}`].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                );
              })}
              {filteredExhibitions.length === 0 && (
                <Typography sx={{ fontSize: 12, color: "#999", textAlign: "center", py: 3 }}>
                  {L("noExhibitions", isCn)}
                </Typography>
              )}
            </Box>
          </Box>

          {/* ── right: order editor ── */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            {!selectedExhibition ? (
              <Box sx={{ border: `1px dashed ${border}`, borderRadius: "12px", py: 10, textAlign: "center", color: "#999" }}>
                {L("selectPrompt", isCn)}
              </Box>
            ) : (
              <>
                {/* action bar */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
                >
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: isDark ? "#fff" : "#000" }}>
                    {selectedExhibition.title}
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: "#888", ml: 1 }}>
                      {items.length} {L("items", isCn)}
                    </Box>
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RotateCcw size={15} />}
                      disabled={!isDirty || saving}
                      onClick={reset}
                      sx={{ textTransform: "none" }}
                    >
                      {L("reset", isCn)}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save size={15} />}
                      disabled={!isDirty || saving}
                      onClick={handleSave}
                      sx={{ textTransform: "none" }}
                    >
                      {L("saveOrder", isCn)}
                    </Button>
                  </Stack>
                </Stack>

                {/* add picker */}
                <Autocomplete
                  options={addableArtworks}
                  getOptionLabel={(o) => o.title || ""}
                  value={null}
                  blurOnSelect
                  clearOnBlur
                  onChange={(e, val) => val && addArtwork(val)}
                  isOptionEqualToValue={(o, v) => (o.id || o._id) === (v.id || v._id)}
                  renderOption={(props, o) => (
                    <Box component="li" {...props} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                      <Box sx={{ width: 40, height: 30, borderRadius: "4px", overflow: "hidden", bgcolor: "#eee", flexShrink: 0 }}>
                        {(o.cover_img_url || o.img_url) && (
                          <img src={o.cover_img_url || o.img_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#888" }}>{[o.artist, o.year].filter(Boolean).join(" · ")}</Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder={L("addArtwork", isCn)} />
                  )}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ mb: 2 }} />

                {/* reorderable list */}
                {items.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: "center", color: "#999", fontSize: 13 }}>
                    {L("emptyList", isCn)}
                  </Box>
                ) : (
                  <Reorder.Group axis="y" values={items} onReorder={reorder} style={{ padding: 0, margin: 0 }}>
                    {items.map((it, idx) => (
                      <ArtworkRow
                        key={it.uid}
                        item={it}
                        position={idx + 1}
                        onToggleMark={toggleMark}
                        onRemove={removeItem}
                        isDark={isDark}
                        isCn={isCn}
                        thumb={thumb}
                      />
                    ))}
                  </Reorder.Group>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.sev} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ borderRadius: "8px" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}