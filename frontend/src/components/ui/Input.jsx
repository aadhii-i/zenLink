export default function Input({
  label,
  id,
  error,
  hint,
  className = '',
  containerClassName = '',
  children,
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          'w-full px-3.5 py-2.5 rounded-lg border bg-white/90 dark:bg-gray-900/70',
          'text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'transition-all duration-200 ease-premium',
          'focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500',
          error
            ? 'border-red-400 dark:border-red-700'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
