import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "ເຂົ້າລະບົບ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ເຂົ້າລະບົບເພື່ອຈັດການຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, signup, loginWithGoogle, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res =
      mode === "signin"
        ? await login(email, password)
        : await signup(email, password, displayName || undefined);
    setLoading(false);
    if (res.ok) {
      if (mode === "signup") {
        toast.success("ສະໝັກສຳເລັດ! ກະລຸນາກວດອີເມວເພື່ອຢືນຢັນ (ຖ້າຮ້ອງຂໍ)");
      } else {
        toast.success("ເຂົ້າລະບົບສຳເລັດ");
      }
      navigate({ to: "/dashboard" });
    } else {
      toast.error(res.error ?? "ດຳເນີນການບໍ່ສຳເລັດ");
    }
  }

  async function onGoogle() {
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (!res.ok) toast.error(res.error ?? "Google sign-in failed");
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">
            {mode === "signin" ? "ເຂົ້າລະບົບສະມາຊິກ" : "ສະໝັກສະມາຊິກໃໝ່"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">ຜູ້ຢ້ຽມຊົມສາມາດເບິ່ງຂໍ້ມູນທັງໝົດ ໂດຍບໍ່ຕ້ອງເຂົ້າລະບົບ</p>
        </CardHeader>
        <CardContent>
          {session.role !== "guest" ? (
            <div className="text-sm text-center">
              ທ່ານໄດ້ເຂົ້າລະບົບແລ້ວ ({session.email})
              <div className="mt-4">
                <Link to="/dashboard">
                  <Button className="w-full">ໄປໜ້າຫຼັກ</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">ຊື່ສະແດງ</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ຊື່ຂອງທ່ານ"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">ອີເມວ</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">ລະຫັດຜ່ານ</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {mode === "signin" ? (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      {loading ? "ກຳລັງເຂົ້າ..." : "ເຂົ້າລະບົບ"}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {loading ? "ກຳລັງສະໝັກ..." : "ສະໝັກໃໝ່"}
                    </>
                  )}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                ຫຼື
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onGoogle}
                disabled={loading}
              >
                ເຂົ້າລະບົບດ້ວຍ Google
              </Button>

              <div className="text-center pt-4 text-sm">
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    ຍັງບໍ່ມີບັນຊີ? ສະໝັກໃໝ່
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-primary hover:underline"
                  >
                    ມີບັນຊີແລ້ວ? ເຂົ້າລະບົບ
                  </button>
                )}
              </div>
              <div className="text-center pt-2">
                <Link
                  to="/dashboard"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  ສືບຕໍ່ໃນຖານະຜູ້ຢ້ຽມຊົມ
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
