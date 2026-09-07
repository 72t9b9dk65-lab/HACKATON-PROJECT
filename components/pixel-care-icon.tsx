import type { SVGProps } from 'react';
import type { CareKind } from '@/lib/donation-shell';

// Functional 16 × 16 pixel icons. Shared by the ledger and map markers.
export function PixelCareIcon({
  kind,
  ...props
}: SVGProps<SVGSVGElement> & { kind: CareKind | 'heart' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="32"
      height="32"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...props}
    >
      {kind === 'food' ? (
        <>
          <path d="M3 7h2V5h2V4h2v2h3v1h2v6h-2v2H4v-2H2V7Z" fill="#8f6939" />
          <path d="M4 7V6h2V5h2v2h2V6h2v2H4Z" fill="#dfb66f" />
          <path d="M1 8h14v2H1Zm1 2h12v2H2Zm2 2h8v2H4Z" fill="#efcf8d" />
          <path d="M2 10h2v2h8v1H4v-1H2Z" fill="#c8944a" />
          <path d="M5 9h2v2H5Zm4 0h2v2H9Z" fill="#fff0c7" />
        </>
      ) : kind === 'health' ? (
        <>
          <path d="M5 2h6v3h3v9H2V5h3Z" fill="#91ace0" />
          <path d="M6 3h4v2H6Z" fill="#202b40" />
          <path d="M3 6h10v7H3Z" fill="#b9d0fa" />
          <path d="M7 7h2v2h2v2H9v2H7v-2H5V9h2Z" fill="#f4f8ff" />
        </>
      ) : kind === 'comfort' ? (
        <>
          <path d="M1 7h2v4h10V7h2v7H1Z" fill="#9375b0" />
          <path d="M3 8h10v4H3Z" fill="#c3a6df" />
          <path d="M3 7h4v3H3Z" fill="#ebdafb" />
          <path d="M2 13h2v2H2Zm10 0h2v2h-2Z" fill="#755588" />
          <path d="M9 3h2V2h2v2h-2v1H9Z" fill="#ebdafb" />
        </>
      ) : (
        <>
          <path
            d="M2 3h4v1h4V3h4v2h1v5h-2v2h-2v2H9v1H7v-1H5v-2H3v-2H1V5h1Z"
            fill="currentColor"
          />
          <path d="M3 5h2v2H3Z" fill="#fff" opacity=".6" />
        </>
      )}
    </svg>
  );
}
