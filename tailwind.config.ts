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
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'none' } },
        slide: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        rise: 'rise 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        slide: 'slide 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        pop: 'pop 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        fade: 'fade 240ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
