import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IniciarSesion from './IniciarSesion';
import { loginUser } from './filmateApi';

vi.mock('./filmateApi', () => ({
  loginUser: vi.fn(),
}));

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<IniciarSesion />} />
        <Route path="/menuPrincipal" element={<div>Cartelera destino</div>} />
        <Route path="/registro" element={<div>Registro destino</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('IniciarSesion', () => {
  it('validates required credentials before calling the API', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /Iniciar sesi/i }));

    expect(screen.getByText(/Ingresa correo y contrase/i)).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });

  it('saves a registered session and redirects after successful login', async () => {
    const user = userEvent.setup();
    loginUser.mockResolvedValueOnce({
      user: { id_usuario: 5, nombre: 'Valeria', username: 'vale' },
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText('correo@ejemplo.com'), 'vale@test.local');
    await user.type(screen.getByPlaceholderText(/Contrase/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /Iniciar sesi/i }));

    expect(await screen.findByText(/Bienvenido/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Cartelera destino')).toBeInTheDocument(), { timeout: 3_500 });
    expect(JSON.parse(localStorage.getItem('filmate_auth_session'))).toMatchObject({
      mode: 'registered',
      user: { username: 'vale' },
    });
  });

  it('allows continuing as guest and stores guest mode', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /entrar como invitado/i }));

    await waitFor(() => expect(screen.getByText('Cartelera destino')).toBeInTheDocument(), { timeout: 3_500 });
    expect(JSON.parse(localStorage.getItem('filmate_auth_session'))).toEqual({ mode: 'guest', user: null });
  });
});
