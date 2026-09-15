"use client";

/**
 * ImageHoverPageComponent — the ARTIST NAME HOVER IMAGE page.
 *
 *   /manager/image/hover
 *
 * Same layout as the image order page, but it only decides which single image
 * represents each artist (the `artist_hover_image` mark flag):
 *
 *   • grouped by artist, A→Z (Ungrouped last)
 *   • every image is shown GREY by default — no × overlay
 *   • the chosen image turns back to full colour, moves to the top of its
 *     artist group and is what visitors see when hovering the artist's name
 *   • only ONE per artist — choosing another clears the previous one
 *   • clicking the mouse button saves immediately (no separate save step)
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Image, ImageOff } from "lucide-react";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import useData from "@/hooks/useData";
import useFont from "@/hooks/useFont";
import useImageArtistGroups from "@/components/pages/images/hooks/useImageArtistGroups";
import OrderPageShell from "@/components/pages/order/OrderPageShell";
import OrderGroupBox from "@/components/pages/order/OrderGroupBox";
import OrderCard, {
  OrderCardGrid,
  OrderEmptyState,
  OrderViewControls,
} from "@/components/pages/order/OrderCard";
import { getOrder } from "@/utils/mediaOrder";
import {
  MARK,
  applyMark,
  isMarkApplied,
  markLabel,
} from "@/utils/mediaMarks";

const T = {
  title: { en: "Artist Name Hover Image", cn: "艺术家名称悬停图" },
  subtitle: {
    en: "Pick the image shown when a visitor hovers an artist's name. Everything is grey until it is chosen — one per artist.",
    cn: "选择访客悬停艺术家名称时显示的图片。未被选中的图片为灰色 — 每位艺术家一张。",
  },
  back: { en: "Images", cn: "图库" },
  images: { en: "images", cn: "张图片" },
  chosen: { en: "hover image", cn: "悬停图" },
  empty: { en: "No images found", cn: "暂无图片" },
  loadingErr: { en: "Connection failed", cn: "连接失败" },
  retry: { en: "Retry", cn: "重试" },
  okOn: { en: "Hover image set", cn: "已设为悬停图" },
  okOff: { en: "Hover image cleared", cn: "已取消悬停图" },
  fail: { en: "Failed to save", cn: "保存失败" },
  grid: { en: "Grid", cn: "网格" },
  list: { en: "List", cn: "列表" },
  size: { en: "Size", cn: "大小" },
  pick: { en: "Set as", cn: "设为" },
  clear: { en: "Clear", cn: "取消" },
};

const txt = (v, isCn) => (isCn ? v.cn : v.en);
const idOf = (item) => item?.id || item?._id || "";
/** Rolling position of an image ("" when it has none). */
const posOf = (item) => getOrder(item, "rolling_img_order");

export default function ImageHoverPageComponent() {
  const router = useRouter();
  const { isCn } = useContext(LanguageContext);
  const { fontFamily, labelFontFamily } = useFont();

  const { data: images = [], isLoading: l1, error: e1, refetch: refetchImages } = useData("/api/image");
  const { data: artworks = [], isLoading: l2, error: e2 } = useData("/api/artwork");

  const [overrides, setOverrides] = useState({}); // id → mark (optimistic)
  const [busy, setBusy] = useState({});           // id → true
  const [notice, setNotice] = useState(null);
  const [listMode, setListMode] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(180);

  const groups = useImageArtistGroups(images, artworks, { orderKey: "rolling_img_order" });

  const markOf = useCallback(
    (img) => (idOf(img) in overrides ? overrides[idOf(img)] : img?.mark),
    [overrides]
  );
  const isHoverImage = useCallback(
    (img) => isMarkApplied({ mark: markOf(img) }, MARK.ARTIST_HOVER_IMAGE),
    [markOf]
  );

  // Inside each artist group: the chosen hover image first (in colour), the
  // rest keep their rolling order (grey).
  const view = useMemo(
    () =>
      groups.map((g) => {
        const on = [];
        const off = [];
        for (const it of g.items) (isHoverImage(it) ? on : off).push(it);
        return { ...g, items: [...on, ...off], chosen: on.length };
      }),
    [groups, isHoverImage]
  );

  // The mouse button saves straight away.
  const toggle = useCallback(
    async (img, groupKey) => {
      const id = idOf(img);
      if (!id || busy[id]) return;

      const currentMark = markOf(img);
      const nextOn = !isMarkApplied({ mark: currentMark }, MARK.ARTIST_HOVER_IMAGE);
      const nextMark = applyMark(currentMark, MARK.ARTIST_HOVER_IMAGE, nextOn);

      // Choosing one clears this artist's other hover images.
      const group = groups.find((g) => g.key === groupKey);
      const others =
        nextOn && group
          ? group.items.filter(
              (it) => idOf(it) !== id && isMarkApplied({ mark: markOf(it) }, MARK.ARTIST_HOVER_IMAGE)
            )
          : [];

      setNotice(null);
      setOverrides((prev) => {
        const next = { ...prev, [id]: nextMark };
        others.forEach((o) => (next[idOf(o)] = applyMark(markOf(o), MARK.ARTIST_HOVER_IMAGE, false)));
        return next;
      });
      setBusy((prev) => {
        const next = { ...prev, [id]: true };
        others.forEach((o) => (next[idOf(o)] = true));
        return next;
      });

      const put = (iid, mark) =>
        fetch(`/api/image?id=${iid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mark }),
        });

      try {
        const res = await put(id, nextMark);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await Promise.all(
          others.map((o) => put(idOf(o), applyMark(markOf(o), MARK.ARTIST_HOVER_IMAGE, false)))
        );
        setNotice({ type: "ok", text: txt(nextOn ? T.okOn : T.okOff, isCn) });
        refetchImages?.();
      } catch (err) {
        console.log("[hover image] save failed:", err);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          others.forEach((o) => delete next[idOf(o)]);
          return next;
        });
        setNotice({ type: "err", text: txt(T.fail, isCn) });
      } finally {
        setBusy((prev) => {
          const next = { ...prev };
          delete next[id];
          others.forEach((o) => delete next[idOf(o)]);
          return next;
        });
      }
    },
    [busy, groups, isCn, markOf, refetchImages]
  );

  const isLoading = l1 || l2;
  if (isLoading) return <div style={{ background: "#fff", minHeight: "60vh" }} />;

  if (e1 || e2) {
    return (
      <div style={{ background: "#fff", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ fontFamily, fontSize: 14 }}>{txt(T.loadingErr, isCn)}</div>
        <button
          type="button"
          onClick={() => refetchImages?.()}
          style={{ padding: "8px 16px", fontSize: 13, fontFamily, border: "1px solid #000", borderRadius: 8, background: "#fff", cursor: "pointer" }}
        >
          {txt(T.retry, isCn)}
        </button>
      </div>
    );
  }

  const total = view.reduce((n, g) => n + g.items.length, 0);

  return (
    <OrderPageShell
      isCn={isCn}
      fontFamily={fontFamily}
      containerStyle={{ maxWidth: "none", margin: 0, padding: "22px 20px 60px", minHeight: "100%" }}
      title={T.title}
      subtitle={T.subtitle}
      backLabel={T.back}
      onBack={() => router.push("/manager/image")}
      notice={notice}
      right={
        <OrderViewControls
          listMode={listMode}
          onListModeChange={setListMode}
          size={thumbWidth}
          onSizeChange={setThumbWidth}
          min={140}
          max={360}
          step={10}
          labels={{ grid: txt(T.grid, isCn), list: txt(T.list, isCn), size: txt(T.size, isCn) }}
          fontFamily={fontFamily}
        />
      }
    >

      {/* ── Artist groups ── */}
      {total === 0 ? (
        <OrderEmptyState text={txt(T.empty, isCn)} fontFamily={fontFamily} />
      ) : (
        view.map((g) => {
          const label = isCn ? g.artistCn || g.label : g.artistEn || g.label;
          return (
            <OrderGroupBox
              key={g.key}
              label={label || g.label}
              count={`${g.items.length} ${txt(T.images, isCn)}`}
              fontFamily={fontFamily}
              labelFontFamily={labelFontFamily}
              right={
                g.chosen > 0 ? (
                  <span style={{ fontFamily: labelFontFamily, fontSize: 11, fontWeight: 700 }}>
                    ● {markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)}
                  </span>
                ) : null
              }
            >

              <OrderCardGrid listMode={listMode} thumbWidth={thumbWidth} gap={14}>
                {g.items.map((img) => {
                  const id = idOf(img);
                  const on = isHoverImage(img);
                  const isBusy = !!busy[id];
                  return (
                    <OrderCard
                      key={id}
                      image={img.img_url}
                      imageAlt={img.tag_en || ""}
                      title={isCn ? img.tag_cn || img.tag_en : img.tag_en || img.tag_cn}
                      meta={[img.type, posOf(img) ? `#${posOf(img)}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                      dim={!on}
                      borderColor={on ? "#000" : "rgba(0,0,0,.12)"}
                      listMode={listMode}
                      thumbWidth={thumbWidth}
                      fontFamily={fontFamily}
                      metaFontFamily={labelFontFamily}
                      action={{
                        variant: "outlined",
                        icon: on ? (
                          <Image size={15} strokeWidth={2} />
                        ) : (
                          <ImageOff size={15} strokeWidth={1.8} />
                        ),
                        pressed: on,
                        busy: isBusy,
                        title: on
                          ? `${markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)} · ${isCn ? "点击取消" : "click to clear"}`
                          : `${txt(T.pick, isCn)} ${markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)}`,
                        onClick: () => toggle(img, g.key),
                      }}
                    />
                  );
                })}
              </OrderCardGrid>
            </OrderGroupBox>
          );
        })
      )}
    </OrderPageShell>
  );
}
