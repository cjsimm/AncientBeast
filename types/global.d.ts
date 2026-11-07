// Make JQuery globally available for ESLint and TypeScript
// (Removed problematic JQuery interface declaration)
interface Window {
	setGamePaused: (paused: boolean) => void;
	// Global debugging object added to `window.AB`.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	AB: any;
}

declare module '../assets/index' {
	export const phaserAutoloadAssetPaths: Record<string, string>;
	export const assetPaths: Record<string, string>;
	export const soundPaths: string[];
	export const locationPaths: string[];
}

declare module '*.jpg' {
	const src: string;
	export default src;
}
