"use client";

import React, { useContext } from "react";
import { Box, Container, Typography, Grid, Chip } from "@mui/material";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import { DeviceContext } from "@/components/contexts/DeviceContext";
import AlertInfo from "@/components/alerts/AlertInfo";
import useFont from "@/hooks/useFont";

// ============================================================
// 加载状态 —— 纯白屏，无骨架、无动画、无特效
// ============================================================
function ArtworkDetailLoading() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        width: "100%",
      }}
    />
  );
}

// ============================================================
// 主组件
// ============================================================
export default function ArtworkDetailPageComponent({
  artwork,
  loading = false,
  error = null,
  onRetry,
}) {
  const { isCn } = useContext(LanguageContext);
  const { isMobile } = useContext(DeviceContext);
  const { fontFamily } = useFont();

  // 加载状态 -> 纯白屏
  if (loading) {
    return <ArtworkDetailLoading />;
  }

  // 错误状态
  if (error) {
    return (
      <AlertInfo
        message={error}
        severity="error"
        actionLabel={isCn ? "重试" : "Retry"}
        onAction={onRetry}
      />
    );
  }

  // 数据不存在 -> 只有当确实没有 artwork 且不在加载中时，才显示"未找到"
  if (!artwork) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <AlertInfo
          message={isCn ? "作品未找到" : "Artwork not found"}
          severity="info"
        />
      </Container>
    );
  }

  // 正常渲染
  const {
    cover_img_url,
    title,
    artist,
    type,
    medium,
    year,
    size,
    series,
    caption,
    duration,
    credits,
    special_thanks,
    introduction,
    video_url,
    web_url,
    work_value,
    sold,
  } = artwork;

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Grid container spacing={4}>
        {/* 图片 */}
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#f5f5f5",
            }}
          >
            {cover_img_url ? (
              <Box
                component="img"
                src={cover_img_url}
                alt={title || ""}
                sx={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            ) : (
              <Box
                sx={{
                  height: 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                {isCn ? "暂无图片" : "No Image"}
              </Box>
            )}
          </Box>
        </Grid>

        {/* 信息 */}
        <Grid item xs={12} md={5}>
          <Box sx={{ fontFamily }}>
            {title && (
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {title}
              </Typography>
            )}

            {artist && (
              <Typography variant="h6" sx={{ color: "text.secondary", mb: 2 }}>
                {artist}
              </Typography>
            )}

            {/* Meta chips */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {type && <Chip label={type} size="small" variant="outlined" />}
              {year && <Chip label={year} size="small" variant="outlined" />}
              {medium && <Chip label={medium} size="small" variant="outlined" />}
              {series && <Chip label={series} size="small" variant="outlined" />}
            </Box>

            {/* Details */}
            {size && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{isCn ? "尺寸" : "Size"}:</strong> {size}
              </Typography>
            )}
            {duration && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{isCn ? "时长" : "Duration"}:</strong> {duration}
              </Typography>
            )}
            {work_value && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{isCn ? "价值" : "Value"}:</strong> {work_value}
              </Typography>
            )}
            {sold && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{isCn ? "状态" : "Status"}:</strong> {sold}
              </Typography>
            )}

            {/* Caption */}
            {caption && (
              <Typography variant="body1" sx={{ mt: 2, mb: 2, lineHeight: 1.7 }}>
                {caption.replace(/\\n/g, "\n")}
              </Typography>
            )}

            {/* Introduction paragraphs */}
            {Array.isArray(introduction) && introduction.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {introduction.map((para, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{ mb: 1.5, lineHeight: 1.7, color: "text.secondary" }}
                  >
                    {para.replace(/\\n/g, "\n")}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Credits */}
            {credits && (
              <Typography
                variant="caption"
                sx={{ mt: 2, display: "block", color: "text.secondary" }}
              >
                {credits.replace(/\\n/g, "\n")}
              </Typography>
            )}
            {special_thanks && (
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.secondary" }}
              >
                {isCn ? "特别感谢" : "Special Thanks"}: {special_thanks}
              </Typography>
            )}

            {/* Links */}
            {video_url && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  component="a"
                  href={video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "primary.main", textDecoration: "underline" }}
                >
                  {isCn ? "观看视频" : "Watch Video"}
                </Typography>
              </Box>
            )}
            {web_url && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  component="a"
                  href={web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "primary.main", textDecoration: "underline" }}
                >
                  {isCn ? "访问链接" : "Visit Website"}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
