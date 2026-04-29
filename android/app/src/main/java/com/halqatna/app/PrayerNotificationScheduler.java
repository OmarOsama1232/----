package com.halqatna.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class PrayerNotificationScheduler {

    public static final String PREFS = "halaqatna_prayer_notifications";
    public static final String KEY_SCHEDULE_JSON = "schedule_json";
    public static final String KEY_LAT = "lat";
    public static final String KEY_LNG = "lng";
    public static final String KEY_REMINDER_MINUTES = "reminder_minutes";
    public static final String KEY_ENABLED = "enabled";

    public static final String CHANNEL_ID = "prayer_reminders";
    public static final String CHANNEL_NAME = "تذكيرات الصلاة";
    public static final String ACTION_NOTIFY = "com.halqatna.app.PRAYER_NOTIFY";
    public static final String ACTION_RESYNC = "com.halqatna.app.PRAYER_RESYNC";
    public static final String EXTRA_NOTIFICATION_ID = "notification_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";

    private static final int RESYNC_REQUEST_CODE = 902145;

    private PrayerNotificationScheduler() {
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("تنبيهات محلية قبل أوقات الصلاة");
        channel.enableLights(true);
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    public static void scheduleFromPayload(Context context, String scheduleJson) throws Exception {
        ensureChannel(context);
        cancelScheduledAlarms(context, false);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject payload = new JSONObject(scheduleJson);
        JSONObject location = payload.optJSONObject("location");
        int reminderMinutes = payload.optInt("reminderMinutes", 10);

        SharedPreferences.Editor editor = prefs.edit()
                .putString(KEY_SCHEDULE_JSON, scheduleJson)
                .putInt(KEY_REMINDER_MINUTES, reminderMinutes)
                .putBoolean(KEY_ENABLED, true);

        if (location != null) {
            editor.putString(KEY_LAT, String.valueOf(location.optDouble("lat", 0.0)));
            editor.putString(KEY_LNG, String.valueOf(location.optDouble("lng", 0.0)));
        }
        editor.apply();

        schedulePayloadAlarms(context, payload);
        scheduleDailyResync(context);
    }

    public static void cancelAll(Context context) {
        cancelScheduledAlarms(context, true);
    }

    public static void rescheduleFromStored(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) {
            return;
        }

        String latRaw = prefs.getString(KEY_LAT, null);
        String lngRaw = prefs.getString(KEY_LNG, null);
        if (latRaw != null && lngRaw != null) {
            resyncInBackground(context);
            return;
        }

        String scheduleJson = prefs.getString(KEY_SCHEDULE_JSON, null);
        if (scheduleJson == null || scheduleJson.isEmpty()) {
            return;
        }

        try {
            ensureChannel(context);
            schedulePayloadAlarms(context, new JSONObject(scheduleJson));
            scheduleDailyResync(context);
        } catch (Exception ignored) {
        }
    }

    public static void resyncInBackground(Context context) {
        Context appContext = context.getApplicationContext();
        new Thread(() -> {
            SharedPreferences prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!prefs.getBoolean(KEY_ENABLED, false)) {
                return;
            }

            try {
                double lat = Double.parseDouble(prefs.getString(KEY_LAT, "0"));
                double lng = Double.parseDouble(prefs.getString(KEY_LNG, "0"));
                int reminderMinutes = prefs.getInt(KEY_REMINDER_MINUTES, 10);
                String payload = fetchSchedulePayload(lat, lng, reminderMinutes);
                scheduleFromPayload(appContext, payload);
            } catch (Exception ignored) {
            }
        }).start();
    }

    private static void schedulePayloadAlarms(Context context, JSONObject payload) throws Exception {
        JSONArray days = payload.optJSONArray("days");
        if (days == null) {
            return;
        }

        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day == null) {
                continue;
            }

            JSONArray prayers = day.optJSONArray("prayers");
            if (prayers == null) {
                continue;
            }

            for (int j = 0; j < prayers.length(); j++) {
                JSONObject prayer = prayers.optJSONObject(j);
                if (prayer == null) {
                    continue;
                }

                String key = prayer.optString("key", "");
                String name = prayer.optString("name", "الصلاة");
                String remindAt = prayer.optString("remindAt", "");
                long triggerAt = parseIsoUtc(remindAt);
                if (triggerAt <= System.currentTimeMillis()) {
                    continue;
                }

                int requestCode = buildRequestCode(key, remindAt);
                String title = "تذكير الصلاة";
                String body = "اقترب وقت صلاة " + name;
                scheduleAlarm(context, requestCode, triggerAt, title, body);
            }
        }
    }

    private static void scheduleAlarm(Context context, int requestCode, long triggerAt, String title, String body) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                new Intent(context, PrayerAlarmReceiver.class)
                        .setAction(ACTION_NOTIFY)
                        .putExtra(EXTRA_NOTIFICATION_ID, requestCode)
                        .putExtra(EXTRA_TITLE, title)
                        .putExtra(EXTRA_BODY, body),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    private static void scheduleDailyResync(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(System.currentTimeMillis());
        calendar.add(Calendar.DAY_OF_YEAR, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 5);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                RESYNC_REQUEST_CODE,
                new Intent(context, PrayerResyncReceiver.class).setAction(ACTION_RESYNC),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        long triggerAt = calendar.getTimeInMillis();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    private static void cancelScheduledAlarms(Context context, boolean clearPrefs) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String scheduleJson = prefs.getString(KEY_SCHEDULE_JSON, null);

        if (scheduleJson != null) {
            try {
                JSONObject payload = new JSONObject(scheduleJson);
                JSONArray days = payload.optJSONArray("days");
                if (days != null) {
                    AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                    if (alarmManager != null) {
                        for (int i = 0; i < days.length(); i++) {
                            JSONObject day = days.optJSONObject(i);
                            if (day == null) continue;
                            JSONArray prayers = day.optJSONArray("prayers");
                            if (prayers == null) continue;

                            for (int j = 0; j < prayers.length(); j++) {
                                JSONObject prayer = prayers.optJSONObject(j);
                                if (prayer == null) continue;

                                String key = prayer.optString("key", "");
                                String remindAt = prayer.optString("remindAt", "");
                                int requestCode = buildRequestCode(key, remindAt);
                                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                                        context,
                                        requestCode,
                                        new Intent(context, PrayerAlarmReceiver.class).setAction(ACTION_NOTIFY),
                                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                                );
                                alarmManager.cancel(pendingIntent);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            PendingIntent resyncIntent = PendingIntent.getBroadcast(
                    context,
                    RESYNC_REQUEST_CODE,
                    new Intent(context, PrayerResyncReceiver.class).setAction(ACTION_RESYNC),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(resyncIntent);
        }

        if (clearPrefs) {
            prefs.edit().clear().apply();
            NotificationManagerCompat.from(context).cancelAll();
        }
    }

    private static int buildRequestCode(String key, String remindAt) {
        return Math.abs((key + "|" + remindAt).hashCode());
    }

    private static long parseIsoUtc(String value) throws Exception {
        SimpleDateFormat withMillis = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        withMillis.setTimeZone(TimeZone.getTimeZone("UTC"));
        Date parsed = withMillis.parse(value);
        if (parsed != null) {
            return parsed.getTime();
        }

        SimpleDateFormat withoutMillis = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        withoutMillis.setTimeZone(TimeZone.getTimeZone("UTC"));
        Date fallback = withoutMillis.parse(value);
        if (fallback == null) {
            throw new IllegalArgumentException("Invalid ISO date: " + value);
        }
        return fallback.getTime();
    }

    private static String fetchSchedulePayload(double lat, double lng, int reminderMinutes) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("generatedAt", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                .format(new Date()));
        payload.put("reminderMinutes", reminderMinutes);

        JSONObject location = new JSONObject();
        location.put("lat", lat);
        location.put("lng", lng);
        payload.put("location", location);

        JSONArray days = new JSONArray();
        Calendar today = Calendar.getInstance();
        Calendar tomorrow = Calendar.getInstance();
        tomorrow.add(Calendar.DAY_OF_YEAR, 1);

        days.put(fetchDaySchedule(lat, lng, reminderMinutes, today));
        days.put(fetchDaySchedule(lat, lng, reminderMinutes, tomorrow));
        payload.put("days", days);

        return payload.toString();
    }

    private static JSONObject fetchDaySchedule(double lat, double lng, int reminderMinutes, Calendar calendar) throws Exception {
        long timestampSeconds = calendar.getTimeInMillis() / 1000L;
        String url = "https://api.aladhan.com/v1/timings/" + timestampSeconds
                + "?latitude=" + lat
                + "&longitude=" + lng
                + "&method=5";

        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setRequestMethod("GET");
        connection.connect();

        if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
            throw new IllegalStateException("Prayer API HTTP " + connection.getResponseCode());
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        } finally {
            connection.disconnect();
        }

        JSONObject response = new JSONObject(builder.toString());
        JSONObject timings = response.getJSONObject("data").getJSONObject("timings");
        JSONObject day = new JSONObject();
        day.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(calendar.getTime()));

        JSONArray prayers = new JSONArray();
        for (String key : new String[]{"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"}) {
            String timeValue = timings.getString(key);
            String hhmm = timeValue.substring(0, 5);

            Calendar prayerTime = Calendar.getInstance();
            prayerTime.setTime(calendar.getTime());
            prayerTime.set(Calendar.SECOND, 0);
            prayerTime.set(Calendar.MILLISECOND, 0);
            prayerTime.set(Calendar.HOUR_OF_DAY, Integer.parseInt(hhmm.substring(0, 2)));
            prayerTime.set(Calendar.MINUTE, Integer.parseInt(hhmm.substring(3, 5)));

            Calendar remindTime = (Calendar) prayerTime.clone();
            remindTime.add(Calendar.MINUTE, -reminderMinutes);

            JSONObject prayer = new JSONObject();
            prayer.put("key", key);
            prayer.put("name", arabicPrayerName(key));
            prayer.put("prayerAt", toIsoUtc(prayerTime.getTime()));
            prayer.put("remindAt", toIsoUtc(remindTime.getTime()));
            prayers.put(prayer);
        }

        day.put("prayers", prayers);
        return day;
    }

    private static String arabicPrayerName(String key) {
        switch (key) {
            case "Fajr":
                return "الفجر";
            case "Dhuhr":
                return "الظهر";
            case "Asr":
                return "العصر";
            case "Maghrib":
                return "المغرب";
            case "Isha":
                return "العشاء";
            default:
                return "الصلاة";
        }
    }

    private static String toIsoUtc(Date date) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(date);
    }
}
