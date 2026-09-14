/**
 * siteMetaDefaults.js
 *
 * The single source of truth for the site's "Meta" document shape.
 *
 * The Meta document lives in the `Meta` collection (one doc) and is editable
 * from the manager (`/manager/meta`). It is the single source of truth for the
 * site's settings (identity, footer, website URL, menus, SEO, gallery-entity
 * mapping, form type options). These defaults only seed it —
 * and keep the site looking right when the DB is unavailable.
 *
 * Form settings (form_options, form_types, form_marks) intentionally stay in
 * JSON, as does the manager user-guide doc.
 *
 * Consumers should read the Meta doc through `useSiteMeta()` (client) or the
 * `/api/meta` route (server) and fall back to `DEFAULT_SITE_META`.
 */

import basicSettings from "@/data/basic_setting.json";
import menuData from "@/data/menuItems.json";
import galleryEntityConfig from "@/data/image_gallery_entity_config.json";
import formTypesData from "@/data/form_types.json";

const appInfo = basicSettings.appInfo || {};
const seo = basicSettings.seo || {};
const metaTags = basicSettings.meta || {};

/**
 * Built-in footer defaults. The Meta document is the single source of truth —
 * these only seed it (and keep the site sane when the DB is unavailable).
 */
export const FOOTER_DEFAULTS = {
  en: { startYear: 2019, companyName: "Moodsea Gallery", rightsText: "All rights reserved" },
  cn: { startYear: 2019, companyName: "木曦画廊", rightsText: "保留所有权利" },
};

/* Seeded `*_en` / `*_cn` pairs (the Meta doc overrides them). */
const APP_TITLE_EN = metaTags.title || seo.title || FOOTER_DEFAULTS.en.companyName;
const APP_TITLE_CN = FOOTER_DEFAULTS.cn.companyName;
const APP_DESC_EN = appInfo.description || seo.description || "";
const FOOTER_COMPANY_EN = FOOTER_DEFAULTS.en.companyName;
const FOOTER_COMPANY_CN = FOOTER_DEFAULTS.cn.companyName;
const FOOTER_START_YEAR = FOOTER_DEFAULTS.en.startYear ?? null;
const FOOTER_RIGHTS_EN = FOOTER_DEFAULTS.en.rightsText;
const FOOTER_RIGHTS_CN = FOOTER_DEFAULTS.cn.rightsText;

/** Deep-ish merge used to layer a DB doc over the defaults. */
export function mergeSiteMeta(base, override) {
  if (!override || typeof override !== "object") return base;
  const out = { ...base };
  Object.keys(override).forEach((key) => {
    const value = override[key];
    if (value === undefined || value === null) return;
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && base?.[key] && !Array.isArray(base[key])
        ? mergeSiteMeta(base[key], value)
        : value;
  });
  return out;
}

/** Default manager menu (meta gets a "Site Meta" entry appended). */
const META_MENU_ENTRY = {
  en: { label: "Site Meta", href: "/manager/meta" },
  cn: { label: "站点信息", href: "/manager/meta" },
};

const withMetaEntry = (list = [], lang = "en") => [
  ...list.filter((item) => item?.href !== "/manager/meta"),
  META_MENU_ENTRY[lang],
];

export const DEFAULT_SITE_META = {
  // ── App identity ────────────────────────────────────────────────────────
  app_title_en: APP_TITLE_EN,
  app_title_cn: APP_TITLE_CN,
  app_type: appInfo.type || "",
  app_category: appInfo.category || "",
  app_version: appInfo.version || "",
  app_purpose: appInfo.purpose || "",
  app_description_en: APP_DESC_EN,
  app_description_cn: "",

  // ── Footer ──────────────────────────────────────────────────────────────
  app_footer_en: FOOTER_COMPANY_EN,
  app_footer_cn: FOOTER_COMPANY_CN,
  app_footer_start_year: FOOTER_START_YEAR,
  app_footer_rights_en: FOOTER_RIGHTS_EN,
  app_footer_rights_cn: FOOTER_RIGHTS_CN,

  // ── Website ─────────────────────────────────────────────────────────────
  web_url: "",

  // ── Menus (public + manager) ────────────────────────────────────────────
  menu: {
    mainMenu: {
      en: menuData.mainMenu?.en || [],
      cn: menuData.mainMenu?.cn || [],
    },
    managerMenu: {
      en: withMetaEntry(menuData.managerMenu?.en || [], "en"),
      cn: withMetaEntry(menuData.managerMenu?.cn || [], "cn"),
    },
  },

  // ── SEO / head tags (all editable in /manager/meta) ────────────────────
  seo: {
    title: metaTags.title || seo.title || "",
    description: metaTags.description || seo.description || "",
    keywords: metaTags.keywords || (Array.isArray(seo.keywords) ? seo.keywords.join(", ") : ""),
    og_image: metaTags.og_image || "/placeholder.png",
    icon: metaTags.icon || "/favicon.ico",
    manifest: metaTags.manifest || "/manifest.json",
    canonical: metaTags.canonical || "",
    author: metaTags.author || appInfo.author || "",
  },

  // ── Image-gallery entity mapping ────────────────────────────────────────
  galleryEntities: galleryEntityConfig,

  // ── Form "type" options (managed in /manager/meta) ───────────────────────
  // Seeded from the legacy JSON so existing values keep working; the manager
  // page can add / remove entries and the entity forms read these into their
  // type selector.
  formTypes: {
    artwork: (formTypesData.artwork || []).map((t) => ({
      value: t.value,
      label_en: t.label_en || t.label || t.value,
      label_cn: t.label_cn || t.label || t.value,
    })),
    exhibition: [
      { value: "Solo Exhibition", label_en: "Solo Exhibition", label_cn: "个展" },
      { value: "Group Exhibition", label_en: "Group Exhibition", label_cn: "群展" },
      { value: "Dual Exhibition", label_en: "Dual Exhibition", label_cn: "双人展" },
      { value: "Museum Exhibition", label_en: "Museum Exhibition", label_cn: "美术馆展览" },
      { value: "Art Fair", label_en: "Art Fair", label_cn: "艺博会" },
      { value: "Other", label_en: "Other", label_cn: "其他" },
    ],
    fair: [
      { value: "Art Fair", label_en: "Art Fair", label_cn: "艺博会" },
      { value: "Other", label_en: "Other", label_cn: "其他" },
    ],
  },
};

/** Fresh copy (never hand out the shared object for mutation). */
export const getDefaultSiteMeta = () => JSON.parse(JSON.stringify(DEFAULT_SITE_META));

export default DEFAULT_SITE_META;
