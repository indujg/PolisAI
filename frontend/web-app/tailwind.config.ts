import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        city: {
          mist: "#F6FAFA",
          glass: "#FFFFFFCC",
          cloud: "#E8F0F1",
          graphite: "#101824",
          slate: "#2B3748",
          civic: "#009E9D",
          aqua: "#13C8C3",
          signal: "#2F6BFF",
          transit: "#775CFF",
          solar: "#F6B73C",
          coral: "#F45D6B",
          park: "#2FB36D"
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "var(--font-mono)",
          "SFMono-Regular",
          "Cascadia Code",
          "Roboto Mono",
          "monospace"
        ]
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "0.94", letterSpacing: "0", fontWeight: "720" }],
        "display-lg": ["3.25rem", { lineHeight: "1", letterSpacing: "0", fontWeight: "700" }],
        "display-md": ["2.5rem", { lineHeight: "1.08", letterSpacing: "0", fontWeight: "680" }],
        "title-lg": ["1.75rem", { lineHeight: "1.15", letterSpacing: "0", fontWeight: "650" }],
        "title-md": ["1.25rem", { lineHeight: "1.25", letterSpacing: "0", fontWeight: "630" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.65", letterSpacing: "0" }],
        "body": ["0.9375rem", { lineHeight: "1.55", letterSpacing: "0" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0" }],
        "caption": ["0.75rem", { lineHeight: "1.35", letterSpacing: "0" }],
        "metric": ["2rem", { lineHeight: "1", letterSpacing: "0", fontWeight: "720" }]
      },
      spacing: {
        "0.75": "0.1875rem",
        "4.5": "1.125rem",
        "7.5": "1.875rem",
        "safe": "max(1rem, env(safe-area-inset-left))",
        "rail": "4.5rem",
        "section": "5rem",
        "page": "clamp(1rem, 4vw, 3rem)"
      },
      boxShadow: {
        "polis-xs": "0 1px 2px rgba(16, 24, 36, 0.06), 0 0 0 1px rgba(16, 24, 36, 0.04)",
        "polis-sm": "0 10px 30px rgba(17, 37, 62, 0.08), 0 1px 1px rgba(16, 24, 36, 0.04)",
        "polis-md": "0 20px 50px rgba(17, 37, 62, 0.11), 0 2px 6px rgba(16, 24, 36, 0.06)",
        "polis-lg": "0 28px 80px rgba(17, 37, 62, 0.16), 0 6px 18px rgba(0, 158, 157, 0.10)",
        "glass": "0 22px 70px rgba(16, 24, 36, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72)"
      },
      backgroundImage: {
        "city-grid": "linear-gradient(rgba(47, 107, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 158, 157, 0.08) 1px, transparent 1px)",
        "sensor-flow": "radial-gradient(circle at 20% 20%, rgba(19, 200, 195, 0.18), transparent 26%), radial-gradient(circle at 80% 0%, rgba(246, 183, 60, 0.16), transparent 28%), linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(235, 248, 249, 0.84))",
        "glass-sheen": "linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.46))"
      },
      keyframes: {
        "signal-scan": {
          "0%": { transform: "translateX(-45%)", opacity: "0.1" },
          "45%": { opacity: "0.34" },
          "100%": { transform: "translateX(45%)", opacity: "0.1" }
        },
        "meter-rise": {
          "0%": { transform: "scaleY(0.2)" },
          "100%": { transform: "scaleY(1)" }
        },
        "feed-scroll": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-50%)" }
        },
        "ticker-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        }
      },
      animation: {
        "signal-scan": "signal-scan 8s ease-in-out infinite alternate",
        "meter-rise": "meter-rise 0.7s cubic-bezier(.2,.8,.2,1) both",
        "feed-scroll": "feed-scroll 36s linear infinite",
        "ticker-scroll": "ticker-scroll 26s linear infinite"
      }
    }
  },
  plugins: [animate]
};

export default config;
