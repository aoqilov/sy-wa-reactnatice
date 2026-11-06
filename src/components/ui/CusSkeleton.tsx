import { useEffect, useState } from "react";
import { Animated } from "react-native";

type Props = { className?: string };

// Ma'lumot yuklanguncha chiqadigan "miltillovchi" joy. O'lchamini className bilan berasiz:
// <CusSkeleton className="h-4 w-40" />
export function CusSkeleton({ className = "" }: Props) {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }} className={`rounded-md bg-border ${className}`} />;
}
