import { CollectionPage } from "@/components/account-pages";
export const metadata = { title: "Saved wallpapers" };
export default function Page() {
  return <CollectionPage kind="saved" />;
}
