'use client';

import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { CarePhoto } from '@/components/dog-profile-dialog';
import {
  calendarActivities,
  careDateLabel,
  linkedCareExpense,
  type CareUpdate,
} from '@/lib/care-calendar';
import { profileDogs, kronor } from '@/lib/donation-shell';
import { expenseDateLabel, expenseLabel } from '@/lib/donation-spending';
import { useDogCare } from '@/hooks/use-dog-care';

export function ShelterPhotoDialog({
  event,
  onClose,
}: {
  event: CareUpdate | null;
  onClose: () => void;
}) {
  const { expenses } = useDogCare();
  const expense = event ? linkedCareExpense(event, expenses) : undefined;
  const dog = profileDogs.find((item) => item.id === event?.dogId);
  const category = calendarActivities.find(
    (item) => item.id === event?.activity,
  );
  return (
    <Dialog
      open={!!event && !!dog}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {event && dog && (
        <DialogContent className="donation-shell shelter-event-photo-dialog">
          <DialogTitle>
            <Camera size={22} /> {dog.name} · {category?.label}
          </DialogTitle>
          <DialogDescription>
            {careDateLabel(event.publishedAt ?? event.startsAt)} · Stockholm ·
            Staff photo
          </DialogDescription>
          {expense && (
            <p className="shelter-event-photo-transaction">
              <strong>
                {expenseLabel(expense)} · {kronor(expense.amountOre)} SEK
              </strong>
              <span>{expenseDateLabel(expense)}</span>
            </p>
          )}
          <div className="shelter-event-photos">
            {event.photos.map((photo, index) => (
              <CarePhoto key={`${event.id}-${index}`} {...photo} />
            ))}
          </div>
          {event.note && (
            <p className="shelter-event-photo-note">{event.note}</p>
          )}
          <small>Local prototype update</small>
        </DialogContent>
      )}
    </Dialog>
  );
}
