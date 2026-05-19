import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function InviteAccept() {
  const { token } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data } = await supabase.from("team_invites").select("*").eq("token", token).maybeSingle();
      setInvite(data);
      setLoading(false);
    })();
  }, [token]);

  const accept = async () => {
    if (!user || !invite) return;
    if ((user.email || "").toLowerCase() !== invite.email.toLowerCase()) {
      return toast.error(`Faça login com o email ${invite.email} para aceitar.`);
    }
    setAccepting(true);
    const { error } = await supabase.from("team_members").upsert({
      owner_user_id: invite.owner_user_id, member_user_id: user.id,
      email: invite.email, role: invite.role, permissions: invite.permissions,
      status: "active", invited_by: invite.created_by,
    }, { onConflict: "owner_user_id,member_user_id" });
    if (error) { setAccepting(false); return toast.error(error.message); }
    await supabase.from("team_invites").update({ status: "accepted" }).eq("id", invite.id);
    toast.success("Convite aceito! Bem-vindo à equipe.");
    nav("/app");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass border-0 rounded-3xl p-8 text-center">
        <Logo size="sm" />
        {!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date() ? (
          <>
            <h1 className="text-2xl font-bold mt-6 mb-3">Convite indisponível</h1>
            <p className="text-muted-foreground mb-6">Este convite é inválido, expirou ou já foi usado.</p>
            <Link to="/"><Button variant="outline" className="w-full">Voltar</Button></Link>
          </>
        ) : !user ? (
          <>
            <h1 className="text-2xl font-bold mt-6 mb-3">Você foi convidado!</h1>
            <p className="text-muted-foreground mb-6">Faça login ou crie sua conta com <strong>{invite.email}</strong> para aceitar.</p>
            <Link to={`/auth?email=${encodeURIComponent(invite.email)}`}><Button className="w-full">Continuar</Button></Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mt-6 mb-3">Aceitar convite</h1>
            <p className="text-muted-foreground mb-6">Você foi convidado como <strong>{invite.role}</strong>.</p>
            <Button className="w-full" onClick={accept} disabled={accepting}>{accepting ? "Aceitando..." : "Aceitar e entrar"}</Button>
          </>
        )}
      </Card>
    </div>
  );
}
