import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', hint: 'Globe' },
  { to: '/dashboard', label: 'Dashboard', hint: 'Ops' },
  { to: '/satellites', label: 'HelioScar', hint: 'Risk' },
  { to: '/globe-risk', label: 'Globe Risk', hint: '3D' },
  { to: '/grid-risk', label: 'MagStorm Shield', hint: 'Grid' },
  { to: '/analytics', label: 'Analytics', hint: 'Charts' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar glass neon-border">
      <div className="sidebarBrand">
        <div>
          <div className="brandTitle">SolarSentinel</div>
          <div className="brandTag">Space Weather Intelligence</div>
        </div>
        <div className="pill" title="Build: demo">
          <span className="pill-dot" style={{ background: 'var(--neonC)' }} />
          demo
        </div>
      </div>

      <nav className="nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <span>{l.label}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{l.hint}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }} className="glass" />
      <div className="subtle" style={{ fontSize: 12 }}>
        Tip: drag globe • scroll zoom
        <span className="kbd" style={{ marginLeft: 8 }}>
          Shift
        </span>{' '}
        + drag = faster
      </div>
    </aside>
  )
}
