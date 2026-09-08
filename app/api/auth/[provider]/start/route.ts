import { startSignIn } from '@/lib/platform/auth';
import { apiError } from '@/lib/platform/access-policy';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    return await startSignIn(request, (await params).provider);
  } catch (error) {
    return apiError(error);
  }
}
