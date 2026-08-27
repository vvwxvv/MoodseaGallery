// exhibitionArtworkOrderUtils.js
// Pure helpers for the exhibition related-artwork ordering manager.
// related_artwork is a JSON object array: [{ title, order, mark }].
//
// IMPORTANT: CSV import sizes the related_artwork[N] columns to the row with
// the MOST artworks, so shorter exhibitions arrive with trailing empty-title
// slots ({title:"", order:"", mark:""}). Those empties are NOT real artworks —
// they're dropped everywhere below so they never render as "Untitled" rows.

export const normalizeTitle = (s) =>
    String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  
  export const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  
  // True only when an entry carries a non-empty title (object form or bare string).
  export function hasTitle(entry) {
    if (entry && typeof entry === "object") return String(entry.title || "").trim() !== "";
    return String(entry ?? "").trim() !== "";
  }
  
  // Missing / non-numeric order → Infinity so it sorts after explicit orders.
  export const orderValue = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Infinity;
  };
  
  // Build a normalized-title → artwork lookup (first match wins on dup titles).
  export function buildArtworkIndex(artworks) {
    const map = new Map();
    for (const aw of toArray(artworks)) {
      if (!aw) continue;
      const key = normalizeTitle(aw.title);
      if (!key || map.has(key)) continue;
      map.set(key, aw);
    }
    return map;
  }
  
  // Get the exhibition's related-artwork source, with legacy fallback, and with
  // all empty-title slots stripped out:
  //   - prefer new related_artwork ([{title,order,mark}])
  //   - else coerce legacy related_artwork_title (string[]) into the same shape
  export function getRelatedSource(exhibition) {
    const base =
      Array.isArray(exhibition?.related_artwork) && exhibition.related_artwork.length
        ? exhibition.related_artwork
        : toArray(exhibition?.related_artwork_title).map((t) => ({ title: t, order: "", mark: "" }));
  
    // drop empty-title padding slots from CSV import
    return base.filter(hasTitle);
  }
  
  // Count of REAL related artworks (empties already excluded).
  export function relatedCount(exhibition) {
    return getRelatedSource(exhibition).length;
  }
  
  const thumbOf = (aw) => aw?.cover_img_url || aw?.img_url || "";
  
  // Resolve related_artwork entries into display items, sorted by current order.
  // Empty-title slots are already filtered by getRelatedSource, so every item
  // here is a genuine artwork reference (matched or title-mismatched, never blank).
  export function resolveRelatedArtworks(exhibition, artworkIndex) {
    const source = getRelatedSource(exhibition);
  
    const items = source.map((entry, idx) => {
      const isObj = entry && typeof entry === "object";
      const title = isObj ? entry.title || "" : String(entry ?? "");
      const order = isObj ? entry.order ?? "" : "";
      const mark = isObj ? entry.mark ?? "" : "";
      const aw = artworkIndex.get(normalizeTitle(title)) || null;
      return {
        uid: `ra_${idx}_${normalizeTitle(title)}`,
        title,
        order,
        mark,
        artwork: aw,
        thumb: thumbOf(aw),
        matched: !!aw,
      };
    });
  
    items.sort((a, b) => {
      const oa = orderValue(a.order);
      const ob = orderValue(b.order);
      if (oa !== ob) return oa - ob;
      return String(a.title).localeCompare(String(b.title));
    });
  
    return items;
  }
  
  // Build the save payload: empty-title rows dropped, order re-assigned 1..N by
  // array position, title trimmed, mark preserved.
  export function buildRelatedArtworkPayload(items) {
    return toArray(items)
      .filter((it) => it && String(it.title || "").trim())
      .map((it, idx) => ({
        title: String(it.title).trim(),
        order: String(idx + 1),
        mark: it.mark || "",
      }));
  }
  
  // Permissive language match for the exhibition picker.
  export function exhibitionMatchesLanguage(exhibition, isCn) {
    const lang = String(exhibition?.language ?? "").trim().toLowerCase();
    if (!lang) return true;
    if (lang.includes("cn")) return isCn;
    if (lang.includes("en")) return !isCn;
    return true;
  }