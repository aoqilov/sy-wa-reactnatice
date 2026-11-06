import { Image, ImageProps } from "expo-image";
import { cssInterop } from "nativewind";

// expo-image uchun `className` ni `style` ga o'tkazib beradi (NativeWind uchinchi tomon komponentlarini
// o'zi bilmaydi).
cssInterop(Image, { className: "style" });

type Props = ImageProps & { className?: string };

export function CusImage({ className = "", contentFit = "cover", transition = 200, ...rest }: Props) {
  return (
    <Image
      contentFit={contentFit}
      transition={transition}
      className={`bg-surface-alt ${className}`}
      {...rest}
    />
  );
}
