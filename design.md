# Foodly Kitchen --- Style Reference

> A warm, conversion-focused food ordering catalog. A compact brand
> header and muted cream page frame a dense grid of appetizing product
> photography, while golden-yellow controls guide search, filtering, and
> add-to-cart actions.

**Theme:** light

Source: user-provided screenshot of the Foodly Kitchen "Full Menu" page.
Measurements, colors, typography, and component specifications below are
visual estimates interpreted from the screenshot rather than extracted
source-code values. Treat the values as practical design tokens for
recreating the reference, not as verified production CSS.

Foodly Kitchen combines a warm ivory canvas with near-white product
cards and a restrained golden-yellow accent. The composition is a
desktop menu-browsing page: a slim white navigation bar sits above a
pale warm-gray title/search band; the main content uses a narrow filter
sidebar beside a four-column product grid; pagination separates the
catalog from a "Recently Viewed" strip; and a warm footer closes the
page. Food photography provides nearly all of the strong color, so
interface chrome remains quiet. Small rounded corners, thin warm-gray
borders, compact sans-serif labels, star ratings, preparation-time
metadata, and circular yellow add buttons make the interface feel
approachable and transactional without looking visually heavy.

## Tokens --- Colors

  ----------------------------------------------------------------------------------
  Name             Value               Token                     Role
  ---------------- ------------------- ------------------------- -------------------
  Warm Canvas      `#f5f2ed`           `--color-warm-canvas`     Main menu
                                                                 background and
                                                                 broad warm-neutral
                                                                 page regions

  Footer Cream     `#f1ede7`           `--color-footer-cream`    Recently Viewed and
                                                                 footer background;
                                                                 visually distinct
                                                                 from the main
                                                                 catalog

  Pure White       `#ffffff`           `--color-white`           Header, product
                                                                 cards, filter
                                                                 panel, search
                                                                 field, pagination
                                                                 controls, and
                                                                 footer content
                                                                 surfaces

  Soft Border      `#e9e5df`           `--color-soft-border`     Card outlines,
                                                                 sidebar divisions,
                                                                 input edges, and
                                                                 subtle component
                                                                 boundaries

  Muted Divider    `#eeeae4`           `--color-muted-divider`   Fine separators
                                                                 inside the filter
                                                                 panel and footer

  Primary Ink      `#242321`           `--color-primary-ink`     Product titles,
                                                                 section headings,
                                                                 filter labels,
                                                                 prices, and primary
                                                                 navigation text

  Secondary Ink    `#68645e`           `--color-secondary-ink`   Descriptions,
                                                                 breadcrumbs,
                                                                 secondary
                                                                 navigation, and
                                                                 supporting metadata

  Muted Gray       `#918c84`           `--color-muted-gray`      Placeholder text,
                                                                 small metadata,
                                                                 subdued icons, and
                                                                 low-emphasis labels

  Foodly Gold      `#f5c943`           `--color-foodly-gold`     Primary buttons,
                                                                 active pagination,
                                                                 selected filters,
                                                                 add-to-cart
                                                                 controls, and
                                                                 selected chips

  Gold Hover       `#e8b82b`           `--color-gold-hover`      Suggested
                                                                 hover/pressed state
                                                                 for primary gold
                                                                 controls

  Sale Gold        `#f8d84f`           `--color-sale-gold`       New, bestseller,
                                                                 and trending badges

  Rating Gold      `#e9b82f`           `--color-rating-gold`     Star ratings and
                                                                 rating highlights

  Discount Red     `#d94b3d`           `--color-discount-red`    Optional error or
                                                                 unavailable-state
                                                                 accent; not a
                                                                 dominant color in
                                                                 the reference

  Icon Gray        `#77736d`           `--color-icon-gray`       Heart, search,
                                                                 profile, bag,
                                                                 clock, and utility
                                                                 icons
  ----------------------------------------------------------------------------------

## Tokens --- Typography

### Rounded Contemporary Sans --- Interface and catalog typography. Use a clean, neutral sans-serif with compact proportions; Inter is a practical substitute for the screenshot's small, modern UI lettering. · `--font-ui`

-   **Substitute:** Inter, Helvetica Neue, Arial, system-ui, sans-serif
-   **Weights:** 400, 500, 600, 700
-   **Sizes:** 9px, 10px, 11px, 12px, 14px, 16px, 20px
-   **Line height:** 1.2, 1.35, 1.45
-   **Letter spacing:** normal to slightly negative for compact labels
-   **Role:** Navigation, filters, product names, descriptions, price,
    badges, metadata, buttons, and pagination. Keep the interface type
    small and legible so product imagery remains the main visual
    attraction.

### Editorial Serif --- Page and section headings. Use a restrained, traditional serif to contrast with the compact sans-serif interface and reinforce the warm, food-focused identity. · `--font-display`

-   **Substitute:** Georgia, "Times New Roman", serif
-   **Weights:** 600, 700
-   **Sizes:** 18px, 20px, 24px
-   **Line height:** 1.1, 1.25
-   **Letter spacing:** normal
-   **Role:** "Full Menu" and "Recently Viewed" headings. Keep display
    headings compact rather than oversized; the screenshot uses
    hierarchy and spacing rather than a dramatic hero headline.

### Type Scale

  ---------------------------------------------------------------------------------------------------------------------
  Role                  Family      Weight   Size       Line Height    Letter Spacing    Token
  --------------------- ----------- -------- ---------- -------------- ----------------- ------------------------------
  utility-nav           UI Sans     400      9--10px    1.2            normal            `--text-utility-nav`

  breadcrumb            UI Sans     400      9px        1.35           normal            `--text-breadcrumb`

  page-title            Editorial   700      20px       1.1            normal            `--text-page-title`
                        Serif                                                            

  section-title         Editorial   700      16px       1.2            normal            `--text-section-title`
                        Serif                                                            

  filter-heading        UI Sans     600      11px       1.25           normal            `--text-filter-heading`

  product-title         UI Sans     600      10px       1.25           normal            `--text-product-title`

  product-description   UI Sans     400      8px        1.3            normal            `--text-product-description`

  price                 UI Sans     700      10--11px   1.2            normal            `--text-price`

  metadata              UI Sans     400      8px        1.2            normal            `--text-metadata`

  button-label          UI Sans     600      9--10px    1.2            normal            `--text-button-label`
  ---------------------------------------------------------------------------------------------------------------------

## Tokens --- Spacing & Shapes

**Base unit:** 4px

**Density:** compact, with generous outer whitespace and tight internal
catalog spacing.

### Spacing Scale

  Name   Value   Token
  ------ ------- ----------------
  4      4px     `--spacing-4`
  6      6px     `--spacing-6`
  8      8px     `--spacing-8`
  10     10px    `--spacing-10`
  12     12px    `--spacing-12`
  16     16px    `--spacing-16`
  20     20px    `--spacing-20`
  24     24px    `--spacing-24`
  28     28px    `--spacing-28`
  32     32px    `--spacing-32`
  40     40px    `--spacing-40`
  48     48px    `--spacing-48`

### Border Radius

  Element                 Value
  ----------------------- -----------------------
  product cards           10--12px
  filter panel            12px
  search input            999px
  primary buttons         999px
  selected filter chips   6px
  status badges           5--7px
  add-to-cart buttons     50% / circular
  pagination buttons      7--8px
  product imagery         8--10px where clipped
  header                  0px

### Shadows

  ------------------------------------------------------------------------------------
  Name                  Value                                 Token
  --------------------- ------------------------------------- ------------------------
  card separation       `0 1px 2px rgba(40, 32, 20, 0.025)`   `--shadow-card`

  floating dropdown     `0 4px 14px rgba(40, 32, 20, 0.08)`   `--shadow-dropdown`
  ------------------------------------------------------------------------------------

Use shadows sparingly. Most separation comes from white surfaces placed
over warm-neutral backgrounds and from very subtle borders.

### Layout

-   **Reference canvas:** centered desktop page on a light-gray outer
    surround.
-   **Content width:** approximately 90% of the screenshot canvas, with
    a consistent centered alignment.
-   **Header height:** approximately 46--48px in the supplied
    screenshot.
-   **Title/search band:** approximately 96px tall.
-   **Main catalog:** two-column layout with a narrow filter sidebar and
    a flexible product area.
-   **Sidebar width:** approximately 20--22% of the main content width.
-   **Catalog grid:** four columns at the reference desktop width.
-   **Grid gap:** approximately 10--12px.
-   **Card padding:** approximately 8--10px.
-   **Section gap:** 28--40px between major page regions.
-   **Element gap:** 8--12px for related controls and metadata.

## Components

### Top Navigation

**Role:** Brand identity, primary navigation, and global account/cart
actions

Use a white horizontal bar with the Foodly Kitchen logo at the left, a
centered or near-centered list of compact links, then search, account,
shopping-bag, and "Order Now" controls at the right. Navigation labels
are small, neutral, and evenly spaced. Highlight the current page with
darker text rather than a large tab background. Keep utility icons
monochrome and compact. The "Order Now" action is the strongest header
control: a gold pill with dark text.

### Brand Logo

**Role:** Brand recognition

Place the red Foodly wordmark and small kitchen descriptor at the left
edge of the header. Preserve its compact footprint and avoid enlarging
it to compete with the catalog. Use the supplied brand artwork if
available; do not recreate the logo with plain text when the original
asset exists.

### Page Intro and Search Band

**Role:** Establish page context and enable quick product discovery

Use a full-width warm-neutral band below the header. Place a small
breadcrumb above the "Full Menu" title on the left, followed by a short
muted line describing the menu. Align a long, white, pill-shaped search
input to the right. Include a search icon, concise placeholder text, and
a compact gold Search button nested at the right end. Keep the band
visually quiet; it is a transition into the catalog, not a promotional
hero.

### Breadcrumb

**Role:** Lightweight location context

Render "Home / Full Menu" as a small line above the page title. Use
muted secondary text for the parent page and darker or semibold text for
the current page. Avoid a large breadcrumb container or prominent
separator.

### Filter Sidebar

**Role:** Refine menu items without interrupting browsing

Place a white, rounded panel to the left of the product grid. The panel
begins with "Filters" and a small "Clear all" action, followed by fine
horizontal dividers between groups. Use compact labels and vertically
stacked checkbox/radio options. The visible groups are Category, Price
Range, Portion Size, Dietary, Meal Time, Rating, and Availability.
Finish with a full-width gold "Apply Filters" pill.

-   **Category:** checkbox list, with All selected by default.
-   **Price Range:** two-ended horizontal range slider with small
    circular handles and a gold active track.
-   **Portion Size:** compact segmented chips for Regular, Large, and
    Family; the selected option has a gold fill.
-   **Dietary:** checkbox options such as Vegetarian, Vegan, Spicy, and
    Gluten-Free.
-   **Meal Time:** checkbox options for Breakfast, Snacks, Dinner, and
    Late Night.
-   **Rating:** star-based threshold options with short "& up" labels.
-   **Availability:** radio choices for Available Now and Schedule for
    Later.
-   **Clear all:** low-emphasis text control; do not style it as a
    second primary button.

### Catalog Toolbar

**Role:** Show result count and control ordering

Above the product grid, show the item count at the left and a compact
white sort dropdown at the right. Use a short label such as "78 Menu
Items" and "Sort by: Popular." Keep both controls aligned on one
baseline and avoid adding a heavy toolbar background.

### Product Grid

**Role:** Primary browsing and purchase surface

Use four equal columns at the desktop reference size. Each product card
is a white rounded rectangle with a subtle warm-gray border, minimal
shadow, and compact padding. Keep product photography prominent in the
upper portion, followed by a short title, a one-line or two-line
description, rating and review count, preparation time, price, favorite
control, and a circular gold add button.

Cards should feel consistent, but image crops and the food itself
provide natural variety. Maintain a stable image area so titles and
prices line up across a row. Avoid excessive text, oversized shadows, or
large card padding that would reduce the number of visible products.

### Product Image

**Role:** Appetite appeal and fast item recognition

Use high-quality isolated food photography on a clean white or
transparent-looking background. The image should occupy roughly the
upper half of the card and preserve the natural shape and color of each
item. Use `object-fit: contain` for isolated product shots; use `cover`
only when the source image is designed to crop. Keep image framing
consistent across burgers, pizzas, drinks, fries, wraps, and desserts.

### Product Status Badge

**Role:** Highlight new or commercially important items

Use a small gold badge in the upper-left corner of the image area for
labels such as "NEW," "BESTSELLER," or "TRENDING." Keep the badge
compact, with dark text and modest rounding. Do not use gradients, large
banners, or multiple competing status colors.

### Favorite Control

**Role:** Save an item for later

Position a small outline heart at the upper-right of the product image
area. The default state is a quiet gray outline; the active state may
use the brand gold or a restrained warm accent. Keep the hit target
larger than the visible glyph for accessibility without enlarging the
icon itself.

### Product Details

**Role:** Communicate item name, ingredients, rating, timing, and cost

Use a semibold compact product title, then a muted single-line
description. Below it, place rating stars and review count on the left
and a small clock icon with preparation time on the right. Put the price
at the lower left and the circular add button at the lower right.
Maintain a clear hierarchy: title first, price second, description and
metadata third.

### Add-to-Cart Button

**Role:** Fast product addition

Use a small circular gold button with a centered plus icon at the
lower-right corner of each product card. The button should be easy to
locate without overpowering the product. Provide visible hover, focus,
pressed, loading, and added-to-cart states in implementation. If adding
an item changes cart state, update the cart count and provide accessible
feedback.

### Sort Dropdown

**Role:** Change product ordering

Use a white pill or softly rounded rectangular control with a thin
warm-gray border, compact text, and a chevron. It should align to the
right above the grid. The selected value in the reference is "Popular."
Keep the dropdown visually subordinate to the gold search and add
controls.

### Pagination

**Role:** Navigate a long menu catalog

Center pagination below the product grid. Use small rounded-square white
buttons for page numbers, a gold fill for the active page, and quiet
chevrons for previous/next. Show a concise range of pages, an ellipsis
where needed, and the last page. Maintain consistent button dimensions
and gaps; do not make pagination a full-width bar.

### Recently Viewed

**Role:** Encourage return visits and repeat orders

Use a warm cream section spanning the content width beneath the catalog.
Add a serif "Recently Viewed" heading and a single horizontal row of
four product cards. These cards are slightly more spacious than the main
grid and repeat the same core pattern: large food image, favorite icon,
title, short description, rating, prep time, price, and circular gold
add control. Keep the section distinct through its background rather
than through a heavy border.

### Footer

**Role:** Secondary navigation and brand reassurance

Use a warm cream background that continues the Recently Viewed section.
Place the Foodly logo and a short brand promise in the left column. To
the right, use compact link columns for Company, Explore, Support, and
Legal. At the bottom, show small copyright text at the left and circular
social icons at the right. Use small muted labels and comfortable column
spacing. Avoid strong borders and avoid turning footer links into cards.

### Iconography

**Role:** Utility cues and lightweight interaction affordances

Use simple outline icons with consistent stroke weight for search,
account, bag, heart, clock, plus, chevron, and social actions. Icons are
small and generally muted gray. The add-to-cart plus and selected-state
marks may use dark ink against gold. Avoid mixing filled and outlined
icon families without a clear state reason.

## Do's and Don'ts

### Do

-   Use a warm ivory background, white cards, and a golden-yellow accent
    to reproduce the food-focused atmosphere.
-   Keep food photography as the dominant source of visual color and
    detail.
-   Preserve the desktop information architecture: header, title/search
    band, filter sidebar, four-column grid, pagination, Recently Viewed,
    and footer.
-   Use compact sans-serif type for interface details and a restrained
    serif for page and section headings.
-   Keep product cards consistent in image height, title position,
    metadata alignment, and bottom action placement.
-   Use gold selectively for primary actions, active selections, star
    highlights, and small status labels.
-   Separate content with whitespace, subtle borders, and warm surface
    contrast rather than heavy shadows.
-   Ensure checkboxes, range sliders, portion chips, sort, favorites,
    pagination, and add-to-cart controls have clear interaction states.
-   Reflow the layout responsively: collapse filters into a drawer or
    expandable panel on small screens and reduce the grid to two
    columns, then one where needed.

### Don't

-   Do not introduce large dark surfaces or saturated colors that
    compete with the food photography.
-   Do not use gradients, glassmorphism, or dramatic shadows; the
    reference is flat and warm.
-   Do not turn every control into a gold button. Gold is reserved for
    primary actions and selected states.
-   Do not let product descriptions or metadata become too dense to
    scan.
-   Do not vary product image scale arbitrarily from one card to the
    next.
-   Do not remove rating, preparation-time, price, or add controls from
    the product-card hierarchy.
-   Do not use oversized badges, thick borders, or sharp card corners.
-   Do not treat the reference's desktop dimensions as fixed on mobile;
    preserve hierarchy while adapting the layout.

## Surfaces

  -------------------------------------------------------------------------
  Level             Name           Value             Purpose
  ----------------- -------------- ----------------- ----------------------
  0                 Warm Canvas    `#f5f2ed`         Main catalog canvas
                                                     and page-level neutral
                                                     background

  1                 Footer Cream   `#f1ede7`         Recently Viewed and
                                                     footer region

  2                 Pure White     `#ffffff`         Navigation, product
                                                     cards, filters,
                                                     search, and pagination

  3                 Soft Border    `#e9e5df`         Subtle card and
                                                     control outlines

  4                 Foodly Gold    `#f5c943`         Selected controls,
                                                     primary buttons, and
                                                     add-to-cart actions
  -------------------------------------------------------------------------

## Elevation

The interface relies on surface contrast and thin outlines rather than
visible elevation. Use white cards over a warm-neutral canvas with a
barely perceptible shadow, if any. Reserve a slightly stronger shadow
for overlays such as dropdowns, drawers, or floating filter panels. Do
not add shadows to every nested control.

## Imagery

Food imagery is the main visual asset. The screenshot shows isolated
menu photography---burgers, pizza, fries, iced drinks, wraps,
breadsticks, desserts, onion rings, and other dishes---framed on white
card surfaces. Images should be crisp, appetizing, evenly lit, and
cropped consistently. Prefer clean studio-style food photography with a
white or transparent background. Keep the subject large enough to
recognize at a glance, but leave breathing room around irregular
silhouettes. Product imagery should not receive heavy filters, color
overlays, or decorative frames.

## Layout

The page is centered inside a light-gray outer surround. A narrow white
navigation bar sits at the top. Below it, a warm-neutral intro band
contains breadcrumbs and the "Full Menu" heading on the left and a
pill-shaped search field on the right. The main section places a tall
white filter panel on the left and a catalog area on the right. The
catalog toolbar shows the result count and sort control, followed by a
four-column grid of compact white product cards. Pagination is centered
below the grid. A broad warm-cream "Recently Viewed" section then
presents four larger cards in a horizontal row. The footer continues the
cream surface, with brand identity at left, four compact link groups
across the middle, and copyright/social controls along the bottom edge.

For responsive implementation, retain the same order and visual
hierarchy. At medium widths, reduce the grid to two or three columns and
let the sidebar become narrower or collapsible. On mobile, move search
into a full-width row, make filters accessible through a filter button
and drawer, use a two-column product grid where space permits, and stack
footer columns. Preserve comfortable tap targets even when labels and
metadata remain compact.

## Agent Prompt Guide

Quick Color Reference: - Warm Canvas: `#f5f2ed` --- Main menu background
and broad warm-neutral page regions - Footer Cream: `#f1ede7` ---
Recently Viewed and footer background - Pure White: `#ffffff` ---
Header, cards, filter panel, search, and pagination surfaces - Soft
Border: `#e9e5df` --- Fine borders and separators - Muted Divider:
`#eeeae4` --- Internal filter and footer dividers - Primary Ink:
`#242321` --- Main text and headings - Secondary Ink: `#68645e` ---
Descriptions, breadcrumbs, and supporting text - Muted Gray: `#918c84`
--- Placeholders and subdued metadata - Foodly Gold: `#f5c943` ---
Primary actions, selected controls, and active pagination - Gold Hover:
`#e8b82b` --- Hover and pressed states - Sale Gold: `#f8d84f` --- New,
bestseller, and trending badges - Rating Gold: `#e9b82f` --- Star rating
highlights

Build a light-themed food menu page with a warm `#f5f2ed` canvas, white
rounded product cards, restrained serif headings, and compact Inter-like
interface typography. Use a white top navigation with a compact red
brand logo, small neutral navigation links, utility icons, and a gold
`#f5c943` "Order Now" pill. Add a warm-neutral intro band with a
breadcrumb and "Full Menu" heading on the left and a long white
pill-shaped search input with a gold Search control on the right.

Below the intro, create a two-column desktop layout: a compact white
filter panel on the left and a flexible catalog on the right. Include
Category, Price Range, Portion Size, Dietary, Meal Time, Rating, and
Availability filters, using thin dividers, small checkboxes/radios, a
gold range track, and selected gold chips. In the catalog toolbar, show
the menu-item count on the left and a white "Sort by: Popular" dropdown
on the right. Render a four-column grid of white product cards with
10--12px corners, subtle warm-gray borders, consistent isolated food
imagery, compact product titles, muted descriptions, star ratings,
preparation times, prices, outline hearts, and circular gold plus
buttons. Add small gold status badges for selected products.

Center compact pagination beneath the grid, using gold for the active
page. Follow it with a warm cream "Recently Viewed" section containing a
serif heading and four slightly larger product cards. Finish with a
matching cream footer: brand and tagline at left,
Company/Explore/Support/Legal link columns, then small copyright text
and circular social icons.

Use gold only for primary actions and selected states; let food
photography provide most color. Keep shadows almost imperceptible, avoid
gradients and heavy borders, align product-card internals consistently,
and make all interactive controls accessible. On tablet, reduce catalog
columns and adapt the sidebar; on mobile, use a filter drawer,
full-width search, a compact two-column grid, and stacked footer groups
while preserving the same warm visual identity.

## Similar Brands

-   **Sweetgreen** --- Clean food imagery, restrained typography, and a
    calm neutral interface.
-   **CAVA** --- Warm food-forward visual language with direct ordering
    controls.
-   **Shake Shack** --- Friendly, approachable ordering UI with clear
    product hierarchy.
-   **Toast** --- Practical restaurant-ordering patterns and compact
    transaction-focused controls.

## Quick Start

### CSS Custom Properties

``` css
:root {
  /* Colors */
  --color-warm-canvas: #f5f2ed;
  --color-footer-cream: #f1ede7;
  --color-white: #ffffff;
  --color-soft-border: #e9e5df;
  --color-muted-divider: #eeeae4;
  --color-primary-ink: #242321;
  --color-secondary-ink: #68645e;
  --color-muted-gray: #918c84;
  --color-foodly-gold: #f5c943;
  --color-gold-hover: #e8b82b;
  --color-sale-gold: #f8d84f;
  --color-rating-gold: #e9b82f;
  --color-discount-red: #d94b3d;
  --color-icon-gray: #77736d;

  /* Typography */
  --font-ui: Inter, "Helvetica Neue", Arial, system-ui, sans-serif;
  --font-display: Georgia, "Times New Roman", serif;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Type scale */
  --text-utility-nav: 10px;
  --text-breadcrumb: 9px;
  --text-page-title: 20px;
  --text-section-title: 16px;
  --text-filter-heading: 11px;
  --text-product-title: 10px;
  --text-product-description: 8px;
  --text-price: 11px;
  --text-metadata: 8px;
  --text-button-label: 10px;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;

  /* Radius */
  --radius-product-card: 11px;
  --radius-filter-panel: 12px;
  --radius-search: 999px;
  --radius-button: 999px;
  --radius-chip: 6px;
  --radius-badge: 6px;
  --radius-pagination: 8px;
  --radius-circle: 50%;

  /* Elevation */
  --shadow-card: 0 1px 2px rgba(40, 32, 20, 0.025);
  --shadow-dropdown: 0 4px 14px rgba(40, 32, 20, 0.08);

  /* Layout */
  --catalog-columns-desktop: 4;
  --catalog-grid-gap: 12px;
  --card-padding: 9px;
  --section-gap: 32px;
  --element-gap: 10px;
}
```

### Tailwind v4

``` css
@theme {
  /* Colors */
  --color-warm-canvas: #f5f2ed;
  --color-footer-cream: #f1ede7;
  --color-white: #ffffff;
  --color-soft-border: #e9e5df;
  --color-muted-divider: #eeeae4;
  --color-primary-ink: #242321;
  --color-secondary-ink: #68645e;
  --color-muted-gray: #918c84;
  --color-foodly-gold: #f5c943;
  --color-gold-hover: #e8b82b;
  --color-sale-gold: #f8d84f;
  --color-rating-gold: #e9b82f;
  --color-discount-red: #d94b3d;
  --color-icon-gray: #77736d;

  /* Typography */
  --font-ui: Inter, "Helvetica Neue", Arial, system-ui, sans-serif;
  --font-display: Georgia, "Times New Roman", serif;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;

  /* Radius */
  --radius-product-card: 11px;
  --radius-filter-panel: 12px;
  --radius-search: 999px;
  --radius-button: 999px;
  --radius-chip: 6px;
  --radius-badge: 6px;
  --radius-pagination: 8px;
}
```
