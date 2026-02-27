import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { getTheme } from '../utils/theme';
import type { MotionProfileType } from '../utils/animations';

interface QRCodeBlock {
  type: 'qr-code';
  data: string;
  title?: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  fgColor?: string;
  bgColor?: string;
}

interface QRCodeSceneProps {
  data: QRCodeBlock;
  theme: string;
  motionProfile: MotionProfileType;
  animation: { enter: number; hold: number; exit: number };
}

// Simple QR code pattern generator
function generateQRPattern(data: string, modules: number = 25): boolean[][] {
  const pattern: boolean[][] = [];
  
  for (let i = 0; i < modules; i++) {
    pattern[i] = [];
    for (let j = 0; j < modules; j++) {
      // Create finder patterns in corners
      const isTopLeft = i < 7 && j < 7;
      const isTopRight = i < 7 && j >= modules - 7;
      const isBottomLeft = i >= modules - 7 && j < 7;
      
      if (isTopLeft || isTopRight || isBottomLeft) {
        const localI = isTopLeft ? i : isTopRight ? i : i - (modules - 7);
        const localJ = isTopLeft ? j : isTopRight ? j - (modules - 7) : j;
        
        if (localI === 0 || localI === 6 || localJ === 0 || localJ === 6) {
          pattern[i][j] = true;
        } else if (localI >= 2 && localI <= 4 && localJ >= 2 && localJ <= 4) {
          pattern[i][j] = true;
        } else {
          pattern[i][j] = false;
        }
      } else {
        // Generate pattern based on data hash
        const hash = (data.charCodeAt(i % data.length) + data.charCodeAt(j % data.length)) % 3;
        pattern[i][j] = hash === 0;
      }
    }
  }
  
  return pattern;
}

export function QRCodeScene({ data, theme, animation }: QRCodeSceneProps) {
  const frame = useCurrentFrame();
  const colors = getTheme(theme);
  const fps = 30;
  
  const { qrData, title, subtitle, size = 'medium', fgColor = '#000000', bgColor = '#FFFFFF' } = data;
  
  const sizes = { small: 180, medium: 240, large: 320 };
  const qrSize = sizes[size] || 240;
  
  const pattern = generateQRPattern(qrData || 'https://example.com');
  const modules = pattern.length;
  const moduleSize = qrSize / modules;
  
  // Entrance animation
  const opacity = interpolate(
    frame,
    [0, animation.enter * fps],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
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
        }}
      >
        {/* Title */}
        {title && (
          <div
            style={{
              fontSize: 36,
              fontFamily: 'system-ui, sans-serif',
              color: colors.text,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {title}
          </div>
        )}
        
        {/* QR Code Container */}
        <div
          style={{
            width: qrSize + 32,
            height: qrSize + 32,
            backgroundColor: bgColor,
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* QR Pattern */}
          <svg width={qrSize} height={qrSize}>
            {pattern.map((row, i) =>
              row.map((cell, j) => (
                <rect
                  key={`${i}-${j}`}
                  x={j * moduleSize}
                  y={i * moduleSize}
                  width={moduleSize}
                  height={moduleSize}
                  fill={cell ? fgColor : 'transparent'}
                />
              ))
            )}
          </svg>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: 24,
              fontFamily: 'system-ui, sans-serif',
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
