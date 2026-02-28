import { useEffect, useRef } from 'react'

export default function CameraFeed({ onCaptureRef }) {
  const videoRef = useRef(null)

  useEffect(() => {
    let stream;
    
    const startStream = async () => {
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (e) {
          console.error("Camera access failed:", e);
        }
      }
    };

    const stopStream = () => {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    };

    // Note: We keep the stream alive while the component is mounted for the hackathon demo
    // to avoid flickering/delay when capturing, but the monitoring logic is removed.
    startStream();

    return () => stopStream();
  }, [])

  useEffect(() => {
    if (!onCaptureRef) return

    const captureFrame = async () => {
      const videoElement = videoRef.current
      if (!videoElement || !videoElement.videoWidth) {
        throw new Error('Video not ready')
      }

      const canvas = document.createElement('canvas')
      // Requirement: Resize to max 640x480
      canvas.width = 640
      canvas.height = 480
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas not supported')
      }

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let total = 0
      const length = data.length
      for (let i = 0; i < length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        total += (r + g + b) / 3
      }
      const pixelCount = (length / 4) || 1
      const brightness = total / pixelCount

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
      const parts = dataUrl.split(',')
      if (parts.length < 2 || !parts[1]) {
        throw new Error('Image capture failed')
      }

      const imageBase64 = parts[1]

      return {
        image_frame_base64: imageBase64,
        brightness,
      }
    }

    onCaptureRef(() => captureFrame)
  }, [onCaptureRef])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="camera-feed-video"
    />
  )
}
