import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RootSeedPrompt() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>No root folder</CardTitle>
          <CardDescription>
            Run migrations, then seed the <code className="font-mono text-xs">root</code> directory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            yarn db:migrate{"\n"}yarn db:seed
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
