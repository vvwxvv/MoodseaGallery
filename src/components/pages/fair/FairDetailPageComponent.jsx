"use client";

import React, { useContext, useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// Context & Hooks
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import useFont from "@/hooks/useFont";
import useImageZoom from "@/hooks/useImageZoom";
import useFairDetailData from "@/components/pages/fair/hooks/useFairDetailData";
import { useReverseTheme } from "@/hooks/useReverseTheme";

// Alerts / states
import ErrorState from "@/components/alerts/ErrorState";
import FormAlert from "@/components/alerts/FormAlert";
import NoDataInfo from "@/components/alerts/NoDataInfo";

// Images
import ImageZoomModal from "@/components/images/ImageZoomModal";

// ============================================================
// SHARED SIZE
//   Body-family text size — matches the About page body (12px).
//   Body / cover caption / image caption / metadata value route through
//   this. (Title / Section / Date keep their own larger sizes for
//   hierarchy, same as the exhibition detail page.)
// ============================================================
const BODY_TEXT_SIZE = "12px";

// ============================================================
// 🅰️  TEXT / TYPOGRAPHY CONFIG  — tune every piece of text here
// ------------------------------------------------------------
//  QUICK MAP:
//    • Big page title           → TITLE            (26/22, KEPT)
//    • Section subtitle / Date  → SECTION / DATE   (KEPT for hierarchy)
//    • Section labels           → SECTION_HEADING  ▸ MATCHES NEWS HEADING
//        ("Works" / "Related Artists": family from labelFont (useFont()
//         no-role), 28/18, weight 500, 0.01em, not uppercase.)
//    • Body / captions / meta   → BODY_TEXT_SIZE (12px, About body)
//    • Metadata field labels    → METADATA_LABEL  (micro-label, KEPT)
//
//  Roles are SHARED with the exhibition detail page. color: null follows
//  the theme; BASE_COLOR recolours EVERY element (still overridable).
// ============================================================
const TEXT_CONFIG = {
  BASE_COLOR: null,

  TITLE: {
    role: "detailTitle",
    fontSizeDesktop: "26px",
    fontSizeMobile: "22px",
    fontWeight: 500,
    color: null,
    opacity: 1,
    letterSpacing: "0.01em",
    lineHeight: 1.3,
    marginBottom: 8,
    italicizeBeforeColon: true,
  },

  SECTION: {
    role: "detailSubtitle",
    fontSizeDesktop: "16px", // kept — hierarchy
    fontSizeMobile: "15px",
    fontWeight: 400,
    color: null,
    opacity: 0.7,
    letterSpacing: "0em",
    lineHeight: 1.5,
    marginBottom: 8,
  },

  DATE: {
    role: "detailDate",
    fontSizeDesktop: "14px", // kept — hierarchy
    fontSizeMobile: "13px",
    fontWeight: 600,
    color: null,
    opacity: 0.9,
    letterSpacing: "0.02em",
    lineHeight: 1.5,
    marginBottom: 0,
  },

  COVER_CAPTION: {
    role: "detailCaption",
    fontSizeDesktop: BODY_TEXT_SIZE, // → 12px (was 13/12)
    fontSizeMobile: BODY_TEXT_SIZE,
    fontWeight: 400,
    color: null,
    opacity: 0.5,
    letterSpacing: "0em",
    lineHeight: 1.5,
    italic: true,
    marginBottom: 0,
  },

  BODY: {
    role: "detailBody",
    fontSizeDesktop: BODY_TEXT_SIZE, // → 12px (was 14)
    fontSizeMobile: BODY_TEXT_SIZE,
    fontWeight: 400,
    color: null,
    opacity: 0.85,
    letterSpacing: "0em",
    lineHeight: 1.8,
    textAlign: "justify",
    marginBottom: 16,
  },

  IMAGE_CAPTION: {
    role: "detailCaption",
    fontSizeDesktop: BODY_TEXT_SIZE, // → 12px (was 13/12)
    fontSizeMobile: BODY_TEXT_SIZE,
    fontWeight: 400,
    color: null,
    opacity: 0.5,
    letterSpacing: "0em",
    lineHeight: 1.5,
    italic: true,
    marginTop: 12,
  },

  // ▸▸ SECTION LABELS — MATCHES NEWS / LIST-PAGE HEADING ◂◂
  //   Family comes from `labelFont` (useFont() no-role) in the component,
  //   overriding `role`. 28/18, weight 500, 0.01em, not uppercase.
  //   ↩ old small divider: 11/11, weight 700, 0.15em, uppercase, opacity 0.6.
  SECTION_HEADING: {
    role: "detailSectionHeading", // fallback family only; labelFont overrides
    fontSizeDesktop: "28px",
    fontSizeMobile: "18px",
    fontWeight: 500,
    color: null,
    opacity: 1,
    letterSpacing: "0.01em",
    lineHeight: 1.3,
    marginBottom: 24,
  },

  LINK: {
    role: "detailLink",
    fontSizeDesktop: "15px",
    fontSizeMobile: "13px",
    fontWeight: 400,
    color: null,
    idleOpacity: 0.75,
    hoverOpacity: 1,
    lineHeight: 1.5,
    rowGap: 4,
  },

  METADATA_LABEL: {
    role: "detailMetaLabel",
    fontSizeDesktop: "12px",
    fontSizeMobile: "12px",
    fontWeight: 500,
    color: null,
    opacity: 0.45,
    letterSpacing: "0.12em",
    lineHeight: 1.5,
    textTransform: "uppercase",
  },

  METADATA_VALUE: {
    role: "detailMetaValue",
    fontSizeDesktop: BODY_TEXT_SIZE, // → 12px (was 15)
    fontSizeMobile: BODY_TEXT_SIZE,
    fontWeight: 400,
    color: null,
    opacity: 0.9,
    letterSpacing: "0em",
    lineHeight: 1.6,
  },
};

// ============================================================
// 🅱️  LAYOUT / SPACING CONFIG  — all gaps between sections (px)
// ============================================================
const LAYOUT_CONFIG = {
  HEADER_MB_DESKTOP: 48,
  HEADER_MB_MOBILE: 32,

  COVER_MB_DESKTOP: 64,
  COVER_MB_MOBILE: 40,

  BODY_MT: 32,
  BODY_BLOCK_GAP: 32,
  PARA_TO_IMAGE_GAP: 8,

  VIDEO_MT: 48,
  VIDEO_MB: 48,

  RELATED_MT_DESKTOP: 48,
  RELATED_MT_MOBILE: 48,
  RELATED_SECTION_GAP: 48,

  METADATA_MT_DESKTOP: 80,
  METADATA_MT_MOBILE: 64,
  METADATA_PT_DESKTOP: 40,
  METADATA_PT_MOBILE: 32,
  METADATA_ROW_PY_DESKTOP: 20,
  METADATA_ROW_PY_MOBILE: 16,
  METADATA_LABEL_MINWIDTH: 200,
};

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const FALLBACK_IMAGE = "/no-image.png";

function formatSimpleDateRange(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function extractParagraphs(content) {
  if (!content) return [];

  const splitLines = (str) =>
    str
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

  if (Array.isArray(content)) {
    return content.flatMap((item) =>
      typeof item === "string" ? splitLines(item) : []
    );
  }

  if (typeof content === "string") {
    return splitLines(content);
  }

  return [];
}

function pickResponsive(cfg, isMobile, key = "fontSize") {
  const d = cfg[`${key}Desktop`];
  const m = cfg[`${key}Mobile`];
  if (d != null || m != null) {
    return isMobile ? m ?? d : d ?? m;
  }
  return cfg[key];
}

function resolveColor(cfg, themeText) {
  return cfg.color || TEXT_CONFIG.BASE_COLOR || themeText;
}

function resolveFont(cfg, fonts) {
  return (cfg.role && fonts[cfg.role]) || fonts.detailBody;
}

function textSx(cfg, ctx) {
  const sx = {
    fontFamily: resolveFont(cfg, ctx.fonts),
    fontSize: pickResponsive(cfg, ctx.isMobile, "fontSize"),
    fontWeight: cfg.fontWeight,
    color: resolveColor(cfg, ctx.themeText),
    opacity: cfg.opacity,
    lineHeight: cfg.lineHeight,
  };
  if (cfg.letterSpacing) sx.letterSpacing = cfg.letterSpacing;
  if (cfg.textAlign) sx.textAlign = cfg.textAlign;
  if (cfg.textTransform) sx.textTransform = cfg.textTransform;
  if (cfg.italic) sx.fontStyle = "italic";
  return sx;
}

const METADATA_LABELS = {
  section: { en: "Section", cn: "板块" },
  booth: { en: "Booth", cn: "展位" },
  venue: { en: "Venue", cn: "场馆" },
  location: { en: "Location", cn: "地点" },
  curator: { en: "Curator", cn: "策展人" },
  organiser: { en: "Organiser", cn: "主办方" },
  participating_artists: { en: "Participating Artists", cn: "参展艺术家" },
  language: { en: "Language", cn: "语言" },
};

const METADATA_ORDER = [
  "section",
  "booth",
  "venue",
  "location",
  "curator",
  "organiser",
  "participating_artists",
  "language",
];

// ============================================================
// Hover-underline text link (shared by Works + Related Artists)
// ============================================================
function HoverUnderlineLink({ label, href, index, isMobile, fontFamily, textColor }) {
  const [isHovered, setIsHovered] = useState(false);
  const C = TEXT_CONFIG.LINK;
  const color = C.color || TEXT_CONFIG.BASE_COLOR || textColor;
  const fontSize = pickResponsive(C, isMobile, "fontSize");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: isMobile ? 0 : index * 0.04, duration: 0.3 }}
    >
      <Link
        href={href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          textDecoration: "none",
          color,
          display: "inline-block",
          position: "relative",
          fontFamily,
          fontSize,
          fontWeight: C.fontWeight,
          lineHeight: C.lineHeight,
          opacity: isHovered ? C.hoverOpacity : C.idleOpacity,
          padding: "2px 0 4px",
          transition: "opacity 0.2s ease",
          outline: "none",
        }}
      >
        {label}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "1px",
            backgroundColor: color,
            transformOrigin: "left",
            pointerEvents: "none",
          }}
        />
      </Link>
    </motion.div>
  );
}

// ============================================================
// PLAIN WHITE LOADING STATE
// ============================================================
function FairDetailLoading() {
  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        width: "100%",
      }}
    />
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function FairDetailPageComponent() {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { slug } = useParams();

  const fonts = {
    detailTitle: useFont("detailTitle").fontFamily,
    detailSubtitle: useFont("detailSubtitle").fontFamily,
    detailDate: useFont("detailDate").fontFamily,
    detailCaption: useFont("detailCaption").fontFamily,
    detailBody: useFont("detailBody").fontFamily,
    detailSectionHeading: useFont("detailSectionHeading").fontFamily,
    detailLink: useFont("detailLink").fontFamily,
    detailMetaLabel: useFont("detailMetaLabel").fontFamily,
    detailMetaValue: useFont("detailMetaValue").fontFamily,
  };

  // ▸ Section-label font family — no role, so it MATCHES the News heading. ◂
  const labelFont = useFont().fontFamily;

  const { colors } = useReverseTheme() || { colors: { text: "#000", background: "#fff" } };
  const { modalOpen, selectedImage, handleImageClick, handleModalClose } = useImageZoom();

  const ctx = { isMobile, fonts, themeText: colors.text };

  const {
    fair,
    isLoading,
    hasError,
    firstError,
    galleryImages = [],
  } = useFairDetailData(slug, isCn);

  const fairTitle = fair?.title || (isCn ? "无题" : "Untitled");
  const dateRange =
    formatSimpleDateRange(fair?.date_start, fair?.date_end) || fair?.vip_preview_date;

  const finalCoverImageUrl = useMemo(
    () =>
      fair?.cover_img_url && fair.cover_img_url !== FALLBACK_IMAGE
        ? fair.cover_img_url
        : null,
    [fair]
  );

  const pressReleaseParas = useMemo(
    () => extractParagraphs(fair?.press_release),
    [fair]
  );

  const relatedArtworks = useMemo(() => {
    if (!fair?.related_artwork_title) return [];
    const raw = Array.isArray(fair.related_artwork_title)
      ? fair.related_artwork_title
      : [fair.related_artwork_title];
    return raw.filter((t) => String(t || "").trim());
  }, [fair]);

  const relatedArtists = useMemo(() => {
    if (!fair?.related_gallery_artist) return [];
    const raw = Array.isArray(fair.related_gallery_artist)
      ? fair.related_gallery_artist
      : [fair.related_gallery_artist];
    return raw.filter((n) => String(n || "").trim());
  }, [fair]);

  const pairedBody = useMemo(() => {
    const max = Math.max(pressReleaseParas.length, galleryImages.length);
    const rows = [];
    for (let i = 0; i < max; i++) {
      rows.push({
        text: pressReleaseParas[i] ?? null,
        image: galleryImages[i] ?? null,
      });
    }
    return rows;
  }, [pressReleaseParas, galleryImages]);

  if (isLoading) {
    return <FairDetailLoading />;
  }

  if (hasError) {
    return (
      <Box sx={{ mt: 3, px: 2 }}>
        <ErrorState error={firstError} isCn={isCn} />
        <FormAlert
          severity="error"
          message={
            isCn ? "加载博览会数据时出错，请稍后重试。" : "An error occurred while loading fair data."
          }
        />
      </Box>
    );
  }

  if (!fair) {
    return (
      <Box sx={{ mt: 3 }}>
        <NoDataInfo schemaName="fair" isCn={isCn} />
      </Box>
    );
  }

  // Section-label style — matches the News heading (family via labelFont).
  const sectionHeadingSx = {
    ...textSx(TEXT_CONFIG.SECTION_HEADING, ctx),
    fontFamily: labelFont, // override role font → News-heading family
    mb: `${TEXT_CONFIG.SECTION_HEADING.marginBottom}px`,
    pb: "8px",
    borderBottom: `1px solid ${colors.text}`,
    display: "inline-block",
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: colors.background, color: colors.text }}>
      <Container maxWidth="md" sx={{ px: { xs: 3, md: 4 }, py: { xs: 6, md: 10 } }}>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 1. Header (Title, Section & Date) */}
          <Box
            sx={{
              mb: {
                xs: `${LAYOUT_CONFIG.HEADER_MB_MOBILE}px`,
                md: `${LAYOUT_CONFIG.HEADER_MB_DESKTOP}px`,
              },
            }}
          >
            <Typography
              component="h1"
              sx={{
                ...textSx(TEXT_CONFIG.TITLE, ctx),
                m: 0,
                mb: `${TEXT_CONFIG.TITLE.marginBottom}px`,
              }}
            >
              {TEXT_CONFIG.TITLE.italicizeBeforeColon && fairTitle.includes(":") ? (
                <>
                  <span style={{ fontStyle: "italic" }}>{fairTitle.split(":")[0]}</span>
                  :{fairTitle.split(":").slice(1).join(":")}
                </>
              ) : (
                fairTitle
              )}
            </Typography>

            {fair.section && (
              <Typography
                sx={{
                  ...textSx(TEXT_CONFIG.SECTION, ctx),
                  whiteSpace: "pre-line",
                  m: 0,
                  mb: `${TEXT_CONFIG.SECTION.marginBottom}px`,
                }}
              >
                {fair.section.replace(/\\n/g, "\n")}
              </Typography>
            )}

            {dateRange && (
              <Typography
                sx={{
                  ...textSx(TEXT_CONFIG.DATE, ctx),
                  m: 0,
                  mb: `${TEXT_CONFIG.DATE.marginBottom}px`,
                }}
              >
                {dateRange}
              </Typography>
            )}
          </Box>

          {/* 2. Cover Image & Caption */}
          {finalCoverImageUrl ? (
            <Box
              sx={{
                mb: {
                  xs: `${LAYOUT_CONFIG.COVER_MB_MOBILE}px`,
                  md: `${LAYOUT_CONFIG.COVER_MB_DESKTOP}px`,
                },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  cursor: "zoom-in",
                  backgroundColor: "rgba(0,0,0,0.02)",
                  mb: fair.caption ? 1.5 : 0,
                }}
                onClick={() => handleImageClick(finalCoverImageUrl)}
              >
                <img
                  src={finalCoverImageUrl}
                  alt={fairTitle}
                  style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                />
              </Box>
              {fair.caption && (
                <Typography
                  sx={{ ...textSx(TEXT_CONFIG.COVER_CAPTION, ctx), whiteSpace: "pre-line", px: 0.5 }}
                >
                  {fair.caption.replace(/\\n/g, "\n")}
                </Typography>
              )}
            </Box>
          ) : (
            fair.caption && (
              <Box
                sx={{
                  mb: {
                    xs: `${LAYOUT_CONFIG.COVER_MB_MOBILE}px`,
                    md: `${LAYOUT_CONFIG.COVER_MB_DESKTOP}px`,
                  },
                }}
              >
                <Typography sx={{ ...textSx(TEXT_CONFIG.COVER_CAPTION, ctx), whiteSpace: "pre-line" }}>
                  {fair.caption.replace(/\\n/g, "\n")}
                </Typography>
              </Box>
            )
          )}

          {/* 3. Press Release — paragraphs paired 1:1 with gallery images */}
          {pairedBody.length > 0 && (
            <Box sx={{ mt: `${LAYOUT_CONFIG.BODY_MT}px` }}>
              {pairedBody.map((row, idx) => (
                <Box
                  key={idx}
                  sx={{
                    mb: `${LAYOUT_CONFIG.BODY_BLOCK_GAP}px`,
                    "&:last-of-type": { mb: 0 },
                  }}
                >
                  {row.text && (
                    <Typography
                      sx={{
                        ...textSx(TEXT_CONFIG.BODY, ctx),
                        whiteSpace: "pre-line",
                        mb: row.image ? `${LAYOUT_CONFIG.PARA_TO_IMAGE_GAP}px` : 0,
                      }}
                    >
                      {row.text.replace(/\\n/g, "\n")}
                    </Typography>
                  )}

                  {row.image && (
                    <Box sx={{ width: "100%", mt: row.text ? 1 : 0 }}>
                      <Box
                        sx={{
                          width: "100%",
                          cursor: "zoom-in",
                          backgroundColor: "rgba(0,0,0,0.02)",
                        }}
                        onClick={() => handleImageClick(row.image.img_url)}
                      >
                        <img
                          src={row.image.img_url}
                          alt={row.image.caption_en || row.image.caption_cn || "Fair Image"}
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      </Box>
                      {(row.image.caption_en || row.image.caption_cn) && (
                        <Typography
                          sx={{
                            ...textSx(TEXT_CONFIG.IMAGE_CAPTION, ctx),
                            mt: `${TEXT_CONFIG.IMAGE_CAPTION.marginTop}px`,
                            px: 0.5,
                          }}
                        >
                          {isCn ? row.image.caption_cn : row.image.caption_en}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* 4. Video Player */}
          {fair.video_url && (
            <Box
              sx={{
                mt: `${LAYOUT_CONFIG.VIDEO_MT}px`,
                mb: `${LAYOUT_CONFIG.VIDEO_MB}px`,
                position: "relative",
                paddingTop: "56.25%",
                width: "100%",
                backgroundColor: "#000",
              }}
            >
              <iframe
                src={fair.video_url}
                title="Fair Video"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          )}

          {/* 5. Related Artwork & Gallery Artists */}
          {(relatedArtworks.length > 0 || relatedArtists.length > 0) && (
            <Box
              sx={{
                mt: fair.video_url
                  ? 2
                  : {
                      xs: `${LAYOUT_CONFIG.RELATED_MT_MOBILE}px`,
                      md: `${LAYOUT_CONFIG.RELATED_MT_DESKTOP}px`,
                    },
                display: "flex",
                flexDirection: "column",
                gap: `${LAYOUT_CONFIG.RELATED_SECTION_GAP}px`,
              }}
            >
              {relatedArtworks.length > 0 && (
                <Box>
                  <Typography sx={sectionHeadingSx}>{isCn ? "作品" : "Works"}</Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: `${TEXT_CONFIG.LINK.rowGap}px`,
                    }}
                  >
                    {relatedArtworks.map((work, idx) => (
                      <HoverUnderlineLink
                        key={`work-${idx}`}
                        label={work}
                        href={`/artworks?title=${encodeURIComponent(work)}`}
                        index={idx}
                        isMobile={isMobile}
                        fontFamily={ctx.fonts.detailLink}
                        textColor={colors.text}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {relatedArtists.length > 0 && (
                <Box>
                  <Typography sx={sectionHeadingSx}>
                    {isCn ? "相关艺术家" : "Related Artists"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: `${TEXT_CONFIG.LINK.rowGap}px`,
                    }}
                  >
                    {relatedArtists.map((artist, idx) => (
                      <HoverUnderlineLink
                        key={`artist-${idx}`}
                        label={artist}
                        href={`/artist/${encodeURIComponent(artist.replace(/\s+/g, "-"))}`}
                        index={idx}
                        isMobile={isMobile}
                        fontFamily={ctx.fonts.detailLink}
                        textColor={colors.text}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </motion.div>
      </Container>

      <ImageZoomModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        imageUrl={selectedImage || ""}
        title={fairTitle}
        enableGifRestart={true}
      />
    </Box>
  );
}