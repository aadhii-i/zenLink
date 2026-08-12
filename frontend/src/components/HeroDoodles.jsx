// Hand-drawn-style SVG doodles scattered around the hero. Pure inline SVG
// (no image assets, negligible bundle cost) — decorative only, so every
// wrapper is aria-hidden and pointer-events-none, and float motion is
// gated behind motion-safe: so prefers-reduced-motion drops straight to a
// static illustration instead of an animated one.
function Arrow({ className }) {
  return (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      className={className}
      style={{ '--doodle-rotate': '-4deg' }}
    >
      <path
        d="M4 8C28 6 58 14 82 34C88 39 92 44 95 52"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength="1"
        className="doodle-draw motion-safe:animate-[draw-line_1.4s_ease-out_0.2s_both]"
      />
      <path
        d="M80 46L95 52L92 36"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        className="doodle-draw motion-safe:animate-[draw-line_0.5s_ease-out_1.5s_both]"
      />
    </svg>
  )
}

function Sparkle({ className }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ '--doodle-rotate': '8deg' }}>
      <path
        d="M20 2C20.5 12 22 18 38 20C22 22 20.5 28 20 38C19.5 28 18 22 2 20C18 18 19.5 12 20 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
    </svg>
  )
}

function Underline({ className }) {
  return (
    <svg
      viewBox="0 0 160 16"
      fill="none"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M2 10C30 4 60 4 80 8C100 12 130 12 158 6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength="1"
        className="doodle-draw motion-safe:animate-[draw-line_0.9s_ease-out_0.6s_both]"
      />
    </svg>
  )
}

function ChainLink({ className }) {
  return (
    <svg viewBox="0 0 60 36" fill="none" className={className} style={{ '--doodle-rotate': '-6deg' }}>
      <rect
        x="4"
        y="9"
        width="24"
        height="18"
        rx="9"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(-12 16 18)"
      />
      <rect
        x="32"
        y="9"
        width="24"
        height="18"
        rx="9"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(-12 44 18)"
      />
    </svg>
  )
}

function Scribble({ className }) {
  return (
    <svg viewBox="0 0 50 50" fill="none" className={className} style={{ '--doodle-rotate': '10deg' }}>
      <path
        d="M25 4C36 4 46 12 46 24C46 36 36 45 24 45C13 45 4 38 4 27"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />
    </svg>
  )
}

export default function HeroDoodles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Arrow className="hidden md:block absolute left-[6%] top-[18%] w-24 h-14 text-primary-400/50 dark:text-primary-500/40 motion-safe:animate-float-slow" />

      <Sparkle className="absolute right-[10%] top-[10%] w-6 h-6 text-accent-500/60 motion-safe:animate-float" />
      <Sparkle className="hidden sm:block absolute left-[12%] bottom-[22%] w-4 h-4 text-primary-400/50 motion-safe:animate-float-slower" />
      <Sparkle className="hidden md:block absolute right-[18%] bottom-[12%] w-3 h-3 text-accent-400/50 motion-safe:animate-float-slow" />

      <ChainLink className="hidden lg:block absolute right-[6%] top-[30%] w-14 h-9 text-gray-300/70 dark:text-gray-700/60 motion-safe:animate-float-slower" />

      <Scribble className="hidden md:block absolute left-[4%] bottom-[8%] w-10 h-10 text-primary-300/50 dark:text-primary-600/40 motion-safe:animate-float" />

      <Underline className="hidden sm:block absolute right-[14%] top-[46%] w-32 h-4 text-accent-500/40" />
    </div>
  )
}
