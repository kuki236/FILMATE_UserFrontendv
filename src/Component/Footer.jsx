import { Music2, X, BookOpen, ChevronRight } from 'lucide-react';

const footerGroups = [
  {
    title: 'SOBRE NOSOTROS',
    items: ['Quiénes somos', 'Nuestra historia'],
  },
  {
    title: 'CONTACTO',
    items: ['Contáctanos', 'Trabaja con nosotros'],
  },
  {
    title: 'AYUDA',
    items: ['Libro de reclamaciones'],
  },
];

const socialItems = [
  { label: 'Instagram', text: 'IG', color: 'from-pink-500 via-red-500 to-yellow-400' },
  { label: 'X', icon: X, color: 'from-slate-900 to-slate-950' },
  { label: 'Facebook', text: 'f', color: 'from-blue-500 to-blue-700' },
  { label: 'YouTube', text: '▶', color: 'from-red-500 to-red-600' },
  { label: 'TikTok', icon: Music2, color: 'from-slate-900 to-slate-950' },
];

export const Footer = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-5 text-3xl font-black uppercase tracking-wide text-white">
                {group.title}
              </h3>

              <div className="space-y-4">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex items-center gap-2 text-left text-2xl font-semibold text-slate-100 transition-colors hover:text-blue-300"
                  >
                    {item === 'Libro de reclamaciones' ? (
                      <BookOpen className="h-7 w-7 text-blue-300" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-500" />
                    )}
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-8 border-t border-slate-800 pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1 text-slate-100">
            <p className="text-lg font-bold">Filmate S.A. | RUC 20429683581</p>
            <p className="text-lg font-bold">Todos los derechos reservados 2025</p>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <p className="text-2xl font-bold text-white">Síguenos en:</p>
            <div className="flex flex-wrap items-center gap-4">
              {socialItems.map((social) => {
                const Icon = social.icon;

                return (
                  <button
                    key={social.label}
                    type="button"
                    aria-label={social.label}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-br ${social.color} text-white shadow-lg shadow-black/30 transition-transform hover:scale-105`}
                  >
                    {Icon ? (
                      <Icon className="h-7 w-7" />
                    ) : (
                      <span className="text-xl font-black leading-none">{social.text}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
