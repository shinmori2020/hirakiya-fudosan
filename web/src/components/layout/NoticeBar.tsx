import { company } from '@/config/site';

/** 架空注記バー。最上部・墨背景・白文字 11px(03 §7)。全ページ */
export function NoticeBar() {
	return (
		<div className="bg-sumi text-center text-xs text-white lg:text-xs-pc">
			<p className="mx-auto max-w-(--container-content) px-4 py-1">{company.notice}</p>
		</div>
	);
}
