import React from 'react';
import { PIPE_WIDTH, GROUND_HEIGHT } from '../constants';

interface PipeProps {
  x: number;
  topHeight: number;
  gameHeight: number;
  gap: number;
}

export const Pipe: React.FC<PipeProps> = ({ x, topHeight, gameHeight, gap }) => {
  const bottomPipeHeight = gameHeight - GROUND_HEIGHT - topHeight - gap;

  // Use translate3d for GPU acceleration
  const style = {
    transform: `translate3d(${x}px, 0, 0)`,
    width: PIPE_WIDTH,
    willChange: 'transform' // Hint to browser to optimize
  } as const;

  return (
    <>
      {/* Top Pipe */}
      <div 
        className="absolute top-0 left-0 bg-green-500 border-x-4 border-b-4 border-black/80 flex flex-col justify-end z-10"
        style={{ 
          ...style,
          height: topHeight,
        }}
      >
        {/* Pipe Rim */}
        <div className="w-[120%] -ml-[10%] h-8 bg-green-500 border-4 border-black/80 mb-0 relative">
          <div className="absolute top-1 left-2 w-1 h-4 bg-green-300/50"></div>
        </div>
      </div>

      {/* Bottom Pipe */}
      <div 
        className="absolute left-0 bg-green-500 border-x-4 border-t-4 border-black/80 flex flex-col justify-start z-10"
        style={{ 
          ...style,
          bottom: GROUND_HEIGHT,
          height: bottomPipeHeight,
        }}
      >
        {/* Pipe Rim */}
        <div className="w-[120%] -ml-[10%] h-8 bg-green-500 border-4 border-black/80 mt-0 relative">
          <div className="absolute top-1 left-2 w-1 h-4 bg-green-300/50"></div>
        </div>
      </div>
    </>
  );
};