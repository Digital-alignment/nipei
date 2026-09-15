"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import ApolloView from "@/components/ApolloView";

export default function ApolloRedirectPage() {
  useEffect(() => {
    redirect("/venu");
  }, []);

  return <ApolloView />;
}
