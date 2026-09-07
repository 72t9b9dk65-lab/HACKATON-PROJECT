import Image, { type ImageProps } from 'next/image';
import { profilePreview } from '@/lib/platform/photo-preview';
type Props = Omit<ImageProps, 'src' | 'width' | 'height'> & {
  src: string | undefined;
  width?: number;
  height?: number;
};
// Keep local, private care files on their original endpoint. Pixel assets also
// retain their alpha and exact pixels; CSS controls their displayed size.
export function CareImage({
  src,
  alt,
  width = 640,
  height = 640,
  loading = 'lazy',
  ...props
}: Props) {
  if (!src) return null;
  return (
    <Image
      src={profilePreview(src, width <= 320 ? 320 : 960)}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      unoptimized
      {...props}
    />
  );
}
