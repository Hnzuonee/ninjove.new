// soubor: functions/submit.js

export async function onRequestPost(context) {
  try {
    // --- Krok 1: Zpracování dat z formuláře ---
    const formData = await context.request.formData();
    const data = Object.fromEntries(formData);
    data.submittedAt = new Date().toISOString();
    const id = crypto.randomUUID();

    const readableFormat = `
Nová přihláška - ${new Date(data.submittedAt).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}
==================================================
Jméno/Přezdívka:  ${data.name || 'neuvedeno'}
Věk 18+:          ${data.age === 'on' ? 'Ano' : 'Ne'}
Kontakt:          ${data.contact || 'neuvedeno'}
Telefon:          ${data.phone || 'neuvedeno'}
Sociální sítě:    ${data.social || 'neuvedeno'}
Souhlas GDPR:     ${data.gdpr === 'on' ? 'Ano' : 'Ne'}
==================================================
`;

    // --- Krok 2: Uložení do KV databáze ---
    await context.env.PRIHLASKY.put(id, readableFormat);

    // --- Krok 3: Přesměrování uživatele ---
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/dekujeme.html`, 302);

  } catch (error) {
    // Pokud se něco pokazí, vrátíme chybovou hlášku
    return new Response('Něco se pokazilo: ' + error.message, { status: 500 });
  }
}
