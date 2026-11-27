# WI-053 · React Bits backgrounds

- Appearance offers Standard, Topography, Magic Rings, Lightfall and Ghost Fibers with live preview on the real shell and the existing Apply/Cancel/Reset workflow. **Topography is the default** when no background is saved and on Reset.
- Only the selected effect mounts (one canvas measured for each effect); switching releases the previous effect; canvases are `aria-hidden` and `pointer-events: none`; DPR capped.
- Static fallback for Standard, Motion Off, Follow-system reduced motion or failed graphics; Follow-system now reacts live to an OS change.
- Solid and Glass readability kept with a theme-aware scrim; text, focus and the card flip remain above the effect.
- Two members kept distinct backgrounds and settings across a port-changing restart; a member without saved settings received Topography.
- Images: `topography.jpg`, `magic-rings.jpg`, `lightfall.jpg`, `ghost-fibers.jpg`.
