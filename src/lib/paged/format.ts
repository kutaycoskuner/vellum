// small text formatting shared by the paged documents (/homework, /article)

// a date as "dd mmm yyyy" (23 Oct 2025), month in the document's language; text that isn't a
// readable date is shown as written
export function formatDate(value: string | Date, language: string): string {
	// "2026-03-02" is that day here, not midnight UTC (which is the day before west of Greenwich)
	const iso = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
	const date = value instanceof Date ? value : iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	const day = String(date.getDate()).padStart(2, '0');
	let month: string;
	try {
		month = date.toLocaleString(language, { month: 'short' }).replace(/\.$/, '');
	} catch {
		month = date.toLocaleString('en', { month: 'short' }); // unknown language code
	}
	return `${day} ${month} ${date.getFullYear()}`;
}
