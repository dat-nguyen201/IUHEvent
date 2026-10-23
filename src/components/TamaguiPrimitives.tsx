import { styled, Text, View } from '@tamagui/core';

export const Surface = styled(View, {
  name: 'Surface',
});

export const AppText = styled(Text, {
  name: 'AppText',
  fontSize: 15,
});

export const MutedText = styled(AppText, {
  name: 'MutedText',
});

export const SectionTitle = styled(AppText, {
  name: 'SectionTitle',
  fontSize: 18,
  fontWeight: '900',
});

export const ResponsiveContent = styled(View, {
  name: 'ResponsiveContent',
});
