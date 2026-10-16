package com.bachatbazaaruser

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SpeechToTextPackage())
        },
      // Load JS from Metro in debug so cart/delivery edits apply without a stale APK bundle.
      useDevSupport = BuildConfig.DEBUG,
    )
  }

  override fun onCreate() {
    super.onCreate()
    ensureDefaultNotificationChannel()
    loadReactNative(this)

  }

  private fun ensureDefaultNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val channelId = "bachatbazaar_default"
    val channel =
      NotificationChannel(
        channelId,
        "Bachat Bazaar",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Offers, circles, referrals, and other updates"
      }
    val manager = getSystemService(NotificationManager::class.java)
    manager?.createNotificationChannel(channel)
  }
}
