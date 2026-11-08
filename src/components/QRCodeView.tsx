import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { generateQrMatrix } from '@/utils/qrGenerator';

interface QRCodeViewProps {
  value: string;
  size?: number;
  showLogo?: boolean;
}

export function QRCodeView({ value, size = 220, showLogo = true }: QRCodeViewProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  const onlineUri = `https://api.qrserver.com/v1/create-qr-code/?size=${Math.round(size * 2)}x${Math.round(size * 2)}&margin=10&data=${encodeURIComponent(value)}`;

  const matrixSize = matrix?.length ?? 25;
  const cellSize = Math.floor((size - 16) / matrixSize);
  const actualGridSize = cellSize * matrixSize;
  const logoSize = Math.max(34, Math.floor(size * 0.22));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {!imgFailed ? (
        <Image
          source={{ uri: onlineUri }}
          style={{ width: size - 12, height: size - 12, borderRadius: 8 }}
          resizeMode="contain"
          onError={() => setImgFailed(true)}
        />
      ) : matrix ? (
        <View style={[styles.matrixWrap, { width: actualGridSize, height: actualGridSize }]}>
          {matrix.map((row, r) => (
            <View key={`row-${r}`} style={{ flexDirection: 'row', height: cellSize }}>
              {row.map((dark, c) => (
                <View
                  key={`cell-${r}-${c}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: dark ? '#0F172A' : '#FFFFFF',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {showLogo && (
        <View style={[styles.logoWrap, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
          <Image
            source={require('@/IMG/logo.png')}
            style={{ width: logoSize - 8, height: logoSize - 8, borderRadius: (logoSize - 8) / 2 }}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  matrixWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D6EFD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
});
