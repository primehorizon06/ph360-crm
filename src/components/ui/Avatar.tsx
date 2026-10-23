import Image from "next/image";

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

const pixels = { sm: 32, md: 40, lg: 64 };

export function Avatar({ name, avatar, size = "sm" }: AvatarProps) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? ""}
        width={pixels[size]}
        height={pixels[size]}
        unoptimized
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} bg-primary rounded-full flex items-center justify-center text-on-primary font-bold`}
    >
      {name?.[0]?.toUpperCase()}
    </div>
  );
}
