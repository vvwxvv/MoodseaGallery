// FairFormSection.jsx — 完全匹配 Prisma Fair 模型
import React, { useContext } from 'react';

/* ---------- internal imports ---------- */
import { LanguageContext } from '@/components/contexts/LanguageContext';
import { Box } from '@mui/material';

/* ---------- reusable component ---------- */
import TabbedFormManager from '@/components/forms/managers/TabbedFormManager';
import MultiRelationSelector from '@/components/forms/selectors/MultiRelationSelector';
import useFormTypeOptions from '@/hooks/useFormTypeOptions';

/* ---------- 标签配置（若无外部文件，此处作为 fallback） ---------- */
// 推荐在 /components/forms/labels/fairFormLabels.js 中集中管理，但此处提供默认值
const DEFAULT_FAIR_FORM_LABELS = {
  tabs: {
    basic: { en: 'Basic Info', cn: '基本信息' },
    dates: { en: 'Dates', cn: '日期' },
    location: { en: 'Location & Participants', cn: '地点与参与者' },
    content: { en: 'Content', cn: '内容' },
    media: { en: 'Media', cn: '媒体' },
    related: { en: 'Related', cn: '相关' },
    settings: { en: 'Settings', cn: '设置' },
  },
  fields: {
    title: { en: 'Title', cn: '标题' },
    section: { en: 'Section', cn: '板块' },
    type: { en: 'Type', cn: '类型' },
    year: { en: 'Year', cn: '年份' },
    mark: { en: 'Mark', cn: '标记' },
    language: { en: 'Language', cn: '语言' },
    date_start: { en: 'Start Date', cn: '开始日期' },
    date_end: { en: 'End Date', cn: '结束日期' },
    vip_preview_date: { en: 'VIP Preview Date', cn: 'VIP预览日期' },
    booth: { en: 'Booth', cn: '展位' },
    venue: { en: 'Venue', cn: '场馆' },
    location: { en: 'Location', cn: '地点' },
    organiser: { en: 'Organiser', cn: '主办方' },
    curator: { en: 'Curator', cn: '策展人' },
    participating_artists: { en: 'Participating Artists', cn: '参展艺术家' },
    caption: { en: 'Caption', cn: '说明' },
    cover_img_url: { en: 'Cover Image', cn: '封面图片' },
    video_url: { en: 'Video URL', cn: '视频链接' },
    web_url: { en: 'Web URL', cn: '网页链接' },
    order: { en: 'Order', cn: '排序' },
    status: { en: 'Status', cn: '状态' },
  },
  buttons: {
    addPressRelease: { en: 'Add Press Release', cn: '添加新闻稿' },
    addRelatedArtworkTitle: { en: 'Add Related Title', cn: '添加相关作品标题' },
    addRelatedGalleryArtist: { en: 'Add Gallery Artist', cn: '添加画廊艺术家' },
  },
};

// 使用默认标签（外部标签文件不存在时，默认值已足够）
const FAIR_FORM_LABELS = DEFAULT_FAIR_FORM_LABELS;

/* =============================================================================
  Fair Form Schema Definition (完全匹配 Prisma Fair 模型)
============================================================================= */
const FAIR_SCHEMA = [
  {
    key: 'basic',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'section', type: 'text' },
      { name: 'type', type: 'select', options: 'typeOptions' },
      // Year dropdown (1980 → current year) — shared YearSelector.
      { name: 'year', type: 'year' },
      // Language dropdown — shared LanguageSelector (EN / CN).
      { name: 'language', type: 'language' },
    ],
  },
  {
    key: 'dates',
    fields: [
      { name: 'date_start', type: 'date' },
      { name: 'date_end', type: 'date' },
      { name: 'vip_preview_date', type: 'date' },
    ],
  },
  {
    key: 'location',
    fields: [
      { name: 'booth', type: 'text' },
      { name: 'venue', type: 'text' },
      { name: 'location', type: 'text' },
      { name: 'organiser', type: 'text' },
      { name: 'curator', type: 'text' },
      { name: 'participating_artists', type: 'text' },
    ],
  },
  {
    key: 'content',
    fields: [
      { name: 'caption', type: 'multiline', rows: 2 },
    ],
  },
  {
    key: 'media',
    fields: [
      { name: 'video_url', type: 'text' },
      { name: 'web_url', type: 'text' },
    ],
  },
  {
    key: 'settings',
    fields: [
      { name: 'status', type: 'select', options: 'statusOptions' },
    ],
  },
  {
    key: 'press_release',
    type: 'array',
    fieldName: 'press_release',
    rows: 3,
    multiline: true,
  },
  // 关联字段（同一个“关联”标签）：related_artwork_title + related_gallery_artist
  {
    key: 'related',
    type: 'custom',
    renderKey: 'relatedSection',
  },
  {
    // 排序：只显示编号 + 跳转排序页
    key: 'ordering',
    type: 'order',
    fieldName: 'order',
    label: { en: 'Order', cn: '排序' },
    orderPagePath: '/manager/fair/reorder',
  },

];

/* =============================================================================
  Fair Form Section Component
============================================================================= */
const FairFormSection = ({
  form,
  disabled = false,
  getLabel,
  onFieldChange,
  colors = {},
  relatedMediaSelectors,
  relatedContentSelectors,
}) => {
  const { isCn } = useContext(LanguageContext);

  // Type options come from the Meta settings (/manager/meta → formTypes.fair),
  // falling back to the built-in labels list.
  const typeFallback = React.useMemo(
    () =>
      (FAIR_FORM_LABELS?.typeOptions || []).map((o) => ({
        value: o.value,
        label: isCn ? o.cn : o.en,
      })),
    [isCn]
  );
  const metaTypeOptions = useFormTypeOptions("fair", typeFallback);

  /* ---------- 关联数据源（跨实体） ----------
     related_artwork_title  → 从 Artwork 取作品标题（与“作品 → 相关展览”同一套逻辑）
     related_gallery_artist → 从 About 取艺术家名（去重，按语言匹配） */
  const relatedArtworkSources = [
    {
      endpoint: 'artwork',
      labelKey: 'title',
      descriptionKey: 'year',
      languageField: 'language',
      matchLanguage: true,
      unique: true,
    },
  ];
  const relatedArtistSources = [
    {
      endpoint: 'about',
      labelKey: 'artist',
      languageField: 'language',
      matchLanguage: true,
      unique: true,
    },
  ];

  // The record's own language drives the option lists (an EN fair only lists
  // EN artworks/artists).
  const relatedLanguage = String(form.watch('language') || (isCn ? 'CN' : 'EN'))
    .trim()
    .toUpperCase();

  /* ---------- 将标签注入 Schema ---------- */
  const enhancedSchema = FAIR_SCHEMA.map((section) => {
    const enhancedSection = { ...section };

    // Tab 标签
    if (FAIR_FORM_LABELS?.tabs?.[section.key]) {
      enhancedSection.label = FAIR_FORM_LABELS.tabs[section.key];
    }

    // 字段标签
    if (section.fields) {
      enhancedSection.fields = section.fields.map((field) => {
        const next = {
          ...field,
          label:
            FAIR_FORM_LABELS?.fields?.[field.name] || {
              en: field.name,
              cn: field.name,
            },
        };
        // Type selector → options managed in the site Meta.
        if (field.name === 'type' && metaTypeOptions.length) {
          next.options = metaTypeOptions;
        }
        return next;
      });
    }

    // 数组字段的“添加”按钮标签
    const arrayKeys = ['press_release', 'related_artwork_title', 'related_gallery_artist'];
    if (arrayKeys.includes(section.key)) {
      const buttonKey = `add${section.key.charAt(0).toUpperCase() + section.key.slice(1)}`;
      enhancedSection.addLabel =
        FAIR_FORM_LABELS?.buttons?.[buttonKey] || {
          en: `Add ${section.key.replace(/_/g, ' ')}`,
          cn: `添加${section.key.replace(/_/g, '')}`,
        };
    }

    return enhancedSection;
  });

  /* ---------- 辅助函数：获取标签 ---------- */
  const normalizeKey = (key) => key?.toLowerCase();

  const getLabelFunc = (key) => {
    const lang = isCn ? 'cn' : 'en';
    const normKey = normalizeKey(key);

    if (FAIR_FORM_LABELS?.fields?.[normKey]?.[lang]) {
      return FAIR_FORM_LABELS.fields[normKey][lang];
    }
    if (FAIR_FORM_LABELS?.tabs?.[normKey]?.[lang]) {
      return FAIR_FORM_LABELS.tabs[normKey][lang];
    }
    if (FAIR_FORM_LABELS?.buttons?.[normKey]?.[lang]) {
      return FAIR_FORM_LABELS.buttons[normKey][lang];
    }

    return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getTabLabel = (tabKey) => {
    const lang = isCn ? 'cn' : 'en';
    return (
      FAIR_FORM_LABELS?.tabs?.[tabKey]?.[lang] ||
      tabKey.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  /* ---------- 自定义渲染器 ---------- */
  const customRenderers = {
    relatedMediaSelectors,
    relatedContentSelectors,

    // 同一“关联”标签：相关作品 + 相关画廊/艺术家
    relatedSection: () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* related_artwork_title —— 从作品列表多选（同“作品 → 相关展览”的 UI/逻辑） */}
        <MultiRelationSelector
          name="related_artwork_title"
          label={getLabelFunc('related_artwork_title')}
          control={form.control}
          sources={relatedArtworkSources}
          language={relatedLanguage}
          allowCustom={false}
          disabled={disabled}
          isCn={isCn}
          colors={colors}
          placeholder={isCn ? '选择作品…' : 'Select artworks…'}
          hint={
            isCn
              ? '仅可选择语言相同的作品 · 排序在作品排序页设置'
              : 'Only artworks in the same language · ordering is set on the artwork order page'
          }
          onChange={(vals) => onFieldChange?.('related_artwork_title', vals)}
        />

        {/* related_gallery_artist —— 跨实体多选 */}
        <MultiRelationSelector
          name="related_gallery_artist"
          label={getLabelFunc('related_gallery_artist')}
          control={form.control}
          sources={relatedArtistSources}
          language={relatedLanguage}
          disabled={disabled}
          isCn={isCn}
          colors={colors}
          placeholder={
            isCn ? '选择或输入相关画廊艺术家' : 'Select or type related gallery artists'
          }
          onChange={(vals) => onFieldChange?.('related_gallery_artist', vals)}
        />
      </Box>
    ),
  };

  return (
    <TabbedFormManager
      form={form}
      schema={enhancedSchema}
      getLabelFunc={getLabelFunc}
      getTabLabel={getTabLabel}
      onFieldChange={onFieldChange}
      colors={colors}
      disabled={disabled}
      customRenderers={customRenderers}
      isCn={isCn}
      getLabel={getLabelFunc}
      labelFunc={getLabelFunc}
      getFieldLabel={getLabelFunc}
    />
  );
};

export default FairFormSection;