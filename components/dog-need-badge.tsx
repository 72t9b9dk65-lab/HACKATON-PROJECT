import { Bandage, Cross, ShieldCheck, Utensils } from 'lucide-react';
import { PixelCareIcon } from '@/components/pixel-care-icon';
import { needKinds, type DogNeedId } from '@/lib/dog-needs';

const icons = {
  food: Utensils,
  medical: Bandage,
  urgent: Cross,
  checkup: ShieldCheck,
};

export function DogNeedBadge({
  need,
  showLabel = false,
}: {
  need: DogNeedId;
  showLabel?: boolean;
}) {
  const Icon = icons[need];
  const kind = needKinds.find((item) => item.id === need)!;
  return (
    <span
      className={`dog-need-badge dog-need-${need}`}
      title={`${kind.label} · illustrative need`}
    >
      {need === 'food' ? (
        <PixelCareIcon kind="food" width="22" height="22" aria-hidden="true" />
      ) : (
        <Icon size={16} aria-hidden="true" />
      )}
      <span className={showLabel ? undefined : 'sr-only'}>
        {kind.label}
        {showLabel ? '' : ' · care need'}
      </span>
    </span>
  );
}
