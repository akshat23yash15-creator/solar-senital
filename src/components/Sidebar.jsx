import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', hint: 'Globe' },
  { to: '/dashboard', label: 'Dashboard', hint: 'Ops' },
  { to: '/satellites', label: 'HelioScar', hint: 'Risk' },
  { to: '/solar-system', label: 'Solar System', hint: 'AI+3D' },
  { to: '/globe-risk', label: 'Globe Risk', hint: '3D' },
  { to: '/magstorm', label: 'MagStorm Shield', hint: 'Live' },
  { to: '/grid-heatmap', label: 'Grid Heatmap', hint: 'Map' },
  { to: '/analytics', label: 'Earth Threat Center', hint: 'Live' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar glass neon-border">
      <div className="sidebarBrand">
        <div>
          <div className="brandTitle">SolarSentinel</div>
          <div className="brandTag">Space Weather Intelligence</div>
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
    </aside>
  )
}
