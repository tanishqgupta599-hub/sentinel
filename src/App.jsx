import { useEffect, useRef, useState } from 'react'
import './App.css'
import EmergencyStreamPanel from './components/EmergencyStreamPanel.jsx'
import MicControl from './components/MicControl.jsx'
import TranscriptPanel from './components/TranscriptPanel.jsx'
import RiskIndicator from './components/RiskIndicator.jsx'
import LiveTelemetryPanel from './components/LiveTelemetryPanel.jsx'
import StatusBar from './components/StatusBar.jsx'
import AmbientAudioMonitor from './components/AmbientAudioMonitor.jsx'
import { analyzeSafety, getSafeRoute } from './services/api'

function App() {
  const [hasEntered, setHasEntered] = useState(false)
  const [logs, setLogs] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [systemStatus, setSystemStatus] = useState('IDLE')
  const [systemMode, setSystemMode] = useState('IDLE')
  const [showLockdownOverlay, setShowLockdownOverlay] = useState(false)
  const [responseActive, setResponseActive] = useState(false)
  const [sensorData, setSensorData] = useState(null)
  const [captureFrame, setCaptureFrame] = useState(null)
  const [cameraBrightness, setCameraBrightness] = useState(null)
  const [ambientSoundLevel, setAmbientSoundLevel] = useState(null)
  const [emergencyLocation, setEmergencyLocation] = useState(null)
  const [showEmergencyNotification, setShowEmergencyNotification] = useState(false)
  const [emergencyContact, setEmergencyContact] = useState({ 
    name: "Mom", 
    phone: "+91-1234567890" 
  })
  const [smsDetails, setSmsDetails] = useState(null)
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const systemModeRef = useRef(systemMode)

  // Layer 4 & 5 Persistence
  const sirenContextRef = useRef(null)

  // STEP 5: Professional Emergency Siren (Web Audio API)
  const playSiren = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContext()
      sirenContextRef.current = ctx

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      // Sine wave is the "smoothest" possible waveform
      oscillator.type = 'sine'
      
      // Hi-Lo Pattern: 960Hz and 770Hz (Universally recognized emergency tones)
      const hiFreq = 960
      const loFreq = 770
      const now = ctx.currentTime

      // Program the 4-second pattern
      for (let i = 0; i < 4; i++) {
        oscillator.frequency.setValueAtTime(hiFreq, now + i)
        oscillator.frequency.setValueAtTime(loFreq, now + i + 0.5)
      }

      // Filter to remove any harsh clicks and keep it "clinical"
      filter.type = 'lowpass'
      filter.frequency.value = 2000

      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1) // Professional volume level
      
      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start()
      console.log('[EMERGENCY] Professional siren started')

      // Stop after 4 seconds
      setTimeout(() => {
        if (ctx.state !== 'closed') {
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1)
          setTimeout(() => ctx.close(), 200)
        }
      }, 4000)
    } catch (e) {
      console.error("Siren synthesis failed:", e)
    }
  }

  const stopSiren = () => {
    if (sirenContextRef.current && sirenContextRef.current.state !== 'closed') {
      sirenContextRef.current.close()
      sirenContextRef.current = null
      console.log('[EMERGENCY] Siren stopped manually')
    }
  }

  // STEP 4: Simulated SMS Notification UI
  const simulateSMS = (lat, lng) => {
    const timestamp = new Date().toLocaleTimeString()
    const details = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} • ${timestamp}`
    
    setSmsDetails({
      title: "Emergency Alert Sent",
      message: `Live location shared with ${emergencyContact.name}`,
      details: details
    })
    
    setShowEmergencyNotification(true)
    
    setLogs(prev => [...prev, {
      type: 'SYSTEM',
      message: `SMS SIMULATION: Live location shared with ${emergencyContact.name}. ${details}`
    }])
    
    // Hide toast after 8 seconds
    setTimeout(() => setShowEmergencyNotification(false), 8000)
  }

  // STEP 3: Display Live Location On Map
  const displayLiveLocation = (lat, lng) => {
    setEmergencyLocation({ lat, lng, status: "LIVE TRACKING ACTIVE" })
    
    // Update map logic if map is already active or needed
    if (googleMapInstance.current) {
      const pos = { lat, lng }
      googleMapInstance.current.setCenter(pos)
      googleMapInstance.current.setZoom(17)
      
      // Add a red pulsing marker simulation via custom marker
      new window.google.maps.Marker({
        position: pos,
        map: googleMapInstance.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        },
        title: 'LIVE EMERGENCY LOCATION'
      })
    }
  }

  // STEP 2: Real Geolocation Capture
  const shareLiveLocation = () => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported")
      return
    }

    console.log("[EMERGENCY] Requesting real geolocation...")
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        console.log("Live Location Captured:", latitude, longitude)
        
        displayLiveLocation(latitude, longitude)
        simulateSMS(latitude, longitude)
      },
      (error) => {
        console.log("Location error:", error)
        // Fallback or log error
        setLogs(prev => [...prev, { type: 'SYSTEM', message: `Location access failed: ${error.message}` }])
      },
      { enableHighAccuracy: true }
    )
  }

  // STEP 1 & 6: Emergency Button Handler & Prevent Duplicate Execution
  const handleEmergency = () => {
    // Prevent duplicate execution
    if (systemModeRef.current === 'LOCKDOWN') return
    
    console.log("[EMERGENCY] LOCKDOWN ACTIVATED")
    
    // Transition to lockdown
    transitionTo("LOCKDOWN")
    
    // Trigger protocols once
    shareLiveLocation()
    playSiren()
  }

  // STEP 8: Reset Option
  const resetEmergency = () => {
    transitionTo("SAFE")
    setEmergencyLocation(null)
    setShowEmergencyNotification(false)
    setSmsDetails(null)
    stopSiren()
    console.log("[EMERGENCY] System Reset to SAFE")
  }

  const [safeRoute, setSafeRoute] = useState(null)
  const [isRequestingRoute, setIsRequestingRoute] = useState(false)
  const [isLiveGuardianActive, setIsLiveGuardianActive] = useState(false)
  const prevSystemModeRef = useRef(systemMode)
  const lastProactiveAlertRef = useRef(0)
  const mapRef = useRef(null)
  const googleMapInstance = useRef(null)

  // Professional Anti-Spam Voice Layer
  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  // State Transition Layer
  const transitionTo = (newState) => {
    if (newState === systemModeRef.current) return;
    
    console.log(`[STATE] Transition: ${systemModeRef.current} -> ${newState}`)
    
    // Update local state and ref
    setSystemMode(newState)
    setSystemStatus(newState)
    systemModeRef.current = newState

    // Speak for manual lockdown
    if (newState === 'LOCKDOWN') {
      const message = "Emergency Lockdown activated. Sharing live location and alerting emergency contacts.";
      speak(message);
      setLogs((prev) => [
        ...prev,
        { type: 'ASSISTANT', message: message },
      ]);
    }
  }

  /**
   * EVENT-BASED SAFETY ANALYSIS
   * Core logic for hackathon-ready architecture
   */
  const triggerSafetyAnalysis = async (userText) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Analyzing environment...' }]);

    try {
      // 1. Capture environment data (Single frame capture)
      let image_frame_base64 = "no-image";
      if (captureFrame) {
        try {
          const frame = await captureFrame();
          image_frame_base64 = frame.image_frame_base64;
        } catch (e) {
          console.error("Frame capture failed:", e);
        }
      }

      // 2. Get Geolocation
      let location = { latitude: null, longitude: null };
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (e) {
          console.warn("Geolocation failed:", e);
        }
      }

      // 3. Send to backend for Gemini Analysis
      const payload = {
        user_text: userText,
        image_frame_base64,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      };

      const analysis = await analyzeSafety(payload);
      setRiskAnalysis(analysis);

      // 4. Frontend logic based on risk level
      const { risk_level, spoken_response, recommendations } = analysis;
      
      // Update system mode based on risk
      let newMode = 'SAFE';
      if (risk_level >= 7) newMode = 'CRITICAL';
      else if (risk_level >= 4) newMode = 'ELEVATED';
      
      transitionTo(newMode);

      // Speak guardian response
      speak(spoken_response);
      setLogs(prev => [...prev, { 
        type: 'ASSISTANT', 
        message: spoken_response
      }]);

      // Add recommendations to logs as bullet points
      if (recommendations && recommendations.length > 0) {
        recommendations.forEach(rec => {
          setLogs(prev => [...prev, { 
            type: 'SYSTEM', 
            message: `• ${rec}` 
          }]);
        });
      }

    } catch (error) {
      console.error("Safety analysis failed:", error);
      const errorMessage = error.message || 'AI analysis temporarily unavailable. Please try again.';
      setLogs(prev => [...prev, { 
        type: 'SYSTEM', 
        message: errorMessage
      }]);
      speak(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Live Guardian Trigger Logic - REMOVED AUTOMATIC TRIGGERING
  // The route will now only be generated when the user explicitly asks for it in the chat.
  /*
  useEffect(() => {
    if (
      cameraBrightness < 25 &&
      (systemMode === 'ELEVATED' || systemMode === 'CRITICAL') &&
      !isLiveGuardianActive &&
      !safeRoute &&
      !isRequestingRoute
    ) {
      handleSafeRouteTrigger()
    }
  }, [cameraBrightness, systemMode, isLiveGuardianActive, safeRoute])
  */

  const handleSafeRouteTrigger = async (userRequested = false) => {
    if (!navigator.geolocation) {
      setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Geolocation is not supported by your browser.' }]);
      return
    }
    
    setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Locating user for safe route...' }]);
    setIsRequestingRoute(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          console.log('User location found:', latitude, longitude);
          
          const routeData = await getSafeRoute(latitude, longitude)
          console.log('Route data received:', routeData);
          
          setSafeRoute({
            ...routeData,
            user_coords: { lat: latitude, lng: longitude }
          })
          setIsLiveGuardianActive(true)
          
          if (routeData.reasoning?.response_text) {
            setLogs(prev => [...prev, {
              type: 'ASSISTANT',
              message: routeData.reasoning.response_text
            }])
          }
        } catch (error) {
          console.error('Route trigger failed:', error)
          setLogs(prev => [...prev, { type: 'SYSTEM', message: `Route error: ${error.message}` }]);
        } finally {
          setIsRequestingRoute(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsRequestingRoute(false);
        setLogs(prev => [...prev, { type: 'SYSTEM', message: `Location access denied: ${error.message}. Please enable location permissions.` }]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Google Maps Initializer
  useEffect(() => {
    if (safeRoute && mapRef.current) {
      // Ensure Google Maps script is loaded
      if (!window.google || !window.google.maps) {
        console.error('Google Maps script not loaded');
        setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Google Maps library not loaded yet. Please wait...' }]);
        return;
      }

      // Small delay to ensure container is rendered and has height
      const timeoutId = setTimeout(() => {
        if (!mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center: safeRoute.user_coords || safeRoute.destination_coords,
          zoom: 15,
          disableDefaultUI: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#263c3f' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#38414e' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#212a37' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }]
            }
          ]
        })

        // User Marker (Blue)
        if (safeRoute.user_coords) {
          new window.google.maps.Marker({
            position: safeRoute.user_coords,
            map,
            title: 'Your Location',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#38bdf8',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff'
            }
          })
        }

        // Destination Marker (Green)
        const destMarker = new window.google.maps.Marker({
          position: safeRoute.destination_coords,
          map,
          title: safeRoute.destination,
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        })

        if (safeRoute.polyline) {
          const decodedPath = window.google.maps.geometry.encoding.decodePath(safeRoute.polyline)
          const polyline = new window.google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#38bdf8',
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map
          })

          // Fit map to show both markers
          const bounds = new window.google.maps.LatLngBounds();
          if (safeRoute.user_coords) bounds.extend(safeRoute.user_coords);
          decodedPath.forEach(point => bounds.extend(point));
          map.fitBounds(bounds);
        }

        googleMapInstance.current = map;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [safeRoute])

  useEffect(() => {
    const prevMode = prevSystemModeRef.current
    prevSystemModeRef.current = systemMode
    if (prevMode === 'LOCKDOWN' || systemMode !== 'LOCKDOWN') return

    const startId = setTimeout(() => {
      setShowLockdownOverlay(true)
      setTimeout(() => {
        setShowLockdownOverlay(false)
      }, 2500)
    }, 0)

    return () => clearTimeout(startId)
  }, [systemMode])

  const handleCameraSample = (brightness) => {
    // Continuous monitoring logic removed for event-based architecture.
  }


  return (
    <>
      {!hasEntered && (
        <div className="welcome-overlay">
          <div className="welcome-card">
            <div className="welcome-scanner"></div>
            <div className="welcome-content">
              <div className="welcome-logo">
                <span className="logo-dot"></span>
                SENTINEL
              </div>
              <h1 className="welcome-title">Welcome to Sentinel</h1>
              <p className="welcome-tagline">
                Your Autonomous AI Safety Guardian. Always Watching, Always Protecting.
              </p>
              <button 
                className="welcome-enter-btn"
                onClick={() => {
                  console.log('[WELCOME] Entering system...')
                  setHasEntered(true)
                }}
              >
                <span className="btn-glow"></span>
                INITIALIZE GUARDIAN
              </button>
            </div>
            <div className="welcome-footer">
              SYSTEM STATUS: READY | ENCRYPTION: ACTIVE
            </div>
          </div>
        </div>
      )}
      <div className={`sentinel-app${systemMode === 'LOCKDOWN' ? ' sentinel-lockdown' : ''}${!hasEntered ? ' app-blurred' : ''}`}>
        <StatusBar systemStatus={systemStatus} systemMode={systemMode} responseActive={responseActive} />
        
        {systemMode === 'LOCKDOWN' && (
          <div className="emergency-lockdown-overlay">
            <div className="emergency-content">
              <div className="emergency-pulse-ring" />
              <h1 className="emergency-title">SYSTEM LOCKDOWN ACTIVATED</h1>
              <p className="emergency-subtitle">Live location shared with {emergencyContact.name}</p>
              
              {emergencyLocation && (
                <div className="emergency-location-badge">
                  <span className="location-icon">📍</span>
                  {emergencyLocation.lat.toFixed(5)}, {emergencyLocation.lng.toFixed(5)}
                  <span className="live-badge">{emergencyLocation.status}</span>
                </div>
              )}
              
              <div className="emergency-status-grid">
                <div className="status-item">
                  <span className="status-label">SIREN</span>
                  <span className="status-value active">ACTIVE</span>
                </div>
                <div className="status-item">
                  <span className="status-label">SMS</span>
                  <span className="status-value active">SENT TO {emergencyContact.name.toUpperCase()}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">GPS</span>
                  <span className="status-value active">STREAMING</span>
                </div>
              </div>

              <button className="emergency-reset-btn" onClick={resetEmergency}>
                RESET SYSTEM
              </button>
            </div>
          </div>
        )}

        {showEmergencyNotification && smsDetails && (
          <div className="emergency-toast">
            <div className="toast-icon">🚨</div>
            <div className="toast-content">
              <strong>{smsDetails.title}</strong>
              <p>{smsDetails.message}</p>
              <small className="toast-details">{smsDetails.details}</small>
            </div>
          </div>
        )}

      <div className="sentinel-main">
        <div className="sentinel-layout">
          <div className="layout-left">
            <EmergencyStreamPanel
              systemMode={systemMode}
              responseActive={responseActive}
              setCaptureFrame={setCaptureFrame}
            />
            {safeRoute && (
              <div className="safe-route-panel">
                <div className="safe-route-header">
                  <span className="safe-route-title">Safer Route Identified</span>
                  <button 
                    className="safe-route-close" 
                    onClick={() => {
                      setSafeRoute(null);
                      setIsLiveGuardianActive(false);
                      googleMapInstance.current = null;
                    }}
                  >
                    ×
                  </button>
                </div>
                <div id="safeRouteMap" ref={mapRef}></div>
                <div className="safe-route-info">
                  <div className="safe-route-dest">{safeRoute.destination}</div>
                  <div className="safe-route-eta">ETA: {safeRoute.duration_text}</div>
                </div>
              </div>
            )}
            {isLiveGuardianActive && !safeRoute && isRequestingRoute && (
              <div className="live-guardian-status">
                <span className="live-guardian-pulse" />
                Live Guardian Active: Searching for safe route...
              </div>
            )}
            {isLiveGuardianActive && safeRoute && (
              <div className="live-guardian-status active">
                <span className="live-guardian-pulse" />
                Live Guardian Active: Monitoring Surroundings
              </div>
            )}
          </div>
          <div className="layout-center">
            <div className="center-stack">
              <RiskIndicator systemMode={systemMode} responseActive={responseActive} />
              <LiveTelemetryPanel
                sensorData={{
                  ...sensorData,
                  lightLevel:
                    typeof cameraBrightness === 'number'
                      ? Math.round(cameraBrightness)
                      : sensorData?.lightLevel,
                  soundLevel:
                    typeof ambientSoundLevel === 'number'
                      ? ambientSoundLevel
                      : sensorData?.soundLevel,
                }}
                systemMode={systemMode}
              />
            </div>
          </div>
          <div className="layout-right">
            <TranscriptPanel logs={logs} />
            {riskAnalysis && riskAnalysis.risk_level >= 7 && (
              <div className="emergency-confirmation-box">
                <p>High risk detected. Would you like me to notify your emergency contact with your live location?</p>
                <div className="confirmation-btns">
                  <button onClick={() => {
                    handleEmergency();
                    setRiskAnalysis(null);
                  }}>YES, ALERT CONTACTS</button>
                  <button onClick={() => setRiskAnalysis(null)}>NO, I'M OKAY</button>
                </div>
              </div>
            )}
            <form
              className="transcript-input-bar"
              onSubmit={async (event) => {
                event.preventDefault()
                const trimmed = (chatDraft || '').trim()
                if (!trimmed) return
                setLogs((prev) => [
                  ...prev,
                  { type: 'USER', message: trimmed },
                ])
                setChatDraft('')
                
                // Detect if intent relates to safety
                const safetyKeywords = ['safe', 'danger', 'help', 'emergency', 'scared', 'risk', 'surroundings', 'check', 'look', 'watching', 'anyone'];
                const lowerText = trimmed.toLowerCase();
                const isSafetyQuery = safetyKeywords.some(k => lowerText.includes(k));
                
                if (isSafetyQuery || trimmed.length > 3) {
                  await triggerSafetyAnalysis(trimmed);
                } else {
                  setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Query too short for analysis.' }]);
                }
              }}
            >
              <input
                className="transcript-input"
                type="text"
                placeholder="Type a message to your AI Guardian..."
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
              />
              <button type="submit" className="transcript-send-btn">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="control-bar-wrapper">
          <MicControl
            setLogs={setLogs}
            systemStatus={systemStatus}
            systemMode={systemMode}
            responseActive={responseActive}
            setSystemMode={setSystemMode}
            setSystemStatus={setSystemStatus}
            setResponseActive={setResponseActive}
            captureFrame={captureFrame}
            onCameraSample={handleCameraSample}
            ambientSoundLevel={ambientSoundLevel}
            onEmergencyClick={handleEmergency}
            onSafetyQuery={triggerSafetyAnalysis}
          />
        </div>
        <AmbientAudioMonitor onLevelChange={setAmbientSoundLevel} />
      </div>
      {showLockdownOverlay && (
        <div className="lockdown-overlay">
          <div className="lockdown-overlay-content">
            <h1>SYSTEM LOCKDOWN</h1>
            <p>Critical escalation detected</p>
          </div>
        </div>
      )}
    </>
  )
}

export default App
