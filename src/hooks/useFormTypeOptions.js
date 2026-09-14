"use client";

/**
 * useFormTypeOptions — the "type" dropdown options for one entity.
 *
 * Reads `Meta.formTypes[entity]` (managed in /manager/meta) and maps the stored
 * entries (`{ value, label_en, label_cn }`) to the `{ value, label }` shape the
 * form selectors expect. Falls back to the caller-supplied list when the Meta
 * doc has nothing for that entity (e.g. before it is saved).
 *
 * @param {string} entity   "artwork" | "exhibition" | "fair" | …
 * @param {Array}  fallback [{ value, label }] used when Meta has no entries
 * @returns {Array<{ value:string, label:string }>}
 */

import { useContext, useMemo } from "react";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import useSiteMeta from "@/hooks/useSiteMeta";

const toOption = (entry, isCn) => {
  if (entry === null || entry === undefined) return null;
  if (typeof entry === "string") {
    const v = entry.trim();
    return v ? { value: v, label: v } : null;
  }
  const value = String(entry.value ?? entry.label ?? "").trim();
  if (!value) return null;
  const label =
    (isCn ? entry.label_cn : entry.label_en) ||
    entry.label_en ||
    entry.label_cn ||
    value;
  return { value, label };
};

export default function useFormTypeOptions(entity, fallback = []) {
  const { isCn } = useContext(LanguageContext);
  const { meta } = useSiteMeta();

  return useMemo(() => {
    const stored = meta?.formTypes?.[entity];
    const source =
      Array.isArray(stored) && stored.length ? stored : Array.isArray(fallback) ? fallback : [];
    return source.map((entry) => toOption(entry, isCn)).filter(Boolean);
  }, [meta, entity, fallback, isCn]);
}
