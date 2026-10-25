# Icons

One Svelte component per icon, named `icon-<what it shows>.svelte` (e.g. `icon-four-cubes`, not `icon-other-projects`), so any component can reuse it.

- markup only: no click handlers, stores or hover text; those stay in the component that uses the icon
- colour from `currentColor`, so the icon takes the text colour of where it sits
- extra attributes go to the `<svg>` (`{...rest}`), e.g. `<IconPdf width="21" height="21" />`
- a comment on the first line says what the icon looks like
