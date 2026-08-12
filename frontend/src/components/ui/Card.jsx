export default function Card({ className = '', hover = false, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={[
        'bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm',
        'border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-soft',
        hover &&
          'transition-all duration-300 ease-premium hover:shadow-premium hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
