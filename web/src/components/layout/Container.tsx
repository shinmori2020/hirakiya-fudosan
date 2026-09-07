import type { ReactNode } from 'react';

/** ページ枠。左右余白 16(スマホ)/ 32(PC)、最大幅 1080(03 §5) */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
	return <div className={`mx-auto w-full max-w-(--container-content) px-4 lg:px-8 ${className}`}>{children}</div>;
}
