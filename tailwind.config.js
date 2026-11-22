/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background
        'bg-page': 'var(--bg-page)',
        'bg-card': 'var(--bg-card)',
        'bg-section': 'var(--bg-section)',
        'bg-raised': 'var(--bg-raised)',
        'bg-input': 'var(--bg-input)',
        'row-hover': 'var(--row-hover)',
        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Brand & Actions
        'navy': 'var(--navy)',
        'navy-hover': 'var(--navy-hover)',
        'gold': 'var(--gold)',
        'gold-hover': 'var(--gold-hover)',
        'gold-text': 'var(--gold-text)',
        // Status
        'success': 'var(--success)',
        'success-bg': 'var(--success-bg)',
        'warning': 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        'error': 'var(--error)',
        'error-bg': 'var(--error-bg)',
        'info': 'var(--info)',
        'info-bg': 'var(--info-bg)',
        // Borders
        'border': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        // Difficulty
        'easy': 'var(--easy)',
        'easy-bg': 'var(--easy-bg)',
        'medium': 'var(--medium)',
        'medium-bg': 'var(--medium-bg)',
        'hard': 'var(--hard)',
        'hard-bg': 'var(--hard-bg)',
        // Badges
        'badge-default-bg': 'var(--badge-default-bg)',
        'badge-default-text': 'var(--badge-default-text)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'page-title': ['26px', { lineHeight: '1.3', fontWeight: '600' }],
        'section-title': ['19px', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'body': ['15px', { lineHeight: '1.5' }],
        'body-lg': ['16px', { lineHeight: '1.5' }],
        'small': ['13px', { lineHeight: '1.5' }],
        'small-lg': ['14px', { lineHeight: '1.5' }],
        'button': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'button-lg': ['15px', { lineHeight: '1.5', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        'container': '1200px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'badge': '9999px',
      },
    },
  },
  plugins: [],
};