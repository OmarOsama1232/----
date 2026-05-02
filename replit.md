# حلقتنا - تطبيق إدارة حلقات تحفيظ القرآن الكريم

## وصف المشروع
تطبيق ويب متكامل (PWA) لإدارة حلقات تحفيظ القرآن الكريم. يتيح للمعلمين متابعة الطلاب، الحضور، التقييمات اليومية، الإحصائيات، ومواقيت الصلاة. الواجهة عربية (RTL) متجاوبة بالكامل.

## التقنيات المستخدمة
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES5/ES6 compatible)
- **Storage**: LocalStorage
- **PWA**: Service Worker + manifest.json
- **المكتبات**: Chart.js, SheetJS (XLSX), jsPDF, html2canvas, Font Awesome 6, Tajawal Font + Cairo Font
- **Server**: Node.js HTTP server (server.js) — Port 5000

## بنية المشروع
```
/
├── index.html          # SPA رئيسية (5 صفحات داخلية + جميع الـ Modals)
├── server.js           # سيرفر Node.js بسيط على port 5000
├── sw.js               # Service Worker (كاش + إشعارات)
├── manifest.json       # PWA manifest
├── icon-512.png        # أيقونة التطبيق
├── css/
│   ├── style.css       # التنسيقات الرئيسية (SPA + Material Design 3)
│   └── responsive.css  # تنسيقات متجاوبة (240px → 1400px+)
├── js/
│   ├── constants.js    # الثوابت (السور، التقييمات، أيام الدراسة)
│   ├── db.js           # طبقة LocalStorage (CRUD + بيانات تجريبية)
│   ├── ui.js           # Toast, Modal, واجهة مستخدم عامة
│   ├── students.js     # إدارة الطلاب (CRUD)
│   ├── attendance.js   # تسجيل الحضور + جدول الحضور
│   ├── reports.js      # updateDashboardCards, renderWeeklyReport, renderHonorBoard
│   ├── charts.js       # الرسوم البيانية (Chart.js)
│   ├── profile.js      # الملف الشخصي للطالب (openStudentProfile)
│   ├── notifications.js # نظام إشعارات الصلاة
│   ├── prayer.js       # مواقيت الصلاة + تكامل الإشعارات
│   ├── backbutton.js   # زر الرجوع في Android
│   ├── navigation.js   # [جديد] SPA navigation (navigateTo, patchStudentFunctions)
│   ├── cards.js        # [جديد] بطاقات الطلاب (renderStudentsCards, renderDashboardAlerts)
│   ├── darkmode.js     # تبديل الوضع الليلي (يُحمَّل أولاً لمنع الوميض)
│   └── app.js          # نقطة الدخول الرئيسية (DOMContentLoaded + Event Listeners)
└── data/
    └── surahs.json     # قائمة سور القرآن
```

## بنية SPA (الصفحات الداخلية)
التطبيق عبارة عن SPA بخمس صفحات داخلية يتنقل بينها شريط التنقل السفلي:

| معرف الصفحة | محتواها | زر التنقل |
|---|---|---|
| `page-dashboard` | لوحة التحكم: إحصائيات، لوحة الشرف، التنبيهات، الأزرار السريعة | `nav-home` |
| `page-students` | شبكة بطاقات الطلاب مع بحث وتصفية | `nav-students` |
| `page-attendance` | جدول الحضور والتقييمات اليومية | (زر FAB الأوسط) |
| `page-reports` | التقرير الأسبوعي ورسوم بيانية | `nav-reports` |
| `page-settings` | أدوات المسؤول، الإعدادات، التصدير/الاستيراد | `nav-settings` |

## تشغيل التطبيق
- **Workflow**: `Start application` → `node server.js`
- **Port**: 5000

## ترتيب تحميل JS (مهم)
```
constants.js → db.js → ui.js → students.js → attendance.js →
reports.js → charts.js → profile.js → notifications.js →
prayer.js → backbutton.js → navigation.js → cards.js → app.js
```

## الميزات الرئيسية
1. **لوحة التحكم**: إحصائيات سريعة (إجمالي الطلاب، الحضور، التقييم، النجم)، لوحة الشرف المصغرة، تنبيهات الغياب، أزرار سريعة
2. **صفحة الطلاب**: بطاقات Grid مع أفاتار، حالة حضور، تقييم، تقدم الحفظ، بحث وتصفية
3. **تسجيل الحضور**: جدول كامل مع checkbox وتقييم وملاحظات
4. **التقارير**: جدول أسبوعي + رسوم بيانية Chart.js
5. **الإعدادات**: تصدير Excel/PDF/JSON، استيراد JSON، وضع ليلي، إشعارات الصلاة
6. **مواقيت الصلاة**: API خارجي + عداد تنازلي + إشعارات
7. **بيانات تجريبية**: إنشاء وحذف سنة كاملة من السجلات
8. **PWA**: يعمل offline، قابل للتثبيت، Service Worker

## ملاحظات تقنية مهمة
- **Android 5 compat**: ES5 syntax في navigation.js و cards.js، Polyfills في index.html
- **تحديث البطاقات**: `patchStudentFunctions()` في navigation.js تعترض saveNewStudent/saveEditStudent/saveAllAttendance لإعادة رسم البطاقات تلقائياً
- **البحث المزدوج**: search-input و filter-select يعملان على جدول الحضور (filterStudents) وبطاقات الطلاب (filterStudentsCards) معاً
- **IDs محفوظة**: جميع IDs أصلية محفوظة لضمان توافق الكود القديم (students-tbody, honor-cards-container, weekly-tbody, modal-* ...)
- **الوضع الليلي**: `[data-theme="dark"]` على `<html>` — يُحمَّل darkmode.js أولاً لمنع الوميض

## لوحة الألوان
- **Primary**: `#0F4C3A` (أخضر غامق)
- **Primary Light**: `#1B7A52` (أخضر متوسط)
- **Gold**: `#C8A951` (ذهبي)
- **Background**: `#F8FBF7` (أبيض خضري)
- **Font**: Tajawal (رئيسي) + Cairo (أرقام)

## deployment
- **نوع التوزيع**: Static
- **publicDir**: `.`
