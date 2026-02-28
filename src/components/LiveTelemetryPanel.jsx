export default function LiveTelemetryPanel({ sensorData, systemMode }) {
  const mode = (systemMode || 'SAFE').toUpperCase()
  const modeClass =
    mode === 'LOCKDOWN'
      ? 'telemetry-lockdown'
      : mode === 'CRITICAL'
        ? 'telemetry-critical'
        : 'telemetry-safe'

  const heartRate = sensorData?.heartRate ?? '--'
  const carbonMonoxide = sensorData?.carbonMonoxide ?? '--'
  const soundLevel = sensorData?.soundLevel ?? '--'
  const lightLevel = sensorData?.lightLevel ?? '--'

  return (
    <div className={`telemetry-panel ${modeClass}`}>
      <div className="telemetry-row">
        <span className="telemetry-label">HEART RATE</span>
        <span className="telemetry-value">
          {heartRate === '--' ? heartRate : `${heartRate} bpm`}
        </span>
      </div>
      <div className="telemetry-row">
        <span className="telemetry-label">CARBON MONOXIDE</span>
        <span className="telemetry-value">
          {carbonMonoxide === '--' ? carbonMonoxide : `${carbonMonoxide} ppm`}
        </span>
      </div>
      <div className="telemetry-row">
        <span className="telemetry-label">SOUND LEVEL</span>
        <span className="telemetry-value">
          {soundLevel === '--' ? soundLevel : `${soundLevel} dB`}
        </span>
      </div>
      <div className="telemetry-row">
        <span className="telemetry-label">LIGHT</span>
        <span className="telemetry-value">
          {lightLevel === '--' ? lightLevel : `${lightLevel} lux`}
        </span>
      </div>
    </div>
  )
}
