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

    // 4. Uložíme data do naší KV databáze s názvem 'PRIHLASKY'
    //    Tento název si pak vytvoříme v nastavení Cloudflare
    await context.env.PRIHLASKY.put(id, JSON.stringify(data));

    // 5. Přesměrujeme uživatele na děkovací stránku
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/dekujeme.html`, 302);

  } catch (error) {
    // Pokud se něco pokazí, vrátíme chybovou hlášku
    return new Response('Něco se pokazilo: ' + error.message, { status: 500 });
  }
}
