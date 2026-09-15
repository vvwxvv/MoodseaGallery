/**
 * orderInfo.js — the explanatory copy every order page shows under its tabs.
 *
 * User request: "when I switch each order page, show at the top an info
 * introduction: how this order logic works, and which page's order it affects."
 *
 * So each entry answers, in plain language:
 *   • what this sequence controls
 *   • how the cards are GROUPED and numbered (the mental model)
 *   • every place on the public site where the order is visible
 *   • the traps (hidden cards, what is NOT affected, where the value is saved)
 *
 * Keyed by `<collection>:<orderKey>` so the artwork and image tabs can describe
 * the same order key differently (artist-page order means a different thing for
 * artworks than for images).
 */

const I = (en, cn) => ({ en, cn });

export const ORDER_INFO = Object.freeze({
  // ── IMAGES ────────────────────────────────────────────────────────────────
  "image:rolling_img_order": {
    title: I("Artist Page — Rolling Images", "艺术家页 — 轮播图"),
    tag: I("Artist page", "艺术家页"),
    intro: I(
      "This is the order (and the selection) of the images in each artist's rolling slideshow. An image takes part only while it is kept in the rolling set — the eye button on the card is that switch.",
      "这里决定每位艺术家轮播图的顺序与选取范围。只有保留在轮播集合中的图片才会出现 — 卡片上的眼睛按钮就是开关。"
    ),
    how: [
      I(
        "Cards are grouped by artist, A→Z. Every artist has ONE sequence: the numbers continue across that artist's source boxes (Works, Exhibition: …, Art Fair: …).",
        "卡片按艺术家分组（A→Z）。每位艺术家只有一条序列：编号会跨越该艺术家的来源分组（作品 / 展览：… / 艺博会：…）继续。"
      ),
      I(
        "Numbers are per artist and start at 1 — #1 is the first image the artist page shows.",
        "编号按艺术家从 1 开始 — 1 号就是艺术家页最先显示的图片。"
      ),
      I(
        "Drag inside a box to change the order. Dragging across boxes is not offered on purpose: the sequence belongs to the artist, not to a box.",
        "在同一分组内拖动即可改变顺序。不提供跨分组拖动：序列属于艺术家，而不是某个分组。"
      ),
      I(
        "The eye button removes an image from the rolling set: it keeps no position, greys out, drops to half size under the dashed line. Clicking it again puts the image back at the end of the sequence.",
        "点击眼睛按钮会把图片移出轮播集合：它将不再排序，变灰并缩到一半，放在虚线下。再次点击会把它放回序列末尾。"
      ),
    ],
    where: [
      I(
        "Artist page (`/artists/<artist>`) → the right-hand rolling slideshow.",
        "艺术家页（`/artists/<artist>`）→ 右侧轮播图。"
      ),
      I(
        "The same sequence is the default order of the image library API, so it is also the order used by pages that list images without their own order.",
        "同一条序列也是图片库 API 的默认排序，因此没有独立排序的图片列表也按它显示。"
      ),
    ],
    notes: [
      I(
        "Saved on the image as `order.rolling_img_order`. Images without a number are appended after the numbered ones.",
        "保存在图片的 `order.rolling_img_order`。没有编号的图片会排在有序图片之后。"
      ),
      I(
        "The image shown when hovering an artist's name is a different page: Image → Artist Name Hover Image.",
        "悬停艺术家名称时显示的图片属于另一个页面：图库 → 艺术家名称悬停图。"
      ),
      I(
        "Only images tagged to an artist (or to something that resolves to one) can be grouped — anything else lives in “Ungrouped”.",
        "只有能解析到艺术家的图片才会被分组 — 其他图片会落在“未分组”中。"
      ),
    ],
  },

  "image:artist_detail_rolling_img_order": {
    title: I(
      "Artist Detail Page — Rolling Images",
      "艺术家详情页 — 轮播图"
    ),
    tag: I("Artist detail page", "艺术家详情页"),
    intro: I(
      "This is the order (and the selection) of the images in each artist DETAIL page's rolling slideshow — a sequence of its own, separate from the artist page one. An image takes part only while it is kept in this set: the eye button on the card is that switch.",
      "这里决定每位艺术家详情页轮播图的顺序与选取范围 — 这是独立于艺术家页的另一条序列。只有保留在此集合中的图片才会出现：卡片上的眼睛按钮就是开关。"
    ),
    how: [
      I(
        "Cards are grouped by artist, A→Z (same groups as the artist-page tab), with one numbered sequence per artist: 1…N.",
        "卡片按艺术家分组（A→Z，与艺术家页标签相同的分组），每位艺术家一条编号序列：1…N。"
      ),
      I(
        "Each artist's box starts with a preview strip of that artist's detail-page rolling images, in order — so the box shows what the page will show before you drag anything.",
        "每位艺术家的分组顶部会显示该艺术家详情页轮播图的顺序预览 — 在拖动之前就能看到页面将会显示什么。"
      ),
      I(
        "Drag inside a box to change the order; the numbers follow the slides.",
        "在同一分组内拖动即可改变顺序；编号与轮播顺序一致。"
      ),
      I(
        "The eye button removes an image from THIS sequence only — it has its own hide flag, so the artist-page sequence is not affected (and the other way round).",
        "眼睛按钮只会把图片移出这条序列 — 它有自己的隐藏标记，不会影响艺术家页序列（反之亦然）。"
      ),
    ],
    where: [
      I(
        "Artist detail page (`/artists/<artist>`) → the rolling slideshow at the top of the right column.",
        "艺术家详情页（`/artists/<artist>`）→ 右栏顶部的轮播图。"
      ),
    ],
    notes: [
      I(
        "Saved on the image as `order.artist_detail_rolling_img_order` (hide flag `artist_detail_rolling_image`).",
        "保存在图片的 `order.artist_detail_rolling_img_order`（隐藏标记 `artist_detail_rolling_image`）。"
      ),
      I(
        "Until you SAVE this order for an artist, that artist's detail page keeps using the Artist Page sequence — so the slideshow is never empty and nothing changes by accident. Each artist switches over on its own once its order is saved (the box says so until then).",
        "在某位艺术家保存这条排序之前，该艺术家的详情页仍使用“艺术家页”序列 — 因此轮播图不会为空，也不会被意外改动。每位艺术家在保存后会各自切换（未保存前分组内会提示）。"
      ),
      I(
        "The artist page sequence itself is the first tab: “Artist Page Order (Rolling Images)”.",
        "艺术家页序列是第一个标签：“艺术家页排序（轮播图）”。"
      ),
    ],
  },

  "image:exhibition_page_order": {
    title: I("Exhibition Page Order — Images", "展览页排序 — 图片"),
    tag: I("Exhibition pages", "展览页"),
    intro: I(
      "This is the order of the images inside each exhibition page's gallery. Images are grouped BY EXHIBITION (not by artist), because a show page shows one single ordered gallery: one show = one numbered sequence.",
      "这里决定每个展览页图集内图片的顺序。图片按展览分组（不是按艺术家），因为展览页只显示一条有序图集：一个展览 = 一条编号序列。"
    ),
    how: [
      I(
        "One box per exhibition that has images, in the same order as the Exhibitions list: newest first by start date, then by title.",
        "每个有图片的展览一个分组，顺序与展览列表一致：按开始日期从新到旧，其次按标题。"
      ),
      I(
        "A box contains exactly the images that exhibition's page displays: images whose tag (EN or CN) equals the exhibition title — the same rule the page itself uses.",
        "分组内只包含该展览页真正显示的那些图片：标签（中/英文）等于展览标题的图片 — 与页面使用的规则完全一致。"
      ),
      I(
        "Numbers run 1…N inside a box: #1 is the first image on that exhibition page, and it becomes the show's main image whenever the exhibition has no cover image of its own.",
        "分组内编号为 1…N：1 号是该展览页的第一张图片；当展览本身没有封面时，它也会成为该展览的主图。"
      ),
      I(
        "Drag to reorder inside a box. The order OF THE BOXES follows the exhibitions' own dates — change that in the exhibition manager, not here.",
        "在分组内拖动即可排序。分组之间的顺序由展览自身日期决定 — 请在展览管理页修改，而不是在这里。"
      ),
    ],
    where: [
      I(
        "Exhibition page (`/exhibitions/<show>`) → the installation-view gallery; image #1 is also the main image when no cover is set.",
        "展览页（`/exhibitions/<show>`）→ 现场图集；当没有设置封面时，第 1 张也会作为主图。"
      ),
    ],
    notes: [
      I(
        "Saved on the image as `order.exhibition_page_order`. The exhibition page tab also orders the ARTWORK list of the show — that one is Artwork → Order.",
        "保存在图片的 `order.exhibition_page_order`。展览页的作品列表由另一个页面排序：作品 → 排序。"
      ),
      I(
        "The eye button hides an image from that exhibition's page (same idea as hiding an artwork from the show's Works grid).",
        "眼睛按钮会把图片从该展览页隐藏（与从展览作品列表隐藏作品同理）。"
      ),
      I(
        "A trailing “Not matched” box holds images that still carry a position but whose exhibition can no longer be found (renamed show, re-tagged image …) — worth a check.",
        "末尾的“未匹配”分组列出仍保存了排序、但已找不到对应展览的图片（展览改名、图片标签改动等）— 值得检查。"
      ),
    ],
  },

  "image:art_fair_page_order": {
    title: I("Art Fair Page Order — Images", "艺博会页排序 — 图片"),
    tag: I("Art fair pages", "艺博会页"),
    intro: I(
      "This is the order of the images inside each art fair page's gallery. Like the exhibition tab, images are grouped BY ART FAIR: one fair = one numbered sequence.",
      "这里决定每个艺博会页图集内图片的顺序。与展览同理，图片按艺博会分组：一个艺博会 = 一条编号序列。"
    ),
    how: [
      I(
        "One box per art fair that has images, newest first by start date, then by title.",
        "每个有图片的艺博会一个分组，按开始日期从新到旧，其次按标题。"
      ),
      I(
        "A box contains exactly the images the fair page shows: tag (EN or CN) equal to the fair title, or an image that carries the fair's id.",
        "分组内只包含该艺博会页真正显示的图片：标签（中/英文）等于艺博会标题，或图片直接携带艺博会 id。"
      ),
      I(
        "Numbers run 1…N inside a box: #1 is the first image on that fair page.",
        "分组内编号为 1…N：1 号是该艺博会页的第一张图片。"
      ),
    ],
    where: [
      I(
        "Art fair page (`/fairs/<fair>`) → the gallery images.",
        "艺博会页（`/fairs/<fair>`）→ 图集。"
      ),
    ],
    notes: [
      I(
        "Saved on the image as `order.art_fair_page_order`.",
        "保存在图片的 `order.art_fair_page_order`。"
      ),
      I(
        "The eye button hides an image from that art fair's page.",
        "眼睛按钮会把图片从该艺博会页隐藏。"
      ),
    ],
  },

  // ── ARTWORKS ──────────────────────────────────────────────────────────────
  "artwork:artist_page_order": {
    title: I("Artist Page Order — Artworks", "艺术家页排序 — 作品"),
    tag: I("Artist page", "艺术家页"),
    intro: I(
      "This orders the WORKS on the artist page: the Related Artworks grid, the artist's work list and the thumbnail used in the artist list.",
      "这里决定艺术家页中作品的顺序：相关作品网格、该艺术家的作品列表，以及艺术家列表中的缩略图。"
    ),
    how: [
      I(
        "Cards are grouped by artist (A→Z, “Ungrouped” last); each artist is one independent sequence.",
        "卡片按艺术家分组（A→Z，“未分组”在最后）；每位艺术家是一条独立序列。"
      ),
      I(
        "Numbers run 1…N inside a group — #1 is the first work on that artist's page. Works without a number follow, newest year first.",
        "分组内编号 1…N — 1 号是该艺术家页上的第一件作品。没有编号的作品排在其后，年份新的优先。"
      ),
      I(
        "The eye button hides a work from the artist page only: it keeps no position here, greys out and drops under the dashed line. Its positions on the exhibition / art fair pages are untouched.",
        "眼睛按钮只会把作品从艺术家页隐藏：它在这里不再排序、变灰并放到虚线下。它在展览页 / 艺博会页的排序不受影响。"
      ),
    ],
    where: [
      I("Artist page (`/artists/<artist>`) → “Related Artworks” grid and the work list.", "艺术家页（`/artists/<artist>`）→“相关作品”网格与作品列表。"),
      I("Artist list (`/artists`) → each artist's thumbnail.", "艺术家列表（`/artists`）→ 每位艺术家的缩略图。"),
    ],
    notes: [
      I(
        "Saved on the artwork as `order.artist_page_order`. This does NOT order the artist page's image slideshow — that is Image → Order.",
        "保存在作品的 `order.artist_page_order`。它并不决定艺术家页的图片轮播 — 那是 图库 → 排序。"
      ),
    ],
  },

  "artwork:exhibition_page_order": {
    title: I("Exhibition Page Order — Artworks", "展览页排序 — 作品"),
    tag: I("Exhibition pages", "展览页"),
    intro: I(
      "This orders the WORKS inside an exhibition page's “Works” grid. Works are grouped by artist; the positions are per exhibition page, so the same work can sit at #1 on one show and #5 on another.",
      "这里决定展览页“作品”网格中作品的顺序。作品按艺术家分组；排序按展览页独立保存，因此同一件作品可以在不同展览中处于不同位置。"
    ),
    how: [
      I(
        "Cards are grouped by artist (A→Z); numbers run 1…N inside each artist's group.",
        "卡片按艺术家分组（A→Z）；组内编号 1…N。"
      ),
      I(
        "An exhibition only lists the works pinned to it (from the exhibition's related artworks, or the artwork's related exhibitions).",
        "展览只列出关联到它的作品（来自展览的关联作品，或作品的关联展览）。"
      ),
      I(
        "The eye button hides a work from the exhibition page; other pages keep their own positions.",
        "眼睛按钮把作品从展览页隐藏；其他页面各自的排序保持不变。"
      ),
    ],
    where: [
      I("Exhibition page (`/exhibitions/<show>`) → the “Works” grid.", "展览页（`/exhibitions/<show>`）→“作品”网格。"),
    ],
    notes: [
      I(
        "Saved on the artwork as `order.exhibition_page_order`. The show's image gallery is ordered separately (Image → Order → Exhibition Page Order).",
        "保存在作品的 `order.exhibition_page_order`。展览的图片图集另行排序（图库 → 排序 → 展览页排序）。"
      ),
    ],
  },

  "artwork:art_fair_page_order": {
    title: I("Art Fair Page Order — Artworks", "艺博会页排序 — 作品"),
    tag: I("Art fair pages", "艺博会页"),
    intro: I(
      "This orders the WORKS inside an art fair page's “Works” grid, grouped by artist, with one position per fair.",
      "这里决定艺博会页“作品”网格中作品的顺序，按艺术家分组，每个艺博会有独立位置。"
    ),
    how: [
      I("Cards are grouped by artist (A→Z); numbers run 1…N inside each group.", "卡片按艺术家分组（A→Z）；组内编号 1…N。"),
      I("The eye button hides a work from the art fair page only.", "眼睛按钮只会把作品从艺博会页隐藏。"),
    ],
    where: [I("Art fair page (`/fairs/<fair>`) → the “Works” grid.", "艺博会页（`/fairs/<fair>`）→“作品”网格。")],
    notes: [
      I("Saved on the artwork as `order.art_fair_page_order`.", "保存在作品的 `order.art_fair_page_order`。"),
    ],
  },

  // ── Image hover page (a picker, not an order) ──────────────────────────────
  "image:artist_hover_image": {
    title: I("Artist Name Hover Image", "艺术家名称悬停图"),
    tag: I("Artist names", "艺术家名称"),
    intro: I(
      "One image per artist: what a visitor sees when they hover the artist's name on the site. It is a pick (a flag), not an order — the rolling sequence is untouched.",
      "每位艺术家一张图片：访客在网站上悬停艺术家名称时看到的图片。这是一个“选择”（标记），不是排序 — 不会改变轮播顺序。"
    ),
    how: [
      I("Cards are grouped by artist (A→Z). Everything is grey until it is picked; the picked image turns to full colour and jumps to the front of its group.", "卡片按艺术家分组（A→Z）。未被选中的都是灰色；被选中的图片恢复颜色并移到该组最前。"),
      I("Choosing another image for the same artist clears the previous choice — only one per artist.", "为同一艺术家选择另一张图片会自动取消上一张 — 每位艺术家只保留一张。"),
      I("Clicking the button saves immediately; there is no separate save step.", "点击按钮即保存，无需额外保存步骤。"),
    ],
    where: [
      I("Artist names across the site (artist pages, artist list, menus) → the hover preview image.", "网站中的艺术家名称（艺术家页、艺术家列表、菜单）→ 悬停预览图。"),
    ],
    notes: [
      I("Saved on the image as the `artist_hover_image` flag inside `mark`.", "保存在图片的 `mark.artist_hover_image` 标记中。"),
    ],
  },
});

/** Info entry for one order key on one collection (null when unwritten). */
export const orderInfoFor = (orderKey, entity = "image") =>
  ORDER_INFO[`${entity}:${orderKey}`] || null;

export default orderInfoFor;
