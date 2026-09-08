import {
  context,
  session,
  enabledProviders,
  demoEnabled,
} from '@/lib/platform/auth';
import { apiError } from '@/lib/platform/access-policy';
export async function GET(request: Request) {
  try {
    return Response.json(
      {
        ...context(request),
        user: (await session(request))?.user ?? null,
        providers: enabledProviders(),
        demo: demoEnabled(request),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
