import { useCallback, useEffect, useRef, useState } from 'react'
import { sendAudioToBackend, triggerManualAlert } from '../services/api'

export default function MicControl({
  setLogs,
  systemStatus,
  systemMode,
  responseActive,
  setSystemMode,
  setSystemStatus,
  setResponseActive,
  captureFrame,
  onCameraSample,
  ambientSoundLevel,
  onEmergencyClick,
  onSafetyQuery,
}) {
  const [micActive, setMicActive] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const recognitionRef = useRef(null)
  const lastManualTriggerRef = useRef(0)
  const audioChunksRef = useRef([])
  const lastTranscriptRef = useRef('')
  const latestFrameRef = useRef(null)

  const speakResponse = (text) => {
    if (!text) return
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find((v) => v.lang === 'en-US')
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const startRecording = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setIsStreaming(false)
      setMicActive(false)
      setLogs((prev) => [
        ...prev,
        {
          type: 'SYSTEM',
          message: 'Microphone not available in this browser.',
        },
      ])
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioChunksRef.current = []

        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const result = reader.result
          if (!result || typeof result !== 'string') return
          const base64Audio = result.split(',')[1]
          try {
            const frame = latestFrameRef.current || null
            
            // Give speech recognition a tiny bit more time to finalize the transcript if it hasn't yet
            let userText = lastTranscriptRef.current || '';
            
            if (!userText) {
                // If transcript is still empty, wait up to 1s for it
                await new Promise(resolve => {
                    let attempts = 0;
                    const interval = setInterval(() => {
                        userText = lastTranscriptRef.current;
                        attempts++;
                        if (userText || attempts >= 10) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
            }

            // Final fallback if still empty
            if (!userText) {
                userText = 'Checking surroundings...';
            }

            setLogs((prev) => [
              ...prev,
              {
                type: 'USER',
                message: userText,
              },
            ])
            
            // Detect if intent relates to safety
            const safetyKeywords = ['safe', 'danger', 'help', 'emergency', 'scared', 'risk', 'surroundings', 'check', 'look', 'watching', 'anyone'];
            const lowerText = userText.toLowerCase();
            const isSafetyQuery = safetyKeywords.some(k => lowerText.includes(k));

            if (isSafetyQuery && typeof onSafetyQuery === 'function') {
              await onSafetyQuery(userText);
            } else {
              setLogs((prev) => [
                ...prev,
                {
                  type: 'SYSTEM',
                  message: 'Analysis triggered. Checking surroundings...',
                },
              ])
              if (typeof onSafetyQuery === 'function') {
                await onSafetyQuery(userText);
              }
            }
          } catch (error) {
            console.error('[VOICE] Processing error:', error);
            setLogs((prev) => [
              ...prev,
              {
                type: 'SYSTEM',
                message: `Voice processing failed: ${error.message || 'Unknown error'}`,
              },
            ])
          } finally {
            setIsStreaming(false)
            setMicActive(false)
          }
        }
      }

      mediaRecorder.start()

      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop()
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch {
            // ignore stop errors
          }
        }
      }, 4000)
    } catch {
      setIsStreaming(false)
      setMicActive(false)
      setLogs((prev) => [
        ...prev,
        {
          type: 'SYSTEM',
          message: 'Microphone permission denied.',
        },
      ])
    }
  }

  const handleEmergencyTrigger = useCallback(() => {
    console.log('[EMERGENCY] Button clicked, onEmergencyClick available:', !!onEmergencyClick)
    if (onEmergencyClick) {
      onEmergencyClick()
    } else {
      // Fallback to legacy logic if prop not provided
      const now = Date.now()
      if (now - lastManualTriggerRef.current < 10000) return
      lastManualTriggerRef.current = now

      const sendAlert = async (location) => {
        try {
          await triggerManualAlert(location)

          if (setSystemMode) {
            setSystemMode('LOCKDOWN')
          }
          if (setSystemStatus) {
            setSystemStatus('LOCKDOWN')
          }
          if (setResponseActive) {
            setResponseActive(true)
          }

          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(
              'Emergency alert sent. Stay where you are. Help is being notified.',
            )
            window.speechSynthesis.speak(utterance)
          }
        } catch {
          setLogs((prev) => {
            const newEntry = {
              type: 'SYSTEM',
              message: 'Manual emergency alert failed.',
            }
            if (prev.length > 0 && prev[prev.length - 1].message === newEntry.message) {
              return prev
            }
            return [...prev, newEntry]
          })
        }
      }

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const payload = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
            sendAlert(payload)
          },
          () => {
            sendAlert({})
          },
        )
      } else {
        sendAlert({})
      }
    }
  }, [onEmergencyClick, setLogs, setSystemMode, setSystemStatus, setResponseActive])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1]
      if (!lastResult || !lastResult[0]) return
      const transcript = lastResult[0].transcript.toLowerCase()
      lastTranscriptRef.current = transcript
      const triggerWords = ['help', 'emergency', 'not safe', 'call someone']
      if (triggerWords.some((word) => transcript.includes(word))) {
        handleEmergencyTrigger()
      }
    }

    recognition.onerror = () => {
      // ignore recognition errors and keep monitoring
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
        // ignore stop errors
      }
    }
  }, [handleEmergencyTrigger])

  const handleMicClick = async () => {
    if (isStreaming || systemStatus === 'ANALYZING') return

    if (typeof captureFrame === 'function') {
      try {
        const frame = await captureFrame()
        if (!frame || typeof frame.image_frame_base64 !== 'string') {
          throw new Error('Image capture returned no data')
        }
        latestFrameRef.current = frame
        if (typeof frame.brightness === 'number' && typeof onCameraSample === 'function') {
          onCameraSample(frame.brightness)
        }
        // Debug image length for verification
        console.log('Image length:', frame.image_frame_base64 && frame.image_frame_base64.length)
      } catch (error) {
        latestFrameRef.current = null
        setLogs((prev) => [
          ...prev,
          {
            type: 'SYSTEM',
            message: (error && error.message) || 'Camera not ready for snapshot.',
          },
        ])
        return
      }
    } else {
      latestFrameRef.current = null
      setLogs((prev) => [
        ...prev,
        {
          type: 'SYSTEM',
          message: 'Camera stream not available for snapshot.',
        },
      ])
      return
    }

    setIsStreaming(true)
    setMicActive(true)

    if (recognitionRef.current) {
      try {
        lastTranscriptRef.current = ''
        recognitionRef.current.start()
      } catch {
        // ignore start errors
      }
    }

    startRecording()
  }

  return (
    <div className="control-bar">
      <div className="mic-container">
        <button
          type="button"
          className={`mic-button-main${micActive ? ' mic-button-main-active' : ''}`}
          onClick={handleMicClick}
        >
          <span className="mic-button-label">Mic</span>
          <span className="mic-button-waveform" />
        </button>
        <button
          type="button"
          className={`mic-button-emergency${
            systemMode === 'LOCKDOWN' ? ' mic-button-emergency-active' : ''
          }${responseActive ? ' emergency-active' : ''}`}
          onClick={handleEmergencyTrigger}
        >
          Emergency
        </button>
      </div>
    </div>
  )
}
