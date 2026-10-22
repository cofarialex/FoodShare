// =====================================================
//  Letölthető sablonok cégeknek (Word-ben megnyitható .doc fájl)
//  A sablonok román nyelvűek, mert romániai hivatalos dokumentumok.
//  Trükk: egy HTML-t mentünk el .doc kiterjesztéssel – a Word ezt meg tudja nyitni és szerkeszteni.
//  FIGYELEM: orientatív minták, jogász ellenőrizze őket használat előtt!
// =====================================================

const TEMPLATE_STYLE = `
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
  h1 { font-size: 16pt; text-align: center; color: #1e3a2f; }
  h2 { font-size: 12pt; color: #1e3a2f; margin-top: 14pt; }
  .note { border: 1px solid #c0392b; color: #c0392b; padding: 6pt; font-size: 9pt; }
  .fill { color: #888; }
  table { border-collapse: collapse; width: 100%; }
  td { border: 1px solid #999; padding: 4pt; vertical-align: top; }
`;

const DISCLAIMER = `<p class="note"><b>MODEL ORIENTATIV.</b> Acest document este un model de lucru generat de platforma FoodShare și nu constituie consultanță juridică.
  Verificați conținutul cu un jurist sau consultant înainte de utilizare și adaptați-l la legislația în vigoare și la specificul firmei.</p>`;

const TEMPLATES = {
  procedure: {
    file: "FoodShare-procedura-interna-surplus-alimentar.doc",
    title: "Procedură internă privind gestionarea surplusului alimentar",
    body: `
      ${DISCLAIMER}
      <p><b>Operator:</b> <span class="fill">[Denumirea firmei]</span>, CUI <span class="fill">[...]</span>, sediul <span class="fill">[...]</span><br>
      <b>Data intrării în vigoare:</b> <span class="fill">[zz.ll.aaaa]</span> &nbsp; <b>Versiunea:</b> 1</p>

      <h2>1. Scop</h2>
      <p>Prezenta procedură stabilește modul în care firma previne și reduce risipa alimentară, valorifică surplusul de alimente
      și documentează transferurile, în conformitate cu legislația privind reducerea risipei alimentare.</p>

      <h2>2. Domeniu de aplicare</h2>
      <p>Se aplică tuturor punctelor de lucru și angajaților care manipulează alimente: <span class="fill">[lista punctelor de lucru]</span>.</p>

      <h2>3. Persoana responsabilă</h2>
      <p>Responsabil cu prevenirea risipei alimentare: <span class="fill">[Nume, funcție, telefon, e-mail]</span>.<br>
      Înlocuitor: <span class="fill">[Nume, funcție]</span>.</p>

      <h2>4. Măsuri aplicate (minimum două)</h2>
      <table>
        <tr><td>☐</td><td>Prevenirea surplusului (planificarea comenzilor, rotația stocurilor, desemnarea unui responsabil)</td></tr>
        <tr><td>☐</td><td>Vânzarea la preț redus înainte de expirare (modulul de vânzare FoodShare)</td></tr>
        <tr><td>☐</td><td>Transferul alimentelor pentru consum uman – donație prin automatele frigorifice FoodShare</td></tr>
        <tr><td>☐</td><td>Valorificare alternativă: procesare, hrană pentru animale, compost</td></tr>
      </table>

      <h2>5. Fluxul zilnic</h2>
      <ol>
        <li><b>Identificare:</b> zilnic, la ora <span class="fill">[...]</span>, se identifică produsele aflate aproape de expirare sau în surplus.</li>
        <li><b>Evaluarea siguranței:</b> se verifică termenul, integritatea ambalajului, etichetarea și păstrarea la temperatura corespunzătoare.
          Produsele nesigure NU se transferă.</li>
        <li><b>Decizie:</b> vânzare la preț redus / donație prin FoodShare / altă valorificare, conform priorităților de la pct. 4.</li>
        <li><b>Predare:</b> produsele se depun în automatul FoodShare cu codul de depunere; categoria determină automat durata maximă de păstrare.</li>
        <li><b>Înregistrare:</b> fiecare transfer este înregistrat automat în registrul FoodShare (produs, cantitate, dată, compartiment, stare).</li>
      </ol>

      <h2>6. Trasabilitate și păstrarea documentelor</h2>
      <p>Registrul transferurilor (export CSV din FoodShare) și documentele aferente se păstrează cel puțin <b>3 ani</b>,
      în format electronic, la <span class="fill">[locația arhivei]</span>.</p>

      <h2>7. Raportare</h2>
      <p>Anual, până la data de <span class="fill">[...]</span>, responsabilul întocmește planul și raportul privind reducerea risipei alimentare
      și le încarcă pe platforma Ministerului Agriculturii și Dezvoltării Rurale (MADR). Raportul anual FoodShare poate fi utilizat ca bază de date.</p>

      <h2>8. Instruire și revizuire</h2>
      <p>Angajații sunt instruiți la angajare și anual. Procedura se revizuiește anual sau la modificarea legislației.</p>

      <br><table><tr><td>Întocmit<br><br>Nume, semnătură:<br><br><br></td><td>Aprobat (administrator)<br><br>Nume, semnătură:<br><br><br></td></tr></table>
    `,
  },

  contract: {
    file: "FoodShare-contract-transfer-alimente.doc",
    title: "Contract de transfer (donație / vânzare) de alimente prin automatele FoodShare",
    body: `
      ${DISCLAIMER}
      <p>Nr. <span class="fill">[...]</span> din data de <span class="fill">[zz.ll.aaaa]</span></p>

      <h2>1. Părțile</h2>
      <p><b>1.1.</b> <span class="fill">[Denumirea firmei]</span>, CUI <span class="fill">[...]</span>, sediul <span class="fill">[...]</span>,
      reprezentată de <span class="fill">[nume, funcție]</span>, denumită în continuare <b>„Operatorul”</b>, și</p>
      <p><b>1.2.</b> <span class="fill">[Denumirea operatorului platformei FoodShare]</span>, CUI <span class="fill">[...]</span>, sediul <span class="fill">[...]</span>,
      reprezentată de <span class="fill">[nume, funcție]</span>, denumită în continuare <b>„FoodShare”</b>.</p>

      <h2>2. Obiectul contractului</h2>
      <p>Transferul surplusului alimentar al Operatorului către consumatori finali, prin automatele frigorifice FoodShare,
      sub formă de donație gratuită sau de vânzare la preț redus înainte de expirare.</p>

      <h2>3. Obligațiile Operatorului</h2>
      <ul>
        <li>să predea numai alimente sigure, în termen de valabilitate, ambalate și etichetate corespunzător (inclusiv alergeni);</li>
        <li>să declare corect categoria, cantitatea, data expirării și informațiile despre alergeni în aplicație;</li>
        <li>să respecte lanțul frigorific până la depunerea în automat;</li>
        <li>să nu predea produse a căror siguranță este îndoielnică.</li>
      </ul>

      <h2>4. Obligațiile FoodShare</h2>
      <ul>
        <li>să păstreze alimentele în automate la o temperatură de 0–5 °C, cu monitorizare continuă;</li>
        <li>să blocheze automat compartimentele la depășirea temperaturii de 8 °C și la expirarea duratei maxime de păstrare;</li>
        <li>să asigure trasabilitatea fiecărui transfer și să pună la dispoziția Operatorului registrul și raportul anual;</li>
        <li>să golească și să igienizeze compartimentele cu produse expirate.</li>
      </ul>

      <h2>5. Prețul și comisionul (doar pentru vânzări la preț redus)</h2>
      <p>Pentru produsele vândute la preț redus, FoodShare reține un comision de <span class="fill">[15]</span>% din prețul de vânzare.
      Suma rămasă se virează Operatorului <span class="fill">[lunar / la ... zile]</span>. Donațiile gratuite nu generează comision.</p>

      <h2>6. Răspunderea</h2>
      <p>Operatorul răspunde pentru calitatea și siguranța alimentelor până la depunerea lor în automat.
      FoodShare răspunde pentru păstrarea corespunzătoare a acestora în automat. <span class="fill">[A se completa/verifica de către jurist,
      inclusiv în raport cu cerințele autorității sanitar-veterinare (DSVSA).]</span></p>

      <h2>7. Protecția datelor</h2>
      <p>Părțile prelucrează datele cu caracter personal în conformitate cu Regulamentul (UE) 2016/679 (GDPR).</p>

      <h2>8. Durata și încetarea</h2>
      <p>Contractul se încheie pe o perioadă de <span class="fill">[12 luni]</span> și se prelungește automat, dacă niciuna dintre părți
      nu îl denunță cu un preaviz de <span class="fill">[30]</span> de zile.</p>

      <h2>9. Dispoziții finale</h2>
      <p>Prezentul contract s-a încheiat în două exemplare originale, câte unul pentru fiecare parte.</p>

      <br><table><tr><td>Operator<br><br>Nume, semnătură, ștampilă:<br><br><br></td><td>FoodShare<br><br>Nume, semnătură, ștampilă:<br><br><br></td></tr></table>
    `,
  },
};

function downloadTemplate(id) {
  const tpl = TEMPLATES[id];
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${tpl.title}</title><style>${TEMPLATE_STYLE}</style></head>
    <body><h1>${tpl.title}</h1>${tpl.body}</body></html>`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" }));
  link.download = tpl.file;
  link.click();
}
