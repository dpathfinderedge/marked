interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-bg-2 motion-reduce:animate-none ${className}`}
    />
  );
}