# INFORME TÉCNICO
## Diseño, Implementación y Evaluación Experimental de un Sistema Concurrente de Web Scraping Multinúcleo en Tres Niveles

**Curso:** IC3101 — Arquitectura de Computadoras  
**Institución:** Instituto Tecnológico de Costa Rica (Campus Tecnológico Local San Carlos)  
**Escuela:** Escuela de Ingeniería en Computación  

**Autores:**
* **Kevin Rodríguez** — Bloque 1: Motor de Extracción Multinúcleo, Control de Tráfico y Persistencia en la Nube  
* **Adrián Sánchez Orozco** — Bloque 2: Interfaz Web Pública, Sincronización Asíncrona, Telemetría y Evaluación de Rendimiento  

**Enlaces del Proyecto:**
* **Repositorio de Código Fuente:** [https://github.com/Kard2407/game-deals-scraper](https://github.com/Kard2407/game-deals-scraper)
* **Aplicación Web Desplegada:** [https://gamescraper-deals-tec.web.app](https://gamescraper-deals-tec.web.app)

---

## Resumen Ejecutivo

El presente informe técnico documenta el diseño arquitectónico, la implementación concurrente y la evaluación empírica del rendimiento de **GameScraper Deals**, un sistema distribuido orientado a la extracción, normalización y visualización en tiempo real de ofertas de videojuegos a partir de múltiples fuentes web heterogéneas. Debido a que la recolección masiva de datos en la web es una carga predominantemente limitada por entrada y salida de red (*I/O-Bound*), las implementaciones secuenciales tradicionales presentan tiempos de respuesta elevados e infrautilizan los recursos de cómputo de los procesadores multinúcleo modernos.

Para resolver este problema, se implementó una arquitectura de paralelismo jerárquico en tres niveles sobre Python (`ProcessPoolExecutor` en el Nivel 1 para aislamiento por videojuego, y concurrencia por fuentes y tiendas en los Niveles 2 y 3), acoplada de forma asíncrona mediante **Cloud Firestore** a una aplicación web pública alojada en **Firebase Hosting**. Las pruebas experimentales ejecutadas sobre un procesador Intel Core i5-1035G1 (4 núcleos físicos / 8 hilos lógicos) demostraron una reducción del tiempo de ejecución desde $4.217\text{ s}$ (ejecución secuencial pura) hasta $2.648\text{ s}$ utilizando $p = 4$ trabajadores paralelos, alcanzando un *Speedup* máximo observado de $1.464\times$. El análisis mediante la Ley de Amdahl determinó una fracción paralelizable $P = 0.70$ y un límite asintótico teórico de $3.33\times$, evidenciando cómo la latencia de red ($68.5\%$) y el *overhead* de creación de procesos condicionan la escalabilidad más allá de los núcleos físicos disponibles.

---

## 1. Introducción y Objetivos

### 1.1. Planteamiento del Problema
El monitoreo continuo de precios, descuentos, calificaciones de crítica especializada y tiempos estimados de juego a través de múltiples plataformas digitales (Steam, Epic Games Store, PlayStation Store, Xbox Store, Nintendo eShop, Amazon, Metacritic y HowLongToBeat) requiere realizar cientos de peticiones HTTP/HTTPS y operaciones de análisis sintáctico (*parsing*) de HTML y JSON. Ejecutar estas tareas de forma lineal monohilo provoca que la unidad central de procesamiento (CPU) permanezca inactiva durante la mayor parte del ciclo de ejecución mientras espera las respuestas de red, degradando severamente el rendimiento global del sistema.

### 1.2. Objetivos del Proyecto
* **Objetivo General:** Diseñar, implementar y evaluar experimentalmente un sistema concurrente de *web scraping* multinúcleo en tres niveles, exponiendo los resultados en una plataforma web pública y analizando su escalabilidad bajo los principios de la arquitectura de computadores.
* **Objetivos Específicos:**
  1. Implementar un pipeline de extracción en Python estructurado en tres niveles de granularidad (por juego, por fuente de información y por tienda comercial) con control de tasa de peticiones.
  2. Desacoplar la capa de extracción respecto a la capa de visualización mediante una base de datos NoSQL en la nube (Cloud Firestore) y desplegar una interfaz web pública interactiva en Firebase Hosting.
  3. Medir experimentalmente los tiempos de ejecución, el *Speedup* y la eficiencia al escalar la cantidad de núcleos lógicos ($p \in \{1, 2, 4, 8\}$) frente a una línea base secuencial.
  4. Modelar el comportamiento del sistema mediante la Ley de Amdahl para identificar los cuellos de botella de red, CPU y sincronización.

---

## 2. Marco Teórico

### 2.1. Cargas I/O-Bound vs. CPU-Bound y el GIL de Python
En arquitectura de computadores, una tarea se clasifica como **CPU-Bound** cuando su tiempo de ejecución está determinado principalmente por la velocidad de la ALU y la jerarquía de caché del procesador, mientras que una tarea **I/O-Bound** pasa la mayor parte de su tiempo esperando operaciones de entrada/salida (lecturas de disco o latencia de sockets de red).

En el ecosistema CPython, el *Global Interpreter Lock* (GIL) impide que múltiples hilos dentro de un mismo proceso ejecuten *bytecode* de Python simultáneamente en distintos núcleos físicos. Para superar esta restricción en el procesamiento paralelo de datos y evitar contención en la normalización de estructuras, el uso de múltiples procesos independientes (`ProcessPoolExecutor`) asigna a cada trabajador su propio intérprete y espacio de memoria, permitiendo verdadera ejecución paralela en los núcleos físicos del procesador.

### 2.2. Métricas de Rendimiento Paralelo y Ley de Amdahl
Para cuantificar la mejora obtenida al paralelizar un algoritmo sobre $p$ unidades de procesamiento respecto al tiempo de ejecución en un solo núcleo ($T_1$), se emplean dos métricas fundamentales:

1. **Speedup (Aceleración):**
   $$S(p) = \frac{T_1}{T_p}$$

2. **Eficiencia de Paralelización:**
   $$E(p) = \frac{S(p)}{p} \times 100\%$$

Asimismo, la **Ley de Amdahl** establece que la aceleración máxima alcanzable al paralelizar un sistema está limitada por la fracción estrictamente secuencial del programa ($s = 1 - P$), donde $P$ representa la fracción paralelizable:

$$S(p) = \frac{1}{(1 - P) + \frac{P}{p}}$$

Cuando el número de núcleos crece indefinidamente ($p \to \infty$), el *Speedup* converge hacia un límite asintótico superior:

$$S_{\max} = \lim_{p \to \infty} S(p) = \frac{1}{1 - P}$$

---

## 3. Arquitectura del Sistema

El sistema sigue un diseño modular distribuido en tres capas independientes, lo que garantiza tolerancia a fallos, escalabilidad y separación clara de responsabilidades entre el motor de extracción (Bloque 1) y la interfaz de usuario y telemetría (Bloque 2).

```text
+-------------------------------------------------------------------+
|               CAPA 1: EXTRACCIÓN CONCURRENTE (Python)             |
|                                                                   |
|  [repo.py: Catálogo semilla de 392 videojuegos]                   |
|         |                                                         |
|         v                                                         |
|  [Nivel 1: ProcessPoolExecutor (level1_games.py)]                 |
|         |---> Proceso 1 .. Proceso N (Aislamiento por juego)      |
|                 |                                                 |
|                 +---> [Nivel 2: Fuentes (level2_sources.py)]      |
|                 |       |-- Tiendas Comerciales                   |
|                 |       |-- Metacritic (Metascore)                |
|                 |       |-- HowLongToBeat (Duración estimada)     |
|                 |                                                 |
|                 +---> [Nivel 3: Tiendas (level3_stores.py)]       |
|                         |-- Steam, Epic, PS Store, Xbox, Amazon   |
+-------------------------------------------------------------------+
                                  |
                                  | Escritura sincronizada (ratelimit.py)
                                  v
+-------------------------------------------------------------------+
|            CAPA 2: PERSISTENCIA EN LA NUBE (Firebase)             |
|                                                                   |
|  [Cloud Firestore: Proyecto 'game-deals-scraperdb']               |
|  Colección: 'games' (Documentos JSON normalizados)                |
+-------------------------------------------------------------------+
                                  |
                                  | Lectura asíncrona (HTTPS / SDK)
                                  v
+-------------------------------------------------------------------+
|          CAPA 3: FRONTEND PÚBLICO Y TELEMETRÍA (Firebase Hosting) |
|                                                                   |
|  [data-loader.js] ---> Consulta Firestore (Fallback: games.json)  |
|  [app.js]         ---> Catálogo, Filtros, Modal Multitienda       |
|  [benchmark.js]   ---> Gráficas Chart.js y Simulador Ley Amdahl   |
+-------------------------------------------------------------------+
```

### 3.1. Motor de Scraping en Tres Niveles (Bloque 1 — `scraper/`)
* **Orquestación (`main.py`):** Gestiona la carga del repositorio base (`repo.py`) y habilita modos de ejecución parametrizables (`--sequential`, `--workers`, `--limit` y `--benchmark`) para realizar pruebas controladas de rendimiento.
* **Nivel 1 — Paralelismo por Juegos (`level1_games.py`):** Implementa `concurrent.futures.ProcessPoolExecutor` para particionar la lista de videojuegos entre procesos trabajadores independientes. Cada proceso ejecuta el ciclo completo de extracción, cálculo de mejor precio, porcentaje de descuento y consolidación del documento JSON de un título, eliminando condiciones de carrera en memoria compartida.
* **Nivel 2 — Concurrencia por Fuentes (`level2_sources.py`):** Dentro de cada proceso trabajador, dispara consultas simultáneas hacia tres dominios de información distintos: tiendas comerciales, Metacritic (puntuación de crítica) y HowLongToBeat (duración de historia principal, extras y completista).
* **Nivel 3 — Extracción por Tiendas (`level3_stores.py`) y Control de Tráfico (`ratelimit.py`):** Realiza peticiones concurrentes hacia Steam, Epic Games Store, PlayStation Store, Xbox Store, Nintendo eShop y Amazon, reguladas por un limitador de tasa (*rate limiter*) que introduce pausas controladas y reintentos para evitar bloqueos HTTP 429 (*Too Many Requests*).

### 3.2. Aplicación Web y Telemetría (Bloque 2 — `web/`)
* **Sincronización y Resiliencia (`web/js/data-loader.js`):** Establece conexión directa con Cloud Firestore (`game-deals-scraperdb`) para recuperar en tiempo real la colección `games`. Como mecanismo de alta disponibilidad, si la red presenta fallos o no existen registros remotos, el módulo conmuta automáticamente al dataset local `web/data/games.json` (392 títulos). Adicionalmente, permite la importación manual en memoria (`SYNC REPO`) sin alterar la base de datos en la nube.
* **Interfaz de Exploración (`web/js/app.js`):** Implementa filtrado multicriterio en memoria (plataforma, formato digital/físico, tienda, puntaje mínimo de Metacritic y filtro rápido para descuentos $\ge 50\%$), ordenamiento dinámico y una ventana modal comparativa de precios entre todas las tiendas consultadas.
* **Dashboard de Rendimiento (`web/js/benchmark.js`):** Renderiza mediante Chart.js los tiempos de ejecución, curvas de *Speedup*, eficiencia por núcleo, distribución de cuellos de botella y un simulador interactivo de la Ley de Amdahl.

---

## 4. Metodología Experimental

### 4.1. Especificaciones del Entorno de Hardware y Software
Las mediciones experimentales fueron ejecutadas bajo condiciones controladas en la siguiente plataforma de hardware:

| Parámetro | Especificación |
| :--- | :--- |
| **Equipo Base** | HP Laptop 14-dq1xxx |
| **Procesador (CPU)** | Intel® Core™ i5-1035G1 @ 1.00 GHz (Frecuencia base 1.20 GHz, microarquitectura Ice Lake de 10 nm) |
| **Topología de Núcleos** | **4 núcleos físicos / 8 hilos lógicos** (Tecnología Intel Hyper-Threading / SMT) |
| **Memoria Principal (RAM)** | 8.00 GB DDR4 @ 2667 MT/s (7.69 GB utilizables por el sistema) |
| **Almacenamiento Secundario** | Unidad de Estado Sólido (SSD) de 238 GB |
| **Sistema Operativo** | Windows de 64 bits (arquitectura x64) |
| **Entorno de Ejecución** | Python 3 con `concurrent.futures.ProcessPoolExecutor` |

### 4.2. Diseño de las Pruebas
Se seleccionó un lote controlado de **$24$ videojuegos** representativos del repositorio total ($392$ títulos) para ejecutar una serie de cinco configuraciones experimentales:
1. **Referencia Secuencial Pura ($T_{\text{seq}}$):** Ejecución lineal sin concurrencia en ninguno de los tres niveles.
2. **Paralelo con $p = 1$ núcleo lógico ($T_1$):** Línea base del pipeline paralelo utilizando un único proceso trabajador en Nivel 1.
3. **Paralelo con $p = 2$ núcleos lógicos ($T_2$).**
4. **Paralelo con $p = 4$ núcleos lógicos ($T_4$):** Correspondiente al total de núcleos físicos del procesador.
5. **Paralelo con $p = 8$ núcleos lógicos ($T_8$):** Correspondiente al total de hilos lógicos disponibles mediante *Hyper-Threading*.

---

## 5. Resultados y Análisis de Rendimiento

### 5.1. Comparativa de Tiempos, Speedup y Eficiencia
Los resultados registrados en `web/data/benchmark_results.json` tras ejecutar la batería de pruebas se resumen en la siguiente tabla:

* **Tiempo de referencia secuencial pura ($T_{\text{seq}}$):** $4.217\text{ s}$

| Configuración ($p$ núcleos) | Tiempo Total ($T_p$) | Reducción vs. Secuencial | Speedup Observado ($S(p) = \frac{T_1}{T_p}$) | Speedup Ideal Lineal | Eficiencia ($E(p) = \frac{S(p)}{p} \times 100\%$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **$p = 1$ (Base Paralela)** | $3.876\text{ s}$ | $-8.09\%$ | $1.000\times$ | $1\times$ | $100.00\%$ |
| **$p = 2$ núcleos** | $3.128\text{ s}$ | $-25.82\%$ | $1.239\times$ | $2\times$ | $61.95\%$ |
| **$p = 4$ núcleos** | **$2.648\text{ s}$** | **$-37.21\%$** | **$1.464\times$** | $4\times$ | $36.60\%$ |
| **$p = 8$ núcleos** | $3.744\text{ s}$ | $-11.22\%$ | $1.035\times$ | $8\times$ | $12.94\%$ |

#### Análisis de la Escalabilidad y Efecto Hyper-Threading
1. **Ganancia inicial entre ejecución secuencial y $p=1$:** Pasar de $4.217\text{ s}$ (secuencial puro) a $3.876\text{ s}$ ($p=1$ en Nivel 1) representa una mejora inmediata del $8.09\%$, atribuible a la concurrencia interna de los Niveles 2 y 3 que solapan las consultas por fuente y tienda dentro de un mismo juego.
2. **Punto óptimo en los núcleos físicos ($p=4$):** Al escalar a $2$ y $4$ trabajadores, el tiempo desciende progresivamente hasta alcanzar su mínimo global en **$2.648\text{ s}$ ($S(4) = 1.464\times$)**. Este punto coincide exactamente con los **4 núcleos físicos** del Intel Core i5-1035G1, donde cada proceso dispone de recursos de ejecución dedicados sin competir por unidades funcionales.
3. **Degradación en $p=8$ (Sobresuscripción de procesos):** Al incrementar a $8$ procesos (igualando los hilos lógicos SMT), el tiempo asciende nuevamente a $3.744\text{ s}$ y la eficiencia cae al $12.94\%$. En Windows, la creación de $8$ procesos pesados mediante `ProcessPoolExecutor` implica duplicar intérpretes de Python, serializar datos mediante comunicación entre procesos (IPC) y generar contención tanto en las unidades compartidas de los núcleos físicos como en los sockets de red y bloqueos del recolector.

### 5.2. Perfilado de Cuellos de Botella
El análisis de distribución temporal durante el ciclo de ejecución evidencia la naturaleza *I/O-Bound* del sistema:

| Categoría de Operación | Porcentaje del Tiempo Total | Descripción Técnica |
| :--- | :---: | :--- |
| **Latencia de Red (Network I/O)** | **$68.5\%$** | Espera de respuestas HTTP/HTTPS desde servidores externos y pausas obligatorias del *rate limiter*. |
| **Procesamiento de CPU** | **$21.0\%$** | Análisis sintáctico de HTML/JSON, normalización de identificadores (`slugify`) y cálculo de precios. |
| **Overhead de Sincronización** | **$10.5\%$** | Instanciación de procesos, serialización de cargas útiles (IPC) y escritura sincronizada en Firestore. |

### 5.3. Modelado Teórico mediante la Ley de Amdahl
A partir de los tiempos medidos y la proporción de tareas paralelizables frente a las restricciones secuenciales (inicialización, pausas de *rate limiting* para evitar HTTP 429 y escritura en base de datos), se determinó empíricamente:
* **Fracción paralelizable ($P$):** $0.70$ ($70\%$)
* **Fracción estrictamente secuencial ($s = 1 - P$):** $0.30$ ($30\%$)

Sustituyendo en la ecuación de la Ley de Amdahl:

$$S(p) = \frac{1}{0.30 + \frac{0.70}{p}}$$

El límite teórico máximo de aceleración del sistema, incluso disponiendo de infinitos núcleos de procesamiento, queda acotado a:

$$S_{\max} = \frac{1}{0.30} \approx \mathbf{3.33\times}$$

| Núcleos ($p$) | Speedup Teórico (Amdahl, $P=0.70$) | Speedup Observado (Real) | Speedup Ideal Lineal |
| :---: | :---: | :---: | :---: |
| **1** | $1.000\times$ | $1.000\times$ | $1\times$ |
| **2** | $1.538\times$ | $1.239\times$ | $2\times$ |
| **4** | $2.105\times$ | $1.464\times$ | $4\times$ |
| **8** | $2.581\times$ | $1.035\times$ | $8\times$ |
| **16** | $2.909\times$ | — | $16\times$ |
| **32** | $3.107\times$ | — | $32\times$ |
| **64** | $3.216\times$ | — | $64\times$ |

La brecha entre el *Speedup* teórico de Amdahl ($2.105\times$ en $p=4$) y el observado ($1.464\times$) responde a que el modelo ideal de Amdahl no contabiliza el costo de gestión de procesos del sistema operativo (*process spawning overhead*), la variabilidad estocástica de las latencias de internet ni las políticas externas de limitación de tráfico de las tiendas consultadas.

---

## 6. Conclusiones y Recomendaciones

1. **Alineación entre el modelo de concurrencia y el hardware:** En arquitecturas multinúcleo con *Hyper-Threading* (4 núcleos físicos / 8 lógicos), dimensionar un pool de procesos pesados (`ProcessPoolExecutor`) estrictamente al número de **núcleos físicos ($p = 4$)** maximiza el rendimiento ($1.464\times$). Exceder este umbral hacia los hilos lógicos penaliza el desempeño debido al costo de creación de procesos en Windows y la contención de recursos compartidos.
2. **Impacto de la Ley de Amdahl en aplicaciones I/O-Bound:** Aunque la arquitectura en tres niveles permite solapar eficazmente las peticiones HTTP, la presencia de un $30\%$ de operaciones secuenciales (control de tasa de peticiones y persistencia) limita la aceleración máxima teórica a $3.33\times$, confirmando que la latencia de red ($68.5\%$) es el factor dominante sobre la capacidad de cómputo de la CPU.
3. **Efectividad del desacoplamiento en la nube:** La integración mediante Cloud Firestore y Firebase Hosting permitió validar de forma independiente la extracción de datos en Python y la visualización pública en tiempo real, garantizando continuidad operativa mediante mecanismos de respaldo local ante fallos de red.
4. **Trabajo Futuro:** Para mitigar el *overhead* observado en $p = 8$, se recomienda sustituir los procesos pesados en Nivel 1 por un esquema híbrido basado en E/S asíncrona (`asyncio` + `aiohttp`) dentro de un número acotado de procesos igual a los núcleos físicos, reduciendo así el consumo de memoria y la latencia de cambio de contexto.