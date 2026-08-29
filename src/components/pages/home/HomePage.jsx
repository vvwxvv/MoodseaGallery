"use client";

import React, { useContext, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import useFont from "@/hooks/useFont";
import { useReverseTheme } from "@/hooks/useReverseTheme";
import useAppTitle from "@/hooks/useAppTitle";
import AlertInfo from "@/components/alerts/AlertInfo";
import useCurrentExhibitionImage from "@/components/pages/home/hooks/useCurrentExhibitionImage";
import { formatDateRange } from "@/components/pages/exhibition/utils/exhibitionDates";

// ═════════════════════════════════════════════════════════════════════════
// 📖 TEXT DICTIONARY
// ═════════════════════════════════════════════════════════════════════════
const HOME_TEXT = {
  cover: {
    currentExhibitionLabel: { en: "Current Exhibition", cn: "当前展览" },
    untitled: { en: "Untitled", cn: "未命名" },
  },
  page: {
    loadingFailedTitle: { en: "Loading Failed", cn: "加载失败" },
    loadingFailedSubtitle: { en: "Check connection and retry", cn: "请检查网络连接后重试" },
    retryButton: { en: "Retry", cn: "重试" },
  },
};

// ═════════════════════════════════════════════════════════════════════════
// 🎨 HOME_COVER_CONFIG
// ═════════════════════════════════════════════════════════════════════════
const HOME_COVER_CONFIG = {

  PAGE: {
    OVERFLOW_X: "hidden",
    OVERFLOW_Y: "hidden",
    BOTTOM_GAP_CANCEL: "0px",
  },

  FULL_BLEED: {
    WIDTH: "100vw",
    LEFT: "50%",
    RIGHT: "50%",
    MARGIN_LEFT: "-50vw",
    MARGIN_RIGHT: "-50vw",
  },

  COVER_IMAGE: {
    Z_INDEX: 0,
    HEIGHT_DESKTOP: "88vh",
    HEIGHT_MOBILE: "62vh",
    MIN_HEIGHT_DESKTOP: "560px",
    MIN_HEIGHT_MOBILE: "420px",
    OFFSET_TOP: 50,
    HOVER_SCALE: 1.03,
    TRANSITION: "transform 0.6s ease",
    // ── loading state is WHITE, never grey ──
    LOADING_BG: "#ffffff",
    // ── reveal: image fades in gently while a white veil lifts off it ──
    REVEAL_DURATION: "1s",
    REVEAL_EASE: "cubic-bezier(0.22, 1, 0.36, 1)",
    REVEAL_INITIAL_SCALE: 1.04,
    VEIL_COLOR: "#ffffff",
  },

  LEGIBILITY_SCRIM: {
    Z_INDEX: 1,
    GRADIENT:
      "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 100%)",
  },

  TITLE_DATE_BOX: {
    Z_INDEX: 2,
    ALIGN_X: "left",
    ALIGN_Y: "center",
    INSET_X: 0,
    INSET_Y: 0,
    OFFSET_X: 0,
    OFFSET_Y: 0,
    TEXT_ALIGN: "auto",
    BACKGROUND: "transparent",
    PADDING_DESKTOP: "0 64px",
    PADDING_MOBILE: "0 20px",
    MAX_WIDTH: "900px",
    INNER_GAP: "8px",
    TEXT_COLOR: "#ffffff",
  },

  CURRENT_LABEL_BOX: {
    Z_INDEX: 2,
    ALIGN_X: "right",
    ALIGN_Y: "bottom",
    INSET_X: 0,
    INSET_Y: 30,
    OFFSET_X: 20,
    OFFSET_Y: 50,
    TEXT_ALIGN: "auto",
    BACKGROUND: "transparent",
    PADDING_DESKTOP: "0 64px",
    PADDING_MOBILE: "0 20px",
    TEXT_COLOR: "#ffffff",
  },

  TITLE: {
    FONT_ROLE: "exhibitionCaption",
    FONT_SIZE_DESKTOP: "68px",
    FONT_SIZE_MOBILE: "50px",
    FONT_WEIGHT: 500,
    LINE_HEIGHT: 1.2,
    LETTER_SPACING: "0px",
    UNDERLINE_HEIGHT: "1px",
    UNDERLINE_GAP: "2px",
    UNDERLINE_TRANSITION: "width 0.35s ease",
  },

  DATE: {
    FONT_ROLE: "exhibitionCaption",
    FONT_SIZE: "18px",
    FONT_WEIGHT: 500,
    LINE_HEIGHT: "20px",
    LETTER_SPACING: "0px",
    OPACITY: 0.9,
    SEPARATOR: "   ",
  },

  CURRENT_LABEL: {
    FONT_ROLE: "exhibitionSectionHeading",
    FONT_SIZE: "26px",
    FONT_WEIGHT: 600,
    LINE_HEIGHT: "34px",
    LETTER_SPACING: "0px",
  },

  EMPTY_COVER: {
    FONT_ROLE: "exhibitionCardLabel",
    FONT_SIZE: "12px",
    LINE_HEIGHT: "16px",
    LETTER_SPACING: "0.15em",
    COLOR: "#999",
    OPACITY: 0.6,
    TEXT_TRANSFORM: "uppercase",
  },

  // ── SKELETON — pure white base + a soft diagonal shimmer sweep ──
  SKELETON: {
    BASE_COLOR: "#ffffff",
    SHIMMER_GRADIENT:
      "linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(0,0,0,0.035) 50%, rgba(255,255,255,0) 70%)",
    SHIMMER_WIDTH: "60%",
    SHIMMER_DURATION: 1.8,
    PAGE_FADE_DURATION: 0.4,
  },
};

// ═════════════════════════════════════════════════════════════════════════
// 🧰 HELPERS
// ═════════════════════════════════════════════════════════════════════════
const pickText = (entry, isCn) => (isCn ? entry.cn : entry.en);

function getExhibitionSlug(exhibition) {
  return String(exhibition?.title || exhibition?._id || exhibition?.id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

function resolvePlacement(box) {
  const { ALIGN_X, ALIGN_Y, INSET_X, INSET_Y, OFFSET_X, OFFSET_Y, TEXT_ALIGN } = box;

  const style = {
    position: "absolute",
    top: "auto",
    left: "auto",
    right: "auto",
    bottom: "auto",
  };

  let translateX = `${OFFSET_X}px`;
  let translateY = `${-OFFSET_Y}px`;

  if (ALIGN_X === "left") {
    style.left = `${INSET_X}px`;
  } else if (ALIGN_X === "right") {
    style.right = `${INSET_X}px`;
  } else {
    style.left = "50%";
    translateX = `calc(-50% + ${OFFSET_X}px)`;
  }

  if (ALIGN_Y === "top") {
    style.top = `${INSET_Y}px`;
  } else if (ALIGN_Y === "bottom") {
    style.bottom = `${INSET_Y}px`;
  } else {
    style.top = "50%";
    translateY = `calc(-50% + ${-OFFSET_Y}px)`;
  }

  style.transform = `translate(${translateX}, ${translateY})`;
  style.textAlign = TEXT_ALIGN === "auto" ? ALIGN_X : TEXT_ALIGN;

  return style;
}

function textAlignToFlexAlign(textAlign) {
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "flex-end";
  return "flex-start";
}

// ═════════════════════════════════════════════════════════════════════════
// 🖼️ SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

/** Layer 0 — ExhibitionCoverImage.
 *  Sits under a white veil (Layer 0b) that lifts away once the image has
 *  loaded — feels like the photo is being "revealed", never a grey→sharp
 *  pop and never a blur artifact. */
function ExhibitionCoverImage({ src, alt, isHovered, onLoaded, isLoaded }) {
  const { COVER_IMAGE } = HOME_COVER_CONFIG;
  return (
    <img
      src={src}
      alt={alt}
      onLoad={onLoaded}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: COVER_IMAGE.Z_INDEX,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        display: "block",
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded
          ? isHovered
            ? `scale(${COVER_IMAGE.HOVER_SCALE})`
            : "scale(1)"
          : `scale(${COVER_IMAGE.REVEAL_INITIAL_SCALE})`,
        transition: [
          `opacity ${COVER_IMAGE.REVEAL_DURATION} ${COVER_IMAGE.REVEAL_EASE}`,
          COVER_IMAGE.TRANSITION,
        ].join(", "),
      }}
    />
  );
}

/** Layer 0b — CoverRevealVeil: a plain white sheet over the image that
 *  fades out the moment the photo finishes loading. This is the "elegant"
 *  reveal — no grey flash, no blur, just white receding to reveal the art. */
function CoverRevealVeil({ isLoaded }) {
  const { COVER_IMAGE } = HOME_COVER_CONFIG;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: COVER_IMAGE.Z_INDEX + 1,
        background: COVER_IMAGE.VEIL_COLOR,
        opacity: isLoaded ? 0 : 1,
        transition: `opacity ${COVER_IMAGE.REVEAL_DURATION} ${COVER_IMAGE.REVEAL_EASE}`,
        pointerEvents: "none",
      }}
    />
  );
}

/** Layer 1 — CoverLegibilityScrim */
function CoverLegibilityScrim() {
  const { LEGIBILITY_SCRIM } = HOME_COVER_CONFIG;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: LEGIBILITY_SCRIM.Z_INDEX,
        background: LEGIBILITY_SCRIM.GRADIENT,
        pointerEvents: "none",
      }}
    />
  );
}

/** Layer 2a — ExhibitionTitleDateBlock */
function ExhibitionTitleDateBlock({ title, metaLine, isHovered, isMobile }) {
  const { TITLE_DATE_BOX, TITLE, DATE } = HOME_COVER_CONFIG;
  const { fontFamily: titleFontFamily } = useFont(TITLE.FONT_ROLE);
  const { fontFamily: dateFontFamily } = useFont(DATE.FONT_ROLE);

  const placement = resolvePlacement(TITLE_DATE_BOX);
  const flexAlign = textAlignToFlexAlign(placement.textAlign);

  return (
    <div
      style={{
        ...placement,
        zIndex: TITLE_DATE_BOX.Z_INDEX,
        background: TITLE_DATE_BOX.BACKGROUND,
        padding: isMobile ? TITLE_DATE_BOX.PADDING_MOBILE : TITLE_DATE_BOX.PADDING_DESKTOP,
        maxWidth: TITLE_DATE_BOX.MAX_WIDTH,
        width: "max-content",
        display: "flex",
        flexDirection: "column",
        gap: TITLE_DATE_BOX.INNER_GAP,
        alignItems: flexAlign,
        pointerEvents: "none",
      }}
    >
      <p
        style={{
          position: "relative",
          display: "inline-block",
          background: "transparent",
          fontFamily: titleFontFamily,
          fontSize: isMobile ? TITLE.FONT_SIZE_MOBILE : TITLE.FONT_SIZE_DESKTOP,
          fontWeight: TITLE.FONT_WEIGHT,
          lineHeight: TITLE.LINE_HEIGHT,
          letterSpacing: TITLE.LETTER_SPACING,
          color: TITLE_DATE_BOX.TEXT_COLOR,
          margin: 0,
        }}
      >
        {title}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            bottom: TITLE.UNDERLINE_GAP,
            height: TITLE.UNDERLINE_HEIGHT,
            width: isHovered ? "100%" : "0%",
            backgroundColor: TITLE_DATE_BOX.TEXT_COLOR,
            transition: TITLE.UNDERLINE_TRANSITION,
          }}
        />
      </p>

      {metaLine && (
        <p
          style={{
            background: "transparent",
            fontFamily: dateFontFamily,
            fontSize: DATE.FONT_SIZE,
            fontWeight: DATE.FONT_WEIGHT,
            lineHeight: DATE.LINE_HEIGHT,
            letterSpacing: DATE.LETTER_SPACING,
            color: TITLE_DATE_BOX.TEXT_COLOR,
            opacity: DATE.OPACITY,
            margin: 0,
          }}
        >
          {metaLine}
        </p>
      )}
    </div>
  );
}

/** Layer 2b — ExhibitionCurrentLabel */
function ExhibitionCurrentLabel({ label, isMobile }) {
  const { CURRENT_LABEL_BOX, CURRENT_LABEL } = HOME_COVER_CONFIG;
  const { fontFamily } = useFont(CURRENT_LABEL.FONT_ROLE);

  const placement = resolvePlacement(CURRENT_LABEL_BOX);

  return (
    <div
      style={{
        ...placement,
        zIndex: CURRENT_LABEL_BOX.Z_INDEX,
        background: CURRENT_LABEL_BOX.BACKGROUND,
        padding: isMobile
          ? CURRENT_LABEL_BOX.PADDING_MOBILE
          : CURRENT_LABEL_BOX.PADDING_DESKTOP,
        pointerEvents: "none",
      }}
    >
      <p
        style={{
          background: "transparent",
          fontFamily,
          fontSize: CURRENT_LABEL.FONT_SIZE,
          fontWeight: CURRENT_LABEL.FONT_WEIGHT,
          lineHeight: CURRENT_LABEL.LINE_HEIGHT,
          letterSpacing: CURRENT_LABEL.LETTER_SPACING,
          color: CURRENT_LABEL_BOX.TEXT_COLOR,
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}

/** Layer 10 — EmptyCoverPlaceholder */
function EmptyCoverPlaceholder({ text }) {
  const { EMPTY_COVER } = HOME_COVER_CONFIG;
  const { fontFamily } = useFont(EMPTY_COVER.FONT_ROLE);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        fontFamily,
        fontSize: EMPTY_COVER.FONT_SIZE,
        lineHeight: EMPTY_COVER.LINE_HEIGHT,
        letterSpacing: EMPTY_COVER.LETTER_SPACING,
        color: EMPTY_COVER.COLOR,
        opacity: EMPTY_COVER.OPACITY,
        textTransform: EMPTY_COVER.TEXT_TRANSFORM,
      }}
    >
      {text}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 🏛️ CURRENT EXHIBITION COVER (composition)
// ═════════════════════════════════════════════════════════════════════════
function CurrentExhibitionCover({ exhibition, coverImageUrl, isCn, isMobile, fallbackName }) {
  const t = (entry) => pickText(entry, isCn);
  const { FULL_BLEED, COVER_IMAGE, DATE } = HOME_COVER_CONFIG;

  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const title = exhibition?.title || t(HOME_TEXT.cover.untitled);
  const dateRange = formatDateRange(exhibition, isCn);
  const artistOrVenue = exhibition?.artist || exhibition?.venue || "";
  const metaLine = [artistOrVenue, dateRange].filter(Boolean).join(DATE.SEPARATOR);
  const slug = getExhibitionSlug(exhibition);

  const baseHeight = isMobile ? COVER_IMAGE.HEIGHT_MOBILE : COVER_IMAGE.HEIGHT_DESKTOP;
  const baseMinHeight = isMobile ? COVER_IMAGE.MIN_HEIGHT_MOBILE : COVER_IMAGE.MIN_HEIGHT_DESKTOP;
  const coverHeight = `calc(${baseHeight} + ${COVER_IMAGE.OFFSET_TOP}px)`;
  const coverMinHeight = `calc(${baseMinHeight} + ${COVER_IMAGE.OFFSET_TOP}px)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "relative",
        width: FULL_BLEED.WIDTH,
        left: FULL_BLEED.LEFT,
        right: FULL_BLEED.RIGHT,
        marginLeft: FULL_BLEED.MARGIN_LEFT,
        marginRight: FULL_BLEED.MARGIN_RIGHT,
        marginTop: `-${COVER_IMAGE.OFFSET_TOP}px`,
        marginBottom: 0,
        background: "transparent",
        display: "block",
        lineHeight: 0,
      }}
    >
      <Link
        href={`/exhibitions/${slug}`}
        style={{ display: "block", textDecoration: "none", background: "transparent", lineHeight: 0 }}
      >
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: "100%",
            height: coverHeight,
            minHeight: coverMinHeight,
            position: "relative",
            overflow: "hidden",
            backgroundColor: coverImageUrl ? COVER_IMAGE.LOADING_BG : COVER_IMAGE.LOADING_BG,
            cursor: "pointer",
            isolation: "isolate",
          }}
        >
          {coverImageUrl ? (
            <>
              <ExhibitionCoverImage
                src={coverImageUrl}
                alt={title}
                isHovered={isHovered}
                isLoaded={imgLoaded}
                onLoaded={() => setImgLoaded(true)}
              />
              <CoverRevealVeil isLoaded={imgLoaded} />
              <CoverLegibilityScrim />
              <ExhibitionTitleDateBlock
                title={title}
                metaLine={metaLine}
                isHovered={isHovered}
                isMobile={isMobile}
              />
              <ExhibitionCurrentLabel
                label={t(HOME_TEXT.cover.currentExhibitionLabel)}
                isMobile={isMobile}
              />
            </>
          ) : (
            <EmptyCoverPlaceholder text={fallbackName} />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// SKELETON — pure white base + a soft diagonal shimmer sweep
// (no grey blocks, no pulsing opacity — just a light glint passing over
// a white surface, like glass catching light)
// ═════════════════════════════════════════════════════════════════════════
function ShimmerSweep() {
  const { SKELETON } = HOME_COVER_CONFIG;
  return (
    <motion.div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width: SKELETON.SHIMMER_WIDTH,
        background: SKELETON.SHIMMER_GRADIENT,
      }}
      initial={{ left: "-60%" }}
      animate={{ left: "110%" }}
      transition={{
        duration: SKELETON.SHIMMER_DURATION,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function HomeSkeleton({ isMobile }) {
  const { SKELETON } = HOME_COVER_CONFIG;
  const coverHeight = isMobile ? "62vh" : "88vh";
  const coverMinHeight = isMobile ? "420px" : "560px";

  return (
    <div
      style={{
        backgroundColor: SKELETON.BASE_COLOR,
        overflowX: "hidden",
        overflowY: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100vw",
          marginLeft: "-50vw",
          left: "50%",
          right: "50%",
          height: coverHeight,
          minHeight: coverMinHeight,
          overflow: "hidden",
          backgroundColor: SKELETON.BASE_COLOR,
        }}
      >
        {/* soft light sweep — the only motion, everything else stays a
            calm, pure white plane. Elegant, not "loading-spinner" ugly. */}
        <ShimmerSweep />

        {/* a whisper-thin bottom hairline so the block doesn't feel like
            a void against the page background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.04)",
          }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// 🏠 PAGE
// ═════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { colors } = useReverseTheme();
  const { displayName: fallbackName } = useAppTitle(isCn ? "cn" : "en");

  const t = (entry) => pickText(entry, isCn);

  const {
    currentExhibition,
    coverImageUrl,
    isLoading,
    hasError,
    refetch,
  } = useCurrentExhibitionImage(isCn);

  if (hasError) {
    return (
      <AlertInfo
        message={t(HOME_TEXT.page.loadingFailedTitle)}
        subMessage={t(HOME_TEXT.page.loadingFailedSubtitle)}
        buttonText={t(HOME_TEXT.page.retryButton)}
        onBack={refetch}
        isCn={isCn}
      />
    );
  }

  const { PAGE, SKELETON } = HOME_COVER_CONFIG;

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SKELETON.PAGE_FADE_DURATION }}
        >
          <HomeSkeleton isMobile={isMobile} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SKELETON.PAGE_FADE_DURATION }}
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            overflowX: PAGE.OVERFLOW_X,
            overflowY: PAGE.OVERFLOW_Y,
            marginBottom: PAGE.BOTTOM_GAP_CANCEL !== "0px" ? `-${PAGE.BOTTOM_GAP_CANCEL}` : 0,
            fontSize: 0,
            lineHeight: 0,
          }}
        >
          <CurrentExhibitionCover
            exhibition={currentExhibition}
            coverImageUrl={coverImageUrl}
            isCn={isCn}
            isMobile={isMobile}
            fallbackName={fallbackName}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
