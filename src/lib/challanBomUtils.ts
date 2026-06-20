export interface BomLike {
  _id?: string;
  fgSize: string;
  rmSize: string;
  status?: 'Active' | 'Inactive';
}

export interface ItemLike {
  _id: string;
  itemCode?: string;
  size: string;
  grade: string;
  category?: 'FG' | 'RM';
}

export function normalizeGrade(grade: string): string {
  return (grade || '').trim().toUpperCase();
}

export function itemMatchesBomSize(bomSize: string, item: ItemLike): boolean {
  if (!bomSize || !item) return false;
  return (
    String(bomSize) === String(item._id) ||
    String(bomSize).trim() === String(item.size).trim()
  );
}

export function getActiveBoms(boms: BomLike[]): BomLike[] {
  return boms.filter((b) => b.status === 'Active' || !b.status);
}

export function getBomsForFgItem(boms: BomLike[], fgItem: ItemLike): BomLike[] {
  return getActiveBoms(boms).filter((b) => itemMatchesBomSize(b.fgSize, fgItem));
}

export function getBomsForRmItem(boms: BomLike[], rmItem: ItemLike): BomLike[] {
  return getActiveBoms(boms).filter((b) => itemMatchesBomSize(b.rmSize, rmItem));
}

export function getAllowedRmItemsForFg(
  boms: BomLike[],
  fgItems: ItemLike[],
  rmItems: ItemLike[],
  fgItemId: string
): ItemLike[] {
  const fgItem = fgItems.find((i) => String(i._id) === String(fgItemId));
  if (!fgItem) return [];

  const matchingBoms = getBomsForFgItem(boms, fgItem);
  if (matchingBoms.length === 0) return [];

  const fgGrade = normalizeGrade(fgItem.grade);
  return rmItems.filter((rm) => {
    const gradeMatch = normalizeGrade(rm.grade) === fgGrade;
    const bomMatch = matchingBoms.some((b) => itemMatchesBomSize(b.rmSize, rm));
    return gradeMatch && bomMatch;
  });
}

export function getAllowedFgItemsForRm(
  boms: BomLike[],
  fgItems: ItemLike[],
  rmItems: ItemLike[],
  rmItemId: string
): ItemLike[] {
  const rmItem = rmItems.find((i) => String(i._id) === String(rmItemId));
  if (!rmItem) return [];

  const matchingBoms = getBomsForRmItem(boms, rmItem);
  if (matchingBoms.length === 0) return [];

  const rmGrade = normalizeGrade(rmItem.grade);
  return fgItems.filter((fg) => {
    const gradeMatch = normalizeGrade(fg.grade) === rmGrade;
    const bomMatch = matchingBoms.some((b) => itemMatchesBomSize(b.fgSize, fg));
    return gradeMatch && bomMatch;
  });
}

export function isValidFgRmPair(
  boms: BomLike[],
  fgItems: ItemLike[],
  rmItems: ItemLike[],
  fgItemId: string,
  rmItemId: string
): { valid: boolean; error?: string } {
  const fgItem = fgItems.find((i) => String(i._id) === String(fgItemId));
  const rmItem = rmItems.find((i) => String(i._id) === String(rmItemId));

  if (!fgItem) return { valid: false, error: 'Invalid finish size (FG) item' };
  if (!rmItem) return { valid: false, error: 'Invalid original size (RM) item' };

  if (normalizeGrade(fgItem.grade) !== normalizeGrade(rmItem.grade)) {
    return {
      valid: false,
      error: `FG Grade (${fgItem.grade}) and RM Grade (${rmItem.grade}) must match`,
    };
  }

  const matchingBoms = getBomsForFgItem(boms, fgItem);
  const hasBomMapping = matchingBoms.some((b) => itemMatchesBomSize(b.rmSize, rmItem));
  if (!hasBomMapping) {
    return {
      valid: false,
      error: `No BOM mapping for FG ${fgItem.size} (${fgItem.grade}) with RM ${rmItem.size}`,
    };
  }

  return { valid: true };
}

export function pickDefaultRmForFg(
  boms: BomLike[],
  fgItems: ItemLike[],
  rmItems: ItemLike[],
  fgItemId: string
): ItemLike | null {
  const allowed = getAllowedRmItemsForFg(boms, fgItems, rmItems, fgItemId);
  if (allowed.length === 0) return null;
  if (allowed.length === 1) return allowed[0];

  const fgItem = fgItems.find((i) => String(i._id) === String(fgItemId));
  if (!fgItem) return allowed[0];

  const matchingBoms = getBomsForFgItem(boms, fgItem);
  for (const bom of matchingBoms) {
    const rm = allowed.find((r) => itemMatchesBomSize(bom.rmSize, r));
    if (rm) return rm;
  }
  return allowed[0];
}

export function pickDefaultFgForRm(
  boms: BomLike[],
  fgItems: ItemLike[],
  rmItems: ItemLike[],
  rmItemId: string
): ItemLike | null {
  const allowed = getAllowedFgItemsForRm(boms, fgItems, rmItems, rmItemId);
  if (allowed.length === 0) return null;
  if (allowed.length === 1) return allowed[0];

  const rmItem = rmItems.find((i) => String(i._id) === String(rmItemId));
  if (!rmItem) return allowed[0];

  const matchingBoms = getBomsForRmItem(boms, rmItem);
  for (const bom of matchingBoms) {
    const fg = allowed.find((f) => itemMatchesBomSize(bom.fgSize, f));
    if (fg) return fg;
  }
  return allowed[0];
}

export interface CoilEntryLike {
  coilNumber?: string;
  coilWeight?: number;
}

/** Only coils with a number and positive weight count toward quantity (matches print COIL column). */
export function getCoilTotalFromEntries(
  coilEntries: CoilEntryLike[] | undefined | null
): number {
  if (!coilEntries?.length) return 0;
  return coilEntries.reduce((sum, entry) => {
    const weight = entry.coilWeight || 0;
    if (weight <= 0) return sum;
    if (!String(entry.coilNumber || '').trim()) return sum;
    return sum + weight;
  }, 0);
}

/** Weight entered without a coil number — excluded from print but was inflating stored quantity. */
export function getOrphanCoilWeight(
  coilEntries: CoilEntryLike[] | undefined | null
): number {
  if (!coilEntries?.length) return 0;
  return coilEntries.reduce((sum, entry) => {
    const weight = entry.coilWeight || 0;
    if (weight <= 0) return sum;
    if (String(entry.coilNumber || '').trim()) return sum;
    return sum + weight;
  }, 0);
}

export function normalizeChallanItemFromCoils<
  T extends {
    coilEntries?: CoilEntryLike[];
    quantity?: number;
    rate?: number;
    itemTotal?: number;
  },
>(item: T): T {
  const hasCoilEntries = Boolean(item.coilEntries?.length);
  const quantity = hasCoilEntries
    ? getCoilTotalFromEntries(item.coilEntries)
    : item.quantity || 0;
  const rate = item.rate || 0;
  return {
    ...item,
    quantity,
    itemTotal: quantity * rate,
  };
}
