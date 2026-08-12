import { buttonClasses } from './buttonClasses'

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />
}
