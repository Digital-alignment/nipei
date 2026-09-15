"use client";

import { useState } from "react";
import NipeiFlowView from "@/components/NipeiFlowView";

export default function FlowPage() {
  const [nucleus, setNucleus] = useState<"sagrado" | "comercial">("comercial");
  return <NipeiFlowView nucleus={nucleus} />;
}
