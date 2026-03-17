interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-32",
  md: "h-56",
  lg: "h-56",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <img
      src="/funderise-logo.webp"
      alt="Funderaise"
      className={`${sizeMap[size]} w-auto h object-contain ${className}`}
    />
  );
}
