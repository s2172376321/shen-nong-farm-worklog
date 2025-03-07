// 位置：frontend/tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 自定義科技感色彩
        'tech-primary': {
          50: '#e6f1ff',
          100: '#b3d7ff',
          200: '#80bdff',
          300: '#4da3ff',
          400: '#1a89ff',
          500: '#0070e6',
          600: '#0059b3',
          700: '#004080',
          800: '#00264d',
          900: '#000d1a'
        },
        'tech-gray': {
          50: '#f5f7fa',
          100: '#e3e8ef',
          200: '#cbd5e1',
          300: '#9ba9be',
          400: '#6b7b8c',
          500: '#4a5568',
          600: '#2d3748',
          700: '#1a202c',
          800: '#0f1419',
          900: '#0a0e14'
        }
      },
      boxShadow: {
        'tech-primary': '0 10px 30px -10px rgba(0, 112, 230, 0.4)',
        'tech-secondary': '0 8px 25px -10px rgba(0, 0, 0, 0.3)'
      },
      borderRadius: {
        'tech': '0.75rem'
      },
      animation: {
        'tech-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tech-bounce': 'bounce 1s infinite'
      },
      keyframes: {
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10%)' }
        }
      }
    },
  },
  plugins: [],
}