import { CareImage } from '@/components/platform/care-image';
import type { ProfileDog } from '@/lib/donation-shell';

export function DogPortrait({
  dog,
  large = false,
}: {
  dog: Pick<ProfileDog, 'name' | 'photos' | 'sprite'>;
  large?: boolean;
}) {
  return (
    <span className="dog-portrait">
      <CareImage
        className="dog-portrait-photo"
        width={large ? 960 : 320}
        height={large ? 960 : 320}
        src={dog.photos[0].src}
        alt={dog.name}
        loading="lazy"
        draggable="false"
      />
      <CareImage
        className="dog-portrait-avatar"
        src={dog.sprite}
        alt=""
        aria-hidden="true"
        width={64}
        height={64}
        loading="lazy"
        draggable="false"
      />
    </span>
  );
}
