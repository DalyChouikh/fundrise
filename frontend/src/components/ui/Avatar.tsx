interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const ringStyles = {
  sm: "ring-2",
  md: "ring-2",
  lg: "ring-[3px]",
  xl: "ring-[3px]",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-brand-accent to-orange-400",
    "from-brand-blue to-sky-400",
    "from-violet-500 to-purple-400",
    "from-emerald-500 to-teal-400",
    "from-rose-500 to-pink-400",
    "from-amber-500 to-yellow-400",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ring-white/80 ${ringStyles[size]} ${sizeStyles[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${getAvatarColor(name)} text-white flex items-center justify-center font-bold ${sizeStyles[size]} ${className}`}
    >
      {getInitials(name || "?")}
    </div>
  );
}
