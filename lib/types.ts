export type Status = "requires_validation" | "needs_review" | "changes" | "approved";
export type Aspect = "9:16" | "16:9" | "1:1" | "4:5";

export type User = {
  id: string;
  email: string;
  name: string;
  initials: string;
  bg: string;
  fg: string;
};

export type TeamMember = { email: string; role: "admin" | "member"; created_at: string; profile?: User };

export type Brand = { id: string; name: string };

/** Nœud de l'arborescence : marque (b::id) ou campagne (c::brandId::nom) */
export type Folder = { id: string; name: string; parentId: string | null; brandId: string; campaign: string | null };

export type Version = {
  id: string;
  v: number;
  path: string;
  thumbPath: string | null;
  thumb: string | null;
  duration: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
  uploadedBy: string | null;
  note: string | null;
};

export type Asset = {
  id: string;
  title: string;
  brandId: string;
  brandName: string;
  campaign: string | null;
  folderId: string;
  duration: number;
  aspect: Aspect;
  thumb: string | null;
  status: Status;
  /** Régénération demandée : null, « pending » (en attente) ou « taken » (en cours côté n8n) */
  regenState: string | null;
  /** Vrai pendant qu'un traitement automatique tourne (sous-titrage ou régénération) : le tag affiche « En cours » */
  running: boolean;
  versions: Version[];
  reviewers: string[];
  approvedBy: string[];
  updatedAt: string;
  createdAt: string;
  createdBy: string | null;
  dueAt: string | null;
};

export type Reply = { id: string; authorId: string; text: string; createdAt: string };

export type Comment = {
  id: string;
  assetId: string;
  version: number;
  authorId: string;
  time: number | null;
  x?: number;
  y?: number;
  text: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
};
