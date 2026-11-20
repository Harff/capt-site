/**
 * Style de sous-titres d'un nouveau client.
 * Le formulaire de l'import produit un objet simple (CaptionChoices) ; buildCaptionStyle() le transforme
 * en style complet, au même format que la table « Clients » du robot de sous-titrage (n8n le recopie tel quel).
 */

export type FontKey = "inter-medium" | "inter-bold" | "inter-tight-black" | "montserrat-medium" | "circular-bold" | "halyard-medium";
export type Position = "haut" | "milieu" | "bas";
export type AnimationKey = "mot_a_mot" | "bloc";

export type CaptionChoices = {
  font: FontKey;
  textColor: string;
  keywords: boolean;
  keywordColor: string;
  position: Position;
  animation: AnimationKey;
  shadow: boolean;
};

export const DEFAULT_CHOICES: CaptionChoices = {
  font: "inter-bold",
  textColor: "#FFFFFF",
  keywords: true,
  keywordColor: "#3070C8",
  position: "bas",
  animation: "bloc",
  shadow: true,
};

type FontDef = { label: string; famille: string; graisse: string; fichier: string; nom_ass: string; fallback: string; fichier_fallback: string; css: string; weight: number };

// Uniquement les polices présentes dans le dossier fonts/ du robot.
export const FONTS: Record<FontKey, FontDef> = {
  "inter-medium": { label: "Inter Medium (sobre)", famille: "Inter", graisse: "Medium", fichier: "fonts/Inter-Medium.otf", nom_ass: "Inter Medium", fallback: "Inter Medium", fichier_fallback: "fonts/Inter-Medium.otf", css: "Inter, system-ui, sans-serif", weight: 500 },
  "inter-bold": { label: "Inter Bold (lisible)", famille: "Inter", graisse: "Bold", fichier: "fonts/Inter-Bold.otf", nom_ass: "Inter Bold", fallback: "Inter Bold", fichier_fallback: "fonts/Inter-Bold.otf", css: "Inter, system-ui, sans-serif", weight: 700 },
  "inter-tight-black": { label: "Inter Tight Black (très gras)", famille: "Inter Tight", graisse: "Black", fichier: "fonts/InterTight-Black.otf", nom_ass: "Inter Tight Black", fallback: "Inter Black", fichier_fallback: "fonts/Inter-Black.otf", css: "'Inter Tight', Inter, system-ui, sans-serif", weight: 900 },
  "montserrat-medium": { label: "Montserrat Medium (arrondie)", famille: "Montserrat", graisse: "Medium", fichier: "fonts/Montserrat-Medium.otf", nom_ass: "Montserrat Medium", fallback: "Inter Medium", fichier_fallback: "fonts/Inter-Medium.otf", css: "Montserrat, system-ui, sans-serif", weight: 500 },
  "circular-bold": { label: "Circular Std Bold (moderne)", famille: "Circular Std", graisse: "Bold", fichier: "fonts/CircularStd-Bold.otf", nom_ass: "Circular Std Bold", fallback: "Inter Bold", fichier_fallback: "fonts/Inter-Bold.otf", css: "'Circular Std', Inter, system-ui, sans-serif", weight: 700 },
  "halyard-medium": { label: "Halyard Display Medium (élégante)", famille: "Halyard Display", graisse: "Medium", fichier: "fonts/HalyardDisplay-Medium.otf", nom_ass: "Halyard Display Medium", fallback: "Inter Medium", fichier_fallback: "fonts/Inter-Medium.otf", css: "'Halyard Display', Inter, system-ui, sans-serif", weight: 500 },
};

export const POSITIONS: Record<Position, { label: string; y: number }> = {
  haut: { label: "Haut", y: 480 },
  milieu: { label: "Milieu", y: 960 },
  bas: { label: "Bas", y: 1400 },
};

export const ANIMATIONS: Record<AnimationKey, { label: string; hint: string }> = {
  bloc: { label: "Bloc entier", hint: "Toute la phrase apparaît d'un coup" },
  mot_a_mot: { label: "Mot à mot", hint: "Les mots apparaissent au fil de la parole" },
};

export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Ex. « Ma Marque » → « mamarque » (sert de code client). */
export function slug(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function buildCaptionStyle(name: string, c: CaptionChoices) {
  const f = FONTS[c.font];
  const text = isHex(c.textColor) ? c.textColor.toUpperCase() : "#FFFFFF";
  const key = isHex(c.keywordColor) ? c.keywordColor.toUpperCase() : "#3070C8";
  const wordByWord = c.animation === "mot_a_mot";
  return {
    code: slug(name).toUpperCase() || "CLIENT",
    client: name.trim(),
    genre: "corporate",
    version: "1.0",
    format: "mobile_9_16",
    resolution: [1080, 1920],
    mesure_exacte: true,
    genres_autorises: ["corporate", "impact", "karaoke"],
    police: {
      famille: f.famille,
      fichier: f.fichier,
      graisse: f.graisse,
      nom_ass: f.nom_ass,
      fallback: f.fallback,
      fichier_fallback: f.fichier_fallback,
      taille_px: 64,
      casse: "phrase",
    },
    couleurs: {
      texte: text,
      texte_inactif: text,
      mot_cle_accent: key,
      mot_cle_principal: text,
      mot_cle_secondaire: text,
    },
    mots_cles: { actif: c.keywords, echelle: 1.3, frequence: "environ 1 bloc sur 3", max_par_bloc: 1 },
    ombre: { active: c.shadow, couleur: "#000000", flou_px: 4, opacite: 0.6, decalage_px: 2 },
    contour: null,
    contenu: { emojis: false, ponctuation: true, chiffres_en_chiffres: true, espace_insecable_avant: "?!:;" },
    animation: wordByWord ? { mode: "progressive", duree_fade_ms: 100 } : { mode: "bloc_entier", duree_fade_ms: 80 },
    impact: { echelle: 1.3, effets_defaut: ["agrandi"], effets_autorises: ["gras", "agrandi", "capitales"] },
    zone_sure: { bas_px: 420, haut_px: 250, cotes_px: 120 },
    mise_en_page: {
      interligne: 1.05,
      lignes_max: 2,
      centre_x_px: 540,
      largeur_max_px: 840,
      centre_bloc_y_px: POSITIONS[c.position].y,
      mots_max_par_bloc: 6,
    },
  };
}

/** Courte fiche de consignes pour l'agent (colonne skill_md de la table Clients). */
export function buildSkillMd(name: string, c: CaptionChoices) {
  const f = FONTS[c.font];
  return [
    `# Sous-titres ${name.trim()}`,
    "",
    `Style créé depuis la plateforme à l'import. Les réglages chiffrés sont dans Supabase (clients.style).`,
    "",
    `- Police ${f.famille} ${f.graisse}, texte ${c.textColor.toUpperCase()}, casse de phrase, aucun emoji.`,
    `- Position : ${POSITIONS[c.position].label.toLowerCase()} de l'écran, 2 lignes maximum, blocs de 6 mots maximum coupés aux pauses naturelles.`,
    `- Animation : ${wordByWord(c) ? "mot à mot" : "bloc entier"}.`,
    c.keywords ? `- Mots-clés : 1 mot par bloc au plus, environ 1 bloc sur 3, en ${c.keywordColor.toUpperCase()} et légèrement agrandis.` : "- Aucun mot mis en avant.",
    "- Ne reformule jamais ce qui est dit ; retire seulement les hésitations (euh, hum).",
    "",
    "## Genres (impact, karaoké, corporate)",
    "",
    "Ce style accepte les trois genres, en petite quantité et seulement quand le moment s'y prête : impact pour une accroche ou une chute de 5 mots au plus ; karaoké pour un passage rythmé de 2 à 4 sous-titres ; corporate pour une information posée. Au plus 1 sous-titre sur 4 hors du style de base.",
    "",
  ].join("\n");
}

const wordByWord = (c: CaptionChoices) => c.animation === "mot_a_mot";
