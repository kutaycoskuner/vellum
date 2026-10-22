import { writable } from 'svelte/store';

// language chosen in the browser for the document pages (labels, dates, "Page i of n").
// null: each page uses the `language` from its own data file. Nothing in the public pages
// sets it; an optional local language switcher does.
export const pageLanguage = writable<string | null>(null);
