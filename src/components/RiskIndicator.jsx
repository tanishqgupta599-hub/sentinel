export default function RiskIndicator({ systemMode, responseActive }) {
  const mode = (systemMode || 'SAFE').toUpperCase()
  const isLockdown = mode === 'LOCKDOWN'

  const label = isLockdown ? 'LOCKDOWN' : mode
  let riskLevel = 'safe'
  if (mode === 'ELEVATED') {
    riskLevel = 'elevated'
  }
  if (mode === 'CRITICAL' || mode === 'LOCKDOWN') {
    riskLevel = 'critical'
  }

  return (
    <div className={`risk-container${isLockdown ? ' risk-container-lockdown' : ''}`}>
      <div
        className={`risk-orbit risk-${riskLevel}${
          isLockdown ? ' risk-orbit-lockdown' : ''
        }`}
      >
        <div className="risk-ring risk-ring-outer" />
        <div className="risk-ring risk-ring-inner" />
        <div className="risk-ring risk-ring-ticks" />
        <div className="risk-data risk-data-a" />
        <div className="risk-data risk-data-b" />
        <div className={`risk-core risk-core-${riskLevel}${isLockdown ? ' risk-core-lockdown' : ''}`}>
          <span className="risk-text-main">{label}</span>
          <span className="risk-text-sub">System Mode</span>
          {isLockdown && responseActive && (
            <span className="risk-text-response">Response Engaged</span>
          )}
        </div>
      </div>
    </div>
  )
}
