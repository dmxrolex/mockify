# Blur: research and revised interaction design

Research date: 22 November 2026. This is a design proposal, not a description of implemented Pixova features. The findings below come from first-party product documentation; the proposed interactions are our synthesis.

## Findings

| Product | Documented behavior | Decision for Pixova |
| --- | --- | --- |
| [Canva Blur](https://www.canva.com/help/blur-photos/) | Start with a selected photo. Blur separates whole-image intensity from brush-based areas. Brush has size and intensity; Remove reverses painted blur. Its documented Blur tool supports flat images, not video designs. | Select the media first. Keep just Whole and Area as the two modes. Keep brush-size controls contextual. Do not copy Canva's video limitation as a promise about our implementation. |
| [Canva adjustments](https://www.canva.com/help/image-settings/) | Adjustments can target all, clicked areas, brush areas, foreground, or background. These are selection strategies rather than different blur algorithms. | Do not present five unrelated targets as five permanent settings rows. |
| [Figma effects](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers) | Effects belong to selected layers or groups. Layer blur blurs that layer. Background blur affects content behind the selected object, not automatically a photograph's background. Large numbers of background blurs can reduce performance. | Attach blur to its layer, and keep it editable. Do not expose a misleading Figma-style backdrop blur as our Canvas background feature. |
| [Snapseed Stacks](https://support.google.com/snapseed/answer/6155543?hl=en-GB) | Edits can be revisited, removed, reordered, and selectively masked rather than baked into the original. | Save editable blur amounts and masks in drafts, and allow reset without restoring the upload. |
| [Snapseed effect order](https://support.google.com/snapseed/answer/6155517?hl=en-GB) | Applying a frame after blur keeps it sharp; applying blur after the frame affects the frame too. | Blur screenshot content before compositing the iPhone hardware. Whole-design blur is a separate, explicit operation. |
| [Snapseed Lens Blur](https://support.google.com/snapseed/answer/6158242) | Lens blur uses linear/elliptical focus regions, pinch adjustments, strength, and a transition zone. | This is a photography focus effect, not the simplest way to hide a chat message. Defer lens/bokeh modes rather than crowd the first version. |
| [Photoshop mobile selections](https://helpx.adobe.com/photoshop/mobile/edit-images/make-selections/select-and-modify-objects-with-the-quick-select-brush.html) | Make and refine a selection separately from applying an edit; brush size and hardness affect selection behavior. | An area mask is a selection attached to the edited media, not a new duplicate image or a detached blurred sticker. |
| [Adobe Express background blur](https://www.adobe.com/express/feature/image/blur-background) | Its documented workflow duplicates the image, isolates the subject above, and blurs the lower image. | Blurring behind a person requires subject isolation or a manually painted mask. It is different from blurring Pixova's already separate canvas background. Do not imply automatic subject detection exists. |

## The revised model

Two independent choices: **target** and **coverage**.

1. Tap the image or phone on the canvas, or select it through Layers.
2. Open Blur in the existing horizontal toolstrip. The inspector replaces the toolstrip while open; do not stack both and consume the canvas.
3. A small target chip is already set to the selection: Photo 1 for a free image, Phone screen for an iPhone. With nothing selected, use Canvas background. Merely opening Blur does not change the artwork.
4. Choose Whole or Area. One Strength slider is shared by both modes.
5. Done returns to the normal full-size scrollable tools. Changes remain editable through Blur or the layer's effects.

### Target menu: small, contextual, opened only on demand

The chip opens an anchored iOS-style menu: the current media target, Canvas background, and Entire design. Phone screen replaces Photo when the selected media is framed. An existing selection supplies the media; the menu must not become a second long layer browser. Switching to another image uses the canvas or Layers. Store values per target so switching does not erase prior work.

Canvas background means Pixova's background image/gradient, never automatic detection of the scenery behind a subject in a photo. For the latter, use Area and paint, or a future separately designed subject-mask feature.

### Whole: the common case

Compact inspector, approximately 150–180 CSS px: back/title/Done, target chip and Whole/Area selector, then Strength. Opening starts from the target's saved value (zero if new); zero is off. Reset is an icon action, not another settings page.

### Area: direct canvas work

Keep the same inspector structure, adding a single tool row, approximately 200–230 CSS px in total. Box is the initial tool for screenshots and phone content. Brush is available for irregular photo regions.

- Box: drag on the image to draw a region; drag the region to move it and its corner handles to resize. A small floating delete action belongs to the selected region. Draw another box in unused image space to add another region.
- Brush: paint with one finger. Only this mode shows small brush-size and erase controls in the existing tool row; size opens a compact popover rather than adding another permanent slider.
- Undo removes the last region/stroke. Reset clears the current target's blur, not other layers.
- Two fingers pan/zoom while drawing; a one-finger gesture edits the mask. Tapping the target chip does not discard masks.
- The mask overlay is shown only while editing the area; Done hides handles but retains blur.

No permanent rows for feather, density, radius, opacity, blend mode, blur type, or background detection. Use sensible default edge softness. Further controls can be added only after a concrete need.

## iPhone behavior

Phone screen edits operate on the uploaded screenshot content, clipped to the screen. The bezel, Dynamic Island and generated iOS status bar stay sharp. A manual box can hide one message or avatar without affecting surrounding artwork. Rectangles/strokes are stored in normalized media coordinates so they follow movement, scaling, rotation, duplication, drafts and export. Existing status-bar cleanup remains a separate operation.

Entire design explicitly blurs the final composed artwork, including the frame, text and background. This avoids secretly changing the meaning of Phone screen.

## Rendering implications

- Background blur precedes other layers.
- Per-media blur and masks run before the frame, corner clip and shadow composition.
- Entire-design blur is the final output pass, and is not recursively included in individual layers.
- Preview uses cached source textures and masks; full-resolution export evaluates the same saved parameters at export scale.
- Mask state is reversible in drafts. Do not claim a weak blur guarantees privacy or anonymization.
- Video masks can be fixed in media coordinates, but tracking moving faces is a different feature and must not be implied.

## Concept board

Four compact, cropped editor states, rather than four long mobile pages: Whole photo; Area on phone screen; the small target menu with Canvas background selected; Brush with a contextual size popover. The generated board illustrates the interaction hierarchy, not exact implementation dimensions. Do not add marketing copy or explanatory paragraphs inside the app screens.
