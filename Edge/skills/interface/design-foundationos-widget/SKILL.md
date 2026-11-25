---
name: design-foundationos-widget
description: Design and verify a reusable widget across folder depth, focus states, input modes and available viewport.
---

# design foundationos widget

Start with the action: selecting Calculator, running it and opening its folder are different interactions. Write the expected focus destination after Back, Escape or closing a menu. Read Product Information/Interface before choosing a component. Use MUI or React Bits and Material Icons; record what the version actually uses in Components.

Use the same folder widget in shallow and deep rows. Preview shared settings before saving and give controls accessible names. Provide an adjacent non-overlapping hint when the action is unclear. Sketch empty, loading, unavailable and populated states separately.

Verify desktop, 390 px width, and 320 × 600 when vertical space matters. Open the first and last cards, expand the papers, scroll a deep row, navigate with arrows and then return. Check the selected card stays visible and its neighbours retain their position. Record the precise input and viewport tested. A desktop emulation does not establish physical touch or controller behaviour.
