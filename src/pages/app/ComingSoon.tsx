import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ComingSoon() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="premium-card p-10 max-w-md text-center rounded-3xl">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-5">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Em breve</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este módulo está em desenvolvimento e ficará disponível para a sua empresa em breve.
          Avisaremos você assim que ele for liberado.
        </p>
        <Link to="/app">
          <Button variant="outline" className="rounded-2xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
