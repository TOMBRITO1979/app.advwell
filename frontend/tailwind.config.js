/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===========================================
        // PALETA DE CORES SUAVES - Verde Principal
        // ===========================================

        // Cor Primária - Verde Suave (Principal do App)
        primary: {
          50: '#E8F5E9',
          100: '#C8E6C9',   // Verde Claro Principal
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',   // Verde médio
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },

        // Cores Neutras - Tons suaves e confortáveis
        neutral: {
          50: '#FAFAFA',    // Fundo principal - branco cremoso
          100: '#F5F5F5',   // Fundo secundário - cinza névoa
          200: '#EEEEEE',   // Fundo terciário
          300: '#E0E0E0',   // Bordas claras
          400: '#BDBDBD',   // Bordas médias
          500: '#9E9E9E',   // Texto terciário
          600: '#757575',   // Texto secundário
          700: '#616161',   // Texto médio
          800: '#424242',   // Texto escuro
          900: '#37474F',   // Texto principal - cinza azulado escuro
        },

        // Sucesso - Verde Suave (diferente do primary para feedbacks)
        success: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
        },

        // Erro - Vermelho Suave
        error: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#F44336',
          600: '#E53935',
          700: '#D32F2F',
        },

        // Aviso - Âmbar Suave
        warning: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',
          600: '#FFB300',
          700: '#FFA000',
        },

        // Info - Azul Claro Suave
        info: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
        },

        // Roxo/Lavanda - Alternativo
        purple: {
          50: '#EDE7F6',
          100: '#D1C4E9',
          200: '#B39DDB',
          300: '#9575CD',
          400: '#7E57C2',
          500: '#673AB7',
          600: '#5E35B1',
          700: '#512DA8',
        },

        // Azul Índigo - Para acentos
        indigo: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          200: '#9FA8DA',
          300: '#7986CB',
          400: '#5C6BC0',
          500: '#3F51B5',
          600: '#3949AB',
          700: '#303F9F',
        },

        // Laranja Suave
        orange: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9800',
          600: '#FB8C00',
          700: '#F57C00',
        },

        // Rosa Suave
        pink: {
          50: '#FCE4EC',
          100: '#F8BBD0',
          200: '#F48FB1',
          300: '#F06292',
          400: '#EC407A',
          500: '#E91E63',
          600: '#D81B60',
          700: '#C2185B',
        },

        // Cinza Azulado (Blue Grey)
        'blue-grey': {
          50: '#ECEFF1',
          100: '#CFD8DC',
          200: '#B0BEC5',
          300: '#90A4AE',
          400: '#78909C',
          500: '#607D8B',
          600: '#546E7A',
          700: '#455A64',
        },

        // Cores para botões de Export/Import
        export: {
          csv: '#66BB6A',      // Verde claro suave (CSV Export)
          csvHover: '#4CAF50', // Verde mais escuro (hover)
          pdf: '#EF5350',      // Vermelho claro suave (PDF)
          pdfHover: '#E53935', // Vermelho médio (hover)
        },
        import: {
          csv: '#42A5F5',      // Azul claro suave (CSV Import)
          csvHover: '#1E88E5', // Azul médio (hover)
        },
      },

      // Backgrounds customizados
      backgroundColor: {
        'app': '#FAFAFA',
        'card': '#FFFFFF',
        'hover': '#F5F5F5',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'xl': '0 16px 48px rgba(0, 0, 0, 0.16)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      minHeight: {
        '44': '44px', // Touch-friendly minimum
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
