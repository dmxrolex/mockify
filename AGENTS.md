# Project instructions

## Research and design before feature work

For every request to add a feature or improve an existing one, complete the relevant web research before choosing an implementation or editing app code. This is required even for small feature improvements.

- Research how established products handle the specific interaction, then verify implementation details with current official platform, browser, and library documentation. Examine relevant examples and alternatives deeply enough to understand their behaviour, limitations, and edge cases; do not stop at search snippets or copy a competitor's appearance.
- Inspect the existing implementation and shared components. Compare feasible approaches and choose the best fit for Mockify's users, mobile editing workflow, Telegram webviews, performance, accessibility, and maintenance. Briefly explain the chosen approach and relevant sources before implementation; proceed without routine approval questions.
- Prefer familiar icon buttons where the action is understandable. Research each new or revised icon's meaning using official platform or icon-library documentation. Give icon-only buttons accessible names, visible focus and pressed/disabled feedback, generous touch targets, and tooltips where useful. When an icon alone would be ambiguous, use concise, well-styled text or an icon with a label. Do not sacrifice clarity just to remove text.
- Be creative and deliberate about placement, hierarchy, rounded controls, direct manipulation, and useful interactive feedback. Keep the existing visual language consistent. Add motion only when it explains an action or provides feedback, honour reduced motion, and keep controls stable and the artwork usable.
- Think through the entire interaction before building: entry, selection, adjustment, confirmation or cancellation, empty/loading/error states, repeated actions, overlapping objects, and gesture ownership where applicable. Preserve undo, drafts, exports, media quality, and existing user settings. Avoid unnecessary steps, duplicate controls, and features that only look complete in the happy path.
- Verify the affected behaviour and relevant failure cases in Chromium and WebKit, including narrow mobile layouts and Telegram safe areas. Inspect the rendered result for alignment, smooth edges, legibility, control collisions, and layout shifts. Keep testing proportional to the change, and report what was actually verified.

## Modern Web Guidance

Before implementing or reviewing web UI, HTML, CSS, or browser-side JavaScript, read and apply the installed `modern-web-guidance` skill. Look up guidance for the specific task before editing, account for supported browsers and Telegram webviews, and verify applicable guidance before finishing. For Chrome extension work, also apply the installed `chrome-extensions` skill.

## Required iOS UI standard

Use the Text inspector's iOS Settings style as the standard for all new or revised app controls:

- Keep the app background black. Use restrained charcoal grouped rows, smooth continuous rounded corners, thin inset separators, system typography, blue navigation actions, and consistent coloured icon tiles.
- Reuse existing control components. Match row heights, icon stroke weights, corner radii, padding, focus indicators, and disabled states. Preserve at least 44px-high touch targets for rows and primary actions.
- Keep relevant controls visible when unavailable; disable them without shifting the layout. Do not replace stable settings with unexplained empty panels.
- Use the shared `ColorPicker` for all colour editing. Keep gradient corners smooth and borderless, thumbs contained within their controls, and hue tracks correctly aligned in Chromium and WebKit. Keep technical colour numbers out of the normal user flow.
- Use `switchPanel` from `ui-motion.js` for editor and inspector navigation, including back and Done. Keep its blur/fade timing consistent and honour reduced-motion preferences. Keep the artwork interactive during inspector transitions.
- Prefer familiar, clean iOS-style outlined icons. Avoid arbitrary symbol substitutions, heavy glass effects, extra marketing copy, and duplicate CSS overrides.
- Edit existing component/style definitions instead of adding parallel implementations. Verify affected interactions in Chromium and WebKit, including narrow mobile layouts and Telegram safe areas.
- Use `presentationFor` for new media: phone-shaped captures can use the phone frame; other proportions must use the free-image editor. Preserve the full native aspect ratio, transparency, per-image transforms and corner settings in previews, drafts, and exports. Mixed uploads must retain each item's appropriate presentation.

User instructions take precedence over these defaults.

## Production authentication

- Every production build must require server-verified Telegram sign-in before mounting the app, editor, drafts, or purchase screens. Missing, invalid, expired, or failed authentication must keep the app locked with Open in Telegram and retry actions.
- Guest access is allowed only in the Vite development server. Never add a guest fallback, hostname exception, URL flag, or configuration switch that enables guests in production builds, including production previews.
- Keep Telegram signature validation on all protected server endpoints. A client-side Telegram object, cached profile, or public bot configuration is not proof of authentication.
- During startup verification, show only a neutral loading state. Never flash the outside-Telegram or failed-sign-in card during a successful launch. Signal Telegram ready only after the verified app or an actual recovery screen is mounted.

## Settings and purchase screens

Use the same row typography, icon tiles, and press feedback across Settings, Credits, and Premium. Keep account art compact so it leaves room for prices and benefits, and reserve the brightest action color for checkout. For a new purchase, show the smallest option first and require a separate confirmation action after selection. Keep the Stars total, quantity or duration, and billing terms visible alongside the checkout action. Test the selected, pending, cancelled and error states on narrow screens in both languages, with Telegram safe areas and reduced motion.

## Editor interactions

Keep each pointer gesture attached to its starting selection until release or cancellation. Respect layer order for hit testing, clear selections and inspectors on empty-space taps, and keep rotation controls separate from floating actions. Use the shared four-action toolbar with Lock/Unlock and additional actions under More. Search and the keyboard open only after explicit text-input interaction. Preserve user-chosen text size without silently shrinking it to fit the canvas. Keep background cropping and transforms non-destructive and consistent across previews, drafts, and exports. Empty pages must not be exported or charged.

Use one editor without Quick/Complex mode switching. Store locking per object. Automatically framed phone captures start locked; free photos and text start unlocked. Keep Lock/Unlock first in the shared floating toolbar, with Duplicate second and Flip under More. Lock toggles must preserve the object's position, dimensions, and rotation. Preserve existing draft transforms and explicit lock states.

For revised icons, research the action semantics using official platform or icon-library documentation before drawing a consistent outlined icon. Canvas + imports media directly; page creation and organization belong in Page. Keep the New page tile equal in size to page thumbnails. Page deletion uses a thumbnail context menu with long-press, keyboard/right-click, and a visible More alternative.

Keep image/asset floating actions ordered Lock/Unlock, Duplicate, Delete, More. Hide floating actions for the entire active transform gesture, including a stationary hold, and restore them after the final pointer release or cancellation. Keep corner handles round, touch targets generous, and the floating toolbar compact and pill-shaped.
