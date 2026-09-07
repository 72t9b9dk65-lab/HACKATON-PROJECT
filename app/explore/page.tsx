import type { Metadata } from 'next';
import ExploreWorkspace from '@/components/platform/explore-workspace';
export const metadata: Metadata = {
  title: 'Explore Hundstallet’s shelters',
  description: 'Meet real dogs and discover the shelters behind their stories.',
};
export default function ExplorePage() {
  return <ExploreWorkspace />;
}
