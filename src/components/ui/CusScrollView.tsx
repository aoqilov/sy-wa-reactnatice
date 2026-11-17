import { type ComponentProps, useState } from "react";
import { LayoutChangeEvent, ScrollView, ScrollViewProps } from "react-native";

// Vertikal scroll "auto" rejimida: mazmun ekranga sig'sa scroll ham, tebranish (bounce) ham,
// scroll chizig'i ham bo'lmaydi. Mazmun sig'masagina scroll yoqiladi.
export function CusScrollView({
  onLayout,
  onContentSizeChange,
  ...rest
}: ScrollViewProps & { ref?: ComponentProps<typeof ScrollView>["ref"] }) {
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);

  // viewH 0 bo'lsa (hali o'lchanmagan) scroll yoqilmaydi, o'lchangach to'g'rilanadi.
  const scrollable = viewH > 0 && contentH > viewH + 1;
  // Pastga tortib yangilash (refreshControl) bo'lsa, mazmun sig'sa ham tortish ishlashi uchun scroll doim yoqiq.
  const pullable = !!rest.refreshControl;

  return (
    <ScrollView
      {...rest}
      scrollEnabled={scrollable || pullable}
      alwaysBounceVertical={pullable}
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
