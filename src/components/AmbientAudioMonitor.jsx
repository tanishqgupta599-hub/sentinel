import { useEffect } from 'react'

export default function AmbientAudioMonitor({ onLevelChange }) {
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return
    }

    let cancelled = false
    let audioContext
    let analyser
    let source
    let rafId

    navigator.mediaDevices
      ?.getUserMedia?.({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateLevel = () => {
          if (cancelled || !analyser) return
          analyser.getByteTimeDomainData(dataArray)
          let sum = 0
          const len = dataArray.length
          for (let i = 0; i < len; i += 1) {
            const v = (dataArray[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / len) || 0
          const db = 20 * Math.log10(rms || 0.000001) + 90
          if (typeof onLevelChange === 'function') {
            onLevelChange(Math.round(db))
          }
          rafId = window.requestAnimationFrame(updateLevel)
        }

        updateLevel()
      })
      .catch(() => {
        // ignore ambient mic errors
      })

    return () => {
      cancelled = true
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      if (source) {
        try {
          source.disconnect()
        } catch {
          // ignore disconnect errors
        }
      }
      if (audioContext) {
        try {
          audioContext.close()
        } catch {
          // ignore close errors
        }
      }
    }
  }, [onLevelChange])

  return null
}
