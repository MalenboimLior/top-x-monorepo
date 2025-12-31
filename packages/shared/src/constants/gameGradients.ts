export interface GradientPreset {
    start: string;
    end: string;
    text: string;
}

export const GAME_GRADIENT_PRESETS: GradientPreset[] = [
    { start: '#e800d1', end: '#00ff80', text: '#ffffff' }, // Neon Pink to Green
    { start: '#00e8e0', end: '#c4ff00', text: '#000000' }, // Cyan to Lime
    { start: '#7928ca', end: '#ff0080', text: '#ffffff' }, // Purple to Pink
    { start: '#0070f3', end: '#00dfd8', text: '#ffffff' }, // Blue to Cyan
    { start: '#ff4d4d', end: '#f9cb28', text: '#ffffff' }, // Red to Yellow
    { start: '#43e97b', end: '#38f9d7', text: '#000000' }, // Green to Teal
    { start: '#fa709a', end: '#fee140', text: '#ffffff' }, // Pink to Yellow
    { start: '#a18cd1', end: '#fbc2eb', text: '#ffffff' }, // Purple to Light Pink
    { start: '#84fab0', end: '#8fd3f4', text: '#000000' }, // Green to Blue
    { start: '#ff0844', end: '#ffb199', text: '#ffffff' }, // Red to Peach
    { start: '#667eea', end: '#764ba2', text: '#ffffff' }, // Blue to Purple
    { start: '#f093fb', end: '#f5576c', text: '#ffffff' }, // Pink to Rose
    { start: '#30cfd0', end: '#330867', text: '#ffffff' }, // Teal to Deep Purple
    { start: '#5eead4', end: '#9333ea', text: '#ffffff' }, // Mint to Purple
    { start: '#fce38a', end: '#f38181', text: '#ffffff' }, // Pale Yellow to Coral
];

export function getRandomGradientPreset(): GradientPreset {
    return GAME_GRADIENT_PRESETS[Math.floor(Math.random() * GAME_GRADIENT_PRESETS.length)];
}
