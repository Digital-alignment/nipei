import { NextResponse } from "next/server";
import fs from "fs/promises";
import existsSync from "fs";
import path from "path";
import { Company } from "@/types/company";
import { INITIAL_COMPANIES } from "@/data/companies";

const COMPANIES_STORE_PATH = path.resolve(process.cwd(), "src/data/companies.json");

async function loadCompaniesFromDisk(): Promise<Company[]> {
  try {
    if (existsSync.existsSync(COMPANIES_STORE_PATH)) {
      const data = await fs.readFile(COMPANIES_STORE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading companies.json:", err);
  }
  return INITIAL_COMPANIES;
}

async function saveCompaniesToDisk(companies: Company[]) {
  await fs.writeFile(COMPANIES_STORE_PATH, JSON.stringify(companies, null, 2), "utf-8");
}

export async function GET() {
  const companies = await loadCompaniesFromDisk();
  return NextResponse.json({ success: true, companies });
}

export async function POST(request: Request) {
  try {
    const body: Partial<Company> = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    const slug = body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const category = body.category || "client";
    const vaultSubfolder = category === "client" ? "Clientes" : "Productos";
    const vaultRelativePath = `${vaultSubfolder}/${body.name}.md`;

    const newCompany: Company = {
      id: slug,
      name: body.name,
      category: category,
      status: "active",
      description: body.description || "",
      location: body.location || "",
      websites: body.websites || [],
      socialMedia: body.socialMedia || {},
      goals: body.goals || [],
      peopleInvolved: body.peopleInvolved || [],
      assignedSquads: body.assignedSquads || [],
      assignedAgents: body.assignedAgents || ["hermes"],
      vaultPath: vaultRelativePath,
      accentColor: body.accentColor || "#22c55e",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const companies = await loadCompaniesFromDisk();
    const existingIndex = companies.findIndex((c) => c.id === slug);
    if (existingIndex >= 0) {
      companies[existingIndex] = newCompany;
    } else {
      companies.push(newCompany);
    }

    await saveCompaniesToDisk(companies);

    // Auto-generate Vault Note in nipei-vault
    try {
      const possibleVaultDirs = [
        path.resolve(process.cwd(), "../../../nipei-vault"),
        "C:\\Users\\ondig\\Code\\DA\\nipei-vault",
      ];
      const vaultBase = possibleVaultDirs.find((d) => existsSync.existsSync(d));

      if (vaultBase) {
        const fullVaultPath = path.join(vaultBase, vaultSubfolder, `${body.name}.md`);
        
        const vaultNoteContent = `---
name: "${newCompany.name}"
type: "${newCompany.category}"
status: "${newCompany.status}"
created: "${newCompany.createdAt}"
updated: "${newCompany.updatedAt}"
---
<!-- agente: antigravity -->

# ${newCompany.name} — Business & Operational State

## 📌 Contexto & Descripción
${newCompany.description || "Nueva empresa registrada en Nipëi OS."}

- **Ubicación**: ${newCompany.location || "N/A"}
- **Categoría**: ${newCompany.category === "client" ? "Empresa Cliente Externa" : "Producto Propio Digital Alignment"}
- **Sitios Web**: ${(newCompany.websites || []).join(", ") || "N/A"}
- **Redes Sociales**: ${JSON.stringify(newCompany.socialMedia)}

---

## 🎯 Objetivos Estratégicos
${(newCompany.goals || []).map((g) => `- ${g}`).join("\n") || "- Sin objetivos iniciales definidos."}

---

## 👥 Personas Involucradas & Equipo
${(newCompany.peopleInvolved || []).map((p) => `- **${p.name}** (${p.role}) — \`${p.type}\``).join("\n") || "- Sin contactos asignados."}

---

## 🤖 Squads & Agentes Asignados
- **Squads**: ${(newCompany.assignedSquads || []).join(", ") || "N/A"}
- **Agentes IA**: ${(newCompany.assignedAgents || []).join(", ") || "N/A"}
`;

        await fs.mkdir(path.dirname(fullVaultPath), { recursive: true });
        await fs.writeFile(fullVaultPath, vaultNoteContent, "utf-8");
      }
    } catch (vaultErr) {
      console.error("Failed to auto-write Vault note:", vaultErr);
    }

    return NextResponse.json({ success: true, company: newCompany });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create company" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const companies = await loadCompaniesFromDisk();
    const index = companies.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    companies[index] = {
      ...companies[index],
      ...updates,
      ...(status ? { status } : {}),
      updatedAt: new Date().toISOString(),
    };

    await saveCompaniesToDisk(companies);
    return NextResponse.json({ success: true, company: companies[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update company" }, { status: 500 });
  }
}
