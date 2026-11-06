import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import VerifiedBadge from '../../components/VerifiedBadge';
import { TableSkeleton } from '../../components/Skeleton';
import { adminService } from '../../services/adminService';

const COLORS = { pending: 'amber', approved: 'green', rejected: 'red', revoked: 'gray' };
const feeLabel = { not_required: 'No fee', pending: 'Fee unpaid', paid: 'Fee paid', failed: 'Payment failed' };
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null); // only ever link http(s)

export default function AdminVerifications() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState(null); // 'approve' | 'reject' | 'revoke'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminService.verifications({ status: status || undefined, page }).then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [status, page]);
  useEffect(load, [load]);

  useEffect(() => {
    setDetail(null);
    if (openId) adminService.verification(openId).then(setDetail).catch((e) => { toast.error(e.message); setOpenId(null); });
  }, [openId]);

  const close = () => { setOpenId(null); setMode(null); setReason(''); };
  const decide = async () => {
    const r = detail.request;
    setBusy(true);
    try {
      if (mode === 'approve') await adminService.approveVerification(r._id, reason.trim());
      if (mode === 'reject') await adminService.rejectVerification(r._id, reason.trim());
      if (mode === 'revoke') await adminService.revokeVerification(r.business._id, reason.trim());
      toast.success(mode === 'approve' ? 'Business verified.' : mode === 'reject' ? 'Request rejected.' : 'Badge removed.');
      close(); load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const r = detail?.request;
  const needsReason = mode === 'reject' || mode === 'revoke';
  const feeBlocksApproval = r && r.status === 'pending' && !['not_required', 'paid'].includes(r.payment?.status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Verification requests</h1>
        <div className="w-44"><Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option><option value="">All</option>
        </Select></div>
      </div>

      <Card className="p-5">
        {loading ? <TableSkeleton rows={5} /> : !data?.requests.length ? <p className="text-sm text-ink-500 py-6 text-center">No requests to show.</p> : (
          <div className="overflow-x-auto -mx-5"><table className="w-full text-sm">
            <thead><tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">{['Business', 'Applicant', 'Registered name', 'Fee', 'Status', 'Submitted', ''].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.requests.map((q) => (
              <tr key={q._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0">
                <td className="px-5 py-3 font-medium">{q.business?.name || '—'}</td>
                <td className="px-5 py-3"><div>{q.requestedBy?.fullName}</div><div className="text-xs text-ink-500">{q.requestedBy?.email}</div></td>
                <td className="px-5 py-3">{q.submittedInfo?.legalName || <span className="text-ink-400">—</span>}</td>
                <td className="px-5 py-3 whitespace-nowrap">{feeLabel[q.payment?.status] || '—'}</td>
                <td className="px-5 py-3"><Badge color={COLORS[q.status]}>{q.status}</Badge></td>
                <td className="px-5 py-3 whitespace-nowrap text-ink-500">{new Date(q.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="px-5 py-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setOpenId(q._id)}>Review</button></td>
              </tr>))}</tbody>
          </table></div>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
      </Card>

      <Modal open={!!openId} onClose={close} title="Verification request" size="lg">
        {!r ? <div className="py-8 flex justify-center"><LoadingSpinner size={26} /></div> : (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><p className="text-ink-500 text-xs mb-1">Business</p>
                <p className="font-medium flex items-center gap-1.5">{r.business?.name} <VerifiedBadge status={r.business?.verification?.status} /></p>
                <p className="text-ink-500">{r.business?.category}{r.business?.location?.city ? ` · ${r.business.location.city}` : ''}</p>
                <p className="text-ink-500">{r.business?.email} {r.business?.phone}</p>
                {r.business?.slug && <a className="text-brand-600 hover:underline" href={`/store/${r.business.slug}`} target="_blank" rel="noopener noreferrer">View storefront</a>}</div>
              <div><p className="text-ink-500 text-xs mb-1">Applicant</p><p className="font-medium">{r.requestedBy?.fullName}</p><p className="text-ink-500">{r.requestedBy?.email} {r.requestedBy?.phone}</p></div>
            </div>
            <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-4 space-y-1">
              <p className="text-ink-500 text-xs">Submitted information</p>
              <p><span className="text-ink-500">Registered name:</span> {r.submittedInfo?.legalName || '—'}</p>
              <p><span className="text-ink-500">Registration number:</span> {r.submittedInfo?.registrationNumber || '—'}</p>
              <p><span className="text-ink-500">Website:</span> {safeUrl(r.submittedInfo?.website) ? <a className="text-brand-600 hover:underline break-all" href={r.submittedInfo.website} target="_blank" rel="noopener noreferrer">{r.submittedInfo.website}</a> : (r.submittedInfo?.website || '—')}</p>
              {r.submittedInfo?.notes && <p className="whitespace-pre-line break-words"><span className="text-ink-500">Notes:</span> {r.submittedInfo.notes}</p>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <p><span className="text-ink-500">Status:</span> <Badge color={COLORS[r.status]}>{r.status}</Badge></p>
              <p><span className="text-ink-500">Fee:</span> {feeLabel[r.payment?.status] || '—'}{r.payment?.status === 'paid' && r.payment.reference ? ` (ref ${r.payment.reference})` : ''}</p>
            </div>
            {r.decision?.at && <p className="text-ink-500">Decision by {r.decision.by?.fullName || 'admin'} on {new Date(r.decision.at).toLocaleDateString('en-GB')}{r.decision.reason ? `: ${r.decision.reason}` : ''}</p>}

            {detail.history?.length > 0 && (
              <div><p className="text-ink-500 text-xs mb-1">History</p>
                <ul className="space-y-1">{detail.history.map((h) => <li key={h._id} className="text-xs text-ink-500">{new Date(h.createdAt).toLocaleString('en-GB')} · {h.action.replace(/_/g, ' ')} · {h.admin?.fullName || 'admin'}{h.reason ? ` · “${h.reason}”` : ''}</li>)}</ul></div>
            )}

            {mode ? (
              <div className="border-t border-ink-100 dark:border-ink-800 pt-4">
                <Textarea label={needsReason ? 'Reason (required, shown to the business and recorded in the audit log)' : 'Note (optional, recorded in the audit log)'} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2 mt-3">
                  <button className="btn-ghost" onClick={() => { setMode(null); setReason(''); }}>Back</button>
                  <button className={mode === 'approve' ? 'btn-primary' : 'btn-primary bg-red-600 hover:bg-red-700'} disabled={busy || (needsReason && reason.trim().length < 3)} onClick={decide}>
                    {busy ? 'Saving…' : mode === 'approve' ? 'Verify business' : mode === 'reject' ? 'Reject request' : 'Remove badge'}</button>
                </div>
              </div>
            ) : (
              <div className="border-t border-ink-100 dark:border-ink-800 pt-4 flex flex-wrap justify-end gap-2">
                {r.status === 'pending' && (<>
                  <button className="btn-ghost text-red-600" onClick={() => setMode('reject')}>Reject…</button>
                  <button className="btn-primary" disabled={feeBlocksApproval} title={feeBlocksApproval ? 'The verification fee has not been confirmed yet' : undefined} onClick={() => setMode('approve')}>Approve…</button>
                </>)}
                {r.status === 'approved' && r.business?.verification?.status === 'verified' && <button className="btn-ghost text-red-600" onClick={() => setMode('revoke')}>Remove badge…</button>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
