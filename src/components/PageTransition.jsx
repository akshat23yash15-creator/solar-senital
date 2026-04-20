import { motion as Motion } from 'framer-motion'
import { pageTransition, pageVariants } from '../utils/motion'

export default function PageTransition({ children }) {
  return (
    <Motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </Motion.div>
  )
}
