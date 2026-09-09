'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

/**
 * 物件位置の地図(01 §3-6・J-037:Leaflet + OpenStreetMap)。ピン1点・周辺施設は出さない。
 * ブラウザ専用(window を使う)なので MapLoader から ssr:false で読み込む。
 * タイルは閲覧者のブラウザが直接 tile.openstreetmap.org から取得する(OSM Tile Usage Policy:帰属表記を地図上に表示・先読みしない)。
 * 座標は 02 §8-1 の代表座標 ±0.004 度の架空値。
 */
export default function PropertyMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const map = L.map(el, { center: [lat, lng], zoom: 15, scrollWheelZoom: false, attributionControl: true });
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(map);
		// 既定のマーカー画像は CSS のパス解決に依存するため、墨色の円マーカーにする(03 §2・画像ファイルを持ち込まない)
		L.circleMarker([lat, lng], { radius: 10, color: '#ffffff', weight: 2, fillColor: '#2b2f33', fillOpacity: 1 })
			.addTo(map)
			.bindTooltip(title, { direction: 'top', offset: [0, -10] });
		return () => {
			map.remove();
		};
	}, [lat, lng, title]);

	return <div ref={ref} className="h-64 w-full rounded-hr border border-line lg:h-80" role="img" aria-label={`${title} の位置`} />;
}
