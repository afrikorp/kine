import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Field } from "@/components/ui/field.js";
import { ErrorBanner } from "@/components/error-banner.js";
import { ApiError } from "@/lib/api.js";

export function SetupPage() {
  const { user, setup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      await setup(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer le compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Stethoscope className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Bienvenue sur KINE.CNAM</h1>
          <p className="text-sm text-muted-foreground">Créez le compte du cabinet (un seul praticien)</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Utilisateur" htmlFor="username">
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </Field>
          <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirmer le mot de passe" htmlFor="confirm">
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <ErrorBanner message={error} />
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le compte"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
