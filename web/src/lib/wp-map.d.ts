import type { PropertyDetail, PropertySummary, TaxonomyName, Term } from '@/types/property';

export interface MapOptions {
	/** 例 'http://localhost:8080'。acf の画像パスが絶対URLの時に剥がす */
	uploadsPrefix?: string;
}
export function num(v: unknown): number | null;
export function rewriteUpload(p: string, uploadsPrefix?: string): string;
export function toSummary(post: unknown, opts?: MapOptions): PropertySummary;
export function toDetail(post: unknown, opts?: MapOptions): PropertyDetail;
export function toTerms(rawTerms: unknown[]): Term[];
export function decode(s: string): string;
export const REST_BASE: Record<TaxonomyName, string>;
export const TAXONOMIES: TaxonomyName[];
