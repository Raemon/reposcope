import { githubSignInAvailable } from '@/features/github-auth/githubOAuthConfig';
import { HomeLanding } from '@/features/sources/HomeLanding';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="p-6">
      <HomeLanding error={error ?? null} signInAvailable={githubSignInAvailable()} />
    </div>
  );
}
