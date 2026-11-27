# WI-038 · Cursor behaviour across inputs and pages

Candidate `b8459c6`.

- Pointer: folders, app cards, the Settings icon button, Run and menu items each receive their own bracket box (geometry in `../../sprint-2/WI-030/README.md`).
- Decorative icon and label inside a button inherit the button bounds; a separate icon button gets its own.
- Keyboard: one ArrowLeft while the pointer was parked over a different card moved focus and the brackets to the next card. Focus targeting wins after a key press; the next pointer move takes over again.
- Turn lock: during `data-target-lock` the brackets stay on the card even with the pointer over Run.
- Menus: Escape closes the More menu first, then the face; the username menu Escape returns focus (and brackets) to the trigger.
- Resize and scroll: the overlay recomputes the target rectangle on scroll, resize and a 160 ms interval, and moves with transforms only.
- Touch: the overlay hides for `pointerType === 'touch'` and on coarse pointers.

**Device gap.** No physical stylus, controller or touch screen was available. Pen and controller behaviour, hover feel and touch scrolling were not observed on hardware; the directional model was proven with the keyboard. The narrow layouts were simulated through `?w=` and `?w=&h=` on the built client, not on a phone.
