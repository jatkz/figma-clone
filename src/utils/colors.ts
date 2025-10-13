export const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788'
];

export const getRandomColor = () => {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
};
