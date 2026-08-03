/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.{html,js}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'on-tertiary-fixed': '#121c26',
        'on-surface': '#1a1c1c',
        'surface-tint': '#be0728',
        'on-primary-fixed-variant': '#92001b',
        'on-primary-container': '#ffe8e6',
        'surface-container-low': '#f3f3f3',
        'on-surface-variant': '#5c403f',
        'tertiary-fixed': '#d9e3f1',
        primary: '#aa0021',
        'secondary-fixed-dim': '#c0c7d0',
        'surface-container': '#eeeeee',
        'primary-fixed': '#ffdad8',
        background: '#f9f9f9',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'surface-container-highest': '#e2e2e2',
        'surface-container-high': '#e8e8e8',
        'on-primary-fixed': '#410007',
        'tertiary-container': '#626c78',
        'surface-variant': '#e2e2e2',
        'secondary-container': '#dce3ed',
        'on-secondary': '#ffffff',
        tertiary: '#4a545f',
        'secondary-fixed': '#dce3ed',
        secondary: '#585f67',
        'on-tertiary-container': '#e3eefc',
        error: '#ba1a1a',
        'on-secondary-fixed': '#151c23',
        'on-background': '#1a1c1c',
        'outline-variant': '#e5bdbb',
        'on-error-container': '#93000a',
        'inverse-surface': '#2f3131',
        'surface-container-lowest': '#ffffff',
        'on-primary': '#ffffff',
        'on-tertiary': '#ffffff',
        outline: '#906f6e',
        'inverse-primary': '#ffb3b0',
        'on-secondary-container': '#5e656d',
        surface: '#f9f9f9',
        'primary-fixed-dim': '#ffb3b0',
        'tertiary-fixed-dim': '#bdc7d5',
        'primary-container': '#d11e33',
        'on-secondary-fixed-variant': '#40474f',
        'inverse-on-surface': '#f1f1f1',
        'on-tertiary-fixed-variant': '#3e4853',
        'surface-bright': '#f9f9f9',
        'surface-dim': '#dadada',
        'brand-blue': '#1e3a8a',
        'brand-orange': '#d11e33',
        'brand-orange-dark': '#aa0021',
        'brand-light': '#f8fafc',
        'dark-gray': '#121c26',
        'accent-blue': '#2563eb',
        'accent-green': '#16a34a'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        'margin-mobile': '20px',
        'stack-sm': '8px',
        'section-padding': '100px',
        'margin-desktop': '80px',
        'stack-md': '16px',
        'stack-lg': '32px',
        gutter: '24px'
      },
      fontFamily: {
        sans: ['Rubik', 'sans-serif'],
        'body-md': ['Rubik', 'sans-serif'],
        'body-lg': ['Rubik', 'sans-serif'],
        'headline-lg-mobile': ['Rubik', 'sans-serif'],
        'label-bold': ['Rubik', 'sans-serif'],
        'headline-md': ['Rubik', 'sans-serif'],
        'headline-lg': ['Rubik', 'sans-serif'],
        'display-lg': ['Rubik', 'sans-serif']
      },
      fontSize: {
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'headline-lg-mobile': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'label-bold': ['14px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '600' }],
        'headline-md': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-lg': ['40px', { lineHeight: '1.2', fontWeight: '600' }],
        'display-lg': ['56px', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '700' }]
      }
    }
  },
  plugins: []
};
