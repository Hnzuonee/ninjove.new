// soubor: functions/submit.js

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // --- Krok 1: Zpracování dat z formuláře ---
    const formData = await request.formData();
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
    await env.PRIHLASKY.put(id, readableFormat);

    // --- Krok 3: Odeslání e-mailů ---
    const resendApiKey = env.RESEND_API_KEY;
    if (resendApiKey) {
      // Notifikace pro tebe
      const sendAdminEmail = fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Secret Agency <aneta@ninjove.com>',
          to: ['jsem@hanzu.cz'],
          subject: `Nová přihláška od: ${data.name || 'Neznámý'}`,
          text: readableFormat
        })
      });

      // Potvrzovací e-mail pro uživatelku
      const sendUserEmail = (data.contact && data.contact.includes('@')) 
        ? fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: 'Aneta | Secret Agency <aneta@ninjove.com>',
              to: [data.contact],
              subject: 'Potvrzení: Přijali jsme Tvoji přihlášku!',
              // "NEPRŮSTŘELNÁ" HTML ŠABLONA PRO E-MAILY
              html: `
                <!DOCTYPE html>
                <html lang="cs">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Potvrzení Přihlášky</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #000000;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000;">
                    <tr>
                      <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto;">
                          <tr>
                            <td align="center" style="background-color: #141414; padding: 40px; border-radius: 16px; border: 1px solid #2a2a2a;">
                              <h2 style="font-size: 24px; font-weight: bold; color: #f72585; margin: 0 0 20px 0;">Ahoj, děkujeme za důvěru!</h2>
                              <p style="font-size: 16px; line-height: 1.6; color: #e0e0e0; margin: 0 0 15px 0;">Tímto potvrzujeme, že jsme Tvoji přihlášku v pořádku přijali a je u nás v naprostém bezpečí.</p>
                              <p style="font-size: 16px; line-height: 1.6; color: #e0e0e0; margin: 0 0 15px 0;">Pečlivě si ji projdeme a co nejdříve se Ti ozveme s dalšími kroky. Očekávej od nás zprávu během následujících 24-48 hodin.</p>
                              <p style="font-size: 16px; line-height: 1.6; color: #e0e0e0; margin: 0 0 25px 0;">Zatím si můžeš znovu prohlédnout náš web: <a href="${new URL(request.url).origin}" style="color: #f72585; text-decoration: none; font-weight: bold;">Přejít na web</a>.</p>
                              <p style="font-size: 16px; line-height: 1.6; color: #e0e0e0; margin: 0;">S pozdravem,</p>
                              <p style="font-size: 16px; line-height: 1.6; color: #e0e0e0; margin: 0;"><strong>Aneta a tým Secret Agency</strong></p>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <p style="font-size: 12px; color: #a1a1aa; margin: 0;">&copy; 2025 | Secret Agency</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
              `
            })
          })
        : Promise.resolve(); 

      await Promise.allSettled([sendAdminEmail, sendUserEmail]);
    }

    // --- Krok 4: Přesměrování uživatele ---
    const url = new URL(request.url);
    return Response.redirect(`${url.origin}/dekujeme.html`, 302);

  } catch (error) {
    console.error('Došlo k chybě:', error);
    return new Response('Něco se pokazilo. Zkuste to prosím znovu později. Chyba: ' + error.message, { status: 500 });
  }
}
