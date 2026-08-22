export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <p>© {year} Gergő Komáromi. All rights reserved.</p>
      <p className="mt-1">Created and developed by Gergő Komáromi</p>
    </footer>
  );
}
