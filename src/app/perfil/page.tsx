import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
import { ProfileWishlist } from "@/components/profile-wishlist";
import { Shell } from "@/components/shell";
import { getProfile, getProfileWishlist, requireUser } from "@/lib/db";
import { groupByType } from "@/lib/format";

export default async function ProfilePage() {
  const user = await requireUser("/perfil");
  const [profile, items] = await Promise.all([
    getProfile(user.id),
    getProfileWishlist(),
  ]);

  const lists = groupByType(items);
  const name =
    profile?.display_name?.trim() ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Amigo";

  return (
    <>
      <AppHeader title="Mi perfil" backHref="/dashboard" />

      <main className="flex-1 py-5">
        <Shell className="space-y-8">
          <ProfileForm
            name={name}
            email={profile?.email ?? user.email ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            birthday={profile?.birthday ?? null}
            phone={profile?.phone ?? null}
          />

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Mi lista base</h2>
              <p className="text-muted-foreground text-sm">
                Ármala una vez y la importas en cada grupo donde estés. Es
                privada: nadie la ve hasta que la importes a un grupo.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ProfileWishlist type="endulzada" items={lists.endulzada} />
              <ProfileWishlist type="regalo" items={lists.regalo} />
            </div>
          </section>
        </Shell>
      </main>
    </>
  );
}
