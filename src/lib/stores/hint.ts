import { writable } from 'svelte/store';

// hover text of the button under the mouse; the bottom bar shows it in place of the version.
// '' when nothing is hovered
export const hint = writable('');
