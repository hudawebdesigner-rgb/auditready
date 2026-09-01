# CR8 3D Hero & Landing — Shopify Section

A dark, high-end 3D product hero + full landing page for **CR8 Creatine Monohydrate**, built as a single custom Shopify section that drops into any Online Store 2.0 theme (built and tested against **Dawn**).

- Real-time 3D product visualization (Three.js), lazy-loaded and paused when offscreen/hidden
- Multi-layer scroll parallax with `prefers-reduced-motion` support
- Automatic fallback to a static image + CSS parallax on mobile, low-power devices, or when WebGL is unavailable
- Full page: hero → trust strip → benefits → comparison → reviews (placeholder) → buy block with one-time/subscribe toggle → guarantee → FAQ → footer → sticky add-to-cart bar
- Real Shopify cart integration via the AJAX Cart API (`/cart/add.js`), with a working no-JS form fallback
- Everything editable in the theme customizer: copy, colors, the product itself, and all repeatable content via blocks

## Files

```
sections/cr8-hero-3d.liquid   Section markup + schema (settings, blocks, presets)
assets/cr8-hero-3d.css        All styling (scoped, dark theme, responsive, reduced-motion rules)
assets/cr8-hero-3d.js         3D scene, parallax, reveal animations, cart logic (vanilla JS)
```

No build step. Three.js is loaded at runtime via a pinned CDN URL (`three@0.160.0`, jsDelivr) using a dynamic `import()` — nothing to bundle, nothing to install. See **"Self-hosting Three.js"** below if you'd rather vendor it.

## Install (Shopify admin — copy/paste, no CLI required)

1. Go to **Online Store → Themes**, find the theme you want to edit, click the **⋮** menu → **Edit code**.
2. Under **Sections**, click **Add a new section**, name it `cr8-hero-3d`, and replace the placeholder content with the full contents of `sections/cr8-hero-3d.liquid` from this repo.
3. Under **Assets**, click **Add a new asset → Create a blank file**, name it `cr8-hero-3d.css`, paste in the contents of `assets/cr8-hero-3d.css`.
4. Repeat for `cr8-hero-3d.js` using the contents of `assets/cr8-hero-3d.js`.
5. Save all three files.
6. Go to **Online Store → Themes → Customize**.
7. On the page you want the hero on (usually the home page), click **Add section**, and pick **"CR8 3D Hero & Landing"** from the list — it will drop in with sensible defaults and demo blocks already filled in.
8. In the section settings panel, use the **Product** picker to select your CR8 Creatine Monohydrate product. This is required for the buy block and cart to work.
9. Adjust headline, subtext, colors, guarantee copy, and blocks (trust stats, benefits, comparison rows, FAQs, footer links) as needed.
10. Click **Save**.

That's it — no theme.liquid edits, no `{% section %}` tags to add by hand, since it's added through the section picker in the customizer.

### Subscriptions (subscribe & save)

If your CR8 product has a selling plan group configured (e.g. via Shopify Subscriptions or a subscriptions app), the buy block automatically detects it and shows the one-time vs. subscribe toggle with the real subscription price and savings %. If the product has no selling plans, the toggle is hidden and only the one-time price/button show — no configuration needed either way.

## Preview locally with Shopify CLI

If you want to iterate on the files locally with live reload before pasting them into the admin:

```bash
# Install the CLI if you don't have it
npm install -g @shopify/cli @shopify/theme

# Pull your existing theme (or clone Dawn) into a local folder
shopify theme pull --store your-store.myshopify.com

# Copy this repo's files into that theme folder, preserving structure:
#   sections/cr8-hero-3d.liquid
#   assets/cr8-hero-3d.css
#   assets/cr8-hero-3d.js

# Start a local dev server with live reload against your store's data
shopify theme dev --store your-store.myshopify.com
```

`theme dev` prints a local preview URL. Add the section via the customizer link it gives you, same as step 6–9 above. Push to the store when ready:

```bash
shopify theme push --store your-store.myshopify.com
```

## How the performance/fallback logic works

On load, the script picks one of three modes — no build flags, all runtime detection:

| Mode | When | Behavior |
|---|---|---|
| `3d` | Desktop-class pointer, viewport ≥ 768px, WebGL available, adequate `deviceMemory`/`hardwareConcurrency`, motion not reduced | Full Three.js scene, lazy-loaded only once the hero scrolls into view |
| `css-parallax` | Mobile / coarse pointer / low-memory / low-core / `saveData` / no WebGL, motion not reduced | Static product image with CSS-transform-driven parallax only — Three.js is never downloaded |
| `static` | `prefers-reduced-motion: reduce` | No parallax, no 3D, no animation — plain, fully accessible layout |

Additional performance guards, all in `assets/cr8-hero-3d.js`:

- The 3D scene only initializes when an `IntersectionObserver` reports the hero is actually in the viewport.
- The render loop pauses (`cancelAnimationFrame` is never called mid-loop, but the render call is skipped) when the hero scrolls out of view or the tab is hidden (`visibilitychange`).
- `devicePixelRatio` is capped at 2 for the renderer.
- All motion (parallax transforms + the 3D scroll-progress feed) is driven by a **single** scroll listener that batches work into one `requestAnimationFrame` callback per frame — no per-scroll-event layout thrashing.
- On WebGL context loss, or if the CDN import fails, the scene tears down gracefully and the static product image (already in the DOM) simply stays visible — there's no hard failure state.

## Accessibility

- Semantic HTML throughout: `<section>`, `<h1>`/`<h2>` hierarchy, a real `<form>` for the buy block, native `<details>/<summary>` for the FAQ accordion (fully keyboard-operable with no JS).
- The 3D canvas and its wrapper are `aria-hidden` — they're decorative; the same product image has real `alt` text where it appears as content (the buy block).
- All interactive elements are native `<button>`/`<a>`/`<input>` elements, so they're keyboard-focusable by default; focus states are visible (`:focus-visible` outline in accent yellow).
- `prefers-reduced-motion: reduce` is honored at both the JS level (skips 3D/parallax entirely) and the CSS level (a media query forcibly removes transforms/transitions as a second line of defense).
- Placeholder reviews are visibly labeled as placeholders in the UI, not just in code comments.

## Cart integration details

- The buy form's real `action` is `{{ routes.cart_add_url }}` (`/cart/add`), so **without JavaScript** it still works: a normal POST + redirect to the cart page.
- With JavaScript, the same form is intercepted and POSTed to `/cart/add.js` (the Shopify AJAX Cart API) so the page doesn't reload; a status message and toast confirm success, and the theme's cart icon bubble (`#cart-icon-bubble`, Dawn's standard id) is refreshed in place if present.
- The one-time/subscribe toggle sets/clears a hidden `selling_plan` input based on the product's actual selling plan data (read from a small `<script type="application/json">` block rendered from Liquid — no product data is hard-coded).
- The sticky add-to-cart bar reuses the exact same `addToCart()` call as the main form, so it always reflects the currently selected purchase option and quantity.
- Only a single variant is assumed (the product's first available variant) since CR8 Creatine Monohydrate ships as one SKU. If you later add size variants, you'll need to add a variant picker — the cart/AJAX plumbing here will still work with it.

## Verifying the static fallback

To confirm the non-WebGL path works:

1. Open the page in a browser with hardware acceleration disabled, or simulate it: in Chrome DevTools, run `chrome://flags` → disable WebGL, or use `chrome --disable-gpu --disable-webgl`.
2. Alternatively, open DevTools → Rendering tab → "Emulate CSS media feature `prefers-reduced-motion`" set to `reduce` to test the fully static path.
3. Alternatively, use DevTools device emulation for a phone viewport — the mobile heuristic (`pointer: coarse` or width < 768px) forces `css-parallax` mode regardless of desktop WebGL support, so you can verify it without disabling WebGL at all.

In every case you should see: the real product image, a working headline/CTA, working parallax on scroll (except in reduced-motion mode), and a fully functional add-to-cart flow — no blank space, no console errors, no broken layout.

## Self-hosting Three.js (optional)

By default `assets/cr8-hero-3d.js` imports Three.js from `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` at runtime. If your store's environment restricts third-party script hosts, or you simply prefer everything self-hosted:

1. Download `three.module.js` for the version pinned in the file (`0.160.0`) from jsDelivr or npm.
2. Upload it as a new theme asset, e.g. `assets/vendor-three.module.js`.
3. In `assets/cr8-hero-3d.js`, change the `THREE_URL` constant near the top to:
   ```js
   var THREE_URL = "{{ 'vendor-three.module.js' | asset_url }}";
   ```
   Note: this requires converting `cr8-hero-3d.js` into a `.js.liquid` asset (rename the file to `assets/cr8-hero-3d.js.liquid` and reference it the same way via `asset_url`) so the Liquid tag is processed — plain `.js` assets are served statically and won't render Liquid.

## Accurate product facts used in the copy

- CR8 Creatine Monohydrate, 150g pouch, 5g daily dose, 30 servings
- Single ingredient, no fillers
- Eurofins-tested at 99.4% assay, batch CM2025041501
- Pricing: £9.99 one-time / £7.99 subscribe (save ~20%) — actual prices always come live from the Shopify product/variant you select, never hard-coded

Reviews in the default blocks are explicitly placeholder content and are labeled as such in the UI — replace them with real customer reviews before launch.
