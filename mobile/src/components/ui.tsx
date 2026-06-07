import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentClassName?: string;
}

export function Screen({ children, scroll = true, refreshControl, contentClassName }: ScreenProps): React.ReactElement {
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className={`flex-1 px-4 ${contentClassName ?? ''}`}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={`px-4 pb-8 ${contentClassName ?? ''}`}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }): React.ReactElement {
  return (
    <View className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className ?? ''}`}>{children}</View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;
  const base = 'flex-row items-center justify-center rounded-xl px-4 py-3';
  const byVariant: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-brand-600',
    secondary: 'border border-slate-200 bg-white',
    ghost: 'bg-transparent',
  };
  const textByVariant: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'text-white',
    secondary: 'text-slate-700',
    ghost: 'text-brand-600',
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      className={`${base} ${byVariant[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.brand[600]} />
      ) : (
        <Text className={`text-sm font-semibold ${textByVariant[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Skeleton({ className }: { className?: string }): React.ReactElement {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }} className={`rounded-xl bg-slate-200 ${className ?? ''}`} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): React.ReactElement {
  return (
    <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Text className="text-sm font-semibold text-amber-900">Something went wrong</Text>
      <Text className="mt-1 text-xs text-amber-800">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text className="mt-2 text-sm font-semibold text-amber-900 underline">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }): React.ReactElement {
  return (
    <View className="items-center rounded-2xl border border-slate-100 bg-white px-6 py-10">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      {body ? <Text className="mt-1 text-center text-sm text-slate-500">{body}</Text> : null}
    </View>
  );
}

export function LoadingScreen(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color={colors.brand[600]} />
    </View>
  );
}
