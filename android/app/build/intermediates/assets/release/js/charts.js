/**
 * charts.js
 * الرسوم البيانية باستخدام Chart.js
 * - رسم بياني لتطور تقييم الطالب خلال 30 يوم
 * - رسم بياني لحضور الطالب خلال 30 يوم
 */

// متغير لحفظ مرجع الرسم البياني الحالي لتدميره عند فتح رسم جديد
let currentChart = null;

// ═══════════════════════════════════
// ■ فتح نافذة الرسم البياني
// ═══════════════════════════════════

/**
 * فتح نافذة الرسم البياني لطالب معين
 * @param {string} studentId - معرف الطالب
 */
function openChartModal(studentId) {
  const student = getStudentById(studentId);
  if (!student) return;
  
  // تحديث عنوان الـ Modal
  const titleEl = document.getElementById('chart-student-name');
  if (titleEl) {
    titleEl.textContent = `تطور أداء: ${student.name}`;
  }
  
  // فتح الـ Modal
  openModal('modal-chart');
  
  // تأخير بسيط لضمان ظهور الـ Modal قبل رسم الشارت
  setTimeout(() => {
    renderStudentChart(studentId);
  }, 200);
}

// ═══════════════════════════════════
// ■ رسم الرسم البياني
// ═══════════════════════════════════

/**
 * رسم الرسم البياني لطالب معين
 * يعرض خطين: التقييمات والحضور خلال آخر 30 يوم
 * @param {string} studentId - معرف الطالب
 */
function renderStudentChart(studentId) {
  const canvas = document.getElementById('student-chart');
  if (!canvas) return;
  
  // تدمير الرسم البياني السابق إن وجد
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
  
  // جلب سجلات آخر 30 يوم
  const records = getRecordsLastNDays(studentId, CHART_DAYS);
  
  // بناء مصفوفات البيانات
  const labels = [];
  const ratingsData = [];
  const attendanceData = [];
  
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const date = getDateDaysAgo(i);
    const record = records.find(r => r.date === date);
    
    // تنسيق التاريخ للعرض (يوم/شهر)
    const dateObj = new Date(date);
    const dayMonth = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
    labels.push(dayMonth);
    
    if (record) {
      ratingsData.push(record.present ? record.rating : null);
      attendanceData.push(record.present ? 1 : 0);
    } else {
      ratingsData.push(null);
      attendanceData.push(0);
    }
  }
  
  const ctx = canvas.getContext('2d');
  
  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'التقييم',
          data: ratingsData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
          spanGaps: true,
          yAxisID: 'y'
        },
        {
          label: 'الحضور',
          data: attendanceData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          tension: 0.1,
          fill: true,
          stepped: 'middle',
          yAxisID: 'y1'
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
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: 'Cairo',
              size: 13
            },
            color: '#1a2e1a',
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          rtl: true,
          titleFont: {
            family: 'Cairo',
            size: 13
          },
          bodyFont: {
            family: 'Cairo',
            size: 12
          },
          backgroundColor: 'rgba(22, 101, 52, 0.9)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#22c55e',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'الحضور') {
                return context.raw === 1 ? 'حاضر ✓' : 'غائب ✗';
              }
              return `التقييم: ${context.raw !== null ? context.raw : 'غائب'}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: {
              family: 'Cairo',
              size: 10
            },
            color: '#6b7280',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 10,
          title: {
            display: true,
            text: 'التقييم',
            font: {
              family: 'Cairo',
              size: 13
            },
            color: '#22c55e'
          },
          ticks: {
            font: {
              family: 'Cairo',
              size: 11
            },
            color: '#22c55e',
            stepSize: 1
          },
          grid: {
            color: 'rgba(34, 197, 94, 0.1)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 1,
          title: {
            display: true,
            text: 'الحضور',
            font: {
              family: 'Cairo',
              size: 13
            },
            color: '#f59e0b'
          },
          ticks: {
            font: {
              family: 'Cairo',
              size: 11
            },
            color: '#f59e0b',
            stepSize: 1,
            callback: function(value) {
              return value === 1 ? 'حاضر' : 'غائب';
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}
