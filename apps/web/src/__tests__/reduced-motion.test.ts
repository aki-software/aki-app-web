import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Spec: Accessibility Foundation — Requirement: Reduced Motion
 *
 * Components with reveal, scroll, or entrance animations MUST respect
 * `prefers-reduced-motion` by disabling animations.
 *
 * Spinner's spin animation SHOULD pause or slow significantly.
 */

describe('prefers-reduced-motion', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Extract the content between @media (prefers-reduced-motion: reduce) and its closing brace,
  // handling nested braces by counting depth.
  function getReducedMotionBlock(css: string): string | null {
    const startMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
    if (!startMatch) return null;

    const start = startMatch.index! + startMatch[0].length;
    let depth = 1;
    let i = start;

    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }

    return css.slice(start, i - 1);
  }

  it('should contain @media (prefers-reduced-motion: reduce) in CSS', () => {
    expect(css).toContain('prefers-reduced-motion');
  });

  it('should disable .animate-spin animation', () => {
    const block = getReducedMotionBlock(css);
    expect(block).not.toBeNull();
    expect(block!).toContain('animate-spin');
  });

  it('should disable .animate-in animation', () => {
    const block = getReducedMotionBlock(css);
    expect(block).not.toBeNull();
    expect(block!).toContain('animate-in');
  });

  it('should disable .animate-pulse animation', () => {
    const block = getReducedMotionBlock(css);
    expect(block).not.toBeNull();
    expect(block!).toContain('animate-pulse');
  });

  it('should include universal animation override', () => {
    const block = getReducedMotionBlock(css);
    expect(block).not.toBeNull();
    expect(block!).toContain('animation-duration');
    expect(block!).toContain('0.01ms');
  });
});
