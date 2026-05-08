import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Industry {
  id: number;
  name: string;
}

export function useIndustries() {
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPublic<Industry[]>("/industries/")
      .then((data) => setIndustries(data.map((i) => i.name)))
      .catch(() => setIndustries([]))
      .finally(() => setLoading(false));
  }, []);

  return { industries, loading };
}
