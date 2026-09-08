'use client';
import { CareImage } from './care-image';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ShelterMap from '@/components/shelter-map';
import { fundingSummary, profileDogs } from '@/lib/donation-shell';
import { useCareWorkspace } from '@/hooks/use-care-workspace';
import { DogDialog } from './dog-dialog';
import {
  Header,
  Footer,
  LoadingWorkspace,
  Modal,
  Notice,
  dateLabel,
} from './shared';
import type { CarePost } from '@/lib/platform/types';
export default function ExploreWorkspace() {
  const store = useCareWorkspace();
  const [selectedDog, setSelectedDog] = useState(profileDogs[0].id);
  const [dog, setDog] = useState<string | null>(null);
  const [post, setPost] = useState<CarePost | null>(null);
  if (!store.state) return <LoadingWorkspace store={store} />;
  return (
    <div className="care-platform">
      <Header online={store.online} />
      <main className="cp-explore-main">
        <Link className="cp-text-link" href="/">
          <ArrowLeft size={16} /> Back to my shelter
        </Link>
        <div className="cp-page-intro">
          <div>
            <span className="cp-eyebrow">
              REAL PLACES. REAL SECOND CHANCES.
            </span>
            <h1>Meet Hundstallet’s shelters</h1>
            <p>Explore Sweden and open a dog’s story.</p>
          </div>
        </div>
        {store.error && <Notice kind="error">{store.error}</Notice>}
        <ShelterMap
          selectedDogId={selectedDog}
          funding={fundingSummary([])}
          onSelectDog={setSelectedDog}
          onOpenDog={setDog}
          showFunding={false}
        />
      </main>
      <Footer />
      <DogDialog
        dogId={dog}
        state={store.state}
        donorId="personal"
        onClose={() => setDog(null)}
        onFollow={(id) =>
          void store.send({ type: 'follow', donorId: 'personal', dogId: id })
        }
        onDonate={() => window.location.assign('/?donate=1')}
        onPhoto={setPost}
      />
      <Modal
        open={!!post}
        onClose={() => setPost(null)}
        title={post?.title ?? 'Care moment'}
        description={
          post
            ? `${dateLabel(post.occurredAt)} · ${post.source === 'demo' ? 'Demo story' : 'Care update'}`
            : undefined
        }
      >
        {post && (
          <>
            <CareImage
              className="cp-full-photo"
              src={post.photo?.url ?? post.demoPhoto}
              alt={post.title}
            />
            <p>{post.note}</p>
          </>
        )}
      </Modal>
    </div>
  );
}
