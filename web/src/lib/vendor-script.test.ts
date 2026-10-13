import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onceLoader, versionMatches } from '@/lib/vendor-script';

/** 読み込みの代わり。resolve / reject を外から呼べる */
function deferred() {
	let resolve!: () => void;
	let reject!: (e: Error) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('vendor-script.ts onceLoader', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('assets.md vendor 読み込めたら、確かめた中身を返す', async () => {
		const d = deferred();
		const get = onceLoader(() => d.promise, () => 'ok', 1000);
		const p = get();
		d.resolve();
		await expect(p).resolves.toBe('ok');
	});

	it('assets.md vendor 何度呼んでも、読み込むのは1回だけ(同じ結果を返す)', async () => {
		const d = deferred();
		const load = vi.fn(() => d.promise);
		const get = onceLoader(load, () => 'ok', 1000);
		const a = get();
		const b = get();
		d.resolve();
		await expect(a).resolves.toBe('ok');
		await expect(b).resolves.toBe('ok');
		await expect(get()).resolves.toBe('ok');
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('assets.md vendor 読み込めなかった時は null', async () => {
		const d = deferred();
		const get = onceLoader(() => d.promise, () => 'ok', 1000);
		const p = get();
		d.reject(new Error('404'));
		await expect(p).resolves.toBeNull();
	});

	it('assets.md vendor 版が違う(確かめると null)時は null', async () => {
		const d = deferred();
		const get = onceLoader(() => d.promise, () => null, 1000);
		const p = get();
		d.resolve();
		await expect(p).resolves.toBeNull();
	});

	it('assets.md vendor 確かめる時に例外が出たら null', async () => {
		const d = deferred();
		const get = onceLoader(
			() => d.promise,
			() => {
				throw new Error('x');
			},
			1000,
		);
		const p = get();
		d.resolve();
		await expect(p).resolves.toBeNull();
	});

	it('assets.md vendor 時間内に終わらない時は null(境界:上限ちょうどで null・その 1ms 前はまだ待つ)', async () => {
		const d = deferred();
		const get = onceLoader(() => d.promise, () => 'ok', 1000);
		let settled: string | null | undefined;
		get().then((v) => (settled = v));
		await vi.advanceTimersByTimeAsync(999);
		expect(settled).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		expect(settled).toBeNull();
	});

	it('assets.md vendor 時間切れの後に読み終わっても、結果は null のまま', async () => {
		const d = deferred();
		const get = onceLoader(() => d.promise, () => 'ok', 1000);
		const p = get();
		await vi.advanceTimersByTimeAsync(1000);
		d.resolve();
		await expect(p).resolves.toBeNull();
		await expect(get()).resolves.toBeNull();
	});
});

describe('vendor-script.ts versionMatches', () => {
	it('assets.md vendor 置いた版と同じ文字列なら true(three.js の REVISION "147")', () => {
		expect(versionMatches('147', '147')).toBe(true);
	});

	it('assets.md vendor 版が違えば false(三つ目の数字が違う 1.0.1 も別の版)', () => {
		expect(versionMatches('148', '147')).toBe(false);
		expect(versionMatches('1.0.1', '1.0.0')).toBe(false);
	});

	it('assets.md vendor 版が無い・文字列でない時は false(数字の 147 も同じとみなさない)', () => {
		expect(versionMatches(undefined, '147')).toBe(false);
		expect(versionMatches(147, '147')).toBe(false);
		expect(versionMatches('', '147')).toBe(false);
	});
});
