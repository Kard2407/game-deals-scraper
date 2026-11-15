
const BenchmarkModule = (() => {
  let benchmarkData = null;
  let chartTime = null;
  let chartSpeedup = null;
  let chartEfficiency = null;
  let chartAmdahl = null;
  let chartBottlenecks = null;

  // Paleta Técnica & Tipografía Global
  const THEME = {
    fontMono: "'JetBrains Mono', monospace",
    bgCard: '#1C1E22',
    bgInput: '#131417',
    gridLine: '#2E3036',
    borderStrong: '#646975',
    textMain: '#F2F2EE',
    textMuted: '#A3A6AE',
    textDim: '#6E727C',
    accentOrange: '#FF4D00',
    accentOrangeFill: 'rgba(255, 77, 0, 0.14)',
    neutralBar: '#434750',
    neutralLight: '#8E939E'
  };

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

  function configureChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = THEME.fontMono;
    Chart.defaults.font.size = 11;
    Chart.defaults.color = THEME.textMuted;
  }

  function getCommonTooltipOptions(formatter) {
    return {
      backgroundColor: THEME.bgInput,
      titleColor: THEME.accentOrange,
      bodyColor: THEME.textMain,
      borderColor: THEME.borderStrong,
      borderWidth: 1,
      cornerRadius: 0,
      padding: 10,
      titleFont: { family: THEME.fontMono, weight: '700', size: 11 },
      bodyFont: { family: THEME.fontMono, weight: '600', size: 11 },
      displayColors: true,
      boxWidth: 10,
      boxHeight: 10,
      callbacks: formatter ? { label: formatter } : {}
    };
  }

  async function init() {
    configureChartDefaults();
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

    document.getElementById('bench-cores-val').textContent = `${benchmarkData.hardware.total_logical_cores} CORES`;
    document.getElementById('bench-speedup-val').textContent = `${maxSpeedupObj.speedup.toFixed(2)}x`;
    document.getElementById('bench-p-val').textContent = `${pVal}%`;
    document.getElementById('bench-smax-val').textContent = `${sMax}x`;
  }

  function initCharts() {
    const pResults = benchmarkData.parallel_results;
    const coresLabels = pResults.map(r => `${r.cores} CORES`);
    const times = pResults.map(r => r.time_seconds);
    const speedups = pResults.map(r => r.speedup);
    const speedupIdeals = pResults.map(r => r.speedup_ideal);
    const efficiencies = pResults.map(r => r.efficiency_percent);

    // 1. Gráfico de Tiempo de Ejecución (Secuencial vs Paralelo)
    const ctxTime = document.getElementById('chart-execution-time').getContext('2d');
    const timeLabels = ['SECUENCIAL', ...coresLabels];
    const timeValues = [benchmarkData.sequential_reference.time_seconds, ...times];
    const timeColors = [THEME.textMain, ...pResults.map(() => THEME.accentOrange)];

    chartTime = new Chart(ctxTime, {
      type: 'bar',
      data: {
        labels: timeLabels,
        datasets: [{
          label: 'WALL_CLOCK (S)',
          data: timeValues,
          backgroundColor: timeColors,
          borderColor: THEME.bgInput,
          borderWidth: 1,
          borderRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: getCommonTooltipOptions((ctx) => ` ${ctx.raw} s`)
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMuted, callback: (v) => `${v}s` }
          },
          x: {
            grid: { display: false },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMain, font: { weight: '700' } }
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
            label: 'SPEEDUP REAL OBSERVADO S(p)',
            data: speedups,
            borderColor: THEME.accentOrange,
            backgroundColor: THEME.accentOrangeFill,
            borderWidth: 2.5,
            fill: true,
            tension: 0,
            pointStyle: 'rect',
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: THEME.accentOrange,
            pointBorderColor: THEME.bgCard,
            pointBorderWidth: 1.5
          },
          {
            label: 'SPEEDUP IDEAL LINEAL (y = x)',
            data: speedupIdeals,
            borderColor: THEME.neutralLight,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointStyle: 'rect',
            pointRadius: 4,
            pointBackgroundColor: THEME.neutralLight
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: THEME.textMain,
              usePointStyle: true,
              pointStyle: 'rect',
              font: { family: THEME.fontMono, weight: '700', size: 11 }
            }
          },
          tooltip: getCommonTooltipOptions((ctx) => ` ${ctx.dataset.label}: ${ctx.raw}x`)
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMuted, callback: (v) => `${v}x` }
          },
          x: {
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMain, font: { weight: '700' } }
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
          label: 'EFICIENCIA E(p) %',
          data: efficiencies,
          backgroundColor: efficiencies.map(e => e >= 70 ? THEME.accentOrange : (e >= 40 ? THEME.neutralLight : THEME.neutralBar)),
          borderColor: THEME.bgInput,
          borderWidth: 1,
          borderRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: getCommonTooltipOptions((ctx) => ` EFICIENCIA: ${ctx.raw}%`)
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 120,
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: {
              color: THEME.textMuted,
              callback: (v) => `${v}%`
            }
          },
          x: {
            grid: { display: false },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMain, font: { weight: '700' } }
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
          'LATENCIA RED (I/O HTTP/APIs)',
          'CÓMPUTO CPU (PARSING/REGEX)',
          'OVERHEAD HILOS & SYNC'
        ],
        datasets: [{
          data: [
            bData.network_io_percent,
            bData.cpu_processing_percent,
            bData.thread_synchronization_overhead_percent
          ],
          backgroundColor: [THEME.accentOrange, THEME.textMain, THEME.neutralBar],
          borderWidth: 2,
          borderColor: THEME.bgCard,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: THEME.textMain,
              usePointStyle: true,
              pointStyle: 'rect',
              padding: 14,
              font: { family: THEME.fontMono, size: 10, weight: '700' }
            }
          },
          tooltip: getCommonTooltipOptions((ctx) => ` ${ctx.label}: ${ctx.raw}%`)
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
            label: `CURVA LEY DE AMDAHL (P = ${(P * 100).toFixed(1)}%)`,
            data: amdahlSpeedups,
            borderColor: THEME.accentOrange,
            backgroundColor: THEME.accentOrangeFill,
            fill: true,
            borderWidth: 2.5,
            tension: 0.15,
            pointStyle: 'rect',
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: THEME.accentOrange
          },
          {
            label: 'LÍMITE ASINTÓTICO S_max = 1 / (1 - P)',
            data: coresRange.map(() => (1.0 / (1.0 - P)).toFixed(2)),
            borderColor: THEME.textMain,
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: THEME.textMain,
              usePointStyle: true,
              pointStyle: 'rect',
              font: { family: THEME.fontMono, weight: '700', size: 11 }
            }
          },
          tooltip: getCommonTooltipOptions((ctx) => ` ${ctx.dataset.label}: ${ctx.raw}x`)
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMuted, callback: (v) => `${v}x` }
          },
          x: {
            title: {
              display: true,
              text: 'NÚMERO DE NÚCLEOS (p)',
              color: THEME.textDim,
              font: { family: THEME.fontMono, weight: '700', size: 11 }
            },
            grid: { color: THEME.gridLine },
            border: { color: THEME.borderStrong },
            ticks: { color: THEME.textMain, font: { weight: '700' } }
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