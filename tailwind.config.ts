import type { Config } from 'tailwindcss'

// Tailwind CSS v4 uses CSS-first configuration via @theme in globals.css.
// Dark mode is configured via @custom-variant in globals.css.
// This file is kept for editor tooling compatibility.
const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
}

export default config
