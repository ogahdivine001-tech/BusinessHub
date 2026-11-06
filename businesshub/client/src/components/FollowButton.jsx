import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { engageService } from '../services/engageService';

// Follow / unfollow. The count shown always comes back from the server, which
// recounts from the real follow records.
export default function FollowButton({ business, onCount }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOwn = user && String(user.business) === String(business._id);

  useEffect(() => {
    if (!user || isOwn) return undefined;
    let cancelled = false;
    engageService.followStatus(business._id).then((d) => { if (!cancelled) setFollowing(d.following); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user, isOwn, business._id]);

  if (isOwn) return null; // you cannot follow your own business
  if (!user) return <Link to="/register?type=buyer" className="btn-secondary" title="Log in or create a free customer account"><Heart size={16} /> Follow</Link>;

  const toggle = async () => {
    setBusy(true);
    try {
      const d = following ? await engageService.unfollow(business._id) : await engageService.follow(business._id);
      setFollowing(d.following);
      onCount?.(d.followerCount);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={following} className={following ? 'btn-secondary' : 'btn-primary'}>
      <Heart size={16} className={following ? 'fill-current text-red-500' : ''} /> {following ? 'Following' : 'Follow'}
    </button>
  );
}
