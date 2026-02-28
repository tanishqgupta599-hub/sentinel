export async function testSentinel() {
  try {
    const response = await fetch('http://localhost:5000/test')
    if (!response.ok) {
      throw new Error('Request failed')
    }
    const data = await response.json()
    return data.reply
  } catch {
    throw new Error('Backend connection failed.')
  }
}

export async function streamSentinel(sensorData, prompt) {
  const response = await fetch('http://localhost:5000/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sensorData, prompt }),
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error('Request failed')
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON from backend')
  }

  if (
    !data ||
    typeof data.status !== 'string' ||
    typeof data.message !== 'string'
  ) {
    throw new Error('Invalid response shape')
  }

  return data
}

export async function evaluateRiskAgent(input) {
  const response = await fetch('http://localhost:5000/evaluate-risk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Request failed')
  }

  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON from backend')
  }

  if (
    !data ||
    typeof data.user_message !== 'string' ||
    typeof data.system_mode !== 'string' ||
    typeof data.action !== 'string' ||
    typeof data.escalate_after_seconds !== 'number'
  ) {
    throw new Error('Invalid response shape')
  }

  return data
}

export async function triggerManualAlert(location) {
  const res = await fetch('http://localhost:5000/manual-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location || {}),
  })

  if (!res.ok) {
    throw new Error('Manual alert failed')
  }

  return res.json()
}

export async function sendAudioToBackend(base64Audio, frame, soundLevel) {
  const payload = {
    audio: base64Audio,
    image_frame_base64: (frame && frame.image_frame_base64) || "no-image",
    text: frame && typeof frame.text === 'string' ? frame.text : null,
    brightness:
      frame && typeof frame.brightness === 'number' ? frame.brightness : null,
    soundLevel:
      typeof soundLevel === 'number' ? soundLevel : null,
  }

  // Debug payload structure and image length
  console.log('Voice request payload:', {
    audioLength: base64Audio && base64Audio.length,
    imageLength: payload.image_frame_base64 && payload.image_frame_base64.length,
    brightness: payload.brightness,
    soundLevel: payload.soundLevel,
  })

  const res = await fetch('http://localhost:5000/voice-input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.response_text || 'Voice processing failed')
  }

  return res.json()
}

export async function analyzeSafety(payload) {
  const res = await fetch('http://localhost:5000/analyze-safety', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('API Error details:', errorData);
    // CRITICAL FIX: Extract 'message' string instead of 'error' boolean
    const errorMessage = errorData.message || errorData.error || `Safety analysis failed (${res.status})`;
    throw new Error(typeof errorMessage === 'string' ? errorMessage : `Analysis error (${res.status})`);
  }

  return res.json()
}

export async function getSafeRoute(latitude, longitude) {
  const res = await fetch('http://localhost:5000/get-safe-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Safe route generation failed');
  }

  return res.json()
}

export async function fetchGuardianState() {
  const response = await fetch('http://localhost:5000/guardian-state')
  if (!response.ok) {
    throw new Error('Request failed')
  }

  const data = await response.json()

  if (
    !data ||
    typeof data.system_mode !== 'string'
  ) {
    throw new Error('Invalid guardian state')
  }

  return data
}
