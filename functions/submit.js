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

    // --- Krok 3: Odeslání e-mailové notifikace ---
    const resendApiKey = context.env.RESEND_API_KEY;
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Nová Přihláška <notifikace@tvojedomena.cz>',
          to: ['tvuj.email@seznam.cz'],
          subject: `Nová přihláška od: ${data.name || 'Neznámý'}`,
          text: readableFormat
        })
      });
    }

    // --- Krok 4: Přesměrování uživatele ---
    const url = new URL(context.request.url);
    return Response.redirect(`${url.origin}/dekujeme.html`, 302);

  } catch (error) {
    return new Response('Něco se pokazilo: ' + error.message, { status: 500 });
  }
}
