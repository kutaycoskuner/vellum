// splits a laid-out document into fixed-size pages (/homework, /report, /article)

export interface PaginateOptions {
	pageClass: string; // the fixed-size sheet; its padding is the page margin
	contentClass: string; // the flow box inside it, gets the source's lang
	breakBefore?: (block: Element) => boolean; // starts a new page, e.g. chapter headings
	keepWithNext?: (block: Element) => boolean; // never last on a page; default: headings
	columns?: number; // columns per page, filled left to right; default 1
	columnClass?: string; // each column's box inside the content box when columns > 1
	firstPageHeader?: HTMLElement; // full-width block above the columns of page 1 (title, abstract)
}

const isHeading = (block: Element) => /^H[1-6]$/.test(block.tagName);

// moves the top-level blocks of `source` onto pages in `target`, filling each page
// as far as it goes. Lists and tables are split between items / rows, a keepWithNext
// block (a heading) moves along with the block after it, <div class="page-break">
// forces a new page. A block taller than a whole page stays alone on its page and is
// cut at the bottom; those are counted in tooTall
export function paginate(
	source: HTMLElement,
	target: HTMLElement,
	options: PaginateOptions
): { pages: HTMLElement[]; tooTall: number } {
	const keepWithNext = options.keepWithNext ?? isHeading;
	const columns = options.columns ?? 1;
	// set by nextBox() inside closures, so TS must not narrow it to null
	let content = null as HTMLElement | null;
	let available = 0;
	let tooTall = 0;
	let columnsLeft: HTMLElement[] = []; // empty columns of the current page

	const newPage = () => {
		const page = document.createElement('div');
		page.className = options.pageClass;
		if (options.firstPageHeader && !target.childElementCount) page.append(options.firstPageHeader);
		const flow = document.createElement('div');
		flow.className = options.contentClass;
		flow.lang = source.lang;
		page.append(flow);
		target.append(page);
		if (columns > 1) {
			columnsLeft = Array.from({ length: columns }, () => {
				const column = document.createElement('div');
				column.className = options.columnClass ?? '';
				flow.append(column);
				return column;
			});
		}
		// from the top of the flow box (below a header) to the bottom page margin
		const style = getComputedStyle(page);
		const bottom = page.getBoundingClientRect().bottom - parseFloat(style.paddingBottom);
		available = bottom - flow.getBoundingClientRect().top;
		content = columns > 1 ? columnsLeft.shift()! : flow;
		return content;
	};
	// the next empty column of this page, or a new page
	const nextBox = () => (columnsLeft.length ? (content = columnsLeft.shift()!) : newPage());
	// bottom margins don't count: the last block may end right at the page margin
	const fits = (box: HTMLElement) => {
		const last = box.lastElementChild;
		return !last || last.getBoundingClientRect().bottom - box.getBoundingClientRect().top <= available + 0.5;
	};

	const queue = [...source.children] as HTMLElement[];
	while (queue.length) {
		const block = queue.shift()!;
		if (block.classList.contains('page-break')) {
			block.remove();
			if (content?.childElementCount) {
				content = null;
				columnsLeft = []; // a new page, not just the next column
			}
			continue;
		}
		if (options.breakBefore?.(block) && content?.childElementCount) {
			content = null;
			columnsLeft = [];
		}

		const box: HTMLElement = content ?? nextBox();
		box.append(block);
		if (fits(box)) continue;

		const rest = splitOff(block, () => fits(box));
		if (rest) {
			queue.unshift(rest);
			content = null;
			continue;
		}

		if (box.childElementCount === 1) {
			tooTall++;
			content = null;
			continue;
		}

		// to the next page, with the headings that introduce it
		block.remove();
		const carried: Element[] = [];
		while (box.childElementCount > 1 && keepWithNext(box.lastElementChild!)) {
			const heading = box.lastElementChild!;
			heading.remove();
			carried.unshift(heading);
		}
		nextBox().append(...carried);
		queue.unshift(block);
	}

	return { pages: [...target.children] as HTMLElement[], tooTall };
}

// moves trailing list items / table rows of `block` into a continuation copy until
// `fits()`; returns the copy, or null (block untouched) when not even one item fits
function splitOff(block: HTMLElement, fits: () => boolean): HTMLElement | null {
	let items: HTMLElement;
	let rest: HTMLElement;
	let restItems: HTMLElement;

	if (block.tagName === 'OL' || block.tagName === 'UL') {
		items = block;
		rest = restItems = block.cloneNode(false) as HTMLElement;
	} else if (block.tagName === 'TABLE' && (block as HTMLTableElement).tBodies[0]) {
		const table = block as HTMLTableElement;
		items = table.tBodies[0];
		rest = table.cloneNode(false) as HTMLElement;
		if (table.tHead) rest.append(table.tHead.cloneNode(true)); // header repeats on the next page
		restItems = items.cloneNode(false) as HTMLElement;
		rest.append(restItems);
	} else {
		return null;
	}

	while (!fits() && items.childElementCount > 1) {
		restItems.prepend(items.lastElementChild!);
	}
	// at least two items on each side, or the whole block moves on (no lone rows)
	while (restItems.childElementCount === 1 && items.childElementCount > 2) {
		restItems.prepend(items.lastElementChild!);
	}
	if (!fits() || items.childElementCount < 2 || restItems.childElementCount < 2) {
		items.append(...restItems.children);
		return null;
	}

	// numbering continues where this page stopped
	if (block instanceof HTMLOListElement) {
		(rest as HTMLOListElement).start = block.start + block.childElementCount;
	}
	return rest;
}
