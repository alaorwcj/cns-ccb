// src/components/ResponsiveTable.tsx
export function ResponsiveTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}