/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        console: {
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          surfaceHover: '#F1F3F6',
          border: '#E3E7EC',
          borderHover: '#CFD6DE',
          text: '#1A2126',
          muted: '#6B7684',
          divider: '#EDEFF2',
          accent: '#3457D5',
          accentTint: 'rgba(52, 87, 213, 0.08)',
        },
        hazard: {
          flood: '#2B7FD4',
          forest_fire: '#E85D3D',
          air_pollution: '#8B4FD9',
          extreme_heat: '#E0972A',
          landslide: '#8C6A4F',
          chemical_leak: '#E23B72',
          water_quality: '#1FA88A',
        },
        risk: {
          low: '#2E9E6B',
          lowBg: 'rgba(46, 158, 107, 0.1)',
          medium: '#D48806',
          mediumBg: 'rgba(212, 136, 6, 0.1)',
          high: '#D9364A',
          highBg: 'rgba(217, 54, 74, 0.1)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
      },
      boxShadow: {
        none: 'none',
      }
    },
  },
  plugins: [],
};
