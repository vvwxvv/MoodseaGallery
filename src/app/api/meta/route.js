/**
 * /api/meta
 *
 * Singleton document in the `Meta` collection — everything the manager can
 * edit about the site itself (title, footer, social links, menus, SEO,
 * theme/feature flags, gallery entity mapping).
 *
 *   GET  → { data: <meta doc> }   (creates it from the JSON defaults on first
 *                                  read, so the doc always exists)
 *   PUT  → { data: <meta doc> }   body: partial meta; merged into the doc.
 *   POST → same as PUT (compat with the generic api shell)
 */

import { NextResponse } from "next/server";
import { getDefaultSiteMeta } from "@/utils/siteMetaDefaults";
import { readMetaDoc, updateMetaDoc } from "@/lib/siteMetaServer";

const noCache = (data, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

/** Editable top-level string fields. */
const STRING_FIELDS = [
  "app_title",
  "app_title_cn",
  "app_type",
  "app_category",
  "app_version",
  "app_purpose",
  "app_description",
  "app_description_cn",
  "app_footer",
  "app_footer_cn",
  "app_footer_rights",
  "app_footer_rights_cn",
  "web_url",
  "language",
];
/** Editable structured fields (stored as-is). */
const JSON_FIELDS = ["socialMedia", "menu", "seo", "themes", "features", "footer", "galleryEntities"];

/** Shape the incoming body into something safe to $set. */
function sanitize(input = {}) {
  const out = {};

  STRING_FIELDS.forEach((key) => {
    if (input[key] === undefined) return;
    out[key] = input[key] === null ? null : String(input[key]);
  });

  if (input.app_footer_start_year !== undefined) {
    const n = Number(input.app_footer_start_year);
    out.app_footer_start_year = Number.isFinite(n) ? n : null;
  }

  JSON_FIELDS.forEach((key) => {
    if (input[key] === undefined) return;
    out[key] = input[key];
  });

  // Keep the classic `footer` block and the flat fields in sync, both ways.
  if (out.footer) {
    const { en = {}, cn = {} } = out.footer;
    if (en.companyName !== undefined) out.app_footer = en.companyName;
    if (cn.companyName !== undefined) out.app_footer_cn = cn.companyName;
    if (en.startYear !== undefined) out.app_footer_start_year = en.startYear;
    if (en.rightsText !== undefined) out.app_footer_rights = en.rightsText;
    if (cn.rightsText !== undefined) out.app_footer_rights_cn = cn.rightsText;
  } else if (
    out.app_footer !== undefined ||
    out.app_footer_cn !== undefined ||
    out.app_footer_start_year !== undefined ||
    out.app_footer_rights !== undefined ||
    out.app_footer_rights_cn !== undefined
  ) {
    const base = getDefaultSiteMeta().footer;
    out.footer = {
      en: {
        companyName: out.app_footer ?? base.en.companyName,
        startYear: out.app_footer_start_year ?? base.en.startYear,
        rightsText: out.app_footer_rights ?? base.en.rightsText,
      },
      cn: {
        companyName: out.app_footer_cn ?? base.cn.companyName,
        startYear: out.app_footer_start_year ?? base.cn.startYear,
        rightsText: out.app_footer_rights_cn ?? base.cn.rightsText,
      },
    };
  }

  if (out.socialMedia && !Array.isArray(out.socialMedia)) out.socialMedia = [];

  return out;
}

export async function GET() {
  try {
    const { doc } = await readMetaDoc();
    return noCache({ data: { ...doc, id: String(doc._id) } });
  } catch (error) {
    console.error("[/api/meta] GET failed:", error);
    // Never let a DB hiccup break the shell — hand back the JSON defaults.
    return noCache({ data: { ...getDefaultSiteMeta(), id: null }, fallback: true });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const patch = sanitize(body);
    if (!Object.keys(patch).length) return noCache({ error: "Nothing to update" }, 400);

    const doc = await updateMetaDoc(patch);
    return noCache({ data: { ...doc, id: String(doc._id) } });
  } catch (error) {
    console.error("[/api/meta] PUT failed:", error);
    return noCache({ error: "Failed to update meta" }, 500);
  }
}

export const POST = PUT;
