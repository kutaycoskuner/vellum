<h1 align="center">vellum</h1>

<p align="center">
    Print-ready A4 documents from plain JSON and markdown files.<br>
    Write the content, open the page, print to PDF.
</p>

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/images/vellum-dark.png">
        <img alt="vellum: a folded paper plane" src="docs/images/vellum-light.png" width="240">
    </picture>
</p>

------------------------------------------------------------------------------------------

## What it makes

| Page | Document | Content from |
|---|---|---|
| `/letter` | single-page formal letter | `.data/letter.json` |
| `/homework` | assignment sheet with TeX math, as many pages as needed | `.data/homework.md` |
| `/report` | company report: order sheet, contents, numbered sections, company footer | `.data/report.md` |

Every page is laid out as real A4 sheets on screen, so what you see is what prints.

------------------------------------------------------------------------------------------

## Quick start

- **Node.js 20+**: [nodejs.org](https://nodejs.org/)
- **pnpm 9**: [pnpm.io/installation](https://pnpm.io/installation)
- **Python 3.10+**, only for `pnpm data`

```bash
pnpm install
pnpm dev            # http://localhost:5173 shows the three examples
pnpm data           # optional: creates .data/ from the examples, so you can write your own
```

To get a PDF, click the PDF icon at the bottom left (or press Ctrl+P) and choose Save as PDF. Paper size, margins and background colours are already set by the page, and the file name comes from the document's title.

------------------------------------------------------------------------------------------

## Your data

- `data.example/` holds committed placeholders; `.data/` holds your own files and is gitignored
- each page reads `.data/<file>` when it exists, otherwise `data.example/<file>`
    - a fresh clone shows the examples; nothing is created until you ask for it
- `pnpm data` (`python scripts/sync_data.py --run`) is the only thing that writes to `.data/`
    - copies the example files you don't have yet, after one confirmation
    - compares the keys of your files with the examples (JSON keys, YAML keys, markdown frontmatter); when an example gained or lost a key, it lists them and asks per file
        - `r` replace: fresh copy of the example, your old file kept as `<file>.bak`
        - `u` update: adds the missing keys with the example's values; your values and comments stay
        - `l` leave: changes nothing, asks again next time
    - `--dry-run` shows what would happen; without `--run` it only prints its help
- images and other files go in `.data/` too (e.g. `.data/images/logo.png`); paths in your files are relative to `.data/`
- `.data/` is served in `pnpm dev` only: a production build contains neither folder

------------------------------------------------------------------------------------------

## Letter

- one A4 page: recipient, title and date, body, name with signature, phone and email
- `language` (`en`, `de`, `tr`) sets the fixed words; the heading word before the subject is `Letter` / `Brief` / `Mektup`, or whatever `title` says (e.g. `Cover Letter`)
- `signatureImage` points to an image in `.data/` (e.g. `images/signature.png`); until it exists a dashed placeholder shows on screen and prints as empty space
- `' -- '` prints as an en dash
- a red notice (screen only) lists missing required fields, or how many mm of text don't fit on the page

------------------------------------------------------------------------------------------

## Homework

- after a LaTeX homework template: centred title block, lecture, university, due date, lecturer / tutor / student table
- frontmatter holds the title block; the markdown below it is the content
- `language` (`en`, `de`, `tr`) sets the labels, e.g. `Due:` / `Abgabe:`
- set in Computer Modern, the LaTeX default (self-hosted, SIL Open Font License)
- with more than one page, each gets a faint `Page i of n` at the bottom right

------------------------------------------------------------------------------------------

## Report

One markdown file per report: the frontmatter holds who sends it and for whom, the body holds the content. `data.example/report.md` shows and explains every key.

- `ci`: the company identity, the same in every report: `logo`, `accent`, `font` + `fontUrl`, footer `label` and `footer` lines (`**bold**` allowed), extra `status` words
- `customer`: `name`, `contact`, `address`, `email`, `phone`
- `order`: `product`, `file`, `number`, `date`, `parameters`, `nomenclature`
    - `parameters` and `nomenclature` are lists of `- name: value` lines
- `language`, `title`, `subtitle`, `date`, `toc`, `numbered`

Layout:

- page 1: title, customer and order side by side, parameters, nomenclature, contents with page numbers
- from page 2: `##` sections numbered 1. 2. 3., `###` sub-sections listed in the contents
- every page: logo top right, footer with the document name, company lines and `Page x of y`
- tables: number columns right-aligned, file names and codes in mono, status words (`OK`, `WARN`, `FAIL` …) in colour, a bold line right after a table set as its total
- open another file with `/report?file=<path in .data/>`, e.g. `/report?file=reports/shelf.md`
- without a `title`, a leading `#` heading is the title and the line after it the subtitle, so generated markdown works as it is

------------------------------------------------------------------------------------------

## Markdown pages

`/homework` and `/report` share the same rendering:

- TeX math with MathJax: inline `$ ... $`, display `$$ ... $$`; `\$` is a plain dollar sign
- a line reading `\newpage` starts a new page
- pages fill block by block; lists and tables continue on the next page with at least two rows on each side (numbering continues, table header repeats), and a heading always stays with what follows it
- a block taller than a whole page is cut at the bottom; a red notice (screen only) says so
- the page box carries `data-pages`, `data-overflow` and `data-missing` for scripted printing

------------------------------------------------------------------------------------------

## Folders

```text
vellum/
├── .data/                 # your own documents, gitignored (made by `pnpm data`)
├── data.example/          # committed examples, shown wherever .data/ has no file
├── docs/images/           # README artwork: vellum.png (source), light and dark variants
├── scripts/sync_data.py   # creates .data/ and keeps its keys in step with the examples
├── src/
│   ├── lib/components/    # navigation
│   ├── lib/paged/         # markdown, math and A4 pagination for /homework and /report
│   └── routes/<page>/     # one folder per page: +page.svelte and page.css
├── static/fonts/          # Computer Modern for /homework
└── vite.config.ts         # dev plugin that serves .data/ with data.example/ as fallback
```

------------------------------------------------------------------------------------------

## Fonts and licenses

- code: MIT, see [LICENSE](LICENSE)
- Computer Modern (CMU Serif), in `static/fonts/cmu-serif/`: SIL Open Font License
- Source Sans 3, from npm (`@fontsource-variable/source-sans-3`): SIL Open Font License
