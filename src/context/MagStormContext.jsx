import { createContext, useContext, useState } from 'react'

const MagStormContext = createContext(null)

export function MagStormProvider({ children }) {
  const [mode, setMode] = useState('live')
  return (
    <MagStormContext.Provider value={{ mode, setMode }}>
      {children}
    </MagStormContext.Provider>
  )
}

export function useMagStormMode() {
  const ctx = useContext(MagStormContext)
  if (!ctx) throw new Error('useMagStormMode must be used inside <MagStormProvider>')
  return ctx
}
