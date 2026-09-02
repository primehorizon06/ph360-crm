interface AvatarProps {
  name?: string | null;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8 text-lg",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-xl",
};

export function Avatar({ name, avatar, size = "sm" }: AvatarProps) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name ?? ""}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold`}
    >
      {name?.[0]?.toUpperCase()}
    </div>
  );
}
