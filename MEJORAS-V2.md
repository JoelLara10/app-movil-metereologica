# Brisa 2.0

## Novedades
- Buscador con sugerencias automáticas después de tres letras y 500 ms sin escribir. Se cancelan consultas anteriores y se ignoran respuestas desfasadas. Se puede buscar manualmente desde dos caracteres.
- Ubicación actual al iniciar, con permiso del usuario. Si no se autoriza o falla el GPS, hay búsqueda manual y opción de reintentar.
- Hasta ocho ubicaciones fijadas, persistidas en el dispositivo. Se pueden reordenar y eliminar desde Tus ubicaciones.
- Páginas horizontales para deslizar entre ubicación actual, ciudades fijadas y una ciudad consultada sin fijar. Las pestañas también permiten cambiar directamente.
- Pronóstico de las próximas doce horas y siete días, máximas y mínimas, probabilidad de lluvia, UV máximo, amanecer y atardecer.
- Cambio entre Celsius y Fahrenheit guardado como preferencia.
- Último clima de las ciudades fijadas disponible si falla la API; se identifica como datos guardados y conserva la fecha y hora originales.
- Búsquedas recientes, actualización al deslizar hacia abajo, indicadores de carga y estados de error.

## Arranque

```powershell
cd C:\10moCuatri\Vini\Actividad17-Brisa
npm install
npx expo start --clear
```

Usar Expo Go compatible con SDK 58 y escanear el nuevo QR. La ubicación requiere aceptar el permiso del teléfono y activar los servicios de ubicación. No se pide permiso de rastreo en segundo plano. En navegador, geolocalización necesita HTTPS o localhost; la geocodificación inversa del dispositivo solo se utiliza en Android/iOS, por lo que la versión web muestra coordenadas con el rótulo Ubicación actual.

## Uso
1. Al entrar, Brisa solicita la ubicación y consulta el clima del lugar. Si no se concede el permiso, usar Buscar una ciudad.
2. Abrir el buscador. Escribir, por ejemplo, Toluca y tocar una coincidencia. Se muestra también el estado y país para distinguir ciudades homónimas.
3. Tocar el marcador junto al nombre para fijar la ciudad. Repetir con otras ciudades.
4. Deslizar horizontalmente sobre la página para pasar de una ciudad a otra; también se puede tocar su pestaña superior. El pronóstico por horas tiene su propio desplazamiento horizontal.
5. Abrir el botón de cuadrícula para ordenar o eliminar ciudades. El botón °C/°F cambia las unidades.
6. Deslizar verticalmente hacia abajo o tocar el icono de actualización para refrescar.

## API y seguridad
Se sigue utilizando Open-Meteo por HTTPS, sin claves privadas, dentro del uso académico no comercial y con atribución CC BY 4.0. El endpoint de pronóstico ahora solicita campos current, hourly y daily para siete días. La búsqueda recupera hasta siete coincidencias. Se conservan la validación de nombres y coordenadas, la comprobación del JSON y HTTP y el timeout de doce segundos.

Las consultas meteorológicas se reutilizan durante cinco minutos en memoria, salvo actualización manual; se evitan solicitudes simultáneas para las mismas coordenadas y se deja al menos 1.5 segundos entre intentos. Tras un HTTP 429 se espera un minuto sin consultas automáticas adicionales.

AsyncStorage guarda fijadas, hasta cuatro búsquedas recientes, unidades y el último clima de las fijadas. No es almacenamiento cifrado: no se guardan contraseñas ni secretos. La posición GPS actual no se persiste. El proveedor recibe la IP y las coordenadas o el texto consultados. Los permisos solo se usan con la app abierta. Las respuestas guardadas no se presentan como nuevas cuando la actualización falla.

## Código
- App.js: estado, paginación, persistencia, ubicación y administración de fijadas.
- src/SearchSheet.js: buscador con autocompletado y cancelación.
- src/WeatherPage.js: clima actual, métricas y pronóstico.
- src/api.js: HTTPS, validación, errores y normalización de series.
- src/model.js: identificadores, límites, conversión y lectura validada del almacenamiento.
- src/location.js: permiso en primer plano, ubicación y resolución del nombre en dispositivos nativos.

## Verificación
`npm test` ejecuta nueve pruebas de validación, pronóstico, cancelación, duplicados, límites, almacenamiento y conversión de temperatura. `npm run build:web` exporta la aplicación web. Las pruebas originales y las nuevas permanecen en tests.

La prueba de interfaz de v2 está en tests/v2-browser.cjs. Requiere Playwright y Chromium. Se configura BRISA_URL con la URL donde se sirva dist; PLAYWRIGHT_PATH y CHROMIUM_PATH permiten usar instalaciones existentes. BRISA_EVIDENCE_DIR cambia la carpeta de salida. Prueba la ubicación con coordenadas simuladas y datos meteorológicos reales; también simula denegación del permiso y bloqueo del proveedor para validar el modo de datos guardados. Esos escenarios no acreditan una ejecución GPS real en teléfono.

Las capturas y el registro de v2 se guardan en evidencias/v2. El documento Actividad17-Documentacion-Brisa.docx se actualizó a la versión 2.0, con las funciones nuevas, capturas y pruebas. Las evidencias anteriores se conservan como historial. Este archivo documenta la versión 2.0.

## Documentación oficial
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api
- https://open-meteo.com/en/terms
- https://docs.expo.dev/versions/v58.0.0/sdk/location/
- https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/

