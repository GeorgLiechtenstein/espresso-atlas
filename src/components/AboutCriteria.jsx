import { useLang } from '../context/LangContext';

export default function AboutCriteria() {
  const { lang } = useLang();
  const d = lang === 'de' ? COPY_DE : COPY_EN;

  return (
    <section>
      <h2 className="font-serif text-2xl text-ink mb-3 leading-tight">{d.title}</h2>
      <p className="text-[15px] text-gray-600 font-sans leading-relaxed mb-8">{d.lead}</p>

      <Block title={d.body.title}    desc={d.body.desc}    type="bar" />
      <Divider />
      <Block title={d.crema.title}   desc={d.crema.desc}   type="bar" />
      <Divider />
      <Block title={d.balance.title} desc={d.balance.desc} type="spectrum" levels={d.balance.levels} />
    </section>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(26,23,20,0.10)', margin: '32px 0' }} />;
}

function Block({ title, desc, type, levels }) {
  return (
    <div>
      <h3 style={{
        fontFamily: '"DM Serif Display", Georgia, serif',
        fontSize: 22, fontWeight: 700, color: '#1a1714',
        margin: 0, lineHeight: 1.2, letterSpacing: -0.3,
      }}>{title}</h3>
      <p style={{
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: 14, color: '#555555', lineHeight: 1.55,
        marginTop: 8, marginBottom: 14,
      }}>{desc}</p>

      {type === 'bar' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 280 }}>
          <div style={{ flex: 1, height: 8, background: '#E0E0E0', borderRadius: 4, position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: '80%', background: '#6F4E37', borderRadius: 4,
            }} />
          </div>
          <span style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: 14, color: '#1a1714', fontWeight: 700,
          }}>
            8<span style={{ color: '#555555', fontWeight: 400, fontSize: 12 }}>/10</span>
          </span>
        </div>
      )}

      {type === 'spectrum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {levels.map((lv) => (
            <div key={lv.label}>
              <span style={{
                fontFamily: '"DM Serif Display", Georgia, serif',
                fontStyle: 'italic', fontWeight: 700, fontSize: 16,
                color: lv.color,
              }}>{lv.label}</span>
              <span style={{
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: 14, color: '#555555',
              }}> — {lv.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COPY_DE = {
  title: 'Wie ich bewerte',
  lead: 'Drei Kriterien, ehrlich vergeben. Körper und Crema auf einer Skala von 1 bis 10, Balance auf einem Spektrum.',
  body:  { title: 'Körper', desc: 'Wie dicht und substanziell fühlt sich der Espresso im Mund an? Sirupartig und vollmundig vs. wässrig und dünn.' },
  crema: { title: 'Crema',  desc: 'Wie sieht die Crema aus? Dicht, haselnussbraun und beständig vs. dünner, blasser Schaum.' },
  balance: {
    title: 'Balance',
    desc: 'Geschmackliches Gleichgewicht — keine Punkte, drei Stufen:',
    levels: [
      { color: '#6F4E37', label: 'Ausgewogen',                 desc: 'perfekt balanciert, weder zu sauer noch zu bitter' },
      { color: '#888888', label: 'Leicht sauer / Leicht bitter', desc: 'spürbare Tendenz, aber noch trinkbar' },
      { color: '#A94442', label: 'Zu sauer / Zu bitter',         desc: 'deutlich aus dem Gleichgewicht' },
    ],
  },
};

const COPY_EN = {
  title: 'How I rate',
  lead: 'Three criteria, honestly applied. Body and Crema on a 1–10 scale, Balance on a spectrum.',
  body:  { title: 'Body',  desc: 'How dense and substantial does the espresso feel in your mouth? Syrupy and full-bodied vs. watery and thin.' },
  crema: { title: 'Crema', desc: 'How does the crema look? Dense, hazelnut-brown and lasting vs. thin, pale foam.' },
  balance: {
    title: 'Balance',
    desc: 'Taste balance — no points, three levels:',
    levels: [
      { color: '#6F4E37', label: 'Balanced',                          desc: 'perfectly balanced, neither too acidic nor too bitter' },
      { color: '#888888', label: 'Slightly acidic / Slightly bitter', desc: 'noticeable tendency, but still drinkable' },
      { color: '#A94442', label: 'Too acidic / Too bitter',           desc: 'clearly out of balance' },
    ],
  },
};
