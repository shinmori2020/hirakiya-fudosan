import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** 最小構成(J-041)。対象は src/lib の純関数のみ。@ エイリアスだけ tsconfig に合わせる */
export default defineConfig({
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		include: ['src/lib/**/*.test.ts'],
		environment: 'node',
	},
});
