import { normalizeArtworkOrder } from '@/utils/artworkOrder';

/**
 * Normalise a submitted `order` into the JSON object shape
 * ({ artist_page_order, exhibition_page_order, art_fair_page_order }).
 * Returns undefined when the key wasn't submitted, or null when every
 * page order is empty (so we don't store empty objects).
 */
const cleanArtworkOrder = (value) => {
  if (value === undefined) return undefined;
  const normalised = normalizeArtworkOrder(value);
  const hasValue = Object.values(normalised).some((v) => v !== '');
  return hasValue ? normalised : null;
};

export const artworkApiConfig = {
  // Basic configuration
  collectionName: 'Artwork',

  // Pagination settings
  enablePagination: false,
  defaultPageSize: 10000,
  maxPageSize: 10000,

  // Feature flags
  enableSearch: true,
  enableSorting: true,
  enableSoftDelete: false,
  enableBulkOperations: false,
  enableAutoFillArtist: false,

  // Sorting
  defaultSortField: 'order',
  defaultSortOrder: 1,

  // Schema configuration — fully matches Prisma Artwork model
  requiredFields: [],
  uniqueFields: [],
  searchableFields: ['title', 'artist', 'caption', 'type', 'medium', 'series'],
  arrayFields: ['introduction', 'related_gallery_exhibition'],   // 添加了 related_gallery_exhibition
  // `order` is a JSON object now (artist_page_order / exhibition_page_order /
  // art_fair_page_order) — keep it as an object, never stringify it.
  jsonFields: ['order', 'mark'],
  validFields: [
    'id',                                // 改为 id（原 _id 为数据库映射名，Prisma 字段名为 id）
    'cover_img_url',
    'related_gallery_exhibition',        // 新增缺失字段
    'artist',
    'title',
    'type',
    'medium',
    'year',
    'size',
    'series',
    'caption',
    'duration',
    'credits',
    'special_thanks',
    'introduction',
    'video_url',
    'web_url',
    'work_value',
    'sold',
    'order',
    'mark',
    'language',
    'updatedAt',
  ],

  // Custom validation
  customValidation: async (data, operation) => {
    return { valid: true };
  },

  // Before hooks
  beforeCreate: async (data) => {
    if (data && 'order' in data) data.order = cleanArtworkOrder(data.order);
    return data;
  },

  beforeUpdate: async (id, data, existing) => {
    if (data && 'order' in data) data.order = cleanArtworkOrder(data.order);
    return data;
  },

  // Response transform
  transformResponse: async (data) => {
    return data;
  },
};