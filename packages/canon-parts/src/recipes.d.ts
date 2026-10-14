/**
 * @p31ca/canon-parts — recipes.mjs type declarations.
 */

export type BtnVariant = 'primary' | 'secondary' | 'ghost';
export type BtnSize = 'sm' | 'md' | 'lg';
export type BadgeTone = 'accent' | 'success' | 'error' | 'warning' | 'neutral';
export type GridMin = 'sm' | 'md' | 'lg';

export function btnClass(p?: { variant?: BtnVariant; size?: BtnSize }): string;
export function btnData(p?: { variant?: BtnVariant; size?: BtnSize }): Record<string, string>;
export function cardClass(): string;
export function badgeClass(): string;
export function badgeData(p?: { tone?: BadgeTone }): Record<string, string>;
export function fieldClass(): string;
export function fieldData(p?: { width?: 'form' | 'full' }): Record<string, string>;
export function fieldLabelClass(): string;
export function fieldHintClass(): string;
export function fieldErrorClass(): string;
export function pageHeaderClass(): string;
export function pageHeaderTitleClass(): string;
export function pageHeaderSubtitleClass(): string;
export function gridClass(): string;
export function gridData(p?: { min?: GridMin }): Record<string, string>;