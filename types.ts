export enum GameStatus {
  WELCOME = 'WELCOME',
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface PipeData {
  id: number;
  x: number;
  topHeight: number; // Height of the top pipe
  passed: boolean;
  gap: number; // The vertical gap size for this specific pipe
}

export interface ParticleData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  bestScore: number;
}