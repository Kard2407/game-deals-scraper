# GameScraper Deals — III Proyecto: Web Scraping Multinúcleo
### IC3101 Arquitectura de Computadoras — Tecnológico de Costa Rica (Campus San Carlos)

**Integrantes:**
* **Adrián Sánchez Orozco** (Bloque 2: Frontend, Performance & Documentación)
* **Kevin Rodríguez** (Bloque 1: Backend & Scraping Multinúcleo)

---

## 📌 Descripción del Proyecto

Este proyecto consiste en el diseño, implementación y evaluación experimental de un sistema distribuido y concurrente de **Web Scraping Multinúcleo** en 3 niveles, enfocado en el monitoreo y visualización de ofertas en videojuegos (*"Hottest Deals"*). El sistema procesa más de 200 títulos a partir de múltiples fuentes concurrentes (Steam, Epic Games Store, PlayStation Store, Xbox Store, Nintendo eShop, Amazon, Metacritic y HowLongToBeat) y los expone mediante una aplicación web pública interactiva.

---

## 🚀 Inicio Rápido (Ejecución Local en 1 Clic)

1. **Abrir la Aplicación Web:**
   * Haz doble clic en el archivo **`serve.bat`** ubicado en esta carpeta raíz.
   * O abre una terminal y ejecuta:
     ```powershell
     python -m http.server 8000 --directory web
     ```
   * Accede desde tu navegador a: **[http://localhost:8000/](http://localhost:8000/)**

2. **Ejecutar el Benchmark Multinúcleo (Speedup & Amdahl):**
   ```powershell
   python benchmark_engine/benchmark_runner.py
   ```
   *Detectará automáticamente los núcleos lógicos de tu procesador (ej. 8 cores), ejecutará las pruebas comparativas (Secuencial vs 1, 2, 4 y 8 núcleos) y actualizará los gráficos de la aplicación web.*

---

## 🎮 Características Implementadas (Bloque 2: Adrián Sánchez)

### 1. Página Web Pública (Catálogo "Hottest Deals")
* **Estilo Visual Gaming:** Diseño responsivo oscuro moderno (estilo SteamDB, CheapShark y Deku Deals) con acentos de color neón y badges luminosos de oferta.
* **Tarjetas de Juego:** Imagen de portada en alta definición, porcentaje de descuento destacado (`-75% OFF`), precio original tachado vs precio actual, plataforma, formato y Metascore con color dinámico (verde $\ge 75$, amarillo $50-74$, rojo $<50$).
* **Barra de Estadísticas en Vivo (Ticker):** Muestra el total de juegos en el repositorio (392 juegos), número de ofertas activas, mejor descuento del mercado y Metascore promedio.

### 2. Filtros, Búsqueda, Ordenamiento y Vista Detalle
* **Búsqueda Instantánea:** Filtrado en tiempo real por título de juego o editor.
* **Filtros Multidimensionales:**
  * **Formato:** Todos, Digital, Físico.
  * **Plataforma:** PC, PlayStation 5, Xbox Series X/S, Nintendo Switch, PlayStation 4, Xbox One.
  * **Tienda:** Steam, Epic Games Store, PlayStation Store, Xbox Store, Nintendo eShop, Amazon, GOG.
  * **Botón Rápido Hottest Deals:** Filtra con un solo clic ofertas con $\ge 50\%$ de descuento.
  * **Control Deslizante Metacritic:** Filtra títulos con puntuaciones superiores al umbral deseado (ej. $80+$).
* **Ordenamiento:** Mayor porcentaje de descuento, menor precio, mayor precio, score Metacritic, duración (HowLongToBeat) y alfabético.
* **Ventana Modal de Detalle por Juego:**
  * Cabecera inmersiva con arte/backdrop del juego y ficha técnica.
  * **Tabla comparativa multitienda en tiempo real (Nivel 3):** Lista todas las tiendas scrappeadas, resaltando en verde la tienda con el **Mejor Precio** (*"Mejor Oferta"*).
  * Desglose de horas estimadas en **HowLongToBeat** (Historia Principal, Extras y 100% Completista).
  * Sinopsis y lista de plataformas compatibles.

### 3. Dashboard Integrado de Rendimiento y Ley de Amdahl
* **Gráficos Interactivos con Chart.js:**
  * **Tiempo de Ejecución:** Comparativa entre la versión secuencial de referencia y ejecuciones paralelas con 1, 2, 4 y 8 núcleos.
  * **Speedup Observado:** Curva real de aceleración $S(p) = \frac{T_1}{T_p}$ frente a la aceleración lineal ideal.
  * **Eficiencia de Paralelización:** $E(p) = \frac{S(p)}{p} \times 100\%$.
  * **Desglose de Cuellos de Botella:** Distribución porcentual entre Latencia de Red (I/O-Bound), Cómputo CPU y Overhead de Sincronización.
* **Simulador Interactivo de la Ley de Amdahl:**
  * Permite al usuario/evaluador mover un control deslizante con la fracción paralelizable ($P$) y observar en tiempo real cómo cambia la curva teórica y el límite asintótico $S_{max} = \frac{1}{1 - P}$.

### 4. Sincronización Dinámica con el REPO (Integración Continua con Kevin)
* Interfaz de arrastrar y soltar (*Drag & Drop*) para importar datasets actualizados generados por el scraper de Kevin (`games.json`) sin requerir reiniciar la aplicación.

---

## 📁 Estructura del Directorio

```
Proyecto3_WebScraping/
├── web/                               # Aplicación web pública completa (Bloque 2)
│   ├── index.html                     # Página principal con catálogo, filtros, modal y dashboard
│   ├── css/
│   │   └── styles.css                 # Estilos modernos gaming, responsive y animaciones
│   ├── js/
│   │   ├── app.js                     # Lógica del catálogo, filtros, búsqueda, ordenamiento y modal
│   │   ├── benchmark.js               # Renderizado de gráficos Chart.js y simulador de Amdahl
│   │   └── data-loader.js             # Carga y sincronización de datos con tolerancia a fallos
│   └── data/
│       ├── games.json                 # Dataset estructurado de 392 juegos con ofertas
│       └── benchmark_results.json     # Resultados experimentales de pruebas multinúcleo
├── benchmark_engine/                  # Motor de pruebas de rendimiento (Bloque 2)
│   ├── benchmark_runner.py            # Ejecutor de pruebas multinúcleo secuencial vs paralelo
│   └── generate_dataset.py            # Generador y validador del repositorio de 200+ juegos
├── docs/                              # Documentación técnica completa requerida
│   ├── INFORME_TECNICO.md             # Informe técnico completo, cuellos de botella y Amdahl
│   ├── ARQUITECTURA_3_NIVELES.md      # Diagrama y detalle de la arquitectura concurrente
│   ├── MANUAL_INSTALACION_DESPLIEGUE.md # Guía de ejecución local y despliegue por URL
│   └── CONTRATO_API_KEVIN.md          # Especificación del contrato JSON para integración continua
├── serve.bat                          # Script de inicio rápido en Windows (1 clic)
└── README.md                          # Este documento
```

---

## 🌐 Despliegue Público por URL (Opciones Gratuitas)

Para cumplir con el requerimiento de estar accesible por URL:
* **GitHub Pages:** Sube la carpeta a un repositorio de GitHub, activa *Settings > Pages > Deploy from branch (`/web`)* y obtén una URL pública `https://tu-usuario.github.io/proyecto/`.
* **Vercel / Netlify:** Despliegue instantáneo conectando el repositorio o arrastrando la carpeta `web/` a [Netlify Drop](https://app.netlify.com/drop).
* *Consulta la guía completa en [docs/MANUAL_INSTALACION_DESPLIEGUE.md](file:///C:/Users/Adrian%20Sanchez/Documents/TEC/II%20Semestre/Arqui/Proyecto3_WebScraping/docs/MANUAL_INSTALACION_DESPLIEGUE.md).*
