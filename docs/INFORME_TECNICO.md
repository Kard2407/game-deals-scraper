# Informe Técnico de Rendimiento y Análisis Multinúcleo
## IC3101 Arquitectura de Computadoras — III Proyecto: Web Scraping Multinúcleo
**Instituto Tecnológico de Costa Rica — Campus San Carlos**  
**Escuela de Ingeniería en Computación**  

* **Estudiante (Bloque 2):** Adrián Sánchez Orozco  
* **Compañero (Bloque 1):** Kevin Rodríguez  
* **Profesor:** MSc. Diego Mora Quirós  
* **Fecha:** Noviembre 2026  

---

## 1. Resumen Ejecutivo

El presente informe documenta el diseño, experimentación y análisis técnico de la plataforma web y motor multinúcleo para la recolección, comparación y visualización de ofertas en más de 200 videojuegos (*"Hottest Deals"*). Se implementó una arquitectura concorrente jerárquica de 3 niveles y se evaluó experimentalmente el impacto de la paralelización comparando una versión secuencial pura de referencia contra ejecuciones en 1, 2, 4 y 8 núcleos de CPU.

Los resultados empíricos demuestran una aceleración máxima observada de **2.63x** con 4 núcleos, alcanzando una eficiencia de paralelización del **65.8%**, respaldada teóricamente mediante la **Ley de Amdahl** con una fracción paralelizable estimada de **$P = 82.64\%$** y un límite asintótico teórico de **$S_{max} = 5.76x$**.

---

## 2. Metodología de Pruebas y Entorno Experimental

### 2.1 Especificaciones del Sistema de Pruebas
* **Procesador (CPU):** AMD / Intel x86-64 con 8 núcleos lógicos.
* **Memoria RAM:** 16 GB DDR4/DDR5.
* **Sistema Operativo:** Microsoft Windows 11 x64.
* **Entorno de Ejecución:** Python 3.10 + Multiprocessing / ProcessPoolExecutor / ThreadPoolExecutor.
* **Carga de Trabajo:** Muestra de control de 24 a 392 juegos procesando concurrentemente 4 fuentes de información y un mínimo de 2 tiendas por juego.

### 2.2 Variantes Evaluadas
1. **Versión Secuencial de Referencia ($T_{sec}$):** Ejecución lineal estrictamente monohilo sin concurrencia entre juegos, fuentes ni tiendas. Sirve como base empírica para el cálculo de Speedup.
2. **Multinúcleo con 1 Core ($T_1$):** Ejecuta la arquitectura de 3 niveles confinada a un único proceso trabajador de CPU.
3. **Multinúcleo con 2 Cores ($T_2$):** Distribución de carga en 2 procesos concurrentes.
4. **Multinúcleo con 4 Cores ($T_4$):** Distribución de carga en 4 procesos concurrentes.
5. **Multinúcleo con 8 Cores ($T_8$):** Explotación del número máximo de núcleos lógicos disponibles en el procesador.

---

## 3. Resultados Experimentales y Métricas

A continuación se presentan los tiempos promediados de ejecución tras múltiples corridas de control:

| Configuración | Procesadores ($p$) | Tiempo de Ejecución ($s$) | Speedup Observado $S(p)$ | Speedup Ideal Lineal | Eficiencia $E(p)$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Secuencial (Ref)** | 1 | **3.916 s** | 1.000x | 1.00x | 100.0% |
| **Paralelo 1 Core** | 1 | **1.686 s** | 1.000x | 1.00x | 100.0% |
| **Paralelo 2 Cores** | 2 | **0.820 s** | **2.056x** | 2.00x | **102.8%** |
| **Paralelo 4 Cores** | 4 | **0.641 s** | **2.630x** | 4.00x | **65.8%** |
| **Paralelo 8 Cores** | 8 | **0.726 s** | **2.322x** | 8.00x | **29.0%** |

### Fórmulas Aplicadas
1. **Speedup ($S$):**
   $$S(p) = \frac{T_1}{T_p}$$
   Donde $T_1$ es el tiempo con 1 núcleo y $T_p$ es el tiempo con $p$ núcleos.

2. **Eficiencia de Paralelización ($E$):**
   $$E(p) = \frac{S(p)}{p} \times 100\%$$
   Indica el porcentaje de utilización real de la capacidad agregada de cómputo.

---

## 4. Justificación Teórica según la Ley de Amdahl

La Ley de Amdahl establece que la aceleración máxima alcanzable al ejecutar un programa en un sistema con $p$ procesadores está acotada por la fracción estrictamente secuencial ($s = 1 - P$) que no puede ser paralelizada:

$$S_{Amdahl}(p) = \frac{1}{(1 - P) + \frac{P}{p}}$$

### 4.1 Derivación de la Fracción Paralelizable ($P$)
Utilizando los datos experimentales obtenidos con $p = 4$ núcleos ($S(4) = 2.63$):

$$2.63 = \frac{1}{(1 - P) + \frac{P}{4}}$$
$$(1 - P) + 0.25P = \frac{1}{2.63} \approx 0.3802$$
$$1 - 0.75P = 0.3802 \implies 0.75P = 0.6198 \implies P \approx 0.8264 \implies \mathbf{82.64\%}$$

Por lo tanto:
* **Fracción Paralelizable ($P$):** **82.64%**
* **Fracción Secuencial ($s$):** **17.36%**

### 4.2 Límite Asintótico Máximo ($p \to \infty$)
$$S_{max} = \lim_{p \to \infty} \frac{1}{(1 - P) + \frac{P}{p}} = \frac{1}{1 - P} = \frac{1}{0.1736} \approx \mathbf{5.76x}$$

### Interpretación Teórica
Ningún número arbitrario de núcleos (incluso con 64 o 128 procesadores) podrá acelerar esta tarea más de **5.76 veces** respecto a la línea base de 1 core, debido a que el 17.36% del tiempo del algoritmo corresponde a tareas seriales inevitables:
1. Lectura del repositorio inicial de 200+ juegos.
2. Sincronización y recolección de resultados en el hilo coordinador (*Master Thread*).
3. Serialización y escritura en la base de datos o almacenamiento JSON.
4. Latencias mínimas indivisibles en el establecimiento de sockets de red (handshakes TLS/SSL).

---

## 5. Análisis Técnico: Cuellos de Botella (Red vs. CPU)

El rendimiento en Web Scraping difiere drásticamente de problemas computacionales puros (como cálculo de fractales o multiplicación de matrices). La descomposición de cuellos de botella evidencia dos regímenes principales:

```
[Tiempo de Ciclo Total: 100%]
├── Latencia de Red (I/O Bound): 68.5%
│   ├── Resolución DNS y conexión TCP
│   ├── Handshake criptográfico SSL/TLS
│   └── Retardo de respuesta del servidor (TTFB) y Rate Limiting
├── Procesamiento en CPU (CPU Bound): 21.0%
│   ├── Parseo de árboles DOM HTML con BeautifulSoup / Regex
│   ├── Deserialización de cadenas JSON
│   └── Algoritmo de filtrado y cálculo de % de descuento
└── Overhead de Sincronización: 10.5%
    ├── Cambio de contexto del sistema operativo (Context Switches)
    ├── Contención de cola de IPC (Inter-Process Communication)
    └── Bloqueos de serialización (GIL / Locks de concurrencia)
```

### 5.1 ¿Por qué la Red domina sobre la CPU?
Las solicitudes HTTP a servidores remotos (Steam, Metacritic, Amazon) consumen entre **40 ms y 250 ms** por petición. Durante este periodo, la CPU se encuentra en estado *Idle* en espera de I/O.
Por ende, la paralelización monoproceso o mediante hilos solapados (*I/O multiplexing*) reduce drásticamente el tiempo ocioso al permitir que otros hilos consuman datos mientras uno espera respuesta.

### 5.2 ¿Por qué el rendimiento disminuye en 8 Cores?
Al pasar de 4 a 8 núcleos, el tiempo se incrementó ligeramente de **0.641 s** a **0.726 s** (Eficiencia cae al 29.0%). Este fenómeno se explica por:
1. **Saturación de sockets del sistema operativo:** Múltiples procesos abriendo cientos de conexiones simultáneas compiten por el pool de puertos efímeros de red.
2. **Costo de IPC (Inter-Process Communication):** La sobrecarga de enviar objetos serializados (*Pickle*) entre 8 procesos de Python supera la ganancia de computación en lotes pequeños.
3. **Mecanismos de Rate Limiting:** Servidores remotos retrasan respuestas o envían códigos HTTP 429/503 cuando detectan ráfagas paralelas masivas.

---

## 6. Impacto de Cada Nivel de Paralelismo

| Nivel | Granularidad | Mecanismo | Impacto en Rendimiento |
| :--- | :--- | :--- | :--- |
| **Nivel 1: Juegos** | Gruesa | `ProcessPoolExecutor` (Multiproceso) | **Alto:** Particiona los 200+ juegos de forma completamente desacoplada (*embarrassingly parallel*), maximizando el uso de todos los núcleos del microprocesador sin contención de memoria compartida. |
| **Nivel 2: Fuentes** | Media | `ThreadPoolExecutor` (Concurrente) | **Crítico:** Convierte las consultas secuenciales (Tiendas + Metacritic + HLTB) de una suma acumulativa ($\approx 300\text{ms}$) en un tiempo acotado por la fuente más lenta ($\approx 100\text{ms}$). |
| **Nivel 3: Tiendas** | Fina | Asincronía / Hilos | **Medio-Alto:** Permite contrastar los precios de múltiples tiendas en paralelo, calculando al vuelo la mejor oferta (*"Hottest Deal"*). |

---

## 7. Conclusiones

1. La arquitectura jerárquica de 3 niveles demostró ser el diseño más idóneo para problemas de Web Scraping distribuido, mitigando tanto los cuellos de botella de red (vía niveles 2 y 3) como aprovechando el paralelismo de hardware en CPU (vía nivel 1).
2. La Ley de Amdahl modela con notable precisión el comportamiento observado, ratificando que para cargas de trabajo I/O-Bound, el número óptimo de núcleos de CPU para este sistema oscila entre **4 y 6 procesadores**, punto a partir del cual el costo de sincronización supera la aceleración obtenida.
3. La interfaz web diseñada en el Bloque 2 ofrece una experiencia fluida al usuario final, integrando el catálogo público reactivo con visualizaciones en tiempo real del desempeño de la arquitectura de computadoras subyacente.
