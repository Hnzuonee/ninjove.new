// soubor: functions/submit.js

export async function onRequestPost(context) {
  try {
    // 1. Získáme data odeslaná z formuláře
    const formData = await context.request.formData();
    const data = Object.fromEntries(formData);
    
    // 2. Připojíme k nim datum pro přehlednost
    data.submittedAt = new Date().toISOString();

    // 3. Vytvoříme unikátní klíč (ID) pro každý záznam
    const id = crypto.randomUUID();

    // 4. Vytvoříme hezčí, čitelný formát pro uložení
    const readableFormat = `
Nová přihláška - ${new Date(data.submittedAt).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}
==================================================
Přezdívka:       ${data.name || 'neuvedeno'}
Věk:              ${data.age || 'neuvedeno'}
Kontakt:          ${data.contact || 'neuvedeno'}
Sociální sítě:    ${data.social || 'neuvedeno'}
Souhlas GDPR:     ${data.gdpr === 'on' ? 'Ano' : 'Ne'}
==================================================
`;

    // 5. Uložíme data do naší KV databáze v novém formátu
    await context.env.PRIHLASKY.put(id, readableFormat);

    // 6. Přesměrujeme uživatele na děkovací stránku
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/dekujeme.html`, 302);

  } catch (error) {
    // Pokud se něco pokazí, vrátíme chybovou hlášku
    return new Response('Něco se pokazilo: ' + error.message, { status: 500 });
  }
}
