// useExhibitionArtworkOrder.js
// Loads exhibitions + artworks, resolves the selected exhibition's
// related_artwork into thumbnail-bearing items, and manages the working
// order (drag reorder / add / remove / show-hide) + dirty tracking + save.
//
// Empty-title CSV padding slots are filtered inside the utils, so the working
// list only ever contains real artwork references.
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  normalizeTitle,
  hasTitle,
  buildArtworkIndex,
  resolveRelatedArtworks,
  buildRelatedArtworkPayload,
} from "../utils/exhibitionArtworkOrderUtils";

const EXHIBITION_API = "/api/exhibition";
const ARTWORK_API = "/api/artwork";

const readList = (json) =>
  Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

export default function useExhibitionArtworkOrder() {
  const [exhibitions, setExhibitions] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [items, setItems] = useState([]); // working order
  const originalRef = useRef([]); // snapshot: [{ uid, mark }] for dirty check
  const [saving, setSaving] = useState(false);

  // ── fetch both collections in parallel ──────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exRes, awRes] = await Promise.all([
        fetch(EXHIBITION_API, { cache: "no-store" }),
        fetch(ARTWORK_API, { cache: "no-store" }),
      ]);
      if (!exRes.ok) throw new Error(`Exhibition fetch failed: ${exRes.status}`);
      if (!awRes.ok) throw new Error(`Artwork fetch failed: ${awRes.status}`);
      setExhibitions(readList(await exRes.json()));
      setArtworks(readList(await awRes.json()));
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const artworkIndex = useMemo(() => buildArtworkIndex(artworks), [artworks]);

  const selectedExhibition = useMemo(
    () => exhibitions.find((e) => (e.id || e._id) === selectedId) || null,
    [exhibitions, selectedId]
  );

  // ── (re)resolve items + snapshot whenever selection or data changes ──────
  const hydrate = useCallback(
    (exhibition) => {
      if (!exhibition) {
        setItems([]);
        originalRef.current = [];
        return;
      }
      const resolved = resolveRelatedArtworks(exhibition, artworkIndex); // empties already gone
      setItems(resolved);
      originalRef.current = resolved.map((r) => ({ uid: r.uid, mark: r.mark }));
    },
    [artworkIndex]
  );

  useEffect(() => {
    hydrate(selectedExhibition);
  }, [selectedExhibition, hydrate]);

  // ── dirty = order sequence changed OR any mark changed ──────────────────
  const isDirty = useMemo(() => {
    const orig = originalRef.current;
    if (items.length !== orig.length) return true;
    for (let i = 0; i < items.length; i++) {
      if (items[i].uid !== orig[i].uid) return true;
      if ((items[i].mark || "") !== (orig[i].mark || "")) return true;
    }
    return false;
  }, [items]);

  // ── actions ─────────────────────────────────────────────────────────────
  const reorder = useCallback((next) => setItems(next), []);

  const toggleMark = useCallback((uid) => {
    setItems((prev) =>
      prev.map((it) =>
        it.uid === uid ? { ...it, mark: it.mark === "show" ? "hide" : "show" } : it
      )
    );
  }, []);

  const removeItem = useCallback((uid) => {
    setItems((prev) => prev.filter((it) => it.uid !== uid));
  }, []);

  const addArtwork = useCallback((aw) => {
    if (!aw || !hasTitle(aw)) return; // never add a blank-title entry
    setItems((prev) => {
      const key = normalizeTitle(aw.title);
      if (!key || prev.some((it) => normalizeTitle(it.title) === key)) return prev; // no dup
      return [
        ...prev,
        {
          uid: `ra_add_${Date.now()}_${key}`,
          title: aw.title || "",
          order: "",
          mark: "show",
          artwork: aw,
          thumb: aw.cover_img_url || aw.img_url || "",
          matched: true,
        },
      ];
    });
  }, []);

  const reset = useCallback(() => hydrate(selectedExhibition), [hydrate, selectedExhibition]);

  // Artworks not already in the list (filtered to the exhibition's language).
  const addableArtworks = useMemo(() => {
    const used = new Set(items.map((it) => normalizeTitle(it.title)));
    const lang = String(selectedExhibition?.language || "").toUpperCase();
    return artworks
      .filter((aw) => hasTitle(aw) && !used.has(normalizeTitle(aw.title)))
      .filter((aw) => !lang || !aw.language || String(aw.language).toUpperCase() === lang);
  }, [artworks, items, selectedExhibition]);

  // ── save (partial update: only related_artwork) ─────────────────────────
  const save = useCallback(async () => {
    if (!selectedExhibition) return { ok: false, error: "No exhibition selected" };
    const id = selectedExhibition.id || selectedExhibition._id;
    const payload = buildRelatedArtworkPayload(items); // empties dropped, order 1..N

    setSaving(true);
    try {
      const res = await fetch(`${EXHIBITION_API}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, related_artwork: payload }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Save failed: ${res.status}`);

      setExhibitions((prev) =>
        prev.map((e) => ((e.id || e._id) === id ? { ...e, related_artwork: payload } : e))
      );
      setItems((prev) => prev.map((it, idx) => ({ ...it, order: String(idx + 1) })));
      originalRef.current = items.map((r) => ({ uid: r.uid, mark: r.mark }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Save failed" };
    } finally {
      setSaving(false);
    }
  }, [selectedExhibition, items]);

  return {
    loading,
    error,
    reload: load,
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
  };
}