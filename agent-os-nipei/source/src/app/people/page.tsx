"use client";

import { useState } from "react";
import NipeiPeopleView from "@/components/NipeiPeopleView";

export default function PeoplePage() {
  const [nucleus, setNucleus] = useState<"sagrado" | "comercial">("comercial");
  return <NipeiPeopleView nucleus={nucleus} />;
}
