# Barber Pro · GOAT STUDIO 777

Aplicación de gestión para GOAT STUDIO 777 en Chillán, Chile. El panel de administración reúne rendimiento, caja, servicios, metas y perfiles. La vista móvil del barbero permite registrar atenciones, ver comisiones y seguir su meta.

## Demostración local

Necesitas Node.js 22 o posterior y npm. Desde la raíz:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Abre [Barber Pro local](http://localhost:5173/login). Si Firebase no está configurado, el servidor de desarrollo ofrece los botones **Administrador** y **Barbero**. También puedes escribir cualquiera de estos usuarios y su contraseña. Son cuentas de ejemplo y sus datos se guardan en el navegador.

- Administrador `admin` · `DemoLocal777!`
- Barbero `barbero01` · `Local01!`
- Barbero `barbero02` · `Local02!`
- Barbero `barbero03` · `Local03!`
- Barbero `barbero04` · `Local04!`
- Barbero `barbero05` · `Local05!`

Si ya configuraste Firebase y quieres probar la demo, pon temporalmente `VITE_DEMO_MODE=true` en `frontend/.env`. La configuración aplica solo con el servidor de desarrollo. Si restableces la contraseña de un barbero en la demo, ese navegador usará la nueva contraseña.

Para usar claves personalizadas en una demo local, crea `frontend/.env.demo.local` con `VITE_DEMO_MODE=true` y define `VITE_DEMO_PASSWORD_ADMIN` y `VITE_DEMO_PASSWORD_BARBERO01` a `VITE_DEMO_PASSWORD_BARBERO05` para las cuentas que quieras personalizar. Arranca la demo con `npm --prefix frontend run dev -- --mode demo`. Usa este modo en `localhost`. El archivo está excluido de Git y el navegador puede leer las claves del modo demo.

## Configuración con Firebase

Para resolver el error de acceso de este proyecto, sigue la [guía paso a paso de barberpro-df017](CONFIGURAR_FIREBASE.md).

### 1. Configura el proyecto en Firebase Console

1. Abre [Firebase Console](https://console.firebase.google.com/), crea o selecciona un proyecto y copia su **ID de proyecto**.
2. En **Configuración del proyecto → General → Tus apps**, registra una app **Web** (`</>`) llamada Barber Pro. Copia los valores de `firebaseConfig`. [Guía oficial de instalación web](https://firebase.google.com/docs/web/setup)
3. Abre **Authentication → Comenzar → Método de acceso**, activa **Correo electrónico/contraseña** y guarda. Barber Pro convierte el nombre de usuario en un identificador interno para usar este proveedor. [Guía oficial de autenticación](https://firebase.google.com/docs/auth/web/password-auth)
4. En **Firestore Database**, crea la base de datos **(default)**, edición **Standard**, en **modo de producción**. [Guía oficial de Firestore](https://firebase.google.com/docs/firestore/quickstart)

### 2. Configura el frontend

Abre `frontend/.env`. Si el archivo aún no existe, copia `frontend/.env.example`. Reemplaza los valores `COPIA_...` por los de tu app web.

```dotenv
VITE_FIREBASE_API_KEY=COPIA_apiKey
VITE_FIREBASE_AUTH_DOMAIN=COPIA_authDomain
VITE_FIREBASE_PROJECT_ID=COPIA_projectId
VITE_FIREBASE_STORAGE_BUCKET=COPIA_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=COPIA_messagingSenderId
VITE_FIREBASE_APP_ID=COPIA_appId
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_FIREBASE_EMULATORS=false
VITE_DEMO_MODE=false
```

### 3. Configura el backend

Abre `backend/.env`. Si el archivo aún no existe, copia `backend/.env.example`. Usa el mismo ID de proyecto que en el frontend. Deja el correo y la clave vacíos para usar las credenciales de aplicación de Google.

```dotenv
PORT=3000
CORS_ORIGINS=http://localhost:5173
FIREBASE_PROJECT_ID=COPIA_projectId
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

En **Configuración del proyecto → Cuentas de servicio → Firebase Admin SDK**, genera la clave privada JSON y guárdala fuera del repositorio. En la terminal de PowerShell que usarás para crear las cuentas y arrancar el backend, define la ruta local de esa clave. [Guía oficial de credenciales del SDK Admin](https://firebase.google.com/docs/admin/setup)

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\ruta\privada\barber-pro-firebase-adminsdk.json'
```

La variable dura lo que dure esa terminal. Si abres otra terminal para ejecutar el backend, tendrás que definirla allí también.

### 4. Publica las reglas y el índice

Abre una terminal aparte en la raíz del repositorio. Inicia sesión con tu cuenta de Google y reemplaza `TU_ID_DE_FIREBASE` por el ID elegido en el primer paso. [Referencia de la CLI de Firebase](https://firebase.google.com/docs/cli)

```powershell
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore --project TU_ID_DE_FIREBASE
```

Si usas un proyecto con reglas de Firestore ya configuradas, revísalas antes de este paso. El despliegue aplica las reglas del repositorio a la base de datos configurada. Comprueba en **Firestore Database → Índices** que la construcción del índice haya terminado antes de usar el panel.

### 5. Genera las cuentas reales

En la terminal que tiene definida `GOOGLE_APPLICATION_CREDENTIALS`, ejecuta desde la raíz:

```powershell
npm --prefix backend ci
npm --prefix backend run crear-cuentas
```

El comando crea `admin` como administrador y `barbero01` a `barbero05` como empleados. También crea sus perfiles en Firestore. Cada contraseña combina una palabra corta con mayúscula inicial, cuatro números y un símbolo, por ejemplo `Corte4821!`. Copia las contraseñas de la terminal al crearlas y compártelas individualmente. Volver a ejecutar el comando conserva las contraseñas de las cuentas existentes.

### 6. Arranca Barber Pro

Inicia el backend desde la terminal que ya tiene las credenciales.

```powershell
npm --prefix backend run start:dev
```

En otra terminal, inicia el frontend.

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

Abre [el login](http://localhost:5173/login) e ingresa con el nombre de usuario y la contraseña del paso anterior. El perfil del administrador abre **Rendimiento** y el de cada barbero abre **Mi jornada**. En **Servicios**, carga el catálogo inicial. En **Equipo**, puedes completar los nombres, configurar las comisiones y crear cuentas adicionales con **Generar contraseña**.

Si Vite usa otro puerto, agrega su origen exacto a `CORS_ORIGINS` de `backend/.env` y reinicia el backend. Por ejemplo, `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5174`.

Si PowerShell bloquea los scripts de npm, ejecuta los mismos comandos con `npm.cmd` y `npx.cmd` en lugar de `npm` y `npx`.

Las cuentas nuevas tienen un usuario único de 3 a 32 caracteres. Usa letras sin tildes, números, puntos, guiones o guiones bajos, con una letra o un número al inicio. Authentication guarda un correo interno `usuario@barberpro.example` que no recibe mensajes. Si ya tenías cuentas configuradas con correo, conserva su correo como identificador en el mismo formulario.

## Restablecer una contraseña

1. En el login, **¿Olvidaste tu contraseña?** indica al barbero cómo pedir un restablecimiento al administrador.
2. Con la sesión de administrador abierta, ve a **Equipo**, ubica al barbero y pulsa **Restablecer**. Confirma el nombre de usuario en el cuadro **Restablecer contraseña**.
3. Copia la contraseña nueva y entrégala en privado al titular de la cuenta. La contraseña anterior queda reemplazada.

Si perdiste el acceso a la cuenta administradora, el responsable del proyecto puede generar otra contraseña desde el repositorio. Usa en PowerShell la misma credencial de Firebase Admin del paso 3 de la configuración y ejecuta:

```powershell
npm --prefix backend run restablecer-clave -- admin
```

Sustituye `admin` por el nombre de usuario si es distinto. El comando muestra la nueva contraseña en la terminal al restablecerla. Firebase Authentication aplica el cambio sobre la cuenta existente. [Gestión de usuarios de Firebase](https://firebase.google.com/docs/auth/admin/manage-users)

## Emuladores de Firebase

Puedes conectar ambos procesos a Authentication y Firestore locales con `npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-barber-pro`. El emulador de Firestore requiere Java. Copia los ejemplos de entorno y usa estos valores para iniciar los procesos:

- En `frontend/.env`, define `VITE_USE_FIREBASE_EMULATORS=true`, `VITE_DEMO_MODE=false` y `VITE_FIREBASE_PROJECT_ID=demo-barber-pro`.
- En `backend/.env`, define `FIREBASE_PROJECT_ID=demo-barber-pro`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
- Con los emuladores encendidos, ejecuta `npm --prefix backend run crear-cuentas`. Puedes ver los resultados en la [consola de emuladores](http://localhost:4000).

## Compilación y Hosting

```powershell
npm --prefix backend run build
npm --prefix frontend run build
```

Firebase Hosting sirve `frontend/dist` en el sitio `barberpro-777` del proyecto `barberpro-df017`. El frontend mantiene deshabilitado el acceso en la versión publicada mientras la API siga apuntando a `localhost`. Para habilitarlo, aloja NestJS en un servicio con HTTPS y define `CORS_ORIGINS=https://barberpro-777.web.app` en el backend. En `frontend/.env.production.local`, define `VITE_API_BASE_URL` con la URL HTTPS de NestJS terminada en `/api`.

Para compilar y publicar solo Hosting, ejecuta desde la raíz:

```powershell
npm --prefix frontend run build
npx -y firebase-tools@latest deploy --only hosting:barberpro-777 --project barberpro-df017
```

## Criterios del dashboard

- Las fechas y los límites del día se calculan en la zona horaria de Chile continental. Los montos están en CLP.
- Cada servicio activo cuenta como una atención para el rendimiento y la meta. Las anulaciones permanecen en el historial y se excluyen de caja, comisiones y avance.
- La atención conserva el precio, el nombre del servicio y la comisión aplicables al momento del registro. Los cambios al catálogo o a la comisión del perfil se aplican a nuevos registros.
- La meta se aplica por barbero y muestra el bono asociado. El avance abarca las fechas de la meta y no depende del filtro de rendimiento.
- El SDK web inicializa la caché local de Firestore. El registro, la anulación y los controles administrativos usan la API y requieren conexión con ella. [Documentación de persistencia de Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

## Identidad visual

- `frontend/public/goat-studio-777.png` conserva el logo aportado. La interfaz lo muestra en dorado sobre una placa oscura en el login y en ambos paneles.
- `frontend/public/studio-login.png` es una foto ilustrativa creada con la herramienta integrada de generación de imágenes. Este fue el prompt:

> Use case: photorealistic-natural. Asset type: editorial photo for the full-height left half of a premium barbershop staff login page. Portrait 4:5 composition. A refined, believable contemporary barber studio interior, empty, close viewpoint from just inside the shop. One distinctive black leather vintage barber chair in the middle foreground, understated antique brass frame, tall arched brass mirror and warm walnut station behind, pale plaster and subtle ambient lighting. Warm neutral grading, tactile real wood and leather, graceful strong light and shadows, measured editorial architecture photography. Leave dark low-detail useful negative space on lower quarter and upper left for separate HTML overlay. Full bleed. No people, no text, no logos, no watermark.
