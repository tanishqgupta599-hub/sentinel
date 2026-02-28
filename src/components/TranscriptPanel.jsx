import { useEffect, useRef } from 'react'

export default function TranscriptPanel({ logs }) {
  const bodyRef = useRef(null)

  const entries = logs || []

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [entries.length])

  return (
    <div className="transcript-container">
      <div className="transcript-header">AI Voice Assistant</div>
      <div className="assistant-status">
        <span className="assistant-status-dot" />
        <span className="assistant-status-text">System is monitoring</span>
      </div>
      <div className="transcript-body" ref={bodyRef}>
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1
          const type = entry.type || 'SYSTEM'
          const typeClass =
            type === 'USER'
              ? 'log-user'
              : type === 'ASSISTANT'
              ? 'log-assistant'
              : 'log-system'
          return (
            <div
              key={index}
              className={`log-entry ${typeClass}${
                isLast ? ' log-entry-active' : ''
              }`}
            >
              <div className="log-entry-header">
                <span className="log-entry-tag">[{type}]</span>
              </div>
              <div className="log-entry-body">
                <span>{entry.message || entry.text}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
