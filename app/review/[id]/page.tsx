"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/Common";
import { ReviewScreen } from "@/components/review/ReviewScreen";
import { useStore } from "@/lib/store";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { getAsset, loading } = useStore();
  const asset = getAsset(id);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!asset || asset.versions.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-canvas text-center">
        <p className="text-[18px] font-extrabold text-ink">{asset ? "Vidéo en cours de traitement" : "Vidéo introuvable"}</p>
        <p className="text-[13px] text-ink-muted">{asset ? "Revenez dans quelques instants." : "Elle a peut-être été supprimée."}</p>
        <Link href="/projects" className="mt-2 h-10 rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-black">
          Retour aux projets
        </Link>
      </div>
    );
  }
  return <ReviewScreen key={asset.id} asset={asset} />;
}
