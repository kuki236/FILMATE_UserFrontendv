import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={['/social']}>
      <Routes>
        <Route
          path="/social"
          element={
            <ProtectedRoute requireRegistered>
              <div>Social privado</div>
            </ProtectedRoute>
          }
        />
        <Route path="/menuPrincipal" element={<div>Cartelera publica</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('redirects guests away from registered-only pages', () => {
    localStorage.setItem('filmate_auth_session', JSON.stringify({ mode: 'guest', user: null }));

    renderRoute();

    expect(screen.getByText('Cartelera publica')).toBeInTheDocument();
    expect(screen.queryByText('Social privado')).not.toBeInTheDocument();
  });

  it('renders protected content for registered sessions', () => {
    localStorage.setItem('filmate_auth_session', JSON.stringify({ mode: 'registered', user: { id_usuario: 1 } }));

    renderRoute();

    expect(screen.getByText('Social privado')).toBeInTheDocument();
  });
});
