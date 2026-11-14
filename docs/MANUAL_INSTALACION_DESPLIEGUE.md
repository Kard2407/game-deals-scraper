# Manual de Instalación, Ejecución y Despliegue Público por URL
## IC3101 Arquitectura de Computadoras — III Proyecto: Web Scraping Multinúcleo
**Instituto Tecnológico de Costa Rica — Campus San Carlos**  
**Responsable (Bloque 2):** Adrián Sánchez Orozco  

---

## 1. Requisitos Previos del Sistema

* **Sistema Operativo:** Windows 10/11, Linux o macOS.
* **Navegador Web Moderno:** Google Chrome, Microsoft Edge, Mozilla Firefox o Safari.
* **Python (Opcional para ejecutar los scripts de benchmark y servidor local):** Versión 3.9 o superior.
* No se requieren dependencias pesadas de terceros ni compiladores externos; el frontend opera con estándares nativos de la web (HTML5, CSS3, JavaScript ES6) y librerías CDN reconocidas (Chart.js y FontAwesome).

---

## 2. Ejecución Local (Paso a Paso)

### Método 1: Con un solo clic (Windows)
1. Navega a la carpeta del proyecto:
   `C:\Users\Adrian Sanchez\Documents\TEC\II Semestre\Arqui\Proyecto3_WebScraping\`
2. Haz doble clic sobre el archivo **`serve.bat`**.
3. Se abrirá una ventana de comandos iniciando el servidor HTTP local en el puerto 8000.
4. Abre tu navegador web e ingresa a:
   ```
   http://localhost:8000/
   ```

### Método 2: Mediante Terminal o PowerShell
1. Abre una terminal (PowerShell o CMD) en la raíz del proyecto.
2. Ejecuta el servidor HTTP incorporado de Python apuntando al directorio `web/`:
   ```powershell
   cd "c:\Users\Adrian Sanchez\Documents\TEC\II Semestre\Arqui\Proyecto3_WebScraping"
   python -m http.server 8000 --directory web
   ```
3. Visita en tu navegador:
   ```
   http://localhost:8000/
   ```

---

## 3. Ejecución del Benchmark de Rendimiento Multinúcleo

Para recalcular las pruebas de velocidad secuencial vs paralela (1, 2, 4 y 8 núcleos) con la Ley de Amdahl:
1. Desde la terminal en la raíz del proyecto, ejecuta:
   ```powershell
   python benchmark_engine/benchmark_runner.py
   ```
2. El script detectará automáticamente los núcleos lógicos del procesador, correrá las pruebas comparativas y actualizará el archivo `web/data/benchmark_results.json`.
3. Al refrescar la página web en la pestaña **"Análisis de Rendimiento"**, todos los gráficos (Chart.js) reflejarán los nuevos resultados empíricos calculados.

---

## 4. Despliegue Público Gratuito por URL

El documento del proyecto establece como requisito: *"Diseñar y desplegar la aplicación web accesible por URL"*. A continuación se detallan las 3 alternativas más sencillas y profesionales para tener la web disponible en internet:

### Opción A: Despliegue en GitHub Pages (Recomendado)
1. Crea un repositorio en GitHub (por ejemplo `IC3101-WebScraping-Multicore`).
2. Sube la carpeta del proyecto o únicamente la carpeta `web/`.
3. En la pestaña del repositorio en GitHub:
   * Ve a **Settings** -> **Pages**.
   * En **Build and deployment** > **Source**, selecciona **Deploy from a branch**.
   * Selecciona la rama `main` y la carpeta `/web` (o `/root` si solo subiste el contenido de `web/`).
   * Haz clic en **Save**.
4. En menos de 2 minutos, GitHub te proporcionará una URL pública y segura (HTTPS):
   ```
   https://tu-usuario.github.io/IC3101-WebScraping-Multicore/
   ```

### Opción B: Despliegue Inmediato en Vercel
1. Ingresa a [https://vercel.com/](https://vercel.com/) e inicia sesión con GitHub.
2. Haz clic en **Add New Project** e importa el repositorio de GitHub.
3. En **Root Directory**, selecciona la carpeta `web`.
4. Haz clic en **Deploy**.
5. Obtendrás una URL instantánea con certificado SSL (ejemplo: `https://gamescraper-deals.vercel.app/`).

### Opción C: Despliegue "Drag & Drop" en Netlify (Sin Git)
1. Ingresa a [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta `web/` completa directamente desde el Explorador de Archivos de Windows a la página web de Netlify.
3. En cuestión de segundos, Netlify generará un enlace público accesible desde cualquier teléfono o computadora del mundo (ejemplo: `https://delightful-deal-games.netlify.app/`).

---

## 5. Verificación de Funcionamiento

Una vez desplegada o ejecutada localmente:
1. **Catálogo:** Verifica que aparezcan las tarjetas con carátula, descuentos en verde, puntuación de Metacritic y consolas.
2. **Filtros:** Prueba seleccionar una plataforma (ej. Nintendo Switch), una tienda (Steam) y activar el botón *"Solo Hottest Deals (≥50%)"*.
3. **Modal de Detalle:** Haz clic en *"Ver Detalle"* en cualquier juego para comprobar la tabla comparativa multitienda, datos de HowLongToBeat y sinopsis.
4. **Dashboard de Rendimiento:** Navega a la pestaña *"Análisis de Rendimiento"* y mueve el control deslizante de la Ley de Amdahl para verificar la interactividad.
