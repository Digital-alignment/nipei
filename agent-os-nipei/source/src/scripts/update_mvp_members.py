import json
import os
import re

json_path = r"c:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source\src\data\vaultMembers.json"
vault_dir = r"c:\Users\ondig\Code\Nipei\nipei-vault\Miembros"

with open(json_path, "r", encoding="utf-8") as fp:
    members = json.load(fp)

# Config of the MVP Online Super Users and Squad 1 Leadership
updates = {
    "ashuan_web": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "Dev Master & Liderança Tech", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_4_vendas_mkt", "roleTitle": "Especialista Web & E-commerce", "confirmationStatus": "APPROVED"}
        ]
    },
    "jordao_pekuti": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "CEO & Fundador", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_2_mutum", "roleTitle": "Líder Espiritual & Articulação Mutum", "confirmationStatus": "APPROVED"}
        ]
    },
    "ppr": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "Diretor Geral", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_5_adm_legal", "roleTitle": "Diretoria Institucional", "confirmationStatus": "APPROVED"}
        ]
    },
    "rodrigo_andrade": {
        "globalRole": "SQUAD_LEADER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "Diretoria Executiva / Estratégia", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_5_adm_legal", "roleTitle": "Head Legal, Financeiro & Compliance", "confirmationStatus": "APPROVED"}
        ]
    },
    "ana_castro_human_api": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "Sinapse & Enlace Institucional", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_7_instituto", "roleTitle": "Pesquisadora Principal Etnobotânica", "confirmationStatus": "APPROVED"}
        ]
    },
    "agente_antigravity": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "AI Mastermind & Orquestrador", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_vb_knowledge", "roleTitle": "Auditor de Conhecimento", "confirmationStatus": "APPROVED"}
        ]
    },
    "agente_vaultkeeper": {
        "globalRole": "SUPER_USER",
        "squadAssignments": [
            {"squadId": "squad_1_ceo", "roleTitle": "Guardião de Integridade do Vault", "confirmationStatus": "APPROVED", "isPrimary": True},
            {"squadId": "squad_vb_knowledge", "roleTitle": "Auditor de Integridade", "confirmationStatus": "APPROVED"}
        ]
    }
}

# 1. Update JSON
for m in members:
    mid = m["id"]
    if mid in updates:
        m["globalRole"] = updates[mid]["globalRole"]
        m["squadAssignments"] = updates[mid]["squadAssignments"]
        print(f"Updated JSON member: {mid} -> {m['globalRole']}")

with open(json_path, "w", encoding="utf-8") as fp:
    json.dump(members, fp, indent=2, ensure_ascii=False)
print("Saved vaultMembers.json successfully.")

# 2. Update Vault Markdown notes in Miembros/
vault_files = {
    "ashuan_web": "ashuan_web.md",
    "jordao_pekuti": "jordao_pekuti.md",
    "ppr": "ppr.md",
    "rodrigo_andrade": "rodrigo_andrade.md",
    "ana_castro_human_api": "ana_castro_human_api.md",
    "agente_antigravity": "agente_antigravity.md",
    "agente_vaultkeeper": "agente_vaultkeeper.md"
}

for mid, fname in vault_files.items():
    fpath = os.path.join(vault_dir, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
        c = fp.read()
    
    new_role = updates[mid]["globalRole"]
    c = re.sub(r'global_role:\s*"[^"]*"', f'global_role: "{new_role}"', c)
    
    # check squad_assignments in frontmatter
    sq_yaml_lines = ["squad_assignments:"]
    for sq in updates[mid]["squadAssignments"]:
        sq_yaml_lines.append(f'  - squad_id: "{sq["squadId"]}"')
        sq_yaml_lines.append(f'    role_title: "{sq["roleTitle"]}"')
        sq_yaml_lines.append(f'    confirmation_status: "{sq["confirmationStatus"]}"')
        if sq.get("isPrimary"):
            sq_yaml_lines.append('    is_primary: true')
    sq_yaml = "\n".join(sq_yaml_lines)
    
    if "squad_assignments:" in c:
        c = re.sub(r'squad_assignments:.*?(?=\n[a-z_]+:|\n---)', sq_yaml, c, flags=re.DOTALL)
    else:
        c = c.replace("---", f"---\n{sq_yaml}", 1)

    with open(fpath, "w", encoding="utf-8") as fp:
        fp.write(c)
    print(f"Updated vault markdown: {fname}")

print("Phase A Member & Squad updates complete.")
