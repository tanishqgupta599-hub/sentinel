import CameraFeed from './CameraFeed.jsx'

export default function EmergencyStreamPanel({ systemMode, responseActive, setCaptureFrame }) {
  const mode = (systemMode || 'SAFE').toUpperCase()

  const isLockdown = mode === 'LOCKDOWN'
  const isResponseLinked = !!responseActive

  const modeClass =
    mode === 'LOCKDOWN'
      ? 'camera-mode-lockdown'
      : mode === 'CRITICAL'
        ? 'camera-mode-critical'
        : 'camera-mode-safe'

  const responseClass = isResponseLinked ? ' camera-panel-response' : ''

  return (
    <div className={`camera-container ${modeClass}`}>
      <div className={`camera-panel ${modeClass}${responseClass}`}>
        <div className="camera-box">
          <CameraFeed onCaptureRef={setCaptureFrame} />
          <div className="camera-scanlines" />
          <div className="camera-bracket camera-bracket-tl" />
          <div className="camera-bracket camera-bracket-tr" />
          <div className="camera-bracket camera-bracket-bl" />
          <div className="camera-bracket camera-bracket-br" />
          {isLockdown && (
            <div className="camera-encrypted-tag">ENCRYPTED CHANNEL ESTABLISHED</div>
          )}
        </div>
        {isLockdown && (
          <div className="camera-overlay-rec">
            <span className="camera-rec-dot" />
            <span className="camera-rec-text">REC</span>
          </div>
        )}
      </div>
    </div>
  )
}
