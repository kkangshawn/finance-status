// 숫자를 파싱하는 안전한 함수
const parseVal = (el) => parseFloat(el?.innerText?.replace(/,/g, '')) || 0;

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('val')) calculate();
});

function calculate() {
    // Calculate for Korea
    calculateRegion('korea');
    // Calculate for Germany
    calculateRegion('germany');
    saveData();
}

function calculateRegion(region) {
    const suffix = `-${region}`;
    
    // Get all values for the region
    const aptVals = Array.from(document.querySelectorAll(`#table-apt${suffix} .val`)).map(parseVal);
    const buyPrice = aptVals[0] || 0; 
    const sellPrice = aptVals[1] || 0;

    let totalDebt = 0;
    document.querySelectorAll(`#table-debt${suffix} .val`).forEach(el => totalDebt += parseVal(el));

    let totalIncome = 0;
    document.querySelectorAll(`#table-monthly-income${suffix} .val`).forEach(el => totalIncome += parseVal(el));

    let totalExpense = 0;
    document.querySelectorAll(`#table-expense${suffix} .val`).forEach(el => totalExpense += parseVal(el));

    // Update results for the region
    document.getElementById(`res-current${suffix}`).innerText = (buyPrice + totalDebt).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById(`res-future${suffix}`).innerText = (sellPrice + totalDebt).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById(`res-cashflow${suffix}`).innerText = (totalIncome + totalExpense).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function addRow(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td contenteditable="true" class="w-2/3 text-gray-500 italic">새 항목</td>
        <td><span contenteditable="true" class="val">0</span><div class="delete-btn" onclick="deleteRow(this)">&times;</div></td>
    `;
    tbody.appendChild(tr);
    calculate();
}

function deleteRow(btn) {
    btn.closest('tr').remove();
    calculate();
}

function toggleEditMode() {
    const container = document.getElementById('main-container');
    const btn = document.getElementById('edit-toggle');
    const isEditing = container.classList.toggle('editing');
    btn.classList.toggle('active', isEditing);
    btn.textContent = isEditing ? '✅ 완료' : '✏️ 편집';

    if (!isEditing) {
        // 편집 모드 종료 시 데이터 저장
        saveData();
    }
}

async function drawChart() {
    // 1. JSON 파일 불러오기 (매일 갱신되는 파일)
    const response = await fetch('https://storage.googleapis.com/kkangshawn-aptdata/trade_info_test.json');
    const rawData = await response.json();

    rawData.sort((a, b) => new Date(b.dealDate) - new Date(a.dealDate));
    const allLabels = [...new Set(rawData.map(item => item.dealDate))];

    const filterAndMap = (areaThreshold, isGreater) => {
        return rawData
            .filter(d => {
                const area = parseFloat(d.exclusiveUseArea);
                return isGreater ? area >= areaThreshold : area <= areaThreshold;
            })
            .map(item => ({
                x: item.dealDate, // 카테고리 라벨과 일치해야 함
                y: parseInt(item.dealAmount.replace(/,/g, '')),
                dong: item.aptDong || '정보없음',
                floor: item.floor,
                area: item.exclusiveUseArea
            }));
    };
    const data_99 = filterAndMap(99, true);
    const data_91 = filterAndMap(91, false);
    const allDataPoints = data_99.length + data_91.length;

    const chartWidth = Math.max(window.innerWidth, allDataPoints * 20); 
    document.getElementById('chartWrapper').style.width = chartWidth + "px";

    const ctx = document.getElementById('realEstateChart').getContext('2d');
    new Chart(ctx, {
        type: 'line', // 데이터가 뭉칠 수 있으므로 scatter(산점도) 형식이 적합
        data: {
            labels: allLabels,
            datasets: [
            {
                label: '(99㎡)',
                data: data_99,
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointHitRadius: 10,
                showLine: true, // 점들을 선으로 연결
                tension: 0.2,
                spanGaps: true
            },
            {
                label: '(91㎡)',
                data: data_91,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 10,
                pointHitRadius: 10,
                tension: 0.2,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                x: {
                    type: 'category',                            
                    ticks: {
                        autoSkip: false,
                        font: {
                            size: 10,
                        },
                        maxRotation: 80,
                        minRotation: 80,
                        padding: 5
                    },
                    grid: {
                        display: false
                    },
                    title: { display: true, text: '거래 날짜' }
                },
                y: {
                    beginAtZero: false,
                    title: { display: true, text: '거래 금액(만원)' },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            // 툴팁 상단에 날짜 표시
                            return `거래일: ${context[0].label}`;
                        },
                        label: function(context) {
                            const d = context.raw;
                            const label = context.dataset.label; // '30평형대' 또는 '20평형대'
                            return [
                                ` 분류: ${label}`,
                                ` 금액: ${d.y.toLocaleString()}만원`,
                                ` 위치: ${d.dong} / ${d.floor}층`,
                                ` 면적: ${d.area}㎡`
                            ];
                        }
                    }
                }
            }
        }
    });
}
// 테이블 데이터를 JSON으로 추출
function getTableData() {
    const regions = ['korea', 'germany'];
    const data = {};

    regions.forEach(region => {
        const suffix = `-${region}`;
        data[region] = {
            apt: Array.from(document.querySelectorAll(`#table-apt${suffix} tbody tr`)).map(tr => ({
                label: tr.cells[0].innerText,
                value: tr.querySelector('.val').innerText
            })),
            debt: Array.from(document.querySelectorAll(`#table-debt${suffix} tbody tr`)).map(tr => ({
                label: tr.cells[0].innerText,
                value: tr.querySelector('.val').innerText
            })),
            income: Array.from(document.querySelectorAll(`#table-monthly-income${suffix} tbody tr`)).map(tr => ({
                label: tr.cells[0].innerText,
                value: tr.querySelector('.val').innerText
            })),
            expense: Array.from(document.querySelectorAll(`#table-expense${suffix} tbody tr`)).map(tr => ({
                label: tr.cells[0].innerText,
                value: tr.querySelector('.val').innerText
            }))
        };
    });

    console.log('Extracted table data:', data);
    return data;
}

// 서버(GCS 연결 API)로 전송
async function saveData() {
    const data = getTableData();
    console.log('Saving data to server:', data);
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log('Save response status:', response.status);
        if (response.ok) {
            console.log('Saved to GCS successfully');
            const responseText = await response.text();
            console.log('Response text:', responseText);
        } else {
            console.error('Save failed with status:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
        }
    } catch (err) {
        console.error('저장 실패:', err);
    }
}

// 페이지 로드 시 데이터 불러오기
async function loadData() {
    try {
        console.log('Loading data from server...');
        const response = await fetch('/api/load');
        console.log('Load response status:', response.status);
        if (!response.ok) {
            console.error('Load failed with status:', response.status);
            return;
        }
        const data = await response.json();
        console.log('Loaded data from server:', data);
        
        const regions = ['korea', 'germany'];
        
        regions.forEach(region => {
            const suffix = `-${region}`;
            const regionData = data[region];
            
            if (!regionData) return;

            const sections = {
                [`table-apt${suffix}`]: regionData.apt,
                [`table-debt${suffix}`]: regionData.debt,
                [`table-monthly-income${suffix}`]: regionData.income,
                [`table-expense${suffix}`]: regionData.expense
            };

            for (const [tableId, items] of Object.entries(sections)) {
                const tbody = document.querySelector(`#${tableId} tbody`);
                if (!tbody || !items) continue;

                tbody.innerHTML = '';

                items.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td contenteditable="true" class="${tableId.includes('apt') ? 'w-2/3' : ''}">${item.label}</td>
                        <td>
                            <span contenteditable="true" class="val">${item.value}</span>
                            <div class="delete-btn" onclick="deleteRow(this)">&times;</div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
        
        calculate();
    } catch (err) {
        console.log('불러오기 실패 (초기 상태)', err);
    }
}

window.onload = loadData;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    drawChart().catch(err => console.error('차트 그리기 실패:', err));
});

