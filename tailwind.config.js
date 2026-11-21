/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background
        'bg-page': '#FAF8F4',
        'bg-card': '#FFFFFF',
        'bg-section': '#F3F1EC',
        // Text
        'text-primary': '#1F2937',
        'text-secondary': '#4B5563',
        'text-muted': '#6B7280',
        // Brand & Actions
        'navy': '#123B63',
        'navy-hover': '#0E2F4F',
        'gold': '#B7791F',
        'gold-hover': '#96601A',
        'gold-text': '#7A4F12',
        // Status
        'success': '#15803D',
        'success-bg': '#EAF7EF',
        'warning': '#B45309',
        'warning-bg': '#FDF4E3',
        'error': '#B91C1C',
        'error-bg': '#FDECEC',
        'info': '#1D4ED8',
        'info-bg': '#EAF1FD',
        // Borders
        'border': '#E2E0DA',
        'border-strong': '#C9C6BE',
        // Difficulty
        'easy': '#15803D',
        'easy-bg': '#EAF7EF',
        'medium': '#B45309',
        'medium-bg': '#FDF4E3',
        'hard': '#B91C1C',
        'hard-bg': '#FDECEC',
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
}