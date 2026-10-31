// API Endpoints
const API_URLS = {
    stocksData: "https://stock-market-api-k9vl.onrender.com/api/stocksdata",
    stocksStats: "https://stock-market-api-k9vl.onrender.com/api/stocksstatsdata",
    profileData: "https://stock-market-api-k9vl.onrender.com/api/profiledata"
};

const Stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'PYPL', 'TSLA', 'JPM', 'NVDA', 'NFLX', 'DIS'];

let currentStock = 'AAPL';
let currentRange = '1year';
let globalStocksData = null;
let globalStocksStats = null;
let globalProfileData = null;
let stockChartInstance = null;

const stockListContainer = document.getElementById('stock-list-container');
const stockDetailsContent = document.getElementById('stock-details-content');
const chartTitle = document.getElementById('chart-title');
const rangeButtons = document.querySelectorAll('.range-btn');
const ctx = document.getElementById('stockChart').getContext('2d');

async function initApp() {
    try {
        const [dataRes, statsRes, profileRes] = await Promise.all([
            fetch(API_URLS.stocksData).then(res => res.json()),
            fetch(API_URLS.stocksStats).then(res => res.json()),
            fetch(API_URLS.profileData).then(res => res.json())
        ]);

        globalStocksData = dataRes.stocksData ? (Array.isArray(dataRes.stocksData) ? dataRes.stocksData[0] : dataRes.stocksData) : dataRes;
        globalStocksStats = statsRes.stocksStats ? (Array.isArray(statsRes.stocksStats) ? statsRes.stocksStats[0] : statsRes.stocksStats) : statsRes;
        globalProfileData = profileRes.detail ? (Array.isArray(profileRes.detail) ? profileRes.detail[0] : profileRes.detail) : profileRes;

        renderStockList();
        updateActiveView();

        rangeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                rangeButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentRange = e.target.getAttribute('data-range');
                renderChart();
            });
        });

    } catch (error) {
        console.error("Error loading stock data:", error);
        stockListContainer.innerHTML = `<div class="message-box">Failed to load API data. Please refresh.</div>`;
    }
}

function renderStockList() {
    stockListContainer.innerHTML = '';

    Stocks.forEach(symbol => {
        const stats = globalStocksStats ? (globalStocksStats[symbol] || {}) : {};
        const bookValue = stats.bookValue !== undefined ? stats.bookValue : 0;
        const profit = stats.profit !== undefined ? stats.profit : 0;

        const isPositive = profit > 0;
        const profitClass = isPositive ? 'profit-positive' : 'profit-negative';
        const formattedProfit = `${isPositive ? '+' : ''}${Number(profit).toFixed(2)}%`;

        const item = document.createElement('div');
        item.className = `stock-item ${symbol === currentStock ? 'selected' : ''}`;
        
        item.innerHTML = `
            <span class="stock-symbol">${symbol}</span>
            <div class="stock-values">
                <div>$${Number(bookValue).toFixed(2)}</div>
                <div class="${profitClass}">${formattedProfit}</div>
            </div>
        `;

        item.addEventListener('click', () => {
            document.querySelectorAll('.stock-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            currentStock = symbol;
            updateActiveView();
        });

        stockListContainer.appendChild(item);
    });
}

function updateActiveView() {
    chartTitle.textContent = `${currentStock} Stock Price`;
    renderChart();
    renderDetails();
}

function renderChart() {
    if (!globalStocksData || !globalStocksData[currentStock]) return;

    const stockObj = globalStocksData[currentStock];
    const availableKeys = Object.keys(stockObj);

    // Smart-match range key
    let targetKey = currentRange;
    if (!stockObj[targetKey]) {
        targetKey = availableKeys.find(k => k.toLowerCase().includes(currentRange.replace('year', 'y').replace('month', 'mo'))) || availableKeys[0];
    }

    const timeSeriesContainer = stockObj[targetKey];
    let valueArray = [];

    if (Array.isArray(timeSeriesContainer)) {
        valueArray = timeSeriesContainer;
    } else if (timeSeriesContainer && typeof timeSeriesContainer === 'object') {
        valueArray = timeSeriesContainer.value || timeSeriesContainer.data || timeSeriesContainer.prices || [];
    }

    if (!Array.isArray(valueArray) || valueArray.length === 0) return;

    const labels = valueArray.map(item => {
        const ts = item.timestamp ?? item.timeStamp ?? item.date ?? item.time;
        if (typeof ts === 'number') {
            return new Date(ts * (ts > 1e10 ? 1 : 1000)).toLocaleDateString();
        }
        return ts ? new Date(ts).toLocaleDateString() : '';
    });

    const dataValues = valueArray.map(item => {
        if (typeof item === 'number') return item;
        return item.value ?? item.price ?? item.close ?? item.val ?? item[1] ?? 0;
    });

    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentStock,
                data: dataValues,
                borderColor: '#6fffe9',
                backgroundColor: 'rgba(111, 255, 233, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6fffe9',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: (context) => context[0].label,
                        label: (context) => `${currentStock}: $${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a5b1c2', maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a5b1c2' }
                }
            }
        }
    });
}

function renderDetails() {
    const stats = globalStocksStats ? (globalStocksStats[currentStock] || {}) : {};
    const profile = globalProfileData ? (globalProfileData[currentStock] || {}) : {};
    
    const bookValue = stats.bookValue !== undefined ? stats.bookValue : 0;
    const profit = stats.profit !== undefined ? stats.profit : 0;
    const summary = profile.summary || "No summary profile available.";

    const isPositive = profit > 0;
    const profitClass = isPositive ? 'profit-positive' : 'profit-negative';

    stockDetailsContent.innerHTML = `
        <div class="details-grid">
            <div class="detail-card">
                <span>Stock Name</span>
                <strong>${currentStock}</strong>
            </div>
            <div class="detail-card">
                <span>Book Value</span>
                <strong>$${Number(bookValue).toFixed(2)}</strong>
            </div>
            <div class="detail-card">
                <span>Profitability</span>
                <strong class="${profitClass}">${isPositive ? '+' : ''}${Number(profit).toFixed(2)}%</strong>
            </div>
        </div>
        <div class="stock-summary">
            <p>${summary}</p>
        </div>
    `;
}

initApp();