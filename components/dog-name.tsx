import { PawPrint } from 'lucide-react';

export function DogName({ name }: { name: string }) {
  return (
    <strong className="dog-display-name">
      <PawPrint aria-hidden="true" size={12} />
      <span>{name}</span>
      <PawPrint aria-hidden="true" size={12} />
    </strong>
  );
}
