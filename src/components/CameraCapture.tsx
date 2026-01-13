import { useRef, useState, useEffect, useCallback } from 'react'
import { Modal, Button, Group, Alert } from '@mantine/core'
import { IconAlertCircle, IconCamera, IconCameraRotate } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

interface CameraCaptureProps {
  opened: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export function CameraCapture({ opened, onClose, onCapture }: CameraCaptureProps) {
  const { t } = useTranslation('common')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const startCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setError(null)

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      setStream(mediaStream)
      setFacingMode(mode)
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError(t('common:camera.cameraError'))
    }
  }, [facingMode, stream, t])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedImage(imageData)
      stopCamera()
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleConfirm = () => {
    if (!capturedImage) return

    // Convert data URL to File object
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `wine-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        })
        onCapture(file)
        handleClose()
      })
  }

  const handleSwitchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    startCamera(newMode)
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setError(null)
    onClose()
  }

  useEffect(() => {
    if (opened && !capturedImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [opened, capturedImage, startCamera, stopCamera])

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      fullScreen
      withCloseButton={false}
      transitionProps={{ transition: 'fade', duration: 200 }}
      styles={{
        body: {
          padding: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000',
        },
      }}
    >
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {error && (
          <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 10 }}>
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          </div>
        )}

        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '0 20px',
        }}>
          {!error && (
            <Group justify="center" gap="xl" style={{ width: '100%' }}>
              {capturedImage ? (
                <>
                  <Button
                    variant="white"
                    color="dark"
                    size="lg"
                    radius="xl"
                    onClick={handleRetake}
                    leftSection={<IconCamera size={20} />}
                  >
                    {t('common:camera.retakePhoto')}
                  </Button>
                  <Button
                    size="lg"
                    radius="xl"
                    onClick={handleConfirm}
                  >
                    {t('common:buttons.save')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="transparent"
                    color="white"
                    onClick={handleSwitchCamera}
                  >
                    <IconCameraRotate size={32} />
                  </Button>

                  <Button
                    onClick={handleCapture}
                    size="xl"
                    radius="xl"
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      padding: 0,
                      border: '4px solid white',
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                    }} />
                  </Button>

                  <div style={{ width: '32px' }} /> {/* Spacer to balance Switch button */}
                </>
              )}
            </Group>
          )}

          <Button
            variant="subtle"
            color="white"
            onClick={handleClose}
          >
            {t('common:camera.closeCamera')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
