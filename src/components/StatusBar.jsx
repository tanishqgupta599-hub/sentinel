export default function StatusBar({ systemStatus, systemMode, responseActive }) {
  const normalized = (systemStatus || 'IDLE').toUpperCase()
  const isLockdown = systemMode === 'LOCKDOWN'
  const label = isLockdown
    ? responseActive
      ? 'System Lockdown — Response Active'
      : 'System Lockdown'
    : `System ${normalized.charAt(0)}${normalized.slice(1).toLowerCase()}`

  let statusClass = 'status-pill-idle'
  if (isLockdown) {
    statusClass = responseActive ? 'status-pill-lockdown status-pill-response' : 'status-pill-lockdown'
  } else if (normalized === 'ANALYZING') {
    statusClass = 'status-pill-analyzing'
  } else if (normalized === 'SAFE') {
    statusClass = 'status-pill-safe'
  } else if (normalized === 'ELEVATED') {
    statusClass = 'status-pill-elevated'
  } else if (normalized === 'CRITICAL') {
    statusClass = 'status-pill-critical'
  }
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-dot" />
        <span className="status-text-brand">Sentinel</span>
      </div>
      <div className={`status-bar-right ${statusClass}`}>
        <span className="status-text-state">{label}</span>
      </div>
    </div>
  )
}
