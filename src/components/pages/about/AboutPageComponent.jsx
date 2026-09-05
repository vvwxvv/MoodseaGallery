"use client";

import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

import useAboutData from "@/components/pages/about/hooks/useAboutData";
import AlertInfo from "@/components/alerts/AlertInfo";
import { renderArrayContent } from "@/utils/textFormatting";
import useFont from "@/hooks/useFont";

// ─────────────────────────────────────────────────────────────────────────────
//  ✦ CONFIG — 居中单列版｜所有可调项集中在此，改哪块看哪块
//    · 想整体上下移 → layout.contentTopOffset
//    · 想改 logo 与文字间距 → gap.logoToText
//    · 想改 logo 大小 → logo.width
//    · 想改行宽 → text.maxWidth
//    · 想改字号/字重/透明度 → text.body
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = Object.freeze({
  // ── 页面容器 ──
  page: {
    maxWidth: 900, // 内容区最大宽度（整页边界）
    paddingX: { xs: "32px", md: "48px" }, // 左右内边距
    paddingY: { xs: "48px", md: "72px" }, // 上下基础留白（呼吸空间，不用来做整体下移）
  },

  // ── 整体位置 ──
  layout: {
    // ★ 整块 About 内容（logo + 文字）距顶部的额外下移量 ★
    //   这是控制"整体往下移"的唯一钮；想再往下就调大，想上移就调小。
    //   （已含之前需求的 +30px：md 96 → 126，xs 40 → 70）
    contentTopOffset: { xs: "70px", md: "110px" },
  },

  // ── 居中 Logo（原比例、置于文字上方）──
  logo: {
    src: "/moodsea_gallery_whole_logo.png",
    width: { xs: "150px", md: "190px" }, // logo 显示宽度（高度按原比例自动）
    // 注：logo 距顶部由 layout.contentTopOffset 统一控制，这里不再单设 topMargin
  },

  // ── 间距 ──
  gap: {
    // ★ logo 与正文之间的间距 ★（已 +20px：md 80 → 100，xs 48 → 68）
    logoToText: { xs: "68px", md: "100px" },
  },

  // ── 文本（整体居中）──
  text: {
    maxWidth: 620, // 文字段落最大宽度（越小行越窄、断行越早）
    body: {
      size: "12px", // 字号（与站内一致；想更接近示意图可上调到 15px）
      weight: 500, // 字重
      lineHeight: 1.7, // 行高
      opacity: 0.62, // 文字透明度（越低越浅灰）
      gap: "1.2em", // 段落之间的间距
      align: "center", // 对齐
    },
  },
});

// 加载态：纯白空白页，无骨架屏
const LOADING_BG = "#ffffff";

// ─────────────────────────────────────────────────────────────────────────────
//  动效
// ─────────────────────────────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1];
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

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
const AboutPageComponent = () => {
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

  const { caption, introductions } = galleryAbout;
  const hasIntroduction = Array.isArray(introductions) && introductions.length > 0;
  const hasCaption = Boolean(caption && caption.trim());

  const bodyStyle = {
    fontFamily: effectiveFont,
    fontSize: CONFIG.text.body.size,
    fontWeight: CONFIG.text.body.weight,
    color: colors.text,
    lineHeight: CONFIG.text.body.lineHeight,
    opacity: CONFIG.text.body.opacity,
    margin: `0 0 ${CONFIG.text.body.gap} 0`,
    textAlign: CONFIG.text.body.align,
    whiteSpace: "pre-line",
  };

  return (
    <Box sx={{ backgroundColor: colors.background, color: colors.text, minHeight: "100vh" }}>
      {/* 内容容器：maxWidth + 左右内边距 + 上下基础留白 */}
      <Box
        sx={{
          maxWidth: CONFIG.page.maxWidth,
          mx: "auto",
          px: CONFIG.page.paddingX,
          py: CONFIG.page.paddingY,
          // ★ 整块内容整体下移（唯一顶部位置钮）★
          mt: CONFIG.layout.contentTopOffset,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {/* ── 居中 Logo（下方间距 = gap.logoToText）── */}
          <motion.div variants={itemVariants}>
            <Box
              component="img"
              src={CONFIG.logo.src}
              alt="MOODSEA Gallery"
              sx={{
                width: CONFIG.logo.width,
                display: "block",
                mb: CONFIG.gap.logoToText, // ★ logo 与正文的间距 ★
              }}
            />
          </motion.div>

          {/* ── 居中文本 ── */}
          <motion.div
            variants={itemVariants}
            style={{ width: "100%", maxWidth: CONFIG.text.maxWidth }}
          >
            {hasCaption && <p style={bodyStyle}>{caption.replace(/\\n/g, "\n")}</p>}
            {hasIntroduction &&
              introductions.map((item, i) => (
                <p key={i} style={bodyStyle}>
                  {typeof item === "string" ? item : renderArrayContent([item], {})}
                </p>
              ))}
          </motion.div>
        </motion.div>
      </Box>
    </Box>
  );
};

export default AboutPageComponent;