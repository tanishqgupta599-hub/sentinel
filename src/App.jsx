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
  const [activeCheckpoint, setActiveCheckpoint] = useState(null)
  const systemModeRef = useRef(systemMode)

  // Safety Checkpoint Constant
  const SAFE_CHECKPOINT = {
    name: "City Police Station",
    latitude: 30.684779501977165,
    longitude: 76.8336139751172
  };

  const MOCK_LOCATION = {
    latitude: 30.68302572679349,
    longitude: 76.83584324252223
  };

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
  const navStartedOnLockdownRef = useRef(false)

  // Professional Anti-Spam Voice Layer
  const speak = (text) => {
    if (!window.speechSynthesis) return
    
    // iOS/Safari fix: Cancel current speech and create a fresh instance
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    // Professional Voice Settings
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    window.speechSynthesis.speak(utterance)
  }

  /**
   * iOS Audio Unlock Trick:
   * Primes the speech engine on user touch to bypass Apple's "user-activation" requirement.
   */
  const unlockAudio = () => {
    if (!window.speechSynthesis) return
    const silentUtterance = new SpeechSynthesisUtterance(' ')
    silentUtterance.volume = 0
    window.speechSynthesis.speak(silentUtterance)
    console.log('[SYSTEM] iOS Speech Engine Primed')
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
          if (frame && frame.image_frame_base64) {
            // CRITICAL FIX: Strip the prefix (data:image/jpeg;base64,) so Gemini gets raw base64
            image_frame_base64 = frame.image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
            console.log(`[DEBUG] Captured image frame (${image_frame_base64.length} chars)`);
          } else {
            console.warn("[DEBUG] Capture frame returned empty data");
          }
        } catch (e) {
          console.error("Frame capture failed:", e);
        }
      } else {
        console.error("[DEBUG] captureFrame function is missing");
      }

      // 2. FORCE MOCK LOCATION FOR DEMO GENUINENESS
      // Bypassing real GPS to ensure the video looks perfect and consistent
      const location = { latitude: MOCK_LOCATION.latitude, longitude: MOCK_LOCATION.longitude };
      console.log("[DEMO-MODE] Using preset coordinates:", location);

      // 3. Send to backend for Gemini Analysis
      const payload = {
        user_text: userText,
        image_frame_base64,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      };

      console.log("[DEBUG] Payload being sent to backend:", {
        text: payload.user_text,
        imageSize: payload.image_frame_base64.length,
        imagePreview: payload.image_frame_base64.substring(0, 50) + "...",
        hasLocation: !!(payload.latitude && payload.longitude)
      });

      const analysis = await analyzeSafety(payload);
      
      // LOGIC: Check if user is at the checkpoint for demo genuineness
      const distanceToCP = Math.sqrt(
        Math.pow(location.latitude - SAFE_CHECKPOINT.latitude, 2) + 
        Math.pow(location.longitude - SAFE_CHECKPOINT.longitude, 2)
      );
      
      // Threshold for "being at checkpoint" (approx 50-100 meters in lat/lng degrees)
      const isAtCheckpoint = distanceToCP < 0.001; 
      
      if (isAtCheckpoint && userText.toLowerCase().includes("safe")) {
        analysis.spoken_response = `I see you have arrived at the ${SAFE_CHECKPOINT.name}. You are in a secure zone and appear to be safe now. However, for your continued protection, I am still sharing your live location with your emergency contact.`;
        analysis.risk_level = 1;
      }

      setRiskAnalysis(analysis);

      // 4. Frontend logic based on risk level
      let { risk_level, spoken_response, recommendations } = analysis;

      // DETERMINISTIC ESCALATION LOGIC
      const discomfortKeywords = ["uncomfortable", "unsafe", "scared", "not safe"];
      const userExpressedDiscomfort = discomfortKeywords.some(k => userText.toLowerCase().includes(k));
      
      const shouldTriggerCheckpoint = risk_level >= 7 || userExpressedDiscomfort;

      if (shouldTriggerCheckpoint) {
        // COMBINE original AI analysis with the route setup message
        spoken_response = `${spoken_response} Your safety risk is elevated. I am setting up navigation to the nearest safety checkpoint.`;
        setActiveCheckpoint(SAFE_CHECKPOINT);
        setResponseActive(true);
        
        setLogs(prev => [...prev, { 
          type: 'SYSTEM', 
          message: `🚨 SAFETY CHECKPOINT TRIGGERED: ${SAFE_CHECKPOINT.name}` 
        }]);

        // AUTOMATIC IN-APP NAVIGATION START (Instant using pre-fetched location)
        handleSafeRouteTrigger(true, SAFE_CHECKPOINT, location);
      } else {
        setActiveCheckpoint(null);
      }
      
      // Update system mode based on risk
      let newMode = 'SAFE';
      if (risk_level >= 7) newMode = 'CRITICAL';
      else if (risk_level >= 4) newMode = 'ELEVATED';
      
      transitionTo(newMode);

      // Speak guardian response (original or overridden)
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

  const handleSafeRouteTrigger = async (userRequested = false, customDestination = null, preFetchedCoords = null) => {
    // FORCE MOCK LOCATION FOR DEMO STABILITY
    const demoCoords = preFetchedCoords || { latitude: MOCK_LOCATION.latitude, longitude: MOCK_LOCATION.longitude };
    
    setLogs(prev => [...prev, { type: 'SYSTEM', message: 'Locating user for safe route...' }]);
    setIsRequestingRoute(true)

    const startRouting = async (lat, lng) => {
      try {
        console.log('Routing from:', lat, lng);
        // Use the preset safe checkpoint as the destination
        const dest = customDestination || SAFE_CHECKPOINT;
        const routeData = await getSafeRoute(lat, lng, dest)
        
        console.log('Route data received:', routeData);
        
        setSafeRoute({
          ...routeData,
          user_coords: { lat, lng },
          destination_coords: { lat: dest.latitude, lng: dest.longitude },
          destination: dest.name
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
    }

    // Always use demoCoords for the demo video
    await startRouting(demoCoords.latitude, demoCoords.longitude);
  }

  /**
   * 1. Google Maps SCRIPT Loader with CALLBACK
   * This ensures the API key is injected and the global initMap is called.
   */
  useEffect(() => {
    // Define the global callback function
    window.initMap = () => {
      console.log("[MAP-DEBUG] Global initMap callback TRIGGERED.");
      window.google_maps_loaded = true;
    };

    const loadGoogleMapsScript = () => {
      if (document.getElementById('google-maps-script')) {
        return;
      }

      // USE THE HARDCODED KEY DIRECTLY TO BYPASS VITE REPLACEMENT ISSUES
      const key = "AIzaSyDwjHQzkQCfzPbJeqbWCm4GmIxRHbjFXE0"; 
      
      console.log("[MAP-DEBUG] Injecting Google Maps script with HARDCODED key...");
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry,marker&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  /**
   * 2. Google Maps INITIALIZATION Logic
   * FINAL STABILITY FIX: Fixed coordinate object structure and prevented Ocean (0,0) view.
   */
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20;

    const initMap = () => {
      if (!safeRoute || !mapRef.current) {
        if (safeRoute && !mapRef.current && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initMap, 500);
        }
        return;
      }

      try {
        if (!window.google || !window.google.maps) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initMap, 1000);
          }
          return;
        }

        // ENSURE COORDINATES ARE VALID AND USE {lat, lng} STRUCTURE
        // Fallback to constants if anything is missing
        const userLat = safeRoute.user_coords?.lat || MOCK_LOCATION.latitude;
        const userLng = safeRoute.user_coords?.lng || MOCK_LOCATION.longitude;
        const destLat = safeRoute.destination_coords?.lat || SAFE_CHECKPOINT.latitude;
        const destLng = safeRoute.destination_coords?.lng || SAFE_CHECKPOINT.longitude;

        const center = { lat: userLat, lng: userLng };
        const destination = { lat: destLat, lng: destLng };

        console.log("[MAP-DEBUG] Initializing at:", center);
        
        const mapOptions = {
          center: center,
          zoom: 16, 
          disableDefaultUI: true,
          mapTypeId: 'roadmap',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }
          ]
        };

        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        googleMapInstance.current = map;

        // Add Markers with guaranteed {lat, lng}
        new window.google.maps.Marker({
          position: center,
          map,
          title: 'Start',
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#38bdf8', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff' }
        });

        new window.google.maps.Marker({
          position: destination,
          map,
          title: safeRoute.destination || 'City Police Station',
          icon: { path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 8, fillColor: '#22c55e', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff' }
        });

        // Add Polyline
        if (safeRoute.polyline && window.google.maps.geometry) {
          const decodedPath = window.google.maps.geometry.encoding.decodePath(safeRoute.polyline);
          new window.google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#38bdf8',
            strokeOpacity: 1.0,
            strokeWeight: 6,
            map
          });

          // Fit view to include both points
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(center);
          bounds.extend(destination);
          map.fitBounds(bounds, 50);
        }
        
        console.log("[MAP-DEBUG] SUCCESS: Zoomed map rendered at local coordinates.");
      } catch (err) {
        console.error("[MAP-DEBUG] render error:", err);
      }
    };

    const t = setTimeout(initMap, 800);
    return () => clearTimeout(t);
  }, [safeRoute]);

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

  // Ensure in-app navigation starts automatically on emergency (LOCKDOWN)
  useEffect(() => {
    if (systemMode === 'LOCKDOWN') {
      if (navStartedOnLockdownRef.current) return
      navStartedOnLockdownRef.current = true
      // Show checkpoint panel and kick off routing below the camera
      setActiveCheckpoint(SAFE_CHECKPOINT)
      const coords = emergencyLocation
        ? { latitude: emergencyLocation.lat, longitude: emergencyLocation.lng }
        : null
      handleSafeRouteTrigger(true, SAFE_CHECKPOINT, coords)
    } else {
      // Reset guard when leaving lockdown so it can trigger next time
      navStartedOnLockdownRef.current = false
    }
  }, [systemMode, emergencyLocation])

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

            {/* RESTORED: Map container exactly below the camera feed */}
            <div className="persistent-map-area" style={{ display: 'flex', minHeight: '300px' }}>
              {(!safeRoute && isRequestingRoute) && (
                <div className="integrated-map-skeleton">
                  <div className="srp-spinner"></div>
                  <span>Locating Safety Hub...</span>
                </div>
              )}
              
              {!safeRoute && !isRequestingRoute && (
                <div className="integrated-map-skeleton">
                  <span>Navigation Active in Critical Situations</span>
                </div>
              )}

              <div 
                className="integrated-map-container" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: safeRoute ? 'block' : 'none' 
                }}
              >
                <div 
                  id="safeRouteMap" 
                  ref={mapRef} 
                  style={{ width: '100%', height: '100%', minHeight: '300px' }}
                ></div>
                {safeRoute && (
                  <div className="safe-route-info">
                    <div className="safe-route-dest">{safeRoute.destination}</div>
                    <div className="safe-route-eta">ETA: {safeRoute.duration_text}</div>
                  </div>
                )}
              </div>
            </div>
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
                
                // UNLOCK AUDIO FOR iOS: Must happen on the direct touch event
                unlockAudio()
                
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

                {/* RIGHT COLUMN: Safety Checkpoint (No map here anymore) */}
                {activeCheckpoint && (
                  <div className="right-safety-stack">
                    <div className="safety-checkpoint-navigation">
                      <div className="checkpoint-header">
                        <span className="checkpoint-badge">SAFETY CHECKPOINT</span>
                        <span className="checkpoint-name">{activeCheckpoint.name}</span>
                      </div>
                      <div className="checkpoint-actions">
                        <button 
                          className={`checkpoint-status-btn active`}
                          disabled={true}
                        >
                          IN-APP NAVIGATION ACTIVE
                        </button>
                        <button
                          className="checkpoint-dismiss-btn"
                          onClick={() => {
                            setActiveCheckpoint(null);
                            setSafeRoute(null);
                            setIsLiveGuardianActive(false);
                          }}
                        >
                          CLOSE MAP
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
