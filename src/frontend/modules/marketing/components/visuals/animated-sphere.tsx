"use client";

import { useRef } from "react";

import { useSphereLogic } from "../../hooks/use-sphere-logic";
import { useCanvasSphere } from "../../hooks/use-canvas-sphere";

const CHARS = ".:+*#%@";

export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 1. Get the math brain
  const { getPoints } = useSphereLogic(CHARS);
  
  // 2. Attach the engine to the canvas
  useCanvasSphere(canvasRef, getPoints);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  );
}