import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'var(--font-primary), sans-serif',
  defaultRadius: 'md',
  white: '#FFFFFF',
  black: '#212529',
  colors: {
    // Custom minimalist blue
    blue: [
      '#e6f0fa',
      '#cce0f5',
      '#99c2ea',
      '#66a3e0',
      '#3385d5',
      '#1C7ED6', // primary 5
      '#1665ab',
      '#114c80',
      '#0b3255',
      '#05192b',
    ],
  },
});
