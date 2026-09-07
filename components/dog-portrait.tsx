import type { ProfileDog } from '@/lib/donation-shell';

export function DogPortrait({
  dog,
}: {
  dog: Pick<ProfileDog, 'name' | 'photos' | 'sprite'>;
}) {
  return (
    <span className="dog-portrait">
      <img
        className="dog-portrait-photo"
        src={dog.photos[0].src}
        alt={dog.name}
        width="240"
        height="240"
        loading="lazy"
        draggable="false"
      />
      <img
        className="dog-portrait-avatar"
        src={dog.sprite}
        alt=""
        aria-hidden="true"
        width="64"
        height="64"
        loading="lazy"
        draggable="false"
      />
    </span>
  );
}
