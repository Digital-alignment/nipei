import React from "react";
import CompanyDetailStudio from "@/components/CompanyDetailStudio";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <CompanyDetailStudio slug={resolvedParams.slug} />;
}
