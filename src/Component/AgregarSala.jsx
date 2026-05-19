import React from 'react';
import './Modales.css';

export default function AgregarSala({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-contenedor">
        <div className="modal-cabecera">
          <h2 className="modal-titulo">Agregar Sala</h2>
          <div className="modal-estado">
            <label>Estado</label>
            <select className="select-estado">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <form className="modal-formulario">
          <h3 className="modal-subtitulo">Información</h3>
          
          <div className="input-grupo">
            <label>Nombre</label>
            <input type="text" placeholder="Nombre de la sala" />
          </div>

          <div className="fila-doble">
            <div className="input-grupo">
              <label>Tipo de Sala</label>
              <select className="select-tipo">
                <option value="2d">2D Regular</option>
                <option value="3d">3D</option>
                <option value="imax">IMAX</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div className="input-grupo">
              <label>Cant. de Asientos</label>
              <input type="number" placeholder="Ej. 120" />
            </div>
          </div>

          <div className="input-grupo">
            <label>Observaciones</label>
            <textarea rows="4" placeholder="Añade observaciones..."></textarea>
          </div>

          <div className="modal-botones">
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-agregar">Agregar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
