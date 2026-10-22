// splits a laid-out document into fixed-size pages (/homework, /report)

export interface PaginateOptions {
	pageClass: string; // the fixed-size sheet; its padding is the page margin
	contentClass: string; // the flow box inside it, gets the source's lang
	breakBefore?: (block: Element) => boolean; // starts a new page, e.g. chapter headings
	keepWithNext?: (block: Element) => boolean; // never last on a page; default: headings
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
	// set by newPage() inside closures, so TS must not narrow it to null
	let content = null as HTMLElement | null;
	let available = 0;
	let tooTall = 0;

	const newPage = () => {
		const page = document.createElement('div');
		page.className = options.pageClass;
		content = document.createElement('div');
		content.className = options.contentClass;
		content.lang = source.lang;
		page.append(content);
		target.append(page);
		const style = getComputedStyle(page);
		available = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		return content;
	};
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
			if (content?.childElementCount) content = null;
			continue;
		}
		if (options.breakBefore?.(block) && content?.childElementCount) content = null;

		const box: HTMLElement = content ?? newPage();
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
		newPage().append(...carried);
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
