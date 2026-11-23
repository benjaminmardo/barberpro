# Configurar Firebase para Barber Pro

Esta guía corresponde al proyecto **barberpro-df017** y al sitio **barberpro-777**.

## Qué está causando el error del login

En la revisión del 19 de noviembre de 2026, la consulta de configuración de Authentication devolvió `CONFIGURATION_NOT_FOUND`. El primer paso es iniciar Authentication y habilitar el proveedor de contraseña en ese proyecto.

En una revisión posterior, Authentication ya permitió el acceso y se encontraron los cuatro perfiles reales. El backend requería la credencial de Firebase Admin también al iniciarse. La ruta local del JSON descargado quedó guardada en `backend/.env`, que está excluido de Git. Si aparece un problema de credencial, comprueba que ese archivo JSON siga en la ruta configurada y reinicia el backend.

El frontend carga la configuración de la aplicación web desde `frontend/.env`. Consulta en el [README](README.md#demostración-local) los accesos de demostración. Las cuentas de Firebase se crean en Authentication y tienen un perfil con rol en Firestore. El comando de creación entrega las contraseñas de las cuentas nuevas.

## 1. Inicializa Authentication

1. Abre [Authentication del proyecto](https://console.firebase.google.com/project/barberpro-df017/authentication/providers).
2. Comprueba que estás dentro de **barberpro-df017**.
3. Pulsa **Comenzar** o **Get started** si aparece.
4. Abre **Método de acceso** o **Sign-in method**.
5. Selecciona **Correo electrónico/contraseña**, activa el primer interruptor de este proveedor y guarda.

Barber Pro convierte `admin` en `admin@barberpro.example` internamente. Los barberos usan el mismo esquema. Por eso se habilita el proveedor de correo y contraseña aunque en el formulario se pida un nombre de usuario. [Documentación de Authentication](https://firebase.google.com/docs/auth/web/password-auth)

## 2. Crea la base de datos

1. Abre [Firestore del proyecto](https://console.firebase.google.com/project/barberpro-df017/firestore).
2. Si aún no existe una base, pulsa **Crear base de datos**.
3. Selecciona la edición **Standard** y la base de datos **(default)**.
4. Elige una ubicación de las ofrecidas y **modo de producción**.
5. Finaliza la creación.

Si ya existe la base predeterminada de este proyecto, continúa con ella. El comando del paso 5 creará los documentos que usa Barber Pro. [Documentación de creación de Firestore](https://firebase.google.com/docs/firestore/quickstart)

## 3. Descarga la credencial del backend

1. Abre [Configuración → Cuentas de servicio](https://console.firebase.google.com/project/barberpro-df017/settings/serviceaccounts/adminsdk).
2. En **Firebase Admin SDK**, pulsa **Generar nueva clave privada**.
3. Guarda el JSON en una carpeta privada fuera del repositorio. Por ejemplo, en tu carpeta Descargas.

Usa la ruta del archivo guardado al ejecutar el paso siguiente. El backend usa la cuenta de servicio para consultar perfiles y crear cuentas. [Documentación del SDK Admin](https://firebase.google.com/docs/admin/setup)

## 4. Configura el proyecto en tu computadora

Abre una terminal de PowerShell y sitúate en la raíz del repositorio. Ajusta la ruta a la carpeta donde guardaste el proyecto:

```powershell
Set-Location 'C:\Proyectos\barberpro'
```

Abre `backend/.env` y comprueba estos valores:

```dotenv
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5174
FIREBASE_PROJECT_ID=barberpro-df017
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

En esa misma terminal, define la ruta real de la clave JSON. Reemplaza el ejemplo por el nombre que descargaste:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\Credenciales\barberpro-firebase-adminsdk.json'
Test-Path -LiteralPath $env:GOOGLE_APPLICATION_CREDENTIALS
```

El último comando debe mostrar `True`. La variable pertenece a esa terminal. Si ejecutas el backend en otra terminal, define allí la misma variable.

El frontend ya tiene la configuración web. En `frontend/.env`, comprueba únicamente que sigan estos valores:

```dotenv
VITE_FIREBASE_PROJECT_ID=barberpro-df017
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_FIREBASE_EMULATORS=false
VITE_DEMO_MODE=false
```

## 5. Crea el administrador y los barberos

Desde la raíz, en la terminal que tiene definida la credencial:

```powershell
npm.cmd --prefix backend run crear-cuentas
```

Este comando crea las siguientes cuentas con sus perfiles:

- `admin`, con rol `administrador`.
- `barbero01` a `barbero05`, con rol `barbero`.

La terminal muestra la contraseña de cada cuenta al crearla. Cópiala. Si una cuenta ya existe y tiene el perfil esperado, el comando indica que conserva su contraseña actual.

Si perdiste la contraseña de una cuenta real, puedes restablecerla con la misma credencial:

```powershell
npm.cmd --prefix backend run restablecer-clave -- admin
```

El comando anterior cambia la contraseña de `admin` y muestra la nueva. Ejecútalo cuando necesites ese cambio.

## 6. Publica las reglas y el índice

Abre otra terminal en la raíz del repositorio:

```powershell
Set-Location 'C:\Proyectos\barberpro'
npx.cmd -y firebase-tools@latest login
npx.cmd -y firebase-tools@latest deploy --only firestore --project barberpro-df017
```

Completa el acceso con la cuenta de Google que administra el proyecto. Este paso aplica las reglas e índices de los archivos existentes. Comprueba en **Firestore → Índices** que el índice termine de crearse. [Documentación de la CLI](https://firebase.google.com/docs/cli)

## 7. Inicia la API y el frontend

En la terminal que ya tiene la credencial, inicia el backend. Si ya estaba iniciado, deténlo con **Ctrl+C** en su terminal antes de volver a iniciarlo:

```powershell
npm.cmd --prefix backend run start:dev
```

Deja esa terminal abierta. En otra terminal, desde la raíz:

```powershell
Set-Location 'C:\Proyectos\barberpro'
npm.cmd --prefix frontend run dev
```

Si Vite ya estaba abierto, reinícialo. Abre la dirección exacta que muestre. Para `http://localhost:5173`, entra a [Barber Pro](http://localhost:5173/login).

## 8. Entra con la cuenta real

Escribe `admin` y la contraseña que imprimió el comando `crear-cuentas`. El panel de administrador debe abrir **Rendimiento del equipo**.

En **Servicios**, carga el catálogo inicial. En **Equipo**, completa los nombres de los empleados y sus comisiones. Cada empleado entra con su nombre de usuario y su propia contraseña.

## Si aparece otro error

- **Authentication no está inicializado**. Revisa el proyecto y completa el paso 1.
- **El acceso con contraseña está deshabilitado**. Activa Correo electrónico/contraseña y guarda.
- **El usuario o la contraseña no coinciden**. Usa la contraseña de la cuenta real del paso 5. Si la cuenta se creó con un correo personal, ingresa ese correo completo.
- **Tu cuenta no tiene un perfil habilitado**. Comprueba en Firestore que exista `usuarios/UID` con el mismo UID de Authentication y el rol correspondiente. El comando del paso 5 crea ambos registros.
- **No pudimos conectar con el servidor**. Comprueba que la terminal del backend siga abierta y que `VITE_API_BASE_URL` termine en `/api`.
- **Could not load the default credentials**. Revisa la ruta JSON y ejecuta la API en la misma terminal del paso 4.
- **El servidor no tiene una credencial válida de Firebase Admin o no tiene permisos**. Comprueba `GOOGLE_APPLICATION_CREDENTIALS` en `backend/.env`, el archivo JSON y que pertenezca a `barberpro-df017`. Reinicia el backend después del cambio.
- **FAILED_PRECONDITION / índice requerido**. Espera a que termine de crearse el índice del paso 6.

Firebase Hosting también necesita una API pública HTTPS para abrir los paneles desde Internet. Los pasos anteriores permiten usar la aplicación completa en tu computadora.
