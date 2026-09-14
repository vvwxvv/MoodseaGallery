// writingConfig.jsx — fully matches the Prisma Writing model,
// same structure & conventions as artworkConfig.jsx.
import { ANIMATION_VARIANTS } from './general_config';

// ============================================================
// LABELS CONFIGURATION
// ============================================================
export const writingLabels = {
  page: {
    title: { en: 'Writings', cn: '文章' },
    subtitle: { en: 'Writing Management', cn: '文章管理' },
    description: { en: 'Manage writings & texts', cn: '管理文章与文本' },
  },

  fields: {
    cover_img_url: { en: 'Cover Image', cn: '封面图片' },
    author: { en: 'Author', cn: '作者' },
    title: { en: 'Title', cn: '标题' },
    subtitle: { en: 'Subtitle', cn: '副标题' },
    summary: { en: 'Summary', cn: '摘要' },
    keywords: { en: 'Keywords', cn: '关键词' },
    category: { en: 'Category', cn: '类别' },
    type: { en: 'Type', cn: '类型' },
    year: { en: 'Year', cn: '年份' },
    paragraphs: { en: 'Paragraphs', cn: '段落' },
    caption: { en: 'Caption', cn: '说明' },
    status: { en: 'Status', cn: '状态' },
    tag: { en: 'Tag', cn: '标签' },
    mark: { en: 'Mark', cn: '标记' },
    language: { en: 'Language', cn: '语言' },
    createdAt: { en: 'Created At', cn: '创建时间' },
    updatedAt: { en: 'Last Updated', cn: '最后更新' },
  },

  UI_TEXT: {
    writingManagement: { en: 'Writing Management', cn: '文章管理' },
    create: { en: 'Create New', cn: '创建新文章' },
    edit: { en: 'Edit', cn: '编辑' },
    delete: { en: 'Delete', cn: '删除' },
    save: { en: 'Save', cn: '保存' },
    cancel: { en: 'Cancel', cn: '取消' },
    confirmDelete: { en: 'Confirm Delete', cn: '确认删除' },
    noData: { en: 'No writings available', cn: '暂无文章数据' },
  },
};

export const getWritingLabel = (key, language = 'en') => {
  const lang = language === 'cn' ? 'cn' : 'en';
  if (writingLabels.fields[key]) return writingLabels.fields[key][lang];
  if (writingLabels.UI_TEXT[key]) return writingLabels.UI_TEXT[key][lang];
  if (writingLabels.page[key]) return writingLabels.page[key][lang];
  return key;
};

// ============================================================
// MAIN CONFIGURATION
// ============================================================
export const writingConfig = {
  itemUrl: "writing",
  schemaName: "Writing",

  api: {
    endpoints: {
      base: '/api/writing',
      create: '/api/writing',
      update: (id) => `/api/writing/${id}`,
      delete: (id) => `/api/writing/${id}`,
      list: '/api/writing',
      detail: (id) => `/api/writing/${id}`,
      upload: '/api/upload',
      bulk: '/api/writing/batch_edit',
      // The Writing model has no `order` field (no per-page ordering), so
      // there is no reorder endpoint — kept as null for structural parity.
      reorder: null,
    },
    methods: {
      create: 'POST', update: 'PUT', delete: 'DELETE',
      list: 'GET', detail: 'GET', upload: 'POST',
      bulk: 'PUT', reorder: 'PUT',
    },
    headers: { 'Content-Type': 'application/json' },
    uploadHeaders: {},
    languageParam: 'language',
    defaultLimit: 10000,
    config: {
      enableSoftDelete: false,
      enablePagination: false,
      enableSearch: true,
      enableSorting: true,
      defaultPageSize: 10000,
      maxPageSize: 10000,
      // Newest first — the Writing model's own default (see writing_api_config).
      defaultSortOrder: -1,
      defaultSortField: 'createdAt',
      collectionName: 'Writing',
    },
  },

  page: {
    title: writingLabels.page.title,
    subtitle: writingLabels.page.subtitle,
    description: writingLabels.page.description,
    animationVariants: ANIMATION_VARIANTS?.container || {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1, y: 0,
        transition: { delayChildren: 0.15, staggerChildren: 0.08 },
      },
    },
  },

  fields: {
    imagesField: ['cover_img_url'],
    urlField: ['cover_img_url'],
    arrayFields: ['paragraphs'],
    requiredFields: [],
    searchableFields: ['title', 'subtitle', 'author', 'summary', 'keywords'],
    sortableFields: ['createdAt', 'updatedAt', 'year', 'title', 'author'],
    filterableFields: ['type', 'category', 'status', 'tag', 'mark', 'language'],
    mainFields: ['title', 'author', 'year', 'type'],
    expandedFields: ['summary', 'caption', 'category', 'status', 'tag'],
    dataField: [
      'cover_img_url', 'author', 'title', 'subtitle', 'summary',
      'keywords', 'category', 'type', 'year', 'paragraphs',
      'caption', 'status', 'tag', 'mark', 'language',
    ],
    fieldShowOrder: [
      'cover_img_url', 'title', 'subtitle', 'author', 'type',
      'category', 'year', 'summary', 'keywords', 'paragraphs',
      'caption', 'status', 'tag', 'mark', 'language',
    ],
    validFields: [
      'id',                  // 仅保留 Prisma 字段名，移除 _id
      'cover_img_url', 'author', 'title', 'subtitle', 'summary',
      'keywords', 'category', 'type', 'year', 'paragraphs',
      'caption', 'status', 'tag', 'mark', 'language', 'updatedAt',
    ],
  },

  components: {},

  settings: {
    useLanguage: true,
    languageField: 'language',
    pagination: {
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },
    upload: {
      maxFileSize: 10 * 1024 * 1024,
      acceptedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      uploadPath: '/uploads/writings/',
    },
    validation: {
      maxSummaryLength: 2000,
      maxParagraphLength: 4000,
    },
    display: {
      cardImageAspectRatio: 'aspect-square',
      defaultImagePlaceholder: '/placeholder.png',
      showFieldLabels: true,
      showExpandArrow: true,
      showDetailButton: true,
    },
  },

  labels: writingLabels,
  typeOptions: [],
  languageOptions: [
    { value: 'CN', label_en: 'Chinese', label_cn: '中文' },
    { value: 'EN', label_en: 'English', label_cn: '英文' },
  ],
};

export default writingConfig;
