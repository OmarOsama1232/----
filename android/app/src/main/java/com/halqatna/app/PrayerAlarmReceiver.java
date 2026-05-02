package com.halqatna.app;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class PrayerAlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        PrayerNotificationScheduler.ensureChannel(context);

        int notificationId = intent.getIntExtra(PrayerNotificationScheduler.EXTRA_NOTIFICATION_ID, 1001);
        String title = intent.getStringExtra(PrayerNotificationScheduler.EXTRA_TITLE);
        String body = intent.getStringExtra(PrayerNotificationScheduler.EXTRA_BODY);

        PendingIntent openAppIntent = PendingIntent.getActivity(
                context,
                notificationId,
                new Intent(context, MainActivity.class)
                        .putExtra("launchAction", "open_prayer")
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, PrayerNotificationScheduler.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_prayer_notification)
                .setContentTitle(title == null ? "تذكير الصلاة" : title)
                .setContentText(body == null ? "اقترب موعد الصلاة" : body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationManagerCompat.from(context).notify(notificationId, builder.build());
    }
}
