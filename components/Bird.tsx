import React from 'react';
import { BIRD_SIZE } from '../constants';

interface BirdProps {
  y: number;
  rotation: number;
}

export const Bird: React.FC<BirdProps> = ({ y, rotation }) => {
  return (
    <div 
      className="absolute left-8 z-20 will-change-transform"
      style={{ 
        top: y,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Body */}
        <path
          d="M34 16C34 16 32 10 26 10H14C8 10 4 16 4 20C4 26 8 30 14 30H28"
          fill="#FACC15" // yellow-400
          stroke="black"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* White Belly Patch */}
        <path
          d="M26 26C24 26 22 30 14 30C10 30 8 28 6 24"
          stroke="black"
          strokeWidth="2.5"
          fill="#FEF08A" // yellow-200
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Eye */}
        <circle cx="28" cy="16" r="6" fill="white" stroke="black" strokeWidth="2.5" />
        <circle cx="30" cy="16" r="2" fill="black" />

        {/* Wing */}
        <path
          d="M10 20C10 20 12 16 18 18C22 19 22 22 18 24C12 25 10 20 10 20Z"
          fill="white"
          stroke="black"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Beak Lower */}
        <path
          d="M28 26L36 26C36 26 38 28 36 30C34 32 30 30 28 30"
          fill="#F97316" // orange-500
          stroke="black"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Beak Upper */}
        <path
          d="M28 26L36 26C36 26 38 24 36 22C34 20 30 22 28 26"
          fill="#F97316" // orange-500
          stroke="black"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};