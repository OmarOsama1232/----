package com.halqatna.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PrayerBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        PrayerNotificationScheduler.rescheduleFromStored(context);
    }
}
