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
              // FINÁLNÍ DESIGN E-MAILU
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #000000; color: #e0e0e0;}
                    .container { max-width: 600px; margin: 20px auto; background-color: rgba(20, 20, 20, 0.4); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; }
                    h2 { font-size: 24px; font-weight: 900; background: linear-gradient(90deg, #f72585, #b5179e, #7209b7, #f72585); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                    p { font-size: 16px; line-height: 1.6; }
                    a { color: #f72585; text-decoration: none; font-weight: bold; }
                    .footer { font-size: 12px; color: #a1a1aa; text-align: center; margin-top: 20px; }
                  </style>
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                </head>
                <body>
                  <div class="container">
                    <h2>Ahoj, děkujeme za důvěru!</h2>
                    <p>Tímto potvrzujeme, že jsme Tvoji přihlášku v pořádku přijali a je u nás v naprostém bezpečí.</p>
                    <p>Pečlivě si ji projdeme a co nejdříve se Ti ozveme s dalšími kroky. Očekávej od nás zprávu během následujících 24-48 hodin.</p>
                    <p>Zatím si můžeš znovu prohlédnout náš web: <a href="${new URL(request.url).origin}">Přejít na web</a>.</p>
                    <br>
                    <p>S pozdravem,</p>
                    <p><strong>Aneta a tým Secret Agency</strong></p>
                  </div>
                  <div class="footer">
                    <p>&copy; 2025 | Secret Agency</p>
                  </div>
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
