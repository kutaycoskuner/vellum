# Article format

`/article` lays out a scientific article the way journals print them: a full-width title block on page 1, then the text in two columns over as many A4 pages as it needs. The content is one markdown file: `.data/article.md`, or any other file in `.data/` with `/article?file=<path>`. The example in `data.example/article.md` uses every feature below.

## Frontmatter

```yaml
---
title: Paginating Print Documents in the Browser
shortTitle: Block-level pagination        # running head on pages 2+; default: title
language: en                              # en | de | tr

journal: Journal of Document Engineering  # journal line above the title, all optional
volume: 12
issue: 3
year: 2026
doi: 10.0000/jde.2026.0312                # links to https://doi.org/<doi>
received: 2026-03-02                      # dates, shown as 02 Mar 2026; any of the three
accepted: 2026-06-18
published: 2026-07-01

authors:
  - name: First Author
    affiliations: [1]                     # numbers into the affiliations list, from 1
    email: first.author@example.edu
    corresponding: true                   # marked *, email shown under the affiliations
  - name: Second Author
    affiliations: [1, 2]
affiliations:
  - Department of Computer Science, University Name, City, Country
  - Institute of Name, City, Country

abstract: |                               # markdown, math allowed
  One paragraph or more ...
keywords: [pagination, typesetting]
---
```

- required: `title`, `authors`, `abstract`; a red notice (screen only) names any that are missing
- `language` sets the fixed words (Abstract, Keywords, Received ..., Fig., Table) and the month names in dates; the language switcher, where there is one, overrides it

## Body

Plain markdown, laid out in two columns.

| You write | You get |
|---|---|
| `## Introduction` | numbered section: **1 Introduction** |
| `### Measuring blocks` | numbered sub-section: ***2.1 Measuring blocks*** |
| `## Appendix {-}` | a section without a number |
| `## References`, `## Acknowledgements` | never numbered (also *Literatur*, *Kaynaklar*, *Danksagung*, *Teşekkür*) |
| a paragraph after a paragraph | first line indented, no gap, as in LaTeX |
| `> text` | indented block, slightly smaller |
| `$x^2$` | inline math (MathJax) |
| `$$ ... $$` | display math, numbered (1), (2) ... at the right |
| `$$ ... \notag $$` | display math without a number; `\tag{A}` sets your own |
| `![caption](images/plot.png)` on its own line | figure, image at column width, **Fig. n.** caption below |
| ` ```chart ` block | chart drawn from numbers, as a figure (see below) |
| `Table: caption` on its own line right above a table | **Table n.** caption above the table |
| a markdown table | booktabs rules: heavy top and bottom, light line under the header |
| the numbered list under `## References` | **[1]** **[2]** ... in small type; cite them as `[1]` in the text |
| ` -- ` | en dash – |
| `\newpage` on its own line | the rest starts on a new page |

Image paths are relative to `.data/` (e.g. `images/plot.png` is `.data/images/plot.png`).

## Charts

A fenced code block with the language `chart` holds YAML and becomes a figure:

````markdown
```chart
type: line                       # line | bar
caption: Layout time against document length.
x: { label: Pages, values: [5, 10, 15, 20] }
y: { label: Time (ms), min: 0 }  # min / max optional
series:
  - { name: One column, values: [33, 64, 97, 128] }
  - { name: Two columns, values: [39, 77, 116, 154] }
```
````

- `line`: numeric `x` values are spaced by value, text values evenly; `bar`: grouped bars growing from zero
- every series needs one value per `x` value; up to 8 series, coloured in a fixed order, with a legend from two series on
- a mistake in the block shows as a red line in its place, saying what is wrong
- for anything else (scatter plots, diagrams), export an SVG or PNG and use it as an image

## Classes for what markdown can't say

Raw HTML works in the body. Leave a blank line after the opening tag and before the closing one, so the markdown inside is still read:

```markdown
<div class="box">

**Definition 1.** A *keep-with-next* block is a block that may not be the last one in a column.

</div>
```

| Class | Effect |
|---|---|
| `box` | framed block: definitions, theorems, remarks |
| `center` | centred text |
| `small` | smaller text, like captions |
| `noindent` | paragraphs inside start flush, e.g. text continuing after an equation |

## Layout

- page 1: journal line and DOI, title, authors with affiliation numbers, affiliations, corresponding author, dates, abstract between two rules, keywords
- pages fill column by column; a block that doesn't fit moves to the next column, lists and tables split between rows (at least two on each side), headings and table captions stay with what follows
- pages 2+: running head with the authors (`Author et al.` from three on) and the short title
- page numbers centred at the bottom
- the tab title is the article title, so Save as PDF suggests it as the file name
