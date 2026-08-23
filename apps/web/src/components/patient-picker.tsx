import { useEffect, useRef, useState } from "react";
import { patientsApi } from "@/lib/api.js";
import type { Patient } from "@/lib/types.js";
import { Input } from "@/components/ui/input.js";

export function PatientPicker({
  selected,
  onSelect,
}: {
  selected: Patient | null;
  onSelect: (patient: Patient) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      patientsApi.list(q).then(setResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
        <span>
          {selected.nom} {selected.prenom} — {selected.numeroAssureRacine}/{selected.numeroAssureCle}
        </span>
        <button
          type="button"
          className="text-xs text-primary underline-offset-4 hover:underline"
          onClick={() => onSelect(null as unknown as Patient)}
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Rechercher un patient par nom..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-md">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setQ("");
              }}
            >
              {p.nom} {p.prenom} — {p.numeroAssureRacine}/{p.numeroAssureCle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
