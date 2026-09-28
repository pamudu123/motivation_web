import type { AccountService, Profile } from "./models";
import { themes } from "./models";
const PROFILE = "daily-spark-demo-profile-v1";
const SESSION = "daily-spark-demo-session-v1";
function stored(): Profile {
  const raw = localStorage.getItem(PROFILE);
  if (!raw)
    return {
      id: "local-demo-user",
      displayName: "Spark Explorer",
      themes: [],
      liked: [],
      saved: [],
    };
  const p = JSON.parse(raw) as Profile;
  if (
    p.id !== "local-demo-user" ||
    typeof p.displayName !== "string" ||
    !Array.isArray(p.liked) ||
    !Array.isArray(p.saved) ||
    !Array.isArray(p.themes)
  )
    throw new Error(
      "Your demo data could not be read. Clear this site’s storage to start fresh.",
    );
  return { ...p, themes: p.themes.filter((t) => themes.includes(t)) };
}
export const accountService: AccountService = {
  async read() {
    return localStorage.getItem(SESSION) === "active" ? stored() : null;
  },
  async signIn() {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const profile = stored();
    localStorage.setItem(PROFILE, JSON.stringify(profile));
    localStorage.setItem(SESSION, "active");
    return profile;
  },
  async signOut() {
    localStorage.removeItem(SESSION);
  },
  async update(profile) {
    if (localStorage.getItem(SESSION) !== "active")
      throw new Error("Please sign in again.");
    localStorage.setItem(PROFILE, JSON.stringify(profile));
    return profile;
  },
  async react(kind, postId, active) {
    const profile = await this.read();
    if (!profile) throw new Error("Please sign in again.");
    const ids = new Set(profile[kind]);
    if (active) ids.add(postId);
    else ids.delete(postId);
    return this.update({ ...profile, [kind]: [...ids] });
  },
};
