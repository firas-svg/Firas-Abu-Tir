import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bird } from './components/Bird';
import { Pipe } from './components/Pipe';
import { Background } from './components/Background';
import { 
  GRAVITY, 
  JUMP_STRENGTH, 
  PIPE_SPEED, 
  PIPE_SPAWN_RATE, 
  PIPE_GAP, 
  BIRD_SIZE,
  BIRD_X_POSITION, 
  PIPE_WIDTH,
  GROUND_HEIGHT
} from './constants';
import { GameStatus as StatusEnum, GameState, PipeData, ParticleData } from './types';
import { playJumpSound, playScoreSound, playDieSound, tryResumeAudio, startMusic, setMusicMuted } from './audio';

// Bird horizontal position relative to the game container
const BIRD_LEFT_MARGIN = 32; 

const App: React.FC = () => {
  // UI State (triggers renders)
  const [gameState, setGameState] = useState<StatusEnum>(StatusEnum.WELCOME);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  // Game Refs (Mutable state for the game loop, doesn't trigger renders)
  const gameStateRef = useRef<StatusEnum>(StatusEnum.WELCOME);
  const scoreRef = useRef(0);
  const birdY = useRef(0);
  const birdVelocity = useRef(0);
  const birdRotation = useRef(0);
  const pipes = useRef<PipeData[]>([]);
  const particles = useRef<ParticleData[]>([]);

  // Generation Sequence State
  const sequenceRef = useRef<{ 
    type: 'NORMAL' | 'EASY' | 'HARD' | 'SLOPE', 
    count: number, 
    direction?: number 
  }>({ type: 'NORMAL', count: 0 });
  
  // Loop Timing
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const requestRef = useRef<number>();
  
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Get the effective width of the game container for spawning logic
  const getGameWidth = (windowWidth: number) => {
    return Math.min(windowWidth, 448); // 448px is max-w-md
  };

  const getSafeInitialY = useCallback((height: number) => {
    const playableHeight = height - GROUND_HEIGHT;
    return (playableHeight / 2) - (BIRD_SIZE / 2);
  }, []);

  // Sync state to refs for the loop to access
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const saved = localStorage.getItem('flappy-best-score');
    if (saved) setBestScore(parseInt(saved, 10));

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset bird position if window resizes while in menu
  useEffect(() => {
    if (gameState === StatusEnum.START || gameState === StatusEnum.WELCOME) {
       birdY.current = getSafeInitialY(dimensions.height);
    }
  }, [dimensions.height, gameState, getSafeInitialY]);

  const spawnParticles = () => {
    const count = 4;
    for (let i = 0; i < count; i++) {
        particles.current.push({
            id: Date.now() + Math.random(),
            // Spawn at bird's center-bottom/rear
            x: BIRD_LEFT_MARGIN + (BIRD_SIZE / 2),
            y: birdY.current + (BIRD_SIZE / 1.5),
            vx: (Math.random() - 0.8) * 2, // Slight left bias to trail behind
            vy: (Math.random() * 2) + 1,   // Move down slightly
            life: 1.0,
            size: Math.random() * 6 + 4
        });
    }
  };

  const startGame = () => {
    setGameState(StatusEnum.PLAYING);
    setScore(0);
    scoreRef.current = 0;
    
    birdY.current = getSafeInitialY(dimensions.height);
    birdVelocity.current = JUMP_STRENGTH; // Jump immediately
    birdRotation.current = -20;
    pipes.current = [];
    particles.current = [];
    
    // Reset sequence
    sequenceRef.current = { type: 'NORMAL', count: 0 };
    
    // Spawn timer set to trigger almost immediately
    spawnTimerRef.current = 1300; 

    lastTimeRef.current = performance.now();
    
    // Start Audio
    tryResumeAudio();
    if (!isMuted) {
       playJumpSound();
    }
    // Music is started here on first interaction
    startMusic(); 
    
    spawnParticles(); // Initial puff
  };

  const jump = useCallback(() => {
    tryResumeAudio();

    if (gameStateRef.current === StatusEnum.WELCOME) {
        setGameState(StatusEnum.START);
        return;
    }

    if (gameStateRef.current === StatusEnum.PLAYING) {
      birdVelocity.current = JUMP_STRENGTH;
      spawnParticles();
      if (!isMuted) playJumpSound();
    } else if (gameStateRef.current === StatusEnum.START || gameStateRef.current === StatusEnum.GAME_OVER) {
      startGame();
    }
  }, [dimensions.height, isMuted]);

  const gameOver = () => {
    if (!isMuted) playDieSound();
    
    // Trigger shake effect
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);

    setGameState(StatusEnum.GAME_OVER);
    if (scoreRef.current > bestScore) {
      setBestScore(scoreRef.current);
      localStorage.setItem('flappy-best-score', scoreRef.current.toString());
    }
  };

  const toggleMute = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    tryResumeAudio();
    setIsMuted(prev => {
        const nextMute = !prev;
        setMusicMuted(nextMute);
        return nextMute;
    });
  };

  // The Game Loop
  const loop = useCallback((time: number) => {
    if (gameStateRef.current !== StatusEnum.PLAYING) {
        requestRef.current = requestAnimationFrame(loop);
        return;
    }

    // Delta Time Calculation
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Cap delta time to prevent spiraling if tab was inactive (max 100ms)
    const cappedDelta = Math.min(deltaTime, 64);
    
    // Normalize speed factor based on 60FPS target
    const dtFactor = cappedDelta / 16.666;

    // 1. Update Bird Physics
    birdVelocity.current += GRAVITY * dtFactor;
    birdY.current += birdVelocity.current * dtFactor;

    // Rotation
    if (birdVelocity.current < 0) {
      birdRotation.current = Math.max(-25, birdRotation.current - (5 * dtFactor));
    } else {
      birdRotation.current = Math.min(90, birdRotation.current + (3 * dtFactor));
    }

    // 2. Update Particles
    // Iterate backwards to allow removal
    for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life -= 0.04 * dtFactor; // Fade out speed
        
        // Move with world (pipes) so they look like they are left behind in the air
        p.x -= PIPE_SPEED * dtFactor; 
        
        // Local movement
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;

        if (p.life <= 0) {
            particles.current.splice(i, 1);
        }
    }

    // 3. Collision with Ground
    const hitBottom = birdY.current + BIRD_SIZE >= dimensions.height - GROUND_HEIGHT;
    if (hitBottom) {
      birdY.current = dimensions.height - GROUND_HEIGHT - BIRD_SIZE;
      gameOver();
      return; 
    }

    // 4. Pipe Management
    
    // Timer-based spawning (independent of frame rate)
    const SPAWN_INTERVAL_MS = 1500; 
    spawnTimerRef.current += cappedDelta;

    if (spawnTimerRef.current >= SPAWN_INTERVAL_MS) {
      spawnTimerRef.current = 0;

      // --- ADVANCED PIPE GENERATION LOGIC ---
      if (sequenceRef.current.count <= 0) {
        const r = Math.random();
        if (r < 0.45) {
             sequenceRef.current = { type: 'NORMAL', count: Math.floor(Math.random() * 3) + 2 };
        } else if (r < 0.7) {
             sequenceRef.current = { type: 'EASY', count: Math.floor(Math.random() * 3) + 2 };
        } else if (r < 0.85) {
             sequenceRef.current = { type: 'HARD', count: Math.floor(Math.random() * 3) + 2 };
        } else {
             sequenceRef.current = { type: 'SLOPE', count: Math.floor(Math.random() * 4) + 3, direction: Math.random() > 0.5 ? 1 : -1 };
        }
      }
      sequenceRef.current.count--;

      // Calculate Parameters based on sequence
      let currentGap = PIPE_GAP;
      if (sequenceRef.current.type === 'EASY') currentGap = PIPE_GAP + 25; 
      if (sequenceRef.current.type === 'HARD') currentGap = PIPE_GAP - 25; 

      const minPipeHeight = 50;
      const maxPipeHeight = dimensions.height - GROUND_HEIGHT - currentGap - minPipeHeight;
      const safeMax = Math.max(minPipeHeight, maxPipeHeight);
      
      let nextHeight = 0;
      const lastPipe = pipes.current[pipes.current.length - 1];
      const prevHeight = lastPipe ? lastPipe.topHeight : safeMax / 2;

      switch (sequenceRef.current.type) {
        case 'EASY':
           const center = safeMax / 2;
           nextHeight = center + (Math.random() * 100 - 50);
           break;
        case 'SLOPE':
           const step = 60 * (sequenceRef.current.direction || 1);
           nextHeight = prevHeight + step;
           if (nextHeight < minPipeHeight || nextHeight > safeMax) {
              sequenceRef.current.direction = (sequenceRef.current.direction || 1) * -1;
              nextHeight = Math.max(minPipeHeight, Math.min(safeMax, nextHeight)); 
           }
           break;
        case 'HARD':
           nextHeight = Math.random() * (safeMax - minPipeHeight) + minPipeHeight;
           break;
        case 'NORMAL':
        default:
           nextHeight = Math.random() * (safeMax - minPipeHeight) + minPipeHeight;
           break;
      }

      nextHeight = Math.max(minPipeHeight, Math.min(safeMax, nextHeight));

      pipes.current.push({
        id: Date.now(),
        x: getGameWidth(dimensions.width),
        topHeight: Math.floor(nextHeight),
        passed: false,
        gap: currentGap
      });
    }

    // Move Pipes & Check Collision
    pipes.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED * dtFactor;
      
      const hitPadding = 12;

      const bLeft = BIRD_LEFT_MARGIN + hitPadding; 
      const bRight = BIRD_LEFT_MARGIN + BIRD_SIZE - hitPadding;
      const bTop = birdY.current + hitPadding;
      const bBottom = birdY.current + BIRD_SIZE - hitPadding;

      const pLeft = pipe.x;
      const pRight = pipe.x + PIPE_WIDTH;
      
      const topPipeBottom = pipe.topHeight;
      const bottomPipeTop = pipe.topHeight + pipe.gap;

      if (bRight > pLeft && bLeft < pRight) {
        if (bTop < topPipeBottom || bBottom > bottomPipeTop) {
           gameOver();
        }
      }

      if (!pipe.passed && BIRD_LEFT_MARGIN > pRight) {
        pipe.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current); 
        if (!isMuted) playScoreSound();
      }
    });

    // Cleanup off-screen pipes
    // Increased buffer to -300 to prevent potential visual pop-out or lag during active view
    if (pipes.current.length > 0 && pipes.current[0].x < -300) {
      pipes.current.shift();
    }

    setTick(t => t + 1); 
    requestRef.current = requestAnimationFrame(loop);
  }, [dimensions, bestScore, isMuted, getSafeInitialY]); 

  // Trigger render
  const [, setTick] = useState(0);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); 
        jump();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
        // e.preventDefault(); 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [jump]);

  return (
    <div 
      className={`relative w-full h-screen max-h-screen flex flex-col items-center justify-between overflow-hidden bg-background-dark select-none touch-manipulation ${isShaking ? 'shake' : ''}`}
      onClick={jump}
    >
      <Background />

      <div className="relative z-10 w-full h-full max-w-md mx-auto pointer-events-none">
        
        {/* UI Layer */}
        <div className="absolute top-0 left-0 w-full p-4 pt-12 flex justify-between items-start pointer-events-auto z-50">
          {gameState !== StatusEnum.WELCOME ? (
            <div className="flex flex-col">
                <span className="text-white/90 text-xs font-bold tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Best</span>
                <span className="text-white text-xl font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{bestScore}</span>
            </div>
          ) : <div/>}
          
          {gameState !== StatusEnum.WELCOME && (
          <div className="absolute left-1/2 transform -translate-x-1/2 top-16 pointer-events-none">
            <h1 className="text-white text-6xl font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] stroke-black stroke-2" style={{ WebkitTextStroke: '2px black' }}>
              {score}
            </h1>
          </div>
          )}

          <div className="flex gap-2">
            <button 
                onClick={toggleMute}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-black/30 backdrop-blur-sm hover:bg-black/40 text-white border border-white/10 shadow-lg active:scale-95 transition-all"
            >
               <span className="material-symbols-outlined text-2xl">
                 {isMuted ? 'volume_off' : 'volume_up'}
               </span>
            </button>

            {gameState === StatusEnum.PLAYING && (
              <button 
                  onClick={(e) => { e.stopPropagation(); setGameState(StatusEnum.START); }}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-black/30 backdrop-blur-sm hover:bg-black/40 text-white border border-white/10 shadow-lg active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-2xl">pause</span>
              </button>
            )}
          </div>
        </div>

        {/* Bird Layer */}
        <div className={`absolute top-0 left-0 w-full h-full z-30 ${(gameState === StatusEnum.START || gameState === StatusEnum.WELCOME) ? 'animate-[bounce_2s_infinite]' : ''}`}>
           <Bird y={birdY.current} rotation={birdRotation.current} />
        </div>

        {/* Particles Layer */}
        <div className="absolute top-0 left-0 w-full h-full z-25 pointer-events-none">
            {particles.current.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-white/60"
                    style={{
                        transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
                        width: p.size,
                        height: p.size,
                        opacity: p.life,
                        willChange: 'transform, opacity'
                    }}
                />
            ))}
        </div>

        {/* Pipe Layer */}
        <div className="z-20">
          {pipes.current.map(pipe => (
            <Pipe 
              key={pipe.id} 
              x={pipe.x} 
              topHeight={pipe.topHeight} 
              gameHeight={dimensions.height}
              gap={pipe.gap}
            />
          ))}
        </div>

        {/* Welcome Screen */}
        {gameState === StatusEnum.WELCOME && (
             <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-6 animate-[bounce_1s_ease-in-out_1]">
                    <div className="flex flex-col items-center text-center">
                        <span className="text-white text-xl font-bold tracking-widest uppercase drop-shadow-md mb-2">Welcome to</span>
                        <h1 className="text-6xl font-black text-[#FACC15] drop-shadow-[0_4px_0_#000] stroke-black leading-tight" 
                            style={{ WebkitTextStroke: '2px black' }}>
                            FLAPPY<br/>BIRD
                        </h1>
                        <span className="text-white text-lg font-medium mt-4 drop-shadow-md bg-black/20 px-4 py-1 rounded-full">by Firas</span>
                    </div>

                    <div className="mt-12 animate-pulse">
                        <span className="bg-sky-start border-b-4 border-[#2c8d96] px-8 py-4 rounded-xl text-white font-bold text-xl shadow-xl">
                            TAP TO ENTER
                        </span>
                    </div>
                </div>
             </div>
        )}

        {/* Start Prompt */}
        {gameState === StatusEnum.START && (
            <div className="absolute top-[45%] left-0 w-full text-center pointer-events-none animate-pulse z-40">
                <div className="inline-flex flex-col items-center gap-2 bg-black/20 p-4 rounded-xl backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">touch_app</span>
                    <h2 className="text-white text-2xl font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">TAP TO FLY</h2>
                </div>
            </div>
        )}

        {/* Game Over Modal */}
        {gameState === StatusEnum.GAME_OVER && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             
             <div className="relative w-[85%] max-w-xs bg-[#ded895] border-4 border-[#5d3714] rounded-xl p-1 flex flex-col items-center gap-3 shadow-2xl animate-[bounce_0.5s_ease-out]">
                <div className="w-full h-full border-2 border-[#d0c874] rounded-lg p-5 flex flex-col items-center gap-4 bg-[#ded895]">
                  <h2 className="text-3xl font-bold text-[#e86101] drop-shadow-[0_2px_0_rgba(255,255,255,0.5)] mb-1">GAME OVER</h2>
                  
                  <div className="flex flex-row justify-between w-full gap-4">
                     <div className="flex flex-col items-center gap-1 flex-1 bg-[#d0c874] border-2 border-[#5d3714] rounded p-2">
                        <span className="text-[10px] text-[#e86101] font-bold uppercase tracking-wider">Score</span>
                        <span className="text-2xl font-bold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{score}</span>
                     </div>
                     <div className="flex flex-col items-center gap-1 flex-1 bg-[#d0c874] border-2 border-[#5d3714] rounded p-2">
                        <span className="text-[10px] text-[#e86101] font-bold uppercase tracking-wider">Best</span>
                        <span className="text-2xl font-bold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{bestScore}</span>
                     </div>
                  </div>

                  <button 
                      onClick={(e) => { e.stopPropagation(); startGame(); }}
                      className="w-full mt-2 bg-sky-start hover:bg-sky-end text-white font-bold py-3 px-4 rounded border-b-4 border-[#2c8d96] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                  >
                      <span className="material-symbols-outlined text-xl">replay</span>
                      PLAY AGAIN
                  </button>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;