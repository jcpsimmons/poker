/**
 * Reusable Tailwind class constants to ensure consistency across components
 */

// Border patterns
export const BORDER_BASE = "border border-border/50";

// Typography
export const TEXT_MONO_XS = "font-mono text-xs";
export const TEXT_XS_MONO = "text-xs font-mono";

// Layout patterns
export const BORDER_BOTTOM_MUTED = "bg-muted border-b border-border/50";

// Button base classes
export const BUTTON_BASE = "border border-border/50 bg-transparent hover:bg-foreground hover:text-background text-foreground font-mono text-xs py-2 px-3 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground";
export const BUTTON_PRIMARY = "bg-foreground hover:bg-foreground/90 text-background font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
export const BUTTON_SECONDARY = "flex-1 border border-border/50 bg-transparent hover:bg-muted text-foreground font-mono text-xs py-2 px-4 rounded transition-all cursor-pointer";

// Input base classes
export const INPUT_BASE = "w-full bg-background text-foreground border border-border/50 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed";
export const INPUT_ERROR = "w-full bg-background border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 text-foreground font-mono border-destructive focus:ring-destructive/20";

// Badge patterns
export const BADGE_SUCCESS = "bg-green-500/10 border border-green-500/20 rounded";
export const BADGE_INFO = "bg-primary/10 border border-primary/50 rounded";

// Modal overlay
export const MODAL_OVERLAY = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";
export const MODAL_CONTAINER = "bg-card border border-border/50 rounded p-6 max-w-2xl w-full mx-4";

