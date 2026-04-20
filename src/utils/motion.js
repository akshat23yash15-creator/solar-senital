export const pageVariants = {
  initial: { opacity: 0, y: 10, filter: 'blur(8px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(10px)' },
}

export const pageTransition = {
  type: 'spring',
  stiffness: 120,
  damping: 18,
  mass: 0.6,
}
