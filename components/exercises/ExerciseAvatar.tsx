import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { muscleHue } from '@/components/exercises/MuscleGroupBadge';
import { exerciseImageUrl } from '@/lib/exercise-images';

interface ExerciseAvatarProps {
  name: string;
  muscleGroups: string[];
  isSystem: boolean;
  size?: number;
}

export function ExerciseAvatar({
  name,
  muscleGroups,
  isSystem,
  size = 40,
}: ExerciseAvatarProps) {
  const primary = muscleGroups[0] ?? 'chest';
  const hue = muscleHue(primary);
  const letter = (name?.[0] ?? '·').toUpperCase();
  const imgUrl = isSystem ? exerciseImageUrl(name) : null;

  if (imgUrl) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-2xl bg-white/[0.04]"
        style={{
          width: size,
          height: size,
          boxShadow: `inset 0 0 0 1px hsla(${hue}, 70%, 60%, 0.16)`,
        }}
      >
        <Image
          src={imgUrl}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsla(${hue}, 70%, 55%, 0.18) 0%, hsla(${hue + 20}, 80%, 45%, 0.32) 100%)`,
        color: `hsl(${hue}, 75%, 70%)`,
        boxShadow: `inset 0 0 0 1px hsla(${hue}, 70%, 60%, 0.16)`,
      }}
    >
      {isSystem ? letter : <Sparkles size={size * 0.4} />}
    </div>
  );
}
