# Automatización del manual de usuario

Este directorio permite reproducir la línea base visual y los entregables del manual FILMATE.

## Componentes

- `mock-server.mjs`: API local controlada para disponer de películas, funciones vigentes, asientos, dulcería y datos sociales sin alterar la base de datos del proyecto.
- `capture-screenshots.mjs`: recorre la aplicación con Chrome mediante Playwright Core y genera 24 capturas.
- `generate_manual.py`: genera las versiones Markdown, DOCX y PDF.
- `requirements.txt`: dependencias de Python para generar y validar documentos.

## Ejecución

Desde `FILMATE_UserFrontend`:

```powershell
npm install
node scripts/manual/mock-server.mjs
npm run dev -- --host 127.0.0.1
node scripts/manual/capture-screenshots.mjs
python -m pip install -r scripts/manual/requirements.txt
python scripts/manual/generate_manual.py
```

La captura requiere Google Chrome en:

```text
C:\Program Files\Google\Chrome\Application\chrome.exe
```

Se puede definir otra ruta mediante `CHROME_PATH`.

## Salidas

Los entregables se crean en `docs/manual-usuario/`:

- `Manual_de_Usuario_FILMATE.md`
- `Manual_de_Usuario_FILMATE.docx`
- `Manual_de_Usuario_FILMATE.pdf`
- `capturas/*.png`

Los documentos generados conservan la información académica definida en `generate_manual.py`.
