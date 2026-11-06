import { useState } from "react";
import { LayoutChangeEvent, ScrollView, ScrollViewProps } from "react-native";

// Vertikal scroll "auto" rejimida: mazmun ekranga sig'sa scroll ham, tebranish (bounce) ham,
// scroll chizig'i ham bo'lmaydi. Mazmun sig'masagina scroll yoqiladi.
export function CusScrollView({
  onLayout,
  onContentSizeChange,
  ...rest
}: ScrollViewProps) {
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);

  // viewH 0 bo'lsa (hali o'lchanmagan) scroll yoqilmaydi, o'lchangach to'g'rilanadi.
  const scrollable = viewH > 0 && contentH > viewH + 1;

  return (
    <ScrollView
      {...rest}
      scrollEnabled={scrollable}
      alwaysBounceVertical={false}
      showsVerticalScrollIndicator={scrollable}
      onLayout={(e: LayoutChangeEvent) => {
        setViewH(e.nativeEvent.layout.height);
        onLayout?.(e);
      }}
      onContentSizeChange={(w, h) => {
        setContentH(h);
        onContentSizeChange?.(w, h);
      }}
    />
  );
}
