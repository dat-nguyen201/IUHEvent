import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@tamagui/core';

type HoldToCancelButtonProps = {
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  holdDuration?: number;
  label?: string;
  holdingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
};

const DEFAULT_HOLD_DURATION = 1800;
const SUCCESS_DISPLAY_DURATION = 900;

export function HoldToCancelButton({
  onConfirm,
  disabled = false,
  loading = false,
  holdDuration = DEFAULT_HOLD_DURATION,
  label = 'Hủy lưu sự kiện',
  holdingLabel = 'Đang hủy...',
  successLabel = 'Đã hủy lưu',
  errorLabel = 'Không thể hủy lưu. Thử lại',
}: HoldToCancelButtonProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const completedRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(loading);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);

  const clearHoldTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetProgress = useCallback(() => {
    progress.set(withTiming(0, { duration: 160 }));
    setIsHolding(false);
  }, [progress]);

  const confirm = useCallback(async () => {
    if (completedRef.current || isProcessing || disabled) return;

    completedRef.current = true;
    clearHoldTimer();
    setIsHolding(false);
    setIsProcessing(true);
    setHasError(false);

    try {
      await onConfirm();
      if (!mountedRef.current) return;
      setIsProcessing(false);
      setIsSuccess(true);
      successTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setIsSuccess(false);
      }, SUCCESS_DISPLAY_DURATION);
    } catch {
      if (!mountedRef.current) return;
      completedRef.current = false;
      setIsProcessing(false);
      setHasError(true);
      resetProgress();
    }
  }, [clearHoldTimer, disabled, isProcessing, onConfirm, resetProgress]);

  const finishHold = useCallback(() => {
    void confirm();
  }, [confirm]);

  const startHold = useCallback(() => {
    if (disabled || isProcessing || isSuccess) return;

    completedRef.current = false;
    setHasError(false);
    setIsHolding(true);
    progress.set(withTiming(1, { duration: holdDuration }, (finished) => {
      if (finished) runOnJS(finishHold)();
    }));
    clearHoldTimer();
    timerRef.current = setTimeout(() => {
      void confirm();
    }, holdDuration + 80);
  }, [clearHoldTimer, confirm, disabled, finishHold, holdDuration, isProcessing, isSuccess, progress]);

  const cancelHold = useCallback(() => {
    if (completedRef.current || isProcessing || isSuccess) return;
    clearHoldTimer();
    resetProgress();
  }, [clearHoldTimer, isProcessing, isSuccess, resetProgress]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearHoldTimer();
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      cancelAnimation(progress);
    };
  }, [clearHoldTimer, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const text = isSuccess ? successLabel : hasError ? errorLabel : isHolding ? holdingLabel : isProcessing ? holdingLabel : label;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        disabled={disabled || isProcessing || isSuccess}
        onPressIn={startHold}
        onPressOut={cancelHold}
        style={[
          styles.button,
          { borderColor: theme.danger.val },
          (isProcessing || isSuccess) && styles.disabledButton,
        ]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.danger.val }, fillStyle]} />
        <Text style={[styles.text, { color: isHolding || isProcessing || isSuccess ? '#FFFFFF' : theme.danger.val }]}>
          {text}
        </Text>
      </Pressable>
      {isHolding ? (
        <Text style={[styles.hint, { color: theme.muted.val }]}>Giữ đến khi thanh đỏ chạy hết</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.8,
  },
  fill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
