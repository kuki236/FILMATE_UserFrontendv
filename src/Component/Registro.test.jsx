import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Registro from './Registro';
import { loginUser, registerUser } from './filmateApi';

vi.mock('./filmateApi', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const renderRegistration = () =>
  render(
    <MemoryRouter initialEntries={['/registro']}>
      <Routes>
        <Route path="/" element={<div>Inicio de sesión destino</div>} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/menuPrincipal" element={<div>Cartelera destino</div>} />
      </Routes>
    </MemoryRouter>
  );

const completeForm = async (user) => {
  await user.type(screen.getByLabelText('Nombre Completo'), 'Ana Torres');
  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'secret123');
  await user.type(screen.getByLabelText('Nombre de Usuario'), 'ana_torres');
  await user.type(screen.getByLabelText('Documento'), '12345678');
};

describe('Registro', () => {
  it('stores the authenticated session when automatic login succeeds', async () => {
    const user = userEvent.setup();
    registerUser.mockResolvedValueOnce({ id_usuario: 20, username: 'ana_torres' });
    loginUser.mockResolvedValueOnce({
      access_token: 'jwt-registration',
      user: { id_usuario: 20, nombre: 'Ana Torres', username: 'ana_torres', correo: 'ana@example.com' },
    });
    renderRegistration();

    await completeForm(user);
    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    expect(await screen.findByText('Registro exitoso')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Cartelera destino')).toBeInTheDocument(), { timeout: 3_500 });
    expect(JSON.parse(sessionStorage.getItem('filmate_auth_session'))).toMatchObject({
      mode: 'registered',
      accessToken: 'jwt-registration',
      user: { id_usuario: 20 },
    });
  });

  it('does not create a tokenless session when automatic login fails', async () => {
    const user = userEvent.setup();
    registerUser.mockResolvedValueOnce({ id_usuario: 20, username: 'ana_torres' });
    loginUser.mockRejectedValueOnce(new Error('Login temporalmente no disponible'));
    renderRegistration();

    await completeForm(user);
    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    expect(await screen.findByText(/Tu cuenta fue creada/)).toBeInTheDocument();
    expect(sessionStorage.getItem('filmate_auth_session')).toBeNull();
    await waitFor(() => expect(screen.getByText('Inicio de sesión destino')).toBeInTheDocument(), { timeout: 3_500 });
  });
});
