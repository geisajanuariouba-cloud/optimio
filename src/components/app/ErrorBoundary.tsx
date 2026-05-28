import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[ErrorBoundary]", error); }
  reset = () => { this.setState({ error: null }); };
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Algo deu errado nesta tela</h2>
              <p className="text-sm text-muted-foreground mt-1">Seus dados foram preservados. Tente recarregar — se o problema continuar, fale com o suporte.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.reset} className="rounded-2xl">Tentar de novo</Button>
              <Button onClick={() => window.location.reload()} className="rounded-2xl">Recarregar</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
