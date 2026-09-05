// lib/typography.js
// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for the site's typography.
//
// Three layers, ordered by how often you touch them:
//   1. FONT_FACES / FONT_FAMILIES  → the real @font-face family NAMES.
//   2. Resolution config           → language defaults + fallbacks.
//   3. TYPE_SCALE                  → per-role weight / size / spacing.
//
// ⚠️ Every string in layer 1 MUST match a `font-family` in the site's
//    @font-face CSS character-for-character. A mismatch does NOT error — the
//    browser just silently falls back to a system font. Keep them in sync.
// ─────────────────────────────────────────────────────────────────────────

// ── 1a. Language-default typefaces ───────────────────────────────────────
// The workhorse faces nearly every role uses, keyed by weight.
//   zh → PingFang   ·   en → Avenir Next
// A weight that isn't shipped (e.g. zh `medium`) resolves DOWN to `regular`
// at read time, so a role may safely ask for `medium` in zh without a
// PingFang-Medium @font-face existing. (This replaces the old
// medium→regular alias hack + its TODO — the fallback is now automatic.)
export const FONT_FACES = {
  zh: {
    thin: 'PingFang-Thin',
    light: 'PingFang-Light',
    regular: 'PingFang-Regular',
  },
  en: {
    // ⚠️ AvenirNext-UltraLight has NO @font-face declared in the site CSS yet,
    // and no .ttf shipped. Until you add both, any role using this weight
    // (artworkCardCaption / artworkCardMeta en) falls back to system sans-serif
    // — NOT to Avenir Regular. See the note in the delivery message.
    ultraLight: 'AvenirNext-UltraLight',
    regular: 'AvenirNext-Regular',
    medium: 'AvenirNext-Medium',
  },
};

// ── 1b. Display typefaces ────────────────────────────────────────────────
// Latin-only faces used only by roles that opt in with `font: '<key>'` in
// TYPE_SCALE. They ship NO Chinese glyphs, so the resolver always appends the
// CJK_FALLBACK family after them (see below) — Chinese text in a Palatino /
// Caslon / Iowan role still renders branded (PingFang) instead of a system
// serif.
export const FONT_FAMILIES = {
  palatino: {
    regular: 'Palatino',
  },
  bigCaslon: {
    medium: 'BigCaslon-Medium',
  },
  jost: {                    // Nav link face (en only) → Jost-Medium
    medium: 'Jost-Medium',
  },
  iowanOldStyle: {
    roman: 'IowanOldStyle-Roman',
    italic: 'IowanOldStyle-Italic',
    bold: 'IowanOldStyle-Bold',
    boldItalic: 'IowanOldStyle-BoldItalic',
    black: 'IowanOldStyle-Black',
    blackItalic: 'IowanOldStyle-BlackItalic',
  },
};

// ── 2. Resolution config (read by useFont — you rarely edit these) ────────

// Generic CSS family tailing each language-default stack.
export const LANG_DEFAULT = {
  zh: { generic: 'sans-serif' },
  en: { generic: 'sans-serif' },
};

// CJK-capable family appended to every display-typeface stack.
export const CJK_FALLBACK = 'PingFang-Regular';

// Generic CSS family tailing each display-typeface stack.
export const TYPEFACE_GENERIC = {
  palatino: 'serif',
  bigCaslon: 'serif',
  jost: 'sans-serif',
  iowanOldStyle: 'serif',
};

// Variant picked when a role names a `font` but omits `variant`.
export const TYPEFACE_DEFAULT_VARIANT = {
  palatino: 'regular',
  bigCaslon: 'medium',
  jost: 'medium',
  iowanOldStyle: 'roman',
};

// ── 3. TYPE_SCALE ────────────────────────────────────────────────────────
// One entry per layout role. Each language spec supplies EITHER:
//   • weight            → that weight of the language-default face, OR
//   • font [+ variant]  → a display typeface from FONT_FAMILIES.
//                         (`weight` may still be given as the fallback used
//                         only if the display face fails to resolve.)
// Optional fontSize / lineHeight / letterSpacing may be attached to any role;
// roles that omit them set sizing inline in their own component CONFIG (noted
// per role). fontSize / lineHeight are pt→px 1:1; letterSpacing is
// Illustrator tracking / 1000 (native em).
export const TYPE_SCALE = {
  sectionTitle: {                        // "艺术家/Artists" page heading → Big Caslon Medium
    zh: { font: 'bigCaslon', weight: 'regular', fontSize: 60, lineHeight: 72, letterSpacing: 14 / 1000 },
    en: { font: 'bigCaslon', weight: 'regular', fontSize: 60, lineHeight: 72, letterSpacing: 14 / 1000 },
  },

  artistListItem: {                      // 蔡向燭 / 陈鸿志 / … index list → Palatino
    zh: { font: 'palatino', weight: 'thin',    fontSize: 43, lineHeight: 92, letterSpacing: 50 / 1000 },
    en: { font: 'palatino', weight: 'regular', fontSize: 43, lineHeight: 92, letterSpacing: 50 / 1000 },
  },

  artistName: {                          // "汪一舟" detail-page heading → Big Caslon Medium
    zh: { font: 'bigCaslon', weight: 'medium',  fontSize: 56, lineHeight: 67.2, letterSpacing: 100 / 1000 },
    en: { font: 'bigCaslon', weight: 'regular', fontSize: 56, lineHeight: 67.2, letterSpacing: 100 / 1000 },
  },

  // NAV — picks the font FILE. All other nav styling lives in NAV_CONFIG in
  // components/nav/MainNav.js.
  //   zh → stays on the PingFang language default (weight-only).
  //   en → Jost-Medium display face. `weight: 'regular'` is kept only as the
  //        fallback used if 'jost' ever fails to resolve (see TYPE_SCALE
  //        header note above).
  navLink: {
    zh: { weight: 'regular' },
    en: { font: 'jost', variant: 'medium', weight: 'regular' },
  },

  // MANAGER NAV — weight-only. Sizing/spacing inline in ManagerNav.js.
  managerNavLink: {
    zh: { weight: 'medium' },
    en: { weight: 'regular' },
  },

  // ⚠️ Placeholder sizing (old hardcoded 12px) — resample from the comp.
  languageSwitcher: {
    zh: { weight: 'regular', fontSize: 12, lineHeight: 16, letterSpacing: 0 },
    en: { weight: 'regular', fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  },

  // ── Exhibitions list page (weight-only; sizing in EXHIBITIONS_CONFIG) ────
  exhibitionCaption: {                   // ExhibitionCard title + date
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  exhibitionSectionHeading: {            // "Current" / "Past" / year heading
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },
  yearDropdownLabel: {                   // Year-filter trigger + menu items
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  exhibitionCardLabel: {                 // Fallback gallery-name label (no cover)
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  bodyText: {                            // Generic paragraph copy / empty states
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },

  // ── Artworks page (weight-only; sizing in ARTWORK_CONFIG) ───────────────
  artworkSectionTitle: {                 // "作品" / "Artworks" heading
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  artworkCardArtist: {                   // Artist name line on each card
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  artworkCardCaption: {                  // Artist / title (italic) line → Avenir Next Ultra Light (en)
    zh: { weight: 'light' },
    en: { weight: 'ultraLight' },        // ⚠️ needs AvenirNext-UltraLight @font-face (see FONT_FACES.en note)
  },
  artworkCardMeta: {                     // Year / medium / size line → Avenir Next Ultra Light (en)
    zh: { weight: 'light' },
    en: { weight: 'ultraLight' },        // ⚠️ needs AvenirNext-UltraLight @font-face (see FONT_FACES.en note)
  },
  artworkCardEnquire: {                  // "咨询" / "Enquire" button label
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },
  artworkCardFallback: {                 // "无图片" / "No Image" placeholder
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },

  // ── Artist pages (weight-only; sizing in ARTIST_CONFIG) ─────────────────
  artistListMeta: {                      // Secondary line beside each index name
    zh: { weight: 'light' },
    en: { weight: 'regular' },           // no Avenir Light available
  },
  artistBio: {                           // Detail-page biography paragraph → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'light' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },
  artistWorksHeading: {                  // "作品" / "Works" sub-heading
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },

  // ── About page (weight-only; sizing in About CONFIG.text.body) ──────────
  // Centered single-column layout: brand logo image + body copy only, no
  // heading. Language-default face (PingFang / Avenir Next), regular weight —
  // matches the site's generic `body` / `bodyText` convention. If you later
  // reintroduce an "关于 / About" heading, add an `aboutHeading` role here.
  aboutBody: {                           // MOODSEA intro paragraphs (caption + introductions)
    zh: { weight: 'regular' },
    en: { weight: 'regular' },
  },

  // ── Exhibition & Fair detail pages (shared; sizing in TEXT/LAYOUT_CONFIG)─
  detailTitle: {
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },
  detailSubtitle: {                      // → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'regular' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },
  detailDate: {
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },
  detailCaption: {                       // Works-grid + cover captions → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'regular' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },
  detailBody: {                          // Intro / description / press release → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'regular' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },
  detailSectionHeading: {
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },
  detailLink: {                          // Works + related-artist text links → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'regular' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },
  detailMetaLabel: {
    zh: { weight: 'medium' },
    en: { weight: 'medium' },
  },
  detailMetaValue: {                     // Artists: / Preface: lines + meta values → Iowan Old Style Roman
    zh: { font: 'iowanOldStyle', weight: 'regular' },
    en: { font: 'iowanOldStyle', weight: 'regular' },
  },

  // ── Generic / fallback ──────────────────────────────────────────────────
  body: {                                // Default — used by useFont() w/o a role
    zh: { weight: 'regular', fontSize: 15, lineHeight: 24, letterSpacing: 0 },
    en: { weight: 'regular', fontSize: 15, lineHeight: 24, letterSpacing: 0 },
  },
  LoadingLayer: {                        // Skeleton / loading pages
    zh: { weight: 'regular', fontSize: 13, lineHeight: 20, letterSpacing: 1 / 1000 },
    en: { weight: 'regular', fontSize: 13, lineHeight: 20, letterSpacing: 1 / 1000 },
  },
};
