import { Text, TextProps } from "react-native";

type Variant = "title" | "heading" | "body" | "caption";
type Tone = "default" | "muted" | "primary" | "danger" | "success" | "warning";

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  title: "text-2xl font-bold",
  heading: "text-lg font-semibold",
  body: "text-base",
  caption: "text-xs",
};

const toneStyles: Record<Tone, string> = {
  default: "text-foreground",
  muted: "text-muted",
  primary: "text-primary",
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
};

export function CusText({ variant = "body", tone = "default", className = "", ...rest }: Props) {
  return <Text className={`${variantStyles[variant]} ${toneStyles[tone]} ${className}`} {...rest} />;
}
