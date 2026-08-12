export default function Footer() {
  return (
    <footer className="border-t border-gray-200/80 dark:border-gray-800/80 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-accent-600 text-white flex items-center justify-center text-[10px] font-bold">
            SL
          </span>
          © {new Date().getFullYear()} ShortLink. All rights reserved.
        </span>
        <a
          href="/docs"
          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          API Docs
        </a>
      </div>
    </footer>
  )
}
