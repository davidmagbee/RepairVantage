/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        repairvantage: {
          "primary": "#4f46e5",
          "primary-focus": "#4338ca",
          "primary-content": "#ffffff",
          "secondary": "#f97316",
          "secondary-focus": "#ea580c",
          "secondary-content": "#ffffff",
          "accent": "#37cdbe",
          "accent-focus": "#2aa79b",
          "accent-content": "#ffffff",
          "neutral": "#3d4451",
          "neutral-focus": "#2a2e37",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#f3f4f6",
          "base-content": "#1f2937",
          "info": "#3abff8",
          "success": "#16a34a",
          "warning": "#facc15",
          "error": "#ef4444",
        },
      },
      "light",
      "dark",
    ],
    darkTheme: "dark",
  }
} 

