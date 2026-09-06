# earthealth

Un prototipo di un atlante per connettere bisogni umanitari, donazioni anonime e rendicontazione.

## Avvio

Node.js 22.13 o successivo. `npm install`, poi `npm run dev`. Per il controllo: `npm test`, `npm run typecheck`, `npm run build`.

## Funzioni

- Globo ortografico ruotabile con trascinamento, tastiera, zoom e ricerca.
- 177 perimetri geografici Natural Earth, viste per continente, nazione e città.
- 44 scenari nazionali e 12 città demo; i cerchi delle città sono aree indicative di progetto, **non confini amministrativi**. Il bianco significa dati mancanti.
- Cinque categorie: acqua, nutrizione, salute, riparo, istruzione; schede con canali ufficiali esterni.
- Profilo anonimo e donazioni **locali e simulate**, conservati in localStorage sul browser corrente.
- Rendiconti scaricabili e percorso a quattro tappe che l’utente fa avanzare esplicitamente come simulazione.
- Classifica con sei profili illustrativi e l’eventuale profilo locale; i registri di esempio si riconciliano con gli importi geografici.
- Heatmap degli aiuti, aggregazione delle donazioni per categoria e gerarchia geografica.

## Confini del prototipo

Non raccoglie denaro e non crea account sul server. Non è una community condivisa tra dispositivi. Non certifica bisogni, acquisti, beneficiari, impatti né avvenute consegne. Le cifre sono sintetiche e non provengono dalle organizzazioni. Le pagine ufficiali per donare sono esterne: nessun tracciamento o affiliazione. Le stime dei kit sono esempi aritmetici con costo unitario esplicito e residuo non assegnato.

Per una versione operativa occorrono dati territoriali verificati e datati, perimetri municipali, identità pseudonime con recupero account, archivio server e integrazioni concordate per pagamenti e documentazione degli enti.

## Geografia e fonti

- Natural Earth / World Atlas, dati cartografici di pubblico dominio: https://github.com/topojson/world-atlas
- Nomi localizzati e continenti: https://github.com/mledoze/countries (ODbL-1.0). La selezione derivata è in `public/data/countries.json`; i tre identificativi `map-*` sono interni e non codici ISO.
- Canali ufficiali consultati il 6 settembre 2026: https://www.wateraid.org/uk/donate?v=1, https://www.wfp.org/support-us, https://www.msf.org/donate, https://www.unhcr.org/get-involved/ways-give, https://www.unicef.org/take-action.

## Validazione

Sette test automatici: riconciliazione delle raccolte, assenza di doppio conteggio, validazione degli importi, stime e residui, ricaricamento del profilo, integrità delle geometrie e preparazione dell’atlante attraverso lo stesso codice del browser. Il test di regressione riproduceva `objects.forEach is not a function` prima della correzione della chiamata a `topojson.merge`. Controllo TypeScript e compilazione per Cloudflare Workers.

Il sito registra, se supportato, il solo strumento WebMCP `navigate_earthhealth_territory`. Non crea donazioni; apre il territorio nella stessa interfaccia. Dopo la segnalazione del globo assente, verificati nell’anteprima browser il rendering della sfera e la navigazione al continente Africa. Per WebMCP sono stati verificati registrazione, navigazione valida e rifiuto di un territorio inesistente senza cambiare il luogo selezionato. Questa verifica mirata non copre tutti i percorsi di donazione o i gesti touch.
