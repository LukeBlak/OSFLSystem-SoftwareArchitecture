/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#14b8a6',
          lighter: '#ccfbf1',
        },
        secondary: {
          DEFAULT: '#6d28d9',
          light: '#8B5CF6',
          lighter: '#E0F2FE',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          lighter: '#EDE9FE',
        },
        stats: {
          projects: '#8B5CF6',
          volunteers: '#2dd4bf',
          hours: '#E0F2FE',
          balance: '#ccfbf1',
        },
        background: '#f8faf9',
        card: '#ffffff',
        border: '#e2e8f0',
        text: {
          primary: '#1f2937',
          secondary: '#64748b',
          light: '#ffffff',
          subtitle: '#EDE9FE',
        },
        icon: {
          operations: '#6d28d9',
          hours: '#0d9488',
          finance: '#7dd3fc',
        }
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      }
    },
  },
  plugins: [],
}