# Terrain stamp sliders — RC39

Replaced the five 3D stamp numeric boxes with native range sliders using the existing editor `range-field` orange theme. Current values and units remain visible beside labels; min/max limits remain in the labels. Radius, width ratio, rotation, height/depth and edge profile keep their prior bounds and increments. No generator or placement rule changes.

TypeScript and scoped lint passed. Packaged Windows test `outputs-desktop-test-yvvCJd/report.json` passed: five sliders present; actual keyboard Home/End reaches radius 80/2000; Alt-wheel rotation; blocked-click preservation; two placements; Undo/Redo; saved preset and process-restart recovery. Screenshot reviewed: `3d-stamp-ghost-safe.png` in that directory.

Private unsigned ZIP: `dist/desktop/WulframForge-0.7.0-rc.39-win-x64-self-contained.zip`.
SHA256: `996539a0059401f3a0fd20ac29a34a2e0f6cef63dddad843e5ca133894eb7652`.
Existing bundle-size/WindowsBase warnings remain. Extract and run the new EXE; the currently running user's EXE was not replaced.
