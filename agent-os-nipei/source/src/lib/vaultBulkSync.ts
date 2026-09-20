import { syncSquadToVault } from "./vaultSquadSync";
import { syncMemberToVault } from "./vaultMemberSync";
import { SquadMeta, MemberProfile } from "./nipeiStore";

export function executeBulkVaultSync(
  squadsList: SquadMeta[],
  membersList: MemberProfile[]
): { squadsSynced: number; membersSynced: number; totalFiles: number } {
  let squadsSynced = 0;
  let membersSynced = 0;

  for (const squad of squadsList) {
    const ok = syncSquadToVault(squad, undefined, membersList);
    if (ok) squadsSynced++;
  }

  for (const member of membersList) {
    const ok = syncMemberToVault(member);
    if (ok) membersSynced++;
  }

  return {
    squadsSynced,
    membersSynced,
    totalFiles: squadsSynced + membersSynced,
  };
}
