import { Suspense } from "react";
import { Explore } from "@/components/explore";
import Loading from "../loading";
export const metadata = { title: "Explore wallpapers" };
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Explore />
    </Suspense>
  );
}
