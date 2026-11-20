import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, TreePine, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Field, Segmented } from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ເຂົ້າລະບົບ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ເຂົ້າລະບົບເພື່ອຈັດການຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const { login, signup, loginWithGoogle, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in (or just signed in) → go to the dashboard.
  useEffect(() => {
    if (session.ready && session.role !== "guest") navigate({ to: "/dashboard", replace: true });
  }, [session.ready, session.role, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("ອີເມວບໍ່ຖືກຕ້ອງ");
    if (password.length < 6) return setError("ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ");
    setPending(true);
    const res =
      mode === "signin"
        ? await login(email, password)
        : await signup(email, password, name || undefined);
    setPending(false);
    if (!res.ok) return setError(res.error);
    if (mode === "signup") {
      setNotice("ສະໝັກສຳເລັດ! ກະລຸນາກວດອີເມວເພື່ອຢືນຢັນບັນຊີ ແລ້ວຈຶ່ງເຂົ້າລະບົບ.");
      setMode("signin");
    } else {
      toast.success("ເຂົ້າລະບົບສຳເລັດ");
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    const res = await loginWithGoogle();
    setPending(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="page-enter w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TreePine className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold">Kwv Tij Hmoob Xyooj</h1>
          <p className="text-sm text-muted-foreground">ເຂົ້າລະບົບເພື່ອຈັດການຂໍ້ມູນຕະກູນ ແລະ ເບິ່ງການເງິນ</p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
          <Segmented<Mode>
            ariaLabel="ເຂົ້າລະບົບ ຫຼື ສະໝັກ"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            className="[&>button]:flex-1"
            options={[
              { value: "signin", label: "ເຂົ້າລະບົບ" },
              { value: "signup", label: "ສະໝັກໃໝ່" },
            ]}
          />
          {notice && (
            <p
              role="status"
              className="rounded-md bg-success-subtle px-3 py-2 text-sm text-success"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <Field label="ຊື່ສະແດງ">
                {(id) => (
                  <Input
                    id={id}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                )}
              </Field>
            )}
            <Field label="ອີເມວ" required>
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              )}
            </Field>
            <Field
              label="ລະຫັດຜ່ານ"
              required
              hint={mode === "signup" ? "ຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ" : undefined}
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              )}
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === "signin" ? "ເຂົ້າລະບົບ" : "ສະໝັກ"}
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ຫຼື <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogle}
            disabled={pending}
          >
            ເຂົ້າລະບົບດ້ວຍ Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground hover:underline">
            ສືບຕໍ່ໃນຖານະຜູ້ຢ້ຽມຊົມ (ເບິ່ງໄດ້ຢ່າງດຽວ)
          </Link>
        </p>
      </div>
    </div>
  );
}
