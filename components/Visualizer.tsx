import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  inputVolume: number; // 0.0 to 1.0
  outputVolume: number; // 0.0 to 1.0
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    // Smoothing factors
    let currentIn = 0;
    let currentOut = 0;

    const render = () => {
      // Smooth transitions
      currentIn += (inputVolume - currentIn) * 0.2;
      currentOut += (outputVolume - currentOut) * 0.2;

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw Input (Left Side - Blue)
      ctx.beginPath();
      const inHeight = Math.max(2, currentIn * height * 2); 
      ctx.fillStyle = isActive ? '#3b82f6' : '#334155'; // Blue 500
      // Draw a "Wave" or bar representation
      ctx.roundRect(width * 0.25 - 20, centerY - inHeight / 2, 40, inHeight, 10);
      ctx.fill();

      // Draw Connector
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.25 + 25, centerY);
      ctx.lineTo(width * 0.75 - 25, centerY);
      ctx.stroke();

      // Draw Output (Right Side - Pink/Anjali)
      ctx.beginPath();
      const outHeight = Math.max(2, currentOut * height * 2.5); // Amplify output slightly
      ctx.fillStyle = isActive ? '#ec4899' : '#334155'; // Pink 500
      ctx.roundRect(width * 0.75 - 20, centerY - outHeight / 2, 40, outHeight, 10);
      ctx.fill();

      // Labels
      ctx.font = '12px Inter';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText("MIC INPUT", width * 0.25, height - 10);
      ctx.fillText("ANJALI OUT", width * 0.75, height - 10);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [inputVolume, outputVolume, isActive]);

  return (
    <div className="w-full bg-slate-800 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={150} 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Visualizer;
