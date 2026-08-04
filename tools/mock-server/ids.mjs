let seq = 100;
export const nextId = () => `id-${++seq}`;
export const now = () => new Date().toISOString();
