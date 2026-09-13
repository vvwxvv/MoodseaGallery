"use client";

/**
 * useSiteMeta — the site's Meta document (title, footer, menus, social, SEO…).
 *
 * Starts from the JSON defaults so first paint is instant and identical to the
 * old behaviour, then swaps in the DB doc from `/api/meta`.
 *
 * @returns {{ meta, loading, error, refetch, save, saving }}
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE_META, mergeSiteMeta } from "@/utils/siteMetaDefaults";

let cache = null; // module-level cache: one fetch per page load

export default function useSiteMeta() {
  const [meta, setMeta] = useState(() => mergeSiteMeta(DEFAULT_SITE_META, cache));
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/meta", { cache: "no-store" });
      const json = await res.json();
      const doc = json?.data || null;
      if (doc) {
        cache = doc;
        setMeta(mergeSiteMeta(DEFAULT_SITE_META, doc));
      }
      setError(null);
    } catch (err) {
      console.error("[useSiteMeta] load failed:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache) load();
  }, [load]);

  const save = useCallback(async (patch) => {
    setSaving(true);
    try {
      const res = await fetch("/api/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      cache = json.data;
      setMeta(mergeSiteMeta(DEFAULT_SITE_META, json.data));
      return json.data;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(
    () => ({ meta, loading, error, refetch: load, save, saving }),
    [meta, loading, error, load, save, saving]
  );
}

/** Clear the module cache (used after a save from the manager page). */
export const clearSiteMetaCache = () => {
  cache = null;
};
