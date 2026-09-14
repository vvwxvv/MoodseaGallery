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
import { ArrowLeft, Image, ImageOff, LayoutGrid, List } from "lucide-react";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import useData from "@/hooks/useData";
import useFont from "@/hooks/useFont";
import useImageArtistGroups from "@/components/pages/images/hooks/useImageArtistGroups";
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
        console.error("[hover image] save failed:", err);
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
    <div style={{ background: "#fff", minHeight: "100%", padding: "22px 20px 60px", color: "#000" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,.14)" }}>
        <button
          type="button"
          onClick={() => router.push("/manager/image")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #000", borderRadius: 8, background: "#fff", padding: "7px 12px", fontSize: 12.5, fontFamily, cursor: "pointer" }}
        >
          <ArrowLeft size={14} /> {txt(T.back, isCn)}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ fontFamily, fontSize: 17, fontWeight: 700, letterSpacing: ".01em" }}>{txt(T.title, isCn)}</div>
          <div style={{ fontFamily: labelFontFamily, fontSize: 12, color: "rgba(0,0,0,.55)" }}>
            {txt(T.subtitle, isCn)}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {notice && (
            <span style={{ fontFamily, fontSize: 12, color: notice.type === "ok" ? "#0a7d32" : "#c0392b" }}>
              {notice.text}
            </span>
          )}

          {/* Grid / list + size — same controls as the order page */}
          <span style={{ display: "inline-flex", border: "1px solid #000", borderRadius: 8, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setListMode(false)}
              title={txt(T.grid, isCn)}
              style={{ padding: "7px 10px", border: "none", background: "#fff", color: listMode ? "rgba(0,0,0,.4)" : "#000", cursor: "pointer" }}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setListMode(true)}
              title={txt(T.list, isCn)}
              style={{ padding: "7px 10px", border: "none", borderLeft: "1px solid #000", background: "#fff", color: listMode ? "#000" : "rgba(0,0,0,.4)", cursor: "pointer" }}
            >
              <List size={14} />
            </button>
          </span>

          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily, fontSize: 12, opacity: 0.6 }}>{txt(T.size, isCn)}</span>
            <input
              type="range"
              min={140}
              max={360}
              step={10}
              value={thumbWidth}
              onChange={(e) => setThumbWidth(Number(e.target.value))}
              style={{ width: 120, accentColor: "#000", cursor: "pointer" }}
            />
          </span>
        </div>
      </div>

      {/* ── Artist groups ── */}
      {total === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontFamily, fontSize: 13, color: "rgba(0,0,0,.5)" }}>
          {txt(T.empty, isCn)}
        </div>
      ) : (
        view.map((g) => {
          const label = isCn ? g.artistCn || g.label : g.artistEn || g.label;
          return (
            <section key={g.key} style={{ marginTop: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontFamily, fontSize: 14, fontWeight: 700, margin: 0 }}>{label || g.label}</h2>
                <span style={{ fontFamily: labelFontFamily, fontSize: 11.5, color: "rgba(0,0,0,.5)" }}>
                  {g.items.length} {txt(T.images, isCn)}
                </span>
                {g.chosen > 0 && (
                  <span style={{ fontFamily: labelFontFamily, fontSize: 11, fontWeight: 700 }}>
                    ● {markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)}
                  </span>
                )}
              </div>

              <div
                style={
                  listMode
                    ? { display: "flex", flexDirection: "column", gap: 10 }
                    : {
                        display: "grid",
                        gridTemplateColumns: `repeat(auto-fill, minmax(${thumbWidth}px, 1fr))`,
                        gap: 14,
                      }
                }
              >
                {g.items.map((img) => {
                  const id = idOf(img);
                  const on = isHoverImage(img);
                  const isBusy = !!busy[id];
                  return (
                    <div
                      key={id}
                      style={{
                        position: "relative",
                        display: listMode ? "flex" : "block",
                        alignItems: listMode ? "center" : undefined,
                        gap: listMode ? 12 : undefined,
                        border: `1px solid ${on ? "#000" : "rgba(0,0,0,.12)"}`,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: listMode ? thumbWidth : "100%",
                          height: listMode ? thumbWidth : undefined,
                          aspectRatio: listMode ? "1 / 1" : undefined,
                          background: "#f4f4f4",
                          flexShrink: 0,
                        }}
                      >
                        {img.img_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.img_url}
                            alt={img.tag_en || ""}
                            loading="lazy"
                            draggable={false}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              // Grey until chosen; the chosen one is full colour.
                              filter: on ? "none" : "grayscale(1)",
                              opacity: on ? 1 : 0.55,
                              transition: "filter .15s ease, opacity .15s ease",
                            }}
                          />
                        ) : null}
                      </div>

                      <div style={{ padding: listMode ? 0 : 10, minWidth: 0, flex: listMode ? 1 : undefined }}>
                        <div
                          style={{
                            fontFamily,
                            fontSize: 12.5,
                            fontWeight: on ? 700 : 500,
                            color: on ? "#000" : "rgba(0,0,0,.65)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={img.tag_en || img.tag_cn || ""}
                        >
                          {isCn ? img.tag_cn || img.tag_en : img.tag_en || img.tag_cn}
                        </div>
                        <div style={{ fontFamily: labelFontFamily, fontSize: 11, color: "rgba(0,0,0,.45)", marginTop: 2 }}>
                          {[img.type, posOf(img) ? `#${posOf(img)}` : ""].filter(Boolean).join(" · ")}
                        </div>
                      </div>

                      {/* Toggle — right side. Same image icon in both states:
                          ImageOff (no slash-free) = not chosen, Image = chosen.
                          Never a black fill — only border/icon weight changes. */}
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${on ? txt(T.clear, isCn) : txt(T.pick, isCn)} ${markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)}`}
                        disabled={isBusy}
                        onClick={() => toggle(img, g.key)}
                        title={
                          on
                            ? `${markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)} · ${isCn ? "点击取消" : "click to clear"}`
                            : `${txt(T.pick, isCn)} ${markLabel(MARK.ARTIST_HOVER_IMAGE, isCn)}`
                        }
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 30,
                          height: 30,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          borderRadius: 9,
                          border: `${on ? 1.5 : 1}px solid ${on ? "#000" : "rgba(0,0,0,.16)"}`,
                          background: "#fff",
                          color: on ? "#000" : "rgba(0,0,0,.4)",
                          boxShadow: on ? "0 1px 6px rgba(0,0,0,.14)" : "none",
                          cursor: isBusy ? "default" : "pointer",
                          opacity: isBusy ? 0.4 : 1,
                          transition: "border-color .15s ease, color .15s ease, box-shadow .15s ease",
                        }}
                      >
                        {on ? (
                          <Image size={15} strokeWidth={2} />
                        ) : (
                          <ImageOff size={15} strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
