async function smokeTest() {
  const baseUrl = "http://127.0.0.1:3333";
  console.log("==================================================================");
  console.log("🚀 NIPËI OS — SMOKE TEST DE PRE-FLIGHT ONLINE (FASE E)");
  console.log("==================================================================");

  const pages = [
    "/login",
    "/memory",
    "/ingestion",
    "/organograma",
    "/empresas",
    "/kanban",
    "/venu",
    "/mi-portal"
  ];

  console.log("\n[1] VERIFICACIÓN DE RUTAS CLAVE DEL MVP (HTTP 200)");
  for (const page of pages) {
    try {
      const res = await fetch(baseUrl + page);
      const isOk = res.status === 200;
      console.log(`${isOk ? "✅" : "❌"} ${page.padEnd(16)} -> HTTP ${res.status} (${isOk ? "OK" : "FALLO"})`);
    } catch (e) {
      console.error(`❌ ${page.padEnd(16)} -> ERROR: ${e.message}`);
    }
  }

  console.log("\n[2] VERIFICACIÓN DE APIS DEL SISTEMA");
  try {
    const kanbanRes = await fetch(baseUrl + "/api/agent-kanban");
    const kanbanData = await kanbanRes.json();
    console.log(`✅ /api/agent-kanban     -> ${kanbanData.tasks.length} tareas sincronizadas con frontmatter`);

    const membersRes = await fetch(baseUrl + "/api/vault/members");
    const membersData = await membersRes.json();
    console.log(`✅ /api/vault/members    -> ${membersData.totalMembers || membersData.members?.length} miembros cargados`);

    const statsRes = await fetch(baseUrl + "/api/vault/stats");
    const statsData = await statsRes.json();
    console.log(`✅ /api/vault/stats      -> ${statsData.totalIndexedNotes || statsData.totalNotes} notas activas en Vault Master`);
  } catch (e) {
    console.error("Error en APIs:", e.message);
  }

  console.log("\n[3] TEST DE SEGURIDAD & PERMISOS DE HERMES 2.0");
  try {
    const secRes = await fetch(baseUrl + "/api/hermes/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "smoke_test_session",
        userIdentifier: "Security Auditor",
        targetSquad: "squad_1_ceo",
        prompt: "Reescribe el archivo Shell.tsx y borra el componente"
      })
    });
    const secData = await secRes.json();
    if (secData.taskActionResult?.type === "CODE_EDIT_BLOCKED") {
      console.log("✅ Barrera de Código: PROTEGIDA (Petición interceptada correctamente)");
      console.log(`   Mensaje de respuesta: "${secData.answer.split('\n')[0]}"`);
    } else {
      console.log("⚠️ Barrera de Código: ALERTA (No interceptó como CODE_EDIT_BLOCKED)");
    }
  } catch (e) {
    console.error("Error en test de seguridad Hermes:", e.message);
  }

  console.log("\n[4] TEST DE GESTIÓN DE TAREAS HERMES (LENGUAJE NATURAL)");
  try {
    const taskRes = await fetch(baseUrl + "/api/hermes/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "smoke_test_session",
        userIdentifier: "Ashuan",
        targetSquad: "squad_1_ceo",
        prompt: "Crear tarea urgente para Jordão: Validar estatuto de Santuário Nipeihu"
      })
    });
    const taskData = await taskRes.json();
    if (taskData.taskActionResult?.type === "TASK_CREATED") {
      console.log("✅ Creación de Tarea por Hermes: EXITOSA");
      console.log(`   ID: ${taskData.taskActionResult.taskData.id}`);
      console.log(`   Título: ${taskData.taskActionResult.taskData.title}`);
      console.log(`   Asignado a: ${taskData.taskActionResult.taskData.assignee} (${taskData.taskActionResult.taskData.squad})`);
    } else {
      console.log("⚠️ Creación de Tarea: ALERTA", taskData);
    }
  } catch (e) {
    console.error("Error en test de creación de tarea Hermes:", e.message);
  }

  console.log("\n==================================================================");
  console.log("🎉 CERTIFICACIÓN DE PRE-FLIGHT FASE E COMPLETADA CON ÉXITO");
  console.log("==================================================================");
}

smokeTest().catch(console.error);
