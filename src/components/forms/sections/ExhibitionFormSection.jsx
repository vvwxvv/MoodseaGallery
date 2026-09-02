// ExhibitionFormSection.jsx — matches updated Prisma Exhibition model (related_artwork = JSON 对象数组)
import React, { useContext } from 'react';
import { Box, IconButton, TextField, Button, Typography } from '@mui/material';
import { Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

/* ---------- internal imports ---------- */
import { LanguageContext } from '@/components/contexts/LanguageContext';

/* ---------- reusable component ---------- */
import TabbedFormManager from '@/components/forms/managers/TabbedFormManager';
import MultiRelationSelector from '@/components/forms/selectors/MultiRelationSelector';

/* ---------- centralised labels ---------- */
import EXHIBITION_FORM_LABELS from '@/components/forms/labels/exhibitionFormLables';

/* =============================================================================
  Object-array editor for related_artwork —— 每行 { title, order, mark }。
  逻辑对齐 GalleryContact.social_media 的对象数组编辑：可增删行、逐字段编辑，
  空行（无 title）在 API 层 beforeCreate/beforeUpdate 会被丢弃。

  ⚠️ 占位实现：如果 social_media 在你项目里用的是某个现成的对象数组编辑器
  组件，请贴出来，用它替换本组件、props 对齐即可。
============================================================================= */
const RelatedArtworkEditor = ({ control, name, label, disabled, isCn, colors = {}, hint }) => {
  const columns = [
    { key: 'title', label: isCn ? '作品标题' : 'Title', flex: 2 },
    { key: 'order', label: isCn ? '排序' : 'Order', flex: 1 },
    { key: 'mark', label: isCn ? '标记' : 'Mark', flex: 1 },
  ];

  return (
    <Controller
      control={control}
      name={name}
      defaultValue={[]}
      render={({ field }) => {
        // 规范成对象数组；兼容旧的字符串数组（每个字符串当作 title）
        const rows = Array.isArray(field.value)
          ? field.value.map((v) =>
              v && typeof v === 'object'
                ? { title: v.title || '', order: v.order || '', mark: v.mark || '' }
                : { title: String(v ?? ''), order: '', mark: '' }
            )
          : [];

        const commit = (next) => field.onChange(next);

        const updateCell = (idx, key, val) => {
          const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
          commit(next);
        };
        const addRow = () => commit([...rows, { title: '', order: '', mark: '' }]);
        const removeRow = (idx) => commit(rows.filter((_, i) => i !== idx));

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {label && (
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
                {label}
              </Typography>
            )}
            {hint && (
              <Typography sx={{ fontSize: 12, opacity: 0.6, color: colors.text }}>
                {hint}
              </Typography>
            )}

            {rows.map((row, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {columns.map((col) => (
                  <TextField
                    key={col.key}
                    value={row[col.key]}
                    onChange={(e) => updateCell(idx, col.key, e.target.value)}
                    placeholder={col.label}
                    size="small"
                    disabled={disabled}
                    sx={{ flex: col.flex }}
                  />
                ))}
                <IconButton
                  aria-label="remove"
                  onClick={() => removeRow(idx)}
                  disabled={disabled}
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            ))}

            <Button
              onClick={addRow}
              disabled={disabled}
              startIcon={<Plus size={16} />}
              size="small"
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              {isCn ? '添加作品' : 'Add Artwork'}
            </Button>
          </Box>
        );
      }}
    />
  );
};

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
  // 关联字段：related_artwork（对象数组编辑器）+ related_gallery_artist（跨实体多选）
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

    // 为数组字段添加"添加"按钮标签
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
     related_gallery_artist → 从 About 取艺术家名（去重，按语言匹配） */
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
        {/* related_artwork —— 对象数组编辑器（title / order / mark 每行可编辑） */}
        <RelatedArtworkEditor
          control={form.control}
          name="related_artwork"
          label={getLabelFunc('related_artwork')}
          disabled={disabled}
          isCn={isCn}
          colors={colors}
          hint={EXHIBITION_FORM_LABELS?.hints?.relatedArtwork?.[isCn ? 'cn' : 'en']}
        />

        {/* related_gallery_artist —— 保留跨实体多选（字符串数组） */}
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
