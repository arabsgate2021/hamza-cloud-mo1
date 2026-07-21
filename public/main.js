document.addEventListener('DOMContentLoaded', function() {
    let achievedChart, gaugeChart, pendingChart, staffChart;

    const oppCountEl = document.getElementById('oppCount');
    const visitCountEl = document.getElementById('visitCount');
    const salesValueEl = document.getElementById('salesValue');
    const pendingValueEl = document.getElementById('pendingValue');
    const tbody = document.getElementById('monthsBody');

    const monthsNames = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    let cachedData = {
        opportunities: [],
        visits: []
    };

    // جلب البيانات من قاعدة البيانات السحابية
    async function fetchCloudData() {
        try {
            const [oppsRes, visitsRes] = await Promise.all([
                fetch('/api/opportunities'),
                fetch('/api/visits')
            ]);

            let opps = await oppsRes.json();
            let visits = await visitsRes.json();

            // إذا كانت قاعدة البيانات جديدة وفارغة، يتم إضافة بيانات أولية سحابياً تلقائياً
            if ((!opps || opps.length === 0) && (!visits || visits.length === 0)) {
                await seedInitialData();
                return fetchCloudData();
            }

            cachedData.opportunities = Array.isArray(opps) ? opps : [];
            cachedData.visits = Array.isArray(visits) ? visits : [];

            populateFilterOptions();
            updateDashboard();
        } catch (e) {
            console.error("خطأ في جلب البيانات السحابية:", e);
        }
    }

    async function seedInitialData() {
        const sampleOpps = [
            { date: "2026-01-15", value: 14210, status: "محقق", region: "الرياض", supervisor: "أحمد", salesman: "محمد" },
            { date: "2026-02-20", value: 790, status: "معلق", region: "جدة", supervisor: "خالد", salesman: "فهد" }
        ];
        const sampleVisits = [
            { date: "2026-01-10", status: "ناجحة", region: "الرياض", supervisor: "أحمد", salesman: "محمد" },
            { date: "2026-02-12", status: "مجدولة", region: "جدة", supervisor: "خالد", salesman: "فهد" }
        ];

        for (const item of sampleOpps) {
            await fetch('/api/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }
        for (const item of sampleVisits) {
            await fetch('/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        }
    }

    function populateFilterOptions() {
        const data = cachedData;
        
        const regions = new Set();
        const supervisors = new Set();
        const salesmen = new Set();
        const years = new Set(["2026"]);

        data.opportunities.forEach(item => {
            if (item.region) regions.add(item.region);
            if (item.supervisor) supervisors.add(item.supervisor);
            if (item.salesman) salesmen.add(item.salesman);
            if (item.date) {
                const year = item.date.split('-')[0];
                if(year) years.add(year);
            }
        });

        data.visits.forEach(item => {
            if (item.region) regions.add(item.region);
            if (item.supervisor) supervisors.add(item.supervisor);
            if (item.salesman) salesmen.add(item.salesman);
            if (item.date) {
                const year = item.date.split('-')[0];
                if(year) years.add(year);
            }
        });

        fillSelect(document.getElementById('filterYear'), years, "2026");
        fillSelect(document.getElementById('filterMonth'), monthsNames, "الكل", true);
        fillSelect(document.getElementById('filterRegion'), regions, "الكل");
        fillSelect(document.getElementById('filterSupervisor'), supervisors, "الكل");
        fillSelect(document.getElementById('filterSalesman'), salesmen, "الكل");
    }

    function fillSelect(selectElement, setOrArray, defaultVal, isMonth = false) {
        if (!selectElement) return;
        
        const currentValue = selectElement.value;
        selectElement.innerHTML = '';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.text = defaultVal;
        defaultOpt.value = defaultVal === "الكل" ? "all" : defaultVal;
        selectElement.appendChild(defaultOpt);

        setOrArray.forEach((val, index) => {
            if(isMonth && val === defaultVal) return;
            const opt = document.createElement('option');
            opt.text = val;
            opt.value = isMonth ? (index + 1).toString().padStart(2, '0') : val; 
            if(val !== defaultVal) selectElement.appendChild(opt);
        });

        if (currentValue && selectElement.querySelector(`option[value="${currentValue}"]`)) {
            selectElement.value = currentValue;
        }
    }

    function updateDashboard() {
        const data = cachedData;

        const selectedYear = document.getElementById('filterYear')?.value || "2026";
        const selectedMonth = document.getElementById('filterMonth')?.value || "all";
        const selectedRegion = document.getElementById('filterRegion')?.value || "all";
        const selectedSupervisor = document.getElementById('filterSupervisor')?.value || "all";
        const selectedSalesman = document.getElementById('filterSalesman')?.value || "all";

        const filterCallback = (item) => {
            const itemYear = item.date ? item.date.split('-')[0] : "";
            const itemMonth = item.date ? item.date.split('-')[1] : "";

            if (selectedYear !== "all" && itemYear !== selectedYear) return false;
            if (selectedMonth !== "all" && itemMonth !== selectedMonth) return false;
            if (selectedRegion !== "all" && item.region !== selectedRegion) return false;
            if (selectedSupervisor !== "all" && item.supervisor !== selectedSupervisor) return false;
            if (selectedSalesman !== "all" && item.salesman !== selectedSalesman) return false;
            return true;
        };

        const filteredOpps = data.opportunities.filter(filterCallback);
        const filteredVisits = data.visits.filter(filterCallback);

        let totalSales = 0;
        let totalPending = 0;
        let successfulVisits = filteredVisits.filter(v => v.status === "ناجحة" || v.status === "نجاح").length;

        filteredOpps.forEach(opp => {
            const val = parseFloat(opp.value) || 0;
            if (opp.status === "محقق" || opp.status === "ناجح") {
                totalSales += val;
            } else if (opp.status === "معلق") {
                totalPending += val;
            }
        });

        if(oppCountEl) oppCountEl.innerText = filteredOpps.length.toLocaleString('en-US');
        if(visitCountEl) visitCountEl.innerText = filteredVisits.length.toLocaleString('en-US');
        if(salesValueEl) salesValueEl.innerText = totalSales.toLocaleString('en-US');
        if(pendingValueEl) pendingValueEl.innerText = totalPending.toLocaleString('en-US');

        updateYearlyTable(filteredOpps, filteredVisits, selectedYear);
        updateChartsLogic(totalSales, totalPending, filteredVisits.length, successfulVisits, filteredOpps);
    }

    function updateYearlyTable(opps, visits, year) {
        if (!tbody) return;
        tbody.innerHTML = '';

        monthsNames.forEach((monthName, index) => {
            const monthCode = (index + 1).toString().padStart(2, '0');
            
            const mOpps = opps.filter(o => o.date && o.date.split('-')[1] === monthCode);
            const mVisits = visits.filter(v => v.date && v.date.split('-')[1] === monthCode);

            let mSales = 0;
            let mPending = 0;
            let mSuccessVisits = mVisits.filter(v => v.status === "ناجحة" || v.status === "نجاح").length;

            mOpps.forEach(o => {
                const val = parseFloat(o.value) || 0;
                if (o.status === "محقق" || o.status === "ناجح") mSales += val;
                else if (o.status === "معلق") mPending += val;
            });

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${monthName}</td>
                <td>15k</td>
                <td>${mSales > 0 ? (mSales/1000).toFixed(1) + 'k' : '-'}</td>
                <td class="thick-border">${mPending > 0 ? (mPending/1000).toFixed(1) + 'k' : '-'}</td>
                <td style="color:#3b82f6">${mVisits.length > 0 ? mVisits.length : '-'}</td>
                <td style="color:#22c55e">${mSuccessVisits > 0 ? mSuccessVisits : '-'}</td>
            `;
        });
    }

    function initCharts() {
        const achievedEl = document.getElementById('achievedChart');
        if (achievedEl) {
            achievedChart = new Chart(achievedEl.getContext('2d'), {
                type: 'doughnut',
                data: { datasets: [{ data: [0, 100], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
                options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const gaugeEl = document.getElementById('gaugeChart');
        if (gaugeEl) {
            gaugeChart = new Chart(gaugeEl.getContext('2d'), {
                type: 'doughnut',
                data: { datasets: [{ data: [0, 200], backgroundColor: ['#ef4444', '#f1f5f9'], borderWidth: 0 }] },
                options: { rotation: 270, circumference: 180, cutout: '80%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const pendingEl = document.getElementById('pendingChart');
        if (pendingEl) {
            pendingChart = new Chart(pendingEl.getContext('2d'), {
                type: 'doughnut',
                data: { datasets: [{ data: [0, 100], backgroundColor: ['#facc15', '#f1f5f9'], borderWidth: 0, borderRadius: 10 }] },
                options: { cutout: '85%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        const staffEl = document.getElementById('staffChart');
        if (staffEl) {
            staffChart = new Chart(staffEl.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Array.from({length: 30}, (_, i) => `موظف مبيعات ${i + 1}`), 
                    datasets: [
                        { label: 'المحقق', data: Array.from({length: 30}, () => 0), backgroundColor: '#22c55e' },
                        { label: 'المعلق', data: Array.from({length: 30}, () => 0), backgroundColor: '#facc15' }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed.y !== undefined) {
                                        label += Number(context.parsed.y).toLocaleString('en-US') + ' ريال';
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: { 
                        x: { 
                            grid: { display: false }, 
                            ticks: { 
                                font: { family: 'Cairo', size: 9 },
                                maxRotation: 45,  
                                minRotation: 45
                            } 
                        } 
                    } 
                }
            });
        }
    }

    function updateChartsLogic(sales, pending, totalVisits, successVisits, filteredOpps = []) {
        const grandTotal = sales + pending || 1; 
        const salesPercent = Math.round((sales / grandTotal) * 100) || 0;
        const pendingPercent = Math.round((pending / grandTotal) * 100) || 0;

        const achievedChartCanvas = document.getElementById('achievedChart');
        if (achievedChartCanvas) {
            const achievedText = achievedChartCanvas.parentNode.querySelector('.chart-percentage');
            if(achievedText) achievedText.innerText = `${salesPercent}%`;
        }

        const pendingChartCanvas = document.getElementById('pendingChart');
        if (pendingChartCanvas) {
            const pendingText = pendingChartCanvas.parentNode.querySelector('.chart-percentage');
            if(pendingText) pendingText.innerText = `${pendingPercent}%`;
        }

        const targetYearly = 180000;
        const gaugePercent = Math.min(Math.round((sales / targetYearly) * 100), 200);
        const gaugeValueText = document.querySelector('.gauge-container-reduced .gauge-value');
        if(gaugeValueText) gaugeValueText.innerText = `${gaugePercent}%`;

        if (achievedChart) {
            achievedChart.data.datasets[0].data = [salesPercent, 100 - salesPercent];
            achievedChart.update();
        }
        if (pendingChart) {
            pendingChart.data.datasets[0].data = [pendingPercent, 100 - pendingPercent];
            pendingChart.update();
        }

        if (gaugeChart) {
            let remaining = 200 - gaugePercent;
            let gaugeColor = '#ef4444';
            
            if (gaugePercent >= 100) gaugeColor = '#15803d';
            else if (gaugePercent >= 75) gaugeColor = '#4ade80';
            else if (gaugePercent >= 50) gaugeColor = '#fbbf24';
            
            gaugeChart.data.datasets[0].data = [gaugePercent, remaining > 0 ? remaining : 0];
            gaugeChart.data.datasets[0].backgroundColor = [gaugeColor, '#f1f5f9'];
            gaugeChart.update();
        }

        if (staffChart) {
            const staffAggregation = {};

            filteredOpps.forEach(opp => {
                const name = opp.salesman ? opp.salesman.trim() : "";
                if (!name) return;

                if (!staffAggregation[name]) {
                    staffAggregation[name] = { achieved: 0, pending: 0 };
                }

                const value = parseFloat(opp.value) || 0;
                if (opp.status === "محقق" || opp.status === "ناجح") {
                    staffAggregation[name].achieved += value;
                } else if (opp.status === "معلق") {
                    staffAggregation[name].pending += value;
                }
            });

            const realStaffNames = Object.keys(staffAggregation);

            const finalLabels = Array.from({length: 30}, (_, i) => realStaffNames[i] || `موظف مبيعات ${i + 1}`);
            
            const salesDataset = Array.from({length: 30}, (_, i) => {
                const name = realStaffNames[i];
                return name ? staffAggregation[name].achieved : (sales === 0 ? 0 : Math.floor(sales * (Math.random() * 0.15)));
            });

            const pendingDataset = Array.from({length: 30}, (_, i) => {
                const name = realStaffNames[i];
                return name ? staffAggregation[name].pending : (pending === 0 ? 0 : Math.floor(pending * (Math.random() * 0.10)));
            });

            staffChart.data.labels = finalLabels;
            staffChart.data.datasets[0].data = salesDataset;
            staffChart.data.datasets[1].data = pendingDataset;
            staffChart.update();
        }
    }

    initCharts();
    fetchCloudData();

    document.querySelectorAll('.filter-input').forEach(select => {
        select.addEventListener('change', updateDashboard);
    });
});
