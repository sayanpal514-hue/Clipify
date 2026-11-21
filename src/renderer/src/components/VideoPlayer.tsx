import React, { useRef, useEffect } from 'react'

interface Props {
  src: string
  startTime?: number
  style?: React.CSSProperties
}

export default function VideoPlayer({
  src,
  startTime = 0,
  style,
}: Props): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime
    }
  }, [src, startTime])

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      onLoadedMetadata={() => {
        if (videoRef.current && startTime > 0) {
          videoRef.current.currentTime = startTime
        }
      }}
      style={{
        width: '100%',
        borderRadius: 8,
        background: '#000',
        maxHeight: 320,
        display: 'block',
        ...style,
      }}
    />
  )
}
