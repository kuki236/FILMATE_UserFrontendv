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
    <footer className="border-t border-slate-800 bg-slate-950 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-7 sm:gap-10 lg:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-white sm:mb-5 sm:text-2xl lg:text-3xl">
                {group.title}
              </h3>

              <div className="space-y-1 sm:space-y-3">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex items-center gap-2 text-left text-base font-semibold text-slate-100 transition-colors hover:text-blue-300 sm:text-lg lg:text-2xl"
                  >
                    {item === 'Libro de reclamaciones' ? (
                      <BookOpen className="h-5 w-5 text-blue-300 sm:h-6 sm:w-6" />
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

        <div className="mt-8 flex flex-col gap-6 border-t border-slate-800 pt-6 sm:mt-12 sm:gap-8 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1 text-slate-100">
            <p className="text-sm font-bold sm:text-base lg:text-lg">Filmate S.A. | RUC 20429683581</p>
            <p className="text-sm font-bold sm:text-base lg:text-lg">Todos los derechos reservados 2025</p>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <p className="text-lg font-bold text-white sm:text-xl lg:text-2xl">Síguenos en:</p>
            <div className="flex flex-wrap items-center gap-4">
              {socialItems.map((social) => {
                const Icon = social.icon;

                return (
                  <button
                    key={social.label}
                    type="button"
                    aria-label={social.label}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-gradient-to-br ${social.color} text-white shadow-lg shadow-black/30 transition-transform hover:scale-105 sm:h-14 sm:w-14`}
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
