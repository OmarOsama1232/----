# حلقتنا - تطبيق إدارة حلقات تحفيظ القرآن الكريم

## وصف المشروع
تطبيق ويب متكامل (PWA) لإدارة حلقات تحفيظ القرآن الكريم. يتيح للمعلمين متابعة الطلاب، الحضور، التقييمات اليومية، الإحصائيات، ومواقيت الصلاة.

## التقنيات المستخدمة
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES5/ES6 compatible)
- **Storage**: LocalStorage
- **PWA**: Service Worker + manifest.json
- **المكتبات**: Chart.js, SheetJS (XLSX), jsPDF, html2canvas, Font Awesome 6, Cairo Font
- **Server**: Node.js HTTP server (server.js)

## بنية المشروع
```
/
├── index.html          # الصفحة الرئيسية الوحيدة
├── server.js           # سيرفر Node.js بسيط على port 5000
├── sw.js               # Service Worker (كاش + إشعارات)
├── manifest.json       # PWA manifest
├── icon-512.png        # أيقونة التطبيق
├── css/
│   ├── style.css       # التنسيقات الرئيسية (Material Design 3)
│   └── responsive.css  # تنسيقات متجاوبة (240px → 1400px+)
├── js/
│   ├── constants.js    # الثوابت (السور، التقييمات)
│   ├── db.js           # طبقة LocalStorage
│   ├── ui.js           # Toast, Modal, واجهة مستخدم عامة
│   ├── students.js     # إدارة الطلاب (CRUD)
│   ├── attendance.js   # تسجيل الحضور
│   ├── reports.js      # تصدير PDF/Excel
│   ├── charts.js       # الرسوم البيانية (Chart.js)
│   ├── profile.js      # الملف الشخصي للطالب
│   ├── notifications.js # نظام إشعارات الصلاة (جديد)
│   ├── prayer.js       # مواقيت الصلاة + تكامل الإشعارات
│   ├── backbutton.js   # زر الرجوع في Android
│   └── app.js          # نقطة الدخول الرئيسية
└── data/
    └── surahs.json     # قائمة سور القرآن
```

## تشغيل التطبيق
- **Workflow**: `Start application` → `node server.js`
- **Port**: 5000

## الميزات الرئيسية
1. إدارة الطلاب (إضافة، تعديل، حذف)
2. تسجيل الحضور والتقييمات اليومية
3. متابعة الحفظ والمراجعة (114 سورة)
4. لوحة الشرف الأسبوعية
5. إحصائيات ورسوم بيانية
6. التقارير الأسبوعية
7. تصدير Excel/PDF/JSON
8. مواقيت الصلاة (Aladhan API)
9. إشعارات الصلاة (Notification API + Service Worker)
10. دعم كامل للعمل offline
11. PWA قابل للتثبيت

## التحسينات الأخيرة (v2)
### الجزء الأول: التوافق الكامل مع جميع الشاشات وAndroid
- دعم شاشات من 240px إلى 1400px+ (Foldables)
- Polyfills مضمّنة لـ Android 5/6 (closest, find, forEach, CustomEvent)
- @supports fallbacks لـ CSS Grid → Flexbox للمتصفحات القديمة
- @supports fallback لـ backdrop-filter للمتصفحات القديمة
- vendor prefixes (-webkit-, -ms-) للتوافق الكامل
- safe-area-inset للشاشات المشقوقة مع fallback
- breakpoints: 240px, 360px, 400px, 768px, 1024px, 1200px
- دعم Landscape orientation
- أحجام خطوط بـ clamp() لمنع التكسر
- حد أدنى 44px للأزرار (Apple HIG & Material)

### الجزء الثاني: إشعارات الصلاة المُصلَحة
- فحص صحيح لـ Notification API قبل الاستدعاء
- `Notification.requestPermission()` يدعم كلا: callback (قديم) و Promise (حديث)
- جدولة تلقائية بـ setTimeout لكل صلاة (تذكير + عند حلول الوقت)
- Service Worker يعرض الإشعارات في الخلفية عبر `showNotification`
- إشعارات تعويضية عند فتح التطبيق (إذا فاتت صلاة في آخر 30 دقيقة)
- واجهة إعدادات في modal مواقيت الصلاة: تفعيل/إلغاء + اختيار وقت التذكير
- رسائل خطأ واضحة: "غير مدعوم"، "تم الرفض"، "مفعّل"
- حفظ جميع الإعدادات في LocalStorage

## deployment
- **نوع التوزيع**: Static
- **publicDir**: `.`
