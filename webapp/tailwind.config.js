/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark background colors
        'cosmic': {
          900: '#0a0e1a',  // Deep space black
          800: '#0f1729',  // Dark navy
          700: '#141f38',  // Lighter navy
        },

        // Cyan/Turquoise (atomic rings)
        'quantum': {
          300: '#67e8f9',  // Bright cyan
          400: '#22d3ee',  // Medium cyan
          500: '#06b6d4',  // Turquoise
          600: '#0891b2',  // Deeper turquoise
        },

        // Orange/Amber (core glow & "Hotbits" text)
        'fusion': {
          300: '#fcd34d',  // Light amber
          400: '#fbbf24',  // Amber
          500: '#f59e0b',  // Orange
          600: '#ea580c',  // Deep orange
          700: '#dc2626',  // Red-orange core
        },

        // Purple/Violet (accent effects)
        'plasma': {
          400: '#c084fc',  // Light purple
          500: '#a855f7',  // Purple
          600: '#9333ea',  // Violet
          700: '#7c3aed',  // Deep violet
        },

        // Blue flame effects
        'stellar': {
          400: '#60a5fa',  // Light blue
          500: '#3b82f6',  // Blue
          600: '#2563eb',  // Medium blue
          700: '#1d4ed8',  // Deep blue
        },

        // Glitch/tech accent colors
        'glitch': {
          cyan: '#0ff0fc',    // Bright glitch cyan
          orange: '#ff6b35',  // Glitch orange
          purple: '#8b5cf6',  // Glitch purple
        }
      },

      // Custom gradients based on the cosmic atomic theme
      backgroundImage: {
        'atomic-glow': 'radial-gradient(circle, #f59e0b, #dc2626, #9333ea, #06b6d4)',
        'plasma-flame': 'linear-gradient(135deg, #06b6d4, #3b82f6, #9333ea, #f59e0b)',
        'cosmic-dust': 'radial-gradient(ellipse at center, #141f38 0%, #0a0e1a 100%)',
      },

      // Glow effects for the atomic elements
      boxShadow: {
        'atomic': '0 0 60px rgba(245, 158, 11, 0.5), 0 0 100px rgba(147, 51, 234, 0.3)',
        'quantum': '0 0 40px rgba(6, 182, 212, 0.6)',
        'fusion': '0 0 50px rgba(245, 158, 11, 0.8)',
      }
    }
  },
  plugins: [],
}