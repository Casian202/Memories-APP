import { useEffect, useState, useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ThemeEffects - Renders immersive ambient animations based on the active theme.
 * Each theme gets its own unique set of particle effects, decorations, and animations.
 */
export default function ThemeEffects() {
  const { theme } = useTheme()
  const slug = theme?.slug || 'default'

  return (
    <div className="theme-effects-container" aria-hidden="true">
      {/* Theme background overlays */}
      {slug === 'christmas' && <div className="theme-bg-christmas" />}
      {slug === 'slytherin' && <div className="theme-bg-slytherin" />}
      {slug === 'gryffindor' && <div className="theme-bg-gryffindor" />}
      
      <AnimatePresence mode="wait">
        {slug === 'christmas' && <ChristmasEffects key="christmas" />}
        {slug === 'valentine' && <ValentineEffects key="valentine" />}
        {slug === 'new_year' && <NewYearEffects key="newyear" />}
        {slug === 'gryffindor' && <GryffindorEffects key="gryffindor" />}
        {slug === 'slytherin' && <SlytherinEffects key="slytherin" />}
        {slug === 'anniversary' && <AnniversaryEffects key="anniversary" />}
        {slug === 'vacation_ski' && <SkiEffects key="ski" />}
        {slug === 'vacation_beach' && <BeachEffects key="beach" />}
      </AnimatePresence>
    </div>
  )
}

// ==================== CHRISTMAS ====================
function ChristmasEffects() {
  const snowflakes = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 7,
      opacity: Math.random() * 0.7 + 0.3,
      swing: Math.random() * 40 - 20,
      char: ['❄', '❅', '❆', '•'][Math.floor(Math.random() * 4)]
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Snowflakes */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            opacity: flake.opacity,
            '--swing': `${flake.swing}px`,
          }}
        >
          {flake.char}
        </div>
      ))}

      {/* Christmas tree - bottom right corner */}
      <div className="christmas-tree">
        <div className="tree-star">⭐</div>
        <div className="tree-body">
          <div className="tree-layer tree-layer-1">🎄</div>
        </div>
        <div className="tree-lights">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="tree-light"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.3}s`,
                backgroundColor: ['#ff0000', '#ffdd00', '#00ff00', '#0088ff', '#ff00ff'][i % 5],
              }}
            />
          ))}
        </div>
      </div>

      {/* Garland at the top */}
      <div className="christmas-garland">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="garland-light"
            style={{
              animationDelay: `${i * 0.2}s`,
              backgroundColor: ['#ff0000', '#00ff00', '#ffdd00', '#0088ff', '#ff00ff'][i % 5],
            }}
          />
        ))}
      </div>

      {/* Gift boxes */}
      <div className="christmas-gifts">
        <span className="gift-box gift-box-1">🎁</span>
        <span className="gift-box gift-box-2">🎁</span>
        <span className="gift-box gift-box-3">🎄</span>
      </div>
    </motion.div>
  )
}

// ==================== VALENTINE'S DAY ====================
function ValentineEffects() {
  const hearts = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 20 + 10,
      delay: Math.random() * 12,
      duration: Math.random() * 8 + 8,
      opacity: Math.random() * 0.5 + 0.15,
      rotation: Math.random() * 60 - 30,
      char: ['❤️', '💕', '💗', '💖', '💝', '🩷', '♥'][Math.floor(Math.random() * 7)]
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Floating hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="floating-heart"
          style={{
            left: `${heart.left}%`,
            fontSize: `${heart.size}px`,
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            opacity: heart.opacity,
            '--rotation': `${heart.rotation}deg`,
          }}
        >
          {heart.char}
        </div>
      ))}

      {/* Rose petals */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`petal-${i}`}
          className="rose-petal"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${Math.random() * 10 + 12}s`,
            opacity: Math.random() * 0.4 + 0.1,
            fontSize: `${Math.random() * 14 + 8}px`,
          }}
        >
          🌹
        </div>
      ))}

      {/* Bottom decorative border */}
      <div className="valentine-border-bottom">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
          <path d="M0,60 Q150,0 300,40 Q450,80 600,30 Q750,-10 900,40 Q1050,80 1200,20 L1200,60 Z" fill="rgba(255,107,107,0.15)" />
        </svg>
      </div>
    </motion.div>
  )
}

// ==================== NEW YEAR ====================
function NewYearEffects() {
  const sparkles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
      color: ['#FFD700', '#C0C0C0', '#4169E1', '#FFFFFF', '#FFB347'][Math.floor(Math.random() * 5)]
    })), [])

  const fireworks = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: 10 + Math.random() * 80,
      top: 5 + Math.random() * 40,
      delay: Math.random() * 8,
      duration: Math.random() * 3 + 4,
      color: ['#FFD700', '#FF6B6B', '#4169E1', '#00FF88', '#FF69B4', '#FFA500'][i],
      size: Math.random() * 60 + 40
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="ny-sparkle"
          style={{
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDelay: `${sparkle.delay}s`,
            animationDuration: `${sparkle.duration}s`,
            backgroundColor: sparkle.color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
          }}
        />
      ))}

      {/* Firework bursts */}
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="firework"
          style={{
            left: `${fw.left}%`,
            top: `${fw.top}%`,
            animationDelay: `${fw.delay}s`,
            animationDuration: `${fw.duration}s`,
            '--fw-color': fw.color,
            '--fw-size': `${fw.size}px`,
          }}
        >
          {[...Array(12)].map((_, j) => (
            <div
              key={j}
              className="firework-particle"
              style={{
                '--angle': `${j * 30}deg`,
                backgroundColor: fw.color,
              }}
            />
          ))}
        </div>
      ))}

      {/* Confetti */}
      {[...Array(25)].map((_, i) => (
        <div
          key={`confetti-${i}`}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${Math.random() * 6 + 6}s`,
            backgroundColor: ['#FFD700', '#FF6B6B', '#4169E1', '#00FF88', '#FF69B4', '#C0C0C0'][Math.floor(Math.random() * 6)],
            width: `${Math.random() * 6 + 4}px`,
            height: `${Math.random() * 10 + 6}px`,
            '--confetti-rotate': `${Math.random() * 720}deg`,
          }}
        />
      ))}
    </motion.div>
  )
}

// ==================== GRYFFINDOR ====================
function GryffindorEffects() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 8,
      duration: Math.random() * 8 + 6,
      color: Math.random() > 0.5 ? '#D3A625' : '#AE0001',
      opacity: Math.random() * 0.5 + 0.2
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Golden/red ember particles rising */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="ember-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
        />
      ))}

      {/* Lion crest glow - subtle background accent */}
      <div className="gryffindor-crest-glow" />

      {/* Magical flame border at bottom */}
      <div className="flame-border">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="flame-tongues"
            style={{
              left: `${(i / 30) * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 1.5 + 1}s`,
              height: `${Math.random() * 20 + 10}px`,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ==================== SLYTHERIN ====================
function SlytherinEffects() {
  const bubbles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 3,
      delay: Math.random() * 10,
      duration: Math.random() * 10 + 8,
      opacity: Math.random() * 0.4 + 0.1
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Green mist particles */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="slytherin-bubble"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            opacity: b.opacity,
          }}
        />
      ))}

      {/* Snake-like flowing lines */}
      <div className="slytherin-mist slytherin-mist-1" />
      <div className="slytherin-mist slytherin-mist-2" />
      <div className="slytherin-mist slytherin-mist-3" />

      {/* Potion drips */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`drip-${i}`}
          className="potion-drip"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${Math.random() * 4 + 3}s`,
          }}
        />
      ))}

      {/* Serpent eyes glow */}
      <div className="serpent-glow" />
    </motion.div>
  )
}

// ==================== ANNIVERSARY ====================
function AnniversaryEffects() {
  const sparkles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 5 + 2,
      delay: Math.random() * 6,
      duration: Math.random() * 3 + 2,
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Golden sparkles */}
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="golden-sparkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Floating roses */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`rose-${i}`}
          className="anniversary-rose"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 12}s`,
            animationDuration: `${Math.random() * 10 + 10}s`,
            fontSize: `${Math.random() * 12 + 14}px`,
            opacity: Math.random() * 0.4 + 0.15,
          }}
        >
          🌹
        </div>
      ))}

      {/* Golden ring effects */}
      <div className="golden-rings">
        <div className="golden-ring golden-ring-1" />
        <div className="golden-ring golden-ring-2" />
      </div>
    </motion.div>
  )
}

// ==================== VACATION SKI ====================
function SkiEffects() {
  const snowflakes = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 5 + 2,
      delay: Math.random() * 8,
      duration: Math.random() * 6 + 5,
      opacity: Math.random() * 0.6 + 0.2,
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Snow particles */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="ski-snow"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            opacity: flake.opacity,
          }}
        />
      ))}

      {/* Mountain silhouette at bottom */}
      <div className="ski-mountains">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,120 L100,60 L200,90 L350,20 L500,70 L600,30 L750,80 L900,10 L1050,60 L1200,40 L1200,120 Z"
            fill="rgba(165,216,255,0.12)" />
          <path d="M0,120 L150,70 L300,100 L450,40 L600,80 L800,25 L950,70 L1100,50 L1200,80 L1200,120 Z"
            fill="rgba(165,216,255,0.08)" />
        </svg>
      </div>

      {/* Frost on edges */}
      <div className="frost-edge frost-edge-top" />
      <div className="frost-edge frost-edge-bottom" />
    </motion.div>
  )
}

// ==================== VACATION BEACH ====================
function BeachEffects() {
  const bubbles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 10 + 4,
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 6,
      opacity: Math.random() * 0.3 + 0.1
    })), [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Water bubbles */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="beach-bubble"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            opacity: b.opacity,
          }}
        />
      ))}

      {/* Waves at bottom */}
      <div className="beach-waves">
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />
      </div>

      {/* Sun glow */}
      <div className="beach-sun" />

      {/* Floating elements */}
      {['🐚', '🌊', '🏖️', '🐠', '⭐'].map((emoji, i) => (
        <div
          key={`beach-${i}`}
          className="beach-float"
          style={{
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 2}s`,
            animationDuration: `${8 + Math.random() * 4}s`,
            fontSize: `${Math.random() * 10 + 14}px`,
            opacity: 0.25,
          }}
        >
          {emoji}
        </div>
      ))}
    </motion.div>
  )
}
