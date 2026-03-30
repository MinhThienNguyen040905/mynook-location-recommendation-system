import { cn } from '@/lib/utils';

interface ProjectCardProps {
  title: string;
  description?: string;
  avatarSeed: string;
  ownerName: string;
  isActive?: boolean;
  language?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python:     'bg-green-500',
  Go:         'bg-cyan-500',
  Rust:       'bg-orange-500',
};

export function ProjectCard({
  title,
  description,
  avatarSeed,
  ownerName,
  isActive = false,
  language = 'TypeScript',
}: ProjectCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group',
        isActive
          ? 'border-orange-500 ring-2 ring-orange-100 shadow-orange-100'
          : 'border-gray-200 hover:border-orange-300',
      )}
    >
      {/* Active indicator strip */}
      {isActive && (
        <div className="h-1 w-10 bg-orange-500 rounded-full mb-3" />
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-[15px] mb-1.5 transition-colors',
          isActive
            ? 'text-orange-600'
            : 'text-gray-800 group-hover:text-orange-600',
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description ? (
        <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={`https://picsum.photos/seed/${avatarSeed}/40/40`}
            alt={ownerName}
            className={cn(
              'size-6 rounded-full object-cover border-2',
              isActive ? 'border-orange-300' : 'border-gray-100',
            )}
          />
          <span className="text-xs text-gray-500">{ownerName}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'size-2.5 rounded-full',
              LANGUAGE_COLORS[language] ?? 'bg-gray-400',
            )}
          />
          <span className="text-xs text-gray-400">{language}</span>
        </div>
      </div>
    </div>
  );
}
