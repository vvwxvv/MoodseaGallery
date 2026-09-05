"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

import useAboutData from "@/components/pages/about/hooks/useAboutData";
import AlertInfo from "@/components/alerts/AlertInfo";
import { renderArrayContent } from "@/utils/textFormatting";
import useFont from "@/hooks/useFont";

// ─────────────────────────────────────────────────────────────────────────────
//  ✦ CONFIG — 分区清晰，改哪块看哪块
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = Object.freeze({
  // ── 页面容器 ──
  page: {
    maxWidth: 1200,
    paddingX: { xs: "48px", md: "48px" },
    paddingY: { xs: "48px", md: "72px" },
    align: "center", // "left" | "center" | "right"
  },

  // ── 两列布局 ──
  layout: {
    columnGap: { xs: 0, md: "50px" },
  },

  // ── 左侧文本列 ──
  text: {
    flex: 1.4,
    maxWidth: { xs: "100%", md: 500 },
    heading: {
      size: "20px",
      weight: 400,
      margin: "0 0 32px 0",
      letterSpacing: "0.02em",
    },
    body: {
      size: "12px",
      weight: 500,
      lineHeight: 1.7,
      opacity: 0.62,
      gap: "1.2em",
      align: "justify",
    },
  },

  // ── 右侧图片列 ──
  //  图片始终保持原始比例，不裁切、不拉伸
  image: {
    fit: "contain", // 保持原比例，完整显示
    quality: 90,
    borderRadius: 0,

    // 远程/动态 API 图片默认 true，直接可用；
    // 在 next.config 配好 remotePatterns 后可改 false 开启优化。
    unoptimized: true,

    // ★ 桌面：高度上限为主，宽度按原比例自动 ★
    desktop: {
      maxHeight: 450, // 主控制：图片最大高度
      maxWidth: 600, // 安全上限：宽度算出来超过时才生效
    },

    // 移动端：宽度上限为主，高度按原比例自动
    mobile: {
      show: true,
      maxWidth: 460,
      gap: "60px",
    },

    // 图片真实比例读取前的占位比例（w / h）
    fallbackAspect: 0.85,
  },

  // ── Logo ──
  logo: {
    src: "/moodsea_gallery_whole_logo.png",
    width: "90px",
    topMargin: "120px",
  },
});

// 加载态：纯白空白页，无骨架屏
const LOADING_BG = "#ffffff";

// ─────────────────────────────────────────────────────────────────────────────
//  工具
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_MX = (() => {
  const map = {
    left: { ml: 0, mr: "auto" },
    center: { mx: "auto" },
    right: { ml: "auto", mr: 0 },
  };
  return map[CONFIG.page.align] || map.center;
})();

const EASE = [0.16, 1, 0.3, 1];
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

// 桌面盒子尺寸：以原始比例为准，先受 maxHeight 约束，再受 maxWidth 约束
const getDesktopBox = (aspect) => {
  let h = CONFIG.image.desktop.maxHeight;
  let w = h * aspect;
  if (w > CONFIG.image.desktop.maxWidth) {
    w = CONFIG.image.desktop.maxWidth;
    h = w / aspect;
  }
  return { w: Math.round(w), h: Math.round(h) };
};

// ─────────────────────────────────────────────────────────────────────────────
//  图片组件（next/image，fill）
//  盒子按图片真实比例生成 → contain 无留白、无裁切、比例不变
// ─────────────────────────────────────────────────────────────────────────────
const AboutImage = React.memo(function AboutImage({ src, alt, variant }) {
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(CONFIG.image.fallbackAspect);

  useEffect(() => {
    setFailed(false);
    setAspect(CONFIG.image.fallbackAspect);
  }, [src]);

  const handleError = useCallback(() => setFailed(true), []);

  const handleLoad = useCallback((e) => {
    const el = e.currentTarget || e.target;
    const w = el?.naturalWidth;
    const h = el?.naturalHeight;
    if (w && h) setAspect(w / h); // 保留原始比例，不做任何 clamp
  }, []);

  if (!src || failed) return null;

  const shared = {
    src,
    alt,
    fill: true,
    draggable: false,
    quality: CONFIG.image.quality,
    unoptimized: CONFIG.image.unoptimized,
    onLoad: handleLoad,
    onError: handleError,
    style: { objectFit: CONFIG.image.fit },
  };

  // ── 桌面：maxHeight 为主，宽度按原比例 ──
  if (variant === "desktop") {
    const { w, h } = getDesktopBox(aspect);
    return (
      <Box
        sx={{
          position: "relative",
          width: `${w}px`,
          height: `${h}px`,
          maxWidth: "100%",
          borderRadius: `${CONFIG.image.borderRadius}px`,
          overflow: "hidden",
        }}
      >
        <Image {...shared} sizes={`${CONFIG.image.desktop.maxWidth}px`} priority />
      </Box>
    );
  }

  // ── 移动端：maxWidth 为主，高度按原比例 ──
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: `${CONFIG.image.mobile.maxWidth}px`,
        aspectRatio: String(aspect),
        borderRadius: `${CONFIG.image.borderRadius}px`,
        overflow: "hidden",
      }}
    >
      <Image {...shared} sizes={`${CONFIG.image.mobile.maxWidth}px`} />
    </Box>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
//  加载态 / 错误态
// ─────────────────────────────────────────────────────────────────────────────
const AboutSkeleton = () => (
  <Box sx={{ minHeight: "100vh", backgroundColor: LOADING_BG }} />
);

const AboutStatusGuard = ({ isLoading, error, hasData, isCn, onRetry }) => {
  if (isLoading) return <AboutSkeleton />;
  if (error) {
    return (
      <AlertInfo
        message={isCn ? "连接失败" : "Connection Failed"}
        subMessage={isCn ? "系统暂时不可用" : "System temporarily unavailable"}
        buttonText={isCn ? "重试" : "Try Again"}
        onBack={onRetry}
        isCn={isCn}
      />
    );
  }
  if (!hasData) {
    return <AlertInfo message={isCn ? "暂无关于数据" : "No about data available"} isCn={isCn} />;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  主页面
// ─────────────────────────────────────────────────────────────────────────────
const AboutPageComponentTwoColum = () => {
  const {
    isCn,
    colors,
    fontFamily: aboutFontFamily,
    galleryAbout,
    isLoading: aboutLoading,
    error: aboutError,
    handleRetry: aboutRetry,
  } = useAboutData();

  const { fontFamily } = useFont(CONFIG.text.body.size);
  const effectiveFont = aboutFontFamily || fontFamily;

  const hasData = Boolean(galleryAbout);

  if (aboutLoading || aboutError || !hasData) {
    return (
      <AboutStatusGuard
        isLoading={aboutLoading}
        error={aboutError}
        hasData={hasData}
        isCn={isCn}
        onRetry={aboutRetry}
      />
    );
  }

  const { caption, introductions, portrait_image_url } = galleryAbout;
  const hasIntroduction = Array.isArray(introductions) && introductions.length > 0;
  const hasCaption = Boolean(caption && caption.trim());

  const headingStyle = {
    fontFamily: effectiveFont,
    fontSize: CONFIG.text.heading.size,
    fontWeight: CONFIG.text.heading.weight,
    color: colors.text,
    margin: CONFIG.text.heading.margin,
    letterSpacing: CONFIG.text.heading.letterSpacing,
  };

  const bodyStyle = {
    fontFamily: effectiveFont,
    fontSize: CONFIG.text.body.size,
    fontWeight: CONFIG.text.body.weight,
    color: colors.text,
    lineHeight: CONFIG.text.body.lineHeight,
    opacity: CONFIG.text.body.opacity,
    margin: `0 0 ${CONFIG.text.body.gap} 0`,
    textAlign: CONFIG.text.body.align,
  };

  const imgAlt = isCn ? "画廊肖像" : "Gallery portrait";

  return (
    <Box sx={{ backgroundColor: colors.background, color: colors.text, minHeight: "100vh" }}>
      <Box
        sx={{
          maxWidth: CONFIG.page.maxWidth,
          ...CONTENT_MX,
          px: CONFIG.page.paddingX,
          py: CONFIG.page.paddingY,
        }}
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Box
            sx={{
              display: { xs: "block", md: "flex" },
              alignItems: "flex-start",
              gap: CONFIG.layout.columnGap,
            }}
          >
            {/* ── 左侧文本列 ── */}
            <Box sx={{ flex: CONFIG.text.flex, minWidth: 0, maxWidth: CONFIG.text.maxWidth }}>
              <motion.div variants={itemVariants}>
                <h2 style={headingStyle}>{isCn ? "关于" : "About"}</h2>
                {hasCaption && <p style={bodyStyle}>{caption.replace(/\\n/g, "\n")}</p>}
                {hasIntroduction &&
                  introductions.map((item, i) => (
                    <p key={i} style={bodyStyle}>
                      {typeof item === "string" ? item : renderArrayContent([item], {})}
                    </p>
                  ))}
              </motion.div>

              {/* Logo */}
              <motion.div variants={itemVariants}>
                <img
                  src={CONFIG.logo.src}
                  alt="MOODSEA Gallery"
                  style={{
                    width: CONFIG.logo.width,
                    display: "block",
                    marginTop: CONFIG.logo.topMargin,
                  }}
                />
              </motion.div>

              {/* 移动端图片 */}
              {portrait_image_url && CONFIG.image.mobile.show && (
                <Box
                  sx={{
                    display: { xs: "flex", md: "none" },
                    justifyContent: "center",
                    mt: CONFIG.image.mobile.gap,
                  }}
                >
                  <motion.div
                    variants={itemVariants}
                    style={{ width: "100%", display: "flex", justifyContent: "center" }}
                  >
                    <AboutImage src={portrait_image_url} alt={imgAlt} variant="mobile" />
                  </motion.div>
                </Box>
              )}
            </Box>

            {/* ── 右侧图片列（桌面）── */}
            <Box sx={{ flex: "0 0 auto", display: { xs: "none", md: "block" } }}>
              <motion.div variants={itemVariants}>
                <AboutImage src={portrait_image_url} alt={imgAlt} variant="desktop" />
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default AboutPageComponentTwoColum;