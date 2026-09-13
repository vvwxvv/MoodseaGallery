"use client";

/**
 * SiteMetaPageComponent — `/manager/meta`
 *
 * One page for EVERYTHING the site itself is configured with: app identity,
 * footer, social links, website URL, both navigation menus, SEO tags and the
 * theme/feature flags. Backed by the singleton `Meta` document (`/api/meta`),
 * so nothing here needs a JSON edit any more.
 *
 * Form settings (form_options / form_types / form_marks / language options)
 * deliberately stay in `src/data/*.json`.
 */

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Box, Typography, Switch, CircularProgress } from "@mui/material";
import { Check, Disc, Globe, ListTree, Plus, Trash2 } from "lucide-react";
import { LanguageContext } from "@/components/contexts/LanguageContext";
import useFont from "@/hooks/useFont";
import useSiteMeta from "@/hooks/useSiteMeta";

// ─── style tokens (white surfaces, 1px black hairlines, no fills) ───────────
const BORDER = "1px solid #000";
const HAIRLINE = "1px solid rgba(0,0,0,.10)";

const inputSx = (fontStyle) => ({
  width: "100%",
  boxSizing: "border-box",
  border: BORDER,
  borderRadius: "8px",
  backgroundColor: "#fff",
  color: "#000",
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  ...fontStyle,
});

const TextField = ({ label, value, onChange, hint, fontStyle, placeholder }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
    {label ? (
      <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(0,0,0,.55)" }}>
        {label}
      </Typography>
    ) : null}
    <input
      value={value ?? ""}
      placeholder={placeholder || ""}
      onChange={(e) => onChange(e.target.value)}
      style={inputSx(fontStyle)}
    />
    {hint ? <Typography sx={{ fontSize: 10, color: "rgba(0,0,0,.45)" }}>{hint}</Typography> : null}
  </Box>
);

const TextAreaField = ({ label, value, onChange, rows = 3, fontStyle }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
    {label ? (
      <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(0,0,0,.55)" }}>
        {label}
      </Typography>
    ) : null}
    <textarea
      rows={rows}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputSx(fontStyle), resize: "vertical", lineHeight: 1.5 }}
    />
  </Box>
);

const IconButton = ({ title, onClick, children, danger }) => (
  <Box
    component="button"
    type="button"
    title={title}
    onClick={onClick}
    sx={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 30,
      height: 30,
      border: HAIRLINE,
      borderRadius: "8px",
      backgroundColor: "#fff",
      color: danger ? "#b00020" : "#000",
      cursor: "pointer",
      flexShrink: 0,
      "&:hover": { borderColor: "#000", textDecoration: "underline", textUnderlineOffset: "3px" },
    }}
  >
    {children}
  </Box>
);

const Section = ({ icon: Icon, title, subtitle, children, right }) => (
  <Box sx={{ border: HAIRLINE, borderRadius: "12px", backgroundColor: "#fff", mb: 2.5, overflow: "hidden" }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 2,
        py: 1.25,
        borderBottom: HAIRLINE,
        flexWrap: "wrap",
        rowGap: 1,
      }}
    >
      {Icon ? <Icon size={15} strokeWidth={1.6} /> : null}
      <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: ".02em" }}>{title}</Typography>
      {subtitle ? <Typography sx={{ fontSize: 11, color: "rgba(0,0,0,.5)" }}>{subtitle}</Typography> : null}
      <Box sx={{ flex: 1 }} />
      {right}
    </Box>
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>{children}</Box>
  </Box>
);

/** label + href row editor (one level of dropdown children). */
const MenuItemRows = ({ items = [], onChange, t, nested = false }) => {
  const update = (index, patch) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { label: "", href: "" }]);
  const addChild = (index) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, dropdown: [...(item.dropdown || []), { label: "", href: "" }] } : item
    );
    onChange(next);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((item, index) => (
        <Box key={index} sx={{ border: HAIRLINE, borderRadius: "10px", p: 1.25, backgroundColor: "#fff" }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 180px", minWidth: 140 }}>
              <TextField label={t.label} value={item.label} onChange={(v) => update(index, { label: v })} />
            </Box>
            <Box sx={{ flex: "1 1 220px", minWidth: 160 }}>
              <TextField label={t.href} value={item.href} onChange={(v) => update(index, { href: v })} />
            </Box>
            <IconButton title={t.addChild} onClick={() => addChild(index)}>
              <ListTree size={14} strokeWidth={1.6} />
            </IconButton>
            <IconButton title={t.remove} onClick={() => remove(index)} danger>
              <Trash2 size={14} strokeWidth={1.6} />
            </IconButton>
          </Box>

          {item.dropdown?.length ? (
            <Box sx={{ mt: 1.25, pl: 1.5, borderLeft: "1px dashed rgba(0,0,0,.3)", display: "flex", flexDirection: "column", gap: 1 }}>
              {item.dropdown.map((child, ci) => (
                <Box key={ci} sx={{ display: "flex", gap: 1, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 180px", minWidth: 140 }}>
                    <TextField
                      label={t.childLabel}
                      value={child.label}
                      onChange={(v) => {
                        const dropdown = item.dropdown.map((c, i) => (i === ci ? { ...c, label: v } : c));
                        update(index, { dropdown });
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: "1 1 220px", minWidth: 160 }}>
                    <TextField
                      label={t.href}
                      value={child.href}
                      onChange={(v) => {
                        const dropdown = item.dropdown.map((c, i) => (i === ci ? { ...c, href: v } : c));
                        update(index, { dropdown });
                      }}
                    />
                  </Box>
                  <IconButton
                    title={t.remove}
                    danger
                    onClick={() => update(index, { dropdown: item.dropdown.filter((_, i) => i !== ci) })}
                  >
                    <Trash2 size={14} strokeWidth={1.6} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      ))}
      <Box
        component="button"
        type="button"
        onClick={add}
        sx={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          border: BORDER,
          borderRadius: "8px",
          backgroundColor: "#fff",
          px: 1.5,
          py: 0.75,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
        }}
      >
        <Plus size={14} strokeWidth={1.8} /> {nested ? t.addChild : t.addItem}
      </Box>
    </Box>
  );
};

export default function SiteMetaPageComponent() {
  const { isCn } = useContext(LanguageContext);
  const { style: labelFontStyle } = useFont();
  const { meta, loading, save, saving } = useSiteMeta();

  const [draft, setDraft] = useState(meta);
  const [menuTab, setMenuTab] = useState("managerMenu");
  const [menuLang, setMenuLang] = useState(isCn ? "cn" : "en");
  const [status, setStatus] = useState(null);

  // Seed the draft once the doc arrives (and when the doc itself changes).
  useEffect(() => {
    setDraft(meta);
  }, [meta]);
  useEffect(() => {
    setMenuLang(isCn ? "cn" : "en");
  }, [isCn]);

  const t = useMemo(
    () =>
      isCn
        ? {
            title: "站点信息",
            subtitle: "站点标题、页脚、社交、导航菜单与 SEO —全部在此维护（表单设置仍在 JSON）",
            save: "保存更改",
            saved: "已保存",
            saving: "保存中…",
            failed: "保存失败",
            app: "应用信息",
            appHint: "标题、类型、简介",
            footer: "页脚",
            footerHint: "公司名称、起始年份、版权文字",
            social: "社交媒体",
            socialHint: "平台 / 账号 / 链接",
            website: "网站",
            menus: "导航菜单",
            menusHint: "公开菜单与后台菜单（含下拉子项）",
            seo: "SEO 与标签",
            theme: "主题与功能",
            label: "名称",
            childLabel: "子项名称",
            href: "链接",
            addItem: "添加一项",
            addChild: "添加子项",
            remove: "删除",
            platform: "平台",
            account: "账号",
            url: "链接",
            addSocial: "添加社交账号",
            mainMenu: "公开菜单",
            managerMenu: "后台菜单",
            en: "英文",
            cn: "中文",
            titleEn: "标题（英文）",
            titleCn: "标题（中文）",
            type: "类型",
            category: "分类",
            version: "版本",
            purpose: "用途",
            descEn: "简介（英文）",
            descCn: "简介（中文）",
            defaultLang: "默认语言",
            companyEn: "公司名称（英文）",
            companyCn: "公司名称（中文）",
            startYear: "起始年份",
            rightsEn: "版权文字（英文）",
            rightsCn: "版权文字（中文）",
            seoTitle: "SEO 标题",
            seoDesc: "SEO 描述",
            keywords: "关键词",
            ogImage: "分享图 (og:image)",
            icon: "站点图标",
            canonical: "规范链接 (canonical)",
            author: "作者",
            defaultTheme: "默认主题",
            autoDetect: "跟随系统主题",
            artworkFilters: "显示作品筛选器",
            on: "开",
            off: "关",
            jsonNote: "图库实体映射（galleryEntities）保持只读，如需修改请告知。",
          }
        : {
            title: "Site Meta",
            subtitle: "Title, footer, social, navigation menus and SEO — all maintained here (form settings stay in JSON)",
            save: "Save changes",
            saved: "Saved",
            saving: "Saving…",
            failed: "Save failed",
            app: "App",
            appHint: "Title, type, description",
            footer: "Footer",
            footerHint: "Company name, start year, rights text",
            social: "Social media",
            socialHint: "Platform / account / URL",
            website: "Website",
            menus: "Navigation menus",
            menusHint: "Public + manager menus (with dropdown children)",
            seo: "SEO & tags",
            theme: "Theme & features",
            label: "Label",
            childLabel: "Child label",
            href: "Href",
            addItem: "Add item",
            addChild: "Add child",
            remove: "Remove",
            platform: "Platform",
            account: "Account",
            url: "URL",
            addSocial: "Add social account",
            mainMenu: "Public menu",
            managerMenu: "Manager menu",
            en: "English",
            cn: "Chinese",
            titleEn: "Title (EN)",
            titleCn: "Title (CN)",
            type: "Type",
            category: "Category",
            version: "Version",
            purpose: "Purpose",
            descEn: "Description (EN)",
            descCn: "Description (CN)",
            defaultLang: "Default language",
            companyEn: "Company name (EN)",
            companyCn: "Company name (CN)",
            startYear: "Start year",
            rightsEn: "Rights text (EN)",
            rightsCn: "Rights text (CN)",
            seoTitle: "SEO title",
            seoDesc: "SEO description",
            keywords: "Keywords",
            ogImage: "Share image (og:image)",
            icon: "Site icon",
            canonical: "Canonical URL",
            author: "Author",
            defaultTheme: "Default theme",
            autoDetect: "Follow system theme",
            artworkFilters: "Show artwork filters",
            on: "On",
            off: "Off",
            jsonNote: "The image-gallery entity mapping (galleryEntities) stays read-only — tell me if you want it editable.",
          },
    [isCn]
  );

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const setIn = (key, sub) => (value) => setDraft((d) => ({ ...d, [key]: { ...(d[key] || {}), [sub]: value } }));

  const handleSave = async () => {
    setStatus(null);
    try {
      await save(draft);
      setStatus("ok");
      setTimeout(() => setStatus(null), 2500);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const menuList = draft?.menu?.[menuTab]?.[menuLang] || [];
  const setMenuList = (items) =>
    setDraft((d) => ({
      ...d,
      menu: { ...(d.menu || {}), [menuTab]: { ...(d.menu?.[menuTab] || {}), [menuLang]: items } },
    }));

  const social = draft?.socialMedia || [];
  const setSocial = (list) => setDraft((d) => ({ ...d, socialMedia: list }));

  const pill = (active) => ({
    px: 1.25,
    py: 0.5,
    borderRadius: "8px",
    border: "1px solid",
    borderColor: active ? "#000" : "transparent",
    backgroundColor: active ? "rgba(0,0,0,.06)" : "transparent",
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const row = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.75 };
  const row3 = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.75 };

  return (
    <Box sx={{ width: "100%", maxWidth: 1080, mx: "auto", px: { xs: 2, md: 3 }, pt: 3, pb: 8 }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          rowGap: 1,
          pb: 1.5,
          mb: 2.5,
          borderBottom: "1px solid rgba(0,0,0,.16)",
        }}
      >
        <Disc size={20} strokeWidth={1.5} />
        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: ".01em" }}>{t.title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "rgba(0,0,0,.55)" }}>{t.subtitle}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {status === "ok" ? (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 12, color: "#0a7d28" }}>
            <Check size={14} strokeWidth={2} /> {t.saved}
          </Box>
        ) : null}
        {status === "error" ? (
          <Typography sx={{ fontSize: 12, color: "#b00020" }}>{t.failed}</Typography>
        ) : null}
        <Box
          component="button"
          type="button"
          onClick={handleSave}
          disabled={saving}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: BORDER,
            borderRadius: "8px",
            backgroundColor: "#fff",
            color: "#000",
            px: 2,
            py: 0.9,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
            "&:hover": { textDecoration: saving ? "none" : "underline", textUnderlineOffset: "3px" },
          }}
        >
          {saving ? <CircularProgress size={13} sx={{ color: "#000" }} /> : <Check size={14} strokeWidth={2} />}
          {saving ? t.saving : t.save}
        </Box>
      </Box>

      {/* ── App ── */}
      <Section icon={Disc} title={t.app} subtitle={t.appHint}>
        <Box sx={row}>
          <TextField label={t.titleEn} value={draft.app_title} onChange={set("app_title")} fontStyle={labelFontStyle} />
          <TextField label={t.titleCn} value={draft.app_title_cn} onChange={set("app_title_cn")} fontStyle={labelFontStyle} />
        </Box>
        <Box sx={row3}>
          <TextField label={t.type} value={draft.app_type} onChange={set("app_type")} fontStyle={labelFontStyle} />
          <TextField label={t.category} value={draft.app_category} onChange={set("app_category")} fontStyle={labelFontStyle} />
          <TextField label={t.version} value={draft.app_version} onChange={set("app_version")} fontStyle={labelFontStyle} />
        </Box>
        <TextField label={t.purpose} value={draft.app_purpose} onChange={set("app_purpose")} fontStyle={labelFontStyle} />
        <TextAreaField label={t.descEn} value={draft.app_description} onChange={set("app_description")} fontStyle={labelFontStyle} />
        <TextAreaField label={t.descCn} value={draft.app_description_cn} onChange={set("app_description_cn")} fontStyle={labelFontStyle} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(0,0,0,.55)" }}>
            {t.defaultLang}
          </Typography>
          {["EN", "CN"].map((code) => (
            <Box key={code} onClick={() => set("language")(code)} sx={pill((draft.language || "EN") === code)}>
              {code === "EN" ? t.en : t.cn}
            </Box>
          ))}
        </Box>
      </Section>

      {/* ── Footer ── */}
      <Section icon={Globe} title={t.footer} subtitle={t.footerHint}>
        <Box sx={row}>
          <TextField label={t.companyEn} value={draft.app_footer} onChange={set("app_footer")} fontStyle={labelFontStyle} />
          <TextField label={t.companyCn} value={draft.app_footer_cn} onChange={set("app_footer_cn")} fontStyle={labelFontStyle} />
        </Box>
        <Box sx={row3}>
          <TextField
            label={t.startYear}
            value={draft.app_footer_start_year ?? ""}
            onChange={(v) => set("app_footer_start_year")(v === "" ? null : Number(v))}
            fontStyle={labelFontStyle}
          />
          <TextField label={t.rightsEn} value={draft.app_footer_rights} onChange={set("app_footer_rights")} fontStyle={labelFontStyle} />
          <TextField label={t.rightsCn} value={draft.app_footer_rights_cn} onChange={set("app_footer_rights_cn")} fontStyle={labelFontStyle} />
        </Box>
      </Section>

      {/* ── Social ── */}
      <Section icon={Globe} title={t.social} subtitle={t.socialHint}>
        {social.map((item, index) => (
          <Box key={index} sx={{ display: "flex", gap: 1, alignItems: "flex-end", flexWrap: "wrap" }}>
            <Box sx={{ flex: "1 1 140px", minWidth: 120 }}>
              <TextField
                label={t.platform}
                value={item.platform}
                onChange={(v) => setSocial(social.map((s, i) => (i === index ? { ...s, platform: v } : s)))}
                fontStyle={labelFontStyle}
              />
            </Box>
            <Box sx={{ flex: "1 1 180px", minWidth: 140 }}>
              <TextField
                label={t.account}
                value={item.account}
                onChange={(v) => setSocial(social.map((s, i) => (i === index ? { ...s, account: v } : s)))}
                fontStyle={labelFontStyle}
              />
            </Box>
            <Box sx={{ flex: "2 1 260px", minWidth: 180 }}>
              <TextField
                label={t.url}
                value={item.url}
                onChange={(v) => setSocial(social.map((s, i) => (i === index ? { ...s, url: v } : s)))}
                fontStyle={labelFontStyle}
              />
            </Box>
            <IconButton title={t.remove} danger onClick={() => setSocial(social.filter((_, i) => i !== index))}>
              <Trash2 size={14} strokeWidth={1.6} />
            </IconButton>
          </Box>
        ))}
        <Box
          component="button"
          type="button"
          onClick={() => setSocial([...social, { platform: "", account: "", url: "" }])}
          sx={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: BORDER,
            borderRadius: "8px",
            backgroundColor: "#fff",
            px: 1.5,
            py: 0.75,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
          }}
        >
          <Plus size={14} strokeWidth={1.8} /> {t.addSocial}
        </Box>
      </Section>

      {/* ── Website ── */}
      <Section icon={Globe} title={t.website}>
        <TextField label={t.url} value={draft.web_url} onChange={set("web_url")} fontStyle={labelFontStyle} placeholder="https://" />
      </Section>

      {/* ── Menus ── */}
      <Section
        icon={ListTree}
        title={t.menus}
        subtitle={t.menusHint}
        right={
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ display: "inline-flex", gap: 0.75 }}>
              {[
                ["mainMenu", t.mainMenu],
                ["managerMenu", t.managerMenu],
              ].map(([key, label]) => (
                <Box key={key} onClick={() => setMenuTab(key)} sx={pill(menuTab === key)}>
                  {label}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "inline-flex", gap: 0.75 }}>
              {[
                ["en", t.en],
                ["cn", t.cn],
              ].map(([key, label]) => (
                <Box key={key} onClick={() => setMenuLang(key)} sx={pill(menuLang === key)}>
                  {label}
                </Box>
              ))}
            </Box>
          </Box>
        }
      >
        <MenuItemRows items={menuList} onChange={setMenuList} t={t} nested />
        <Typography sx={{ fontSize: 10.5, color: "rgba(0,0,0,.45)" }}>{t.jsonNote}</Typography>
      </Section>

      {/* ── SEO ── */}
      <Section icon={Globe} title={t.seo}>
        <TextField label={t.seoTitle} value={draft.seo?.title} onChange={setIn("seo", "title")} fontStyle={labelFontStyle} />
        <TextAreaField label={t.seoDesc} value={draft.seo?.description} onChange={setIn("seo", "description")} fontStyle={labelFontStyle} />
        <Box sx={row}>
          <TextField label={t.keywords} value={draft.seo?.keywords} onChange={setIn("seo", "keywords")} fontStyle={labelFontStyle} />
          <TextField label={t.author} value={draft.seo?.author} onChange={setIn("seo", "author")} fontStyle={labelFontStyle} />
        </Box>
        <Box sx={row3}>
          <TextField label={t.ogImage} value={draft.seo?.og_image} onChange={setIn("seo", "og_image")} fontStyle={labelFontStyle} />
          <TextField label={t.icon} value={draft.seo?.icon} onChange={setIn("seo", "icon")} fontStyle={labelFontStyle} />
          <TextField label={t.canonical} value={draft.seo?.canonical} onChange={setIn("seo", "canonical")} fontStyle={labelFontStyle} />
        </Box>
      </Section>

      {/* ── Theme & features ── */}
      <Section icon={Disc} title={t.theme}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(0,0,0,.55)" }}>
            {t.defaultTheme}
          </Typography>
          {["light", "dark"].map((theme) => (
            <Box key={theme} onClick={() => setIn("themes", "default")(theme)} sx={pill(draft.themes?.default === theme)}>
              {theme}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Switch
            size="small"
            checked={!!draft.themes?.autoDetect}
            onChange={(e) => setIn("themes", "autoDetect")(e.target.checked)}
            sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#000" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#000" } }}
          />
          <Typography sx={{ fontSize: 12.5 }}>{t.autoDetect}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Switch
            size="small"
            checked={!!draft.features?.showArtworkFilters}
            onChange={(e) => setIn("features", "showArtworkFilters")(e.target.checked)}
            sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#000" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#000" } }}
          />
          <Typography sx={{ fontSize: 12.5 }}>{t.artworkFilters}</Typography>
        </Box>
      </Section>

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "rgba(0,0,0,.5)", fontSize: 12 }}>
          <CircularProgress size={13} sx={{ color: "#000" }} /> loading…
        </Box>
      ) : null}
    </Box>
  );
}
