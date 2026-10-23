import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/satellites', label: 'HelioScar' },
  { to: '/solar-system', label: 'Solar System' },
  { to: '/globe-risk', label: 'Globe Risk' },
  { to: '/magstorm', label: 'MagStorm Shield' },
  { to: '/grid-heatmap', label: 'Grid Heatmap' },
  { to: '/flare-impact', label: 'Flare Impact' },
  { to: '/analytics', label: 'Earth Threat Center' },
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
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto' }} className="glass" />
    </aside>
  )
}
