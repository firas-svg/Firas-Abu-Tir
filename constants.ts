export const GRAVITY = 0.6;
export const JUMP_STRENGTH = -8;
export const PIPE_SPEED = 3.5;
export const PIPE_SPAWN_RATE = 90; // Decreased from 100 for more frequent pipes
export const PIPE_GAP = 175; // Increased from 160 to make passing easier
export const PIPE_WIDTH = 64; // w-16 in tailwind (16 * 4px)
export const BIRD_SIZE = 40; // w-10 h-10 in tailwind
export const BIRD_X_POSITION = 80; // Fixed X position for the bird
export const GROUND_HEIGHT = 140;

// Boundaries
export const GAME_WIDTH = window.innerWidth > 448 ? 448 : window.innerWidth;
export const GAME_HEIGHT = window.innerHeight;
export const CEILING_LIMIT = -200; // Allow bird to go slightly above screen before resetting logic if needed