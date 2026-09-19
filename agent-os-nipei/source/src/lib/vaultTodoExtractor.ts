import { getAllIndexedDocuments } from "./vaultIndex";
import { readNote, writeNote } from "./vault";

export interface VaultTodoItem {
  id: string; // Hash or path-line identifier
  relPath: string; // Relative path in vault (e.g. Clientes/MUV Gráfica.md)
  noteTitle: string; // Title of note
  companySlug?: string; // Company slug if linked to a company
  companyName?: string; // Company display name if available
  squadId?: string; // Squad ID if under Squads/
  text: string; // Clean task text
  line: number; // 1-indexed line number in markdown note
  completed: boolean; // True if [x] or [X], false if [ ]
  mtime: number; // Note modification time
}

export interface VaultTodoStats {
  total: number;
  pending: number;
  completed: number;
}

const CHECKBOX_REGEX = /^\s*-\s*\[([ xX])\]\s+(.*)/;

/**
 * Extracts all TODO checkboxes (- [ ] or - [x]) from all markdown notes in nipei-vault.
 * Uses the warm in-memory index for zero-latency queries.
 */
export async function extractVaultTodos(options?: {
  companySlug?: string;
  squadId?: string;
  status?: "pending" | "completed" | "all";
}): Promise<{ todos: VaultTodoItem[]; stats: VaultTodoStats }> {
  const docs = await getAllIndexedDocuments();
  const todos: VaultTodoItem[] = [];

  const filterCompany = options?.companySlug?.trim().toLowerCase();
  const filterSquad = options?.squadId?.trim().toLowerCase();
  const filterStatus = options?.status ?? "all";

  for (const doc of docs) {
    // Determine company slug
    const companySlug = doc.companySlug || (doc.relPath.toLowerCase().startsWith("clientes/") || doc.relPath.toLowerCase().startsWith("productos/")
      ? doc.title.toLowerCase().replace(/\s+/g, "-")
      : undefined);

    // Determine squad ID
    let squadId: string | undefined = undefined;
    if (doc.relPath.toLowerCase().startsWith("squads/")) {
      const parts = doc.relPath.split("/");
      if (parts.length > 1) squadId = parts[1];
    }

    // Apply company/squad filters early if specified
    if (filterCompany) {
      const matchesCompany =
        companySlug?.toLowerCase() === filterCompany ||
        doc.relPath.toLowerCase().includes(filterCompany) ||
        doc.title.toLowerCase().includes(filterCompany);
      if (!matchesCompany) continue;
    }

    if (filterSquad) {
      if (squadId?.toLowerCase() !== filterSquad && !doc.relPath.toLowerCase().includes(filterSquad)) {
        continue;
      }
    }

    // Read full note content to parse line numbers
    const note = await readNote(doc.relPath);
    if (!note || !note.content) continue;

    const lines = note.content.split(/\r?\n/);
    lines.forEach((lineText, lineIdx) => {
      const match = CHECKBOX_REGEX.exec(lineText);
      if (match) {
        const isCompleted = match[1].toLowerCase() === "x";
        const taskText = match[2].trim();
        const lineNumber = lineIdx + 1;

        if (filterStatus === "pending" && isCompleted) return;
        if (filterStatus === "completed" && !isCompleted) return;

        // Generate deterministic unique ID
        const safePath = doc.relPath.replace(/[^a-zA-Z0-9_-]/g, "_");
        const id = `${safePath}-L${lineNumber}`;

        todos.push({
          id,
          relPath: doc.relPath,
          noteTitle: doc.title,
          companySlug: doc.companySlug || companySlug,
          companyName: doc.companyName,
          squadId,
          text: taskText,
          line: lineNumber,
          completed: isCompleted,
          mtime: doc.mtime,
        });
      }
    });
  }

  // Sort by modification time (newest first) then by line number
  todos.sort((a, b) => b.mtime - a.mtime || a.line - b.line);

  const stats: VaultTodoStats = {
    total: todos.length,
    pending: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return { todos, stats };
}

/**
 * Toggles a TODO item checkbox directly in the Markdown note on disk.
 * Automatically updates the in-memory cache via writeNote().
 */
export async function toggleVaultTodo(
  relPath: string,
  line: number,
  completed: boolean
): Promise<{ success: boolean; error?: string; updatedLineText?: string }> {
  const note = await readNote(relPath);
  if (!note) {
    return { success: false, error: `Note at "${relPath}" not found` };
  }

  const lines = note.content.split(/\r?\n/);
  const targetIdx = line - 1;

  if (targetIdx < 0 || targetIdx >= lines.length) {
    return { success: false, error: `Line ${line} out of bounds in "${relPath}"` };
  }

  const currentLine = lines[targetIdx];
  const match = CHECKBOX_REGEX.exec(currentLine);

  if (!match) {
    return { success: false, error: `Line ${line} in "${relPath}" is not a checkbox item` };
  }

  const newCheckbox = completed ? "- [x]" : "- [ ]";
  const updatedLine = currentLine.replace(/^\s*-\s*\[([ xX])\]/, newCheckbox);

  lines[targetIdx] = updatedLine;
  const newContent = lines.join("\n");

  const writeResult = await writeNote(relPath, newContent);
  if (!writeResult.success) {
    return { success: false, error: writeResult.error || "Failed to write note" };
  }

  return { success: true, updatedLineText: updatedLine };
}
