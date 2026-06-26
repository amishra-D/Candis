export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const NODE_COLORS = {
  node1: { hex: '#00f0ff', name: 'Cyan' },
  node2: { hex: '#ffd700', name: 'Gold' },
  node3: { hex: '#39ff14', name: 'Neon Green' },
  node4: { hex: '#ff007f', name: 'Neon Pink' },
  node5: { hex: '#ff6600', name: 'Neon Orange' },
};

export const DEFAULT_COLOR = { hex: '#ef4444' };

export const getNodeStyle = (nodeId) => NODE_COLORS[nodeId] || DEFAULT_COLOR;
