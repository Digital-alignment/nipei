"use client";

import { useState } from "react";
import NipeiBrainView from "@/components/NipeiBrainView";

export default function BrainPage() {
  const [nucleus, setNucleus] = useState<"sagrado" | "comercial">("comercial");
  return <NipeiBrainView nucleus={nucleus} />;
}
