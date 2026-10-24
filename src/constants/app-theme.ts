import { Appearance } from 'react-native';

const darkColors = {
  background: '#050505',
  surface: 'rgba(255, 255, 255, 0.05)',
  text: '#F9FAFB',
  mutedText: '#9CA3AF',
  border: 'rgba(255, 255, 255, 0.1)',
  primary: '#EF4444',
  secondary: '#3B82F6',
  danger: '#EF4444',
  success: '#10B981',
  softBlue: 'rgba(59, 130, 246, 0.15)',
  softGreen: 'rgba(16, 185, 129, 0.15)',
} as const;

const lightColors = {
  background: '#F7F8FB',
  surface: '#FFFFFF',
  text: '#111827',
  mutedText: '#6B7280',
  border: '#D1D5DB',
  primary: '#2563EB',
  secondary: '#1D4ED8',
  danger: '#DC2626',
  success: '#059669',
  softBlue: '#E6F0FF',
  softGreen: '#E7F6ED',
} as const;

export const colors = Appearance.getColorScheme() === 'light' ? lightColors : darkColors;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
