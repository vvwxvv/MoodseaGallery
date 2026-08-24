// ExhibitionFormSection.jsx — matches updated Prisma Exhibition model
import React, { useContext } from 'react';
import { Box } from '@mui/material';

/* ---------- internal imports ---------- */
import { LanguageContext } from '@/components/contexts/LanguageContext';

/* ---------- reusable component ---------- */
import TabbedFormManager from '@/components/forms/managers/TabbedFormManager';
import MultiRelationSelector from '@/components/forms/selectors/MultiRelationSelector';

/* ---------- centralised labels ---------- */
import EXHIBITION_FORM_LABELS from '@/components/forms/labels/exhibitionFormLables';

/* =============================================================================
  Exhibition Form Schema Definition (matches updated Prisma Exhibition model)
============================================================================= */
const EXHIBITION_SCHEMA = [
  {
    key: 'basic',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'subtitle', type: 'text' },
      { name: 'type', type: 'select', options: 'typeOptions' },
      { name: 'year', type: 'text' },
      { name: 'mark', type: 'text' },
      { name: 'language', type: 'select', options: 'languageOptions' },
    ],
  },
  {
    key: 'dates',
    fields: [
      { name: 'date_start', type: 'date' },
      { name: 'date_end', type: 'date' },
      { name: 'opening_date', type: 'date' },
    ],
  },
  {
    key: 'location',
    fields: [
      { name: 'venue', type: 'text' },
      { name: 'location', type: 'text' },
      { name: 'curator', type: 'text' },
      { name: 'organiser', type: 'text' },
      { name: 'participating_artists', type: 'text' },
    ],
  },
  {
    key: 'content',
    fields: [
      { name: 'caption', type: 'multiline', rows: 2 },
      { name: 'description', type: 'multiline', rows: 4 },
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
      { name: 'order', type: 'text' },
      { name: 'status', type: 'select', options: 'statusOptions' },
    ],
  },
  {
    key: 'introduction',
    type: 'array',
    fieldName: 'introduction',
    rows: 3,
    multiline: true,
  },
  {
    key: 'press_release',
    type: 'array',
    fieldName: 'press_release',
    rows: 3,
    multiline: true,
  },
  // 关联字段：跨实体选择器（下拉多选 + 可自由输入）
  {
    key: 'related',
    type: 'custom',
    renderKey: 'relatedSection',
  },
];

/* =============================================================================
  Exhibition Form Section Component
============================================================================= */
const ExhibitionFormSection = ({
  form,
  disabled = false,
  getLabel,
  onFieldChange,
  colors = {},
  relatedMediaSelectors,
  relatedContentSelectors,
}) => {
  const { isCn } = useContext(LanguageContext);

  /* ---------- 将标签注入 Schema ---------- */
  const enhancedSchema = EXHIBITION_SCHEMA.map(section => {
    const enhancedSection = { ...section };

    // 为每个 section 添加 tab 标签
    if (EXHIBITION_FORM_LABELS?.tabs?.[section.key]) {
      enhancedSection.label = EXHIBITION_FORM_LABELS.tabs[section.key];
    }

    // 为每个字段添加 label
    if (section.fields) {
      enhancedSection.fields = section.fields.map(field => ({
        ...field,
        label: EXHIBITION_FORM_LABELS?.fields?.[field.name] || { en: field.name, cn: field.name }
      }));
    }

    // 为数组字段添加“添加”按钮标签
    if (section.key === 'introduction') {
      enhancedSection.addLabel = EXHIBITION_FORM_LABELS?.buttons?.addIntroduction;
    }
    if (section.key === 'press_release') {
      enhancedSection.addLabel = EXHIBITION_FORM_LABELS?.buttons?.addPressRelease;
    }

    return enhancedSection;
  });

  /* ---------- 辅助函数：获取标签 ---------- */
  const normalizeKey = (key) => key?.toLowerCase();

  const getLabelFunc = (key) => {
    const lang = isCn ? 'cn' : 'en';
    const normKey = normalizeKey(key);

    if (EXHIBITION_FORM_LABELS?.fields?.[normKey]?.[lang]) {
      return EXHIBITION_FORM_LABELS.fields[normKey][lang];
    }
    if (EXHIBITION_FORM_LABELS?.tabs?.[normKey]?.[lang]) {
      return EXHIBITION_FORM_LABELS.tabs[normKey][lang];
    }
    if (EXHIBITION_FORM_LABELS?.buttons?.[normKey]?.[lang]) {
      return EXHIBITION_FORM_LABELS.buttons[normKey][lang];
    }
    if (EXHIBITION_FORM_LABELS?.selectors?.[normKey]?.[lang]) {
      return EXHIBITION_FORM_LABELS.selectors[normKey][lang];
    }

    return key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTabLabel = (tabKey) => {
    const lang = isCn ? 'cn' : 'en';
    return EXHIBITION_FORM_LABELS?.tabs?.[tabKey]?.[lang] ||
           tabKey.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /* ---------- 关联数据源（跨实体） ----------
     related_artwork_title → 从 Artwork 取标题（按语言匹配）
     related_gallery_artist → 从 About 取艺术家名（去重，按语言匹配） */
  const relatedArtworkSources = [
    {
      endpoint: 'artwork',
      labelKey: 'title',
      descriptionKey: 'artist',
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

  /* ---------- 自定义渲染器 ---------- */
  const customRenderers = {
    relatedMediaSelectors,
    relatedContentSelectors,
    relatedSection: () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <MultiRelationSelector
          name="related_artwork_title"
          label={getLabelFunc('related_artwork_title')}
          control={form.control}
          sources={relatedArtworkSources}
          disabled={disabled}
          isCn={isCn}
          colors={colors}
          placeholder={
            isCn ? '选择或输入相关作品标题' : 'Select or type related artwork titles'
          }
          hint={EXHIBITION_FORM_LABELS?.hints?.relatedArtwork?.[isCn ? 'cn' : 'en']}
          onChange={(vals) => onFieldChange?.('related_artwork_title', vals)}
        />

        <MultiRelationSelector
          name="related_gallery_artist"
          label={getLabelFunc('related_gallery_artist')}
          control={form.control}
          sources={relatedArtistSources}
          disabled={disabled}
          isCn={isCn}
          colors={colors}
          placeholder={
            isCn ? '选择或输入相关画廊艺术家' : 'Select or type related gallery artists'
          }
          hint={EXHIBITION_FORM_LABELS?.hints?.relatedArtist?.[isCn ? 'cn' : 'en']}
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

export default ExhibitionFormSection;