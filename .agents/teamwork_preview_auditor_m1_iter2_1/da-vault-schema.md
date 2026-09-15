# Contrato del vault — Digital Alignment (da-vault-schema)
Local copy for forensic auditor audit reference.

Source: C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md

Key rules:
1. Root frontmatter: id (required, slug), nombre (required).
2. Sub-types:
   - roadmap: id (required), texto (required), prioridad (urgente|alta|media|baja), hecho (boolean, canonical), estado (en_curso|bloqueada|esperando_cliente|hecha - omit/clear when hecho=true), proyecto_id, orden, etc.
   - proyectos: id, nombre, estado, objetivo, tecnologias
   - historial: fecha (YYYY-MM-DD), texto, tags
   - servicios: id, tipo (wordpress|hosting|email|elearning|otro), nombre, url, credencial_ref (NEVER plaintext secret!), estado (configurado|pendiente)
3. Enums:
   - tipo: cliente_externo | producto_propio | agencia_madre
   - estado (brand): activo | transicion | pausado | archivado
   - rubro: ecommerce | turismo_retiros | comunidad_cultura | producto_saas | agencia
   - prioridad: urgente | alta | media | baja
   - estado (task): pendiente | en_curso | bloqueada | esperando_cliente | hecha
   - tipo (service): wordpress | hosting | email | elearning | otro
   - estado (service): configurado | pendiente
4. First line of body on new note: <!-- agente: ... -->
5. Never overwrite/delete body markdown when updating frontmatter.
6. Never write passwords, tokens, or API keys into the vault (credencial_ref only).
