  // === Elementos del DOM ===
  const form = document.getElementById('apiForm');
  const table = document.getElementById('portfolioTable');
  const tbody = table.querySelector('tbody');
  const errorMsg = document.getElementById('errorMsg');
  const donutSection = document.getElementById('donutSection');
  const summarySection = document.getElementById('summarySection');
  const chartContainer = document.getElementById('chartContainer');
  const assetSelect = document.getElementById('assetFilter');

  // === Mapas de activos y símbolos fiat ===
  const assetLabelMap = { 'XXBT': 'BTC', 'XETH': 'ETH', 'ZEUR': 'EUR' };
  const fiatSymbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$', 'CHF': 'Fr.', 'KRW': '₩' };

  // === Funciones utilitarias ===
  function getFiatSymbol(data) {
    const fiatAsset = data.find(a => a.average_cost === null);
    const fiatCode = fiatAsset ? fiatAsset.asset.replace(/^Z/, '') : 'EUR';
    return fiatSymbols[fiatCode] || '';
  }

  function updateKpis(symbol, invested, current, profit, profitPct, liquidity) {
    document.getElementById('kpiInvested').textContent = `${symbol}${invested.toFixed(2)}`;
    document.getElementById('kpiValue').textContent = `${symbol}${current.toFixed(2)}`;
    document.getElementById('kpiProfit').textContent = `${symbol}${profit.toFixed(2)}`;
    document.getElementById('kpiProfitPct').textContent = `${profitPct.toFixed(2)}%`;
    document.getElementById('kpiLiquidity').textContent = `${symbol}${liquidity.toFixed(2)}`;
  }

  function renderTable(data) {
    tbody.innerHTML = '';
    data.forEach(asset => {
      if (asset.average_cost === null) return;
      const row = document.createElement('tr');
      const readableAsset = assetLabelMap[asset.asset] || asset.asset;
      row.innerHTML = `
        <td>${readableAsset}</td>
        <td>${asset.amount}</td>
        <td>${asset.average_cost}</td>
        <td>${asset.current_price}</td>
        <td>${asset.total_invested}</td>
        <td>${asset.current_value}</td>
        <td class="${asset.pnl_eur >= 0 ? 'positive' : 'negative'}">${asset.pnl_eur}</td>
        <td class="${asset.pnl_percent >= 0 ? 'positive' : 'negative'}">${asset.pnl_percent}%</td>
      `;
      tbody.appendChild(row);
    });
  }

  function populateAssetFilter(data) {
    assetSelect.innerHTML = '<option value="ALL">ALL</option>';
    data.forEach(a => {
      if (a && typeof a.asset === 'string' && a.average_cost !== null) {
        const label = assetLabelMap[a.asset] || a.asset;
        const option = document.createElement('option');
        option.value = a.asset;
        option.textContent = label;
        assetSelect.appendChild(option);
      }
    });
  }

  // === Gráficos ===
  function renderDonutChart(data, symbol) {
    const donutCanvas = document.getElementById('donutChart');
    const labels = [];
    const values = [];

    data.forEach(asset => {
      const value = parseFloat(asset.current_value);
      if (!isNaN(value) && value > 0) {
        labels.push(assetLabelMap[asset.asset] || asset.asset);
        values.push(value);
      }
    });

    if (window.donutChart && typeof window.donutChart.destroy === 'function') {
      window.donutChart.destroy();
    }

    donutSection.style.display = labels.length ? 'block' : 'none';

    if (labels.length > 0) {
      // Plugin para pintar el total en el centro
      const centerTextPlugin = {
        id: 'centerText',
        beforeDraw(chart) {
          const { ctx, width, height } = chart;
          ctx.restore();
          const total = chart.data.datasets[0].data.reduce((sum, v) => sum + v, 0);
          const fontSize = (height / 150).toFixed(2);
          ctx.font = `${fontSize}em sans-serif`;
          ctx.textBaseline = 'middle';
          const text = `${symbol}${total.toFixed(2)}`;
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2;
          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      };

      window.donutChart = new Chart(donutCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
              '#3f51b5', '#00bcd4', '#ffc107', '#795548', '#607d8b'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label(context) {
                  const total = context.chart._metasets[0].total;
                  const value = context.parsed;
                  const percent = ((value / total) * 100).toFixed(2);
                  return `${context.label}: ${symbol}${value.toFixed(2)} (${percent}%)`;
                }
              }
            }
          }
        },
        plugins: [ centerTextPlugin ]
      });
    }
  }


  function renderSummaryChart(invested, current, profit, profitPct, symbol) {
    const summaryCanvas = document.getElementById('summaryChart');
    const summaryLabels = [
      'Total Invested',
      'Current Value',
      `Profit (${profitPct.toFixed(2)}%)`
    ];

    if (window.summaryChart && typeof window.summaryChart.destroy === 'function') {
      window.summaryChart.destroy();
    }

    summarySection.style.display = 'block';

    window.summaryChart = new Chart(summaryCanvas, {
      type: 'bar',
      data: {
        labels: summaryLabels,
        datasets: [{
          label: `Portfolio (${symbol})`,
          data: [
            invested.toFixed(2),
            current.toFixed(2),
            profit.toFixed(2)
          ],
          backgroundColor: [
            '#ff9800',
            current >= invested ? '#4caf50' : '#f44336',
            profit >= 0 ? '#4caf50' : '#f44336'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return symbol + value;
              }
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${symbol}${context.parsed.y}`;
              }
            }
          }
        }
      }
    });
  }

  function renderInvestmentPieChart(data, symbol) {
    const canvas = document.getElementById('investmentPieChart');
    const labels = [];
    const values = [];

    data.forEach(asset => {
      if (asset.average_cost !== null && asset.total_invested > 0) {
        labels.push(assetLabelMap[asset.asset] || asset.asset);
        values.push(asset.total_invested);
      }
    });

    if (window.investmentPieChart && typeof window.investmentPieChart.destroy === 'function') {
      window.investmentPieChart.destroy();
    }

    const total = values.reduce((sum, v) => sum + v, 0);

    const centerTextPlugin = {
      id: 'centerInvestmentText',
      beforeDraw(chart) {
        const { ctx, width, height } = chart;
        ctx.restore();
        const fontSize = (height / 150).toFixed(2);
        ctx.font = `${fontSize}em sans-serif`;
        ctx.textBaseline = 'middle';
        const text = `${symbol}${total.toFixed(2)}`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        ctx.fillText(text, textX, textY);
        ctx.save();
      }
    };

    window.investmentPieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
            '#3f51b5', '#00bcd4', '#ffc107', '#795548', '#607d8b'
          ]
        }]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const total = context.chart._metasets[0].total;
                const value = context.parsed;
                const percent = ((value / total) * 100).toFixed(2);
                return `${context.label}: ${symbol}${value.toFixed(2)} (${percent}%)`;
              }
            }
          },
          legend: {
            position: 'bottom'
          }
        },
        responsive: true,
        maintainAspectRatio: false
      },
      plugins: [centerTextPlugin]
    });
  }

  function renderPortfolioTimelineChart(timelineData) {
    const ctx = document.getElementById('portfolioTimelineChart');

    const labels = timelineData.map(d => d.date);
    const values = timelineData.map(d => d.value);
    const profits = timelineData.map(d => d.profit);

    if (window.timelineChart && typeof window.timelineChart.destroy === 'function') {
      window.timelineChart.destroy();
    }

    document.getElementById('timelineSection').style.display = 'block';

    window.timelineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Portfolio Value (€)',
            data: values,
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.3,
            pointRadius: 1,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Profit (€)',
            data: profits,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.3,
            pointRadius: 1,
            fill: true,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            beginAtZero: false,
            position: 'left',
            ticks: {
              callback: value => `€${value}`
            },
            title: {
              display: true,
              text: 'Valor total'
            }
          },
          y1: {
            beginAtZero: false,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              callback: value => `€${value}`
            },
            title: {
              display: true,
              text: 'Profit acumulado'
            }
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: €${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }

  function agruparPor(timeline, modo) {
    const agrupado = {};

    timeline.forEach(entry => {
      const date = new Date(entry.date);
      let clave;

      if (modo === "monthly") {
        clave = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (modo === "weekly") {
        const monday = new Date(date);
        monday.setDate(monday.getDate() - monday.getDay() + 1);
        clave = monday.toISOString().split("T")[0];
      } else {
        clave = entry.date;
      }

      if (!agrupado[clave]) agrupado[clave] = [];
      agrupado[clave].push(entry);
    });

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

    let resultado = Object.entries(agrupado).map(([key, group]) => ({
      date: key,
      value: avg(group.map(e => e.value)),
      cost: avg(group.map(e => e.cost)),
      profit: avg(group.map(e => e.profit)),
      profit_pct: avg(group.map(e => e.profit_pct))
    }));

    // Añadir el último punto exacto si aún no está (fecha real, no clave agrupada)
    const ultimo = timeline[timeline.length - 1];
    const ultimaFechaExacta = ultimo.date;

    const yaIncluido = resultado.some(r => r.date === ultimaFechaExacta);
    if (!yaIncluido) {
      resultado.push({
        date: ultimaFechaExacta,
        value: ultimo.value,
        cost: ultimo.cost,
        profit: ultimo.profit,
        profit_pct: ultimo.profit_pct
      });
    }

    // Orden final
    resultado.sort((a, b) => new Date(a.date) - new Date(b.date));

    return resultado;
  }


  function renderCharts(data, timeline) {
    const symbol = getFiatSymbol(data);
    const filteredAssets = data.filter(a => a.average_cost !== null);
    const totalInvested = filteredAssets.reduce((sum, a) => sum + a.total_invested, 0);
    const totalCurrent = filteredAssets.reduce((sum, a) => sum + a.current_value, 0);
    const profit = totalCurrent - totalInvested;
    const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const fiatAsset = data.find(a => a.average_cost === null);
    const liquidity = fiatAsset ? fiatAsset.current_value : 0;

    updateKpis(symbol, totalInvested, totalCurrent, profit, profitPercent, liquidity);
    renderDonutChart(data, symbol);
    renderSummaryChart(totalInvested, totalCurrent, profit, profitPercent, symbol);
    renderInvestmentPieChart(data, symbol);
    renderPortfolioTimelineChart(timeline);

  }

  // === Petición al backend + renderizado ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    table.style.display = 'none';
    chartContainer.style.display = 'none';

    const api_key = document.getElementById('apiKey').value;
    const api_secret = document.getElementById('apiSecret').value;

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key, api_secret })
      });

      const data = await response.json();

      if (!data.summary || !Array.isArray(data.summary)) {
        errorMsg.textContent = data.error || 'Unexpected response format';
        console.error('Backend error:', data);
        return;
      }

      const summary = data.summary;
      const timeline = data.timeline;
      window.portfolioData = summary;
      fullTimeline = timeline;

      if (data.error) {
        errorMsg.textContent = data.error;
        return;
      }

      renderTable(summary);
      renderCharts(summary, timeline);
      populateAssetFilter(summary);

      form.style.display = 'none';
      table.style.display = '';
      chartContainer.style.display = 'flex';
      document.getElementById('globalSummarySection').style.display = 'block';
      document.getElementById('tableSection').style.display = 'block';
      document.getElementById('assetAnalysisSection').style.display = 'block';

    } catch (err) {
      errorMsg.textContent = 'Something went wrong. Check the console.';
      console.error(err);
    }
  });
  let fullTimeline = []; // guardamos el timeline completo

  document.getElementById('granularityFilter').addEventListener('change', () => {
    const modo = document.getElementById('granularityFilter').value;
    const timelineFiltrado = agruparPor(fullTimeline, modo);
    renderPortfolioTimelineChart(timelineFiltrado);
  });

  // === Filtro por activo individual ===
  // assetSelect.addEventListener('change', () => {
  //   const selected = assetSelect.value;
  //   const filtered = selected === 'ALL'
  //     ? window.portfolioData
  //     : window.portfolioData.filter(a => a.asset === selected);
  //   renderCharts(filtered);
  // });
