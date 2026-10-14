import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  FlipHorizontal,
  UploadCloud,
  Sparkles
} from 'lucide-react';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Scan with Camera',
  subtitle = 'Position your document or warranty invoice clearly inside the frame'
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileFallbackRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Error stopping camera track:', err);
      }
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async (preferredFacingMode) => {
    stopStream();
    setCameraError(null);
    setCapturedImage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API is not supported by your browser. You can still upload or take a photo using the device camera button below.');
      return;
    }

    try {
      // First attempt with preferred facingMode
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: preferredFacingMode || facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (firstErr) {
        // Fallback to any available video stream (e.g. desktop webcam without environment mode)
        console.warn('FacingMode camera error, falling back to basic video:', firstErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(playErr => {
          console.warn('Video play interrupted:', playErr);
        });
      }

      setHasCamera(true);

      // Enumerate available video inputs to check if flip is possible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoInputs);
      } catch (devErr) {
        console.warn('Could not enumerate cameras:', devErr);
      }
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      setHasCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in your browser or use the file/camera picker below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can choose a document photo from your files.');
      } else {
        setCameraError(err.message || 'Unable to access camera hardware. Please use the button below to upload or take a photo.');
      }
    }
  }, [facingMode, stopStream]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
      setCameraError(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, facingMode, stopStream]);

  // Toggle front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture current frame from video to canvas
  const handleCapture = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      // If front camera, mirror image back to natural orientation
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          setIsCapturing(false);
          return;
        }

        const fileName = `doc_snap_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        setCapturedImage({ file, previewUrl });
        setIsCapturing(false);
        stopStream();
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Snapshot capture failed:', err);
      setIsCapturing(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm and use captured photo
  const handleConfirm = () => {
    if (capturedImage?.file) {
      onCapture(capturedImage.file);
      handleClose();
    }
  };

  // Close modal and cleanup
  const handleClose = () => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    stopStream();
    onClose();
  };

  // Fallback native input handler
  const handleFallbackFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setCapturedImage({ file, previewUrl });
      stopStream();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {availableCameras.length > 1 && !capturedImage && hasCamera && (
              <button
                type="button"
                onClick={handleToggleCamera}
                title="Switch Camera (Front / Rear)"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  transition: 'background 0.2s'
                }}
              >
                <FlipHorizontal size={16} />
                <span>Flip</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close camera"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '380px',
            backgroundColor: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Shutter flash animation */}
          {showFlash && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#FFFFFF',
                zIndex: 30,
                opacity: 0.9,
                animation: 'fadeOut 0.2s ease-out forwards'
              }}
            />
          )}

          {/* Captured Image Review Mode */}
          {capturedImage ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={capturedImage.previewUrl}
                alt="Captured Snapshot"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000000'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.9)',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Sparkles size={12} />
                <span>Snapshot Captured</span>
              </div>
            </div>
          ) : hasCamera ? (
            /* Live Camera Feed */
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                }}
              />

              {/* Viewfinder Target Guidelines */}
              <div
                style={{
                  position: 'absolute',
                  inset: '24px',
                  border: '2px dashed rgba(16, 185, 129, 0.45)',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)'
                }}
              >
                {/* 4 Corner Markers */}
                <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '3px solid #10B981', borderLeft: '3px solid #10B981', borderTopLeftRadius: '6px' }} />
                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '3px solid #10B981', borderRight: '3px solid #10B981', borderTopRightRadius: '6px' }} />
                <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '3px solid #10B981', borderLeft: '3px solid #10B981', borderBottomLeftRadius: '6px' }} />
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '3px solid #10B981', borderRight: '3px solid #10B981', borderBottomRightRadius: '6px' }} />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#E2E8F0',
                    padding: '4px 14px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Align document within guide frame
                </div>
              </div>
            </div>
          ) : (
            /* Camera Unavailable / Denied Error View */
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                maxWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertCircle size={28} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                Camera Access Needed
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: 1.45 }}>
                {cameraError || 'Camera permissions are disabled or unavailable. You can click photo using your device camera below.'}
              </p>

              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Camera size={16} />
                <span>Snap / Select Photo</span>
              </button>
            </div>
          )}

          {/* Hidden input for native camera / device photo fallback */}
          <input
            ref={fileFallbackRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            style={{ display: 'none' }}
          />
        </div>

        {/* Footer Controls */}
        <div
          style={{
            padding: '1.25rem',
            backgroundColor: '#0F172A',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem'
          }}
        >
          {capturedImage ? (
            /* Review Actions */
            <div style={{ display: 'flex', width: '100%', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <RotateCcw size={16} />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Check size={18} strokeWidth={2.5} />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : hasCamera ? (
            /* Live Capture Button */
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                title="Choose from device files instead"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.72rem'
                }}
              >
                <UploadCloud size={20} />
                <span>Files</span>
              </button>

              {/* Shutter Circle Button */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing}
                title="Capture Document Photo"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '4px solid #10B981',
                  outline: '3px solid rgba(16, 185, 129, 0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF'
                  }}
                >
                  <Camera size={24} />
                </div>
              </button>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.72rem'
                }}
              >
                <X size={20} />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              style={{ padding: '0.6rem 1.5rem', color: '#E2E8F0', borderColor: '#334155' }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
