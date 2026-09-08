'use client';

/** ページ送り(20件/ページ)。ページ番号も URL に載せる(rules/search.md §2) */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
	if (totalPages <= 1) return null;
	const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
	const btn = 'flex h-11 min-w-11 items-center justify-center rounded-hr border px-3 text-body lg:text-body-pc';
	return (
		<nav aria-label="ページ送り" className="flex flex-wrap items-center justify-center gap-2">
			<button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${btn} border-line disabled:opacity-40`}>
				前へ
			</button>
			{pages.map((p) => (
				<button
					key={p}
					type="button"
					aria-current={p === page ? 'page' : undefined}
					onClick={() => onChange(p)}
					className={`${btn} tabular ${p === page ? 'border-sumi bg-sumi text-white' : 'border-line hover:border-sumi'}`}
				>
					{p}
				</button>
			))}
			<button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`${btn} border-line disabled:opacity-40`}>
				次へ
			</button>
		</nav>
	);
}
