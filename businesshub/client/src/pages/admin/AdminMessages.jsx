import { useEffect, useState } from "react";
import { Send, Mail, Bell, Info } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/Card";
import Input from "../../components/Input";
import Select from "../../components/Select";
import Textarea from "../../components/Textarea";
import Badge from "../../components/Badge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { TableSkeleton } from "../../components/Skeleton";
import { adminService } from "../../services/adminService";

const AUDIENCES = [
  { value: "all", label: "Everyone (all active business owners)" },
  { value: "trial", label: "People on the free Pro trial" },
  { value: "free", label: "Free plan (trial finished)" },
  { value: "paid", label: "Paying customers (Starter and Pro)" },
  { value: "not_onboarded", label: "Signed up but not set up yet" },
  { value: "user", label: "One person (by email)" },
];
const audienceLabel = (m) =>
  m.audience === "user" ? m.audienceLabel : AUDIENCES.find((a) => a.value === m.audience)?.label.split(" (")[0] || m.audience;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function AdminMessages() {
  const [audience, setAudience] = useState("all");
  const [userEmail, setUserEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [viaEmail, setViaEmail] = useState(true);
  const [viaNotification, setViaNotification] = useState(true);

  const [info, setInfo] = useState(null); // { count, sample, emailConfigured, max }
  const [counting, setCounting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setMessages(await adminService.messages());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadHistory(); }, []);

  // While any message is still being delivered, refresh the history.
  useEffect(() => {
    if (!messages.some((m) => m.status === "sending")) return undefined;
    const t = setTimeout(loadHistory, 4000);
    return () => clearTimeout(t);
  }, [messages]);

  // Show how many people the chosen audience reaches before anything is sent.
  useEffect(() => {
    if (audience === "user" && !EMAIL_RE.test(userEmail.trim())) { setInfo(null); return undefined; }
    setCounting(true);
    const t = setTimeout(async () => {
      try {
        setInfo(await adminService.audienceCount({ audience, userEmail: userEmail.trim() }));
      } catch { setInfo(null); }
      finally { setCounting(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [audience, userEmail]);

  const linkOk = !link.trim() || /^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/.test(link.trim());
  const canSend = subject.trim() && body.trim() && (viaEmail || viaNotification) && info?.count > 0 && linkOk && !sending;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!linkOk) return toast.error("The link must be a page inside BusinessHub, like /dashboard/invoices.");
    if (canSend) setConfirmOpen(true);
  };

  const doSend = async () => {
    setSending(true);
    try {
      await adminService.sendMessage({
        audience, userEmail: userEmail.trim(), subject, body, link: link.trim(),
        channels: { email: viaEmail, notification: viaNotification }, confirm: true,
      });
      toast.success("Sending started. Delivery is tracked below.");
      setSubject(""); setBody(""); setLink(""); setConfirmOpen(false);
      loadHistory();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const how = [viaEmail && "email", viaNotification && "in-app notification"].filter(Boolean).join(" and ");
  const statusBadge = (m) =>
    m.status === "sending" ? <Badge color="yellow">Sending…</Badge>
      : m.status === "failed" ? <Badge color="red">Failed</Badge>
      : m.emailFailed > 0 ? <Badge color="yellow">Done, some failed</Badge>
      : <Badge color="green">Done</Badge>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 mb-6">
        Send an email, an in-app notification, or both to your customers. New customers get a welcome message automatically.
      </p>

      <form onSubmit={onSubmit}>
        <Card className="p-6 mb-6 space-y-4">
          <h3 className="font-semibold">New message</h3>

          <Select label="Send to" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </Select>
          {audience === "user" && (
            <Input label="Customer's email" type="email" placeholder="name@example.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          )}
          <p className="text-sm text-ink-600 dark:text-ink-400" aria-live="polite">
            {counting ? "Counting…" : info
              ? info.count === 0 ? "No matching active customers." : `This reaches ${info.count} ${info.count === 1 ? "person" : "people"}${info.sample?.length ? ` (${info.sample.join(", ")}${info.count > info.sample.length ? " and others" : ""})` : ""}.`
              : audience === "user" ? "Enter an email address to check the customer." : ""}
          </p>

          <Input label="Subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. A new way to send invoices" />
          <div>
            <Textarea label="Message" rows={7} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {{firstName}},\n\nWrite your message here. Leave a blank line to start a new paragraph."} />
            <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">
              Use <code>{"{{firstName}}"}</code> to greet each person by name. {body.length}/5000
            </p>
          </div>
          <Input label="Link inside BusinessHub (optional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dashboard/invoices"
            error={linkOk ? "" : "Use a page inside BusinessHub, starting with /"} />

          <div>
            <p className="label">How to send it</p>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded border-ink-300" checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} />
                <Mail size={15} /> Email
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded border-ink-300" checked={viaNotification} onChange={(e) => setViaNotification(e.target.checked)} />
                <Bell size={15} /> In-app notification
              </label>
            </div>
            {viaEmail && info && !info.emailConfigured && (
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                <Info size={15} className="mt-0.5 shrink-0" /> Email is not set up on the server yet, so emails will fail. In-app notifications will still be delivered.
              </p>
            )}
          </div>

          <button type="submit" disabled={!canSend} className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={16} /> Send message
          </button>
        </Card>
      </form>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Sent messages</h3>
        {loading ? <TableSkeleton rows={4} /> : messages.length === 0 ? (
          <p className="text-sm text-ink-600 dark:text-ink-400">Nothing sent yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-600 dark:text-ink-400 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Sent</th>
                  <th className="px-5 py-2 font-medium">Subject</th>
                  <th className="px-5 py-2 font-medium">To</th>
                  <th className="px-5 py-2 font-medium">Delivery</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0 align-top">
                    <td className="px-5 py-3 whitespace-nowrap text-ink-600 dark:text-ink-400">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 font-medium max-w-[16rem] truncate">{m.subject}</td>
                    <td className="px-5 py-3">{audienceLabel(m)} <span className="text-ink-600 dark:text-ink-400">({m.recipientCount})</span></td>
                    <td className="px-5 py-3 text-ink-600 dark:text-ink-400">
                      {m.channels?.email && <div>{m.emailSent} emailed{m.emailFailed ? `, ${m.emailFailed} failed` : ""}</div>}
                      {m.channels?.notification && <div>{m.notificationsCreated} notified</div>}
                    </td>
                    <td className="px-5 py-3">{statusBadge(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        danger={false}
        title="Send this message?"
        description={`"${subject.trim()}" will be sent by ${how} to ${info?.count ?? 0} ${info?.count === 1 ? "person" : "people"}. This cannot be undone.`}
        confirmLabel="Send now"
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
        loading={sending}
      />
    </div>
  );
}
