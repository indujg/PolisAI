import { PageLoading } from "@/components/polisai/page-loading";

export default function Loading() {
  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 lg:px-7">
      <div className="page-frame">
        <PageLoading />
      </div>
    </main>
  );
}
