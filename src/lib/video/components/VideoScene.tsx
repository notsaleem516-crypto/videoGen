import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';

interface VideoBlock {
  type: 'video';
  src?: string;
  poster?: string;
  caption?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

interface VideoSceneProps {
  data: VideoBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

export function VideoScene({ data, theme, animation }: VideoSceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { src, poster, caption, muted = true } = data;
  
  // Entrance animation
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  
  const opacity = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 50 },
  });
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          transform: `scale(${scale})`,
          width: '90%',
          maxWidth: 800,
        }}
      >
        {/* Video Container */}
        <div
          style={{
            width: '100%',
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: '#000',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Video Preview / Poster */}
          <div
            style={{
              width: '100%',
              aspectRatio: '16/9',
              backgroundColor: '#1a1a1a',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {poster ? (
              <img
                src={poster}
                alt={caption || 'Video'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '24px solid white',
                    borderTop: '14px solid transparent',
                    borderBottom: '14px solid transparent',
                    marginLeft: 6,
                  }}
                />
              </div>
            )}
            
            {/* Muted indicator */}
            {muted && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#FFFFFF',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                🔇 Muted
              </div>
            )}
            
            {/* Video source indicator */}
            {src && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#FFFFFF',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                🎬 Video Block
              </div>
            )}
          </div>
        </div>
        
        {/* Caption */}
        {caption && (
          <div
            style={{
              fontSize: 24,
              fontFamily: 'system-ui, sans-serif',
              color: colors.textSecondary,
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
