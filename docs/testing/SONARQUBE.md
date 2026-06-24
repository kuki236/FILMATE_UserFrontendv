# Guia SonarQube - Filmate UserFrontend

## Archivos relevantes

- `sonar-project.properties`
- `coverage/lcov.info`
- `package.json`

## Preparar cobertura

Ejecutar antes del analisis:

```bash
npm run test:coverage
```

Esto genera:

```text
coverage/lcov.info
```

SonarQube usa ese archivo mediante:

```properties
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

## Ejecutar contra SonarQube local

Con un servidor SonarQube disponible, por ejemplo `http://127.0.0.1:9000`, ejecutar:

```bash
npm run sonar -- --define sonar.host.url=http://127.0.0.1:9000 --define sonar.token=<TOKEN>
```

Si el servidor usa una version antigua que no acepta `sonar.token`, usar:

```bash
npm run sonar -- --define sonar.host.url=http://127.0.0.1:9000 --define sonar.login=<TOKEN>
```

## Resultado del intento actual

Se intento ejecutar:

```bash
npm run sonar -- --define sonar.host.url=http://127.0.0.1:9000
```

Resultado:

```text
SonarQube server [http://127.0.0.1:9000] can not be reached
Connection refused
```

Interpretacion: la configuracion del proyecto y el scanner estan instalados, pero no hay servidor SonarQube escuchando en `127.0.0.1:9000` dentro de este entorno.

## Recomendacion CI

Orden sugerido:

```bash
npm ci
npm run lint
npm run test:coverage
npm run build
npm run test:e2e
npm run sonar -- --define sonar.host.url=$SONAR_HOST_URL --define sonar.token=$SONAR_TOKEN
```

Variables requeridas:

- `SONAR_HOST_URL`
- `SONAR_TOKEN`

No guardar tokens dentro del repositorio.
