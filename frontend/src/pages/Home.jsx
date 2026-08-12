import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ShortenUrlForm from '../components/ShortenUrlForm'
import HeroDoodles from '../components/HeroDoodles'
import { buttonClasses } from '../components/ui/buttonClasses'

const FEATURES = [
  { label: 'No account required' },
  { label: 'Custom aliases' },
  { label: 'Expiry control' },
  { label: 'Click analytics' },
]

export default function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="relative overflow-hidden">
      {/* Ambient gradient glow + faint grid — a texture behind the hero,
          not a decoration meant to be consciously noticed. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[52rem] h-[52rem] rounded-full bg-gradient-to-br from-primary-400/20 via-accent-400/10 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-grid text-gray-900/[0.03] dark:text-white/[0.03] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-20 text-center">
        <HeroDoodles />

        <h1 className="relative motion-safe:animate-fade-in-up text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight [animation-delay:0ms]">
          Short links.{' '}
          <span className="relative inline-block text-gradient">
            Bigger impact.
            <svg
              viewBox="0 0 160 16"
              fill="none"
              aria-hidden="true"
              className="absolute -bottom-2 left-0 w-full h-3 text-accent-500/50 motion-safe:animate-fade-in [animation-delay:900ms]"
              preserveAspectRatio="none"
            >
              <path
                d="M2 10C30 4 60 4 80 8C100 12 130 12 158 6"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="relative mt-5 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto motion-safe:animate-fade-in-up [animation-delay:100ms]">
          ShortLink turns long URLs into short, branded, trackable links — with click
          analytics, custom aliases, and expiry controls built in. No account needed to
          get started.
        </p>

        <div className="relative mt-10 motion-safe:animate-fade-in-up [animation-delay:200ms]">
          <ShortenUrlForm />
        </div>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-2 motion-safe:animate-fade-in-up [animation-delay:300ms]">
          {FEATURES.map((feature) => (
            <span
              key={feature.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-primary-600 dark:text-primary-400">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {feature.label}
            </span>
          ))}
        </div>

        {!isAuthenticated && (
          <p className="relative mt-6 text-sm text-gray-500 dark:text-gray-400 motion-safe:animate-fade-in-up [animation-delay:350ms]">
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
              Login
            </Link>{' '}
            or{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:underline">
              sign up
            </Link>{' '}
            to save your history and see click analytics — it&apos;s optional.
          </p>
        )}

        <div className="relative mt-6 flex items-center justify-center gap-4 motion-safe:animate-fade-in-up [animation-delay:400ms]">
          {isAuthenticated && (
            <Link to="/dashboard" className={buttonClasses({ variant: 'primary', size: 'lg' })}>
              Go to dashboard
            </Link>
          )}
          <a href="/docs" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
            API Docs
          </a>
        </div>
      </section>
    </div>
  )
}
