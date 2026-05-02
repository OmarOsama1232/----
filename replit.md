# حلقتنا v4 — تطبيق إدارة حلقات تحفيظ القرآن الكريم

## وصف المشروع
تطبيق ويب متكامل (PWA) لإدارة حلقات تحفيظ القرآن الكريم. يتيح للمعلمين متابعة الطلاب، الحضور، التقييمات اليومية، الإحصائيات، ومواقيت الصلاة. الواجهة عربية (RTL) متجاوبة بالكامل.

## التقنيات المستخدمة
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES5/ES6 compatible)
- **Storage**: LocalStorage
- **PWA**: Service Worker + manifest.json
- **المكتبات**: Chart.js 4, SheetJS (XLSX), jsPDF, html2canvas, Font Awesome 6, Tajawal + Cairo fonts
- **Server**: Node.js HTTP server (server.js) — Port 5000

## بنية المشروع
```
/
├── index.html          # SPA رئيسية (4 صفحات + modal الحضور + جميع الـ Modals)
├── server.js           # سيرفر Node.js بسيط على port 5000
├── sw.js               # Service Worker (كاش + إشعارات)
├── manifest.json       # PWA manifest
├── icon-512.png        # أيقونة التطبيق
├── css/
│   ├── style.css       # نظام التصميم الكامل v4 (~2600 سطر)
│   └── responsive.css  # تنسيقات متجاوبة (240px → 1400px+)
└── js/
    ├── constants.js    # الثوابت (السور، أيام الدراسة، MAX_PARTS=30)
    ├── db.js           # طبقة LocalStorage (CRUD + getRecordsForPeriod + isClassDay)
    ├── ui.js           # Toast, Modal, updateDateDisplay, showConfirm
    ├── students.js     # إدارة الطلاب (CRUD) + renderStudentsTable
    ├── attendance.js   # تسجيل الحضور + filterStudents() [يقرأ #search-input, #filter-select]
    ├── reports.js      # updateDashboardCards, renderWeeklyReport, renderHonorBoard
    ├── charts.js       # رسم بياني الطالب المنفرد (student-chart canvas)
    ├── profile.js      # الملف الشخصي openStudentProfile + updateProfileView
    ├── notifications.js # نظام إشعارات الصلاة
    ├── prayer.js       # مواقيت الصلاة + عداد تنازلي + retryPrayerTimes
    ├── backbutton.js   # زر الرجوع في Android
    ├── navigation.js   # SPA navigation: navigateTo, openAttendanceModal, patchStudentFunctions
    ├── cards.js        # بطاقات الطلاب: renderStudentsCards, renderHonorBoardCards, filterStudentsCards
    ├── reports-page.js # صفحة التقارير: renderReportsFull, Chart.js (line/bar/pie), sortReportsTable
    ├── darkmode.js     # تبديل الوضع الليلي (يُحمَّل أولاً لمنع الوميض)
    └── app.js          # نقطة الدخول الرئيسية (DOMContentLoaded + generateMockData)
```

## بنية SPA (الصفحات الداخلية)
التطبيق عبارة عن SPA بأربع صفحات يتنقل بينها شريط التنقل السفلي مع زر FAB مركزي:

| معرف الصفحة      | محتواها                                              | زر التنقل             |
|-------------------|------------------------------------------------------|-----------------------|
| `page-home`       | بطاقة الصلاة، KPI (4 بطاقات)، CTA الحضور، لوحة الشرف، تنبيهات | nav-item[data-page="page-home"] |
| `page-students`   | شبكة بطاقات الطلاب مع بحث وتصفية + FAB إضافة        | nav-item[data-page="page-students"] |
| `page-reports`    | KPI + Chart.js (line/bar/pie) + جدول + summary cards + تصدير | nav-item[data-page="page-reports"] |
| `page-settings`   | أدوات المسؤول، الإعدادات، التصدير/الاستيراد           | nav-item[data-page="page-settings"] |
| `modal-attendance`| جدول الحضور الكامل (يفتح كـ modal من FAB الأوسط أو CTA) | nav-fab-btn           |

## ترتيب تحميل JS (مهم)
```
constants.js → db.js → ui.js → students.js → attendance.js →
reports.js → charts.js → profile.js → notifications.js →
prayer.js → backbutton.js → navigation.js → cards.js → reports-page.js → app.js
```

## IDs حرجة يجب الحفاظ عليها
```
# في modal-attendance:
  search-input, filter-select, students-tbody, btn-save-attendance, attendance-date-badge

# في page-home (Dashboard):
  prayer-card, next-prayer-name, next-prayer-countdown, btn-retry-prayer
  total-students-count, today-attendance-count, today-attendance-percent
  weekly-avg-rating, top-student-name, top-student-rating
  dashboard-period-select (hidden, synced مع period pills)
  honor-cards-container, alerts-list, dashboard-alerts

# في page-students:
  cards-search-input (للبطاقات فقط — students-grid)
  students-cards-container, fab-add-student

# في page-reports:
  rpt-total-students, rpt-total-present, rpt-attendance-pct, rpt-avg-rating, rpt-total-parts
  rpt-line-chart, rpt-bar-chart, rpt-pie-chart
  rpt-table-body, reports-search-input
  summary-top-attendance, summary-top-rating, summary-top-parts, summary-low-attendance
  weekly-tbody (hidden — للتوافق مع reports.js القديم)

# Modals (تبقى دائماً في DOM):
  modal-attendance, modal-add-student, modal-edit-student
  modal-chart (student-chart canvas + chart-student-name + btn-close-chart)
  modal-student-profile, modal-custom-confirm, modal-prayer-times, modal-student-profile
  context-menu (ctx-profile, ctx-edit, ctx-delete)
  
# في modal-edit-student:
  edit-student-id, edit-student-name
  edit-mem-surah (select), edit-mem-from, edit-mem-to, edit-mem-full
  edit-rev-surah (select), edit-rev-from, edit-rev-to, edit-rev-full
  
# في modal-prayer-times:
  prayer-times-grid, notif-settings-section, notif-status-text
  notif-reminder-select, btn-enable-notif, btn-disable-notif, notif-hint-text

# في modal-student-profile:
  profile-student-name, profile-sidebar-info, profile-chart (canvas), profile-timeline
  prof-stat-attendance-days, prof-stat-attendance-rate, prof-stat-avg-rating, prof-stat-best-rating
  filter-period-btn buttons (week/month/year/all)
```

## الفصل بين البحث (مهم!)
- **صفحة الطلاب (البطاقات)**: `#cards-search-input` → `filterStudentsCards()` في cards.js
- **modal الحضور**: `#search-input` + `#filter-select` → `filterStudents()` في attendance.js
- **cardsFilterValue**: متغير عالمي في app.js يحكم فلتر البطاقات

## لوحة الألوان
- **Primary Dark**: `#0F4C3A`
- **Primary Light**: `#1B7A52`
- **Gold**: `#C8A951`
- **Background**: `#F8FBF7`
- **Font**: Tajawal (رئيسي) + Cairo

## تشغيل التطبيق
- **Workflow**: `Start application` → `node server.js`
- **Port**: 5000

## CLASS_DAYS و MAX_PARTS
- `CLASS_DAYS = [0, 4]` (الأحد والخميس)
- `MAX_PARTS = 30` جزء
- `EXPECTED_DAYS_PER_WEEK = 2`
