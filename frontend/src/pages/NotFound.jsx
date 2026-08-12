import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-primary-600 font-semibold">404</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        This page does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
      >
        Back to home
      </Link>
    </section>
  )
}
