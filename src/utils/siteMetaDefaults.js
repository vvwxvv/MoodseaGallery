/**
 * siteMetaDefaults.js
 *
 * The single source of truth for the site's "Meta" document shape.
 *
 * The Meta document lives in the `Meta` collection (one doc) and is editable
 * from the manager (`/manager/meta`). These defaults are built from the legacy
 * JSON files in `src/data/` so the app keeps working — and keeps looking the
 * same — before/without the DB doc. Form settings (form_options, form_types,
 * form_marks, form_language_options) intentionally stay in JSON.
 *
 * Consumers should read the Meta doc through `useSiteMeta()` (client) or the
 * `/api/meta` route (server) and fall back to `DEFAULT_SITE_META`.
 */

import basicSettings from "@/data/basic_setting.json";
import footerConfig from "@/data/footer.json";
import menuData from "@/data/menuItems.json";
import galleryEntityConfig from "@/data/image_gallery_entity_config.json";

const appInfo = basicSettings.appInfo || {};
const seo = basicSettings.seo || {};
const metaTags = basicSettings.meta || {};

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
  app_title: metaTags.title || seo.title || "Moodsea Gallery",
  app_title_cn: footerConfig.cn?.companyName || "木曦画廊",
  app_type: appInfo.type || "",
  app_category: appInfo.category || "",
  app_version: appInfo.version || "",
  app_purpose: appInfo.purpose || "",
  app_description: appInfo.description || seo.description || "",
  app_description_cn: "",

  // ── Footer ──────────────────────────────────────────────────────────────
  app_footer: footerConfig.en?.companyName || "",
  app_footer_cn: footerConfig.cn?.companyName || "",
  app_footer_start_year: footerConfig.en?.startYear ?? footerConfig.cn?.startYear ?? null,
  app_footer_rights: footerConfig.en?.rightsText || "",
  app_footer_rights_cn: footerConfig.cn?.rightsText || "",
  /** Full footer config (kept so the classic shape still resolves). */
  footer: {
    en: {
      startYear: footerConfig.en?.startYear ?? null,
      companyName: footerConfig.en?.companyName || "",
      rightsText: footerConfig.en?.rightsText || "",
    },
    cn: {
      startYear: footerConfig.cn?.startYear ?? null,
      companyName: footerConfig.cn?.companyName || "",
      rightsText: footerConfig.cn?.rightsText || "",
    },
  },

  // ── Contact / social ────────────────────────────────────────────────────
  socialMedia: [],
  web_url: "",

  // ── Language ────────────────────────────────────────────────────────────
  language: "EN",

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

  // ── SEO / head tags ─────────────────────────────────────────────────────
  seo: {
    ...metaTags,
    title: metaTags.title || seo.title || "",
    description: metaTags.description || seo.description || "",
    keywords: metaTags.keywords || (Array.isArray(seo.keywords) ? seo.keywords.join(", ") : ""),
    og_image: metaTags.og_image || "/placeholder.png",
    icon: metaTags.icon || "/favicon.ico",
    manifest: metaTags.manifest || "/manifest.json",
    canonical: metaTags.canonical || "",
    author: metaTags.author || appInfo.author || "",
  },

  // ── Theme + feature flags ───────────────────────────────────────────────
  themes: {
    supported: basicSettings.themes?.supported || ["light", "dark"],
    default: basicSettings.themes?.default || "light",
    autoDetect: basicSettings.themes?.autoDetect ?? true,
  },
  features: {
    showArtworkFilters: basicSettings.features?.showArtworkFilters ?? false,
  },

  // ── Image-gallery entity mapping ────────────────────────────────────────
  galleryEntities: galleryEntityConfig,
};

/** Fresh copy (never hand out the shared object for mutation). */
export const getDefaultSiteMeta = () => JSON.parse(JSON.stringify(DEFAULT_SITE_META));

export default DEFAULT_SITE_META;
