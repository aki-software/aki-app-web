import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Theme Tokens', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  describe('--color-status-* tokens', () => {
    it('should define --color-status-success in @theme', () => {
      expect(css).toContain('--color-status-success');
    });

    it('should define --color-status-error in @theme', () => {
      expect(css).toContain('--color-status-error');
    });

    it('should define --color-status-warning in @theme', () => {
      expect(css).toContain('--color-status-warning');
    });
  });

  describe('--color-warning-* tokens', () => {
    it('should define --color-warning-bg in @theme', () => {
      expect(css).toContain('--color-warning-bg');
    });

    it('should define --color-warning-border in @theme', () => {
      expect(css).toContain('--color-warning-border');
    });

    it('should define --color-warning-text in @theme', () => {
      expect(css).toContain('--color-warning-text');
    });
  });
});
