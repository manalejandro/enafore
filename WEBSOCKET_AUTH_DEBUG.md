# Depuración de error 401 en WebSocket Streaming

## Problema
Error 401 Unauthorized al conectarse a `wss://social.manalejandro.com/api/v1/streaming`

**Headers observados:**
- Servidor: nginx
- Content-Type: application/json (indica mensaje de error)
- Content-Length: 52 bytes (mensaje de error JSON)
- El token SÍ se está enviando correctamente en la URL

## Causas Posibles (ordenadas por probabilidad)

### 1. Token inválido o sin permisos correctos ⭐ MÁS PROBABLE
El servidor Mastodon está rechazando el token activamente con un 401, lo que indica:
- **Token expirado**: Mastodon tokens pueden expirar
- **Token revocado**: Si cambiaste contraseña o revocaste acceso
- **Permisos insuficientes**: El token no tiene el scope necesario para streaming

**Solución:**
1. **Cierra sesión en Enafore**
2. **Vuelve a iniciar sesión** - esto generará un nuevo token válido
3. **Verifica los permisos** al autorizar (debe incluir lectura de timeline)

### 2. Problema del servicio de streaming en el servidor
El servicio de streaming de Mastodon (Node.js) podría:
- No tener acceso a la base de datos para validar tokens
- Estar configurado incorrectamente
- Usar una versión antigua con bugs conocidos

**Para verificar (si tienes acceso al servidor):**
```bash
# Ver logs del servicio de streaming
journalctl -u mastodon-streaming -f

# O en Docker:
docker logs mastodon-streaming -f
```

### 3. Configuración de nginx
Aunque poco probable (los headers CORS son correctos), nginx podría estar:
- Modificando la petición
- Bloqueando ciertos tokens
- Timeout muy corto

## Verificación rápida

### En Enafore (después de rebuild):
1. **Abre DevTools** (F12) → Console
2. **Recarga la aplicación**
3. **Busca estos mensajes:**
   ```
   Building WebSocket URL for stream 'user':
     - API: wss://social.manalejandro.com
     - Token: X739ZBBcuC...s2JcsA (69 chars)
     - Full URL: wss://social.manalejandro.com/api/v1/streaming?...
   ✗ Access token rejected by streaming server (401)
   ⚠ Authentication error detected!
   ```

### En el cliente web oficial de Mastodon:
1. Ve a `https://social.manalejandro.com`
2. Abre DevTools → Network → WS (WebSocket)
3. ¿Funciona el streaming ahí?
   - **SÍ** → El problema es el token de Enafore (regenerar)
   - **NO** → El problema es del servidor

## Solución RECOMENDADA

### Paso 1: Regenerar token (⭐ Prueba esto primero)
1. En Enafore, ve a **Configuración** → **Instancias**
2. Haz clic en tu instancia (social.manalejandro.com)
3. Haz clic en **Cerrar sesión**
4. Vuelve a **iniciar sesión** con tus credenciales
5. Autoriza la aplicación con todos los permisos necesarios

Esto generará un token nuevo y debería resolver el problema si es un issue de token expirado/inválido.

### Paso 2: Verificar el servicio de streaming (requiere acceso al servidor)
Si el Paso 1 no funciona, el problema está en el servidor:

```bash
# Verificar que el servicio está corriendo
systemctl status mastodon-streaming

# Ver logs en tiempo real
journalctl -u mastodon-streaming -f

# Reiniciar el servicio
systemctl restart mastodon-streaming
```

### Paso 3: Verificar configuración de base de datos
El servicio de streaming necesita acceso a PostgreSQL. Verifica:

```bash
# En .env.production o variables de entorno:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mastodon_production
DB_USER=mastodon
DB_PASS=tu_password
```

## Información técnica adicional

### ¿Por qué el navegador no muestra el cuerpo del error?
WebSocket upgrade failures (101 → 401) no exponen el body del response al JavaScript por seguridad. Solo vemos:
- Status code: 401
- Close code: 1002, 1006, o 1008
- Sin acceso al mensaje JSON de error

### Códigos de cierre WebSocket relevantes:
- **1002**: Protocol error (servidor rechazó la conexión)
- **1006**: Abnormal closure (conexión cerrada sin handshake, común con 401)
- **1008**: Policy violation (puede indicar autenticación fallida)
- **1011**: Server error (error interno del servidor)

## Cambios realizados en el código

1. **[getStreamUrl.ts](src/routes/_api/stream/getStreamUrl.ts)**
   - Muestra detalles del token (parcialmente oculto)
   - Muestra la URL completa (con token censurado)
   - Advertencia si no hay token

2. **[TimelineStream.js](src/routes/_api/stream/TimelineStream.js)**
   - Detecta errores de autenticación (códigos 1002, 1006, 1008, 1011)
   - Mensajes de error más descriptivos
   - Sugerencias de solución cuando detecta error de auth

3. **[websocket.js](src/routes/_thirdparty/websocket/websocket.js)**
   - Logging mejorado de errores de cierre
   - Detección específica de errores de autenticación
   - Guía de troubleshooting en consola

4. **[verifyStreamAccess.js](src/routes/_api/stream/verifyStreamAccess.js)** (NUEVO)
   - Intenta verificar el token antes de conectar WebSocket
   - Proporciona advertencia temprana si el token es inválido

5. **[streaming.js](src/routes/_actions/stream/streaming.js)**  
   - Integra verificación de token
   - Advertencia proactiva si el token falla la verificación

## Cómo usar los nuevos logs

Después del rebuild, busca en la consola:

✅ **Conexión exitosa:**
```
Building WebSocket URL for stream 'user':
  - API: wss://social.manalejandro.com
  - Token: X739ZBBcuC...2JcsA (69 chars)
✓ Streaming access verified
✓ WebSocket opened successfully for timeline: home
```

❌ **Error de autenticación:**
```
Building WebSocket URL for stream 'user':
  - API: wss://social.manalejandro.com  
  - Token: X739ZBBcuC...2JcsA (69 chars)
✗ Access token rejected by streaming server (401)
⚠ Token verification failed: Token rejected
WebSocket closed for timeline home - Code: 1006, Reason: none
⚠ Authentication error detected!
Possible causes:
  1. Access token is invalid or expired
  2. Server streaming configuration issue
  3. Token does not have required permissions
Try logging out and logging back in to refresh your token.
```

## Próximos pasos

1. ✅ **Rebuild completo**: `npm run build`
2. 🔄 **Recarga Enafore** y abre la consola (F12)
3. 📋 **Revisa los logs** detallados
4. 🔑 **Cierra sesión y vuelve a iniciar** para regenerar token
5. ✉️ **Si persiste**: Contacta al admin de social.manalejandro.com con los logs

## Referencias

- [Mastodon Streaming API Docs](https://docs.joinmastodon.org/methods/streaming/)
- [WebSocket API MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WebSocket Close Codes](https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1)

1. **Verifica el archivo de configuración de nginx** (generalmente en `/etc/nginx/sites-available/`)
2. **Asegúrate de que la sección de streaming permita query params**
3. **Reinicia nginx**: `sudo systemctl restart nginx`

### Alternativa: Usar endpoint HTTP Streaming
Algunos servidores ofrecen streaming sobre HTTP en lugar de WebSocket.
(Esta funcionalidad requeriría modificaciones adicionales en Enafore)

## Cambios realizados

1. **Agregado logging mejorado** en `getStreamUrl.ts` para ver la URL exacta (con token oculto)
2. **Mejor manejo de errores** en `TimelineStream.js` para identificar problemas de autenticación
3. **Mensajes de error más descriptivos** cuando el websocket se cierra anormalmente

## Próximos pasos

1. Verifica los logs en la consola del navegador después de reconstruir
2. Si confirmas que es un problema del servidor, contacta al administrador de `social.manalejandro.com`
3. Como workaround temporal, puedes usar el cliente web oficial hasta que se solucione
