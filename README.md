# Actividad 17 — Brisa: consulta meteorológica

**Asignatura:** Desarrollo móvil · **Docente:** R. Vinicio Camacho  
**Escenario elegido:** A. Consulta meteorológica  
**Equipo / integrantes:** Joel Alejandro Lara Rodriguez, Jaime Diaz Gonzalez, Marcelino Zahid Galicia Bonifacio, Jesus Diaz Serafin

## Objetivo y solución
Prototipo nuevo en React Native y Expo que consume una API externa sin base de datos propia. Permite buscar ciudades, elegir entre ubicaciones homónimas, consultar temperatura y condición meteorológica, humedad, viento y sensación térmica, y actualizar el resultado. Los datos permanecen únicamente en memoria. No solicita GPS ni registro.

## Ejecutar
Requisitos: Node.js 22, npm y Expo Go compatible con Expo SDK 57 (o emulador/build de desarrollo compatible).

```powershell
cd C:\9noCuatri\examen-vini\app-web-unidad2\actividad17\brisa
npm install
npm start
```

Escanear el QR desde Expo Go; teléfono y computadora deben estar en la misma red. Para probar en navegador: `npm run web`. Para exportar: `npm run build:web`. Si Expo Go instalado usa otro SDK, utilizar una versión compatible o migrar el proyecto con la guía oficial de Expo. No se ha verificado en dispositivo físico.

## Identificación de la API
Proveedor: Open-Meteo. Formato JSON, método GET, transporte HTTPS.

| Uso | Endpoint | Parámetros |
| --- | --- | --- |
| Buscar ciudades | https://geocoding-api.open-meteo.com/v1/search | name, count=5, language=es, format=json |
| Consultar clima | https://api.open-meteo.com/v1/forecast | latitude, longitude, current, timezone=auto |

`current` solicita `temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`. Unidades predeterminadas: °C, %, km/h. `weather_code` se traduce usando los códigos WMO documentados por el proveedor. La hora mostrada corresponde a la ubicación consultada.

La búsqueda devuelve `{ "results": [{ "id": 3515302, "name": "Toluca de Lerdo", "latitude": 19.28786, "longitude": -99.65324, "country": "México" }] }`. Si no hay coincidencias puede omitir `results`.

El clima devuelve `current`, `current_units` y `timezone`. Ejemplo de campos: `current.temperature_2m`, `current.weather_code`, `current.relative_humidity_2m`. Los valores concretos obtenidos se conservan en `evidencias/consultas-reales.json`.

Documentación consultada el 31 de octubre de 2026:
- Clima: https://open-meteo.com/en/docs
- Ubicaciones: https://open-meteo.com/en/docs/geocoding-api
- Condiciones: https://open-meteo.com/en/terms
- Planes: https://open-meteo.com/en/pricing
- Licencia: https://creativecommons.org/licenses/by/4.0/

El acceso gratuito no comercial no exige clave. Este prototipo es académico: un eventual uso comercial requiere revisar y contratar el acceso correspondiente. Los límites publicados son menos de 600 peticiones/minuto, 5,000/hora y 10,000/día. El servicio gratuito no garantiza disponibilidad. La licencia de los datos es CC BY 4.0; la interfaz acredita a Open-Meteo y enlaza la licencia. Las ubicaciones proceden de GeoNames vía Open-Meteo. Se indica que los datos se resumen y las condiciones se traducen.

## Seguridad y disponibilidad
- URLs HTTPS fijas: la entrada del usuario nunca define el servidor de destino.
- Sin claves, contraseñas, cuentas ni base de datos. No hacen falta archivos `.env`.
- Búsqueda recortada a 2–80 caracteres y lista permitida de letras Unicode, números, espacios y puntuación propia de nombres. Parámetro codificado con `encodeURIComponent`.
- Latitud y longitud numéricas dentro de los rangos válidos antes de consultar.
- Verificación del estado HTTP y de los campos JSON antes de mostrarlos.
- Timeout de 12 segundos con AbortController; mensajes para fallos de red, JSON inválido, datos incompletos, HTTP 429 y otros fallos HTTP.
- No consulta por cada pulsación. Botones bloqueados durante la operación y pausa local de 1.5 segundos entre operaciones. Esto reduce clics duplicados, pero no sustituye los límites globales por IP del proveedor.
- No hay reintentos automáticos. En HTTP 429 se pide esperar; el usuario decide reintentar. Si una actualización falla, el resultado anterior mantiene su hora para identificar su antigüedad.
- El proveedor recibe la IP y los términos de búsqueda de quien consulta. No se solicita ubicación precisa del dispositivo ni se agrega analítica.
- No desactivar la validación TLS. En este equipo se usó `NODE_USE_SYSTEM_CA=1` para confiar en los certificados del sistema y completar las verificaciones.

## Dos casos de prueba documentados

### Caso 1 — Ciudades válidas con parámetros distintos
Justificación: comprobar el recorrido completo búsqueda → coordenadas → clima, interpretación JSON y unidades, incluyendo ubicaciones en zonas horarias diferentes.

Pasos: buscar `Toluca`, elegir Toluca de Lerdo; después buscar `Madrid`, elegir Madrid. En cada ciudad consultar y actualizar el clima.

Esperado: ubicación correcta, temperatura, condición y al menos humedad/viento; indicador durante la consulta. La actualización conserva la ciudad y solicita datos otra vez.

Resultado ejecutado por `npm run test:live`: ambas búsquedas y consultas GET respondieron correctamente. Toluca devolvió 17 °C, humedad 42 %, viento 6.1 km/h y código 3 (Nublado); Madrid 20.5 °C, humedad 42 %, viento 3.5 km/h y código 1 (Parcialmente nublado). Son valores de la ejecución, no constantes del prototipo. Las respuestas y tiempos quedan en `evidencias/consultas-reales.json`. La prueba de interfaz en Chromium a 390 × 844 también verificó buscar, seleccionar y actualizar ambas ciudades sin errores JavaScript. Capturas: `evidencias/01-toluca.png` y `evidencias/02-madrid.png`. No se ejecutó en dispositivo físico.

### Caso 2 — Consulta inexistente y entradas/servicio adversos
Justificación: verificar que una búsqueda sin coincidencias no cause errores de renderizado y que no se envíen parámetros inválidos ni se presenten datos incompletos como válidos.

Pasos: buscar `zzzxxyyqqnoexiste`; probar entrada vacía, `A` y `<script>`. Ejecutar `npm test` para simular HTTP 429/503, desconexión, JSON inválido y clima incompleto.

Esperado: sin coincidencias se muestra mensaje específico; entrada inválida se rechaza antes de la red; fallos del proveedor se convierten en errores legibles.

Resultado: consulta real inexistente sin resultados. Tres grupos de pruebas automatizadas aprobados, incluyendo rechazo local, codificación de acentos, respuesta válida y escenarios adversos simulados. Las simulaciones no representan fallos reales provocados en el proveedor. Comandos reproducibles: `npm test` y `npm run test:live`.

## Guion de demostración
1. Abrir Brisa y explicar que no utiliza una base propia.
2. Buscar Toluca y seleccionar la ubicación correcta.
3. Señalar temperatura, condición, humedad, viento y hora del servicio.
4. Actualizar y observar el indicador de carga.
5. Buscar Madrid y luego una ciudad inexistente.
6. Mostrar atribución, código `src/api.js` y evidencia JSON.

## Archivos para entregar
`App.js`: pantalla móvil. `src/api.js`: validación y consumo GET. `tests/`: verificaciones automatizadas y consultas reales. `evidencias/`: respuestas y capturas cuando estén disponibles. `package.json`, `app.json`, `index.js`: proyecto reproducible. Este README: documentación de API, seguridad y pruebas. No entregar `node_modules`, `.expo` ni cachés npm.


## Evidencia visual y compilación
La exportación Expo para web terminó correctamente (197 módulos). Se probó la interfaz en Chromium con ancho de teléfono; las tres capturas corresponden a la aplicación real, sin respuestas simuladas. videncias/03-sin-resultados.png documenta la búsqueda inexistente. La prueba de interfaz está en 	ests/browser.cjs; requiere Playwright y Chromium, configurables con PLAYWRIGHT_PATH y CHROMIUM_PATH, y servir dist en http://127.0.0.1:8177. La herramienta agent-browser no pudo instalarse por la descarga del paquete; se utilizó Playwright local.

Para la comprobación local se reutilizaron dependencias existentes mediante un enlace de node_modules, excluido del ZIP. En otra computadora ejecutar npm install dentro del proyecto. La instalación limpia y el uso en dispositivo físico quedan pendientes de comprobar.

