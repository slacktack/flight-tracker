import type { Config } from 'tailwindcss';

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: rgb('--night'),
        panel: { DEFAULT: rgb('--panel'), 2: rgb('--panel-2') },
        line: rgb('--line'),
        ink: { DEFAULT: rgb('--ink'), 2: rgb('--ink-2'), 3: rgb('--ink-3') },
        route: rgb('--route'),
        data: rgb('--data'),
        good: rgb('--good'),
        warn: rgb('--warn'),
        bad: rgb('--bad'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        cond: ['var(--font-cond)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '0.875rem' }],
        small: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.9375rem', { lineHeight: '1.375rem' }],
        lead: ['1.125rem', { lineHeight: '1.5rem' }],
        title: ['1.5rem', { lineHeight: '1.75rem' }],
        code: ['2.25rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em' }],
        hero: ['3.25rem', { lineHeight: '3rem', letterSpacing: '-0.02em' }],
      },
      borderRadius: { panel: '18px', control: '12px' },
      boxShadow: {
        float: 'var(--shadow-float)',
      },
      screens: { xs: '380px' },
    },
  },
  plugins: [],
};

export default config;
