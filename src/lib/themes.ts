/** Accent colours. Each works on both the dark (black) and light (cream) background. */
export const THEMES = [
  { id: 'gold', label: 'Gold', accent: '#facc15' },
  { id: 'crimson', label: 'Crimson', accent: '#fb7185' },
  { id: 'ocean', label: 'Ocean', accent: '#38bdf8' },
  { id: 'emerald', label: 'Emerald', accent: '#4ade80' },
] as const;

export type PresetThemeId = (typeof THEMES)[number]['id'];
/** "custom" uses the viewer's own accent and background colours. */
export type ThemeId = PresetThemeId | 'custom';
export type ColorMode = 'dark' | 'light';

export const DEFAULT_THEME: ThemeId = 'gold';
export const DEFAULT_MODE: ColorMode = 'dark';
export const THEME_STORAGE_KEY = 'tinywatch-theme';
export const MODE_STORAGE_KEY = 'tinywatch-mode';
export const CUSTOM_THEME_STORAGE_KEY = 'tinywatch-custom-theme';
/** The CSS variables built from the custom theme, cached so the head script can apply them before paint. */
export const CUSTOM_VARS_STORAGE_KEY = 'tinywatch-custom-vars';

export const MODE_BACKGROUNDS: Record<ColorMode, string> = {
  dark: '#000000',
  light: '#fff8e7',
};

export interface CustomTheme {
  accent: string;
  dark: string;
  light: string;
}

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  accent: '#a78bfa',
  dark: '#0b0614',
  light: '#f7f3ff',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'custom' || (typeof value === 'string' && THEMES.some((theme) => theme.id === value));
}

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'dark' || value === 'light';
}

export function isCustomTheme(value: unknown): value is CustomTheme {
  if (!value || typeof value !== 'object') return false;
  const { accent, dark, light } = value as Record<string, unknown>;
  return [accent, dark, light].every((color) => typeof color === 'string' && HEX_COLOR.test(color));
}

// ---- colour helpers -------------------------------------------------------

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, target: Rgb, amount: number): string {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map((c, i) => c + (target[i] - c) * amount) as Rgb);
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Keeps the hue but limits lightness, so the site's text stays readable on it. */
function clampLightness(hex: string, min: number, max: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (l >= min && l <= max) return hex.toLowerCase();
  return hslToHex(h, s, Math.min(max, Math.max(min, l)));
}

/** Dark-mode backgrounds sit behind white text; light-mode ones behind dark text. */
export const clampDarkBackground = (hex: string) => clampLightness(hex, 0, 0.14);
export const clampLightBackground = (hex: string) => clampLightness(hex, 0.86, 1);

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Builds a Tailwind-style 50–950 scale with the picked colour as the 400 shade. */
function buildScale(accent: string): Record<(typeof SHADES)[number], string> {
  return {
    50: mix(accent, WHITE, 0.92),
    100: mix(accent, WHITE, 0.84),
    200: mix(accent, WHITE, 0.66),
    300: mix(accent, WHITE, 0.4),
    400: accent.toLowerCase(),
    500: mix(accent, BLACK, 0.12),
    600: mix(accent, BLACK, 0.26),
    700: mix(accent, BLACK, 0.42),
    800: mix(accent, BLACK, 0.54),
    900: mix(accent, BLACK, 0.64),
    950: mix(accent, BLACK, 0.8),
  };
}

/** CSS variables for html[data-theme="custom"]; globals.css maps them onto the palette per mode. */
export function buildCustomThemeVars(theme: CustomTheme): Record<string, string> {
  const scale = buildScale(theme.accent);
  const vars: Record<string, string> = {
    '--custom-bg-dark': clampDarkBackground(theme.dark),
    '--custom-bg-light': clampLightBackground(theme.light),
  };
  for (const shade of SHADES) vars[`--custom-${shade}`] = scale[shade];
  const [r, g, b] = hexToRgb(theme.accent);
  vars['--custom-glow'] = `rgb(${r} ${g} ${b} / 0.95)`;
  return vars;
}

/**
 * Runs inline in <head> before first paint so the saved theme and mode apply
 * without a flash of the default colours.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&/^(${THEMES.map((t) => t.id).join('|')}|custom)$/.test(t)){d.setAttribute('data-theme',t);}if(t==='custom'){var v=JSON.parse(localStorage.getItem('${CUSTOM_VARS_STORAGE_KEY}')||'{}');for(var k in v){if(/^--custom-/.test(k))d.style.setProperty(k,v[k]);}}if(localStorage.getItem('${MODE_STORAGE_KEY}')==='light'){d.setAttribute('data-mode','light');}}catch(e){}})();`;
