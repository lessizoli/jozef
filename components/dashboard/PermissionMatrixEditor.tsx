import { useI18n } from '@/lib/i18n';
import { permissionLabels, type PermissionKey, type PermissionMatrix } from '@/lib/permissionService';
import { roleLabels, type MemberRole } from '@/lib/teamService';

const roles = Object.keys(roleLabels) as MemberRole[];
const permissions = Object.keys(permissionLabels) as PermissionKey[];

export default function PermissionMatrixEditor({ matrix, canManage, saving, onChange, onSave }: {
  matrix: PermissionMatrix;
  canManage: boolean;
  saving: boolean;
  onChange: (matrix: PermissionMatrix) => void;
  onSave: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">{t('Jogosultsági tábla')}</h2>
      <p className="mt-1 text-sm text-slate-400">{t('A céges szerepkörök engedélyei. A céges admin teljes hozzáférése biztonsági okból nem kapcsolható ki.')}</p>
      <table className="mt-5 min-w-full text-sm">
        <thead><tr><th className="p-2 text-left text-slate-500">{t('Jogosultság')}</th>{roles.map((role) => <th key={role} className="p-2 text-center text-slate-400">{t(roleLabels[role])}</th>)}</tr></thead>
        <tbody>{permissions.map((permission) => (
          <tr key={permission} className="border-t border-slate-800">
            <td className="p-3 font-medium">{t(permissionLabels[permission])}</td>
            {roles.map((role) => <td key={role} className="p-3 text-center"><input type="checkbox" disabled={!canManage || role === 'company_admin'} checked={matrix[role][permission]} onChange={(event) => onChange({ ...matrix, [role]: { ...matrix[role], [permission]: event.target.checked } })} /></td>)}
          </tr>
        ))}</tbody>
      </table>
      {canManage && <button disabled={saving} onClick={onSave} className="mt-5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">{t('Jogosultságok mentése')}</button>}
    </section>
  );
}
