import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Logo from "../components/Logo";
import Input from "../components/Input";
import Select from "../components/Select";
import Textarea from "../components/Textarea";
import { useAuth } from "../context/AuthContext";
import { businessService } from "../services/businessService";

const CATEGORIES = [
  "Fashion",
  "Electronics",
  "Food",
  "Beauty",
  "Real Estate",
  "Education",
  "Technology",
  "Graphics & Design",
  "Website Development",
  "Health & Fitness",
  "Services",
  "Other",
];
const THEMES = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold", pro: true },
];

const STEPS = [
  "Business name",
  "Category",
  "Description",
  "Contact",
  "Location",
  "Style",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    phone: "",
    whatsapp: "",
    location: { city: "", state: "" },
    theme: "classic",
  });

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const canProceed = () => {
    switch (step) {
      case 0:
        return form.name.trim().length > 1;
      case 1:
        return !!form.category;
      case 2:
        return true;
      case 3:
        return form.phone.trim().length > 4;
      case 4:
        return form.location.city.trim().length > 1;
      default:
        return true;
    }
  };

  const finish = async () => {
    setLoading(true);
    try {
      const business = await businessService.create(form);
      setUser((u) => ({
        ...u,
        business: business._id,
        onboardingComplete: true,
      }));
      setDone(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Your BusinessHub is ready.</h1>
          <p className="text-gray-500 mt-2">
            {form.name} is live. Let's start adding products and growing your
            business.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary w-full mt-8"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="px-6 py-5">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-800"}`}
              />
            ))}
          </div>

          <div className="card p-7 min-h-[380px] flex flex-col">
            <p className="text-xs font-medium text-brand-600 uppercase tracking-wide mb-1">
              Step {step + 1} of {STEPS.length}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {step === 0 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      What's your business called?
                    </h2>
                    <Input
                      autoFocus
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="e.g. Divine Fashion"
                    />
                  </>
                )}
                {step === 1 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      What category best fits your business?
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => update({ category: c })}
                          className={`text-sm px-3 py-2.5 rounded-xl border text-left transition-colors ${
                            form.category === c
                              ? "bg-brand-600 text-white border-brand-600"
                              : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      Describe your business
                    </h2>
                    <Textarea
                      rows={5}
                      value={form.description}
                      onChange={(e) => update({ description: e.target.value })}
                      placeholder="Tell customers what you do best..."
                    />
                  </>
                )}
                {step === 3 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      How can customers reach you?
                    </h2>
                    <div className="space-y-4">
                      <Input
                        label="Phone number"
                        value={form.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                        placeholder="08012345678"
                      />
                      <Input
                        label="WhatsApp number"
                        value={form.whatsapp}
                        onChange={(e) => update({ whatsapp: e.target.value })}
                        placeholder="08012345678"
                      />
                    </div>
                  </>
                )}
                {step === 4 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      Where are you located?
                    </h2>
                    <div className="space-y-4">
                      <Input
                        label="City"
                        value={form.location.city}
                        onChange={(e) =>
                          update({
                            location: {
                              ...form.location,
                              city: e.target.value,
                            },
                          })
                        }
                        placeholder="Lagos"
                      />
                      <Input
                        label="State"
                        value={form.location.state}
                        onChange={(e) =>
                          update({
                            location: {
                              ...form.location,
                              state: e.target.value,
                            },
                          })
                        }
                        placeholder="Lagos"
                      />
                    </div>
                  </>
                )}
                {step === 5 && (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      Choose a business page style
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      {THEMES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => update({ theme: t.value })}
                          className={`p-4 rounded-xl border text-left transition-colors ${
                            form.theme === t.value
                              ? "border-brand-600 ring-2 ring-brand-100 dark:ring-brand-900/40"
                              : "border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <div className="h-10 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 mb-2" />
                          <p className="text-sm font-medium">{t.label}</p>
                          {t.pro && (
                            <p className="text-[10px] text-brand-600 mt-0.5">
                              Included in your 30-day trial
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="btn-primary flex-1"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={finish}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  <Sparkles size={16} />{" "}
                  {loading ? "Setting up…" : "Finish setup"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
