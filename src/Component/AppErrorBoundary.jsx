import { Component } from 'react';
import PropTypes from 'prop-types';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <section className="max-w-lg rounded-2xl border border-red-400/30 bg-slate-900 p-8 text-center">
            <h1 className="text-2xl font-black">No pudimos mostrar esta pantalla</h1>
            <p className="mt-3 text-slate-300">Recarga la página. Si el problema continúa, vuelve a la cartelera.</p>
            <a href="/menuPrincipal" className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700">
              Volver a la cartelera
            </a>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

AppErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppErrorBoundary;
