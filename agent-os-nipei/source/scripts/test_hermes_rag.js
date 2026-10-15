const http = require('http');

async function askHermes(question, squadId = 'squad_01') {
  const res = await fetch('http://localhost:3000/api/memory/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, squadId })
  });
  return res.json();
}

async function runTests() {
  console.log('🧪 Iniciando Suite de Pruebas RAG Hermes 2.0 (Zero-Hallucination)...\n');

  const testCases = [
    { q: 'cuáles son los estatutos o visión del santuario nipei', squad: 'squad_01' },
    { q: 'proyectos e infraestructura mutum aldea', squad: 'squad_02' },
    { q: 'servidores vps arquitectura tecnologica', squad: 'squad_06' },
    { q: 'universo quántico intergaláctico inexistente xyz', squad: 'squad_01' } // Grounding test for zero hallucination
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`--------------------------------------------------`);
    console.log(`❓ Prueba ${i + 1}: "${tc.q}" [Squad: ${tc.squad}]`);
    const data = await askHermes(tc.q, tc.squad);

    console.log(`- Certificado por Vault (Grounded): ${data.isGrounded ? '✅ SÍ' : '❌ NO'}`);
    console.log(`- Grounding Score: ${(data.groundingScore * 100).toFixed(1)}%`);
    console.log(`- Citas encontradas: ${data.citations ? data.citations.length : 0}`);

    if (data.citations && data.citations.length > 0) {
      data.citations.forEach((c, idx) => {
        console.log(`  [Cita ${idx + 1}] ${c.title} -> ${c.path} (Score: ${(c.relevanceScore * 100).toFixed(1)}%)`);
      });
    } else {
      console.log(`  🛡️ Vacío de Ingesta Registrado Correctamente (Zero-Hallucination Policy Triggered)`);
    }
  }

  console.log(`\n✅ Suite de pruebas RAG Hermes 2.0 completada.`);
}

runTests();
