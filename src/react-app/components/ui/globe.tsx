"use client"

import { useEffect, useRef } from "react"
import createGlobe, { type COBEOptions } from "cobe"
import { useMotionValue, useSpring, type SpringOptions } from "motion/react"

import { cn } from "@/lib/utils"

const MOVEMENT_DAMPING = 1400

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => { },
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  baseColor: [1, 1, 1],
  markerColor: [1, 0.84, 0], // Gold
  glowColor: [1, 1, 1],
  markers: [
    { location: [21.3891, 39.8579], size: 0.1 }, // Mecca
    { location: [24.5247, 39.5692], size: 0.08 }, // Medina
    { location: [31.7683, 35.2137], size: 0.08 }, // Jerusalem
    { location: [30.0444, 31.2357], size: 0.07 }, // Cairo
    { location: [41.0082, 28.9784], size: 0.07 }, // Istanbul
    { location: [33.3152, 44.3661], size: 0.06 }, // Baghdad
    { location: [-6.2088, 106.8456], size: 0.08 }, // Jakarta
    { location: [3.1390, 101.6869], size: 0.06 }, // Kuala Lumpur
    { location: [24.8607, 67.0011], size: 0.07 }, // Karachi
    { location: [35.6892, 51.3890], size: 0.07 }, // Tehran
    { location: [24.7136, 46.6753], size: 0.06 }, // Riyadh
    { location: [25.2048, 55.2708], size: 0.06 }, // Dubai
    { location: [33.5731, -7.5898], size: 0.06 }, // Casablanca
    { location: [51.5074, -0.1278], size: 0.05 }, // London
    { location: [40.7128, -74.0060], size: 0.05 }, // New York
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(0)
  const widthRef = useRef(0)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)

  const r = useMotionValue(0)
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  } as SpringOptions)

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      r.set(r.get() + delta / MOVEMENT_DAMPING)
    }
  }

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth
      }
    }

    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender: (state) => {
        if (!pointerInteracting.current) phiRef.current += 0.003
        state.phi = phiRef.current + rs.get()
        state.width = widthRef.current * 2
        state.height = widthRef.current * 2
      },
    })

    setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0)
    return () => {
      globe.destroy()
      window.removeEventListener("resize", onResize)
    }
  }, [rs, config])

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-square w-full max-w-[600px]",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 contain-[layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX
          updatePointerInteraction(e.clientX)
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}
