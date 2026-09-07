'use client';

import { useState } from 'react';
import { PawPrint, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ShelterProfile as Profile } from '@/lib/shelter-profile';

export function ShelterProfile({
  profile,
  onSave,
  ready,
  sessionOnly,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
  ready: boolean;
  sessionOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shelterName, setShelterName] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="personal-profile-heading">
        <span className="personal-profile-avatar">
          <PawPrint size={26} />
        </span>
        <div>
          <span className="donation-eyebrow">
            {profile.name}’S PERSONAL SHELTER
          </span>
          <h1>{profile.shelterName}</h1>
          <p>
            {sessionOnly
              ? 'Profile available for this session'
              : 'Personal profile · saved on this device'}
          </p>
        </div>
        <DialogTrigger
          render={<Button variant="outline" disabled={!ready} />}
          onClick={() => {
            setName(profile.name);
            setShelterName(profile.shelterName);
          }}
        >
          <Pencil size={15} /> Edit profile
        </DialogTrigger>
      </div>
      <DialogContent className="donation-shell virtual-dog-dialog personal-profile-dialog">
        <DialogTitle>Your personal shelter</DialogTitle>
        <DialogDescription>
          Name your shelter and make it yours. This profile is stored in this
          browser.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !shelterName.trim()) return;
            onSave({
              ...profile,
              name: name.trim(),
              shelterName: shelterName.trim(),
            });
            setOpen(false);
          }}
        >
          <label htmlFor="supporter-name">Your name</label>
          <Input
            id="supporter-name"
            value={name}
            maxLength={40}
            required
            onChange={(event) => setName(event.target.value)}
          />
          <label htmlFor="personal-shelter-name">Shelter name</label>
          <Input
            id="personal-shelter-name"
            value={shelterName}
            maxLength={60}
            required
            onChange={(event) => setShelterName(event.target.value)}
          />
          <Button
            type="submit"
            className="donation-primary"
            disabled={!name.trim() || !shelterName.trim()}
          >
            Save profile
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
