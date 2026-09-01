'use strict';

const CHART_CONFIG = 
{
    POINTS:20,
    VOLATILITY:{1:1, 7:2, 30:3}
};

// Data Management
const portfolioData =
{
    tokens:
    [
        {symbol:'BTC', name:'Bitcoin', icon:'₿', color:'#f7931a', amount:0.5},
        {symbol:'ETH', name:'Ethereum', icon:'Ξ', color:'#627eea', amount:10},
        {symbol:'SOL', name:'Solana', icon:'S', color:'#00ffa3', amount:100},
        {symbol:'USDC', name:'USD Coin', icon:'$', color:'#2775ca', amount:5000}
    ],
    prices:{},
    changes:{}
};

const chartDataCache = {};

function getChartData(range = 1)
{
    const normalizedRange = Number(range) || 1;
    
    if(chartDataCache[normalizedRange])
        {
            return chartDataCache[normalizedRange];
        }

    const points = CHART_CONFIG.POINTS;
    const data = [];
    let value = 10000;
    const volatility = CHART_CONFIG.VOLATILITY[normalizedRange] || 1;

    for(let i = 0; i < points; i++)
        {
            value += (Math.random() - 0.5) * 500 * volatility;
            data.push(Math.max(5000, value));
        }

    chartDataCache[normalizedRange] = data;
    return data;
}

function applyDemoMarketData()
{
    portfolioData.prices = 
    {
        BTC:45000,
        ETH:2500,
        SOL:100,
        USDC:1
    };
    portfolioData.changes = 
    {
        BTC:2.5,
        ETH:-1.2,
        SOL:5.8,
        USDC:0.01
    };
}

// CoinGecko API - Fetch live market data
async function fetchPrices()
{
    try
    {
        const response = await fetch
        (
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,usd-coin&vs_currencies=usd&include_24hr_change=true'
        );
        
        if(!response.ok)
            {
                throw new Error(`HTTP ${response.status}`);
            }
        
        const data = await response.json();

        portfolioData.prices =
        {
            BTC:data.bitcoin.usd,
            ETH:data.ethereum.usd,
            SOL:data.solana.usd,
            USDC:data['usd-coin'].usd
        };

        portfolioData.changes = 
        {
            BTC:data.bitcoin.usd_24h_change,
            ETH:data.ethereum.usd_24h_change,
            SOL:data.solana.usd_24h_change,
            USDC:data['usd-coin'].usd_24h_change
        };

        updateUI();
    
    }
    catch(error)
    {
        console.warn('Failed to fetch prices, using fallback data:', error);
        applyDemoMarketData();
        updateUI();
    }
}

// Update UI with current data
function updateUI()
{
    let totalValue = 0;
    portfolioData.tokens.forEach(token =>
        {
            totalValue += token.amount * (portfolioData.prices[token.symbol] || 0);
        });

    // Update hero section
    const portfolioValueEl = document.getElementById('portfolioValue');
    portfolioValueEl.textContent = `$${totalValue.toLocaleString('en-US', 
        {
            minimumFractionDigits:2, 
            maximumFractionDigits:2 
        })}`;
    
    // Calculate weighted 24h change
    let weightedChange = 0;
    if (totalValue > 0)
        {
            portfolioData.tokens.forEach(token => 
                {
                    const tokenValue = token.amount * (portfolioData.prices[token.symbol] || 0);
                    const tokenChange = portfolioData.changes[token.symbol] || 0;
                    weightedChange += (tokenValue / totalValue) * tokenChange;
                });
        }

    const changeElement = document.getElementById('portfolioChange');
    changeElement.className = `hero-change ${weightedChange >= 0 ? 'positive' :'negative'}`;
    changeElement.innerHTML = 
    `
    <span class="change-arrow">${weightedChange >= 0 ? '↑' :'↓'}</span>
    <span class="change-value">${Math.abs(weightedChange).toFixed(2)}%</span>
    <span class="change-period">(24h)</span>
    `;
    // Update token list
    renderTokenList();
    // Update swap rate
    updateSwapRate();
}

// Render token list with staggered animation
function renderTokenList()
{
    
    const container = document.getElementById('tokenContainer');
    container.innerHTML = '';
    portfolioData.tokens.forEach(token => 
        {
            const price = portfolioData.prices[token.symbol] || 0;
            const change = portfolioData.changes[token.symbol] || 0;
            const value = token.amount * price;
            const item = document.createElement('div');
            item.className = 'token-item';
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.innerHTML = 
            `
            <div class="token-icon" style="background:${token.color}20; color:${token.color}"
            >
            ${token.icon}
            </div>
            <div class="token-info">
            <div class="token-name">${token.name}</div>
            <div class="token-symbol">${token.amount} ${token.symbol}</div>
            </div>
            <div class="token-price">$${value.toLocaleString('en-US', 
                {
                    minimumFractionDigits:2, 
                    maximumFractionDigits:2 
                })}</div>
                <div class="token-change ${change >= 0 ? 'positive' :'negative'}"
                
            >
            ${change >= 0 ? '+' :''}${change.toFixed(2)}%
            </div>
            `;
            
            container.appendChild(item);
            // Staggered animation (without setTimeout in observer)
            requestAnimationFrame(() => 
                {
                    item.classList.add('visible');
                });
        });
}

// Chart rendering with SVG - OPTIMIZED
function renderChart(range = 1)
{
    const svg = document.getElementById('chartSvg');
    const width = svg.clientWidth || svg.getBoundingClientRect().width || 400;
    const height = svg.clientHeight || svg.getBoundingClientRect().height || 250;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const data = getChartData(range);
    const points = data.length

    const min = Math.min(...data);
    const max = Math.max(...data);
    const rangeValue = max - min || 1;

    // Generate path
    let pathD = '';
    let areaD = '';

    data.forEach((val, i) => 
        {
            const x = (i / (points - 1)) * width;
            const y = height - ((val - min) / rangeValue) * height;

            if(i === 0)
                {
                    pathD += `M ${x} ${y}`;
                    areaD += `M ${x} ${height} L ${x} ${y}`;
                }
                else
                    {
                        pathD += `L ${x} ${y}`;
                        areaD += `L ${x} ${y}`;
                    }
        });

    areaD += ` L ${width} ${height} Z`;
    document.getElementById('chartLine').setAttribute('d', pathD);
    document.getElementById('chartArea').setAttribute('d', areaD);
}

// Swap functionality
function updateSwapRate()
{
    const fromSymbol = document.getElementById('fromToken').querySelector('span').textContent;
    const toSymbol = document.getElementById('toToken').querySelector('span').textContent;
    
    const fromPrice = portfolioData.prices[fromSymbol] || 0;
    const toPrice = portfolioData.prices[toSymbol] || 1;
    
    const rate = fromPrice / toPrice;
    document.getElementById('swapRate').textContent = `1 ${fromSymbol} = ${rate.toFixed(2)} ${toSymbol}`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => 
    {
        // From amount input
        document.getElementById('fromAmount').addEventListener('input', (e) => 
            {
                const cleanedValue = e.target.value
                .replace(/[^\d.]/g, '')
                .replace(/(\..*)\./g, '$1');
                
                if(e.target.value !== cleanedValue){e.target.value = cleanedValue;}

                const amount = parseFloat(cleanedValue) || 0;
                const fromSymbol = document.getElementById('fromToken').querySelector('span').textContent;
                const toSymbol = document.getElementById('toToken').querySelector('span').textContent;
        
                const fromPrice = portfolioData.prices[fromSymbol] || 0;
                const toPrice = portfolioData.prices[toSymbol] || 1;
                
                const toAmount = (amount * fromPrice) / toPrice;
                document.getElementById('toAmount').value = toAmount > 0 ? toAmount.toFixed(2) :'';
                
                const swapBtn = document.getElementById('swapBtn');
                swapBtn.disabled = amount <= 0;
                swapBtn.textContent = amount > 0 ? 'Swap' :'Enter an amount';
            });

        // Swap arrow (reverse tokens)
        const swapArrow = document.getElementById('swapArrow');
        
        function triggerSwapArrowFeedback()
        {
            swapArrow.classList.remove('is-animating');
            void swapArrow.offsetWidth;
            swapArrow.classList.add('is-animating');
            
            window.setTimeout(() => {swapArrow.classList.remove('is-animating');}, 220);
        }
        
        swapArrow.addEventListener('pointerdown', () => {swapArrow.classList.add('is-pressed');});
            
            ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach(eventName => 
                {
                    swapArrow.addEventListener(eventName, () => {swapArrow.classList.remove('is-pressed');});
                });
                
                swapArrow.addEventListener('click', () => 
                    {
                        const fromToken = document.getElementById('fromToken');
                        const toToken = document.getElementById('toToken');

                        const fromText = fromToken.querySelector('span').textContent;
                        const toText = toToken.querySelector('span').textContent;

                        fromToken.querySelector('span').textContent = toText;
                        toToken.querySelector('span').textContent = fromText;

                        updateSwapRate();
                        document.getElementById('fromAmount').dispatchEvent(new Event('input'));
                        triggerSwapArrowFeedback();
                    });

        // Time filter buttons
        document.querySelectorAll('.time-btn').forEach(btn => 
            {
                btn.addEventListener('click', (e) => 
                    {
                        document.querySelectorAll('.time-btn').forEach(b => 
                            {
                                b.classList.remove('active');
                                b.setAttribute('aria-pressed', 'false');
                            });
                
                        e.target.classList.add('active');
                        e.target.setAttribute('aria-pressed', 'true');
                        renderChart(parseInt(e.target.dataset.range));
                    });
            });
            
            // Wallet connect button (demo)
            document.getElementById('walletBtn').addEventListener('click', () => 
                {
                    alert('Wallet connection is a demo feature. In production, this would connect to MetaMask or other Web3 wallets.');
                });

            // Swap button (demo)
            document.getElementById('swapBtn').addEventListener('click', () => 
                {
                    alert('Swap executed (demo). In production, this would execute a real transaction on a DEX.');
                });

            // Token item click (demo)
            document.getElementById('tokenContainer').addEventListener('click', (e) => 
                {
                    const item = e.target.closest('.token-item');
                    if(item)
                        {
                            const tokenName = item.querySelector('.token-name').textContent;
                            alert(`Token details for ${tokenName} (demo). In production, this would show detailed analytics.`);
                        }
                });
                
                applyDemoMarketData();
                updateUI();

                fetchPrices();
                renderChart(1);

                let chartResizeTimer;
                window.addEventListener('resize', () => 
                    {
                        clearTimeout(chartResizeTimer);
                        chartResizeTimer = setTimeout(() => 
                            {
                                const activeRange = document.querySelector('.time-btn.active')?.dataset.range || 1;
                                renderChart(Number(activeRange));
                            }, 150);
                    });
    });
