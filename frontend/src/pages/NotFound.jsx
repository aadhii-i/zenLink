import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/buttonClasses'

export default function NotFound() {
  return (
    <section className="max-w-xl mx-auto px-4 py-24 text-center motion-safe:animate-fade-in-up">
      <p className="text-5xl font-extrabold text-gradient">404</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        This page does not exist or has moved.
      </p>
      <Link to="/" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'mt-6 inline-flex' })}>
        Back to home
      </Link>
    </section>
  )
}
