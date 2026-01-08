import { useRef, useState, useEffect } from 'react'
import { Modal, Button, Group, Stack, Alert } from '@mantine/core'
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

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
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
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

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
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [opened])

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('common:camera.cameraTitle')}
      size="lg"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!error && (
          <Group justify="center" gap="md">
            {capturedImage ? (
              <>
                <Button
                  variant="default"
                  onClick={handleRetake}
                  leftSection={<IconCamera size={18} />}
                >
                  {t('common:camera.retakePhoto')}
                </Button>
                <Button onClick={handleConfirm}>
                  {t('common:buttons.save')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  onClick={handleSwitchCamera}
                  leftSection={<IconCameraRotate size={18} />}
                >
                  {t('common:camera.switchCamera')}
                </Button>
                <Button
                  onClick={handleCapture}
                  leftSection={<IconCamera size={18} />}
                >
                  {t('common:camera.capturePhoto')}
                </Button>
              </>
            )}
          </Group>
        )}

        <Button variant="subtle" onClick={handleClose}>
          {t('common:camera.closeCamera')}
        </Button>
      </Stack>
    </Modal>
  )
}
