/**
 * Benchmark & Rendimiento Multinúcleo (Chart.js)
 * IC3101 Arquitectura de Computadoras - III Proyecto: Web Scraping Multinúcleo
 * Bloque 2: Frontend, Performance & Documentación - Adrián Sánchez
 */

const BenchmarkModule = (() => {
  let benchmarkData = null;
  let chartTime = null;
  let chartSpeedup = null;
  let chartEfficiency = null;
  let chartAmdahl = null;
  let chartBottlenecks = null;

  const FALLBACK_BENCHMARK = {
    "timestamp": "2026-11-13 20:51:04",
    "hardware": {
      "total_logical_cores": 8,
      "workload_games_tested": 24,
      "total_repo_games": 392
    },
    "sequential_reference": {
      "time_seconds": 3.916,
      "description": "Ejecución lineal monohilo pura (sin Nivel 1, 2 ni 3 de paralelismo)"
    },
    "parallel_results": [
      { "cores": 1, "time_seconds": 1.686, "speedup": 1.0, "speedup_ideal": 1, "efficiency_percent": 100.0 },
      { "cores": 2, "time_seconds": 0.820, "speedup": 2.056, "speedup_ideal": 2, "efficiency_percent": 102.8 },
      { "cores": 4, "time_seconds": 0.641, "speedup": 2.630, "speedup_ideal": 4, "efficiency_percent": 65.75 },
      { "cores": 8, "time_seconds": 0.726, "speedup": 2.322, "speedup_ideal": 8, "efficiency_percent": 29.03 }
    ],
    "amdahl_analysis": {
      "parallel_fraction_P": 0.8264,
      "serial_fraction_s": 0.1736,
      "theoretical_max_speedup": 5.76,
      "theoretical_curve": [
        { "cores": 1, "speedup_teorico": 1.0, "speedup_ideal": 1 },
        { "cores": 2, "speedup_teorico": 1.704, "speedup_ideal": 2 },
        { "cores": 4, "speedup_teorico": 2.630, "speedup_ideal": 4 },
        { "cores": 6, "speedup_teorico": 3.212, "speedup_ideal": 6 },
        { "cores": 8, "speedup_teorico": 3.611, "speedup_ideal": 8 },
        { "cores": 12, "speedup_teorico": 4.124, "speedup_ideal": 12 },
        { "cores": 16, "speedup_teorico": 4.440, "speedup_ideal": 16 },
        { "cores": 32, "speedup_teorico": 5.014, "speedup_ideal": 32 },
        { "cores": 64, "speedup_teorico": 5.361, "speedup_ideal": 64 }
      ]
    },
    "bottleneck_breakdown": {
      "network_io_percent": 68.5,
      "cpu_processing_percent": 21.0,
      "thread_synchronization_overhead_percent": 10.5
    }
  };

  async function init() {
    try {
      const res = await fetch('data/benchmark_results.json?t=' + Date.now());
      if (res.ok) {
        benchmarkData = await res.json();
      } else {
        benchmarkData = FALLBACK_BENCHMARK;
      }
    } catch (e) {
      console.warn('[Benchmark] Usando datos de respaldo para benchmark', e);
      benchmarkData = FALLBACK_BENCHMARK;
    }

    renderSummaryCards();
    initCharts();
    setupAmdahlSimulator();
  }

  function renderSummaryCards() {
    if (!benchmarkData) return;
    const maxSpeedupObj = benchmarkData.parallel_results.reduce((max, r) => r.speedup > max.speedup ? r : max, benchmarkData.parallel_results[0]);
    
    const pVal = benchmarkData.amdahl_analysis ? (benchmarkData.amdahl_analysis.parallel_fraction_P * 100).toFixed(1) : "82.6";
    const sMax = benchmarkData.amdahl_analysis ? benchmarkData.amdahl_analysis.theoretical_max_speedup.toFixed(2) : "5.76";

    document.getElementById('bench-cores-val').textContent = `${benchmarkData.hardware.total_logical_cores} núcleos`;
    document.getElementById('bench-speedup-val').textContent = `${maxSpeedupObj.speedup.toFixed(2)}x`;
    document.getElementById('bench-p-val').textContent = `${pVal}%`;
    document.getElementById('bench-smax-val').textContent = `${sMax}x`;
  }

  function initCharts() {
    const pResults = benchmarkData.parallel_results;
    const coresLabels = pResults.map(r => `${r.cores} Cores`);
    const times = pResults.map(r => r.time_seconds);
    const speedups = pResults.map(r => r.speedup);
    const speedupIdeals = pResults.map(r => r.speedup_ideal);
    const efficiencies = pResults.map(r => r.efficiency_percent);

    // 1. Gráfico de Tiempo de Ejecución (Secuencial vs Paralelo)
    const ctxTime = document.getElementById('chart-execution-time').getContext('2d');
    const timeLabels = ['Secuencial', ...coresLabels];
    const timeValues = [benchmarkData.sequential_reference.time_seconds, ...times];
    const timeColors = ['#f59e0b', ...pResults.map(() => '#38bdf8')];

    chartTime = new Chart(ctxTime, {
      type: 'bar',
      data: {
        labels: timeLabels,
        datasets: [{
          label: 'Tiempo de Ejecución (segundos)',
          data: timeValues,
          backgroundColor: timeColors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} segundos`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

    // 2. Gráfico de Speedup (Observado vs Ideal Lineal)
    const ctxSpeedup = document.getElementById('chart-speedup').getContext('2d');
    chartSpeedup = new Chart(ctxSpeedup, {
      type: 'line',
      data: {
        labels: coresLabels,
        datasets: [
          {
            label: 'Speedup Real Observado S(p)',
            data: speedups,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.2,
            pointRadius: 6,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Speedup Ideal Teórico (Lineal)',
            data: speedupIdeals,
            borderColor: '#64748b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 4,
            pointBackgroundColor: '#64748b'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f0f4f8' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

    // 3. Gráfico de Eficiencia de Paralelización (%)
    const ctxEfficiency = document.getElementById('chart-efficiency').getContext('2d');
    chartEfficiency = new Chart(ctxEfficiency, {
      type: 'bar',
      data: {
        labels: coresLabels,
        datasets: [{
          label: 'Eficiencia E(p) %',
          data: efficiencies,
          backgroundColor: efficiencies.map(e => e >= 70 ? '#10b981' : (e >= 40 ? '#f59e0b' : '#ef4444')),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Eficiencia: ${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 120,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: {
              color: '#94a3b8',
              callback: (v) => `${v}%`
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

    // 4. Gráfico de Cuellos de Botella (Red vs CPU vs Overhead)
    const ctxBottlenecks = document.getElementById('chart-bottlenecks').getContext('2d');
    const bData = benchmarkData.bottleneck_breakdown;
    chartBottlenecks = new Chart(ctxBottlenecks, {
      type: 'doughnut',
      data: {
        labels: [
          'Latencia de Red (I/O HTTP/APIs)',
          'Procesamiento CPU (Parsing/Regex/Lógica)',
          'Overhead de Hilos & Sincronización'
        ],
        datasets: [{
          data: [
            bData.network_io_percent,
            bData.cpu_processing_percent,
            bData.thread_synchronization_overhead_percent
          ],
          backgroundColor: ['#38bdf8', '#10b981', '#f59e0b'],
          borderWidth: 2,
          borderColor: '#131b2e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#f0f4f8', font: { size: 11 } }
          }
        }
      }
    });

    // 5. Curva de la Ley de Amdahl
    renderAmdahlCurve(benchmarkData.amdahl_analysis ? benchmarkData.amdahl_analysis.parallel_fraction_P : 0.826);
  }

  function renderAmdahlCurve(P) {
    const ctxAmdahl = document.getElementById('chart-amdahl-curve').getContext('2d');
    const coresRange = [1, 2, 4, 8, 12, 16, 24, 32, 48, 64];
    const amdahlSpeedups = coresRange.map(c => {
      return (1.0 / ((1.0 - P) + (P / c))).toFixed(3);
    });

    if (chartAmdahl) {
      chartAmdahl.destroy();
    }

    chartAmdahl = new Chart(ctxAmdahl, {
      type: 'line',
      data: {
        labels: coresRange.map(c => `${c}`),
        datasets: [
          {
            label: `Curva Ley de Amdahl (P = ${(P * 100).toFixed(1)}%)`,
            data: amdahlSpeedups,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            fill: true,
            borderWidth: 3,
            tension: 0.25,
            pointRadius: 4,
            pointBackgroundColor: '#a855f7'
          },
          {
            label: 'Límite Asintótico S_max = 1 / (1 - P)',
            data: coresRange.map(() => (1.0 / (1.0 - P)).toFixed(2)),
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f0f4f8' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            title: { display: true, text: 'Número de Núcleos (p)', color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  function setupAmdahlSimulator() {
    const slider = document.getElementById('amdahl-slider');
    const label = document.getElementById('amdahl-p-slider-val');
    const maxLabel = document.getElementById('amdahl-sim-smax');

    if (!slider) return;

    slider.addEventListener('input', (e) => {
      const p = parseFloat(e.target.value) / 100.0;
      label.textContent = `${(p * 100).toFixed(0)}%`;
      const sMax = p >= 1.0 ? "∞" : (1.0 / (1.0 - p)).toFixed(2) + "x";
      maxLabel.textContent = sMax;
      renderAmdahlCurve(p);
    });
  }

  return {
    init,
    renderAmdahlCurve
  };
})();
