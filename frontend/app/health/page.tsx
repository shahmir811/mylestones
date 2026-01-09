export default function Health() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="text-center">
        <pre className="text-lg font-mono">
          {JSON.stringify({ status: "ok" }, null, 2)}
        </pre>
      </main>
    </div>
  );
}

