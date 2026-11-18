describe('Design tokens', () => {
  const tokens = [
    'canvas', 'panel', 'panel-alt', 'rule', 'ink', 'ink-soft', 'pit', 'on-pit',
    'accent', 'on-accent', 'accent-text', 'fantasy', 'on-fantasy', 'fantasy-text',
    'sector-up', 'sector-down', 'sector-best', 'sector-flat', 'warn', 'focus'
  ];
  const contrastPairs = [
    ['ink', 'canvas'],
    ['ink', 'panel'],
    ['ink-soft', 'panel'],
    ['ink-soft', 'canvas'],
    ['accent-text', 'canvas'],
    ['accent-text', 'panel'],
    ['on-accent', 'accent'],
    ['on-pit', 'pit'],
    ['sector-up', 'panel'],
    ['sector-down', 'panel'],
    ['sector-best', 'panel'],
    ['sector-flat', 'panel'],
    ['warn', 'panel'],
    ['fantasy-text', 'panel'],
    ['on-fantasy', 'fantasy']
  ];

  function luminance(hex: string): number {
    const value = hex.slice(1);
    const expanded = value.length === 3 ? [...value].map(channel => channel + channel).join('') : value;
    const channels = [0, 2, 4].map(offset => {
      const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrast(foreground: string, background: string): number {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  for (const mode of ['light', 'dark']) {
    describe(mode, () => {
      beforeEach(() => {
        document.documentElement.classList.toggle('dark', mode === 'dark');
      });

      it('defines every semantic token', () => {
        const styles = getComputedStyle(document.documentElement);
        for (const token of tokens) {
          expect(styles.getPropertyValue(`--${token}`).trim()).withContext(token).not.toBe('');
        }
      });

      it('meets WCAG AA contrast for text pairs', () => {
        const styles = getComputedStyle(document.documentElement);
        for (const [foreground, background] of contrastPairs) {
          const ratio = contrast(
            styles.getPropertyValue(`--${foreground}`).trim(),
            styles.getPropertyValue(`--${background}`).trim()
          );
          expect(ratio).withContext(`${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('preserves legacy color tokens', () => {
        const styles = getComputedStyle(document.documentElement);
        for (const token of ['--color-principal', '--color-fantasy-principal']) {
          expect(styles.getPropertyValue(token).trim()).withContext(token).not.toBe('');
        }
      });
    });
  }
});
