import { useEffect, useState } from 'react';
import { Text } from './Text';
import type { TextProps } from 'react-native';

/** Counts up to a number, so a result arrives instead of just appearing. */
export function CountUp({ to, style, ...rest }: { to: number } & Omit<TextProps, 'children'>) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (to <= 0) {
      setValue(0);
      return;
    }
    const steps = Math.min(28, Math.max(6, Math.round(to / 2)));
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setValue(Math.round((to * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [to]);
  return (
    <Text variant="hero" style={style} {...rest}>
      {value}
    </Text>
  );
}
