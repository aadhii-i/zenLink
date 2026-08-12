const VARIANTS = {
  primary:
    'bg-primary-600 text-white shadow-soft hover:bg-primary-700 hover:shadow-glow motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
  secondary:
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white/70 dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
  ghost:
    'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
  danger:
    'bg-red-600 text-white hover:bg-red-700 motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
  'outline-danger':
    'border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 motion-safe:active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2.5',
}

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center rounded-lg font-medium',
    'transition-all duration-200 ease-premium',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
