import { CollectionPage } from "@/components/account-pages";
export const metadata = { title: "Liked wallpapers" };
export default function Page() {
  return <CollectionPage kind="liked" />;
}
