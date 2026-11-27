# Blur inspector concept

Design proposal; not implemented in the live editor yet.

- Keep the horizontal toolstrip at 48px icon circles and 68px touch columns; add Blur without shrinking other tools.
- Target picker: Selected image, Phone screen, Background, Everything, Manual area. Disable Selected image/Phone screen when unavailable, without hiding the options.
- Default to the selected layer; otherwise Background. One blur strength slider, reset, and Done.
- Background: blur the background pass before any image, phone, or text is composited.
- Selected image: blur the selected media texture before clipping rounded corners, shadows, and transforms.
- Phone screen: blur uploaded content inside the screen mask, before rendering the bezel, Dynamic Island, and generated iOS status bar. Retain original content coordinates.
- Everything: blur the completed artwork, including text and phone frame, through an explicit target choice.
- Manual area: Rectangle or Brush, plus Erase; draw directly over the canvas with adjustable strength and feathering. Default scope is the selected media layer; Canvas is an explicit alternative.
- Store layer masks in normalized local image coordinates so they move, resize, rotate, duplicate, reorder and reopen with that image. Canvas masks use normalized artboard coordinates.
- Keep blur settings and masks non-destructive; preview and full-resolution PNG export use the same compositing order. Include undo/reset for masks and retain an unblurred original in local drafts.

Concept prompt: Three high fidelity iOS-style Pixova editor screens on a black board: target picker with Background, Selected image, Phone screen, Everything, Manual area; phone screen content blur with crisp bezel/status bar; manual rectangle blur on a free image. Black canvas UI, charcoal grouped settings, system typography, restrained blue actions, full size scrollable circular tools, one strength slider, no marketing copy.
