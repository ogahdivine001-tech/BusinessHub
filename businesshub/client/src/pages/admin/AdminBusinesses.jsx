import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import { TableSkeleton } from "../../components/Skeleton";
import Modal from "../../components/Modal";
import Textarea from "../../components/Textarea";
import VerifiedBadge from "../../components/VerifiedBadge";
import { adminService } from "../../services/adminService";

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [badgeTarget, setBadgeTarget] = useState(null); // business being verified / un-verified
  const [badgeReason, setBadgeReason] = useState("");
  const [badgeBusy, setBadgeBusy] = useState(false);

  const applyBadge = async () => {
    const verified = badgeTarget.verification?.status === "verified";
    setBadgeBusy(true);
    try {
      if (verified) await adminService.revokeVerification(badgeTarget._id, badgeReason.trim());
      else await adminService.grantVerification(badgeTarget._id, badgeReason.trim());
      toast.success(verified ? "Badge removed." : "Business verified.");
      setBadgeTarget(null); setBadgeReason("");
      load();
    } catch (err) { toast.error(err.message); } finally { setBadgeBusy(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { businesses: b } = await adminService.businesses({ search });
      setBusinesses(b);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePublished = async (b) => {
    try {
      await adminService.setBusinessPublished(b._id, !b.isPublished);
      toast.success(
        b.isPublished ? "Business unpublished." : "Business published.",
      );
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const changePlan = async (b, plan) => {
    if (plan === b.plan) return;
    try {
      await adminService.setBusinessPlan(b._id, plan);
      toast.success(
        `${b.name} set to ${plan}. Use this for manually-confirmed payments (e.g. bank transfer) while Paystack isn't live yet.`,
      );
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Businesses</h1>
      <div className="mb-4 relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <input
          className="input pl-9"
          placeholder="Search businesses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Business</th>
                  <th className="px-5 py-2 font-medium">Owner</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Plan</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Badge</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr
                    key={b._id}
                    className="border-b border-ink-50 dark:border-ink-800/50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">{b.name}</td>
                    <td className="px-5 py-3 text-ink-500">{b.owner?.email}</td>
                    <td className="px-5 py-3">{b.category}</td>
                    <td className="px-5 py-3">
                      <select
                        value={b.plan}
                        onChange={(e) => changePlan(b, e.target.value)}
                        className={`text-xs font-medium rounded-lg border-0 py-1 pl-2 pr-6 focus:ring-1 focus:ring-brand-500 ${
                          b.plan === "pro"
                            ? "bg-brand-50 text-brand-700"
                            : b.plan === "starter"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-ink-100 text-ink-600"
                        }`}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={b.isPublished ? "green" : "gray"}>
                        {b.isPublished ? "Published" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {b.verification?.status === "verified" ? <span className="inline-flex items-center gap-1 text-brand-600"><VerifiedBadge status="verified" /> Verified</span> : <span className="text-ink-400">{b.verification?.status === "pending" ? "Pending" : "None"}</span>}
                      {" "}<button onClick={() => { setBadgeTarget(b); setBadgeReason(""); }} className="text-xs text-brand-600 hover:underline ml-1">{b.verification?.status === "verified" ? "Remove" : "Verify"}</button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => togglePublished(b)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        {b.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!badgeTarget} onClose={() => setBadgeTarget(null)} title={badgeTarget?.verification?.status === "verified" ? "Remove verification badge" : "Verify this business"} size="sm">
        <p className="text-sm text-ink-500 mb-3">
          {badgeTarget?.verification?.status === "verified"
            ? `${badgeTarget?.name} will lose its badge and the owner will be told why.`
            : `${badgeTarget?.name} will show the verified badge. For a business that has applied, approve its request from the Verification page instead.`}
        </p>
        <Textarea label="Reason (required, recorded in the audit log)" rows={3} maxLength={500} value={badgeReason} onChange={(e) => setBadgeReason(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-ghost" onClick={() => setBadgeTarget(null)}>Cancel</button>
          <button className="btn-primary" disabled={badgeBusy || badgeReason.trim().length < 3} onClick={applyBadge}>{badgeBusy ? "Saving…" : badgeTarget?.verification?.status === "verified" ? "Remove badge" : "Verify business"}</button>
        </div>
      </Modal>
    </div>
  );
}
