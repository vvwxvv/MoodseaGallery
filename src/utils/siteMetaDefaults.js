/**
 * siteMetaDefaults.js
 *
 * The single source of truth for the site's "Meta" document shape.
 *
 * The Meta document lives in the `Meta` collection (one doc) and is editable
 * from the manager (`/manager/meta`). It is the single source of truth for the
 * site's settings: identity, footer, website URL, menus, SEO, gallery-entity
 * mapping and form type options. Everything a page needs comes from there via
 * `useSiteMeta()` (client) or `/api/meta` (server).
 *
 * All the seed defaults live HERE (they used to be spread over
 * `src/data/{basic_setting,menuItems,image_gallery_entity_config,form_types}.json`).
 * They only seed the Meta doc / keep the site sane when the DB is unavailable —
 * the Meta document always wins (see `mergeSiteMeta`).
 *
 * Nothing in `src/data` should be needed for site settings any more.
 */

/* ── App identity + SEO defaults (ex `src/data/basic_setting.json`) ─────── */
export const APP_INFO_DEFAULTS = {
  title: "Moodsea Gallery – Contemporary Art Exhibitions & Artists",
  description: "Moodsea Gallery showcases contemporary art exhibitions that connect Eastern and Western perspectives. Discover our artists, upcoming shows, and cultural events in a space dedicated to humanist legacy and creative exchange.",
  keywords: "Moodsea Gallery, contemporary art gallery, exhibitions, artists, East West, cultural dialogue, art shows, gallery events",
  og_image: "/placeholder.png",
  icon: "/favicon.ico",
  manifest: "/manifest.json",
  canonical: "",
};

/** Built-in footer defaults (Meta overrides them). */
export const FOOTER_DEFAULTS = {
  en: { startYear: 2019, companyName: "Moodsea Gallery", rightsText: "All rights reserved" },
  cn: { startYear: 2019, companyName: "木曦画廊", rightsText: "保留所有权利" },
};

/* ── Default navigation menus (ex `src/data/menuItems.json`) ───────────── */
/* `meta.menu` (editable in /manager/meta) overrides these. */
export const DEFAULT_MENUS = {
  "mainMenu": {
    "en": [
      {
        "label": "Artists",
        "href": "/artists"
      },
      {
        "label": "Exhibitions",
        "href": "/exhibitions"
      },
      {
        "label": "News",
        "href": "/news"
      },
      {
        "label": "Fairs",
        "href": "/fairs"
      },
      {
        "label": "About",
        "href": "/about"
      }
    ],
    "cn": [
      {
        "label": "艺术家",
        "href": "/artists"
      },
      {
        "label": "展览",
        "href": "/exhibitions"
      },
      {
        "label": "新闻",
        "href": "/news"
      },
      {
        "label": "艺博会",
        "href": "/fairs"
      },
      {
        "label": "关于",
        "href": "/about"
      }
    ]
  },
  "managerMenu": {
    "en": [
      {
        "label": "About",
        "href": "/manager/about"
      },
      {
        "label": "Content",
        "href": "/manager/artwork",
        "dropdown": [
          {
            "label": "Artwork",
            "href": "/manager/artwork"
          },
          {
            "label": "Exhibition",
            "href": "/manager/exhibition"
          },
          {
            "label": "Fair",
            "href": "/manager/fair"
          },
          {
            "label": "Event",
            "href": "/manager/event"
          },
          {
            "label": "Writing",
            "href": "/manager/writing"
          },
          {
            "label": "Bibliography",
            "href": "/manager/bibliography"
          }
        ]
      },
      {
        "label": "Media",
        "href": "/manager/image",
        "dropdown": [
          {
            "label": "Image",
            "href": "/manager/image"
          },
          {
            "label": "Hover Image",
            "href": "/manager/image/hover"
          },
          {
            "label": "Video",
            "href": "/manager/video"
          },
          {
            "label": "Web",
            "href": "/manager/web"
          }
        ]
      },
      {
        "label": "Enquiries",
        "href": "/manager/enquire",
        "dropdown": [
          {
            "label": "Enquiries",
            "href": "/manager/enquire"
          }
        ]
      },
      {
        "label": "Gallery Contact",
        "href": "/manager/gallery-contact"
      }
    ],
    "cn": [
      {
        "label": "关于",
        "href": "/manager/about"
      },
      {
        "label": "内容",
        "href": "/manager/artwork",
        "dropdown": [
          {
            "label": "作品",
            "href": "/manager/artwork"
          },
          {
            "label": "展览",
            "href": "/manager/exhibition"
          },
          {
            "label": "艺博会",
            "href": "/manager/fair"
          },
          {
            "label": "活动",
            "href": "/manager/event"
          },
          {
            "label": "写作",
            "href": "/manager/writing"
          },
          {
            "label": "文献",
            "href": "/manager/bibliography"
          }
        ]
      },
      {
        "label": "媒体",
        "href": "/manager/image",
        "dropdown": [
          {
            "label": "图库",
            "href": "/manager/image"
          },
          {
            "label": "悬停图",
            "href": "/manager/image/hover"
          },
          {
            "label": "视频",
            "href": "/manager/video"
          },
          {
            "label": "网页",
            "href": "/manager/web"
          }
        ]
      },
      {
        "label": "咨询",
        "href": "/manager/enquire",
        "dropdown": [
          {
            "label": "咨询",
            "href": "/manager/enquire"
          }
        ]
      },
      {
        "label": "画廊联系",
        "href": "/manager/gallery-contact"
      }
    ]
  }
};


/* ── Entity "type" option lists (ex `src/data/form_types.json`) ─────────── */
/* Form-level option data (not a site setting) — `meta.formTypes` mirrors the
 * artwork/exhibition/fair lists that the manager can edit. */
export const FORM_TYPE_OPTIONS = {
  "artwork": [
    {
      "id": "artwork_video",
      "value": "video",
      "label_en": "Video",
      "label_cn": "录像",
      "priority": 1
    },
    {
      "id": "artwork_moving_images",
      "value": "moving_images",
      "label_en": "Moving Images",
      "label_cn": "影像",
      "priority": 2
    },
    {
      "id": "artwork_installation",
      "value": "installation",
      "label_en": "Installation",
      "label_cn": "装置",
      "priority": 3
    },
    {
      "id": "artwork_mixed_media",
      "value": "mixed_media",
      "label_en": "Mixed Media",
      "label_cn": "综合材料",
      "priority": 4
    },
    {
      "id": "artwork_photography",
      "value": "photography",
      "label_en": "Photography",
      "label_cn": "摄影",
      "priority": 5
    },
    {
      "id": "artwork_sculpture",
      "value": "sculpture",
      "label_en": "Sculpture",
      "label_cn": "雕塑",
      "priority": 6
    },
    {
      "id": "artwork_drawing",
      "value": "drawing",
      "label_en": "Drawing",
      "label_cn": "素描",
      "priority": 7
    },
    {
      "id": "artwork_printmaking",
      "value": "printmaking",
      "label_en": "Printmaking",
      "label_cn": "版画",
      "priority": 8
    },
    {
      "id": "artwork_painting",
      "value": "painting",
      "label_en": "Painting",
      "label_cn": "绘画",
      "priority": 9
    },
    {
      "id": "artwork_other",
      "value": "other",
      "label_en": "Other",
      "label_cn": "其他",
      "priority": 10
    }
  ],
  "image": [
    {
      "id": "image_artist_portrait",
      "value": "artist_portrait",
      "label": "艺术家肖像 / Artist Portrait"
    },
    {
      "id": "image_photography",
      "value": "photography",
      "label": "摄影作品 / Photography"
    },
    {
      "id": "image_artwork_image",
      "value": "artwork_image",
      "label": "作品图片 / Artwork Image"
    },
    {
      "id": "image_artwork_detail",
      "value": "artwork_detail",
      "label": "作品局部图片 / Artwork Detail Image"
    },
    {
      "id": "image_exhibition_view",
      "value": "exhibition_view",
      "label": "展览现场 / Exhibition View"
    },
    {
      "id": "image_poster",
      "value": "poster",
      "label": "海报图片 / Poster Image"
    },
    {
      "id": "image_sketch",
      "value": "sketch",
      "label": "草图 / Sketch"
    },
    {
      "id": "image_performance",
      "value": "performance",
      "label": "表演现场 / Performance"
    },
    {
      "id": "image_concept",
      "value": "concept",
      "label": "概念图 / Concept"
    }
  ],
  "video": [
    {
      "id": "video_documentary",
      "value": "documentary",
      "label": "纪录片 / Documentary"
    },
    {
      "id": "video_short_film",
      "value": "short_film",
      "label": "短片 / Short Film"
    },
    {
      "id": "video_feature_film",
      "value": "feature_film",
      "label": "故事片 / Feature Film"
    },
    {
      "id": "video_animation",
      "value": "animation",
      "label": "动画 / Animation"
    },
    {
      "id": "video_experimental",
      "value": "experimental",
      "label": "实验 / Experimental"
    },
    {
      "id": "video_performance",
      "value": "performance",
      "label": "表演 / Performance"
    },
    {
      "id": "video_installation",
      "value": "installation",
      "label": "装置 / Installation"
    },
    {
      "id": "video_other",
      "value": "other",
      "label": "其他 / Other"
    }
  ],
  "event": [
    {
      "id": "event_group_exhibition",
      "value": "group_exhibition",
      "label_en": "Group Exhibition",
      "label_cn": "群展"
    },
    {
      "id": "event_solo_exhibition",
      "value": "solo_exhibition",
      "label_en": "Solo Exhibition",
      "label_cn": "个展"
    },
    {
      "id": "event_art_fair",
      "value": "art_fair",
      "label_en": "Art Fair",
      "label_cn": "艺博会"
    },
    {
      "id": "event_project",
      "value": "project",
      "label_en": "Project",
      "label_cn": "项目"
    },
    {
      "id": "event_performance",
      "value": "performance",
      "label_en": "Performance",
      "label_cn": "表演"
    },
    {
      "id": "event_award",
      "value": "award",
      "label_en": "Award",
      "label_cn": "获奖"
    },
    {
      "id": "event_artist_talk",
      "value": "artist_talk",
      "label_en": "Artist Talk",
      "label_cn": "艺术家讲座"
    },
    {
      "id": "event_screening",
      "value": "screening",
      "label_en": "Screening",
      "label_cn": "放映"
    },
    {
      "id": "event_workshop",
      "value": "workshop",
      "label_en": "Workshop",
      "label_cn": "工作坊"
    },
    {
      "id": "event_artist_residency",
      "value": "artist_residency",
      "label_en": "Artist Residency",
      "label_cn": "驻地"
    }
  ],
  "about": [
    {
      "id": "about_biography",
      "value": "biography",
      "label_en": "Artist Biography",
      "label_cn": "艺术家简介"
    },
    {
      "id": "about_statement",
      "value": "statement",
      "label_en": "Artist Statement",
      "label_cn": "艺术家陈述"
    },
    {
      "id": "about_cv",
      "value": "cv",
      "label_en": "CV/Resume",
      "label_cn": "简历"
    },
    {
      "id": "about_exhibition_history",
      "value": "exhibition_history",
      "label_en": "Exhibition History",
      "label_cn": "展览经历"
    },
    {
      "id": "about_awards",
      "value": "awards",
      "label_en": "Awards & Recognition",
      "label_cn": "奖项与认可"
    },
    {
      "id": "about_publications",
      "value": "publications",
      "label_en": "Publications",
      "label_cn": "出版物"
    },
    {
      "id": "about_collections",
      "value": "collections",
      "label_en": "Collections",
      "label_cn": "收藏"
    },
    {
      "id": "about_education",
      "value": "education",
      "label_en": "Education",
      "label_cn": "教育背景"
    },
    {
      "id": "about_other",
      "value": "other",
      "label_en": "Other",
      "label_cn": "其他"
    }
  ],
  "mark": [
    {
      "id": "mark_slider",
      "value": "slider",
      "label": "轮播 / Slider"
    },
    {
      "id": "mark_private",
      "value": "private",
      "label": "私密 / Private"
    }
  ],
  "web": [
    {
      "id": "web_portfolio",
      "value": "portfolio",
      "label_en": "Portfolio",
      "label_cn": "作品集"
    },
    {
      "id": "web_gallery",
      "value": "gallery",
      "label_en": "Gallery",
      "label_cn": "画廊"
    },
    {
      "id": "web_exhibition",
      "value": "exhibition",
      "label_en": "Exhibition",
      "label_cn": "展览"
    },
    {
      "id": "web_social",
      "value": "social",
      "label_en": "Social Media",
      "label_cn": "社交媒体"
    },
    {
      "id": "web_news",
      "value": "news",
      "label_en": "News",
      "label_cn": "新闻"
    },
    {
      "id": "web_other",
      "value": "other",
      "label_en": "Other",
      "label_cn": "其他"
    }
  ],
  "language": [
    {
      "id": "lang_en",
      "value": "EN",
      "label_en": "English",
      "label_cn": "英文"
    },
    {
      "id": "lang_cn",
      "value": "CN",
      "label_en": "Chinese",
      "label_cn": "中文"
    }
  ],
  "writing": [
    {
      "id": "writing_essay",
      "value": "essay",
      "label_en": "Essay",
      "label_cn": "散文"
    },
    {
      "id": "writing_article",
      "value": "article",
      "label_en": "Article",
      "label_cn": "文章"
    },
    {
      "id": "writing_review",
      "value": "review",
      "label_en": "Review",
      "label_cn": "评论"
    },
    {
      "id": "writing_interview",
      "value": "interview",
      "label_en": "Interview",
      "label_cn": "访谈"
    },
    {
      "id": "writing_criticism",
      "value": "criticism",
      "label_en": "Criticism",
      "label_cn": "评论"
    },
    {
      "id": "writing_other",
      "value": "other",
      "label_en": "Other",
      "label_cn": "其他"
    }
  ]
};

/* ── Derived defaults ────────────────────────────────────────────────────── */

/** Default manager menu (meta gets a "Site Meta" entry appended). */
const META_MENU_ENTRY = {
  en: { label: "Site Meta", href: "/manager/meta" },
  cn: { label: "站点信息", href: "/manager/meta" },
};

const withMetaEntry = (list = [], lang = "en") => [
  ...list.filter((item) => item?.href !== "/manager/meta"),
  META_MENU_ENTRY[lang],
];

const artworkTypeOptions = (FORM_TYPE_OPTIONS.artwork || []).map((t) => ({
  label_en: t.label_en || t.label || t.value || "",
  label_cn: t.label_cn || t.label || t.value || "",
}));

/** The Meta document defaults — the DB doc is merged over these. */
export const DEFAULT_SITE_META = {
  // ── Footer ──────────────────────────────────────────────────────────────
  app_footer_en: FOOTER_DEFAULTS.en.companyName,
  app_footer_cn: FOOTER_DEFAULTS.cn.companyName,
  app_footer_start_year: FOOTER_DEFAULTS.en.startYear ?? null,
  app_footer_rights_en: FOOTER_DEFAULTS.en.rightsText,
  app_footer_rights_cn: FOOTER_DEFAULTS.cn.rightsText,

  // ── Menus (public + manager) ────────────────────────────────────────────
  menu: {
    mainMenu: {
      en: DEFAULT_MENUS.mainMenu?.en || [],
      cn: DEFAULT_MENUS.mainMenu?.cn || [],
    },
    managerMenu: {
      en: withMetaEntry(DEFAULT_MENUS.managerMenu?.en || [], "en"),
      cn: withMetaEntry(DEFAULT_MENUS.managerMenu?.cn || [], "cn"),
    },
  },

  // ── SEO / head tags (all editable in /manager/meta) ────────────────────
  seo: {
    title: APP_INFO_DEFAULTS.title,
    description: APP_INFO_DEFAULTS.description,
    keywords: APP_INFO_DEFAULTS.keywords,
    og_image: APP_INFO_DEFAULTS.og_image,
    icon: APP_INFO_DEFAULTS.icon,
    manifest: APP_INFO_DEFAULTS.manifest,
    canonical: APP_INFO_DEFAULTS.canonical,
    author: APP_INFO_DEFAULTS.author,
  },

  // ── Form "type" options (managed in /manager/meta) ───────────────────────
  // Options are stored as labels only — the label IS the value.
  formTypes: {
    artwork: artworkTypeOptions,
    exhibition: [
      { label_en: "Solo Exhibition", label_cn: "个展" },
      { label_en: "Group Exhibition", label_cn: "群展" },
      { label_en: "Dual Exhibition", label_cn: "双人展" },
      { label_en: "Museum Exhibition", label_cn: "美术馆展览" },
      { label_en: "Art Fair", label_cn: "艺博会" },
      { label_en: "Other", label_cn: "其他" },
    ],
    fair: [
      { label_en: "Art Fair", label_cn: "艺博会" },
      { label_en: "Other", label_cn: "其他" },
    ],
  },
};

/** Fresh (deep) copy of the Meta defaults — safe for callers to mutate. */
export const getDefaultSiteMeta = () => JSON.parse(JSON.stringify(DEFAULT_SITE_META));

export default DEFAULT_SITE_META;

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
