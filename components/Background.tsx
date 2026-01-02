import React from 'react';
import { GROUND_HEIGHT } from '../constants';

export const Background: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-start to-sky-end w-full h-full overflow-hidden">
      {/* Clouds */}
      <div className="absolute top-[20%] left-[10%] opacity-80 animate-[float_20s_linear_infinite]">
        <div className="w-16 h-6 bg-white rounded-full"></div>
        <div className="w-8 h-8 bg-white rounded-full absolute -top-4 left-3"></div>
      </div>
      <div className="absolute top-[15%] right-[20%] opacity-60 scale-75 animate-[float_25s_linear_infinite_reverse]">
        <div className="w-16 h-6 bg-white rounded-full"></div>
        <div className="w-8 h-8 bg-white rounded-full absolute -top-4 left-3"></div>
      </div>

      {/* City Skyline */}
      <div 
        className="absolute w-full h-32 bg-repeat-x opacity-30" 
        style={{
          bottom: GROUND_HEIGHT,
          backgroundImage: `linear-gradient(to top, #65b891 0%, #65b891 20%, transparent 20%), linear-gradient(to top, #65b891 0%, #65b891 40%, transparent 40%)`,
          backgroundSize: '50px 100%, 30px 100%',
          backgroundPosition: '0 0, 20px 0'
        }}
      />
      
      {/* Ground Layer */}
      <div 
        className="absolute bottom-0 z-20 w-full bg-ground-base border-t-4 border-[#5d3714] overflow-hidden"
        style={{ height: GROUND_HEIGHT }}
      >
        {/* Grass Strip */}
        <div className="w-full h-3 bg-ground-top border-b-2 border-ground-border"></div>
        {/* Ground Pattern - Animated via CSS for simple parallax effect feeling */}
        <div 
            className="w-[200%] h-full flex" 
            style={{
                backgroundImage: `linear-gradient(45deg, #d0c874 25%, transparent 25%, transparent 75%, #d0c874 75%, #d0c874), linear-gradient(45deg, #d0c874 25%, transparent 25%, transparent 75%, #d0c874 75%, #d0c874)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                opacity: 0.4
            }}
        ></div>
      </div>
    </div>
  );
};