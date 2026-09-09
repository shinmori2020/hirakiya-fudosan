'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * 写真ギャラリー(01 §3-1)。メイン(3:2)+サムネイル。間取り図を最後に含める。これは初案。
 * 写真0枚:メインは薄灰の面に「写真準備中」、間取り図があればサムネイルに間取り図だけ出す。
 * プレースホルダー SVG なので next/image は unoptimized。
 */
export function Gallery({ images, floorplan, title }: { images: string[]; floorplan: string | null; title: string }) {
	const slides = [
		...images.map((src, i) => ({ src, label: `写真 ${i + 1}` })),
		...(floorplan ? [{ src: floorplan, label: '間取り図' }] : []),
	];
	const [index, setIndex] = useState(0);
	const current = slides[index];

	return (
		<div>
			<div className="relative aspect-[3/2] overflow-hidden rounded-hr border border-line bg-surface-alt">
				{current ? (
					<Image src={current.src} alt={`${title} ${current.label}`} fill sizes="(min-width: 64rem) 720px, 100vw" className="object-contain" unoptimized priority />
				) : (
					<div className="flex h-full items-center justify-center text-body text-ink-weak">写真準備中</div>
				)}
				{images.length === 0 && current && (
					<span className="absolute top-2 left-2 rounded-hr bg-badge-negotiating-bg px-2 py-0.5 text-xs text-badge-negotiating-fg lg:text-xs-pc">写真準備中(間取り図のみ)</span>
				)}
			</div>
			{slides.length > 1 && (
				<ul className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="写真の一覧">
					{slides.map((s, i) => (
						<li key={s.src} className="shrink-0">
							<button
								type="button"
								onClick={() => setIndex(i)}
								aria-pressed={i === index}
								aria-label={s.label}
								className={`relative block h-14 w-21 overflow-hidden rounded-hr border transition-colors duration-150 motion-reduce:transition-none lg:h-16 lg:w-24 ${
									i === index ? 'border-accent' : 'border-line hover:border-sumi'
								}`}
							>
								<Image src={s.src} alt="" fill sizes="96px" className="object-cover" unoptimized />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
