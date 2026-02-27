// ============================================================================
// TOWER CHART 3D SCENE - 2D Tower Visualization (Remotion-compatible)
// ============================================================================

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { TowerChart3DBlock, AnimationPhase } from '../schemas';
import type { MotionProfileType } from '../utils/animations';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function lerpCSSColor(color1: string, color2: string, t: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface TowerChart3DSceneProps {
  data: TowerChart3DBlock;
  theme?: string;
  motionProfile?: MotionProfileType;
  animation?: AnimationPhase;
}

export function TowerChart3DScene({ data }: TowerChart3DSceneProps): React.ReactElement {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  const {
    items = [],
    title = 'Rankings',
    subtitle,
    baseHeight = 15,
    maxHeight = 65,
    gradientStart = '#3B82F6',
    gradientEnd = '#8B5CF6',
    useGradientByRank = true,
    backgroundColor = '#0a0a1a',
  } = data;
  
  // Sort by rank (highest first = rank 1)
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => a.rank - b.rank), 
    [items]
  );
  
  // Value range for height calculation
  const { minValue, maxValue } = useMemo(() => {
    if (items.length === 0) return { minValue: 0, maxValue: 1 };
    const values = items.map(i => i.value);
    return { minValue: Math.min(...values), maxValue: Math.max(...values) };
  }, [items]);
  
  const totalItems = sortedItems.length;
  
  // Title animation
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-40, 0], { extrapolateRight: 'clamp' });
  
  // Calculate spacing
  const towerWidth = Math.min(60, (width - 80) / totalItems - 10);
  const spacing = (width - 80) / totalItems;
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Background effects */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 100%, ${gradientStart}15 0%, transparent 50%)`,
        }}
      />
      
      {/* Subtle grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />
      
      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: 40,
          right: 40,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${gradientStart}40 20%, ${gradientStart}40 80%, transparent)`,
        }}
      />
      
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 35,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: Math.min(44, width * 0.06),
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: Math.min(18, width * 0.028),
              color: '#94A3B8',
              marginTop: 6,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Towers */}
      {sortedItems.map((item, index) => {
        // Height based on value
        const normalizedValue = (item.value - minValue) / (maxValue - minValue || 1);
        const targetHeight = baseHeight + normalizedValue * (maxHeight - baseHeight);
        
        // Color
        const color = useGradientByRank
          ? lerpCSSColor(gradientEnd, gradientStart, (totalItems - item.rank) / Math.max(totalItems - 1, 1))
          : (item.color || gradientStart);
        
        // Animation - staggered reveal with easeOut
        const revealStart = 15 + index * 12;
        const revealEnd = revealStart + 25;
        const revealProgress = interpolate(frame, [revealStart, revealEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        
        // Ease out cubic for smooth animation
        const easeProgress = 1 - Math.pow(1 - revealProgress, 3);
        
        // Height animation
        const heightPercent = easeProgress * targetHeight;
        const heightPx = (heightPercent / 100) * height * 0.55;
        
        // Fade in
        const opacity = interpolate(revealProgress, [0, 0.4, 1], [0, 0.7, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        
        // Scale pop effect
        const scale = interpolate(revealProgress, [0, 0.6, 1], [0.85, 1.03, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        
        // Position
        const leftPos = 40 + spacing * index + spacing / 2;
        
        return (
          <div
            key={`tower-${item.rank}`}
            style={{
              position: 'absolute',
              bottom: 70,
              left: leftPos,
              transform: `translateX(-50%) scaleY(${scale})`,
              transformOrigin: 'bottom center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity,
            }}
          >
            {/* Image above tower */}
            {item.image && revealProgress > 0.6 && (
              <div
                style={{
                  width: towerWidth * 0.9,
                  height: towerWidth * 0.9,
                  marginBottom: 6,
                  borderRadius: 6,
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  opacity: interpolate(revealProgress, [0.6, 1], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            
            {/* Tower bar */}
            <div
              style={{
                width: towerWidth,
                height: heightPx,
                background: `linear-gradient(180deg, ${color} 0%, ${color}cc 60%, ${color}88 100%)`,
                borderRadius: '6px 6px 2px 2px',
                boxShadow: `
                  0 0 20px ${color}40,
                  0 4px 20px rgba(0,0,0,0.3),
                  inset 0 2px 10px rgba(255,255,255,0.1)
                `,
                position: 'relative',
              }}
            >
              {/* Shine effect */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                  borderRadius: '6px 6px 0 0',
                }}
              />
            </div>
            
            {/* Label below tower */}
            <div
              style={{
                marginTop: 8,
                textAlign: 'center',
                maxWidth: towerWidth + 20,
              }}
            >
              <div
                style={{
                  fontSize: Math.min(13, width * 0.018),
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                }}
              >
                #{item.rank}
              </div>
              <div
                style={{
                  fontSize: Math.min(10, width * 0.014),
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: Math.min(9, width * 0.013),
                  color: '#4ADE80',
                  fontWeight: 500,
                  marginTop: 1,
                }}
              >
                {item.valueFormatted || formatValue(item.value)}
              </div>
              {item.subtitle && (
                <div
                  style={{
                    fontSize: Math.min(8, width * 0.011),
                    color: '#6B7280',
                    marginTop: 1,
                  }}
                >
                  {item.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Progress indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 5,
          opacity: titleOpacity * 0.6,
        }}
      >
        {sortedItems.slice(0, Math.min(10, totalItems)).map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: frame > 15 + i * 12 ? gradientStart : '#2a2a3a',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

export default TowerChart3DScene;
